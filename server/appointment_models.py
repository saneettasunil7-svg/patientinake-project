from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Enum as SQLEnum, Text, Index, Time, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    appointment_date = Column(DateTime)
    status = Column(String, default=AppointmentStatus.pending.value)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    diagnosis = Column(Text)
    treatment = Column(Text)
    prescription = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    appointment = relationship("Appointment")

class TokenStatus(str, enum.Enum):
    waiting = "waiting"
    called = "called"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    day_of_week = Column(Integer)  # 0=Monday, 6=Sunday
    start_time = Column(Time)
    end_time = Column(Time)
    is_active = Column(Boolean, default=True)

    doctor = relationship("User", back_populates="schedules")

class Token(Base):
    __tablename__ = "tokens"
    __table_args__ = (
        # Composite index for efficient daily token queries
        Index('idx_doctor_date_token', 'doctor_id', 'created_at', 'token_number'),
    )

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    # New field: Link to specific schedule slot
    slot_id = Column(Integer, ForeignKey("doctor_schedules.id"), nullable=True)
    
    token_number = Column(Integer)
    status = Column(String, default=TokenStatus.waiting.value)
    reason_for_visit = Column(String, nullable=True)
    voice_reason_path = Column(String, nullable=True)
    is_emergency = Column(Boolean, default=False)
    payment_status = Column(String, default="pending") # pending, completed, failed
    payment_amount = Column(Integer, default=300) # Default amount in cents or local currency
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    slot = relationship("DoctorSchedule")

class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), unique=True)
    is_available = Column(Boolean, default=False)
    # New field: Store unavailable days as JSON list e.g. [6] for Sunday
    unavailable_days = Column(JSON, default=[]) 
    # New field: Store specific unavailable dates e.g. ["2026-12-25"]
    unavailable_dates = Column(JSON, default=[])
    last_updated = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("User")

class VideoSession(Base):
    __tablename__ = "video_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"))
    session_id = Column(String, unique=True, index=True)
    status = Column(String, default="active")  # active, ended
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    token = relationship("Token")

# Late binding of relationships to avoid circular dependency/mapping issues
from models import User
User.schedules = relationship("DoctorSchedule", back_populates="doctor")
