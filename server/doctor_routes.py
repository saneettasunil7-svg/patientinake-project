from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, doctor_schemas, auth, appointment_models, token_schemas, appointment_schemas
from datetime import datetime

router = APIRouter(prefix="/doctors", tags=["doctors"])

@router.get("/", response_model=List[doctor_schemas.DoctorListResponse])
async def list_doctors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    print(f"DEBUG: Found {len(doctors)} doctors. Executing updated list_doctors route.")
    # Pre-fetch all availability and schedule data to avoid N+1 if possible, 
    # but for simplicity and correctness with the new complex logic, we'll loop.
    # Optimization: fetch all needed data in bulk could be done later.
    
    current_time = datetime.now().time()
    today_weekday = datetime.now().weekday()

    result = []
    for doctor in doctors:
        if doctor.doctor_profile:
            # 1. Manual Availability & Global Unavailable Days
            availability = db.query(appointment_models.DoctorAvailability).filter(
                appointment_models.DoctorAvailability.doctor_id == doctor.id
            ).first()
            
            manual_available = availability.is_available if availability else False
            
            global_unavailable = False
            today_weekday = datetime.now().weekday()
            today_str = datetime.now().strftime("%Y-%m-%d")
            
            if availability:
                if availability.unavailable_days and today_weekday in availability.unavailable_days:
                    global_unavailable = True
                if availability.unavailable_dates and today_str in availability.unavailable_dates:
                    global_unavailable = True

            # 2. Schedule Slot Availability
            active_slot = db.query(appointment_models.DoctorSchedule).filter(
                appointment_models.DoctorSchedule.doctor_id == doctor.id,
                appointment_models.DoctorSchedule.day_of_week == today_weekday,
                appointment_models.DoctorSchedule.is_active == True,
                appointment_models.DoctorSchedule.start_time <= current_time,
                appointment_models.DoctorSchedule.end_time > current_time
            ).first()

            # Final Calculation: Doctor is available if they manually set themselves as available
            # We still check active_slot for informational purposes but it's no longer mandatory for 'is_available'
            is_available = manual_available and (not global_unavailable)

            result.append({
                "id": doctor.id,
                "email": doctor.email,
                "full_name": doctor.doctor_profile.full_name,
                "specialization": doctor.doctor_profile.specialization,
                "is_available": is_available,
                "profile_photo": doctor.doctor_profile.profile_photo
            })
    return result

@router.get("/{doctor_id}", response_model=doctor_schemas.DoctorProfileResponse)
async def get_doctor_profile(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    doctor = db.query(models.User).filter(
        models.User.id == doctor_id,
        models.User.role == "doctor"
    ).first()
    
    if not doctor or not doctor.doctor_profile:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Calculate Availability dynamically
    current_time = datetime.now().time()
    today_weekday = datetime.now().weekday()

    # 1. Manual & Global
    availability = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == doctor.id
    ).first()
    manual_available = availability.is_available if availability else False
    
    global_unavailable = False
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    if availability:
        if availability.unavailable_days and today_weekday in availability.unavailable_days:
            global_unavailable = True
        if availability.unavailable_dates and today_str in availability.unavailable_dates:
            global_unavailable = True

    # 2. Slot
    active_slot = db.query(appointment_models.DoctorSchedule).filter(
        appointment_models.DoctorSchedule.doctor_id == doctor.id,
        appointment_models.DoctorSchedule.day_of_week == today_weekday,
        appointment_models.DoctorSchedule.is_active == True,
        appointment_models.DoctorSchedule.start_time <= current_time,
        appointment_models.DoctorSchedule.end_time > current_time
    ).first()

    # Final Calculation: Manual availability is the primary indicator
    is_available = manual_available and (not global_unavailable)

    # Return profile data but ensure top-level ID is the USER ID for token consistency
    response_data = {**doctor.doctor_profile.__dict__}
    response_data["id"] = doctor.id # Override profile ID with User ID
    response_data["profile_id"] = doctor.doctor_profile.id # Keep profile ID if ever needed
    response_data["user_id"] = doctor.id
    response_data["email"] = doctor.email
    response_data["is_available"] = is_available
    
    return response_data

@router.put("/availability", response_model=token_schemas.DoctorAvailabilityResponse)
async def toggle_availability(
    availability_update: token_schemas.DoctorAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update availability")
    
    # Get or create availability record
    availability = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == current_user.id
    ).first()
    
    if not availability:
        availability = appointment_models.DoctorAvailability(
            doctor_id=current_user.id,
            is_available=availability_update.is_available
        )
        db.add(availability)
    else:
        availability.is_available = availability_update.is_available
        availability.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(availability)
    return availability

@router.get("/me/patients", response_model=List[appointment_schemas.PatientListResponse])
async def get_my_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access their patient list")
    
    # Find all patients who had a token with this doctor
    tokens = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id
    ).all()
    
    # Also find patients who had direct appointments with this doctor
    appointments = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.doctor_id == current_user.id
    ).all()
    
    # Map to track unique patients and their most recent visit
    patient_visits = {}
    
    for t in tokens:
        pid = t.patient_id
        if pid not in patient_visits or (t.created_at and patient_visits[pid] < t.created_at):
            patient_visits[pid] = t.created_at
            
    for a in appointments:
        pid = a.patient_id
        date_visited = a.appointment_date or a.created_at
        if pid not in patient_visits or (date_visited and patient_visits[pid] < date_visited):
            patient_visits[pid] = date_visited
            
    result = []
    for pid, last_visit in patient_visits.items():
        user = db.query(models.User).filter(models.User.id == pid).first()
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == pid).first()
        
        if user:
            result.append({
                "id": pid,
                "full_name": profile.full_name if profile else user.email.split('@')[0],
                "email": user.email,
                "gender": profile.gender if profile else None,
                "blood_group": profile.blood_group if profile else None,
                "last_visit": last_visit
            })
            
    # Sort by most recent visit
    result.sort(key=lambda x: x["last_visit"] or datetime.min, reverse=True)
    return result

@router.get("/me/appointments")
async def get_my_appointments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint")
    
    query = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.doctor_id == current_user.id
    )
    
    if status:
        query = query.filter(appointment_models.Appointment.status == status)
    
    appointments = query.order_by(appointment_models.Appointment.appointment_date.desc()).all()
    
    # Enhance with patient information
    result = []
    for apt in appointments:
        patient = db.query(models.User).filter(models.User.id == apt.patient_id).first()
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == apt.patient_id
        ).first()
        
        result.append({
            "id": apt.id,
            "patient_id": apt.patient_id,
            "patient_name": patient_profile.full_name if patient_profile else patient.email,
            "patient_email": patient.email,
            "appointment_date": apt.appointment_date,
            "status": apt.status,
            "notes": apt.notes,
            "created_at": apt.created_at
        })
    
    return result

@router.get("/me/availability")
async def get_my_availability(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint")
    
    availability = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == current_user.id
    ).first()
    
    if not availability:
        # Create default availability
        availability = appointment_models.DoctorAvailability(
            doctor_id=current_user.id,
            is_available=False
        )
        db.add(availability)
        db.commit()
        db.refresh(availability)
    
    return availability

@router.get("/{doctor_id}/schedule", response_model=List[doctor_schemas.DoctorScheduleResponse])
async def get_doctor_schedule(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify doctor exists first
    doctor = db.query(models.User).filter(models.User.id == doctor_id, models.User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    schedules = db.query(appointment_models.DoctorSchedule).filter(
        appointment_models.DoctorSchedule.doctor_id == doctor_id,
        appointment_models.DoctorSchedule.is_active == True
    ).all()
    return schedules

@router.post("/schedule", response_model=List[doctor_schemas.DoctorScheduleResponse])
async def update_doctor_schedule(
    schedule_data: List[doctor_schemas.DoctorScheduleCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can manage schedules")

    try:
        # Soft delete existing active schedules to avoid FK constraint errors with Tokens
        print(f"DEBUG: Processing schedule update for Doctor {current_user.id}")
        existing_schedules = db.query(appointment_models.DoctorSchedule).filter(
            appointment_models.DoctorSchedule.doctor_id == current_user.id,
            appointment_models.DoctorSchedule.is_active == True
        ).all()
        
        print(f"DEBUG: Found {len(existing_schedules)} existing active schedules. Deactivating...")
        for existing in existing_schedules:
            existing.is_active = False
        
        new_schedules = []
        for item in schedule_data:
            print(f"DEBUG: Creating new schedule for day {item.day_of_week}")
            # Parse time strings "HH:MM" to python time objects
            try:
                start_t = datetime.strptime(item.start_time, "%H:%M").time()
                end_t = datetime.strptime(item.end_time, "%H:%M").time()
            except ValueError:
                 raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    
            schedule = appointment_models.DoctorSchedule(
                doctor_id=current_user.id,
                day_of_week=item.day_of_week,
                start_time=start_t,
                end_time=end_t,
                is_active=item.is_active
            )
            db.add(schedule)
            new_schedules.append(schedule)
        
        print("DEBUG: Committing changes...")
        db.commit()
        # Refresh all to get IDs
        for s in new_schedules:
            db.refresh(s)
            
        print("DEBUG: Update successful.")
        return new_schedules
    except Exception as e:
        print(f"ERROR in update_doctor_schedule: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.put("/availability/settings", response_model=token_schemas.DoctorAvailabilityResponse)
async def update_availability_settings(
    settings: doctor_schemas.UnavailableDaysUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update settings")

    availability = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == current_user.id
    ).first()

    if not availability:
        availability = appointment_models.DoctorAvailability(
            doctor_id=current_user.id,
            is_available=False,
            unavailable_days=settings.unavailable_days,
            unavailable_dates=settings.unavailable_dates or []
        )
        db.add(availability)
    else:
        availability.unavailable_days = settings.unavailable_days
        if settings.unavailable_dates is not None:
            availability.unavailable_dates = settings.unavailable_dates
        availability.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(availability)
    return availability


@router.get("/me/daily-report", response_model=doctor_schemas.DoctorDailyReportResponse)
async def get_daily_report(
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view daily reports")

    # Determine date range
    from datetime import date as dt_date, timedelta
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = dt_date.today()

    target_start = datetime.combine(target_date, datetime.min.time())
    target_end = datetime.combine(target_date, datetime.max.time())

    items = []
    total_emergencies = 0

    # 1. Fetch Appointments for this date
    appointments = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.doctor_id == current_user.id,
        appointment_models.Appointment.appointment_date >= target_start,
        appointment_models.Appointment.appointment_date <= target_end
    ).all()

    for apt in appointments:
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == apt.patient_id
        ).first()
        patient = db.query(models.User).filter(models.User.id == apt.patient_id).first()
        name = patient_profile.full_name if patient_profile else (patient.email.split("@")[0] if patient else "Unknown")
        
        items.append({
            "id": apt.id,
            "patient_id": apt.patient_id,
            "patient_name": name,
            "type": "appointment",
            "time_str": apt.appointment_date.strftime("%H:%M"),
            "status": apt.status,
            "notes": apt.notes,
            "created_at": apt.created_at,
            "is_emergency": False
        })

    # 2. Fetch Walk-in Tokens for this date
    tokens = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == current_user.id,
        appointment_models.Token.created_at >= target_start,
        appointment_models.Token.created_at <= target_end
    ).all()

    total_wait_seconds = 0
    completed_tokens_count = 0

    for token in tokens:
        if token.is_emergency:
            total_emergencies += 1
            
        if token.status == "completed" and token.called_at:
            total_wait_seconds += (token.called_at - token.created_at).total_seconds()
            completed_tokens_count += 1
            
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == token.patient_id
        ).first()
        patient = db.query(models.User).filter(models.User.id == token.patient_id).first()
        name = patient_profile.full_name if patient_profile else (patient.email.split("@")[0] if patient else "Unknown")
        
        time_display = token.called_at.strftime("%H:%M") if token.called_at else token.created_at.strftime("%H:%M")

        items.append({
            "id": token.id,
            "patient_id": token.patient_id,
            "patient_name": name,
            "type": "walk_in",
            "time_str": time_display,
            "status": token.status,
            "notes": token.reason_for_visit,
            "created_at": token.created_at,
            "is_emergency": token.is_emergency
        })

    # Sort combined items by time
    items.sort(key=lambda x: x["time_str"])

    avg_wait = 0
    if completed_tokens_count > 0:
        avg_wait = int((total_wait_seconds / completed_tokens_count) / 60)

    # Return structured response
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "total_patients": len(set(i["patient_id"] for i in items)),
        "total_appointments": len(appointments),
        "total_walk_ins": len(tokens),
        "total_emergencies": total_emergencies,
        "avg_wait_minutes": avg_wait,
        "items": items
    }
