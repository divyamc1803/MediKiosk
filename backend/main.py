import os
from dotenv import load_dotenv

# Load .env before importing routers/services that initialize providers.
load_dotenv()

import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database import create_all_tables, ensure_legacy_columns
from seed_data import seed
from api import auth, patients, consultations, conversations, documents, ambulance, doctors, admin, notifications, clinical_chat

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("medikiosk")

app = FastAPI(title="MediKiosk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"--> {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(f"<-- {request.method} {request.url.path} {response.status_code} ({process_time:.1f}ms)")
        return response
    except Exception as exc:
        logger.error(f"xx- {request.method} {request.url.path} exception: {exc}", exc_info=True)
        raise exc

# Include all routers
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(consultations.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(ambulance.router, prefix="/api")
app.include_router(doctors.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(clinical_chat.router, prefix="/api")

@app.on_event("startup")
def on_startup():
    print("Creating tables...")
    create_all_tables()
    ensure_legacy_columns()
    
    if os.getenv("DEMO_MODE", "true").lower() == "true":
        print("Running seed data...")
        seed()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
