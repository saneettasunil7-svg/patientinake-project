from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"

try:
    data = {"sub": "shibis@gmail.com", "role": "patient"}
    expire = datetime.utcnow() + timedelta(minutes=15)
    data.update({"exp": expire})
    encoded_jwt = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Encoded JWT: {encoded_jwt}")
    decoded = jwt.decode(encoded_jwt, SECRET_KEY, algorithms=[ALGORITHM])
    print(f"Decoded: {decoded}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
