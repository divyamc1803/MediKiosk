from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import shutil
import models
import schemas
import auth
from database import get_db
from services.ocr_provider import ocr_provider
from services.document_extractor import document_extractor

router = APIRouter(prefix="/documents", tags=["documents"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    patient_id: str = Form(...),
    document_type: str = Form(...),
    consultation_id: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    doc = models.MedicalDocument(
        patient_id=patient_id,
        consultation_id=consultation_id,
        document_type=document_type,
        file_path=file_location,
        file_name=file.filename,
        file_size=os.path.getsize(file_location),
        mime_type=file.content_type or "application/octet-stream",
        ocr_status=models.OCRStatus.PENDING
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/{id}/process", response_model=schemas.ExtractionResponse)
def process_document(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.MedicalDocument).filter(models.MedicalDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.ocr_status = models.OCRStatus.PROCESSING
    db.commit()
    
    # 1. OCR
    text = ocr_provider.extract_text(doc.file_path, doc.document_type)
    
    # 2. Extract
    extracted = document_extractor.extract(text, doc.document_type)
    
    ext_record = models.DocumentExtraction(
        document_id=doc.id,
        extracted_text=text,
        extracted_data=extracted,
        confidence_score=extracted.get("confidence_score")
    )
    db.add(ext_record)

    # Persist extracted medications to Medication model for the patient
    meds = extracted.get("medications", [])
    for m in meds:
        m_name = m.get("name")
        if m_name:
            existing_med = db.query(models.Medication).filter(
                models.Medication.patient_id == doc.patient_id,
                models.Medication.name == m_name
            ).first()
            if not existing_med:
                db.add(models.Medication(
                    patient_id=doc.patient_id,
                    name=m_name,
                    dosage=m.get("dose") or m.get("dosage"),
                    frequency=m.get("frequency"),
                    is_active=True,
                    source="DOCUMENT_EXTRACTED"
                ))
    
    doc.ocr_status = models.OCRStatus.COMPLETED
    db.commit()
    db.refresh(ext_record)
    
    return ext_record

@router.get("/{id}", response_model=schemas.DocumentResponse)
def get_document(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.MedicalDocument).filter(models.MedicalDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{id}/extraction", response_model=schemas.ExtractionResponse)
def get_extraction(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    ext = db.query(models.DocumentExtraction).filter(models.DocumentExtraction.document_id == id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return ext
