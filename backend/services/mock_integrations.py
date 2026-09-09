class MockABHAService:
    def verify_abha_id(self, abha_id: str) -> dict:
        if len(abha_id) < 14:
            return {"valid": False, "error": "Invalid ABHA ID"}
        return {
            "valid": True,
            "name": "Mock Patient",
            "gender": "M",
            "year_of_birth": 1980,
            "address": "123 Mock Street",
            "mock_data": True
        }

class MockHISService:
    def get_patient_records(self, patient_id: str) -> list:
        return [
            {"date": "2023-01-15", "type": "OPD", "diagnosis": "Hypertension"},
            {"date": "2023-06-20", "type": "LAB", "test": "Lipid Profile"}
        ]
        
    def send_admission_alert(self, patient_data: dict) -> bool:
        print(f"HIS Alert sent for patient {patient_data.get('patient_id')}")
        return True

abha_service = MockABHAService()
his_service = MockHISService()
