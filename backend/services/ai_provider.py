from abc import ABC, abstractmethod
import json

class AIProvider(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, context: dict) -> str:
        pass
    
    @abstractmethod
    def extract_entities(self, text: str) -> dict:
        pass
    
    @abstractmethod
    def generate_summary(self, history_data: dict) -> dict:
        pass

class MockAIProvider(AIProvider):
    def generate_response(self, prompt: str, context: dict) -> str:
        state = context.get("state", "UNKNOWN")
        if state == "CHIEF_COMPLAINT":
            return "Please tell me briefly what is your main medical problem today."
        elif "pain" in str(context.get("last_message", "")).lower():
            return "Could you point to exactly where the pain is, and describe if it moves anywhere else?"
        return "Can you tell me more about that?"
        
    def extract_entities(self, text: str) -> dict:
        entities = {"symptoms": [], "duration": "", "severity": ""}
        ltext = text.lower()
        if "pain" in ltext:
            entities["symptoms"].append("pain")
        if "days" in ltext or "weeks" in ltext:
            entities["duration"] = "few days"
        return entities
        
    def generate_summary(self, history_data: dict) -> dict:
        return {
            "chief_complaint": history_data.get("chief_complaint", "Not reported"),
            "hpi": "Patient reports symptoms.",
            "past_medical": "Not reported",
            "drug_history": "Not reported",
            "allergy_history": "Not reported",
            "red_flags": [],
            "ai_generated": True
        }

ai_provider = MockAIProvider()
