# MediKiosk 🏥

> **AI-Powered Smart Hospital Kiosk — Built for Smart India Hackathon (SIH) 2026**

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange?style=flat-square&logo=india)](https://www.sih.gov.in/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&style=flat-square)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&style=flat-square)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&style=flat-square)](https://typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&style=flat-square)](https://python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://medi-kiosk-eight.vercel.app)
[![Render](https://img.shields.io/badge/API%20on-Render-46E3B7?style=flat-square&logo=render)](https://medikiosk-afm2.onrender.com)

## 🌐 Live Demo

| | Link |
|---|---|
| 🖥️ **Frontend (Vercel)** | [medi-kiosk-eight.vercel.app](https://medi-kiosk-eight.vercel.app) |
| ⚙️ **Backend API (Render)** | [medikiosk-afm2.onrender.com](https://medikiosk-afm2.onrender.com) |
| 📖 **API Docs** | [medikiosk-afm2.onrender.com/docs](https://medikiosk-afm2.onrender.com/docs) |

> [!NOTE]
> The backend runs on Render's free tier — the first request after 15 minutes of inactivity may take ~30 seconds to wake up.

---

## 🏆 Smart India Hackathon 2026

MediKiosk was built as a submission for **Smart India Hackathon (SIH) 2026**, India's largest national-level hackathon organised by the Ministry of Education's Innovation Cell. The project addresses the problem of long waiting times, language barriers, and inefficient clinical intake in public hospitals across India.

**Problem Statement Category:** Healthcare & Biomedical Devices  
**Theme:** Transforming Patient Experience in Government Hospitals using AI

---

## 🎯 What Is MediKiosk?

MediKiosk is a multilingual, AI-powered hospital kiosk platform that digitises the clinical intake process before a patient meets a doctor. It combines:

- 🤖 **AI Clinical Interview** — A structured 15-question health survey in 10 Indian languages
- 🚑 **Ambulance Management** — Real-time OSRM road-route ambulance dispatch with live tracking
- 👨‍⚕️ **Doctor Dashboard** — Live patient queue, AI-generated clinical summaries, and case management
- 📍 **Nearby Care** — Find hospitals and route to them using real road routing
- 📋 **Clinical History** — Automatic summarisation of patient answers into structured medical records

---

## 🌐 Supported Languages

| Code | Language   |
|------|------------|
| `hi` | हिन्दी (Hindi) |
| `en` | English    |
| `mr` | मराठी (Marathi) |
| `bn` | বাংলা (Bengali) |
| `ta` | தமிழ் (Tamil) |
| `te` | తెలుగు (Telugu) |
| `gu` | ગુજરાતી (Gujarati) |
| `kn` | ಕನ್ನಡ (Kannada) |
| `ml` | മലയാളം (Malayalam) |
| `pa` | ਪੰਜਾਬੀ (Punjabi) |

All 15 clinical intake questions translate **instantly offline** using a curated medical dictionary. Live translation via Bhashini API when configured.

---

## 🏗️ Architecture

```
medikiosk/
├── frontend/          # React 18 + TypeScript + TailwindCSS + Vite
│   └── src/
│       ├── pages/     # Patient, Doctor, Driver, Admin portals
│       ├── components/
│       └── api/
├── backend/           # FastAPI + SQLAlchemy + SQLite
│   ├── api/           # REST endpoints
│   ├── services/      # AI engine, translation, clinical summary
│   └── models.py
└── docker-compose.yml
```

---

## ✨ Key Features

### 🩺 AI Clinical Intake
- Strict 15-question interview in exact medical sequence (Chief Complaint → Confirmation)
- Progress slider locked to `question_index / 15` — never drifts from message count or timers
- Follow-up questions (chest radiation, medication details) don't advance the main progress
- Answers feed into structured `ClinicalHistory` visible to the doctor
- Red-flag detection triggers emergency alerts automatically

### 🚑 Ambulance System
- Real-time OSRM road-route navigation (same engine as Nearby Care)
- Live ambulance GPS simulation on a Leaflet map
- Configurable hospital destinations with government priority routing
- Full driver-side accept/reject and status flow

### 👨‍⚕️ Doctor Portal
- Live queue with AI-generated clinical summaries
- Verify / edit AI summaries before consultation
- Emergency alert acknowledgement
- Patient timeline and medical documents

### 🔐 Role-Based Access Control
- `PATIENT` · `DOCTOR` · `STAFF` · `DRIVER` · `ADMIN`
- JWT authentication with facility-scoped RBAC

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- (Optional) Docker & Docker Compose

### 1. Clone
```bash
git clone https://github.com/divyamc1803/MediKiosk.git
cd MediKiosk
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed_demo.py        # seeds demo accounts
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # → http://localhost:5173
```

### 4. Docker (one-command)
```bash
docker-compose up --build
```

---

## 🎭 Demo Accounts

| Role    | Email               | Password  |
|---------|---------------------|-----------|
| Patient | `aarav@demo.com`    | `demo123` |
| Doctor  | `sneha@demo.com`    | `demo123` |
| Driver  | `driver@demo.com`   | `demo123` |
| Admin   | `admin@demo.com`    | `demo123` |

---

## 🔑 Environment Variables (Optional)

| Variable                          | Description                        |
|-----------------------------------|------------------------------------|
| `BHASHINI_API_KEY`               | Bhashini live translation API key  |
| `BHASHINI_TRANSLATION_SERVICE_ID`| Bhashini service ID                |
| `SECRET_KEY`                      | JWT signing secret                 |

The app runs **fully offline** without Bhashini credentials using a built-in curated clinical translation dictionary.

---

## 🧪 Running Tests

```bash
# Backend API verification
cd backend
python scratch/verify_intake_direct.py

# Frontend type-check
cd frontend
npx tsc --noEmit
```

---

## 📸 Screenshots

> *Clinical Intake — Question 6 of 15 in Hindi, progress 40%*
> *Doctor Dashboard — AI clinical summary ready for review*
> *Ambulance Demo — Real-time OSRM road routing*

---

## 🤝 Team

Built with ❤️ for **Smart India Hackathon 2026** by **Team MediKiosk**.

| Member | GitHub |
|---|---|
| Divyam Choudhary | [@divyamc1803](https://github.com/divyamc1803) |
| Aditya Bathla | [@Aditya-bathla](https://github.com/Aditya-bathla) |

---

## 📄 License

MIT © 2026 Team MediKiosk
