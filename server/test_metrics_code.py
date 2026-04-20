import os
os.environ["DATABASE_URL"] = "sqlite:///./patientintake.db"
from database import SessionLocal
import models, appointment_models
from datetime import datetime, date

db = SessionLocal()
current_user = db.query(models.User).filter(models.User.role == 'doctor').first()
print("Testing for doctor:", current_user.email)

today_start = datetime.combine(date.today(), datetime.min.time())
today_end = datetime.combine(date.today(), datetime.max.time())

waiting_count = db.query(appointment_models.Token).filter(
    appointment_models.Token.doctor_id == current_user.id,
    appointment_models.Token.status == "waiting",
    appointment_models.Token.created_at >= today_start,
    appointment_models.Token.created_at <= today_end
).count()

completed_count = db.query(appointment_models.Token).filter(
    appointment_models.Token.doctor_id == current_user.id,
    appointment_models.Token.status == "completed",
    appointment_models.Token.created_at >= today_start,
    appointment_models.Token.created_at <= today_end
).count()

completed_tokens = db.query(appointment_models.Token).filter(
    appointment_models.Token.doctor_id == current_user.id,
    appointment_models.Token.status == "completed",
    appointment_models.Token.created_at >= today_start,
    appointment_models.Token.created_at <= today_end,
    appointment_models.Token.called_at != None
).all()

print("Completed tokens:", len(completed_tokens))
avg_wait = 0
if completed_tokens:
    for t in completed_tokens:
        print(f"Token {t.id}: called_at={t.called_at}, created_at={t.created_at}")
    total_wait_seconds = sum(
        (t.called_at - t.created_at).total_seconds() 
        for t in completed_tokens
    )
    avg_wait = int((total_wait_seconds / len(completed_tokens)) / 60)

print("avg_wait:", avg_wait)
