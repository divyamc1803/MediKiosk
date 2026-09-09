from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import models
import schemas
import auth
from database import get_db

router = APIRouter(prefix="/doctors", tags=["doctors"])

class VerifySummaryPayload(BaseModel):
    consultation_id: Optional[str] = None
    history_id: Optional[str] = None
    action: Optional[str] = "VERIFY"
    sections: Optional[Dict[str, Any]] = None

@router.get("/queue", response_model=List[schemas.QueueItemResponse])
def get_queue(status: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN", "STAFF"))):
    query = db.query(models.Consultation)
    if status and status != 'ALL':
        try:
            c_status = models.ConsultationStatus(status)
            query = query.filter(models.Consultation.status == c_status)
        except ValueError:
            pass
    else:
        query = query.filter(models.Consultation.status.in_([
            models.ConsultationStatus.WAITING,
            models.ConsultationStatus.READY,
            models.ConsultationStatus.NEEDS_REVIEW,
            models.ConsultationStatus.EMERGENCY,
            models.ConsultationStatus.PROCESSING,
            models.ConsultationStatus.AI_INTERVIEW
        ]))
    consultations = query.all()

    # Priority sort: CRITICAL first, then HIGH, then NORMAL; then by created_at desc
    prio_order = {models.Priority.CRITICAL: 0, models.Priority.HIGH: 1, models.Priority.NORMAL: 2}
    consultations.sort(key=lambda c: (prio_order.get(c.priority, 3), -(c.created_at.timestamp() if c.created_at else 0)))

    res = []
    for c in consultations:
        patient = c.patient
        if not patient or not patient.user:
            continue
        has_history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == c.id).first() is not None
        if not has_history and patient.medical_history:
            has_history = True
        doc_count = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == patient.id).count()

        res.append({
            "id": c.id,
            "consultation_id": c.id,
            "patient_id": patient.id,
            "patient_name": patient.user.full_name,
            "patient_age": patient.age or 0,
            "patient_gender": patient.gender or "Unknown",
            "chief_complaint": c.chief_complaint,
            "priority": c.priority,
            "status": c.status,
            "has_history": has_history,
            "document_count": doc_count,
            "created_at": c.created_at,
            "age": patient.age or 0,
            "gender": patient.gender or "Unknown",
            "waiting_since": c.created_at
        })
    return res

@router.get("/patients/{patient_id}")
def get_patient_clinical_view(patient_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN", "STAFF"))):
    # 1. Look up by patient id
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    # 2. Look up by user id
    if not patient:
        patient = db.query(models.Patient).filter(models.Patient.user_id == patient_id).first()
    # 3. Look up by consultation id
    latest_consultation = None
    if not patient:
        c_by_id = db.query(models.Consultation).filter(models.Consultation.id == patient_id).first()
        if c_by_id:
            patient = c_by_id.patient
            latest_consultation = c_by_id

    if not patient:
        raise HTTPException(404, "Patient not found")

    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient.id).order_by(models.Consultation.created_at.desc()).all()
    if not latest_consultation:
        latest_consultation = consultations[0] if consultations else None

    if not latest_consultation:
        latest_consultation = models.Consultation(
            patient_id=patient.id,
            chief_complaint="General Clinical Follow-up",
            priority=models.Priority.NORMAL,
            status=models.ConsultationStatus.WAITING
        )
        db.add(latest_consultation)
        db.commit()
        db.refresh(latest_consultation)

    history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == latest_consultation.id).first()

    # Case-taking session & messages
    latest_session = db.query(models.ConversationSession).filter(
        models.ConversationSession.consultation_id == latest_consultation.id
    ).order_by(models.ConversationSession.started_at.desc()).first()

    case_taking_transcript = []
    if latest_session:
        messages = db.query(models.ConversationMessage).filter(
            models.ConversationMessage.session_id == latest_session.id
        ).order_by(models.ConversationMessage.timestamp.asc()).all()
        case_taking_transcript = [
            {
                "id": m.id,
                "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                "content": m.content,
                "original_language": m.original_language,
                "translated_content": m.translated_content,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "question_state": m.question_state
            }
            for m in messages
        ]

    # Documents with extraction details
    documents = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == patient.id).all()
    docs_payload = []
    for d in documents:
        ext = db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == d.id).first()
        docs_payload.append({
            "id": d.id,
            "patient_id": d.patient_id,
            "consultation_id": d.consultation_id,
            "document_type": d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type),
            "file_path": d.file_path,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "ocr_status": d.ocr_status.value if hasattr(d.ocr_status, "value") else str(d.ocr_status),
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "extraction": {
                "id": ext.id,
                "document_id": ext.document_id,
                "extracted_text": ext.extracted_text,
                "extracted_data": ext.extracted_data,
                "confidence_score": ext.confidence_score,
                "extracted_at": ext.extracted_at.isoformat() if ext.extracted_at else None,
            } if ext else None
        })

    # Medications
    medications = db.query(models.Medication).filter(models.Medication.patient_id == patient.id).all()
    meds_payload = [
        {
            "id": m.id,
            "patient_id": m.patient_id,
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "route": m.route,
            "start_date": m.start_date,
            "end_date": m.end_date,
            "is_active": m.is_active,
            "source": m.source
        }
        for m in medications
    ]

    # Allergies
    allergies = db.query(models.Allergy).filter(models.Allergy.patient_id == patient.id).all()
    allergies_payload = [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "allergen": a.allergen,
            "reaction": a.reaction,
            "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity) if a.severity else "MILD",
            "source": a.source
        }
        for a in allergies
    ]

    # Doctor notes
    existing_note = db.query(models.DoctorNote).filter(models.DoctorNote.consultation_id == latest_consultation.id).order_by(models.DoctorNote.created_at.desc()).first()

    # Timeline
    timeline = db.query(models.PatientTimeline).filter(models.PatientTimeline.patient_id == patient.id).order_by(models.PatientTimeline.created_at.desc()).all()

    # Medical history - 15 questions
    medical_history = patient.medical_history or {}

    return {
        "patient": {
            "id": patient.id,
            "user_id": patient.user_id,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "preferred_language": patient.preferred_language,
            "abha_id": patient.abha_id,
            "address": patient.address,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "medical_history": medical_history,
            "user": {
                "id": patient.user.id,
                "full_name": patient.user.full_name,
                "email": patient.user.email,
                "phone": patient.user.phone,
                "role": patient.user.role.value if hasattr(patient.user.role, "value") else str(patient.user.role),
            } if patient.user else None
        },
        "medical_history": medical_history,
        "consultation": {
            "id": latest_consultation.id,
            "patient_id": latest_consultation.patient_id,
            "doctor_id": latest_consultation.doctor_id,
            "hospital_id": latest_consultation.hospital_id,
            "status": latest_consultation.status.value if hasattr(latest_consultation.status, "value") else str(latest_consultation.status),
            "priority": latest_consultation.priority.value if hasattr(latest_consultation.priority, "value") else str(latest_consultation.priority),
            "chief_complaint": latest_consultation.chief_complaint,
            "created_at": latest_consultation.created_at.isoformat() if latest_consultation.created_at else None,
            "completed_at": latest_consultation.completed_at.isoformat() if latest_consultation.completed_at else None,
        },
        "history": {
            "id": history.id,
            "consultation_id": history.consultation_id,
            "chief_complaint": history.chief_complaint,
            "hpi": history.hpi,
            "past_medical": history.past_medical,
            "past_surgical": history.past_surgical,
            "drug_history": history.drug_history,
            "allergy_history": history.allergy_history,
            "family_history": history.family_history,
            "personal_history": history.personal_history,
            "review_of_systems": history.review_of_systems,
            "previous_investigations": history.previous_investigations,
            "current_symptoms": history.current_symptoms,
            "previous_treatments": history.previous_treatments,
            "document_summary": history.document_summary,
            "ayurvedic_history": history.ayurvedic_history,
            "red_flags": history.red_flags,
            "missing_info": history.missing_info,
            "ai_generated": history.ai_generated,
            "doctor_verified": history.doctor_verified,
            "verified_by": history.verified_by,
            "verified_at": history.verified_at.isoformat() if history.verified_at else None,
        } if history else None,
        "case_taking": {
            "session_id": latest_session.id if latest_session else None,
            "state": latest_session.state if latest_session else "NO_SESSION",
            "started_at": latest_session.started_at.isoformat() if latest_session and latest_session.started_at else None,
            "completed_at": latest_session.completed_at.isoformat() if latest_session and latest_session.completed_at else None,
            "structured_data": latest_session.structured_data if latest_session else {},
            "transcript": case_taking_transcript
        },
        "documents": docs_payload,
        "medications": meds_payload,
        "allergies": allergies_payload,
        "notes": {
            "id": existing_note.id,
            "consultation_id": existing_note.consultation_id,
            "doctor_id": existing_note.doctor_id,
            "observations": existing_note.observations,
            "assessment": existing_note.assessment,
            "plan": existing_note.plan,
            "prescription_notes": existing_note.prescription_notes,
            "follow_up": existing_note.follow_up,
            "additional_comments": existing_note.additional_comments,
            "created_at": existing_note.created_at.isoformat() if existing_note.created_at else None,
            "updated_at": existing_note.updated_at.isoformat() if existing_note.updated_at else None,
        } if existing_note else None,
        "timeline": timeline
    }

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN", "STAFF"))):
    patients_today = db.query(models.Patient).count()
    consultations_completed = db.query(models.Consultation).filter(models.Consultation.status == models.ConsultationStatus.COMPLETED).count()
    pending_reviews = db.query(models.Consultation).filter(models.Consultation.status.in_([
        models.ConsultationStatus.READY,
        models.ConsultationStatus.NEEDS_REVIEW,
        models.ConsultationStatus.WAITING,
        models.ConsultationStatus.AI_INTERVIEW
    ])).count()
    emergency_alerts = db.query(models.EmergencyAlert).filter(models.EmergencyAlert.status == models.AlertStatus.ACTIVE).count()
    return {
        "patients_today": patients_today,
        "consultations_completed": consultations_completed,
        "pending_reviews": pending_reviews,
        "emergency_alerts": emergency_alerts
    }

@router.get("/communications")
def get_doctor_communications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN", "STAFF"))):
    consultations = db.query(models.Consultation).order_by(models.Consultation.created_at.desc()).limit(15).all()
    results = []
    for c in consultations:
        p = c.patient
        if not p or not p.user:
            continue
        last_msg = db.query(models.ClinicalChatMessage).filter(models.ClinicalChatMessage.consultation_id == c.id).order_by(models.ClinicalChatMessage.created_at.desc()).first()
        results.append({
            "patient_id": p.id,
            "patient_name": p.user.full_name,
            "age": p.age or 35,
            "gender": p.gender or "M",
            "consultation_id": c.id,
            "chief_complaint": c.chief_complaint or "Medical triage inquiry",
            "latest_message": last_msg.content if last_msg else (f"Patient reported: {c.chief_complaint or 'Acute symptoms for review'}"),
            "sender_role": last_msg.sender_role if last_msg else "PATIENT",
            "unread": (last_msg.sender_role == "PATIENT") if last_msg else True,
            "timestamp": (last_msg.created_at.isoformat() if last_msg else c.created_at.isoformat())
        })
    return results

@router.post("/verify-summary")
def verify_summary(
    payload: Optional[VerifySummaryPayload] = None,
    history_id: Optional[str] = None,
    consultation_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN"))
):
    h_id = (payload.history_id if payload else None) or history_id
    c_id = (payload.consultation_id if payload else None) or consultation_id

    history = None
    if h_id:
        history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.id == h_id).first()
    if not history and c_id:
        history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == c_id).first()

    if not history:
        if c_id:
            c = db.query(models.Consultation).filter(models.Consultation.id == c_id).first()
            if c:
                history = models.ClinicalHistory(
                    consultation_id=c.id,
                    chief_complaint=c.chief_complaint or "Medical consultation",
                    doctor_verified=True,
                    ai_generated=False
                )
                db.add(history)
                db.commit()
                db.refresh(history)
        if not history:
            raise HTTPException(404, "Clinical history not found for this consultation")

    if payload and payload.sections:
        for k, v in payload.sections.items():
            if hasattr(history, k):
                setattr(history, k, v)

    history.doctor_verified = True
    history.verified_at = datetime.utcnow()
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == current_user.id).first()
    if doc:
        history.verified_by = doc.id
    db.commit()
    return {"status": "verified", "history_id": history.id}

@router.post("/notes")
def add_note(
    note: schemas.DoctorNoteCreate,
    consultation_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN"))
):
    target_cid = note.consultation_id or consultation_id
    if not target_cid:
        raise HTTPException(400, "consultation_id is required")

    doc = db.query(models.Doctor).filter(models.Doctor.user_id == current_user.id).first()
    doc_id = doc.id if doc else "DOC-DEFAULT"

    existing_note = db.query(models.DoctorNote).filter(models.DoctorNote.consultation_id == target_cid).first()
    if existing_note:
        if note.observations is not None: existing_note.observations = note.observations
        if note.assessment is not None: existing_note.assessment = note.assessment
        if note.plan is not None: existing_note.plan = note.plan
        if note.prescription_notes is not None: existing_note.prescription_notes = note.prescription_notes
        if note.follow_up is not None: existing_note.follow_up = note.follow_up
        if note.additional_comments is not None: existing_note.additional_comments = note.additional_comments
        existing_note.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_note)
        return existing_note
    else:
        note_dict = note.dict()
        note_dict["consultation_id"] = target_cid
        note_dict["doctor_id"] = doc_id
        n = models.DoctorNote(**note_dict)
        db.add(n)
        db.commit()
        db.refresh(n)
        return n

@router.get("/emergency-alerts", response_model=List[schemas.EmergencyAlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN", "STAFF"))):
    return db.query(models.EmergencyAlert).filter(models.EmergencyAlert.status == models.AlertStatus.ACTIVE).all()

@router.post("/emergency-alerts/{id}/acknowledge")
def ack_alert(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role("DOCTOR", "ADMIN"))):
    alert = db.query(models.EmergencyAlert).filter(models.EmergencyAlert.id == id).first()
    if alert:
        alert.status = models.AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = current_user.id
        db.commit()
    return {"status": "acknowledged"}



@router.get("/nearby")
def get_nearby_doctors(lat: float = 26.9124, lng: float = 75.7873, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    doctors = db.query(models.Doctor).all()
    rows = []
    for doc in doctors:
        u = db.query(models.User).filter(models.User.id == doc.user_id).first()
        facility_id = doc.hospital_id or (u.facility_id if u else None)
        facility = db.query(models.Hospital).filter(models.Hospital.id == facility_id).first() if facility_id else None
        dlat, dlng = (facility.lat, facility.lng) if facility else (26.9124, 75.7873)
        # lightweight great-circle distance in km
        from math import radians, sin, cos, atan2, sqrt
        R=6371.0; p=radians
        a=sin(p(dlat-lat)/2)**2+cos(p(lat))*cos(p(dlat))*sin(p(dlng-lng)/2)**2
        km=R*2*atan2(sqrt(a),sqrt(max(0,1-a)))
        rows.append({"id":doc.id,"name":u.full_name if u else "Doctor","specialization":doc.specialization,"department":doc.department,"hospital_id":facility.id if facility else None,"hospital_name":facility.name if facility else "MediKiosk Care Network","lat":dlat,"lng":dlng,"km":round(km,2),"phone":u.phone if u else None})
    return sorted(rows, key=lambda x:x["km"])
