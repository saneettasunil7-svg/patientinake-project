import smtplib
from email.message import EmailMessage
import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME)

def send_prescription_email(patient_email: str, doctor_email: str, patient_name: str, doctor_name: str, diagnosis: str, prescription: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"Skipping email send. Missing SMTP config. Would have sent to: Patient ({patient_email}), Doctor ({doctor_email})")
        return
    
    msg = EmailMessage()
    msg['Subject'] = f"New Prescription from Dr. {doctor_name}"
    msg['From'] = SENDER_EMAIL
    
    receivers = []
    if patient_email:
        receivers.append(patient_email)
    if doctor_email:
        receivers.append(doctor_email)
        
    if not receivers:
        print("No valid email addresses provided to send the prescription.")
        return
        
    msg['To'] = ", ".join(receivers)
    
    content = f"""Hello {patient_name},

Dr. {doctor_name} has issued a new prescription for you.

Diagnosis: {diagnosis}
Prescription: {prescription}

Regards,
Patient Intake Clinic
"""

    msg.set_content(content)
    
    # --- Generate PDF Attachment ---
    try:
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(1 * inch, 10 * inch, "Patient Intake Clinic - Medical Prescription")
        
        c.setFont("Helvetica", 12)
        c.drawString(1 * inch, 9.5 * inch, f"Date: {datetime.now().strftime('%d %B %Y')}")
        c.drawString(1 * inch, 9 * inch, f"Doctor: Dr. {doctor_name}")
        c.drawString(1 * inch, 8.5 * inch, f"Patient: {patient_name}")
        
        c.line(1 * inch, 8.2 * inch, 7.5 * inch, 8.2 * inch)
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, 7.8 * inch, "Diagnosis:")
        c.setFont("Helvetica", 12)
        
        # Handle multi-line diagnosis
        textobject = c.beginText(1 * inch, 7.5 * inch)
        for line in diagnosis.split('\n'):
            textobject.textLine(line)
        c.drawText(textobject)
        
        y_pos = 7.5 * inch - (len(diagnosis.split('\n')) * 15) - 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y_pos, "Prescription Details:")
        c.setFont("Helvetica", 12)
        
        textobject = c.beginText(1 * inch, y_pos - 30)
        for line in prescription.split('\n'):
            textobject.textLine(line)
        c.drawText(textobject)
        
        c.line(1 * inch, y_pos - (len(prescription.split('\n')) * 15) - 40, 7.5 * inch, y_pos - (len(prescription.split('\n')) * 15) - 40)
        c.drawString(1 * inch, y_pos - (len(prescription.split('\n')) * 15) - 70, "Signature Signature: __________________")
        
        c.save()
        pdf_data = pdf_buffer.getvalue()
        
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=f'Prescription_{patient_name.replace(" ", "_")}.pdf')
    except Exception as pdf_err:
         print(f"Warning: Failed to attach PDF to prescription email: {pdf_err}")
    # -------------------------------

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            print(f"Prescription email sent successfully to {', '.join(receivers)}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_payment_confirmation_email(patient_email: str, patient_name: str, doctor_name: str, amount: int, token_number: int, date_str: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"Skipping payment email send. Missing SMTP config. Would have sent to: {patient_email}")
        return
    
    msg = EmailMessage()
    msg['Subject'] = f"Payment Receipt - Token #{token_number}"
    msg['From'] = SENDER_EMAIL
    msg['To'] = patient_email
    
    content = f"""Hello {patient_name},
    
This email confirms your successful payment for consultation with Dr. {doctor_name}.

--- Receipt Details ---
Date: {date_str}
Consultation with: Dr. {doctor_name}
Token Number: #{token_number}
Amount Paid: ₹{amount}
Status: SUCCESS
-----------------------

You are now in the queue. Please stay on the doctor's profile page to join the video call when it's your turn.

Regards,
Patient Intake Clinic
"""
    msg.set_content(content)
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            print(f"Payment confirmation email sent successfully to {patient_email}")
    except Exception as e:
        print(f"Failed to send payment email: {e}")
