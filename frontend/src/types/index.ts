// ===== Enums =====
export type Role = 'PATIENT' | 'DOCTOR' | 'DRIVER' | 'STAFF' | 'ADMIN';
export type ConsultationStatus = 'WAITING' | 'AI_INTERVIEW' | 'PROCESSING' | 'READY' | 'NEEDS_REVIEW' | 'EMERGENCY' | 'COMPLETED';
export type Priority = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type AmbulanceType = 'BASIC' | 'ALS' | 'ICU';
export type AmbulanceStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';
export type AmbulanceRequestStatus = 'SEARCHING' | 'MATCHED' | 'DRIVER_ASSIGNED' | 'DRIVER_EN_ROUTE' | 'ARRIVING' | 'PATIENT_PICKED_UP' | 'EN_ROUTE_HOSPITAL' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
export type DocumentType = 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'INVESTIGATION' | 'IMAGING' | 'CERTIFICATE' | 'CONSULTATION_NOTE';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ConsentStatus = 'GIVEN' | 'DECLINED' | 'REVOKED';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type ConversationState = 'GREETING' | 'CHIEF_COMPLAINT' | 'HPI_ONSET' | 'HPI_LOCATION' | 'HPI_CHARACTER' | 'HPI_SEVERITY' | 'HPI_DURATION' | 'HPI_AGGRAVATING' | 'HPI_RELIEVING' | 'HPI_ASSOCIATED' | 'PAST_MEDICAL' | 'PAST_SURGICAL' | 'DRUG_HISTORY' | 'ALLERGY_HISTORY' | 'FAMILY_HISTORY' | 'PERSONAL_HISTORY' | 'REVIEW_OF_SYSTEMS' | 'AYURVEDIC_PRAKRITI' | 'AYURVEDIC_AGNI' | 'AYURVEDIC_KOSHTA' | 'AYURVEDIC_DIET' | 'AYURVEDIC_SLEEP' | 'AYURVEDIC_LIFESTYLE' | 'DOCUMENTS' | 'REVIEW' | 'COMPLETE';

// ===== Core Models =====
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string;
  is_active: boolean;
  created_at: string;
  facility_id?: string | null;
  facility_role?: string | null;
}

export interface Patient {
  id: string;
  user_id: string;
  user?: User;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  preferred_language: string;
  abha_id?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  user?: User;
  specialization: string;
  department: string;
  license_number?: string;
  experience_years?: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  emergency_dept: boolean;
  is_government?: boolean;
  departments?: string[];
}

// ===== Clinical Models =====
export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id?: string;
  hospital_id?: string;
  status: ConsultationStatus;
  priority: Priority;
  chief_complaint?: string;
  created_at: string;
  completed_at?: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface ConversationSession {
  id: string;
  consultation_id: string;
  state: ConversationState;
  language_code: string;
  started_at: string;
  completed_at?: string;
  initial_question?: any;
  structured_data?: Record<string, any>;
}

export interface ClinicalChatMessage { id:string; sender_role:string; sender_user_id:string; content:string; translated_content?:string; created_at:string; }

export interface DoctorCommunication {
  patient_id: string;
  patient_name: string;
  age: number;
  gender: string;
  consultation_id: string;
  chief_complaint: string;
  latest_message: string;
  sender_role: string;
  unread: boolean;
  timestamp: string;
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  role: 'AI' | 'PATIENT';
  content: string;
  original_language?: string;
  translated_content?: string;
  message_type: 'TEXT' | 'VOICE' | 'OPTION';
  options?: string[];
  selected_option?: string;
  timestamp: string;
}

export interface AIQuestionResponse {
  question?: string;
  question_text?: string;
  voice_text?: string;
  options: string[];
  state: ConversationState | string;
  red_flags?: RedFlag[];
  progress: number;
  question_index?: number;
  total_questions?: number;
  is_follow_up?: boolean;
}

export interface RedFlag {
  keyword: string;
  category: string;
  severity: string;
  suggested_priority: Priority;
}

export interface ClinicalHistory {
  id: string;
  consultation_id: string;
  chief_complaint?: string;
  hpi?: string;
  past_medical?: string;
  past_surgical?: string;
  drug_history?: string;
  allergy_history?: string;
  family_history?: string;
  personal_history?: string;
  review_of_systems?: string;
  previous_investigations?: string;
  current_symptoms?: string;
  previous_treatments?: string;
  document_summary?: string;
  ayurvedic_history?: AyurvedicHistory;
  red_flags?: RedFlag[];
  missing_info?: string[];
  ai_generated: boolean;
  doctor_verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface AyurvedicHistory {
  prakriti?: string;
  vikriti?: string;
  sara?: string;
  samhanana?: string;
  pramana?: string;
  satmya?: string;
  satva?: string;
  ahara_shakti?: string;
  vyayama_shakti?: string;
  vaya?: string;
  agni?: string;
  koshta?: string;
  ahara_vihara?: string;
  diet?: string;
  sleep_pattern?: string;
  lifestyle?: string;
  additional_notes?: string;
}

export interface Symptom {
  id: string;
  consultation_id: string;
  name: string;
  severity?: string;
  onset?: string;
  duration?: string;
  location?: string;
  character?: string;
  aggravating?: string;
  relieving?: string;
  associated?: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  source: 'PATIENT_REPORTED' | 'DOCUMENT_EXTRACTED';
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  reaction?: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  source?: string;
}

// ===== Document Models =====
export interface MedicalDocument {
  id: string;
  patient_id: string;
  consultation_id?: string;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  ocr_status: OcrStatus;
  uploaded_at: string;
  extraction?: DocumentExtraction;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extracted_text?: string;
  extracted_data?: {
    diagnoses?: string[];
    medications?: { name: string; dosage?: string; frequency?: string }[];
    lab_values?: { test: string; value: string; unit?: string; reference_range?: string; is_abnormal?: boolean }[];
    procedures?: string[];
    dates?: string[];
    doctors?: string[];
    hospitals?: string[];
  };
  confidence_score?: number;
  extracted_at: string;
}

export interface LabResult {
  id: string;
  document_id?: string;
  patient_id: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_range_low?: number;
  reference_range_high?: number;
  is_abnormal: boolean;
  test_date?: string;
  source?: string;
}

// ===== Emergency & Ambulance Models =====
export interface EmergencyAlert {
  id: string;
  patient_id: string;
  consultation_id?: string;
  red_flags: RedFlag[];
  priority: Priority;
  status: AlertStatus;
  created_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  patient?: Patient;
}

export interface AmbulanceRequest {
  id: string;
  patient_id: string;
  ambulance_id?: string;
  driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  destination_hospital_id?: string;
  ambulance_type_requested: AmbulanceType;
  priority: Priority;
  status: AmbulanceRequestStatus;
  estimated_fare?: number;
  estimated_eta?: number;
  distance_km?: number;
  created_at: string;
  completed_at?: string;
  driver?: AmbulanceDriver;
  ambulance?: Ambulance;
  hospital?: Hospital;
  patient?: Patient;
}

export interface AmbulanceDriver {
  id: string;
  user_id: string;
  user?: User;
  license_number?: string;
  is_online: boolean;
  current_lat?: number;
  current_lng?: number;
  assigned_ambulance_id?: string;
}

export interface Ambulance {
  id: string;
  registration_number: string;
  ambulance_type: AmbulanceType;
  status: AmbulanceStatus;
  equipment_list?: string[];
  hospital_id?: string;
}

export interface AmbulanceLocation {
  ambulance_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface NearbyAmbulance {
  ambulance: Ambulance;
  driver?: AmbulanceDriver;
  distance_km: number;
  estimated_eta_minutes: number;
}

// ===== Other Models =====
export interface Consent {
  id: string;
  patient_id: string;
  consultation_id?: string;
  purpose: string;
  consent_version: string;
  consent_status: ConsentStatus;
  given_at: string;
  revoked_at?: string;
}

export interface DoctorNote {
  id: string;
  consultation_id: string;
  doctor_id: string;
  observations?: string;
  assessment?: string;
  plan?: string;
  prescription_notes?: string;
  follow_up?: string;
  additional_comments?: string;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  content: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface QueueItem {
  id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  chief_complaint?: string;
  status: ConsultationStatus;
  priority: Priority;
  has_history: boolean;
  document_count: number;
  created_at: string;
  consultation_id: string;
  patient_id: string;
}

export interface AnalyticsData {
  patients_today: number;
  consultations_completed: number;
  pending_reviews: number;
  emergency_alerts: number;
  active_ambulances: number;
  avg_case_time_minutes: number;
  documents_processed: number;
  ambulance_requests: number;
}

// ===== Request Types =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  phone?: string;
  age?: number;
  gender?: string;
  preferred_language?: string;
  abha_id?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ConversationMessageRequest {
  content: string;
  message_type: 'TEXT' | 'VOICE' | 'OPTION';
  selected_option?: string;
}

export interface AmbulanceRequestCreate {
  patient_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  destination_hospital_id?: string;
  ambulance_type_requested: AmbulanceType;
  priority: Priority;
}
