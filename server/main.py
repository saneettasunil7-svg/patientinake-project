from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List, Dict
import json
import os
import asyncio
import httpx
import logging

import models, schemas, auth, appointment_models, feedback_routes
import appointment_routes, medical_records_routes, doctor_routes, admin_routes, token_routes, video_routes, document_routes, chat_routes, profile_routes, notification_routes, ambulance_routes
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)
appointment_models.Base.metadata.create_all(bind=engine)



app = FastAPI(title="Patient Intake API")

# Configure CORS
# In production, set ALLOWED_ORIGINS env var to comma-separated list of allowed origins.
# Example: "https://your-app.vercel.app,https://www.your-custom-domain.com"
# In development, all http/https origins are allowed.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins if _allowed_origins else ["*"],
    allow_origin_regex=None if _allowed_origins else r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Keep-Alive Self-Ping (prevents Render free tier cold starts) ──────────────

logger = logging.getLogger("keepalive")

SELF_PING_INTERVAL = 14 * 60  # 14 minutes — Render sleeps after 15 min of inactivity

async def _keep_alive_loop():
    """Pings our own /health endpoint every 14 minutes to prevent Render spin-down."""
    # Wait 30 seconds after startup before first ping (let server finish starting)
    await asyncio.sleep(30)
    self_url = os.environ.get("RENDER_EXTERNAL_URL", "").rstrip("/")
    if not self_url:
        logger.info("[KeepAlive] RENDER_EXTERNAL_URL not set — self-ping disabled (local dev).")
        return
    health_url = f"{self_url}/health"
    logger.info(f"[KeepAlive] Self-ping active. Pinging {health_url} every {SELF_PING_INTERVAL // 60} min.")
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                resp = await client.get(health_url)
                logger.info(f"[KeepAlive] Pinged {health_url} → {resp.status_code}")
            except Exception as exc:
                logger.warning(f"[KeepAlive] Ping failed: {exc}")
            await asyncio.sleep(SELF_PING_INTERVAL)

@app.on_event("startup")
async def startup_event():
    """Start the background keep-alive task when the app boots."""
    asyncio.create_task(_keep_alive_loop())

# ── Root & Health endpoints ────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Welcome to Patient Intake API"}

@app.get("/health")
def health_check():
    """Lightweight health check endpoint used by the self-ping keep-alive task."""
    return {"status": "ok"}

app.include_router(doctor_routes.router)
app.include_router(appointment_routes.router)
app.include_router(medical_records_routes.router)
app.include_router(admin_routes.router)
app.include_router(token_routes.router)
app.include_router(video_routes.router)
app.include_router(feedback_routes.router)
app.include_router(chat_routes.router)
app.include_router(document_routes.router)
app.include_router(profile_routes.router)
app.include_router(notification_routes.router)
app.include_router(ambulance_routes.router)


from fastapi.staticfiles import StaticFiles
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/static", StaticFiles(directory="uploads"), name="static")


# Authentication Routes

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email_query = form_data.username.strip().lower()
    print(f"Login attempt for: {email_query}") # Debug log
    user = db.query(models.User).filter(models.User.email.ilike(email_query)).first()
    if not user:
        print(f"User not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not auth.verify_password(form_data.password, user.hashed_password):
        print(f"Invalid password for: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    # Role validation isn't strictly needed if we trust the enum, but good practice
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role.value
        # is_active currently defaults to True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create associated profile based on role
    if user.role == schemas.UserRole.patient:
        profile = models.PatientProfile(
            user_id=new_user.id, 
            full_name=user.full_name,
            date_of_birth=user.date_of_birth,
            gender=user.gender,
            blood_group=user.blood_group,
            phone_number=user.phone
        )
        db.add(profile)
    elif user.role == schemas.UserRole.doctor:
        profile = models.DoctorProfile(
            user_id=new_user.id, 
            full_name=user.full_name,
            specialization="General Practitioner",
            phone_number=user.phone,
            upi_id=user.upi_id,
            bank_name=user.bank_name,
            branch_name=user.branch_name,
            account_number=user.account_number,
            ifsc_code=user.ifsc_code
        )
        db.add(profile)
    # Admin profile creation usually manual or separate flow
    
    db.commit()
    
    return new_user

@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@app.post("/reset-password")
def reset_password(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Direct password reset endpoint for the prototype.
    In a production app, this would require email verification.
    """
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # Update the password
    user.hashed_password = auth.get_password_hash(payload.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


# ── Public endpoints (no auth required) ──────────────────────────────────────

@app.get("/public/doctors")
def get_public_doctors(db: Session = Depends(get_db)):
    """Return all doctors with profiles (no auth needed) for the public booking widget."""
    import appointment_models as am

    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    print(f"DEBUG /public/doctors: found {len(doctors)} doctor users in DB")
    result = []
    for doctor in doctors:
        if not doctor.doctor_profile:
            print(f"  → SKIP doctor id={doctor.id} email={doctor.email}: no profile")
            continue

        # Use "General Practice" as fallback — never skip a doctor just for missing specialization
        raw_spec = doctor.doctor_profile.specialization or ""
        spec = raw_spec.strip() if raw_spec.strip() not in ("None", "null", "") else "General Practice"

        # Check availability
        availability = db.query(am.DoctorAvailability).filter(
            am.DoctorAvailability.doctor_id == doctor.id
        ).first()
        is_available = availability.is_available if availability else False

        print(f"  → doctor id={doctor.id} name={doctor.doctor_profile.full_name} spec={spec} available={is_available}")
        result.append({
            "id": doctor.id,
            "full_name": doctor.doctor_profile.full_name,
            "specialization": spec,
            "is_available": is_available,
        })
    print(f"DEBUG /public/doctors: returning {len(result)} doctors")
    return result


@app.get("/debug/doctors")
def debug_doctors(db: Session = Depends(get_db)):
    """Debug endpoint — shows raw doctor data from DB (no auth required). Remove in production."""
    import appointment_models as am
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    result = []
    for d in doctors:
        profile = d.doctor_profile
        avail = db.query(am.DoctorAvailability).filter(am.DoctorAvailability.doctor_id == d.id).first()
        result.append({
            "user_id": d.id,
            "email": d.email,
            "is_active": d.is_active,
            "has_profile": profile is not None,
            "full_name": profile.full_name if profile else None,
            "specialization": profile.specialization if profile else None,
            "is_available": avail.is_available if avail else False,
        })
    return {
        "total_doctor_users": len(doctors),
        "doctors_with_profile": sum(1 for r in result if r["has_profile"]),
        "doctors": result
    }




@app.post("/public/book-appointment")
def public_book_appointment(payload: schemas.PublicBookingRequest, db: Session = Depends(get_db)):
    """
    Public endpoint (no auth) – registers a new patient and books an appointment in one step.
    If the email is already registered, returns 409 so the frontend can tell them to log in.
    """
    from datetime import datetime as dt

    email = payload.email.strip().lower()

    # 1. Check for duplicate email
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered. Please log in.")

    # 2. Create user account
    hashed_pw = auth.get_password_hash(payload.password)
    new_user = models.User(
        email=email,
        hashed_password=hashed_pw,
        role="patient",
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # get new_user.id without committing

    # 3. Create patient profile
    profile = models.PatientProfile(
        user_id=new_user.id,
        full_name=f"{payload.first_name} {payload.last_name}",
        date_of_birth=payload.dob,
        gender=payload.gender,
        blood_group=payload.blood_group,
        phone_number=payload.mobile,
        upi_id=payload.upi_id,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        account_number=payload.account_number,
        ifsc_code=payload.ifsc_code,
    )
    db.add(profile)

    # 4. Check daily limit for the doctor (10 patients per day)
    try:
        appt_date_obj = dt.fromisoformat(payload.appointment_date)
    except ValueError:
        appt_date_obj = dt.strptime(payload.appointment_date, "%Y-%m-%d")
        
    # Define the range for the appointment date
    from datetime import time
    day_start = dt.combine(appt_date_obj.date(), time.min)
    day_end = dt.combine(appt_date_obj.date(), time.max)
    
    # Count existing tokens for this doctor on the selected date
    daily_token_count = db.query(appointment_models.Token).filter(
        appointment_models.Token.doctor_id == payload.doctor_id,
        appointment_models.Token.status.notin_(["cancelled"]),
        appointment_models.Token.created_at >= day_start,
        appointment_models.Token.created_at <= day_end
    ).count()
    
    if daily_token_count >= 10:
        raise HTTPException(status_code=400, detail="no available time slot")

    # 5. Create appointment
    new_appt = appointment_models.Appointment(
        patient_id=new_user.id,
        doctor_id=payload.doctor_id,
        appointment_date=appt_date_obj,
        status="pending",
        notes=f"Booked via public form. Speciality: {payload.speciality}",
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return {
        "message": "Appointment booked successfully",
        "user_id": new_user.id,
        "appointment_id": new_appt.id,
        "status": new_appt.status,
    }
