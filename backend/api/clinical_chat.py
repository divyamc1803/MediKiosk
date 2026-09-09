from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models, auth
from database import get_db
from services.translation_provider import translation_provider

router = APIRouter(prefix="/clinical-chat", tags=["clinical-chat"])

def access(c, u, db):
    p = db.query(models.Patient).filter(models.Patient.id == c.patient_id).first()
    # Doctors, Admins, Staff can access triage consultations; Patients can access their own
    return u.role in [models.Role.ADMIN, models.Role.STAFF, models.Role.DOCTOR] or (p and p.user_id == u.id)

@router.get("/{cid}")
def get(cid: str, lang: Optional[str] = Query(None), db: Session = Depends(get_db), u: models.User = Depends(auth.get_current_user)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    if not c or not access(c, u, db):
        raise HTTPException(404, "Consultation not found")

    rows = db.query(models.ClinicalChatMessage).filter(models.ClinicalChatMessage.consultation_id == cid).order_by(models.ClinicalChatMessage.created_at.asc()).all()

    p = db.query(models.Patient).filter(models.Patient.id == c.patient_id).first()
    is_patient_viewer = (u.role == models.Role.PATIENT) or (p and p.user_id == u.id)

    target_lang = "en"
    if is_patient_viewer:
        target_lang = (lang or (p.preferred_language if p else "hi") or "hi").strip().lower()
        lang_map = {"hindi": "hi", "marathi": "mr", "bengali": "bn", "tamil": "ta", "telugu": "te", "gujarati": "gu", "english": "en"}
        target_lang = lang_map.get(target_lang, target_lang)

    results = []
    for r in rows:
        msg = {
            "id": r.id,
            "sender_role": r.sender_role,
            "sender_user_id": r.sender_user_id,
            "content": r.content,
            "created_at": r.created_at.isoformat()
        }
        # If viewed by patient and sender is doctor, translate to patient's preferred language
        if is_patient_viewer and r.sender_role == "DOCTOR" and target_lang and target_lang != "en":
            try:
                msg["translated_content"] = translation_provider.translate(r.content, "en", target_lang)
            except Exception as exc:
                print(f"Failed to translate doctor chat message: {exc}")
                msg["translated_content"] = r.content
        results.append(msg)

    return results

@router.post("/{cid}")
def send(cid: str, payload: dict, db: Session = Depends(get_db), u: models.User = Depends(auth.get_current_user)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    content = str(payload.get("content", "")).strip()
    if not c or not access(c, u, db):
        raise HTTPException(404, "Consultation not found")
    if not content:
        raise HTTPException(400, "Message is required")

    # If doctor is sending and consultation has no assigned doctor, assign them
    if u.role == models.Role.DOCTOR and not c.doctor_id:
        doc = db.query(models.Doctor).filter(models.Doctor.user_id == u.id).first()
        if doc:
            c.doctor_id = doc.id

    r = models.ClinicalChatMessage(
        consultation_id=cid,
        sender_user_id=u.id,
        sender_role=u.role.value,
        content=content
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {
        "id": r.id,
        "sender_role": r.sender_role,
        "sender_user_id": r.sender_user_id,
        "content": r.content,
        "created_at": r.created_at.isoformat()
    }

