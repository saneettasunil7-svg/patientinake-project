from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, appointment_models, appointment_schemas, auth

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.post("/", response_model=appointment_schemas.AppointmentResponse)
async def create_appointment(
    appointment: appointment_schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create appointments")
    
    # Validate that the doctor_id actually belongs to a doctor user
    doctor = db.query(models.User).filter(
        models.User.id == appointment.doctor_id,
        models.User.role == "doctor"
    ).first()
    
    if not doctor:
        raise HTTPException(status_code=400, detail="The selected user is not a valid doctor")

    new_appointment = appointment_models.Appointment(
        patient_id=current_user.id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        notes=appointment.notes
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    # Populate doctor details for response
    doctor_profile = db.query(models.DoctorProfile).filter(
        models.DoctorProfile.user_id == new_appointment.doctor_id
    ).first()
    doctor_user = db.query(models.User).filter(models.User.id == new_appointment.doctor_id).first()
    
    appt_data = appointment_schemas.AppointmentResponse.from_orm(new_appointment)
    
    if doctor_profile:
        appt_data.doctor_name = doctor_profile.full_name
        appt_data.doctor_specialization = doctor_profile.specialization
    elif doctor_user:
        # Fallback to email prefix (no 'Dr.' prefix as frontend adds it)
        appt_data.doctor_name = doctor_user.email.split('@')[0].capitalize()
        appt_data.doctor_specialization = "General Practice"
    else:
        appt_data.doctor_name = "Inactive Provider"
        appt_data.doctor_specialization = "N/A"
        
    return appt_data

@router.get("/", response_model=List[appointment_schemas.AppointmentResponse])
async def get_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(appointment_models.Appointment)
    
    if current_user.role == "patient":
        appointments = query.filter(
            appointment_models.Appointment.patient_id == current_user.id
        ).all()
    elif current_user.role == "doctor":
        appointments = query.filter(
            appointment_models.Appointment.doctor_id == current_user.id
        ).all()
    else:  # admin
        appointments = query.all()
    
    # Populate doctor details
    response_data = []
    for appt in appointments:
        doctor_profile = db.query(models.DoctorProfile).filter(
            models.DoctorProfile.user_id == appt.doctor_id
        ).first()
        doctor_user = db.query(models.User).filter(models.User.id == appt.doctor_id).first()
        
        if doctor_profile:
            name = doctor_profile.full_name
            spec = doctor_profile.specialization
        elif doctor_user:
            # Fallback to email prefix (no 'Dr.' prefix as frontend adds it)
            name = doctor_user.email.split('@')[0].capitalize()
            spec = "General Practice"
        else:
            name = "Inactive Provider"
            spec = "N/A"

        # Create explicit dict to bypass serialization stripping
        appt_dict = {
            "id": appt.id,
            "patient_id": appt.patient_id,
            "doctor_id": appt.doctor_id,
            "appointment_date": appt.appointment_date,
            "status": appt.status,
            "notes": appt.notes,
            "created_at": appt.created_at,
            "doctor_name": name,
            "doctor_specialization": spec
        }
        response_data.append(appt_dict)
    
    return response_data

@router.put("/{appointment_id}", response_model=appointment_schemas.AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: appointment_schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    appointment = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # verify ownership
    if current_user.role == "patient" and appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
    
    if current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment")

    # Update logic
    if appointment_update.appointment_date:
        appointment.appointment_date = appointment_update.appointment_date
    if appointment_update.notes:
        appointment.notes = appointment_update.notes
    if appointment_update.status:
        appointment.status = appointment_update.status

    db.commit()
    db.refresh(appointment)
    
    # Populate extra fields for response model compatibility
    # (Simplified for now, as update response usually doesn't need full doctor details immediately, 
    # but strictly matching schema is good)
    return appointment

@router.get("/{appointment_id}", response_model=appointment_schemas.AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    appointment = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role == "patient" and appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Populate doctor details
    doctor_profile = db.query(models.DoctorProfile).filter(
        models.DoctorProfile.user_id == appointment.doctor_id
    ).first()
    doctor_user = db.query(models.User).filter(models.User.id == appointment.doctor_id).first()
    
    appt_data = appointment_schemas.AppointmentResponse.from_orm(appointment)
    
    if doctor_profile:
        appt_data.doctor_name = doctor_profile.full_name
        appt_data.doctor_specialization = doctor_profile.specialization
    elif doctor_user:
        appt_data.doctor_name = doctor_user.email.split('@')[0].capitalize()
        appt_data.doctor_specialization = "General Practice"
    else:
        appt_data.doctor_name = "Inactive Provider"
        appt_data.doctor_specialization = "N/A"
        
    return appt_data

@router.put("/{appointment_id}", response_model=appointment_schemas.AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: appointment_schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    appointment = db.query(appointment_models.Appointment).filter(
        appointment_models.Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # verify ownership
    if current_user.role == "patient" and appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if appointment_update.appointment_date:
        appointment.appointment_date = appointment_update.appointment_date
    if appointment_update.notes:
        appointment.notes = appointment_update.notes
    if appointment_update.status:
        appointment.status = appointment_update.status

    db.commit()
    db.refresh(appointment)

    doctor_profile = db.query(models.DoctorProfile).filter(
        models.DoctorProfile.user_id == appointment.doctor_id
    ).first()
    doctor_user = db.query(models.User).filter(models.User.id == appointment.doctor_id).first()

    appt_data = appointment_schemas.AppointmentResponse.from_orm(appointment)

    if doctor_profile:
        appt_data.doctor_name = doctor_profile.full_name
        appt_data.doctor_specialization = doctor_profile.specialization
    elif doctor_user:
        appt_data.doctor_name = doctor_user.email.split('@')[0].capitalize()
        appt_data.doctor_specialization = "General Practice"
    else:
        appt_data.doctor_name = "Inactive Provider"
        appt_data.doctor_specialization = "N/A"

    return appt_data
