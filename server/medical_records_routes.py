from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, appointment_models, appointment_schemas, auth
from datetime import datetime
from email_service import send_prescription_email
import re

# Internal AI Dictionary for Medicine Prediction
MEDICINE_DB = {
    # Fevers & Basic Infections
    r"\bfever\b": "Paracetamol 500mg, 1 tablet TID after meals for 3 days.\nRest and plenty of fluids.",
    r"\btyphoid\b": "Ciprofloxacin 500mg BID for 7 days.\nParacetamol 500mg SOS for fever.\nStrict bed rest and boiled water.",
    r"\bmalaria\b": "Artemether-Lumefantrine (ACT) BD for 3 days.\nParacetamol 500mg SOS.\nReport if symptoms worsen.",
    r"\bdengue\b": "Paracetamol 500mg TID. NO Aspirin or NSAIDs.\nOral Rehydration Salts (ORS) 2-3 liters/day.\nMonitor platelet count daily.",
    
    # Respiratory & Cold
    r"\bcold\b|\bcoryza\b": "Cetirizine 10mg HS (at night).\nSteam inhalation twice daily.",
    r"\bcough\b": "Dextromethorphan syrup 10ml TID for dry cough OR Ambroxol syrup 10ml TID for wet cough.\nWarm saline gargles.",
    r"\bflu\b|\binfluenza\b": "Oseltamivir 75mg BID for 5 days (if early).\nParacetamol + Cetirizine combination SOS.",
    r"\basthma\b": "Salbutamol Inhaler 2 puffs SOS for wheezing.\nBudesonide Inhaler 1 puff BID.\nAvoid known allergens.",
    
    # Gastrointestinal
    r"\bdiarrhea\b|\bdiarrhoea\b|\bloose stools\b": "Oral Rehydration Salts (ORS) after every loose motion.\nLoperamide 2mg stat, then 2mg after loose stool (Max 8mg/day) - ONLY if non-infectious.\nZinc supplement.",
    r"\bvomiting\b|\bgastritis\b|\bacidity\b": "Ondansetron 4mg SOS for vomiting.\nPantoprazole 40mg once daily before breakfast.",
    r"\bfood poisoning\b": "ORS formulation.\nAzithromycin 500mg once daily for 3 days (if severe).\nBland diet.",
    
    # Pain & Musculoskeletal
    r"\bheadache\b": "Paracetamol 500mg SOS or Ibuprofen 400mg SOS.\nAdequate hydration and sleep.",
    r"\bmigraine\b": "Sumatriptan 50mg SOS at onset of aura/pain.\nNaproxen 500mg SOS.",
    r"\bbackache\b|\bback pain\b": "Aceclofenac + Paracetamol combination BID after meals.\nMuscle relaxant ointment locally.\nHot fomentation.",
    r"\barthritis\b|\bjoint pain\b": "Diclofenac gel locally.\nMeloxicam 7.5mg once daily after meals.",
    
    # Chronic Conditions (Maintenance only)
    r"\bdiabetes\b|\btype 2\b": "Metformin 500mg twice daily after meals.\nStrict diabetic diet and daily 30-min walk.\nRegular blood sugar monitoring.",
    r"\bhypertension\b|\bblood pressure\b": "Amlodipine 5mg once daily in morning.\nLow salt diet.\nRegular BP monitoring.",
    
    # Skin & Allergies
    r"\ballergy\b|\brash\b|\bhives\b": "Fexofenadine 120mg once daily.\nCalamine lotion locally for soothing.",
    r"\bfungal infection\b|\bringworm\b": "Clotrimazole cream locally twice daily for 2 weeks.\nFluconazole 150mg single oral dose (if extensive).",
    
    # Default fallback
    r"general|weakness|fatigue": "Multivitamin capsule 1 OD.\nAdequate rest and balanced diet."
}

router = APIRouter(prefix="/medical-records", tags=["medical-records"])

@router.get("/predict-medicines")
async def predict_medicines(diagnosis: str, current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can use AI prediction")
    
    if not diagnosis or len(diagnosis.strip()) < 2:
        return {"prescription": "Please enter a specific diagnosis for accurate medication suggestions."}
        
    diagnosis_lower = diagnosis.lower()
    predicted_rx = []
    
    for pattern, prescription in MEDICINE_DB.items():
        if re.search(pattern, diagnosis_lower):
            predicted_rx.append(prescription)
            
    if not predicted_rx:
        return {"prescription": f"Consultation noted for: {diagnosis}.\nPlease prescribe suitable medications based on clinical judgment as no standard AI template matched."}
        
    final_prescription = "\n\n---\n".join(predicted_rx)
    return {"prescription": final_prescription}

@router.post("/", response_model=appointment_schemas.MedicalRecordResponse)
async def create_medical_record(
    record: appointment_schemas.MedicalRecordCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create medical records")
    
    new_record = appointment_models.MedicalRecord(
        patient_id=record.patient_id,
        doctor_id=current_user.id,
        appointment_id=record.appointment_id,
        diagnosis=record.diagnosis,
        treatment=record.treatment,
        prescription=record.prescription
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # --- Auto-generate follow-up appointment if requested ---
    if getattr(record, 'follow_up_days', 0) > 0:
        from datetime import timedelta
        follow_up_date = datetime.utcnow() + timedelta(days=record.follow_up_days)
        
        new_appointment = appointment_models.Appointment(
            patient_id=record.patient_id,
            doctor_id=current_user.id,
            appointment_date=follow_up_date,
            status=appointment_models.AppointmentStatus.confirmed.value,
            notes=f"Auto-scheduled follow-up from consultation on {datetime.utcnow().strftime('%Y-%m-%d')}"
        )
        db.add(new_appointment)
        db.commit()

    # --- Notify patient about the new prescription ---
    try:
        doctor_profile = db.query(models.DoctorProfile).filter(
            models.DoctorProfile.user_id == current_user.id
        ).first()
        doctor_name = doctor_profile.full_name if doctor_profile else "Your Doctor"

        notif = models.Notification(
            user_id=record.patient_id,
            title="New Prescription Available 💊",
            message=(
                f"Dr. {doctor_name} has issued a prescription for you.\n"
                f"Diagnosis: {record.diagnosis}\n"
                f"Prescription: {record.prescription}"
            ),
            notif_type="prescription",
            is_read=False,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(notif)
        db.commit()

        # Send email notification to patient and doctor
        patient_user = db.query(models.User).filter(models.User.id == record.patient_id).first()
        patient_profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == record.patient_id).first()
        patient_name = patient_profile.full_name if patient_profile else "Patient"

        if patient_user:
            background_tasks.add_task(
                send_prescription_email,
                patient_email=patient_user.email,
                doctor_email=current_user.email,
                patient_name=patient_name,
                doctor_name=doctor_name,
                diagnosis=record.diagnosis,
                prescription=record.prescription
            )
    except Exception as e:
        print(f"Failed to create notification or email task: {e}")
        pass  # Notification failure should never block the record creation

    return new_record


@router.get("/patient/{patient_id}", response_model=List[appointment_schemas.MedicalRecordResponse])
async def get_patient_records(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Patients can only see their own records
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    records = db.query(appointment_models.MedicalRecord).filter(
        appointment_models.MedicalRecord.patient_id == patient_id
    ).all()
    
    result = []
    for record in records:
        patient_profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == record.patient_id).first()
        patient = db.query(models.User).filter(models.User.id == record.patient_id).first()
        
        record_dict = {
            "id": record.id,
            "patient_id": record.patient_id,
            "doctor_id": record.doctor_id,
            "appointment_id": record.appointment_id,
            "diagnosis": record.diagnosis,
            "treatment": record.treatment,
            "prescription": record.prescription,
            "created_at": record.created_at,
            "patient_name": patient_profile.full_name if patient_profile else (patient.email if patient else "Unknown Patient")
        }
        result.append(record_dict)
    
    return result

@router.get("/", response_model=List[appointment_schemas.MedicalRecordResponse])
async def get_my_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role == "patient":
        records = db.query(appointment_models.MedicalRecord).filter(
            appointment_models.MedicalRecord.patient_id == current_user.id
        ).all()
    elif current_user.role == "doctor":
        records = db.query(appointment_models.MedicalRecord).filter(
            appointment_models.MedicalRecord.doctor_id == current_user.id
        ).order_by(appointment_models.MedicalRecord.created_at.desc()).all()
    else:  # admin
        records = db.query(appointment_models.MedicalRecord).order_by(appointment_models.MedicalRecord.created_at.desc()).all()
    
    result = []
    for record in records:
        patient_profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == record.patient_id).first()
        patient = db.query(models.User).filter(models.User.id == record.patient_id).first()
        
        record_dict = {
            "id": record.id,
            "patient_id": record.patient_id,
            "doctor_id": record.doctor_id,
            "appointment_id": record.appointment_id,
            "diagnosis": record.diagnosis,
            "treatment": record.treatment,
            "prescription": record.prescription,
            "created_at": record.created_at,
            "patient_name": patient_profile.full_name if patient_profile else (patient.email if patient else "Unknown Patient")
        }
        result.append(record_dict)
    
    return result
