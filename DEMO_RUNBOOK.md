# MediKiosk – Final Demo Runbook

## Jaipur emergency demo

1. Start the FastAPI backend from `backend/` on port 8000.
2. Start the Vite frontend from `frontend/`.
3. Open `/demo`.
4. Open the Patient, Driver and Hospital demo accounts in separate tabs/windows.
5. Patient: open **Ambulance**, choose/drag the Jaipur pickup pin, choose a hospital and request the ALS ambulance.
6. Driver: accept the incoming **AMB-104 / Raj Kumar** dispatch.
7. DriverTrip automatically starts the pickup simulation after **Start Route to Patient** (or use **Simulate GPS Movement**).
8. Watch the same ambulance location update on the patient, driver and hospital maps without refreshing.
9. At pickup, mark the patient picked up. Start the hospital leg and watch the same live movement again.
10. Complete the trip.

## AI case-taking demo

1. Login as Aarav Sharma.
2. Start the clinical intake.
3. Answer the questions naturally. Internal state names such as `HPI_ONSET` are not shown to the patient.
4. Each answer is stored with the clinical state and accumulated in the conversation session.
5. Finish the interview. A structured Clinical History is generated from the stored answers.
6. The app opens the Patient Profile, where the recorded clinical history, Ayurvedic information, medicines, allergies, documents and consultation history are displayed.

## Backend schema note

The backend performs a small SQLite compatibility migration at startup for the new conversation fields. No destructive database reset is required.

## New demo features
- Patient login opens the welcome/health-report flow; incomplete mandatory profile details open onboarding.
- ABHA ID, age, DOB, emergency contact, ambulance consent and medical-care consent are required.
- Survey questions adapt to common symptom groups and store structured memory.
- Optional Bhashini translation is configured through `.env`.
- Emergency shortcut dispatches only government-hospital ambulances and requires both consents.
- Ambulance movement uses OSRM driving routes when reachable, with an offline curved-road fallback, and the demo is accelerated.
- Doctor queue refreshes every 3 seconds; doctor/patient consultation chat polls every 2 seconds.
- A 7-day patient follow-up reminder is created after survey completion.
- Admin has user enable/disable, ambulance availability, analytics and audit tabs.
