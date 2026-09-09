import asyncio
import math
from datetime import datetime
from typing import Dict, Any, List, Optional

from websocket.manager import manager
from database import SessionLocal
import models
from services.route_service import get_driving_route, densify_road_coordinates

DEMO_LEG_TARGET_DURATION_SECONDS = 14.0  # Hackathon demo: ~14 seconds per leg


class AmbulanceSimulator:
    def __init__(self):
        self._active_simulations: Dict[str, asyncio.Task] = {}

    def get_trip_road_route(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> Dict[str, Any]:
        """
        Calculates the authoritative driving road route using OSRM.
        Preserves all road geometry, turns, intersections, and curves.
        """
        route_data = get_driving_route(from_lat, from_lng, to_lat, to_lng)
        raw_coords = route_data.get("coordinates", [])

        # Ensure enough waypoints for smooth 10-20s continuous animation (target ~50-80 points)
        # Interpolation happens strictly along road segments, NEVER start-to-finish.
        smooth_coords = densify_road_coordinates(raw_coords, target_points=65)

        waypoints = [{"lat": p[0], "lng": p[1]} for p in smooth_coords]
        return {
            "waypoints": waypoints,
            "polyline": smooth_coords,
            "distance_km": route_data.get("distance_km", 2.0),
            "duration_seconds": route_data.get("duration_seconds", 300.0),
            "is_road": True
        }

    async def start_trip_simulation(
        self,
        request_id: str,
        ambulance_id: str,
        from_lat: float,
        from_lng: float,
        to_lat: float,
        to_lng: float,
        target_status: str,
        target_duration: float = DEMO_LEG_TARGET_DURATION_SECONDS
    ):
        if request_id in self._active_simulations:
            self._active_simulations[request_id].cancel()

        async def _run():
            try:
                trip_data = self.get_trip_road_route(from_lat, from_lng, to_lat, to_lng)
                waypoints = trip_data["waypoints"]
                total = len(waypoints)
                if total < 2:
                    return

                # Calculate step delay for fast, smooth demo (10–20 seconds total)
                delay_per_step = max(0.12, min(0.35, target_duration / float(total)))
                normal_duration_minutes = max(1.0, trip_data["duration_seconds"] / 60.0)

                # Broadcast immediate ROUTE_CALCULATED event with road coordinates
                route_ready_event = {
                    "type": "ROUTE_READY",
                    "request_id": request_id,
                    "ambulance_id": ambulance_id,
                    "target_status": target_status,
                    "polyline": trip_data["polyline"],
                    "distance_km": trip_data["distance_km"],
                    "eta_minutes": int(math.ceil(normal_duration_minutes)),
                    "is_road": True
                }
                await manager.broadcast(route_ready_event, f"ambulance_{request_id}")
                await manager.broadcast(route_ready_event, "hospital_dispatch")
                await manager.broadcast(route_ready_event, "driver_requests")

                for idx, point in enumerate(waypoints):
                    remaining_fraction = 1.0 - (idx / max(1, total - 1))
                    eta = max(0, int(math.ceil(remaining_fraction * normal_duration_minutes)))
                    if idx == total - 1:
                        eta = 0

                    prev = waypoints[max(0, idx - 1)]
                    heading = math.degrees(math.atan2(point["lng"] - prev["lng"], point["lat"] - prev["lat"])) if idx else 0.0

                    db = SessionLocal()
                    try:
                        req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == request_id).first()
                        if req and req.driver_id:
                            driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first()
                            if driver:
                                driver.current_lat = point["lat"]
                                driver.current_lng = point["lng"]
                        loc = models.AmbulanceLocation(
                            ambulance_id=ambulance_id,
                            lat=point["lat"],
                            lng=point["lng"],
                            heading=heading,
                            speed=45.0,
                            timestamp=datetime.utcnow()
                        )
                        db.add(loc)
                        db.commit()
                    finally:
                        db.close()

                    data = {
                        "type": "location_update",
                        "request_id": request_id,
                        "ambulance_id": ambulance_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {
                            "lat": point["lat"],
                            "lng": point["lng"],
                            "eta": eta,
                            "speed": 45.0,
                            "heading": heading,
                            "target_status": target_status,
                            "is_arrived": idx == total - 1,
                            "step": idx,
                            "total_steps": total
                        },
                    }
                    await manager.broadcast(data, f"ambulance_{request_id}")
                    await manager.broadcast(data, "hospital_dispatch")
                    await manager.broadcast(data, "driver_requests")

                    if idx == total - 1:
                        db = SessionLocal()
                        try:
                            req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == request_id).first()
                            if req:
                                try:
                                    req.status = models.RequestStatus(target_status)
                                except ValueError:
                                    pass
                                db.commit()
                                db.refresh(req)
                                status_event = {
                                    "type": "STATUS_UPDATED",
                                    "status": req.status.value if hasattr(req.status, "value") else str(req.status),
                                    "request_id": request_id,
                                    "lat": point["lat"],
                                    "lng": point["lng"]
                                }
                                await manager.broadcast(status_event, f"ambulance_{request_id}")
                                await manager.broadcast(status_event, "hospital_dispatch")
                                await manager.broadcast(status_event, "driver_requests")
                        finally:
                            db.close()
                    else:
                        await asyncio.sleep(delay_per_step)

            except asyncio.CancelledError:
                pass
            finally:
                self._active_simulations.pop(request_id, None)

        task = asyncio.create_task(_run())
        self._active_simulations[request_id] = task

    def stop_simulation(self, request_id: str):
        task = self._active_simulations.pop(request_id, None)
        if task:
            task.cancel()


ambulance_simulator = AmbulanceSimulator()
