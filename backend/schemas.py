from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import Role, AmbulanceType, AmbulanceStatus, ConsentStatus, ConsultationStatus, Priority, MessageType, RoleType, Severity, DocType, OCRStatus, AlertStatus, RequestStatus

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: Role

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    facility_id: Optional[str] = None
    facility_role: Optional[str] = None
    created_at: datetime
    class Config:
        orm_mode = True

class PatientBase(BaseModel):
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    preferred_language: str = "en"
    abha_id: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[Dict[str, Any]] = None

class PatientCreate(PatientBase):
    user: UserCreate

class PatientResponse(PatientBase):
    id: str
    user_id: str
    class Config:
        orm_mode = True

class PatientProfile(PatientResponse):
    user: UserResponse
    class Config:
        orm_mode = True

class ConsultationCreate(BaseModel):
    patient_id: str
    hospital_id: Optional[str] = None
    chief_complaint: Optional[str] = None
    priority: Priority = Priority.NORMAL

class ConsultationResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: Optional[str]
    hospital_id: Optional[str]
    status: ConsultationStatus
    priority: Priority
    chief_complaint: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    class Config:
        orm_mode = True

class ConversationCreate(BaseModel):
    consultation_id: str
    language_code: str = "en"
    restart: Optional[bool] = False

class MessageCreate(BaseModel):
    content: str
    message_type: MessageType = MessageType.TEXT
    selected_option: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    role: RoleType
    content: str
    original_language: Optional[str]
    translated_content: Optional[str]
    message_type: MessageType
    options: Optional[List[str]]
    timestamp: datetime
    class Config:
        orm_mode = True

class AIQuestionResponse(BaseModel):
    question_text: str
    voice_text: str
    options: List[str]
    state: str
    question_index: int = 1
    total_questions: int = 15
    is_follow_up: bool = False
    red_flags: List[Dict[str, Any]] = []

class DocumentUploadResponse(BaseModel):
    id: str
    file_name: str
    file_size: int
    document_type: DocType
    class Config:
        orm_mode = True

class ExtractionResponse(BaseModel):
    id: str
    extracted_text: Optional[str]
    extracted_data: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    class Config:
        orm_mode = True

class DocumentResponse(DocumentUploadResponse):
    ocr_status: OCRStatus
    uploaded_at: datetime
    class Config:
        orm_mode = True

class ClinicalHistorySummary(BaseModel):
    chief_complaint: Optional[str]
    hpi: Optional[str]
    past_medical: Optional[str]
    drug_history: Optional[str]
    allergy_history: Optional[str]
    red_flags: Optional[List[Dict[str, Any]]]

class ClinicalHistoryResponse(ClinicalHistorySummary):
    id: str
    consultation_id: str
    past_surgical: Optional[str]
    family_history: Optional[str]
    personal_history: Optional[str]
    review_of_systems: Optional[str]
    ayurvedic_history: Optional[Dict[str, Any]]
    missing_info: Optional[Dict[str, Any]]
    ai_generated: bool
    doctor_verified: bool
    class Config:
        orm_mode = True

class AmbulanceRequestCreate(BaseModel):
    patient_id: str
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    destination_lat: float
    destination_lng: float
    destination_address: str
    destination_hospital_id: Optional[str] = None
    ambulance_type_requested: AmbulanceType
    priority: Priority

class AmbulanceRequestResponse(AmbulanceRequestCreate):
    id: str
    ambulance_id: Optional[str]
    driver_id: Optional[str]
    status: RequestStatus
    estimated_fare: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]
    class Config:
        orm_mode = True

class AmbulanceLocationUpdate(BaseModel):
    lat: float
    lng: float
    heading: Optional[float]
    speed: Optional[float]

class NearbyAmbulanceResponse(BaseModel):
    ambulance_id: str
    registration_number: Optional[str] = None
    distance_km: float
    eta_minutes: int
    type: AmbulanceType
    status: AmbulanceStatus
    lat: float
    lng: float
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

class DoctorNoteCreate(BaseModel):
    consultation_id: Optional[str] = None
    observations: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    prescription_notes: Optional[str] = None
    follow_up: Optional[str] = None
    additional_comments: Optional[str] = None

class DoctorNoteResponse(DoctorNoteCreate):
    id: str
    consultation_id: str
    doctor_id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class ConsentCreate(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    purpose: str
    consent_version: str

class ConsentResponse(ConsentCreate):
    id: str
    consent_status: ConsentStatus
    given_at: Optional[datetime]
    revoked_at: Optional[datetime]
    class Config:
        orm_mode = True

class EmergencyAlertResponse(BaseModel):
    id: str
    patient_id: str
    consultation_id: Optional[str]
    red_flags: List[Dict[str, Any]]
    priority: Priority
    status: AlertStatus
    created_at: datetime
    class Config:
        orm_mode = True

class QueueItemResponse(BaseModel):
    id: str
    consultation_id: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = 0
    patient_gender: Optional[str] = "Unknown"
    chief_complaint: Optional[str] = None
    priority: Priority
    status: ConsultationStatus
    has_history: bool = False
    document_count: int = 0
    created_at: datetime
    age: Optional[int] = 0
    gender: Optional[str] = "Unknown"
    waiting_since: Optional[datetime] = None

class AnalyticsResponse(BaseModel):
    total_patients: int
    active_consultations: int
    ambulances_available: int
    critical_alerts: int

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    timestamp: datetime
    class Config:
        orm_mode = True

class TimelineResponse(BaseModel):
    id: str
    event_type: str
    event_date: datetime
    title: str
    description: Optional[str]
    class Config:
        orm_mode = True

class NotificationResponse(BaseModel):
    id: str
    notification_type: str
    title: str
    content: str
    is_read: bool
    created_at: datetime
    class Config:
        orm_mode = True
