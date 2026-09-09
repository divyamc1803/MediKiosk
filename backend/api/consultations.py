from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
import auth
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/consultations", tags=["consultations"])

@router.post("", response_model=schemas.ConsultationResponse)
def create_consultation(consultation: schemas.ConsultationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_consultation = models.Consultation(
        patient_id=consultation.patient_id,
        hospital_id=consultation.hospital_id,
        chief_complaint=consultation.chief_complaint,
        priority=consultation.priority,
        status=models.ConsultationStatus.WAITING
    )
    db.add(new_consultation)
    db.commit()
    db.refresh(new_consultation)
    return new_consultation

@router.get("/{id}", response_model=schemas.ConsultationResponse)
def get_consultation(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    consultation = db.query(models.Consultation).filter(models.Consultation.id == id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation

@router.put("/{id}/status", response_model=schemas.ConsultationResponse)
def update_status(id: str, status: models.ConsultationStatus, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    consultation = db.query(models.Consultation).filter(models.Consultation.id == id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    consultation.status = status
    if status == models.ConsultationStatus.COMPLETED:
        consultation.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(consultation)
    return consultation

@router.get("/{id}/history", response_model=schemas.ClinicalHistoryResponse)
def get_history(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    return history
