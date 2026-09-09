import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class FacilityRole(str, enum.Enum):
    FACILITY_ADMIN = "FACILITY_ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    RECEPTION = "RECEPTION"
    DISPATCHER = "DISPATCHER"
    AMBULANCE_COORDINATOR = "AMBULANCE_COORDINATOR"
    VIEWER = "VIEWER"

class Role(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    STAFF = "STAFF"
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"

class AmbulanceType(str, enum.Enum):
    BASIC = "BASIC"
    ALS = "ALS"
    ICU = "ICU"

class AmbulanceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"

class ConsentStatus(str, enum.Enum):
    GIVEN = "GIVEN"
    DECLINED = "DECLINED"
    REVOKED = "REVOKED"

class ConsultationStatus(str, enum.Enum):
    WAITING = "WAITING"
    AI_INTERVIEW = "AI_INTERVIEW"
    PROCESSING = "PROCESSING"
    READY = "READY"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    EMERGENCY = "EMERGENCY"
    COMPLETED = "COMPLETED"

class Priority(str, enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    VOICE = "VOICE"
    OPTION = "OPTION"

class RoleType(str, enum.Enum):
    AI = "AI"
    PATIENT = "PATIENT"

class Severity(str, enum.Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"

class DocType(str, enum.Enum):
    PRESCRIPTION = "PRESCRIPTION"
    LAB_REPORT = "LAB_REPORT"
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY"
    INVESTIGATION = "INVESTIGATION"
    IMAGING = "IMAGING"
    CERTIFICATE = "CERTIFICATE"
    CONSULTATION_NOTE = "CONSULTATION_NOTE"

class OCRStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

class RequestStatus(str, enum.Enum):
    SEARCHING = "SEARCHING"
    MATCHED = "MATCHED"
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED"
    DRIVER_EN_ROUTE = "DRIVER_EN_ROUTE"
    ARRIVING = "ARRIVING"
    PATIENT_PICKED_UP = "PATIENT_PICKED_UP"
    EN_ROUTE_HOSPITAL = "EN_ROUTE_HOSPITAL"
    ARRIVED = "ARRIVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(SQLEnum(Role))
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    # Facility-scoped RBAC for demo administration. Global role remains unchanged.
    facility_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    facility_role = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    date_of_birth = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    abha_id = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    # Mandatory structured medical-history questionnaire completed during onboarding.
    medical_history = Column(JSON, nullable=True)
    user = relationship("User", backref="patient_profile")

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    specialization = Column(String)
    department = Column(String)
    license_number = Column(String)
    experience_years = Column(Integer)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    user = relationship("User", backref="doctor_profile")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String)
    department = Column(String)
    user = relationship("User", backref="staff_profile")

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    address = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    phone = Column(String)
    emergency_dept = Column(Boolean, default=False)
    is_government = Column(Boolean, default=True)
    departments = Column(JSON, nullable=True)

class Ambulance(Base):
    __tablename__ = "ambulances"
    id = Column(String, primary_key=True, default=generate_uuid)
    registration_number = Column(String)
    ambulance_type = Column(SQLEnum(AmbulanceType))
    status = Column(SQLEnum(AmbulanceStatus))
    equipment_list = Column(String, nullable=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    hospital = relationship("Hospital", backref="ambulances")

class AmbulanceDriver(Base):
    __tablename__ = "ambulance_drivers"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    license_number = Column(String)
    is_online = Column(Boolean, default=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    assigned_ambulance_id = Column(String, ForeignKey("ambulances.id"), nullable=True)
    user = relationship("User", backref="driver_profile")
    assigned_ambulance = relationship("Ambulance")

class Consent(Base):
    __tablename__ = "consents"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=True)
    purpose = Column(String)
    consent_version = Column(String)
    consent_status = Column(SQLEnum(ConsentStatus))
    given_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    status = Column(SQLEnum(ConsultationStatus), default=ConsultationStatus.WAITING)
    priority = Column(SQLEnum(Priority), default=Priority.NORMAL)
    chief_complaint = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    patient = relationship("Patient", backref="consultations")
    doctor = relationship("Doctor")

class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"))
    state = Column(String)
    language_code = Column(String, default="en")
    structured_data = Column(JSON, default=dict, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    consultation = relationship("Consultation", backref="conversation_session")

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("conversation_sessions.id"))
    role = Column(SQLEnum(RoleType))
    content = Column(Text)
    original_language = Column(String, nullable=True)
    translated_content = Column(Text, nullable=True)
    message_type = Column(SQLEnum(MessageType), default=MessageType.TEXT)
    options = Column(JSON, nullable=True)
    selected_option = Column(String, nullable=True)
    question_state = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ClinicalHistory(Base):
    __tablename__ = "clinical_histories"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"), unique=True)
    chief_complaint = Column(Text, nullable=True)
    hpi = Column(Text, nullable=True)
    past_medical = Column(Text, nullable=True)
    past_surgical = Column(Text, nullable=True)
    drug_history = Column(Text, nullable=True)
    allergy_history = Column(Text, nullable=True)
    family_history = Column(Text, nullable=True)
    personal_history = Column(Text, nullable=True)
    review_of_systems = Column(Text, nullable=True)
    previous_investigations = Column(Text, nullable=True)
    current_symptoms = Column(Text, nullable=True)
    previous_treatments = Column(Text, nullable=True)
    document_summary = Column(Text, nullable=True)
    ayurvedic_history = Column(JSON, nullable=True)
    red_flags = Column(JSON, nullable=True)
    missing_info = Column(JSON, nullable=True)
    ai_generated = Column(Boolean, default=True)
    doctor_verified = Column(Boolean, default=False)
    verified_by = Column(String, ForeignKey("doctors.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"))
    name = Column(String)
    severity = Column(String, nullable=True)
    onset = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    location = Column(String, nullable=True)
    character = Column(String, nullable=True)
    aggravating = Column(String, nullable=True)
    relieving = Column(String, nullable=True)
    associated = Column(String, nullable=True)

class Medication(Base):
    __tablename__ = "medications"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    name = Column(String)
    dosage = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    route = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    source = Column(String)

class Allergy(Base):
    __tablename__ = "allergies"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    allergen = Column(String)
    reaction = Column(String, nullable=True)
    severity = Column(SQLEnum(Severity), nullable=True)
    source = Column(String)

class MedicalDocument(Base):
    __tablename__ = "medical_documents"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=True)
    document_type = Column(SQLEnum(DocType))
    file_path = Column(String)
    file_name = Column(String)
    file_size = Column(Integer)
    mime_type = Column(String)
    ocr_status = Column(SQLEnum(OCRStatus), default=OCRStatus.PENDING)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class DocumentExtraction(Base):
    __tablename__ = "document_extractions"
    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("medical_documents.id"))
    extracted_text = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)
    extracted_at = Column(DateTime, default=datetime.utcnow)

class LabResult(Base):
    __tablename__ = "lab_results"
    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("medical_documents.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"))
    test_name = Column(String)
    value = Column(String)
    unit = Column(String, nullable=True)
    reference_range_low = Column(String, nullable=True)
    reference_range_high = Column(String, nullable=True)
    is_abnormal = Column(Boolean, default=False)
    test_date = Column(DateTime, nullable=True)
    source = Column(String, nullable=True)

class AyurvedicHistory(Base):
    __tablename__ = "ayurvedic_histories"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"))
    prakriti = Column(String, nullable=True)
    vikriti = Column(String, nullable=True)
    sara = Column(String, nullable=True)
    samhanana = Column(String, nullable=True)
    pramana = Column(String, nullable=True)
    satmya = Column(String, nullable=True)
    satva = Column(String, nullable=True)
    ahara_shakti = Column(String, nullable=True)
    vyayama_shakti = Column(String, nullable=True)
    vaya = Column(String, nullable=True)
    agni = Column(String, nullable=True)
    koshta = Column(String, nullable=True)
    ahara_vihara = Column(String, nullable=True)
    diet = Column(String, nullable=True)
    sleep_pattern = Column(String, nullable=True)
    lifestyle = Column(String, nullable=True)
    additional_notes = Column(Text, nullable=True)

class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=True)
    red_flags = Column(JSON)
    priority = Column(SQLEnum(Priority))
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_by = Column(String, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

class AmbulanceRequest(Base):
    __tablename__ = "ambulance_requests"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    ambulance_id = Column(String, ForeignKey("ambulances.id"), nullable=True)
    driver_id = Column(String, ForeignKey("ambulance_drivers.id"), nullable=True)
    pickup_lat = Column(Float)
    pickup_lng = Column(Float)
    pickup_address = Column(String)
    destination_lat = Column(Float)
    destination_lng = Column(Float)
    destination_address = Column(String)
    destination_hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    ambulance_type_requested = Column(SQLEnum(AmbulanceType))
    priority = Column(SQLEnum(Priority))
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.SEARCHING)
    estimated_fare = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class AmbulanceLocation(Base):
    __tablename__ = "ambulance_locations"
    id = Column(String, primary_key=True, default=generate_uuid)
    ambulance_id = Column(String, ForeignKey("ambulances.id"))
    lat = Column(Float)
    lng = Column(Float)
    heading = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DoctorNote(Base):
    __tablename__ = "doctor_notes"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"))
    doctor_id = Column(String, ForeignKey("doctors.id"))
    observations = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    prescription_notes = Column(Text, nullable=True)
    follow_up = Column(Text, nullable=True)
    additional_comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    notification_type = Column(String)
    title = Column(String)
    content = Column(Text)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)



class PatientFollowUp(Base):
    __tablename__ = "patient_follow_ups"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=True)
    message = Column(Text)
    due_at = Column(DateTime)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)


class ClinicalChatMessage(Base):
    __tablename__ = "clinical_chat_messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"))
    sender_user_id = Column(String, ForeignKey("users.id"))
    sender_role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PatientTimeline(Base):
    __tablename__ = "patient_timeline"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    event_type = Column(String)
    event_date = Column(DateTime)
    title = Column(String)
    description = Column(Text, nullable=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
