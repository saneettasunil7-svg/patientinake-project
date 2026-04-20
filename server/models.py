from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Enum, Float, DateTime
import datetime
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"
    agency = "agency"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.patient.value) # Storing as string for simplicity in SQLite, but using Enum logic in app
    is_active = Column(Boolean, default=True)
    profile_photo = Column(String, nullable=True) # Path to profile photo


    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    date_of_birth = Column(String) # Simplification for now
    gender = Column(String)
    blood_group = Column(String)
    phone_number = Column(String)
    medical_history_summary = Column(String, nullable=True)
    profile_photo = Column(String, nullable=True)
    
    # Bank Details
    upi_id = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    branch_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)


    user = relationship("User", back_populates="patient_profile")

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    specialization = Column(String)
    bio = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    profile_photo = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # Payment Details
    upi_id = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    branch_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)


    user = relationship("User", back_populates="doctor_profile")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    file_path = Column(String)
    upload_date = Column(String) # Storing as ISO string

    patient = relationship("User", back_populates="documents")

class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(String)
    last_updated = Column(String) # ISO format

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String)
    details = Column(String)
    timestamp = Column(String) # ISO format

# Add relation to User
User.documents = relationship("Document", back_populates="patient")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(String) # ISO format, using string for simplicity in migrations
    is_read = Column(Boolean, default=False)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=True) # Optional link to video session
    doctor_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer) # 1-5
    comment = Column(String, nullable=True)
    created_at = Column(String) # ISO format

    doctor = relationship("User", foreign_keys=[doctor_id])
    patient = relationship("User", foreign_keys=[patient_id])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # Recipient
    title = Column(String)
    message = Column(String)
    notif_type = Column(String, default="info")  # info | prescription | alert
    is_read = Column(Boolean, default=False)
    created_at = Column(String)  # ISO format

    recipient = relationship("User", foreign_keys=[user_id])


class AmbulanceAgency(Base):
    __tablename__ = "ambulance_agencies"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional link to a user managing it
    name = Column(String, index=True)
    license_number = Column(String, unique=True, index=True)
    region = Column(String)
    phone_number = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)  # Base location
    longitude = Column(Float, nullable=True) # Base location

    manager = relationship("User", foreign_keys=[manager_id])
    units = relationship("AmbulanceUnit", back_populates="agency")

class AmbulanceUnit(Base):
    __tablename__ = "ambulance_units"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("ambulance_agencies.id"))
    driver_name = Column(String)
    phone_number = Column(String)
    vehicle_plate = Column(String, unique=True)
    status = Column(String, default="Offline")  # Available, On-Trip, Offline
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)

    agency = relationship("AmbulanceAgency", back_populates="units")

class EmergencyBooking(Base):
    __tablename__ = "emergency_bookings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    agency_id = Column(Integer, ForeignKey("ambulance_agencies.id"))
    unit_id = Column(Integer, ForeignKey("ambulance_units.id"), nullable=True)
    status = Column(String, default="Pending") # Pending, Active, Completed, Cancelled
    patient_lat = Column(Float)
    patient_lng = Column(Float)
    timestamp = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())

    patient = relationship("User", foreign_keys=[patient_id])
    agency = relationship("AmbulanceAgency")
    unit = relationship("AmbulanceUnit")

