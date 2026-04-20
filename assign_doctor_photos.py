import sys
import os
import requests
import random

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User, DoctorProfile

    db = SessionLocal()

    # Ensure uploads/profiles exists
    upload_dir = os.path.join(os.getcwd(), "uploads", "profiles")
    os.makedirs(upload_dir, exist_ok=True)

    # Placeholder images (using reliable placeholder services)
    placeholders = [
        "https://randomuser.me/api/portraits/men/1.jpg",
        "https://randomuser.me/api/portraits/women/2.jpg",
        "https://randomuser.me/api/portraits/men/3.jpg",
        "https://randomuser.me/api/portraits/women/4.jpg",
        "https://randomuser.me/api/portraits/men/5.jpg",
    ]

    doctors = db.query(User).filter(User.role == "doctor").all()
    print(f"Found {len(doctors)} doctors.")

    for i, doc in enumerate(doctors):
        if not doc.doctor_profile:
            print(f"Doctor {doc.email} has no profile. Skipping.")
            continue
        
        # Download image
        url = placeholders[i % len(placeholders)]
        filename = f"doctor_{doc.id}.jpg"
        filepath = os.path.join(upload_dir, filename)
        
        print(f"Downloading photo for {doc.email} from {url}...")
        try:
            response = requests.get(url)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                # Update DB - Path relative to static mount
                # Static mount is /static -> uploads/
                # So we need /static/profiles/filename
                db_path = f"/static/profiles/{filename}"
                doc.doctor_profile.profile_photo = db_path
                print(f"Assigned {db_path} to {doc.email}")
            else:
                print(f"Failed to download image: {response.status_code}")
        except Exception as e:
            print(f"Error downloading image: {e}")

    db.commit()
    print("Doctor photos updated successfully.")
    db.close()

except Exception as e:
    print(f"An error occurred: {e}")
