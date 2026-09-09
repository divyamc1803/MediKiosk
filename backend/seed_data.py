from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import SessionLocal, engine
import models
import auth
from datetime import datetime, timedelta
from config import JAIPUR_HOSPITALS, JAIPUR_AMBULANCES, DEMO_PATIENT_LOCATION

RAJESH_BASELINE_HISTORY = {
    "chronic_conditions": "Type 2 Diabetes Mellitus diagnosed 3 years ago; mild Hypertension",
    "previous_hospitalizations": "Admitted in 2023 for acute viral gastroenteritis and dehydration, received IV fluids for 2 days",
    "surgeries": "Appendectomy in 2018 (laparoscopic), uneventful recovery",
    "allergies": "Allergic to Penicillin (causes skin rash and urticaria)",
    "serious_allergic_reaction": "None",
    "current_medications": "Metformin 500mg twice daily after meals; Telmisartan 40mg once daily in the morning",
    "supplements_ayurvedic": "Triphala churna 1 tsp at bedtime with warm water; Vitamin D3 60k monthly",
    "previous_diagnoses": "Mild fatty liver grade 1 on ultrasound (2022)",
    "family_history": "Father had coronary artery disease (cardiac stent at age 62); Mother has hypertension",
    "major_injuries": "Left hairline wrist fracture during cricket in college (healed with plaster cast)",
    "blood_history": "None, never required blood transfusion",
    "ongoing_undiagnosed_concerns": "Occasional mid-epigastric discomfort and mild bloating after heavy meals",
    "recent_doctor_visits": "Routine primary care checkup 4 months ago for HbA1c monitoring",
    "previous_treatments": "Completed 6-week physiotherapy regimen for lumbar muscle strain in 2021",
    "additional_history": "None, non-smoker, walks 30 minutes daily",
    "completed": True,
}

AARAV_BASELINE_HISTORY = {
    "chronic_conditions": "None reported",
    "previous_hospitalizations": "None",
    "surgeries": "None",
    "allergies": "No known drug allergies",
    "serious_allergic_reaction": "None",
    "current_medications": "None regular",
    "supplements_ayurvedic": "Multivitamin tablet daily",
    "previous_diagnoses": "Mild seasonal allergic rhinitis",
    "family_history": "Father had heart attack at age 54; Mother has high cholesterol",
    "major_injuries": "None",
    "blood_history": "None",
    "ongoing_undiagnosed_concerns": "Sudden crushing retrosternal chest heaviness radiating to left arm",
    "recent_doctor_visits": "Annual health checkup 6 months ago (ECG was normal then)",
    "previous_treatments": "None",
    "additional_history": "Works high-stress desk job in IT, irregular meal timings",
    "completed": True,
}

PRIYA_BASELINE_HISTORY = {
    "chronic_conditions": "Migraine headaches (recurrent for 5 years)",
    "previous_hospitalizations": "None",
    "surgeries": "Wisdom tooth extraction under local anesthesia in 2020",
    "allergies": "Sulfa drugs (causes maculopapular rash)",
    "serious_allergic_reaction": "None",
    "current_medications": "Naproxen 500mg SOS during acute migraine attacks",
    "supplements_ayurvedic": "B-Complex and Magnesium supplements",
    "previous_diagnoses": "Hemicranial migraine with photophobia",
    "family_history": "Maternal grandmother had migraines",
    "major_injuries": "None",
    "blood_history": "None",
    "ongoing_undiagnosed_concerns": "Throbbing right-sided headache with nausea today",
    "recent_doctor_visits": "Neurologist consultation 3 months ago",
    "previous_treatments": "None",
    "additional_history": "Sensitivity to bright screen glare and lack of sleep",
    "completed": True,
}

def seed(force: bool = False):
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if already seeded (unless force reset requested)
    if not force and db.query(models.Hospital).first():
        print("Database already seeded")
        db.close()
        return
        
    if force:
        # Clear existing tables for fresh Jaipur demo
        db.query(models.AmbulanceLocation).delete()
        db.query(models.AmbulanceRequest).delete()
        db.query(models.EmergencyAlert).delete()
        db.query(models.DoctorNote).delete()
        db.query(models.ClinicalHistory).delete()
        db.query(models.ConversationMessage).delete()
        db.query(models.ConversationSession).delete()
        db.query(models.Consultation).delete()
        db.query(models.Consent).delete()
        db.query(models.AmbulanceDriver).delete()
        db.query(models.Ambulance).delete()
        db.query(models.Doctor).delete()
        db.query(models.Patient).delete()
        db.query(models.Staff).delete()
        db.query(models.Hospital).delete()
        db.query(models.User).delete()
        db.commit()

    pwd = auth.get_password_hash("demo123")
    
    # 1. Admin & Staff
    admin = models.User(email="admin@demo.com", password_hash=pwd, full_name="Admin", role=models.Role.ADMIN)
    staff = models.User(email="staff@demo.com", password_hash=pwd, full_name="Front Desk Dispatcher", role=models.Role.STAFF)
    db.add_all([admin, staff])
    db.commit()
    
    # 2. Jaipur Hospitals
    h_objs = []
    for h in JAIPUR_HOSPITALS:
        h_obj = models.Hospital(
            name=h["name"],
            address=h["address"],
            lat=h["lat"],
            lng=h["lng"],
            phone=h["phone"],
            emergency_dept=h["emergency_dept"],
            is_government=h.get("is_government", True),
            departments=h["departments"]
        )
        db.add(h_obj)
        h_objs.append(h_obj)
    db.commit()
    for h in h_objs:
        db.refresh(h)
    
    # 3. Doctors (Jaipur based)
    doc_users = [
        models.User(email="sneha@demo.com", password_hash=pwd, full_name="Dr. Sneha Reddy", role=models.Role.DOCTOR),
        models.User(email="vikram@demo.com", password_hash=pwd, full_name="Dr. Vikram Singh", role=models.Role.DOCTOR),
        models.User(email="meera@demo.com", password_hash=pwd, full_name="Dr. Meera Iyer", role=models.Role.DOCTOR),
        models.User(email="arjun@demo.com", password_hash=pwd, full_name="Dr. Arjun Nair", role=models.Role.DOCTOR),
        models.User(email="fatima@demo.com", password_hash=pwd, full_name="Dr. Fatima Khan", role=models.Role.DOCTOR),
    ]
    db.add_all(doc_users)
    db.commit()
    
    docs = [
        models.Doctor(user_id=doc_users[0].id, specialization="General Medicine", department="OPD", license_number="D001", experience_years=10),
        models.Doctor(user_id=doc_users[1].id, specialization="Cardiology", department="CARDIOLOGY", license_number="D002", experience_years=15),
        models.Doctor(user_id=doc_users[2].id, specialization="Ayurveda", department="AYUSH", license_number="D003", experience_years=8),
        models.Doctor(user_id=doc_users[3].id, specialization="Emergency Medicine", department="ER", license_number="D004", experience_years=12),
        models.Doctor(user_id=doc_users[4].id, specialization="Orthopedics", department="ORTHO", license_number="D005", experience_years=20)
    ]
    db.add_all(docs)
    db.commit()

    # 4. Ambulances and Drivers in Jaipur
    for idx, amb_data in enumerate(JAIPUR_AMBULANCES):
        assigned_hospital = h_objs[idx % len(h_objs)]
        amb = models.Ambulance(
            registration_number=amb_data["reg"],
            ambulance_type=models.AmbulanceType(amb_data["type"]),
            status=models.AmbulanceStatus(amb_data["status"]),
            hospital_id=assigned_hospital.id,
            equipment_list="Oxygen, Defibrillator, Stretcher, First Aid"
        )
        db.add(amb)
        db.commit()
        db.refresh(amb)
        
        drv_user = models.User(
            email=amb_data["driver_email"],
            password_hash=pwd,
            full_name=amb_data["driver_name"],
            role=models.Role.DRIVER,
            phone=amb_data["driver_phone"]
        )
        db.add(drv_user)
        db.commit()
        db.refresh(drv_user)
        
        driver = models.AmbulanceDriver(
            user_id=drv_user.id,
            license_number=f"RJ-14-{1000+idx}",
            is_online=(amb_data["status"] in ["AVAILABLE", "BUSY"]),
            assigned_ambulance_id=amb.id,
            current_lat=amb_data["lat"],
            current_lng=amb_data["lng"]
        )
        db.add(driver)
        db.commit()

    # 5. Patients in Jaipur
    pat_users = [
        models.User(email="aarav@demo.com", password_hash=pwd, full_name="Aarav Sharma", role=models.Role.PATIENT, phone="+91 98290 55555"),
        models.User(email="rajesh@demo.com", password_hash=pwd, full_name="Rajesh Kumar", role=models.Role.PATIENT, phone="+91 98290 55556"),
        models.User(email="priya@demo.com", password_hash=pwd, full_name="Priya Sharma", role=models.Role.PATIENT, phone="+91 98290 55557"),
        models.User(email="anand@demo.com", password_hash=pwd, full_name="Anand Patel", role=models.Role.PATIENT, phone="+91 98290 55558"),
        models.User(email="lakshmi@demo.com", password_hash=pwd, full_name="Lakshmi Devi", role=models.Role.PATIENT, phone="+91 98290 55559")
    ]
    db.add_all(pat_users)
    db.commit()

    patients = [
        models.Patient(user_id=pat_users[0].id, age=32, date_of_birth="1994-02-15", gender="M", preferred_language="hi", blood_group="O+", abha_id="14-1234-5678-9012", address=DEMO_PATIENT_LOCATION["address"], emergency_contact_name="Neha Sharma", emergency_contact_phone="+91 98290 60001", medical_history=dict(AARAV_BASELINE_HISTORY)),
        models.Patient(user_id=pat_users[1].id, age=42, date_of_birth="1984-08-22", gender="M", preferred_language="hi", blood_group="B+", abha_id="14-2234-5678-9012", address="C-Scheme, Jaipur", emergency_contact_name="Sunita Kumar", emergency_contact_phone="+91 98290 60002", medical_history=dict(RAJESH_BASELINE_HISTORY)),
        models.Patient(user_id=pat_users[2].id, age=35, date_of_birth="1991-05-18", gender="F", preferred_language="en", blood_group="A+", abha_id="14-3234-5678-9012", address="Vaishali Nagar, Jaipur", emergency_contact_name="Rohan Sharma", emergency_contact_phone="+91 98290 60003", medical_history=dict(PRIYA_BASELINE_HISTORY)),
        models.Patient(user_id=pat_users[3].id, age=58, date_of_birth="1968-01-12", gender="M", preferred_language="hi", blood_group="B+", abha_id="14-4234-5678-9012", address="Mansarovar, Jaipur", emergency_contact_name="Pooja Patel", emergency_contact_phone="+91 98290 60004", medical_history=dict(RAJESH_BASELINE_HISTORY)),
        models.Patient(user_id=pat_users[4].id, age=65, date_of_birth="1961-11-03", gender="F", preferred_language="hi", blood_group="AB+", abha_id="14-5234-5678-9012", address="Raja Park, Jaipur", emergency_contact_name="Amit Devi", emergency_contact_phone="+91 98290 60005", medical_history=dict(RAJESH_BASELINE_HISTORY))
    ]
    db.add_all(patients)
    db.commit()
    for pat in patients:
        db.add(models.Consent(patient_id=pat.id, purpose="AMBULANCE_RECEIPT", consent_version="2026.09", consent_status=models.ConsentStatus.GIVEN, given_at=datetime.utcnow()))
        db.add(models.Consent(patient_id=pat.id, purpose="MEDICAL_CARE", consent_version="2026.09", consent_status=models.ConsentStatus.GIVEN, given_at=datetime.utcnow()))
    db.commit()

    # Seed Medications
    db.add_all([
        models.Medication(patient_id=patients[1].id, name="Metformin", dosage="500mg", frequency="1-0-1 (After meals)", is_active=True, source="PATIENT_REPORTED"),
        models.Medication(patient_id=patients[1].id, name="Telmisartan", dosage="40mg", frequency="1-0-0 (Morning)", is_active=True, source="PATIENT_REPORTED"),
        models.Medication(patient_id=patients[1].id, name="Pantoprazole", dosage="40mg", frequency="1-0-0 (OD Before Food)", is_active=True, source="DOCUMENT_EXTRACTED"),
        models.Medication(patient_id=patients[2].id, name="Naproxen", dosage="500mg", frequency="SOS (During pain)", is_active=True, source="PATIENT_REPORTED"),
    ])
    # Seed Allergies
    db.add_all([
        models.Allergy(patient_id=patients[1].id, allergen="Penicillin", reaction="Skin urticaria & pruritus", severity=models.Severity.MODERATE, source="PATIENT_REPORTED"),
        models.Allergy(patient_id=patients[2].id, allergen="Sulfa Drugs", reaction="Erythematous rash", severity=models.Severity.MILD, source="PATIENT_REPORTED"),
    ])
    db.commit()

    # 6. Consultations for OPD Queue
    # c0: Aarav Sharma (Fresh Consultation - Ready for Review / Intake)
    c0 = models.Consultation(
        patient_id=patients[0].id,
        hospital_id=h_objs[0].id,
        doctor_id=docs[0].id,
        chief_complaint=None,
        priority=models.Priority.NORMAL,
        status=models.ConsultationStatus.READY
    )
    db.add(c0)
    db.commit()

    # Medical Document & Extraction for Aarav
    doc0 = models.MedicalDocument(
        patient_id=patients[0].id,
        consultation_id=c0.id,
        document_type=models.DocType.PRESCRIPTION,
        file_path="uploads/aarav_cardiac_prescription.pdf",
        file_name="Emergency_Cardiology_Intake_Aarav.pdf",
        file_size=168000,
        mime_type="application/pdf",
        ocr_status=models.OCRStatus.COMPLETED
    )
    db.add(doc0)
    db.commit()

    ext0 = models.DocumentExtraction(
        document_id=doc0.id,
        extracted_text="Rx - Fortis Escorts Hospital Jaipur - Cardiology Emergency\nPatient: Aarav Sharma (32M) | Date: 07/09/2026\nProvisional Diagnosis: Acute Coronary Syndrome (ACS) / NSTEMI\n\n1. Tab Aspirin 75mg - 1 Tab OD orally (dispersible)\n2. Tab Clopidogrel 75mg - 1 Tab OD orally\n3. Tab Atorvastatin 40mg - 1 Tab HS at bedtime\n4. Tab Metoprolol 25mg - 1 Tab BD after food\n\nUrgent Investigations: ECG 12-lead, High-Sensitivity Cardiac Troponin-I, Serum Electrolytes",
        extracted_data={
            "diagnoses": ["Acute Coronary Syndrome (ACS)", "Suspected NSTEMI / Angina Pectoris"],
            "medications": [
                {"name": "Aspirin", "dose": "75MG", "dosage": "75MG", "frequency": "1-0-0 (OD Oral)", "duration": "30 days"},
                {"name": "Clopidogrel", "dose": "75MG", "dosage": "75MG", "frequency": "1-0-0 (OD Oral)", "duration": "30 days"},
                {"name": "Atorvastatin", "dose": "40MG", "dosage": "40MG", "frequency": "0-0-1 (HS Bedtime)", "duration": "30 days"},
                {"name": "Metoprolol", "dose": "25MG", "dosage": "25MG", "frequency": "1-0-1 (BD After Food)", "duration": "14 days"}
            ],
            "lab_values": [
                {"test": "Cardiac Troponin-I (High Sensitivity)", "value": "0.18", "unit": "ng/mL", "ref_range": "< 0.04", "is_abnormal": True},
                {"test": "ECG (12-lead)", "value": "ST depression 1.5mm in V4-V6", "unit": "findings", "ref_range": "Normal sinus rhythm", "is_abnormal": True},
                {"test": "Random Blood Sugar", "value": "118", "unit": "mg/dL", "ref_range": "70 - 140", "is_abnormal": False}
            ],
            "procedures": ["Immediate 12-lead ECG", "Continuous Cardiac Telemetry"],
            "dates": ["2026-09-07"],
            "doctors": ["Dr. Vikram Singh", "Dr. Sneha Reddy"]
        },
        confidence_score=0.95
    )
    db.add(ext0)

    # Medications for Aarav
    db.add_all([
        models.Medication(patient_id=patients[0].id, name="Aspirin", dosage="75mg", frequency="1-0-0 (OD)", is_active=True, source="DOCUMENT_EXTRACTED"),
        models.Medication(patient_id=patients[0].id, name="Clopidogrel", dosage="75mg", frequency="1-0-0 (OD)", is_active=True, source="DOCUMENT_EXTRACTED"),
        models.Medication(patient_id=patients[0].id, name="Atorvastatin", dosage="40mg", frequency="0-0-1 (HS Bedtime)", is_active=True, source="DOCUMENT_EXTRACTED"),
        models.Medication(patient_id=patients[0].id, name="Metoprolol", dosage="25mg", frequency="1-0-1 (BD)", is_active=True, source="DOCUMENT_EXTRACTED"),
    ])
    db.add(models.Allergy(patient_id=patients[0].id, allergen="No known drug allergies (NKDA)", reaction="None reported", severity=models.Severity.MILD, source="PATIENT_REPORTED"))

    db.commit()

    # c1: Rajesh Kumar (Abdominal Pain)
    c1 = models.Consultation(
        patient_id=patients[1].id,
        hospital_id=h_objs[0].id,
        chief_complaint="Severe stomach pain in lower right abdomen since morning",
        priority=models.Priority.HIGH,
        status=models.ConsultationStatus.READY
    )
    db.add(c1)
    db.commit()
    
    sess1 = models.ConversationSession(consultation_id=c1.id, state="COMPLETE", language_code="hi")
    db.add(sess1)
    db.commit()

    # Seed transcript for Rajesh
    db.add_all([
        models.ConversationMessage(session_id=sess1.id, role=models.RoleType.AI, content="आज आप अस्पताल किस कारण से आए हैं?", question_state="CHIEF_COMPLAINT"),
        models.ConversationMessage(session_id=sess1.id, role=models.RoleType.PATIENT, content="सुबह से पेट के निचले दाएं हिस्से में बहुत तेज दर्द हो रहा है", original_language="hi", translated_content="Since morning there is very severe pain in the lower right part of my stomach", question_state="CHIEF_COMPLAINT"),
        models.ConversationMessage(session_id=sess1.id, role=models.RoleType.AI, content="यह दर्द कैसा महसूस होता है — तेज़ चुभन, हल्का भारीपन या जलन?", question_state="HPI_CHARACTER"),
        models.ConversationMessage(session_id=sess1.id, role=models.RoleType.PATIENT, content="तेज चुभने वाला दर्द है और जी मिचला रहा है", original_language="hi", translated_content="It is sharp stabbing pain and I feel nauseous", question_state="HPI_CHARACTER"),
    ])
    
    hist1 = models.ClinicalHistory(
        consultation_id=c1.id, 
        chief_complaint="Severe stomach pain in lower right abdomen since morning",
        hpi="Acute onset sharp pain localized to right iliac fossa (RLQ) starting 4 hours ago. Severity 8/10. Aggravated by movement and palpation. Associated with moderate nausea without active vomiting.",
        past_medical="Type 2 Diabetes Mellitus (3 yrs), controlled on Metformin; Essential Hypertension",
        past_surgical="Laparoscopic Appendectomy in 2018",
        drug_history="Metformin 500mg BD, Telmisartan 40mg OD",
        allergy_history="Penicillin (urticarial rash)",
        family_history="Father had CAD; Mother has hypertension",
        personal_history="Non-smoker, vegetarian diet, regular walks",
        review_of_systems="No fever, no diarrhea, no hematuria",
        ayurvedic_history={"prakriti": "Pitta-Vata", "agni": "Tikshna (Intense)", "koshta": "Madhyama (Regular)"},
        red_flags=[],
        ai_generated=True,
        doctor_verified=False
    )
    db.add(hist1)

    # Seed Sample Document & Extraction for Rajesh
    doc1 = models.MedicalDocument(
        patient_id=patients[1].id,
        consultation_id=c1.id,
        document_type=models.DocType.PRESCRIPTION,
        file_path="uploads/rajesh_prescription.pdf",
        file_name="Dr_Sharma_Prescription_Aug2026.pdf",
        file_size=142000,
        mime_type="application/pdf",
        ocr_status=models.OCRStatus.COMPLETED
    )
    db.add(doc1)
    db.commit()

    ext1 = models.DocumentExtraction(
        document_id=doc1.id,
        extracted_text="Rx\nSMS Hospital OPD - Dr. Sharma\nPatient: Rajesh Kumar (42M)\nDiagnosis: Type 2 Diabetes Mellitus, Mild Gastritis\n\n1. Tab Metformin 500mg - 1 Tab BD after food (30 days)\n2. Tab Telmisartan 40mg - 1 Tab OD morning (30 days)\n3. Cap Pantoprazole 40mg - 1 Cap OD before breakfast (15 days)\n\nLab Advised: Fasting Blood Sugar, HbA1c, Serum Creatinine",
        extracted_data={
            "diagnoses": ["Type 2 Diabetes Mellitus", "Acute Gastritis / Acid Peptic Disease"],
            "medications": [
                {"name": "Metformin", "dose": "500MG", "dosage": "500MG", "frequency": "1-0-1", "duration": "30 days"},
                {"name": "Telmisartan", "dose": "40MG", "dosage": "40MG", "frequency": "1-0-0", "duration": "30 days"},
                {"name": "Pantoprazole", "dose": "40MG", "dosage": "40MG", "frequency": "1-0-0 (OD Before Breakfast)", "duration": "15 days"},
            ],
            "lab_values": [
                {"test": "Fasting Blood Sugar", "value": "128", "unit": "mg/dL", "ref_range": "70 - 100", "is_abnormal": True},
                {"test": "Glycated Hemoglobin (HbA1c)", "value": "7.1", "unit": "%", "ref_range": "< 5.7", "is_abnormal": True},
                {"test": "Serum Creatinine", "value": "0.95", "unit": "mg/dL", "ref_range": "0.6 - 1.2", "is_abnormal": False},
            ],
            "procedures": [],
            "dates": ["2026-08-15"],
            "doctors": ["Dr. Sharma"]
        },
        confidence_score=0.92
    )
    db.add(ext1)
    db.commit()

    # c2: Priya Sharma (Migraine Headache)
    c2 = models.Consultation(
        patient_id=patients[2].id,
        hospital_id=h_objs[0].id,
        chief_complaint="Throbbing hemicranial headache with photophobia",
        priority=models.Priority.NORMAL,
        status=models.ConsultationStatus.READY
    )
    db.add(c2)
    db.commit()

    # 7. Sample Initial Emergency Alert for Anand
    c3 = models.Consultation(
        patient_id=patients[3].id,
        hospital_id=h_objs[1].id,
        chief_complaint="Chest tightness and sweating",
        priority=models.Priority.CRITICAL,
        status=models.ConsultationStatus.EMERGENCY
    )
    db.add(c3)
    db.commit()
    
    alert = models.EmergencyAlert(
        patient_id=patients[3].id,
        consultation_id=c3.id,
        red_flags=[{"keyword": "chest pain", "category": "chest_pain", "severity": "CRITICAL"}],
        priority=models.Priority.CRITICAL
    )
    db.add(alert)
    db.commit()

    print("Jaipur demo data successfully seeded!")
    db.close()

def reset_demo_accounts(db: Session):
    """
    Restore demo accounts (and demo accounts only) to their ORIGINAL BASELINE DEMO STATE.

    KEEP & RESTORE:
    - All pre-filled clinical intake answers (Aarav, Rajesh, Priya, Anand, Lakshmi) with completed=True.
    - All pre-filled demo patient information (demographics, DOB, medications, allergies, baseline documents).
    - Aarav's baseline consultation c0 (ready, normal priority, Dr. Sneha Reddy, 0 messages).
    - Pre-seeded consultations for OPD queue (Rajesh c1, Priya c2, Anand c3).

    DELETE ONLY:
    - Clinical chat messages added during the demo (resets chat to 0 messages).
    - Conversation sessions / messages created during demo AI interviews for Aarav.
    - Newly created consultations created during the demo.
    - Newly created doctor notes, follow-up records, timeline events, or alerts.
    - Ambulance requests created during the demo (and reset ambulances to AVAILABLE, drivers online).
    """
    demo_users = db.query(models.User).filter(models.User.email.like("%@demo.com")).all()
    demo_user_ids = [u.id for u in demo_users]
    if not demo_user_ids:
        seed(force=True)
        return

    demo_patients = db.query(models.Patient).filter(models.Patient.user_id.in_(demo_user_ids)).all()
    demo_patient_ids = [p.id for p in demo_patients]
    demo_doctors = db.query(models.Doctor).filter(models.Doctor.user_id.in_(demo_user_ids)).all()
    demo_consultations = db.query(models.Consultation).filter(models.Consultation.patient_id.in_(demo_patient_ids)).all()
    demo_consultation_ids = [c.id for c in demo_consultations]

    # 1. Clear all ClinicalChatMessage for demo consultations and demo users (resets chat to 0 messages)
    if demo_consultation_ids:
        db.query(models.ClinicalChatMessage).filter(
            models.ClinicalChatMessage.consultation_id.in_(demo_consultation_ids)
        ).delete(synchronize_session=False)
    if demo_user_ids:
        db.query(models.ClinicalChatMessage).filter(
            models.ClinicalChatMessage.sender_user_id.in_(demo_user_ids)
        ).delete(synchronize_session=False)

    # 2. Clear user-created DoctorNote, PatientTimeline, PatientFollowUp, Notification
    if demo_consultation_ids:
        db.query(models.DoctorNote).filter(
            models.DoctorNote.consultation_id.in_(demo_consultation_ids)
        ).delete(synchronize_session=False)
    if demo_patient_ids:
        db.query(models.PatientTimeline).filter(
            models.PatientTimeline.patient_id.in_(demo_patient_ids)
        ).delete(synchronize_session=False)
        db.query(models.PatientFollowUp).filter(
            models.PatientFollowUp.patient_id.in_(demo_patient_ids)
        ).delete(synchronize_session=False)
    if demo_user_ids:
        db.query(models.Notification).filter(
            models.Notification.user_id.in_(demo_user_ids)
        ).delete(synchronize_session=False)

    # 3. Clear AmbulanceRequest for demo patients, reset fleet
    if demo_patient_ids:
        db.query(models.AmbulanceRequest).filter(
            models.AmbulanceRequest.patient_id.in_(demo_patient_ids)
        ).delete(synchronize_session=False)
    db.query(models.AmbulanceLocation).delete(synchronize_session=False)
    for amb in db.query(models.Ambulance).all():
        amb.status = models.AmbulanceStatus.AVAILABLE
    for drv in db.query(models.AmbulanceDriver).all():
        drv.is_online = True

    # 4. Lookup demo patients and doctors
    aarav_user = next((u for u in demo_users if u.email == "aarav@demo.com"), None)
    aarav_pat = next((p for p in demo_patients if aarav_user and p.user_id == aarav_user.id), None)
    rajesh_user = next((u for u in demo_users if u.email == "rajesh@demo.com"), None)
    rajesh_pat = next((p for p in demo_patients if rajesh_user and p.user_id == rajesh_user.id), None)
    priya_user = next((u for u in demo_users if u.email == "priya@demo.com"), None)
    priya_pat = next((p for p in demo_patients if priya_user and p.user_id == priya_user.id), None)
    anand_user = next((u for u in demo_users if u.email == "anand@demo.com"), None)
    anand_pat = next((p for p in demo_patients if anand_user and p.user_id == anand_user.id), None)
    lakshmi_user = next((u for u in demo_users if u.email == "lakshmi@demo.com"), None)
    lakshmi_pat = next((p for p in demo_patients if lakshmi_user and p.user_id == lakshmi_user.id), None)

    sneha_user = next((u for u in demo_users if u.email == "sneha@demo.com"), None)
    sneha_doc = next((d for d in demo_doctors if sneha_user and d.user_id == sneha_user.id), None)
    first_hosp = db.query(models.Hospital).first()
    h_objs = db.query(models.Hospital).all()

    # 5. Restore baseline pre-filled clinical intake answers and demographics
    if aarav_pat:
        aarav_pat.medical_history = dict(AARAV_BASELINE_HISTORY)
        aarav_pat.age = 32
        aarav_pat.date_of_birth = "1994-02-15"
        aarav_pat.gender = "M"
        aarav_pat.preferred_language = "hi"
        aarav_pat.blood_group = "O+"
        aarav_pat.abha_id = "14-1234-5678-9012"
        aarav_pat.address = DEMO_PATIENT_LOCATION["address"]
        aarav_pat.emergency_contact_name = "Neha Sharma"
        aarav_pat.emergency_contact_phone = "+91 98290 60001"

    if rajesh_pat:
        rajesh_pat.medical_history = dict(RAJESH_BASELINE_HISTORY)
        rajesh_pat.age = 42
        rajesh_pat.date_of_birth = "1984-08-22"
        rajesh_pat.gender = "M"
        rajesh_pat.preferred_language = "hi"
        rajesh_pat.blood_group = "B+"
        rajesh_pat.abha_id = "14-2234-5678-9012"
        rajesh_pat.address = "C-Scheme, Jaipur"
        rajesh_pat.emergency_contact_name = "Sunita Kumar"
        rajesh_pat.emergency_contact_phone = "+91 98290 60002"

    if priya_pat:
        priya_pat.medical_history = dict(PRIYA_BASELINE_HISTORY)
        priya_pat.age = 35
        priya_pat.date_of_birth = "1991-05-18"
        priya_pat.gender = "F"
        priya_pat.preferred_language = "en"
        priya_pat.blood_group = "A+"
        priya_pat.abha_id = "14-3234-5678-9012"
        priya_pat.address = "Vaishali Nagar, Jaipur"
        priya_pat.emergency_contact_name = "Rohan Sharma"
        priya_pat.emergency_contact_phone = "+91 98290 60003"

    if anand_pat:
        anand_pat.medical_history = dict(RAJESH_BASELINE_HISTORY)
        anand_pat.age = 58
        anand_pat.date_of_birth = "1968-01-12"
        anand_pat.gender = "M"
        anand_pat.blood_group = "B+"
        anand_pat.abha_id = "14-4234-5678-9012"
        anand_pat.address = "Mansarovar, Jaipur"
        anand_pat.emergency_contact_name = "Pooja Patel"
        anand_pat.emergency_contact_phone = "+91 98290 60004"

    if lakshmi_pat:
        lakshmi_pat.medical_history = dict(RAJESH_BASELINE_HISTORY)
        lakshmi_pat.age = 65
        lakshmi_pat.date_of_birth = "1961-11-03"
        lakshmi_pat.gender = "F"
        lakshmi_pat.blood_group = "AB+"
        lakshmi_pat.abha_id = "14-5234-5678-9012"
        lakshmi_pat.address = "Raja Park, Jaipur"
        lakshmi_pat.emergency_contact_name = "Amit Devi"
        lakshmi_pat.emergency_contact_phone = "+91 98290 60005"

    for pat in demo_patients:
        for purpose in ["AMBULANCE_RECEIPT", "MEDICAL_CARE"]:
            consent = db.query(models.Consent).filter(models.Consent.patient_id == pat.id, models.Consent.purpose == purpose).first()
            if consent:
                consent.consent_status = models.ConsentStatus.GIVEN
                consent.given_at = datetime.utcnow()
            else:
                db.add(models.Consent(patient_id=pat.id, purpose=purpose, consent_version="2026.09", consent_status=models.ConsentStatus.GIVEN, given_at=datetime.utcnow()))

    # 6. Restore baseline medications & allergies
    if aarav_pat:
        db.query(models.Medication).filter(models.Medication.patient_id == aarav_pat.id).delete(synchronize_session=False)
        db.query(models.Allergy).filter(models.Allergy.patient_id == aarav_pat.id).delete(synchronize_session=False)
        db.add_all([
            models.Medication(patient_id=aarav_pat.id, name="Aspirin", dosage="75mg", frequency="1-0-0 (OD)", is_active=True, source="DOCUMENT_EXTRACTED"),
            models.Medication(patient_id=aarav_pat.id, name="Clopidogrel", dosage="75mg", frequency="1-0-0 (OD)", is_active=True, source="DOCUMENT_EXTRACTED"),
            models.Medication(patient_id=aarav_pat.id, name="Atorvastatin", dosage="40mg", frequency="0-0-1 (HS Bedtime)", is_active=True, source="DOCUMENT_EXTRACTED"),
            models.Medication(patient_id=aarav_pat.id, name="Metoprolol", dosage="25mg", frequency="1-0-1 (BD)", is_active=True, source="DOCUMENT_EXTRACTED"),
            models.Allergy(patient_id=aarav_pat.id, allergen="No known drug allergies (NKDA)", reaction="None reported", severity=models.Severity.MILD, source="PATIENT_REPORTED"),
        ])

    if rajesh_pat:
        db.query(models.Medication).filter(models.Medication.patient_id == rajesh_pat.id).delete(synchronize_session=False)
        db.query(models.Allergy).filter(models.Allergy.patient_id == rajesh_pat.id).delete(synchronize_session=False)
        db.add_all([
            models.Medication(patient_id=rajesh_pat.id, name="Metformin", dosage="500mg", frequency="1-0-1 (After meals)", is_active=True, source="PATIENT_REPORTED"),
            models.Medication(patient_id=rajesh_pat.id, name="Telmisartan", dosage="40mg", frequency="1-0-0 (Morning)", is_active=True, source="PATIENT_REPORTED"),
            models.Medication(patient_id=rajesh_pat.id, name="Pantoprazole", dosage="40mg", frequency="1-0-0 (OD Before Food)", is_active=True, source="DOCUMENT_EXTRACTED"),
            models.Allergy(patient_id=rajesh_pat.id, allergen="Penicillin", reaction="Skin urticaria & pruritus", severity=models.Severity.MODERATE, source="PATIENT_REPORTED"),
        ])

    if priya_pat:
        db.query(models.Medication).filter(models.Medication.patient_id == priya_pat.id).delete(synchronize_session=False)
        db.query(models.Allergy).filter(models.Allergy.patient_id == priya_pat.id).delete(synchronize_session=False)
        db.add_all([
            models.Medication(patient_id=priya_pat.id, name="Naproxen", dosage="500mg", frequency="SOS (During pain)", is_active=True, source="PATIENT_REPORTED"),
            models.Allergy(patient_id=priya_pat.id, allergen="Sulfa Drugs", reaction="Erythematous rash", severity=models.Severity.MILD, source="PATIENT_REPORTED"),
        ])

    # 7. Restore baseline documents & extractions (and delete user test uploads)
    if aarav_pat:
        aarav_docs = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == aarav_pat.id).all()
        doc0 = next((d for d in aarav_docs if d.file_name == "Emergency_Cardiology_Intake_Aarav.pdf"), None)
        for d in aarav_docs:
            if d != doc0:
                db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == d.id).delete(synchronize_session=False)
                db.delete(d)
        if not doc0:
            doc0 = models.MedicalDocument(
                patient_id=aarav_pat.id,
                document_type=models.DocType.PRESCRIPTION,
                file_path="uploads/aarav_cardiac_prescription.pdf",
                file_name="Emergency_Cardiology_Intake_Aarav.pdf",
                file_size=168000,
                mime_type="application/pdf",
                ocr_status=models.OCRStatus.COMPLETED
            )
            db.add(doc0)
            db.flush()
        ext0 = db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == doc0.id).first()
        if not ext0:
            db.add(models.DocumentExtraction(
                document_id=doc0.id,
                extracted_text="Rx - Fortis Escorts Hospital Jaipur - Cardiology Emergency\nPatient: Aarav Sharma (32M) | Date: 07/09/2026\nProvisional Diagnosis: Acute Coronary Syndrome (ACS) / NSTEMI\n\n1. Tab Aspirin 75mg - 1 Tab OD orally (dispersible)\n2. Tab Clopidogrel 75mg - 1 Tab OD orally\n3. Tab Atorvastatin 40mg - 1 Tab HS at bedtime\n4. Tab Metoprolol 25mg - 1 Tab BD after food\n\nUrgent Investigations: ECG 12-lead, High-Sensitivity Cardiac Troponin-I, Serum Electrolytes",
                extracted_data={
                    "diagnoses": ["Acute Coronary Syndrome (ACS)", "Suspected NSTEMI / Angina Pectoris"],
                    "medications": [
                        {"name": "Aspirin", "dose": "75MG", "dosage": "75MG", "frequency": "1-0-0 (OD Oral)", "duration": "30 days"},
                        {"name": "Clopidogrel", "dose": "75MG", "dosage": "75MG", "frequency": "1-0-0 (OD Oral)", "duration": "30 days"},
                        {"name": "Atorvastatin", "dose": "40MG", "dosage": "40MG", "frequency": "0-0-1 (HS Bedtime)", "duration": "30 days"},
                        {"name": "Metoprolol", "dose": "25MG", "dosage": "25MG", "frequency": "1-0-1 (BD After Food)", "duration": "14 days"}
                    ],
                    "lab_values": [
                        {"test": "Cardiac Troponin-I (High Sensitivity)", "value": "0.18", "unit": "ng/mL", "ref_range": "< 0.04", "is_abnormal": True},
                        {"test": "ECG (12-lead)", "value": "ST depression 1.5mm in V4-V6", "unit": "findings", "ref_range": "Normal sinus rhythm", "is_abnormal": True},
                        {"test": "Random Blood Sugar", "value": "118", "unit": "mg/dL", "ref_range": "70 - 140", "is_abnormal": False}
                    ],
                    "procedures": ["Immediate 12-lead ECG", "Continuous Cardiac Telemetry"],
                    "dates": ["2026-09-07"],
                    "doctors": ["Dr. Vikram Singh", "Dr. Sneha Reddy"]
                },
                confidence_score=0.95
            ))

    if rajesh_pat:
        rajesh_docs = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == rajesh_pat.id).all()
        doc1 = next((d for d in rajesh_docs if d.file_name == "Dr_Sharma_Prescription_Aug2026.pdf"), None)
        for d in rajesh_docs:
            if d != doc1:
                db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == d.id).delete(synchronize_session=False)
                db.delete(d)
        if not doc1:
            doc1 = models.MedicalDocument(
                patient_id=rajesh_pat.id,
                document_type=models.DocType.PRESCRIPTION,
                file_path="uploads/rajesh_prescription.pdf",
                file_name="Dr_Sharma_Prescription_Aug2026.pdf",
                file_size=142000,
                mime_type="application/pdf",
                ocr_status=models.OCRStatus.COMPLETED
            )
            db.add(doc1)
            db.flush()
        ext1 = db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == doc1.id).first()
        if not ext1:
            db.add(models.DocumentExtraction(
                document_id=doc1.id,
                extracted_text="Rx\nSMS Hospital OPD - Dr. Sharma\nPatient: Rajesh Kumar (42M)\nDiagnosis: Type 2 Diabetes Mellitus, Mild Gastritis\n\n1. Tab Metformin 500mg - 1 Tab BD after food (30 days)\n2. Tab Telmisartan 40mg - 1 Tab OD morning (30 days)\n3. Cap Pantoprazole 40mg - 1 Cap OD before breakfast (15 days)\n\nLab Advised: Fasting Blood Sugar, HbA1c, Serum Creatinine",
                extracted_data={
                    "diagnoses": ["Type 2 Diabetes Mellitus", "Acute Gastritis / Acid Peptic Disease"],
                    "medications": [
                        {"name": "Metformin", "dose": "500MG", "dosage": "500MG", "frequency": "1-0-1", "duration": "30 days"},
                        {"name": "Telmisartan", "dose": "40MG", "dosage": "40MG", "frequency": "1-0-0", "duration": "30 days"},
                        {"name": "Pantoprazole", "dose": "40MG", "dosage": "40MG", "frequency": "1-0-0 (OD Before Breakfast)", "duration": "15 days"},
                    ],
                    "lab_values": [
                        {"test": "Fasting Blood Sugar", "value": "128", "unit": "mg/dL", "ref_range": "70 - 100", "is_abnormal": True},
                        {"test": "Glycated Hemoglobin (HbA1c)", "value": "7.1", "unit": "%", "ref_range": "< 5.7", "is_abnormal": True},
                        {"test": "Serum Creatinine", "value": "0.95", "unit": "mg/dL", "ref_range": "0.6 - 1.2", "is_abnormal": False},
                    ],
                    "procedures": [],
                    "dates": ["2026-08-15"],
                    "doctors": ["Dr. Sharma"]
                },
                confidence_score=0.92
            ))

    # 8. Restore Consultations & OPD Queue
    # 8a. Aarav Sharma: c0 (Fresh Consultation - Ready for Review / Intake, 0 messages)
    aarav_cons = [c for c in demo_consultations if aarav_pat and c.patient_id == aarav_pat.id]
    c0 = aarav_cons[0] if aarav_cons else None
    if not c0 and aarav_pat:
        c0 = models.Consultation(
            patient_id=aarav_pat.id,
            hospital_id=first_hosp.id if first_hosp else None,
            doctor_id=sneha_doc.id if sneha_doc else None,
            chief_complaint=None,
            priority=models.Priority.NORMAL,
            status=models.ConsultationStatus.READY,
            created_at=datetime.utcnow()
        )
        db.add(c0)
        db.flush()
    elif c0:
        c0.doctor_id = sneha_doc.id if sneha_doc else None
        c0.hospital_id = first_hosp.id if first_hosp else None
        c0.status = models.ConsultationStatus.READY
        c0.priority = models.Priority.NORMAL
        c0.chief_complaint = None
        c0.completed_at = None
        c0.created_at = datetime.utcnow()

    # Clear any extra consultations for Aarav
    if len(aarav_cons) > 1:
        for c in aarav_cons[1:]:
            db.delete(c)

    # For c0: clear any ConversationSessions, messages, clinical history (AI interview resets fresh)
    if c0:
        c0_sessions = db.query(models.ConversationSession).filter(models.ConversationSession.consultation_id == c0.id).all()
        for s in c0_sessions:
            db.query(models.ConversationMessage).filter(models.ConversationMessage.session_id == s.id).delete(synchronize_session=False)
            db.delete(s)
        db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == c0.id).delete(synchronize_session=False)
        db.query(models.AyurvedicHistory).filter(models.AyurvedicHistory.consultation_id == c0.id).delete(synchronize_session=False)
        db.query(models.Symptom).filter(models.Symptom.consultation_id == c0.id).delete(synchronize_session=False)
        if aarav_pat:
            doc0 = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == aarav_pat.id, models.MedicalDocument.file_name == "Emergency_Cardiology_Intake_Aarav.pdf").first()
            if doc0:
                doc0.consultation_id = c0.id

    # 8b. Rajesh Kumar: c1 (Abdominal Pain, READY in OPD Queue)
    rajesh_cons = [c for c in demo_consultations if rajesh_pat and c.patient_id == rajesh_pat.id]
    c1 = rajesh_cons[0] if rajesh_cons else None
    if not c1 and rajesh_pat:
        c1 = models.Consultation(
            patient_id=rajesh_pat.id,
            hospital_id=first_hosp.id if first_hosp else None,
            chief_complaint="Severe stomach pain in lower right abdomen since morning",
            priority=models.Priority.HIGH,
            status=models.ConsultationStatus.READY,
            created_at=datetime.utcnow()
        )
        db.add(c1)
        db.flush()
    elif c1:
        c1.hospital_id = first_hosp.id if first_hosp else None
        c1.chief_complaint = "Severe stomach pain in lower right abdomen since morning"
        c1.priority = models.Priority.HIGH
        c1.status = models.ConsultationStatus.READY
    if len(rajesh_cons) > 1:
        for c in rajesh_cons[1:]:
            db.delete(c)

    if c1 and rajesh_pat:
        doc1 = db.query(models.MedicalDocument).filter(models.MedicalDocument.patient_id == rajesh_pat.id, models.MedicalDocument.file_name == "Dr_Sharma_Prescription_Aug2026.pdf").first()
        if doc1:
            doc1.consultation_id = c1.id
        sess1 = db.query(models.ConversationSession).filter(models.ConversationSession.consultation_id == c1.id).first()
        if not sess1:
            sess1 = models.ConversationSession(consultation_id=c1.id, state="COMPLETE", language_code="hi")
            db.add(sess1)
            db.flush()
            db.add_all([
                models.ConversationMessage(session_id=sess1.id, role=models.RoleType.AI, content="आज आप अस्पताल किस कारण से आए हैं?", question_state="CHIEF_COMPLAINT"),
                models.ConversationMessage(session_id=sess1.id, role=models.RoleType.PATIENT, content="सुबह से पेट के निचले दाएं हिस्से में बहुत तेज दर्द हो रहा है", original_language="hi", translated_content="Since morning there is very severe pain in the lower right part of my stomach", question_state="CHIEF_COMPLAINT"),
                models.ConversationMessage(session_id=sess1.id, role=models.RoleType.AI, content="यह दर्द कैसा महसूस होता है — तेज़ चुभन, हल्का भारीपन या जलन?", question_state="HPI_CHARACTER"),
                models.ConversationMessage(session_id=sess1.id, role=models.RoleType.PATIENT, content="तेज चुभने वाला दर्द है और जी मिचला रहा है", original_language="hi", translated_content="It is sharp stabbing pain and I feel nauseous", question_state="HPI_CHARACTER"),
            ])
        hist1 = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.consultation_id == c1.id).first()
        if not hist1:
            db.add(models.ClinicalHistory(
                consultation_id=c1.id, 
                chief_complaint="Severe stomach pain in lower right abdomen since morning",
                hpi="Acute onset sharp pain localized to right iliac fossa (RLQ) starting 4 hours ago. Severity 8/10. Aggravated by movement and palpation. Associated with moderate nausea without active vomiting.",
                past_medical="Type 2 Diabetes Mellitus (3 yrs), controlled on Metformin; Essential Hypertension",
                past_surgical="Laparoscopic Appendectomy in 2018",
                drug_history="Metformin 500mg BD, Telmisartan 40mg OD",
                allergy_history="Penicillin (urticarial rash)",
                family_history="Father had CAD; Mother has hypertension",
                personal_history="Non-smoker, vegetarian diet, regular walks",
                review_of_systems="No fever, no diarrhea, no hematuria",
                ayurvedic_history={"prakriti": "Pitta-Vata", "agni": "Tikshna (Intense)", "koshta": "Madhyama (Regular)"},
                red_flags=[],
                ai_generated=True,
                doctor_verified=False
            ))

    # 8c. Priya Sharma: c2 (Migraine Headache)
    priya_cons = [c for c in demo_consultations if priya_pat and c.patient_id == priya_pat.id]
    c2 = priya_cons[0] if priya_cons else None
    if not c2 and priya_pat:
        c2 = models.Consultation(
            patient_id=priya_pat.id,
            hospital_id=first_hosp.id if first_hosp else None,
            chief_complaint="Throbbing hemicranial headache with photophobia",
            priority=models.Priority.NORMAL,
            status=models.ConsultationStatus.READY,
            created_at=datetime.utcnow()
        )
        db.add(c2)
        db.flush()
    elif c2:
        c2.hospital_id = first_hosp.id if first_hosp else None
        c2.chief_complaint = "Throbbing hemicranial headache with photophobia"
        c2.priority = models.Priority.NORMAL
        c2.status = models.ConsultationStatus.READY
    if len(priya_cons) > 1:
        for c in priya_cons[1:]:
            db.delete(c)

    # 8d. Anand Patel: c3 (Emergency Scenario with chest pain)
    anand_cons = [c for c in demo_consultations if anand_pat and c.patient_id == anand_pat.id]
    c3 = anand_cons[0] if anand_cons else None
    hosp_second = h_objs[1] if len(h_objs) > 1 else first_hosp
    if not c3 and anand_pat:
        c3 = models.Consultation(
            patient_id=anand_pat.id,
            hospital_id=hosp_second.id if hosp_second else None,
            chief_complaint="Chest tightness and sweating",
            priority=models.Priority.CRITICAL,
            status=models.ConsultationStatus.EMERGENCY,
            created_at=datetime.utcnow()
        )
        db.add(c3)
        db.flush()
    elif c3:
        c3.hospital_id = hosp_second.id if hosp_second else None
        c3.chief_complaint = "Chest tightness and sweating"
        c3.priority = models.Priority.CRITICAL
        c3.status = models.ConsultationStatus.EMERGENCY
    if len(anand_cons) > 1:
        for c in anand_cons[1:]:
            db.delete(c)

    # Restore Anand's emergency alert
    if anand_pat and c3:
        db.query(models.EmergencyAlert).filter(models.EmergencyAlert.patient_id == anand_pat.id).delete(synchronize_session=False)
        db.add(models.EmergencyAlert(
            patient_id=anand_pat.id,
            consultation_id=c3.id,
            red_flags=[{"keyword": "chest pain", "category": "chest_pain", "severity": "CRITICAL"}],
            priority=models.Priority.CRITICAL
        ))

    # 8e. Delete any stray demo consultations not belonging to baseline c0, c1, c2, c3
    kept_cids = {c.id for c in [c0, c1, c2, c3] if c is not None}
    stray_cons = db.query(models.Consultation).filter(
        models.Consultation.patient_id.in_(demo_patient_ids),
        ~models.Consultation.id.in_(kept_cids)
    ).all()
    for sc in stray_cons:
        db.delete(sc)

    db.commit()

if __name__ == "__main__":
    seed(force=True)
