from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

hash = pwd_context.hash("testpassword")
print(f"Hash: {hash}")
verify = pwd_context.verify("testpassword", hash)
print(f"Verify: {verify}")
