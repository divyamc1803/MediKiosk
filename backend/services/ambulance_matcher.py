import math
from typing import List, Optional
from sqlalchemy.orm import Session
from models import Ambulance, AmbulanceDriver, AmbulanceStatus, AmbulanceType, Priority
from services.route_service import get_driving_route

class NearbyAmbulanceResult:
    def __init__(
        self,
        ambulance_id: str,
        registration_number: str,
        ambulance_type: str,
        status: str,
        distance_km: float,
        eta_minutes: int,
        driver_id: Optional[str],
        driver_name: Optional[str],
        driver_phone: Optional[str],
        lat: float,
        lng: float
    ):
        self.ambulance_id = ambulance_id
        self.registration_number = registration_number
        self.type = ambulance_type
        self.status = status
        self.distance_km = round(distance_km, 2)
        self.eta_minutes = eta_minutes
        self.driver_id = driver_id
        self.driver_name = driver_name
        self.driver_phone = driver_phone
        self.lat = lat
        self.lng = lng

class AmbulanceMatcher:
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Prefer actual driving road distance from OSRM
        try:
            route = get_driving_route(lat1, lon1, lat2, lon2)
            if route and "distance_km" in route and route["distance_km"] > 0:
                return float(route["distance_km"])
        except Exception:
            pass

        # Fallback Haversine formula for spherical distance in kilometers
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c * 1.25  # Urban winding factor
        
    def calculate_eta(self, distance_km: float) -> int:
        # Average urban ambulance travel speed ~ 30 km/h plus reaction time
        minutes = int(math.ceil((distance_km / 30.0) * 60.0))
        return max(1, minutes)
        
    def find_nearby(
        self,
        lat: float,
        lng: float,
        ambulance_type: Optional[str] = None,
        db: Optional[Session] = None
    ) -> List[NearbyAmbulanceResult]:
        drivers = db.query(AmbulanceDriver).filter(AmbulanceDriver.is_online == True).all()
        nearby: List[NearbyAmbulanceResult] = []

        for driver in drivers:
            if not driver.assigned_ambulance_id or driver.current_lat is None or driver.current_lng is None:
                continue
            
            amb = db.query(Ambulance).filter(Ambulance.id == driver.assigned_ambulance_id).first()
            if not amb or amb.status != AmbulanceStatus.AVAILABLE:
                continue
            
            amb_type_val = amb.ambulance_type.value if hasattr(amb.ambulance_type, 'value') else str(amb.ambulance_type)
            if ambulance_type and amb_type_val != ambulance_type:
                continue
                
            dist = self.calculate_distance(lat, lng, driver.current_lat, driver.current_lng)
            eta = self.calculate_eta(dist)
            driver_user = driver.user
            driver_name = driver_user.full_name if driver_user else "Assigned Driver"
            driver_phone = driver_user.phone if driver_user else "+91 98290 12345"

            nearby.append(
                NearbyAmbulanceResult(
                    ambulance_id=amb.id,
                    registration_number=amb.registration_number,
                    ambulance_type=amb_type_val,
                    status=amb.status.value if hasattr(amb.status, 'value') else str(amb.status),
                    distance_km=dist,
                    eta_minutes=eta,
                    driver_id=driver.id,
                    driver_name=driver_name,
                    driver_phone=driver_phone,
                    lat=driver.current_lat,
                    lng=driver.current_lng
                )
            )
            
        nearby.sort(key=lambda x: x.distance_km)
        return nearby
        
    def match_best(self, request, db: Session, government_only: bool = False) -> Optional[Ambulance]:
        nearby = self.find_nearby(
            lat=request.pickup_lat,
            lng=request.pickup_lng,
            ambulance_type=request.ambulance_type_requested.value if hasattr(request.ambulance_type_requested, 'value') else request.ambulance_type_requested,
            db=db
        )
        if not nearby:
            # Fallback to any available ambulance type
            nearby = self.find_nearby(
                lat=request.pickup_lat,
                lng=request.pickup_lng,
                ambulance_type=None,
                db=db
            )
            
        if not nearby:
            return None

        if government_only:
            gov_matches = []
            for n in nearby:
                amb_obj = db.query(Ambulance).filter(Ambulance.id == n.ambulance_id).first()
                if amb_obj and amb_obj.hospital and getattr(amb_obj.hospital, 'is_government', False):
                    gov_matches.append(amb_obj)
            if gov_matches:
                return gov_matches[0]
            
        # Return closest available by driving road distance
        best_id = nearby[0].ambulance_id
        return db.query(Ambulance).filter(Ambulance.id == best_id).first()

ambulance_matcher = AmbulanceMatcher()
