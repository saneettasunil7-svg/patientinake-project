import sys
import os
import random

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User, DoctorProfile

    db = SessionLocal()

    doctors = db.query(User).filter(User.role == "doctor").all()
    print(f"Found {len(doctors)} doctors.")

    bios = [
        "Dr. {name} is a highly experienced {spec} with over 15 years of practice. Dedicated to providing comprehensive and compassionate care to all patients.",
        "Specializing in {spec}, Dr. {name} is known for a patient-centric approach and expertise in advanced treatments. Committed to improving long-term health outcomes.",
        "With a focus on preventative care, Dr. {name} brings a wealth of knowledge in {spec}. Passionate about health education and empowering patients.",
        "Dr. {name} is a board-certified {spec} who combines cutting-edge medical research with personalized treatment plans. Strives for excellence in every consultation.",
        "An expert in {spec}, Dr. {name} has a strong background in both clinical practice and academic research. Believes in building lasting relationships with patients."
    ]

    for doc in doctors:
        if not doc.doctor_profile:
            print(f"Doctor {doc.email} has no profile. Skipping.")
            continue
        
        name = doc.doctor_profile.full_name
        spec = doc.doctor_profile.specialization or "General Medicine"
        
        # Pick a random bio template
        template = random.choice(bios)
        bio_text = template.format(name=name, spec=spec)
        
        doc.doctor_profile.bio = bio_text
        print(f"Assigned bio to {doc.email}")

    db.commit()
    print("Doctor bios updated successfully.")
    db.close()

except Exception as e:
    print(f"An error occurred: {e}")
