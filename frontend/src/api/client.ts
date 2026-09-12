import axios from 'axios';
import type {
  TokenResponse, LoginRequest, RegisterRequest, User,
  Patient, Consultation, ConversationSession, ConversationMessage,
  ConversationMessageRequest, AIQuestionResponse, ClinicalHistory,
  MedicalDocument, DocumentExtraction, LabResult,
  AmbulanceRequest, AmbulanceRequestCreate, NearbyAmbulance,
  EmergencyAlert, DoctorNote, Notification, AuditLog,
  TimelineEvent, QueueItem, AnalyticsData, Hospital, ClinicalChatMessage, DoctorCommunication
} from '../types';

const client = axios.create({
  // In production (Vercel), VITE_API_URL is set to the Render backend URL.
  // In local dev this env var is undefined, so it falls back to '/api'
  // which is picked up by the Vite dev-server proxy → localhost:8000.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('medikiosk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    const isAuthPath = window.location.pathname === '/login' || window.location.pathname === '/demo' || window.location.pathname === '/';

    console.warn(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> status ${error.response?.status}:`, error.response?.data?.detail || error.message);

    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('medikiosk_token');
      if (!isAuthPath) {
        console.warn('[AUTH] Unauthorized access, redirecting to /login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth API =====
export const authApi = {
  login: (data: LoginRequest) =>
    client.post<TokenResponse>('/auth/login', data).then(r => r.data),
  register: (data: RegisterRequest) =>
    client.post<User>('/auth/register', data).then(r => r.data),
  me: () =>
    client.get<User>('/auth/me').then(r => r.data),
};

// ===== Patient API =====
export const patientApi = {
  getByUserId: (userId: string) =>
    client.get<Patient>(`/patients/by-user/${userId}`).then(r => r.data),
  get: (id: string) =>
    client.get<Patient>(`/patients/${id}`).then(r => r.data),
  getProfile: (id: string) =>
    client.get<any>(`/patients/${id}/profile`).then(r => r.data),
  update: (id: string, data: Partial<Patient>) =>
    client.put<Patient>(`/patients/${id}`, data).then(r => r.data),
  getTimeline: (id: string) =>
    client.get<TimelineEvent[]>(`/patients/${id}/timeline`).then(r => r.data),
  getDocuments: (id: string) =>
    client.get<MedicalDocument[]>(`/patients/${id}/documents`).then(r => r.data),
  getMedications: (id: string) =>
    client.get<any[]>(`/patients/${id}/medications`).then(r => r.data),
  getAllergies: (id: string) =>
    client.get<any[]>(`/patients/${id}/allergies`).then(r => r.data),
  onboarding: (id:string,data:any)=>client.post(`/patients/${id}/onboarding`,data).then(r=>r.data),
  getFollowUps: (id:string)=>client.get<any[]>(`/patients/${id}/follow-ups`).then(r=>r.data),
  getMedicalHistory: (id:string)=>client.get<any>(`/patients/${id}/medical-history`).then(r=>r.data),
  saveMedicalHistory: (id:string,data:any)=>client.post<any>(`/patients/${id}/medical-history`,data).then(r=>r.data),
  getConsultations: (id: string) =>
    client.get<Consultation[]>(`/patients/${id}/consultations`).then(r => r.data),
};

// ===== Consultation API =====
export const consultationApi = {
  create: (data: { patient_id: string; hospital_id?: string }) =>
    client.post<Consultation>('/consultations', data).then(r => r.data),
  get: (id: string) =>
    client.get<Consultation>(`/consultations/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    client.put(`/consultations/${id}/status`, { status }).then(r => r.data),
  getHistory: (id: string) =>
    client.get<ClinicalHistory>(`/consultations/${id}/history`).then(r => r.data),
};

// ===== Conversation API =====
export const conversationApi = {
  start: (consultation_id: string, language_code: string = 'en', restart: boolean = false) =>
    client.post<ConversationSession>('/conversations', { consultation_id, language_code, restart }).then(r => r.data),
  updateLanguage: (sessionId: string, language_code: string) =>
    client.put<{ id: string; language_code: string; current_question: AIQuestionResponse }>(`/conversations/${sessionId}/language`, { language_code }).then(r => r.data),
  sendMessage: (sessionId: string, data: ConversationMessageRequest) =>
    client.post<{ message: ConversationMessage; ai_response: AIQuestionResponse }>(`/conversations/${sessionId}/message`, data).then(r => r.data),
  getTranscript: (sessionId: string) =>
    client.get<ConversationMessage[]>(`/conversations/${sessionId}/transcript`).then(r => r.data),
  complete: (sessionId: string) =>
    client.post<ClinicalHistory>(`/conversations/${sessionId}/complete`).then(r => r.data),
};

// ===== Document API =====
export const documentApi = {
  upload: (file: File, patientId: string, documentType: string, consultationId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    formData.append('document_type', documentType);
    if (consultationId) formData.append('consultation_id', consultationId);
    return client.post<MedicalDocument>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  process: (id: string) =>
    client.post<DocumentExtraction>(`/documents/${id}/process`).then(r => r.data),
  get: (id: string) =>
    client.get<MedicalDocument>(`/documents/${id}`).then(r => r.data),
  getExtraction: (id: string) =>
    client.get<DocumentExtraction>(`/documents/${id}/extraction`).then(r => r.data),
};

// ===== Ambulance API =====
export const ambulanceApi = {
  request: (data: AmbulanceRequestCreate) =>
    client.post<AmbulanceRequest>('/ambulance/request', data).then(r => r.data),
  getNearby: (lat: number, lng: number, type?: string) =>
    client.get<NearbyAmbulance[]>('/ambulance/nearby', { params: { lat, lng, type } }).then(r => r.data),
  get: (id: string) =>
    client.get<AmbulanceRequest>(`/ambulance/${id}`).then(r => r.data),
  accept: (id: string) =>
    client.post(`/ambulance/${id}/accept`).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    client.post(`/ambulance/${id}/status`, { status }).then(r => r.data),
  updateLocation: (id: string, lat: number, lng: number) =>
    client.post(`/ambulance/${id}/location`, { lat, lng }).then(r => r.data),
  getDriverRequests: () =>
    client.get<AmbulanceRequest[]>('/ambulance/driver/requests').then(r => r.data),
  getPatientHistory: () =>
    client.get<AmbulanceRequest[]>('/ambulance/patient/history').then(r => r.data),
  getActive: () =>
    client.get<AmbulanceRequest[]>('/ambulance/active').then(r => r.data),
  emergencyRequest: (data: AmbulanceRequestCreate)=>client.post<AmbulanceRequest>('/ambulance/emergency',data).then(r=>r.data),
  getHospitals: () =>
    client.get<Hospital[]>('/ambulance/hospitals').then(r => r.data),
  simulateMovement: (id: string, leg: 'to_patient' | 'to_hospital') =>
    client.post(`/ambulance/${id}/simulate-movement`, { leg }).then(r => r.data),
  getRoute: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    client.get<{ coordinates: [number, number][]; distance_km: number; duration_seconds: number; is_road: boolean }>('/ambulance/route', {
      params: { from_lat: fromLat, from_lng: fromLng, to_lat: toLat, to_lng: toLng }
    }).then(r => r.data),
  resetDemo: () =>
    client.post('/ambulance/demo/reset').then(r => r.data),
};

// ===== Doctor API =====
export const doctorApi = {
  getQueue: (status?: string) =>
    client.get<QueueItem[]>('/doctors/queue', { params: { status } }).then(r => r.data),
  getPatient: (patientId: string) =>
    client.get<any>(`/doctors/patients/${patientId}`).then(r => r.data),
  verifySummary: (consultationId: string, data: { action: string; sections?: Record<string, string> }) =>
    client.post('/doctors/verify-summary', { consultation_id: consultationId, ...data }).then(r => r.data),
  addNote: (data: Partial<DoctorNote> & { consultation_id: string }) =>
    client.post<DoctorNote>('/doctors/notes', data).then(r => r.data),
  getAlerts: () =>
    client.get<EmergencyAlert[]>('/doctors/emergency-alerts').then(r => r.data),
  acknowledgeAlert: (id: string) =>
    client.post(`/doctors/emergency-alerts/${id}/acknowledge`).then(r => r.data),
  getStats: () =>
    client.get<AnalyticsData>('/doctors/stats').then(r => r.data),
  getCommunications: () =>
    client.get<DoctorCommunication[]>('/doctors/communications').then(r => r.data),
};

export const nearbyDoctorApi = { get: (lat:number,lng:number) => client.get<any[]>('/doctors/nearby',{params:{lat,lng}}).then(r=>r.data) };

// ===== Admin API =====
export const adminApi = {
  getAnalytics: () =>
    client.get<AnalyticsData>('/admin/analytics').then(r => r.data),
  getUsers: (role?: string) =>
    client.get<User[]>('/admin/users', { params: { role } }).then(r => r.data),
  getAuditLog: (limit?: number) =>
    client.get<AuditLog[]>('/admin/audit-log', { params: { limit } }).then(r => r.data),
  setUserActive: (id:string,is_active:boolean) => client.patch(`/admin/users/${id}/active`,{is_active}).then(r=>r.data),
  setAmbulanceStatus: (id:string,status:string) => client.patch(`/admin/ambulances/${id}/status`,{status}).then(r=>r.data),
  getAmbulances: () => client.get<any[]>('/admin/ambulances').then(r=>r.data),
  getHospitals: () => client.get<any[]>('/admin/hospitals').then(r=>r.data),
  getRbacRoles: () => client.get<any[]>('/admin/rbac/roles').then(r=>r.data),
  assignRbac: (id:string, data:{facility_id:string|null;facility_role:string|null}) => client.patch(`/admin/users/${id}/rbac`, data).then(r=>r.data),
};

export const clinicalChatApi = {
  get: (id: string, lang?: string) =>
    client.get<ClinicalChatMessage[]>(`/clinical-chat/${id}${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`).then(r => r.data),
  send: (id: string, content: string) =>
    client.post<ClinicalChatMessage>(`/clinical-chat/${id}`, { content }).then(r => r.data)
};


// ===== Notification API =====
export const notificationApi = {
  getAll: () =>
    client.get<Notification[]>('/notifications').then(r => r.data),
  markRead: (id: string) =>
    client.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () =>
    client.post('/notifications/read-all').then(r => r.data),
};

// ===== Consent API =====
export const consentApi = {
  give: (data: { patient_id: string; consultation_id?: string; purpose: string }) =>
    client.post('/consents', data).then(r => r.data),
  getForPatient: (patientId: string) =>
    client.get(`/consents/patient/${patientId}`).then(r => r.data),
};

export default client;
