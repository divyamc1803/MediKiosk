from abc import ABC, abstractmethod

class OCRProvider(ABC):
    @abstractmethod
    def extract_text(self, file_path: str, doc_type: str) -> str:
        pass

class MockOCRProvider(OCRProvider):
    def extract_text(self, file_path: str, doc_type: str) -> str:
        if doc_type == "PRESCRIPTION":
            return "Rx\nPatient: John Doe\nDate: 2023-10-01\nDr. Smith\n\n1. Paracetamol 500mg, 1-1-1, 5 days\n2. Amoxicillin 500mg, 1-0-1, 7 days"
        elif doc_type == "LAB_REPORT":
            return "Complete Blood Count\nDate: 2023-10-02\nHemoglobin: 12.5 g/dL (Ref: 13.0-17.0)\nWBC: 8500 /cumm (Ref: 4000-11000)"
        elif doc_type == "DISCHARGE_SUMMARY":
            return "Discharge Summary\nDiagnosis: Acute Appendicitis\nProcedure: Laparoscopic Appendectomy\nMedications: Ibuprofen 400mg sos, Pantoprazole 40mg OD"
        return "Mock extracted text for " + doc_type

ocr_provider = MockOCRProvider()
