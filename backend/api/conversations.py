from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models
import schemas
import auth
from database import get_db
from services.conversation_engine import conversation_engine
from services.red_flag_detector import red_flag_detector
from services.clinical_summary import clinical_summary_generator
from services.translation_provider import translation_provider

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _flags_payload(flags):
    return [{
        "keyword": f.get("keyword") if isinstance(f, dict) else getattr(f, "keyword", str(f)),
        "category": f.get("category") if isinstance(f, dict) else getattr(f, "category", "general"),
        "severity": f.get("severity") if isinstance(f, dict) else getattr(f, "severity", "CRITICAL")
    } for f in (flags or [])]


@router.post("")
def start_conversation(session_req: schemas.ConversationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    consultation = db.query(models.Consultation).filter(models.Consultation.id == session_req.consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    consultation.status = models.ConsultationStatus.AI_INTERVIEW

    # Check if active session already exists for this consultation
    existing_session = db.query(models.ConversationSession).filter(
        models.ConversationSession.consultation_id == consultation.id,
        models.ConversationSession.completed_at.is_(None)
    ).order_by(models.ConversationSession.started_at.desc()).first()

    if existing_session and not session_req.restart:
        session = existing_session
        if session_req.language_code and session.language_code != session_req.language_code:
            session.language_code = session_req.language_code
            db.commit()

        norm_state = conversation_engine.normalize_state(session.state)
        session.state = norm_state
        question = conversation_engine.get_question_by_state(norm_state, session.structured_data or {})
        localized_question = translation_provider.translate(question.question_text, "en", session.language_code)
        localized_voice = translation_provider.translate(question.voice_text, "en", session.language_code)
        localized_options = translation_provider.translate_options(question.options or [], "en", session.language_code)

        progress = round((question.question_index / 15) * 100, 4)
        return {
            "id": session.id, "consultation_id": session.consultation_id, "state": session.state,
            "language_code": session.language_code, "started_at": session.started_at.isoformat(),
            "completed_at": None, "initial_question": {
                **question.dict(),
                "question_text": localized_question,
                "voice_text": localized_voice,
                "options": localized_options,
                "progress": progress,
                "question_index": question.question_index,
                "total_questions": 15,
                "is_follow_up": question.is_follow_up,
            }
        }

    if existing_session and session_req.restart:
        db.query(models.ConversationMessage).filter(models.ConversationMessage.session_id == existing_session.id).delete(synchronize_session=False)
        db.delete(existing_session)
        db.commit()

    init_data = {}
    if consultation.chief_complaint:
        init_data["chief_complaint"] = consultation.chief_complaint
    patient = consultation.patient
    if patient and patient.medical_history and isinstance(patient.medical_history, dict):
        chronic = patient.medical_history.get("chronic_conditions")
        if chronic and str(chronic).strip().lower() not in ("none", "not applicable", "n/a", ""):
            init_data["known_conditions"] = str(chronic).strip()

    session = models.ConversationSession(
        consultation_id=consultation.id, state="Q1_CHIEF_COMPLAINT", language_code=session_req.language_code, structured_data=init_data
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    question = conversation_engine.get_question_by_state("Q1_CHIEF_COMPLAINT", session.structured_data or {})
    session.state = question.state
    localized_question = translation_provider.translate(question.question_text, "en", session.language_code)
    localized_voice = translation_provider.translate(question.voice_text, "en", session.language_code)
    localized_options = translation_provider.translate_options(question.options or [], "en", session.language_code)

    db.add(models.ConversationMessage(
        session_id=session.id, role=models.RoleType.AI, content=localized_question,
        message_type=models.MessageType.TEXT, options=localized_options, question_state=question.state
    ))
    db.commit()

    progress = round((question.question_index / 15) * 100, 4)
    return {
        "id": session.id, "consultation_id": session.consultation_id, "state": session.state,
        "language_code": session.language_code, "started_at": session.started_at.isoformat(),
        "completed_at": None, "initial_question": {
            **question.dict(),
            "question_text": localized_question,
            "voice_text": localized_voice,
            "options": localized_options,
            "progress": progress,
            "question_index": question.question_index,
            "total_questions": 15,
            "is_follow_up": question.is_follow_up,
        }
    }


@router.get("/translation/status")
def translation_status(current_user: models.User = Depends(auth.get_current_user)):
    return translation_provider.status()


@router.put("/{id}/language")
def update_language(id: str, payload: Dict[str, str], db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    session = db.query(models.ConversationSession).filter(models.ConversationSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    new_lang = payload.get("language_code", "en")
    session.language_code = new_lang
    db.commit()

    norm_state = conversation_engine.normalize_state(session.state)
    question = conversation_engine.get_question_by_state(norm_state, session.structured_data or {})
    localized_question = translation_provider.translate(question.question_text, "en", session.language_code)
    localized_voice = translation_provider.translate(question.voice_text, "en", session.language_code)
    localized_options = translation_provider.translate_options(question.options or [], "en", session.language_code)

    progress = round((question.question_index / 15) * 100, 4)
    return {
        "id": session.id,
        "language_code": session.language_code,
        "current_question": {
            **question.dict(),
            "question_text": localized_question,
            "voice_text": localized_voice,
            "options": localized_options,
            "progress": progress,
            "question_index": question.question_index,
            "total_questions": 15,
            "is_follow_up": question.is_follow_up,
        }
    }


@router.post("/{id}/message")
def send_message(id: str, message: schemas.MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    session = db.query(models.ConversationSession).filter(models.ConversationSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_state = session.state
    english_content = translation_provider.translate(message.content, session.language_code, "en")
    patient_msg = models.ConversationMessage(
        session_id=session.id, role=models.RoleType.PATIENT, content=message.content, original_language=session.language_code, translated_content=english_content,
        message_type=message.message_type, selected_option=message.selected_option,
        question_state=current_state
    )
    db.add(patient_msg)

    data = conversation_engine.merge_answer(session.structured_data or {}, current_state, english_content)
    consultation = db.query(models.Consultation).filter(models.Consultation.id == session.consultation_id).first()
    if consultation:
        if current_state in ("CHIEF_COMPLAINT", "Q1_CHIEF_COMPLAINT"):
            consultation.chief_complaint = english_content.strip()
            data["chief_complaint"] = english_content.strip()
        if "known_conditions" not in data and consultation.patient and isinstance(consultation.patient.medical_history, dict):
            chronic = consultation.patient.medical_history.get("chronic_conditions")
            if chronic and str(chronic).strip().lower() not in ("none", "not applicable", "n/a", ""):
                data["known_conditions"] = str(chronic).strip()
    session.structured_data = data

    flags = red_flag_detector.detect(english_content, "en")
    if flags and consultation:
        consultation.priority = models.Priority.CRITICAL
        consultation.status = models.ConsultationStatus.EMERGENCY
        db.add(models.EmergencyAlert(
            patient_id=consultation.patient_id, consultation_id=consultation.id,
            red_flags=_flags_payload(flags), priority=models.Priority.CRITICAL
        ))

    next_question = conversation_engine.get_next_question(session.id, current_state, data, last_message=english_content)
    session.state = next_question.state
    localized_next = translation_provider.translate(next_question.question_text, "en", session.language_code)
    localized_next_voice = translation_provider.translate(next_question.voice_text, "en", session.language_code)
    localized_next_options = translation_provider.translate_options(next_question.options or [], "en", session.language_code)

    db.add(models.ConversationMessage(
        session_id=session.id, role=models.RoleType.AI, content=localized_next,
        message_type=models.MessageType.TEXT, options=localized_next_options, question_state=next_question.state
    ))
    db.commit()
    db.refresh(patient_msg)

    progress = round((next_question.question_index / 15) * 100, 4)
    return {
        "message": {
            "id": patient_msg.id, "session_id": session.id, "role": "PATIENT", "content": message.content,
            "original_language": None, "translated_content": None, "message_type": message.message_type,
            "options": None, "timestamp": patient_msg.timestamp.isoformat()
        },
        "ai_response": {
            "question": localized_next, "question_text": localized_next,
            "voice_text": localized_next_voice, "options": localized_next_options,
            "state": next_question.state, "progress": progress,
            "question_index": next_question.question_index,
            "total_questions": 15,
            "is_follow_up": next_question.is_follow_up,
            "red_flags": _flags_payload(flags)
        },
        "structured_data": data,
    }


@router.get("/{id}/transcript", response_model=List[schemas.MessageResponse])
def get_transcript(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ConversationMessage).filter(
        models.ConversationMessage.session_id == id
    ).order_by(models.ConversationMessage.timestamp.asc()).all()


@router.post("/{id}/complete")
def complete_conversation(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    session = db.query(models.ConversationSession).filter(models.ConversationSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    history = clinical_summary_generator.generate(session.consultation_id, db)
    consultation = db.query(models.Consultation).filter(models.Consultation.id == session.consultation_id).first()
    if consultation and consultation.status != models.ConsultationStatus.EMERGENCY:
        consultation.status = models.ConsultationStatus.READY
        # Check if follow-up already exists to prevent duplicate reminders
        existing_fu = db.query(models.PatientFollowUp).filter(
            models.PatientFollowUp.consultation_id == consultation.id,
            models.PatientFollowUp.status == "PENDING"
        ).first()
        if not existing_fu:
            db.add(models.PatientFollowUp(patient_id=consultation.patient_id, consultation_id=consultation.id, message="Please check in on your symptoms and update your care team if they change.", due_at=__import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(days=7)))
    session.state = "COMPLETE"
    session.completed_at = __import__("datetime").datetime.utcnow()
    db.commit()
    return {"status": "success", "history_id": history.id, "structured_data": session.structured_data or {}}
