"""
Unit tests for the Clinical Intake conversation engine.
Tests that:
- All 15 questions appear in exact required order
- question_index stays fixed during follow-ups
- question_index advances after follow-up is answered
- Progress calculation is consistent
- Language translation resolves all 15 questions offline
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.conversation_engine import conversation_engine
from services.translation_provider import translation_provider


EXPECTED_ORDER = [
    (1,  "Q1_CHIEF_COMPLAINT",        "What brings you here today?"),
    (2,  "Q2_ONSET",                  "When did this problem start?"),
    (3,  "Q3_SYMPTOM_DESCRIPTION",    "Can you describe your symptoms?"),
    (4,  "Q4_LOCATION",               "Where exactly are you experiencing the problem?"),
    (5,  "Q5_SEVERITY",               "How severe is it?"),
    (6,  "Q6_PROGRESSION",            "Has it been getting better, worse, or staying the same?"),
    (7,  "Q7_AGGRAVATING_RELIEVING",  "Does anything make it better or worse?"),
    (8,  "Q8_PREVIOUS_EPISODES",      "Have you experienced this problem before?"),
    (9,  "Q9_EXISTING_CONDITIONS",    "Do you have any existing medical conditions?"),
    (10, "Q10_CURRENT_MEDICATIONS",   "Are you currently taking any medicines?"),
    (11, "Q11_ALLERGIES",             "Do you have any known allergies?"),
    (12, "Q12_RECENT_TESTS",          "Have you had any recent tests, scans, or medical consultations?"),
    (13, "Q13_SURGERY_HOSPITALIZATION","Have you had any recent surgery or hospitalization?"),
    (14, "Q14_ADDITIONAL_INFO",       "Is there anything else about your health that you think the doctor should know?"),
    (15, "Q15_CONFIRMATION",          "Is everything you provided correct, or would you like to change anything?"),
]


class TestQuestionOrder:
    def test_all_15_questions_in_correct_order(self):
        """Sequential progression from Q1 → Q15 → COMPLETE."""
        state = "Q1_CHIEF_COMPLAINT"
        data = {}

        for expected_idx, expected_state, expected_text in EXPECTED_ORDER:
            q = conversation_engine.get_question_by_state(state, data)
            assert q.question_index == expected_idx, \
                f"State {state}: expected index {expected_idx}, got {q.question_index}"
            assert q.state == expected_state, \
                f"Expected state {expected_state}, got {q.state}"
            assert q.question_text == expected_text, \
                f"Q{expected_idx}: expected '{expected_text}', got '{q.question_text}'"
            assert q.is_follow_up is False

            # Advance to next question
            next_q = conversation_engine.get_next_question("session-test", state, data, last_message="some answer")
            state = next_q.state
            data = conversation_engine.merge_answer(data, expected_state, "some answer")

        # After Q15 answered, should reach COMPLETE
        final = conversation_engine.get_next_question("session-test", "Q15_CONFIRMATION", data, last_message="Everything is correct")
        assert final.state == "COMPLETE"
        assert final.question_index == 15

    def test_question_index_matches_sequence(self):
        """get_question_by_state always returns the correct 1-based index."""
        for expected_idx, state, _ in EXPECTED_ORDER:
            q = conversation_engine.get_question_by_state(state)
            assert q.question_index == expected_idx

    def test_total_questions_always_15(self):
        for _, state, _ in EXPECTED_ORDER:
            q = conversation_engine.get_question_by_state(state)
            assert q.total_questions == 15


class TestProgressCalculation:
    def test_q1_progress(self):
        q = conversation_engine.get_question_by_state("Q1_CHIEF_COMPLAINT")
        expected = (1 / 15) * 100  # 6.6667
        assert abs(q.question_index / 15 * 100 - expected) < 0.001

    def test_q15_progress_is_100(self):
        q = conversation_engine.get_question_by_state("Q15_CONFIRMATION")
        assert q.question_index == 15
        assert (q.question_index / 15) * 100 == 100.0

    def test_all_progress_values_strictly_increasing(self):
        indices = [
            conversation_engine.get_question_by_state(state).question_index
            for _, state, _ in EXPECTED_ORDER
        ]
        for i in range(1, len(indices)):
            assert indices[i] > indices[i - 1], \
                f"Progress not strictly increasing at position {i}"


class TestFollowUpBehavior:
    def test_chest_location_triggers_followup(self):
        """Answering 'Chest' at Q4 triggers a follow-up without advancing the index."""
        data = {}
        followup = conversation_engine.get_next_question(
            "sess", "Q4_LOCATION", data, last_message="Chest"
        )
        assert followup.is_follow_up is True
        assert followup.question_index == 4, \
            f"Follow-up must keep Q4 index, got {followup.question_index}"

    def test_followup_then_advances_to_next_main(self):
        """After follow-up is answered, the next question is Q5 with index 5."""
        data = {"is_in_followup": True, "followup_parent_state": "Q4_LOCATION", "chest_radiation_checked": True}
        next_q = conversation_engine.get_next_question(
            "sess", "Q4_LOCATION_FOLLOWUP", data, last_message="Spreads to left arm"
        )
        assert next_q.is_follow_up is False
        assert next_q.question_index == 5, \
            f"After follow-up, should be Q5, got index {next_q.question_index}"

    def test_no_followup_for_non_chest_location(self):
        """Answering 'Back' at Q4 should NOT trigger a follow-up."""
        data = {}
        next_q = conversation_engine.get_next_question(
            "sess", "Q4_LOCATION", data, last_message="Back"
        )
        assert next_q.is_follow_up is False
        assert next_q.question_index == 5


class TestLegacyStateNormalization:
    """Old state names from the 26-state engine must map to the new 15-question states."""
    LEGACY_CASES = [
        ("GREETING",       "Q1_CHIEF_COMPLAINT"),
        ("CHIEF_COMPLAINT","Q1_CHIEF_COMPLAINT"),
        ("HPI_ONSET",      "Q2_ONSET"),
        ("HPI_LOCATION",   "Q4_LOCATION"),
        ("PAST_MEDICAL",   "Q9_EXISTING_CONDITIONS"),
        ("DRUG_HISTORY",   "Q10_CURRENT_MEDICATIONS"),
        ("COMPLETE",       "COMPLETE"),
    ]

    def test_legacy_states_normalize(self):
        for legacy, expected in self.LEGACY_CASES:
            result = conversation_engine.normalize_state(legacy)
            assert result == expected, \
                f"Legacy state '{legacy}' → expected '{expected}', got '{result}'"

    def test_unknown_state_defaults_to_q1(self):
        result = conversation_engine.normalize_state("SOME_RANDOM_GARBAGE")
        assert result == "Q1_CHIEF_COMPLAINT"


class TestTranslation:
    """All 15 questions must translate to Hindi using the offline dictionary (no network needed)."""
    def test_all_15_questions_translate_to_hindi(self):
        for _, _, question_text in EXPECTED_ORDER:
            translated = translation_provider.translate(question_text, "en", "hi")
            assert translated != question_text, \
                f"Q translation FAILED (returned English): '{question_text}'"
            assert len(translated) > 0

    def test_followup_question_translates_to_hindi(self):
        fu = "Does the discomfort spread to your left arm, shoulder, neck, or jaw?"
        translated = translation_provider.translate(fu, "en", "hi")
        assert translated != fu, f"Follow-up translation failed, got English back"

    def test_english_to_english_returns_unchanged(self):
        q = "What brings you here today?"
        result = translation_provider.translate(q, "en", "en")
        assert result == q

    def test_normalize_text_strips_punctuation(self):
        """The normalizer must strip trailing ? so dictionary lookup works."""
        norm = translation_provider._normalize_text("What brings you here today?")
        assert not norm.endswith("?"), f"Trailing ? not stripped: '{norm}'"
        assert norm == "what brings you here today"
