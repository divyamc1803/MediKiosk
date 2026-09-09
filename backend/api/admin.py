from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models
import auth
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    total_users = db.query(models.User).count()
    active_consultations = db.query(models.Consultation).filter(models.Consultation.status != models.ConsultationStatus.COMPLETED).count()
    available_ambulances = db.query(models.Ambulance).filter(models.Ambulance.status == models.AmbulanceStatus.AVAILABLE).count()
    critical_alerts = db.query(models.EmergencyAlert).filter(models.EmergencyAlert.status == models.AlertStatus.ACTIVE).count()
    
    return {
        "total_users": total_users,
        "active_consultations": active_consultations,
        "available_ambulances": available_ambulances,
        "critical_alerts": critical_alerts
    }

@router.get("/users")
def get_users(role: str = None, facility_id: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    q = db.query(models.User)
    if role: q = q.filter(models.User.role == role)
    if facility_id: q = q.filter(models.User.facility_id == facility_id)
    return q.order_by(models.User.full_name.asc()).all()

@router.get("/audit-log")
def get_audit_log(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()

@router.get("/ambulances")
def get_ambulances(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    return db.query(models.Ambulance).all()

@router.get("/hospitals")
def get_hospitals(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    return db.query(models.Hospital).all()


@router.patch("/users/{user_id}/active")
def set_user_active(user_id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    user=db.query(models.User).filter(models.User.id==user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active=bool(payload.get("is_active", True)); db.add(models.AuditLog(user_id=current_user.id,action="USER_STATUS_UPDATED",entity_type="USER",entity_id=user_id,details={"is_active":user.is_active}));db.commit();return {"id":user.id,"is_active":user.is_active}

@router.patch("/ambulances/{ambulance_id}/status")
def set_ambulance_status(ambulance_id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    amb=db.query(models.Ambulance).filter(models.Ambulance.id==ambulance_id).first()
    if not amb: raise HTTPException(status_code=404, detail="Ambulance not found")
    try: amb.status=models.AmbulanceStatus(payload.get("status"))
    except Exception: raise HTTPException(status_code=422, detail="Invalid ambulance status")
    db.add(models.AuditLog(user_id=current_user.id,action="AMBULANCE_STATUS_UPDATED",entity_type="AMBULANCE",entity_id=ambulance_id,details={"status":amb.status.value}));db.commit();return {"id":amb.id,"status":amb.status.value}


@router.get("/rbac/roles")
def get_rbac_roles(current_user: models.User = Depends(auth.require_role("ADMIN"))):
    return [
        {"value": r.value, "label": r.value.replace("_", " ").title()}
        for r in models.FacilityRole
    ]

@router.patch("/users/{user_id}/rbac")
def assign_user_rbac(user_id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("ADMIN"))):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    facility_id = payload.get("facility_id")
    facility_role = payload.get("facility_role")
    if facility_id and not db.query(models.Hospital).filter(models.Hospital.id == facility_id).first():
        raise HTTPException(status_code=404, detail="Clinic or hospital not found")
    valid = {r.value for r in models.FacilityRole}
    if facility_role and facility_role not in valid:
        raise HTTPException(status_code=422, detail="Invalid facility role")
    user.facility_id = facility_id or None
    user.facility_role = facility_role or None
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user_id).first()
    if doc and facility_id:
        doc.hospital_id = facility_id
    db.add(models.AuditLog(user_id=current_user.id, action="RBAC_ASSIGNMENT_UPDATED", entity_type="USER", entity_id=user_id, details={"facility_id": facility_id, "facility_role": facility_role}))
    db.commit(); db.refresh(user)
    return {"id": user.id, "facility_id": user.facility_id, "facility_role": user.facility_role}
