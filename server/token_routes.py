from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from typing import List
from database import get_db
import models, token_schemas, auth, appointment_models
from datetime import datetime, date
from fastapi import File, UploadFile
import os
import shutil

router = APIRouter(prefix="/tokens", tags=["tokens"])

@router.put("/{token_id}/pay")
async def pay_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    token_obj = db.query(appointment_models.Token).filter(appointment_models.Token.id == token_id).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Token not found")
        
    if token_obj.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this token")

    token_obj.payment_status = "completed"
    # Ensure payment_amount is correctly set (e.g., 300)
    token_obj.payment_amount = 300
    db.commit()
    db.refresh(token_obj)
    
    # Send confirmation email
    try:
        from email_service import send_payment_confirmation_email
        patient_name = "Patient"
        phone_number = "Unknown"
        if current_user.patient_profile:
            patient_name = current_user.patient_profile.full_name
            phone_number = current_user.patient_profile.phone_number or "Unknown"

        # Fetch Doctor Details for the receipt
        doctor_user = db.query(models.User).filter(models.User.id == token_obj.doctor_id).first()
        doctor_name = "Doctor"
        if doctor_user and doctor_user.doctor_profile:
            doctor_name = doctor_user.doctor_profile.full_name
            
        import datetime
        date_str = token_obj.appointment_date.strftime("%d %b %Y") if token_obj.appointment_date else datetime.datetime.now().strftime("%d %b %Y")
            
        send_payment_confirmation_email(
            patient_email=current_user.email,
            patient_name=patient_name,
            doctor_name=doctor_name,
            amount=token_obj.payment_amount,
            token_number=token_obj.token_number,
            date_str=date_str
        )

        # Notify the Doctor
        payment_notification = models.Notification(
            user_id=token_obj.doctor_id,
            title="Payment Received",
            message=f"This patient ({patient_name}) payment completed. Amount: ₹{token_obj.payment_amount}",
            notif_type="alert",
            created_at=datetime.datetime.now().isoformat()
        )
        db.add(payment_notification)
        db.commit()

        # Simulate WhatsApp Auto-Send
        whatsapp_msg = f"""
[WhatsApp Sent to {phone_number}]
=================================
MediConnect Automated Receipt
---------------------------------
Hello {patient_name},
Payment Successful for Token #{token_obj.token_number}.
Amount: Rs. {token_obj.payment_amount}
Doctor: Dr. {doctor_name}
Date: {date_str}

You may now join the video session from the receipt page.
=================================
"""
        print(whatsapp_msg)
    except Exception as e:
        print(f"Error triggering payment email/whatsapp/notification: {e}")
    
    return {"message": "Payment successful", "payment_status": token_obj.payment_status}

@router.get("/{token_id}/receipt", response_model=token_schemas.TokenReceiptResponse)
async def get_token_receipt(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    token_obj = db.query(appointment_models.Token).filter(appointment_models.Token.id == token_id).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Token not found")
        
    if current_user.role == "patient" and token_obj.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this receipt")
        
    patient = db.query(models.User).filter(models.User.id == token_obj.patient_id).first()
    patient_profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == token_obj.patient_id).first()
    
    doctor_profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == token_obj.doctor_id).first()
    
    return token_schemas.TokenReceiptResponse(
        id=token_obj.id,
        token_number=token_obj.token_number,
        patient_name=patient_profile.full_name if patient_profile and patient_profile.full_name else "Patient",
        patient_email=patient.email if patient and patient.email else "unknown",
        doctor_name=doctor_profile.full_name if doctor_profile and doctor_profile.full_name else "Doctor",
        doctor_specialization=doctor_profile.specialization if doctor_profile and doctor_profile.specialization else "Specialist",
        status=token_obj.status,
        payment_status=token_obj.payment_status,
        payment_amount=token_obj.payment_amount,
        created_at=token_obj.created_at
    )

@router.post("/", response_model=token_schemas.TokenResponse)
async def create_token(
    token_create: token_schemas.TokenCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Validating role - handling both Enum objects and string storage
    raw_role = current_user.role
    if hasattr(raw_role, 'value'):
        role_str = str(raw_role.value)
    else:
        role_str = str(raw_role)
    
    # Normalize to handle "UserRole.patient" or just "patient"
    role_str = role_str.replace("UserRole.", "").lower().strip()

    if role_str != "patient":
        print(f"DEBUG: Role check failed. User: {current_user.email}, Role: {current_user.role}, Parsed: {role_str}")
        raise HTTPException(status_code=403, detail=f"Only patients can request tokens (your role is: {role_str})")
    
    # Check if doctor exists and is available
    doctor = db.query(models.User).filter(
        models.User.id == token_create.doctor_id,
        models.User.role == "doctor",
        models.User.is_active == True
    ).first()
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    if doctor.role != "doctor":
        raise HTTPException(status_code=400, detail="The selected user is not a doctor")

    # 1. GLOBAL AVAILABILITY CHECK (Unavailable Days)
    availability = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == token_create.doctor_id
    ).first()

    today_weekday = datetime.now().weekday() # 0 = Monday, 6 = Sunday
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    if availability:
        if availability.unavailable_days and today_weekday in availability.unavailable_days:
             raise HTTPException(status_code=400, detail="Doctor is not available today (Day Setting)")
        if availability.unavailable_dates and today_str in availability.unavailable_dates:
             raise HTTPException(status_code=400, detail="Doctor is not available today (Specific Date)")

    # 2. SLOT VALIDATION
    current_time = datetime.now().time()
    
    # Get active slots for today
    active_slot = db.query(appointment_models.DoctorSchedule).filter(
        appointment_models.DoctorSchedule.doctor_id == token_create.doctor_id,
        appointment_models.DoctorSchedule.day_of_week == today_weekday,
        appointment_models.DoctorSchedule.is_active == True,
        appointment_models.DoctorSchedule.start_time <= current_time,
        appointment_models.DoctorSchedule.end_time > current_time
    ).first()

    # If no slot, we only allow token creation if the doctor has manually enabled availability
    manual_available = availability.is_available if availability else False
    if not active_slot and not manual_available:
        # Check if there are ANY slots today to give a better error message
        any_slots_today = db.query(appointment_models.DoctorSchedule).filter(
            appointment_models.DoctorSchedule.doctor_id == token_create.doctor_id,
            appointment_models.DoctorSchedule.day_of_week == today_weekday,
            appointment_models.DoctorSchedule.is_active == True
        ).first()
        
        if any_slots_today:
             raise HTTPException(status_code=400, detail="Doctor is not currently in a valid time slot. Please check the schedule.")
        else:
             raise HTTPException(status_code=400, detail="Doctor has no available slots for today.")
    
    # Get today's date range for daily reset
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    # Check if patient already has a waiting token for this doctor TODAY
    existing_token = db.query(appointment_models.Token).filter(
        appointment_models.Token.patient_id == current_user.id,
        appointment_models.Token.doctor_id == token_create.doctor_id,
        appointment_models.Token.status.in_(["waiting", "called", "in_progress"]),
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).first()
    
    if existing_token:
        raise HTTPException(status_code=400, detail="You already have an active token for this doctor today")
        
    # Check if doctor has reached the daily limit of 10 tokens
    daily_token_count = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == token_create.doctor_id,
        appointment_models.Token.status.notin_(["cancelled"]),
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).count()
    
    if daily_token_count >= 10:
        raise HTTPException(status_code=400, detail="no available time slot")
    
    # ATOMIC: Get next token number for this doctor TODAY with row-level locking
    # SELECT FOR UPDATE prevents race conditions when multiple patients request tokens simultaneously
    last_token = db.query(func.max(appointment_models.Token.token_number)).filter(
        appointment_models.Token.doctor_id == token_create.doctor_id,
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).scalar()
    
    next_token_number = (last_token or 0) + 1
    
    # Create token
    new_token = appointment_models.Token(
        patient_id=current_user.id,
        doctor_id=token_create.doctor_id,
        token_number=next_token_number,
        status="waiting",
        is_emergency=False,
        reason_for_visit=token_create.reason_for_visit,
        slot_id=active_slot.id if active_slot else None # Link to the specific slot if available
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    return new_token

@router.post("/{token_id}/voice-reason")
async def upload_voice_reason(
    token_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    token_obj = db.query(appointment_models.Token).filter(appointment_models.Token.id == token_id).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Token not found")
        
    if token_obj.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload for this token")

    # Create directory if not exists
    upload_dir = os.path.join(os.getcwd(), "uploads", "voice_reasons")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "webm"
    file_path = os.path.join(upload_dir, f"token_{token_id}.{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    token_obj.voice_reason_path = file_path
    db.commit()
    
    return {"message": "Voice reason uploaded", "path": file_path}

@router.post("/emergency", response_model=token_schemas.TokenResponse)
async def create_emergency_token(
    request: token_schemas.EmergencyTokenRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can request emergency tokens")
    
    # Relax any_available check for SOS calls to ensure 24/7 "availability" 
    # Even if doctors aren't 'available' in their specific schedule, 
    # an SOS should still be created and alert all active doctor sessions.
    # We'll just check if there are ANY doctors in the system.
    any_doctors = db.query(models.User).filter(models.User.role == "doctor").count() > 0
    
    if not any_doctors:
        raise HTTPException(status_code=503, detail="Emergency services are temporarily unavailable. Please contact local emergency services immediately.")
    
    # 2. Create the emergency token with NO assigned doctor
    new_token = appointment_models.Token(
        patient_id=current_user.id,
        doctor_id=None,
        token_number=0,
        status="waiting",
        is_emergency=True,
        reason_for_visit=request.reason
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    return new_token

@router.put("/{token_id}/accept-emergency", response_model=token_schemas.TokenResponse)
async def accept_emergency_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can accept emergency tokens")
        
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == token_id,
        appointment_models.Token.is_emergency == True,
        appointment_models.Token.status == "waiting",
        appointment_models.Token.doctor_id == None
    ).with_for_update().first() # Atomic lock
    
    if not token:
        raise HTTPException(status_code=404, detail="Emergency token not found or already accepted")
        
    # Get today's max token number for this doctor to assign a real number
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    last_token = db.query(func.max(appointment_models.Token.token_number)).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).scalar() or 0
        
    token.doctor_id = current_user.id
    token.token_number = last_token + 1
    token.status = "in_progress"
    token.called_at = datetime.utcnow()
    
    db.commit()
    db.refresh(token)
    
    # Manually populate doctor info for the response schema
    profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == current_user.id).first()
    token.doctor_name = profile.full_name if profile else "Doctor"
    token.doctor_specialization = profile.specialization if profile else "General"
    
    return token

@router.get("/queue/{doctor_id}", response_model=List[token_schemas.TokenQueueResponse])
async def get_queue(
    doctor_id: int,
    include_unassigned_emergencies: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    current_doctor_profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == doctor_id).first()
    is_emergency_doc = current_doctor_profile and current_doctor_profile.specialization and "emergency" in current_doctor_profile.specialization.lower()

    # Check if ANY emergency doctors are online
    any_er_online = db.query(appointment_models.DoctorAvailability).join(
        models.DoctorProfile, appointment_models.DoctorAvailability.doctor_id == models.DoctorProfile.user_id
    ).filter(
        appointment_models.DoctorAvailability.is_available == True,
        models.DoctorProfile.specialization.ilike("%emergency%")
    ).count() > 0

    include_unassigned_emergencies = is_emergency_doc or not any_er_online

    if include_unassigned_emergencies:
        tokens = db.query(appointment_models.Token).filter(
            or_(
                and_(
                    appointment_models.Token.doctor_id == doctor_id,
                    appointment_models.Token.status.in_(["waiting", "called", "in_progress"])
                ),
                and_(
                    appointment_models.Token.doctor_id == None,
                    appointment_models.Token.is_emergency == True,
                    appointment_models.Token.status == "waiting"
                )
            )
        ).order_by(appointment_models.Token.created_at).all()
    else:
        tokens = db.query(appointment_models.Token).filter(
            appointment_models.Token.doctor_id == doctor_id,
            appointment_models.Token.status.in_(["waiting", "called", "in_progress"])
        ).order_by(appointment_models.Token.created_at).all()
    
    result = []
    for token in tokens:
        patient = db.query(models.User).filter(models.User.id == token.patient_id).first()
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == token.patient_id
        ).first()
        
        waiting_time = int((datetime.now() - token.created_at).total_seconds() / 60)
        
        voice_url = None
        if token.voice_reason_path:
            voice_url = f"/static/voice_reasons/{os.path.basename(token.voice_reason_path)}"

        # Fetch document count
        doc_count = db.query(models.Document).filter(models.Document.patient_id == token.patient_id).count()

        # Fetch most recent appointment notes
        appt = db.query(appointment_models.Appointment).filter(
            appointment_models.Appointment.patient_id == token.patient_id,
            appointment_models.Appointment.doctor_id == doctor_id
        ).order_by(appointment_models.Appointment.created_at.desc()).first()
        appt_notes = appt.notes if appt else None

        result.append(token_schemas.TokenQueueResponse(
            id=token.id,
            token_number=token.token_number,
            patient_id=token.patient_id,
            patient_name=patient_profile.full_name if patient_profile else (patient.email.split('@')[0] if patient else "Unknown"),
            status=token.status,
            payment_status=token.payment_status,
            payment_amount=token.payment_amount,
            is_emergency=token.is_emergency,
            created_at=token.created_at,
            waiting_time=waiting_time,
            reason_for_visit=token.reason_for_visit,
            voice_reason_url=voice_url,
            gender=patient_profile.gender if patient_profile else None,
            blood_group=patient_profile.blood_group if patient_profile else None,
            date_of_birth=patient_profile.date_of_birth if patient_profile else None,
            phone_number=patient_profile.phone_number if patient_profile else None,
            medical_history_summary=patient_profile.medical_history_summary if patient_profile else None,
            upi_id=patient_profile.upi_id if patient_profile else None,
            bank_name=patient_profile.bank_name if patient_profile else None,
            branch_name=patient_profile.branch_name if patient_profile else None,
            account_number=patient_profile.account_number if patient_profile else None,
            ifsc_code=patient_profile.ifsc_code if patient_profile else None,
            document_count=doc_count,
            appointment_notes=appt_notes
        ))
    
    return result

@router.get("/my-token/{doctor_id}", response_model=token_schemas.TokenResponse)
async def get_my_token(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their tokens")
    
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.patient_id == current_user.id,
        appointment_models.Token.doctor_id == doctor_id,
        appointment_models.Token.status.in_(["waiting", "called", "in_progress"])
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="No active token found")
    
    if token:
        # Populate additional fields
        if token.voice_reason_path:
             token.voice_reason_url = f"/static/voice_reasons/{os.path.basename(token.voice_reason_path)}"
             
    return token

@router.get("/my-active/token", response_model=token_schemas.TokenResponse)
async def get_my_active_token(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their tokens")
    
    # Find ANY active token for this patient (waiting, called, in_progress)
    result = db.query(appointment_models.Token, models.DoctorProfile).outerjoin(
        models.DoctorProfile, appointment_models.Token.doctor_id == models.DoctorProfile.user_id
    ).filter(
        appointment_models.Token.patient_id == current_user.id,
        appointment_models.Token.status.in_(["waiting", "called", "in_progress"])
    ).order_by(
        appointment_models.Token.is_emergency.desc(),
        appointment_models.Token.created_at.desc()
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="No active token found")
    
    token, profile = result
    
    # Map to schema manually to include joined data
    response = token_schemas.TokenResponse(
        id=token.id,
        patient_id=token.patient_id,
        doctor_id=token.doctor_id,
        doctor_name=profile.full_name if profile else None,
        doctor_specialization=profile.specialization if profile else None,
        token_number=token.token_number,
        slot_id=token.slot_id,
        status=token.status,
        payment_status=token.payment_status,
        payment_amount=token.payment_amount,
        is_emergency=token.is_emergency,
        created_at=token.created_at,
        called_at=token.called_at,
        completed_at=token.completed_at,
        voice_reason_url=f"/static/voice_reasons/{os.path.basename(token.voice_reason_path)}" if token.voice_reason_path else None
    )
    
    return response

@router.put("/{token_id}/call")
async def call_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can call patients")
    
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == token_id,
        appointment_models.Token.doctor_id == current_user.id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    if token.status not in ["waiting", "called"]:
        raise HTTPException(status_code=400, detail="Token is not in a callable state")
    
    token.status = "in_progress"
    token.called_at = datetime.utcnow()
    db.commit()
    db.refresh(token)
    
    return token

@router.put("/{token_id}/complete")
async def complete_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can complete tokens")
    
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == token_id,
        appointment_models.Token.doctor_id == current_user.id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    token.status = "completed"
    token.completed_at = datetime.utcnow()
    
    # Also find and complete any matching Appointment for this patient and doctor
    # We look for pending or confirmed appointments for today/recently
    from datetime import timedelta
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    appointment = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.patient_id == token.patient_id,
        appointment_models.Appointment.doctor_id == current_user.id,
        appointment_models.Appointment.status.in_(["pending", "confirmed"]),
        appointment_models.Appointment.appointment_date >= today_start
    ).first()
    
    if appointment:
        appointment.status = "completed"
        print(f"DEBUG: Automatically marked appointment {appointment.id} as completed.")

    db.commit()
    db.refresh(token)
    
    return token

@router.put("/{token_id}/cancel")
async def cancel_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == token_id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Patients can cancel their own tokens, doctors can cancel tokens assigned to them
    if current_user.role == "patient" and token.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and token.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    token.status = "cancelled"
    db.commit()
    db.refresh(token)
    
    return token

@router.get("/my-position/{doctor_id}")
async def get_queue_position(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get patient's position in queue and current token being served"""
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view queue position")
    
    # Get today's date range
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    # Get my token for today
    my_token = db.query(appointment_models.Token).filter(
        appointment_models.Token.patient_id == current_user.id,
        appointment_models.Token.doctor_id == doctor_id,
        appointment_models.Token.status.in_(["waiting", "called"]),
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).first()
    
    if not my_token:
        raise HTTPException(status_code=404, detail="No active token found for today")
    
    # Count tokens ahead of me (created before mine and still active)
    tokens_ahead = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == doctor_id,
        appointment_models.Token.status.in_(["waiting", "called", "in_progress"]),
        appointment_models.Token.created_at < my_token.created_at,
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).count()
    
    # Get current active token (being served)
    current_token = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == doctor_id,
        appointment_models.Token.status == "in_progress",
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).first()
    
    return {
        "my_token_number": my_token.token_number,
        "position_in_queue": tokens_ahead + 1,
        "current_token_number": current_token.token_number if current_token else None,
        "status": my_token.status,
        "total_waiting": tokens_ahead
    }

@router.put("/call-next")
async def call_next_patient(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Doctor calls the next patient in queue"""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can call patients")
    
    # Get today's date range
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    # Get the next waiting token (oldest first)
    next_token = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.status == "waiting",
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).order_by(appointment_models.Token.created_at.asc()).first()
    
    if not next_token:
        raise HTTPException(status_code=404, detail="No patients in queue")
    
    # Update status to in_progress
    next_token.status = "in_progress"
    next_token.called_at = datetime.now()
    db.commit()
    db.refresh(next_token)
    
    # Get patient info
    patient = db.query(models.User).filter(models.User.id == next_token.patient_id).first()
    patient_profile = db.query(models.PatientProfile).filter(
        models.PatientProfile.user_id == next_token.patient_id
    ).first()
    
    return {
        "token_id": next_token.id,
        "token_number": next_token.token_number,
        "patient_id": next_token.patient_id,
        "patient_name": patient_profile.full_name if patient_profile else patient.email
    }

@router.get("/metrics/me")
async def get_my_token_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get today's token metrics for the current doctor"""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access metrics")
        
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    # Waiting tokens
    waiting_count = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.status == "waiting",
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).count()
    
    # Completed tokens
    completed_count = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.status == "completed",
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end
    ).count()

    # Calculate average wait time (minutes) for today's completed tokens
    completed_tokens = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.status == "completed",
        appointment_models.Token.created_at >= today_start,
        appointment_models.Token.created_at <= today_end,
        appointment_models.Token.called_at != None
    ).all()

    avg_wait = 0
    if completed_tokens:
        total_wait_seconds = sum(
            (t.called_at - t.created_at).total_seconds() 
            for t in completed_tokens
        )
        avg_wait = int((total_wait_seconds / len(completed_tokens)) / 60)
        
    return {
        "waiting": waiting_count,
        "completed": completed_count,
        "avg_wait_minutes": avg_wait
    }
