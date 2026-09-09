from typing import Dict, Any, List, Optional
from schemas import AIQuestionResponse
from services.ai_provider import ai_provider


class ConversationEngine:
    QUESTIONS_LIST = [
        {
            "index": 1,
            "state": "Q1_CHIEF_COMPLAINT",
            "question_text": "What brings you here today?",
            "voice_text": "What brings you here today?",
            "options": ["Chest Discomfort", "Fever & Chills", "Stomach Pain", "Headache", "Cough & Cold", "Joint / Body Pain"],
            "field": "chief_complaint",
        },
        {
            "index": 2,
            "state": "Q2_ONSET",
            "question_text": "When did this problem start?",
            "voice_text": "When did this problem start?",
            "options": ["Just started today", "1-2 days ago", "About a week ago", "More than a month ago"],
            "field": "onset",
        },
        {
            "index": 3,
            "state": "Q3_SYMPTOM_DESCRIPTION",
            "question_text": "Can you describe your symptoms?",
            "voice_text": "Can you describe your symptoms?",
            "options": ["Sharp / throbbing pain", "Dull continuous ache", "Burning sensation", "Pressure or heaviness", "Weakness & fatigue"],
            "field": "character",
        },
        {
            "index": 4,
            "state": "Q4_LOCATION",
            "question_text": "Where exactly are you experiencing the problem?",
            "voice_text": "Where exactly are you experiencing the problem?",
            "options": ["Chest", "Abdomen / Stomach", "Head / Neck", "Back", "Joints / Limbs", "All over the body"],
            "field": "location",
        },
        {
            "index": 5,
            "state": "Q5_SEVERITY",
            "question_text": "How severe is it?",
            "voice_text": "How severe is it?",
            "options": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-8)", "Very severe (9-10)"],
            "field": "severity",
        },
        {
            "index": 6,
            "state": "Q6_PROGRESSION",
            "question_text": "Has it been getting better, worse, or staying the same?",
            "voice_text": "Has it been getting better, worse, or staying the same?",
            "options": ["Getting worse", "Staying the same", "Getting better", "Comes and goes in episodes"],
            "field": "progression",
        },
        {
            "index": 7,
            "state": "Q7_AGGRAVATING_RELIEVING",
            "question_text": "Does anything make it better or worse?",
            "voice_text": "Does anything make it better or worse?",
            "options": ["Rest helps", "Medicine helps", "Movement makes it worse", "Food makes it worse", "Nothing seems to change it"],
            "field": "aggravating_relieving",
        },
        {
            "index": 8,
            "state": "Q8_PREVIOUS_EPISODES",
            "question_text": "Have you experienced this problem before?",
            "voice_text": "Have you experienced this problem before?",
            "options": ["No, this is the first time", "Yes, occasionally", "Yes, frequently / chronic"],
            "field": "previous_episodes",
        },
        {
            "index": 9,
            "state": "Q9_EXISTING_CONDITIONS",
            "question_text": "Do you have any existing medical conditions?",
            "voice_text": "Do you have any existing medical conditions?",
            "options": ["None", "Diabetes", "High Blood Pressure", "Asthma / Respiratory", "Heart Disease", "Thyroid"],
            "field": "past_medical",
        },
        {
            "index": 10,
            "state": "Q10_CURRENT_MEDICATIONS",
            "question_text": "Are you currently taking any medicines?",
            "voice_text": "Are you currently taking any medicines?",
            "options": ["None", "Regular prescription medicines", "Painkillers / Over-the-counter", "Ayurvedic / Herbal supplements"],
            "field": "drug_history",
        },
        {
            "index": 11,
            "state": "Q11_ALLERGIES",
            "question_text": "Do you have any known allergies?",
            "voice_text": "Do you have any known allergies?",
            "options": ["No known allergies", "Penicillin / Antibiotics", "Sulfa drugs", "Food allergies", "Dust / Pollen"],
            "field": "allergy_history",
        },
        {
            "index": 12,
            "state": "Q12_RECENT_TESTS",
            "question_text": "Have you had any recent tests, scans, or medical consultations?",
            "voice_text": "Have you had any recent tests, scans, or medical consultations?",
            "options": ["No recent tests", "Blood tests", "X-ray / CT / MRI scan", "Recent doctor consultation"],
            "field": "previous_investigations",
        },
        {
            "index": 13,
            "state": "Q13_SURGERY_HOSPITALIZATION",
            "question_text": "Have you had any recent surgery or hospitalization?",
            "voice_text": "Have you had any recent surgery or hospitalization?",
            "options": ["No surgery or hospitalization", "Recent surgery (past 6 months)", "Past surgery (earlier)", "Recent hospital admission"],
            "field": "past_surgical",
        },
        {
            "index": 14,
            "state": "Q14_ADDITIONAL_INFO",
            "question_text": "Is there anything else about your health that you think the doctor should know?",
            "voice_text": "Is there anything else about your health that you think the doctor should know?",
            "options": ["Nothing else, that covers everything", "Smoker / Tobacco use", "Alcohol consumption", "High stress / sleep issues", "Family history of illness"],
            "field": "personal_history",
        },
        {
            "index": 15,
            "state": "Q15_CONFIRMATION",
            "question_text": "Is everything you provided correct, or would you like to change anything?",
            "voice_text": "Is everything you provided correct, or would you like to change anything?",
            "options": ["Everything is correct", "I would like to change something"],
            "field": "confirmation",
        },
    ]

    COMPLETE_SPEC = {
        "index": 15,
        "state": "COMPLETE",
        "question_text": "Thank you. Your clinical intake is complete and your summary is ready for doctor review.",
        "voice_text": "Thank you. Your clinical intake is complete and your summary is ready for doctor review.",
        "options": [],
        "field": "complete",
    }

    # State list in exact sequence
    STATES = [q["state"] for q in QUESTIONS_LIST] + ["COMPLETE"]

    # Mapping of state ID to index (1-based)
    STATE_INDEX_MAP = {q["state"]: q["index"] for q in QUESTIONS_LIST}
    STATE_INDEX_MAP["COMPLETE"] = 15

    # Mapping of state ID to question spec
    QUESTIONS_BY_STATE = {q["state"]: q for q in QUESTIONS_LIST}
    QUESTIONS_BY_STATE["COMPLETE"] = COMPLETE_SPEC

    # Field mapping for database storage
    FIELD_BY_STATE = {q["state"]: q["field"] for q in QUESTIONS_LIST}

    # Legacy state fallback mapping
    LEGACY_STATE_MAP = {
        "GREETING": "Q1_CHIEF_COMPLAINT",
        "CHIEF_COMPLAINT": "Q1_CHIEF_COMPLAINT",
        "HPI_ONSET": "Q2_ONSET",
        "HPI_CHARACTER": "Q3_SYMPTOM_DESCRIPTION",
        "HPI_LOCATION": "Q4_LOCATION",
        "HPI_SEVERITY": "Q5_SEVERITY",
        "HPI_DURATION": "Q6_PROGRESSION",
        "HPI_AGGRAVATING": "Q7_AGGRAVATING_RELIEVING",
        "HPI_RELIEVING": "Q7_AGGRAVATING_RELIEVING",
        "HPI_ASSOCIATED": "Q3_SYMPTOM_DESCRIPTION",
        "PAST_MEDICAL": "Q9_EXISTING_CONDITIONS",
        "PAST_SURGICAL": "Q13_SURGERY_HOSPITALIZATION",
        "DRUG_HISTORY": "Q10_CURRENT_MEDICATIONS",
        "ALLERGY_HISTORY": "Q11_ALLERGIES",
        "FAMILY_HISTORY": "Q14_ADDITIONAL_INFO",
        "PERSONAL_HISTORY": "Q14_ADDITIONAL_INFO",
        "REVIEW_OF_SYSTEMS": "Q15_CONFIRMATION",
        "DOCUMENTS": "Q12_RECENT_TESTS",
        "REVIEW": "Q15_CONFIRMATION",
        "COMPLETE": "COMPLETE",
    }

    def normalize_state(self, state: Optional[str]) -> str:
        """Map legacy or missing states to the authoritative 15-question states."""
        if not state or state not in self.STATES:
            return self.LEGACY_STATE_MAP.get(state or "", "Q1_CHIEF_COMPLAINT")
        return state

    def get_question_by_state(self, state: str, collected_data: Optional[Dict[str, Any]] = None) -> AIQuestionResponse:
        """Returns the question definition for the CURRENT state without advancing."""
        norm_state = self.normalize_state(state)
        spec = self.QUESTIONS_BY_STATE.get(norm_state, self.QUESTIONS_LIST[0])
        idx = spec.get("index", 1)
        return AIQuestionResponse(
            question_text=spec["question_text"],
            voice_text=spec["voice_text"],
            options=spec["options"],
            state=spec["state"],
            question_index=idx,
            total_questions=15,
            is_follow_up=False,
            red_flags=[],
        )

    def _should_trigger_followup(self, current_state: str, message: str, collected_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Check if a patient answer warrants a single, short relevant follow-up.
        Crucial rules:
        - Only one follow-up per main question.
        - Does NOT advance question index.
        - Does NOT replace main sequence.
        """
        msg_lower = message.strip().lower()

        # Follow-up on Q4 (Location): If chest pain reported and radiation not clarified
        if current_state == "Q4_LOCATION" and any(w in msg_lower for w in ("chest", "heart", "सीने", "छाती")):
            if not collected_data.get("chest_radiation_checked"):
                return {
                    "question_text": "Does the discomfort spread to your left arm, shoulder, neck, or jaw?",
                    "voice_text": "Does the discomfort spread to your left arm, shoulder, neck, or jaw?",
                    "options": ["No, stays in chest", "Spreads to left arm", "Spreads to neck / jaw", "Spreads to back", "Other"],
                    "flag_key": "chest_radiation_checked"
                }

        # Follow-up on Q10 (Current Medicines): If patient said Yes/Prescription but gave no details
        if current_state == "Q10_CURRENT_MEDICATIONS" and any(w in msg_lower for w in ("yes", "regular", "prescription", "हाँ", "दवा")):
            if not collected_data.get("med_details_checked") and len(msg_lower.split()) < 4:
                return {
                    "question_text": "Could you please name the main medicines you take regularly?",
                    "voice_text": "Could you please name the main medicines you take regularly?",
                    "options": ["Blood pressure medicine", "Diabetes medicine", "Blood thinner / Aspirin", "Pain medicine", "Other"],
                    "flag_key": "med_details_checked"
                }

        return None

    def get_next_question(self, session_id: str, current_state: str, collected_data: Dict[str, Any], last_message: str = "") -> AIQuestionResponse:
        """
        Advances sequentially from Q1 -> Q2 -> ... -> Q15 -> COMPLETE.
        Handles controlled single short follow-up without breaking sequence or slider.
        """
        # If we were in a follow-up, finish the follow-up and move to the next main question
        if collected_data.get("is_in_followup"):
            collected_data["is_in_followup"] = False
            norm_state = self.normalize_state(collected_data.get("followup_parent_state", current_state))
            try:
                cur_idx = self.STATES.index(norm_state)
                next_state = self.STATES[cur_idx + 1] if cur_idx + 1 < len(self.STATES) else "COMPLETE"
            except ValueError:
                next_state = "COMPLETE"
            return self.get_question_by_state(next_state, collected_data)

        norm_state = self.normalize_state(current_state)

        # Check if this response should trigger a single short follow-up
        if last_message:
            followup = self._should_trigger_followup(norm_state, last_message, collected_data)
            if followup:
                collected_data["is_in_followup"] = True
                collected_data["followup_parent_state"] = norm_state
                if followup.get("flag_key"):
                    collected_data[followup["flag_key"]] = True

                cur_main_idx = self.STATE_INDEX_MAP.get(norm_state, 1)
                return AIQuestionResponse(
                    question_text=followup["question_text"],
                    voice_text=followup["voice_text"],
                    options=followup["options"],
                    state=f"{norm_state}_FOLLOWUP",
                    question_index=cur_main_idx,
                    total_questions=15,
                    is_follow_up=True,
                    red_flags=[],
                )

        # Normal sequential progression
        try:
            cur_idx = self.STATES.index(norm_state)
            next_state = self.STATES[cur_idx + 1] if cur_idx + 1 < len(self.STATES) else "COMPLETE"
        except ValueError:
            next_state = "COMPLETE"

        return self.get_question_by_state(next_state, collected_data)

    def process_response(self, session_id: str, message: str, current_state: str) -> Dict[str, Any]:
        extracted = ai_provider.extract_entities(message)
        return {"processed_state": current_state, "extracted_info": extracted, "raw_message": message}

    def merge_answer(self, collected: Dict[str, Any], state: str, message: str) -> Dict[str, Any]:
        data = dict(collected or {})
        value = message.strip()
        if not value:
            return data

        # If answering a follow-up, record it into follow-up details
        if "_FOLLOWUP" in state or data.get("is_in_followup"):
            parent = data.get("followup_parent_state", state.replace("_FOLLOWUP", ""))
            parent_field = self.FIELD_BY_STATE.get(parent, "additional_notes")
            existing = data.get(parent_field, "")
            data[parent_field] = f"{existing}; Follow-up: {value}" if existing else value
            data["last_followup_answer"] = value
            return data

        norm_state = self.normalize_state(state)
        field = self.FIELD_BY_STATE.get(norm_state)
        if field:
            data[field] = value

        # Structure HPI components
        if norm_state in {"Q2_ONSET", "Q3_SYMPTOM_DESCRIPTION", "Q4_LOCATION", "Q5_SEVERITY", "Q6_PROGRESSION", "Q7_AGGRAVATING_RELIEVING", "Q8_PREVIOUS_EPISODES"}:
            hpi = data.get("hpi_answers", {})
            hpi = dict(hpi)
            if field:
                hpi[field] = value
            data["hpi_answers"] = hpi

        return data

    def should_skip_state(self, state: str, collected_data: Dict[str, Any]) -> bool:
        # All 15 questions are mandatory and sequential; never skip
        return False


conversation_engine = ConversationEngine()
