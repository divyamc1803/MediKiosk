from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
import models
import schemas
import auth
from database import get_db

router = APIRouter(prefix="/patients", tags=["patients"])

MEDICAL_HISTORY_REQUIRED_FIELDS = [
    "chronic_conditions", "previous_hospitalizations", "surgeries", "allergies",
    "serious_allergic_reaction", "current_medications", "supplements_ayurvedic",
    "previous_diagnoses", "family_history", "major_injuries", "blood_history",
    "ongoing_undiagnosed_concerns", "recent_doctor_visits", "previous_treatments",
    "additional_history"
]

@router.get("/by-user/{user_id}", response_model=schemas.PatientProfile)
def get_patient_by_user_id(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.user_id == user_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Load user relationship
    patient.user = db.query(models.User).filter(models.User.id == patient.user_id).first()
    return patient


@router.get("/{id}/profile")
def get_patient_profile(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    user = db.query(models.User).filter(models.User.id == patient.user_id).first()
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == id).order_by(models.Consultation.created_at.desc()).all()
    consultation_rows = []
    for c in consultations:
        h = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == c.id).first()
        consultation_rows.append({
            "id": c.id, "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "priority": c.priority.value if hasattr(c.priority, "value") else str(c.priority),
            "chief_complaint": c.chief_complaint, "created_at": c.created_at.isoformat() if c.created_at else None,
            "history": {
                "id": h.id, "chief_complaint": h.chief_complaint, "hpi": h.hpi,
                "past_medical": h.past_medical, "past_surgical": h.past_surgical,
                "drug_history": h.drug_history, "allergy_history": h.allergy_history,
                "family_history": h.family_history, "personal_history": h.personal_history,
                "review_of_systems": h.review_of_systems, "current_symptoms": h.current_symptoms,
                "previous_investigations": h.previous_investigations, "previous_treatments": h.previous_treatments,
                "document_summary": h.document_summary, "ayurvedic_history": h.ayurvedic_history,
                "red_flags": h.red_flags or [], "missing_info": h.missing_info or [],
                "ai_generated": h.ai_generated, "doctor_verified": h.doctor_verified
            } if h else None
        })
    medications = db.query(models.Medication).filter(models.Medication.patient_id == id).all()
    allergies = db.query(models.Allergy).filter(models.Allergy.patient_id == id).all()
    documents = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == id).order_by(models.MedicalDocument.uploaded_at.desc()).all()
    timeline = db.query(models.PatientTimeline).filter(models.PatientTimeline.patient_id == id).order_by(models.PatientTimeline.event_date.desc()).limit(30).all()
    return {
        "patient": {
            "id": patient.id, "user_id": patient.user_id, "date_of_birth": patient.date_of_birth, "age": patient.age,
            "gender": patient.gender, "blood_group": patient.blood_group, "preferred_language": patient.preferred_language,
            "abha_id": patient.abha_id, "address": patient.address,
            "emergency_contact_name": patient.emergency_contact_name, "emergency_contact_phone": patient.emergency_contact_phone,
            "medical_history": patient.medical_history or {},
            "user": {"id": user.id, "full_name": user.full_name, "email": user.email, "phone": user.phone} if user else None
        },
        "consultations": consultation_rows,
        "medications": [{"id": m.id, "name": m.name, "dosage": m.dosage, "frequency": m.frequency, "is_active": m.is_active, "source": m.source} for m in medications],
        "allergies": [{"id": a.id, "allergen": a.allergen, "reaction": a.reaction, "severity": a.severity.value if hasattr(a.severity, "value") else a.severity, "source": a.source} for a in allergies],
        "documents": [{"id": d.id, "file_name": d.file_name, "document_type": d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type), "ocr_status": d.ocr_status.value if hasattr(d.ocr_status, "value") else str(d.ocr_status), "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None} for d in documents],
        "timeline": [{"id": t.id, "event_type": t.event_type, "event_date": t.event_date.isoformat() if t.event_date else None, "title": t.title, "description": t.description} for t in timeline]
    }


@router.post("/{id}/onboarding")
def complete_onboarding(id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    if current_user.role != models.Role.ADMIN and patient.user_id != current_user.id:
        raise HTTPException(403, "Not allowed")

    # ABHA is intentionally optional. Age is calculated from DOB and is never supplied by the patient.
    required = ["date_of_birth", "emergency_contact_name", "emergency_contact_phone", "preferred_language"]
    missing = [x for x in required if payload.get(x) in (None, "") or (isinstance(payload.get(x), str) and not payload.get(x).strip())]
    if missing:
        raise HTTPException(422, {"message": "Mandatory patient details missing", "missing": missing})

    try:
        dob = date.fromisoformat(str(payload["date_of_birth"]))
    except ValueError:
        raise HTTPException(422, "Invalid date of birth")
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 0 or age > 120:
        raise HTTPException(422, "Invalid date of birth")

    if not payload.get("ambulance_consent") or not payload.get("medical_care_consent"):
        raise HTTPException(422, "Both consent checkboxes are required before continuing")

    history = patient.medical_history or {}
    if not isinstance(history, dict) or not history.get("completed"):
        raise HTTPException(422, "Medical history questionnaire is mandatory. Please complete Medical History before submitting your profile.")
    history_missing = [key for key in MEDICAL_HISTORY_REQUIRED_FIELDS if str(history.get(key, "")).strip() == ""]
    if history_missing:
        raise HTTPException(422, {"message": "Please complete every Medical History question before continuing.", "missing": history_missing})

    for key in ["date_of_birth", "gender", "blood_group", "preferred_language", "abha_id", "address", "emergency_contact_name", "emergency_contact_phone"]:
        if key in payload:
            value = payload[key]
            if key == "abha_id" and isinstance(value, str) and not value.strip():
                value = None
            setattr(patient, key, value)
    patient.age = age
    patient.medical_history = history

    # Upsert consents so repeated profile saves do not create duplicate consent rows.
    for purpose in ["AMBULANCE_RECEIPT", "MEDICAL_CARE"]:
        consent = db.query(models.Consent).filter(models.Consent.patient_id == id, models.Consent.purpose == purpose).order_by(models.Consent.given_at.desc()).first()
        if consent:
            consent.consent_status = models.ConsentStatus.GIVEN
            consent.given_at = datetime.utcnow()
            consent.consent_version = "2026.09"
        else:
            db.add(models.Consent(patient_id=id, purpose=purpose, consent_version="2026.09", consent_status=models.ConsentStatus.GIVEN, given_at=datetime.utcnow()))

    db.commit()
    db.refresh(patient)
    return {"status": "complete", "patient": patient, "age": age}

@router.get("/{id}/medical-history")
def get_medical_history(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    if current_user.role != models.Role.ADMIN and patient.user_id != current_user.id:
        raise HTTPException(403, "Not allowed")
    history = patient.medical_history or {}
    completed = bool(history.get("completed")) and not [key for key in MEDICAL_HISTORY_REQUIRED_FIELDS if str(history.get(key, "")).strip() == ""]
    return {"completed": completed, "medical_history": history}

@router.post("/{id}/medical-history")
def save_medical_history(id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    if current_user.role != models.Role.ADMIN and patient.user_id != current_user.id:
        raise HTTPException(403, "Not allowed")
    required = MEDICAL_HISTORY_REQUIRED_FIELDS
    missing = [key for key in required if str(payload.get(key, "")).strip() == ""]
    if missing:
        raise HTTPException(422, {"message": "Please answer every medical-history question.", "missing": missing})
    patient.medical_history = {**payload, "completed": True}
    db.commit(); db.refresh(patient)
    return {"status": "complete", "medical_history": patient.medical_history}

@router.get("/{id}/follow-ups")
def get_followups(id: str, db: Session=Depends(get_db), current_user: models.User=Depends(auth.get_current_user)):
    rows=db.query(models.PatientFollowUp).filter(models.PatientFollowUp.patient_id==id,models.PatientFollowUp.status=="PENDING").order_by(models.PatientFollowUp.due_at.asc()).all()
    return [{"id":r.id,"message":r.message,"due_at":r.due_at.isoformat(),"status":r.status} for r in rows]

@router.get("/{id}", response_model=schemas.PatientProfile)
def get_patient(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.user = db.query(models.User).filter(models.User.id == patient.user_id).first()
    return patient

@router.put("/{id}", response_model=schemas.PatientResponse)
def update_patient(id: str, patient_update: schemas.PatientBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    for key, value in patient_update.dict(exclude_unset=True).items():
        setattr(patient, key, value)
        
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{id}/timeline", response_model=List[schemas.TimelineResponse])
def get_timeline(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    timeline = db.query(models.PatientTimeline).filter(models.PatientTimeline.patient_id == id).order_by(models.PatientTimeline.event_date.desc()).all()
    return timeline

@router.get("/{id}/documents", response_model=List[schemas.DocumentResponse])
def get_documents(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    docs = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == id).all()
    return docs

@router.get("/{id}/medications")
def get_medications(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    meds = db.query(models.Medication).filter(models.Medication.patient_id == id).all()
    return meds

@router.get("/{id}/allergies")
def get_allergies(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    allergies = db.query(models.Allergy).filter(models.Allergy.patient_id == id).all()
    return allergies

@router.get("/{id}/consultations", response_model=List[schemas.ConsultationResponse])
def get_consultations(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == id).order_by(models.Consultation.created_at.desc()).all()
    return consultations
