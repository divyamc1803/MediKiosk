from fastapi import APIRouter, Depends, HTTPException, WebSocket, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import models
import schemas
import auth
from database import get_db
from services.ambulance_matcher import ambulance_matcher
from services.ambulance_simulator import ambulance_simulator
from websocket.manager import manager
from seed_data import seed, reset_demo_accounts
from config import JAIPUR_HOSPITALS, DEMO_PATIENT_LOCATION, DEMO_DRIVER_LOCATION

router = APIRouter(prefix="/ambulance", tags=["ambulance"])

def serialize_request(req: models.AmbulanceRequest, db: Session) -> dict:
    import math
    driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first() if req.driver_id else None
    ambulance = db.query(models.Ambulance).filter(models.Ambulance.id == req.ambulance_id).first() if req.ambulance_id else None
    patient = db.query(models.Patient).filter(models.Patient.id == req.patient_id).first() if req.patient_id else None
    hospital = db.query(models.Hospital).filter(models.Hospital.id == req.destination_hospital_id).first() if req.destination_hospital_id else None

    # Calculate authoritative road route based on active trip status
    is_to_hospital = req.status in [
        models.RequestStatus.PATIENT_PICKED_UP,
        models.RequestStatus.EN_ROUTE_HOSPITAL,
        models.RequestStatus.ARRIVED,
        models.RequestStatus.COMPLETED
    ]
    if is_to_hospital:
        from_lat, from_lng = req.pickup_lat, req.pickup_lng
        to_lat, to_lng = req.destination_lat, req.destination_lng
    else:
        from_lat = driver.current_lat if driver and driver.current_lat is not None else DEMO_DRIVER_LOCATION["lat"]
        from_lng = driver.current_lng if driver and driver.current_lng is not None else DEMO_DRIVER_LOCATION["lng"]
        to_lat, to_lng = req.pickup_lat, req.pickup_lng

    from services.route_service import get_driving_route
    route_data = get_driving_route(from_lat, from_lng, to_lat, to_lng)
    distance_km = route_data.get("distance_km", 2.0)
    eta = max(1, int(math.ceil(route_data.get("duration_seconds", 300.0) / 60.0)))
    if req.status in [models.RequestStatus.ARRIVING, models.RequestStatus.ARRIVED, models.RequestStatus.COMPLETED]:
        eta = 0

    return {
        "id": req.id,
        "patient_id": req.patient_id,
        "ambulance_id": req.ambulance_id,
        "driver_id": req.driver_id,
        "pickup_lat": req.pickup_lat,
        "pickup_lng": req.pickup_lng,
        "pickup_address": req.pickup_address,
        "destination_lat": req.destination_lat,
        "destination_lng": req.destination_lng,
        "destination_address": req.destination_address,
        "destination_hospital_id": req.destination_hospital_id,
        "ambulance_type_requested": req.ambulance_type_requested.value if hasattr(req.ambulance_type_requested, 'value') else str(req.ambulance_type_requested),
        "priority": req.priority.value if hasattr(req.priority, 'value') else str(req.priority),
        "status": req.status.value if hasattr(req.status, 'value') else str(req.status),
        "estimated_fare": req.estimated_fare or 350.0,
        "estimated_eta": eta,
        "distance_km": distance_km,
        "route": route_data.get("coordinates", []),
        "is_road": True,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        "driver": {
            "id": driver.id,
            "license_number": driver.license_number,
            "is_online": driver.is_online,
            "current_lat": driver.current_lat,
            "current_lng": driver.current_lng,
            "user": {
                "full_name": driver.user.full_name if driver.user else "Raj Kumar",
                "phone": driver.user.phone if driver.user else "+91 98290 12345",
                "email": driver.user.email if driver.user else "raj.driver@demo.com"
            }
        } if driver else None,
        "ambulance": {
            "id": ambulance.id,
            "registration_number": ambulance.registration_number,
            "ambulance_type": ambulance.ambulance_type.value if hasattr(ambulance.ambulance_type, 'value') else str(ambulance.ambulance_type),
            "status": ambulance.status.value if hasattr(ambulance.status, 'value') else str(ambulance.status)
        } if ambulance else None,
        "patient": {
            "id": patient.id,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "user": {
                "full_name": patient.user.full_name if patient.user else "Aarav Sharma",
                "phone": patient.user.phone if patient.user else "+91 98290 55555"
            }
        } if patient else None,
        "hospital": {
            "id": hospital.id,
            "name": hospital.name,
            "address": hospital.address,
            "phone": hospital.phone,
            "emergency_dept": hospital.emergency_dept,
            "is_government": hospital.is_government
        } if hospital else None
    }

@router.get("/route")
def get_road_route(from_lat: float, from_lng: float, to_lat: float, to_lng: float):
    from services.route_service import get_driving_route
    return get_driving_route(from_lat, from_lng, to_lat, to_lng)

@router.get("/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(models.Hospital).all()
    return hospitals

@router.get("/patient/history")
def get_patient_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        # Fallback: if logged in user is admin/doctor or testing, return recent
        requests = db.query(models.AmbulanceRequest).order_by(models.AmbulanceRequest.created_at.desc()).limit(10).all()
        return [serialize_request(r, db) for r in requests]
    requests = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.patient_id == patient.id).order_by(models.AmbulanceRequest.created_at.desc()).all()
    return [serialize_request(r, db) for r in requests]

@router.get("/active")
def get_active_requests(db: Session = Depends(get_db)):
    active_statuses = [
        models.RequestStatus.SEARCHING,
        models.RequestStatus.MATCHED,
        models.RequestStatus.DRIVER_ASSIGNED,
        models.RequestStatus.DRIVER_EN_ROUTE,
        models.RequestStatus.ARRIVING,
        models.RequestStatus.PATIENT_PICKED_UP,
        models.RequestStatus.EN_ROUTE_HOSPITAL,
        models.RequestStatus.ARRIVED,
    ]
    requests = db.query(models.AmbulanceRequest).filter(
        models.AmbulanceRequest.status.in_(active_statuses)
    ).order_by(models.AmbulanceRequest.created_at.desc()).all()
    return [serialize_request(r, db) for r in requests]

@router.get("/nearby")
def get_nearby(lat: float, lng: float, type: Optional[str] = None, db: Session = Depends(get_db)):
    results = ambulance_matcher.find_nearby(lat, lng, type, db)
    return [
        {
            "ambulance_id": r.ambulance_id,
            "registration_number": r.registration_number,
            "distance_km": r.distance_km,
            "eta_minutes": r.eta_minutes,
            "type": r.type,
            "status": r.status,
            "lat": r.lat,
            "lng": r.lng,
            "driver_id": r.driver_id,
            "driver_name": r.driver_name,
            "driver_phone": r.driver_phone
        }
        for r in results
    ]

@router.get("/driver/requests")
def get_driver_requests(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.user_id == current_user.id).first()
    if not driver:
        # Check if user has email matching demo driver
        driver = db.query(models.AmbulanceDriver).join(models.User).filter(models.User.email == "raj.driver@demo.com").first()
        if not driver:
            return []
            
    active_statuses = [
        models.RequestStatus.SEARCHING,
        models.RequestStatus.MATCHED,
        models.RequestStatus.DRIVER_ASSIGNED,
        models.RequestStatus.DRIVER_EN_ROUTE,
        models.RequestStatus.ARRIVING,
        models.RequestStatus.PATIENT_PICKED_UP,
        models.RequestStatus.EN_ROUTE_HOSPITAL,
        models.RequestStatus.ARRIVED,
    ]
    requests = db.query(models.AmbulanceRequest).filter(
        (models.AmbulanceRequest.driver_id == driver.id) | (models.AmbulanceRequest.status == models.RequestStatus.MATCHED),
        models.AmbulanceRequest.status.in_(active_statuses)
    ).order_by(models.AmbulanceRequest.created_at.desc()).all()
    
    return [serialize_request(r, db) for r in requests]

@router.post("/emergency")
def emergency_request(
    request: schemas.AmbulanceRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Emergency shortcut: match only ambulances belonging to government hospitals."""
    request.priority = models.Priority.CRITICAL
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        patient = db.query(models.Patient).filter(models.Patient.id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    consents = db.query(models.Consent).filter(models.Consent.patient_id == patient.id, models.Consent.consent_status == models.ConsentStatus.GIVEN).all()
    purposes = {c.purpose for c in consents}
    if "AMBULANCE_RECEIPT" not in purposes or "MEDICAL_CARE" not in purposes:
        raise HTTPException(status_code=403, detail="Patient ambulance and medical-care consent must be completed first")
    req = models.AmbulanceRequest(
        patient_id=patient.id, pickup_lat=request.pickup_lat, pickup_lng=request.pickup_lng,
        pickup_address=request.pickup_address, destination_lat=request.destination_lat,
        destination_lng=request.destination_lng, destination_address=request.destination_address,
        destination_hospital_id=request.destination_hospital_id,
        ambulance_type_requested=request.ambulance_type_requested, priority=models.Priority.CRITICAL,
        status=models.RequestStatus.SEARCHING, estimated_fare=0.0
    )
    db.add(req); db.commit(); db.refresh(req)
    match = ambulance_matcher.match_best(req, db, government_only=True)
    if not match:
        raise HTTPException(status_code=503, detail="No government ambulance is currently available")
    req.ambulance_id = match.id; req.status = models.RequestStatus.MATCHED
    driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.assigned_ambulance_id == match.id).first()
    if driver:
        req.driver_id = driver.id
        s_lat = driver.current_lat if driver.current_lat is not None else DEMO_DRIVER_LOCATION["lat"]
        s_lng = driver.current_lng if driver.current_lng is not None else DEMO_DRIVER_LOCATION["lng"]
        background_tasks.add_task(
            ambulance_simulator.start_trip_simulation,
            request_id=req.id,
            ambulance_id=match.id,
            from_lat=s_lat,
            from_lng=s_lng,
            to_lat=req.pickup_lat,
            to_lng=req.pickup_lng,
            target_status=models.RequestStatus.ARRIVING.value
        )
    match.status = models.AmbulanceStatus.BUSY
    db.commit(); db.refresh(req)
    return serialize_request(req, db)

@router.post("/request")
async def create_request(
    request: schemas.AmbulanceRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # If patient_id passed isn't valid patient, find or assign Aarav / current_user's patient profile
    patient = db.query(models.Patient).filter(models.Patient.id == request.patient_id).first()
    if not patient:
        patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        if not patient:
            patient = db.query(models.Patient).first()
    
    pat_id = patient.id if patient else request.patient_id

    new_request = models.AmbulanceRequest(
        patient_id=pat_id,
        pickup_lat=request.pickup_lat,
        pickup_lng=request.pickup_lng,
        pickup_address=request.pickup_address,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
        destination_address=request.destination_address,
        destination_hospital_id=request.destination_hospital_id,
        ambulance_type_requested=request.ambulance_type_requested,
        priority=request.priority,
        status=models.RequestStatus.SEARCHING,
        estimated_fare=350.0
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Run matching engine to locate nearest suitable ambulance
    best_match = ambulance_matcher.match_best(new_request, db, government_only=(request.priority == models.Priority.CRITICAL))
    if best_match:
        new_request.ambulance_id = best_match.id
        new_request.status = models.RequestStatus.MATCHED
        driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.assigned_ambulance_id == best_match.id).first()
        if driver:
            new_request.driver_id = driver.id
            best_match.status = models.AmbulanceStatus.BUSY
            s_lat = driver.current_lat if driver.current_lat is not None else DEMO_DRIVER_LOCATION["lat"]
            s_lng = driver.current_lng if driver.current_lng is not None else DEMO_DRIVER_LOCATION["lng"]
            background_tasks.add_task(
                ambulance_simulator.start_trip_simulation,
                request_id=new_request.id,
                ambulance_id=best_match.id,
                from_lat=s_lat,
                from_lng=s_lng,
                to_lat=new_request.pickup_lat,
                to_lng=new_request.pickup_lng,
                target_status=models.RequestStatus.ARRIVING.value
            )
        db.commit()
        db.refresh(new_request)
        
    serialized = serialize_request(new_request, db)
    
    # Broadcast real-time emergency dispatch events
    event_data = {
        "type": "AMBULANCE_REQUEST_CREATED",
        "request": serialized
    }
    background_tasks.add_task(manager.broadcast, event_data, f"ambulance_{new_request.id}")
    background_tasks.add_task(manager.broadcast, event_data, "hospital_dispatch")
    background_tasks.add_task(manager.broadcast, event_data, "driver_requests")
    
    return serialized

@router.get("/{id}")
def get_request(id: str, db: Session = Depends(get_db)):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return serialize_request(req, db)

@router.post("/{id}/accept")
async def accept_request(
    id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    if not req:
        raise HTTPException(404, "Request not found")
        
    req.status = models.RequestStatus.DRIVER_ASSIGNED
    driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first()
    if not driver:
        # Assign driver if not already assigned
        driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.user_id == current_user.id).first()
        if driver:
            req.driver_id = driver.id
    
    if req.ambulance_id:
        amb = db.query(models.Ambulance).filter(models.Ambulance.id == req.ambulance_id).first()
        if amb:
            amb.status = models.AmbulanceStatus.BUSY

    db.commit()
    db.refresh(req)
    
    # Auto-trigger movement simulation to patient
    s_lat = driver.current_lat if driver and driver.current_lat is not None else DEMO_DRIVER_LOCATION["lat"]
    s_lng = driver.current_lng if driver and driver.current_lng is not None else DEMO_DRIVER_LOCATION["lng"]
    background_tasks.add_task(
        ambulance_simulator.start_trip_simulation,
        request_id=req.id,
        ambulance_id=req.ambulance_id or "AMB-104",
        from_lat=s_lat,
        from_lng=s_lng,
        to_lat=req.pickup_lat,
        to_lng=req.pickup_lng,
        target_status=models.RequestStatus.ARRIVING.value
    )

    serialized = serialize_request(req, db)
    event_data = {
        "type": "DRIVER_ACCEPTED",
        "request": serialized
    }
    background_tasks.add_task(manager.broadcast, event_data, f"ambulance_{req.id}")
    background_tasks.add_task(manager.broadcast, event_data, "hospital_dispatch")
    background_tasks.add_task(manager.broadcast, event_data, "driver_requests")
    
    return {"status": "accepted", "request": serialized}

@router.post("/{id}/decline")
async def decline_request(
    id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    if not req:
        raise HTTPException(404, "Request not found")
        
    # Free up current ambulance and re-search
    if req.ambulance_id:
        amb = db.query(models.Ambulance).filter(models.Ambulance.id == req.ambulance_id).first()
        if amb:
            amb.status = models.AmbulanceStatus.AVAILABLE
            
    req.driver_id = None
    req.ambulance_id = None
    req.status = models.RequestStatus.SEARCHING
    db.commit()
    
    # Try next match
    best_match = ambulance_matcher.match_best(req, db)
    if best_match:
        req.ambulance_id = best_match.id
        req.status = models.RequestStatus.MATCHED
        d = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.assigned_ambulance_id == best_match.id).first()
        if d:
            req.driver_id = d.id
        best_match.status = models.AmbulanceStatus.BUSY
    db.commit()
    
    serialized = serialize_request(req, db)
    background_tasks.add_task(manager.broadcast, {"type": "DRIVER_DECLINED", "request": serialized}, f"ambulance_{req.id}")
    return {"status": "declined", "request": serialized}

@router.post("/{id}/status")
async def update_request_status(
    id: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    if not req:
        raise HTTPException(404, "Request not found")
        
    status_str = payload.get("status")
    try:
        new_status = models.RequestStatus(status_str)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {status_str}")
        
    req.status = new_status
    if new_status == models.RequestStatus.COMPLETED:
        req.completed_at = datetime.utcnow()
        if req.ambulance_id:
            amb = db.query(models.Ambulance).filter(models.Ambulance.id == req.ambulance_id).first()
            if amb:
                amb.status = models.AmbulanceStatus.AVAILABLE
                
    db.commit()
    db.refresh(req)

    # If starting trip to hospital, initiate leg 2 simulation along road route
    if new_status == models.RequestStatus.EN_ROUTE_HOSPITAL:
        driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first() if req.driver_id else None
        s_lat = driver.current_lat if driver and driver.current_lat is not None else req.pickup_lat
        s_lng = driver.current_lng if driver and driver.current_lng is not None else req.pickup_lng
        background_tasks.add_task(
            ambulance_simulator.start_trip_simulation,
            request_id=req.id,
            ambulance_id=req.ambulance_id or "AMB-104",
            from_lat=s_lat,
            from_lng=s_lng,
            to_lat=req.destination_lat,
            to_lng=req.destination_lng,
            target_status=models.RequestStatus.ARRIVED.value
        )
    
    serialized = serialize_request(req, db)
    event_data = {
        "type": "STATUS_UPDATED",
        "status": new_status.value,
        "request": serialized
    }
    background_tasks.add_task(manager.broadcast, event_data, f"ambulance_{req.id}")
    background_tasks.add_task(manager.broadcast, event_data, "hospital_dispatch")
    background_tasks.add_task(manager.broadcast, event_data, "driver_requests")

    return {"status": "updated", "request": serialized}

# Convenience transition actions
@router.post("/{id}/arrived")
async def mark_arrived(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await update_request_status(id, {"status": "ARRIVED"}, background_tasks, db)

@router.post("/{id}/pickup")
async def mark_pickup(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await update_request_status(id, {"status": "PATIENT_PICKED_UP"}, background_tasks, db)

@router.post("/{id}/start-trip")
async def mark_start_trip(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await update_request_status(id, {"status": "EN_ROUTE_HOSPITAL"}, background_tasks, db)

@router.post("/{id}/hospital-arrival")
async def mark_hospital_arrival(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await update_request_status(id, {"status": "ARRIVED"}, background_tasks, db)

@router.post("/{id}/complete")
async def mark_complete(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await update_request_status(id, {"status": "COMPLETED"}, background_tasks, db)

@router.post("/{id}/location")
async def update_location(
    id: str,
    location: schemas.AmbulanceLocationUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    amb_id = req.ambulance_id if req else id
    
    # Also update driver's current position
    if req and req.driver_id:
        driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first()
        if driver:
            driver.current_lat = location.lat
            driver.current_lng = location.lng

    loc = models.AmbulanceLocation(
        ambulance_id=amb_id,
        lat=location.lat,
        lng=location.lng,
        heading=location.heading,
        speed=location.speed or 35.0
    )
    db.add(loc)
    db.commit()
    
    # Broadcast to websocket
    data = {
        "type": "location_update",
        "request_id": id,
        "ambulance_id": amb_id,
        "data": {
            "lat": location.lat,
            "lng": location.lng,
            "eta": 4,
            "speed": location.speed or 35.0
        }
    }
    background_tasks.add_task(manager.broadcast, data, f"ambulance_{id}")
    background_tasks.add_task(manager.broadcast, data, "hospital_dispatch")
    return {"status": "location updated"}

@router.post("/{id}/simulate-movement")
async def trigger_movement_simulation(
    id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    req = db.query(models.AmbulanceRequest).filter(models.AmbulanceRequest.id == id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    leg = payload.get("leg", "to_patient")
    driver = db.query(models.AmbulanceDriver).filter(models.AmbulanceDriver.id == req.driver_id).first() if req.driver_id else None
    start_lat = driver.current_lat if driver and driver.current_lat is not None else DEMO_DRIVER_LOCATION["lat"]
    start_lng = driver.current_lng if driver and driver.current_lng is not None else DEMO_DRIVER_LOCATION["lng"]

    if leg == "to_patient":
        target_lat, target_lng = req.pickup_lat, req.pickup_lng
        target_status = models.RequestStatus.ARRIVING.value
    elif leg == "to_hospital":
        start_lat = driver.current_lat if driver and driver.current_lat is not None else req.pickup_lat
        start_lng = driver.current_lng if driver and driver.current_lng is not None else req.pickup_lng
        target_lat, target_lng = req.destination_lat, req.destination_lng
        target_status = models.RequestStatus.ARRIVED.value
    else:
        raise HTTPException(400, "leg must be to_patient or to_hospital")

    await ambulance_simulator.start_trip_simulation(
        request_id=req.id, ambulance_id=req.ambulance_id or "AMB-104",
        from_lat=start_lat, from_lng=start_lng,
        to_lat=target_lat, to_lng=target_lng,
        target_status=target_status
    )
    return {"status": "simulation_started", "leg": leg, "request_id": req.id}

@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    reset_demo_accounts(db)
    return {
        "status": "success",
        "message": "Jaipur demo environment has been successfully reset!",
        "city": "Jaipur",
        "state": "Rajasthan",
        "country": "India",
        "demo_patient": DEMO_PATIENT_LOCATION,
        "demo_driver": DEMO_DRIVER_LOCATION
    }

@router.websocket("/ws/{request_id}")
async def ambulance_ws(websocket: WebSocket, request_id: str):
    channel = f"ambulance_{request_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket, channel)

@router.websocket("/ws/channel/{channel}")
async def channel_ws(websocket: WebSocket, channel: str):
    """Global real-time channels for driver and hospital command screens."""
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket, channel)
