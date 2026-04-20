import os
import sys
import traceback
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import auth

client = TestClient(app)
db = SessionLocal()

print("Testing /users/me via TestClient for shibis@gmail.com...")
try:
    user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.get("/users/me", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")

except Exception as e:
    print("Exception running test client:")
    traceback.print_exc()
finally:
    db.close()
