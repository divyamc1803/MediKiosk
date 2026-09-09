from sqlalchemy.orm import Session
from models import ClinicalHistory, ConversationSession, ConversationMessage, Consultation
from services.ai_provider import ai_provider


class ClinicalSummaryGenerator:
    def generate(self, consultation_id: str, db: Session) -> ClinicalHistory:
        session = db.query(ConversationSession).filter(ConversationSession.consultation_id == consultation_id).first()
        if not session:
            raise ValueError("Conversation session not found")

        data = dict(session.structured_data or {})
        messages = db.query(ConversationMessage).filter(
            ConversationMessage.session_id == session.id,
            ConversationMessage.role == "PATIENT"
        ).order_by(ConversationMessage.timestamp.asc()).all()
        transcript = " ".join(m.content for m in messages if m.content)

        hpi_parts = []
        for key, label in [
            ("onset", "Onset"), ("character", "Symptom Description"), ("location", "Location"),
            ("severity", "Severity"), ("progression", "Progression"),
            ("aggravating_relieving", "Aggravating/Relieving Factors"), ("previous_episodes", "Previous Episodes")
        ]:
            if data.get(key):
                hpi_parts.append(f"{label}: {data[key]}")

        summary_dict = {
            "chief_complaint": data.get("chief_complaint"),
            "hpi": "\n".join(hpi_parts) or (transcript[:500] if transcript else None),
            "past_medical": data.get("past_medical"),
            "past_surgical": data.get("past_surgical"),
            "drug_history": data.get("drug_history"),
            "allergy_history": data.get("allergy_history"),
            "family_history": data.get("family_history") or (data.get("personal_history") if "family" in str(data.get("personal_history", "")).lower() else None),
            "personal_history": data.get("personal_history"),
            "review_of_systems": data.get("confirmation") or data.get("review_of_systems") or "Patient confirmed submitted intake details.",
            "current_symptoms": data.get("character") or data.get("associated"),
            "previous_investigations": data.get("previous_investigations") or data.get("documents"),
            "previous_treatments": data.get("previous_episodes"),
            "document_summary": None,
            "ayurvedic_history": {
                "prakriti": data.get("ayurvedic_prakriti"),
                "agni": data.get("ayurvedic_agni"),
                "koshta": data.get("ayurvedic_koshta"),
                "diet": data.get("ayurvedic_diet"),
                "sleep_pattern": data.get("ayurvedic_sleep"),
                "lifestyle": data.get("ayurvedic_lifestyle"),
            },
            "red_flags": [],
        }

        # Preserve detected flags from the consultation when available.
        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
        if consultation and consultation.priority.value == "CRITICAL":
            from models import EmergencyAlert
            alert_rows = db.query(EmergencyAlert).filter(EmergencyAlert.consultation_id == consultation_id).all()
            summary_dict["red_flags"] = [flag for row in alert_rows for flag in (row.red_flags or [])]

        missing = [
            label for key, label in [
                ("chief_complaint", "Chief complaint"), ("past_medical", "Past medical history"),
                ("drug_history", "Current medicines"), ("allergy_history", "Allergies")
            ] if not data.get(key)
        ]
        summary_dict["missing_info"] = missing

        existing = db.query(ClinicalHistory).filter(ClinicalHistory.consultation_id == consultation_id).first()
        if existing:
            history = existing
        else:
            history = ClinicalHistory(consultation_id=consultation_id)
            db.add(history)

        for field in [
            "chief_complaint", "hpi", "past_medical", "past_surgical", "drug_history", "allergy_history",
            "family_history", "personal_history", "review_of_systems", "previous_investigations",
            "current_symptoms", "previous_treatments", "document_summary", "ayurvedic_history", "red_flags", "missing_info"
        ]:
            setattr(history, field, summary_dict.get(field))
        history.ai_generated = True
        history.doctor_verified = False

        if consultation:
            consultation.chief_complaint = summary_dict.get("chief_complaint") or consultation.chief_complaint

        db.commit()
        db.refresh(history)
        return history


clinical_summary_generator = ClinicalSummaryGenerator()
