import os
import sys

sys.path.append(os.getcwd())

from database import SessionLocal
import models
import auth
import requests

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
    if user:
        user.hashed_password = auth.get_password_hash("admin123")
        db.commit()
        print("Password reset to admin123")
except Exception as e:
    print(e)
finally:
    db.close()

# Now test the login
data = {'username': 'shibis@gmail.com', 'password': 'admin123'}
try:
    response = requests.post('http://localhost:8000/token', data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
