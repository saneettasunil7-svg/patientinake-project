from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models, auth, doctor_schemas
import shutil
import os
from datetime import datetime

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = "uploads/profiles"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    extension = os.path.splitext(file.filename)[1]
    filename = f"profile_{current_user.id}_{timestamp}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user model
    current_user.profile_photo = f"/static/profiles/{filename}"
    
    # Update associated profile
    if current_user.role == "patient":
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == current_user.id).first()
        if profile:
            profile.profile_photo = current_user.profile_photo
    elif current_user.role == "doctor":
        profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == current_user.id).first()
        if profile:
            profile.profile_photo = current_user.profile_photo
            
    db.commit()
    db.refresh(current_user)
    
    return {"profile_photo": current_user.profile_photo}

@router.get("/me")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "profile_photo": current_user.profile_photo
    }
    
    if current_user.role == "patient":
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == current_user.id).first()
        if profile:
            profile_data.update({
                "full_name": profile.full_name,
                "gender": profile.gender,
                "blood_group": profile.blood_group,
                "phone_number": profile.phone_number,
                "date_of_birth": profile.date_of_birth,
                "medical_history_summary": profile.medical_history_summary,
            })
    elif current_user.role == "doctor":
        profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == current_user.id).first()
        if profile:
            profile_data.update({
                "full_name": profile.full_name,
                "specialization": profile.specialization,
                "upi_id": profile.upi_id,
                "bank_name": profile.bank_name,
                "account_number": profile.account_number,
                "ifsc_code": profile.ifsc_code
            })
            
    return profile_data

@router.put("/me")
async def update_my_profile(
    update_data: doctor_schemas.DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role == "doctor":
        profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        
        # Update fields if provided
        if update_data.full_name is not None: profile.full_name = update_data.full_name
        if update_data.specialization is not None: profile.specialization = update_data.specialization
        if update_data.bio is not None: profile.bio = update_data.bio
        if update_data.phone_number is not None: profile.phone_number = update_data.phone_number
        if update_data.upi_id is not None: profile.upi_id = update_data.upi_id
        if update_data.bank_name is not None: profile.bank_name = update_data.bank_name
        if update_data.branch_name is not None: profile.branch_name = update_data.branch_name
        if update_data.account_number is not None: profile.account_number = update_data.account_number
        if update_data.ifsc_code is not None: profile.ifsc_code = update_data.ifsc_code
        
        db.commit()
        db.refresh(profile)
        return profile
    
    elif current_user.role == "patient":
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        
        # Update all patient profile fields if provided
        if update_data.full_name is not None: profile.full_name = update_data.full_name
        if update_data.phone_number is not None: profile.phone_number = update_data.phone_number
        if getattr(update_data, 'gender', None) is not None: profile.gender = update_data.gender
        if getattr(update_data, 'blood_group', None) is not None: profile.blood_group = update_data.blood_group
        if getattr(update_data, 'date_of_birth', None) is not None: profile.date_of_birth = update_data.date_of_birth
        if getattr(update_data, 'medical_history_summary', None) is not None: profile.medical_history_summary = update_data.medical_history_summary
        
        db.commit()
        db.refresh(profile)
        return profile
    
    else:
        raise HTTPException(status_code=400, detail="Profile updates not supported for this role")
