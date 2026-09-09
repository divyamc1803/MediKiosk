from typing import List, Dict, Any

class RedFlagDetector:
    def __init__(self):
        self.keywords = {
            "chest_pain": ["chest pain", "heavy chest", "crushing", "सीने में दर्द", "छाती में दर्द"],
            "breathing_difficulty": ["shortness of breath", "can't breathe", "breathless", "सांस", "सांस लेने में तकलीफ"],
            "stroke": ["face drooping", "arm weakness", "slurred speech", "लकवा"],
            "unconsciousness": ["fainted", "passed out", "unconscious", "बेहोश"],
            "severe_bleeding": ["heavy bleeding", "gushing blood", "खून"],
            "allergic_reaction": ["throat swelling", "anaphylaxis", "severe allergy"],
            "trauma": ["head injury", "fall from height", "severe accident"]
        }
        
    def detect(self, text: str, language: str = 'en') -> List[Dict[str, Any]]:
        flags = []
        ltext = text.lower()
        for category, words in self.keywords.items():
            for word in words:
                if word in ltext:
                    flags.append({
                        "keyword": word,
                        "category": category,
                        "severity": "CRITICAL" if category in ["chest_pain", "stroke", "breathing_difficulty", "unconsciousness"] else "HIGH",
                        "suggested_priority": "CRITICAL" if category in ["chest_pain", "stroke", "breathing_difficulty"] else "HIGH"
                    })
                    break # one per category
        return flags

red_flag_detector = RedFlagDetector()
