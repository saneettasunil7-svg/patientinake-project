from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, auth
import shutil
import os
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail=f"Only patients can upload documents. You are {current_user.email} with role '{current_user.role}'")
    
    # Generate unique filename to avoid collisions
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{current_user.id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_doc = models.Document(
        patient_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        upload_date=datetime.now().isoformat()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    return {"id": new_doc.id, "filename": new_doc.filename, "upload_date": new_doc.upload_date}

@router.get("/")
async def get_my_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their documents")
        
    docs = db.query(models.Document).filter(models.Document.patient_id == current_user.id).all()
    return docs

@router.get("/patient/{patient_id}")
async def get_patient_documents(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view patient documents")
        
    docs = db.query(models.Document).filter(models.Document.patient_id == patient_id).all()
    return docs

@router.get("/download/{doc_id}")
async def download_document_url(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # In a real app, this would generate a presigned URL or serve the file
    # For now, we'll just check permission and return the path (assuming static serve setup in main)
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.patient_id != current_user.id and current_user.role != "doctor":
         raise HTTPException(status_code=403, detail="Access denied")
         
    return {"url": f"/static/{os.path.basename(doc.file_path)}"}

from pydantic import BaseModel

class DocumentRenameRequest(BaseModel):
    new_filename: str

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can delete their documents")
        
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Delete file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted"}

@router.put("/{doc_id}")
async def rename_document(
    doc_id: int,
    req: DocumentRenameRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can rename documents")
        
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    doc.filename = req.new_filename
    db.commit()
    db.refresh(doc)
    
    return {"id": doc.id, "filename": doc.filename, "upload_date": doc.upload_date}

