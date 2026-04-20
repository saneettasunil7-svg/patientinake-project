import os
import sys

sys.path.append(os.getcwd())
import requests
from database import SessionLocal
import models
from auth import create_access_token
from datetime import timedelta

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
    if not user:
        print("User not found")
        sys.exit(1)
        
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Create dummy file to upload
    with open("dummy.txt", "w") as f:
        f.write("This is a test document.")
        
    # Send the request
    headers = {"Authorization": f"Bearer {access_token}"}
    files = {"file": ("dummy.txt", open("dummy.txt", "rb"), "text/plain")}
    
    response = requests.post("http://localhost:8000/documents/", headers=headers, files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
finally:
    db.close()
