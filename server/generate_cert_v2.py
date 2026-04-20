import os
from datetime import datetime, timedelta
import ipaddress
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_self_signed_cert(ip_address="10.63.16.125"):
    # Generate private key
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Generate a unique serial number
    import random
    serial_number = random.randint(1000, 100000)

    # Create CA constraints
    constraints = x509.BasicConstraints(ca=True, path_length=None)

    # Subject and Issuer (Self-signed)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"California"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"San Francisco"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Patient Intake Dev"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"patient-intake-dev"),
    ])

    # SANs (Subject Alternative Names) - CRITICAL for Chrome/Android
    alt_names = [
        x509.DNSName(u"localhost"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        x509.IPAddress(ipaddress.IPv4Address("0.0.0.0")),
    ]
    
    # Add the provided LAN IP
    try:
        alt_names.append(x509.IPAddress(ipaddress.IPv4Address(ip_address)))
    except ValueError:
        print(f"Invalid IP address provided: {ip_address}")

    # Build certificate
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(serial_number)
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(alt_names),
            critical=False,
        )
        # Add BasicConstraints extension to mark as CA (helps with prolonged validity in some stores)
        .add_extension(constraints, critical=True) 
        .sign(key, hashes.SHA256())
    )

    # Write key to file
    with open("key.pem", "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))

    # Write cert to file
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"Successfully generated key.pem and cert.pem for IP: {ip_address}")

if __name__ == "__main__":
    generate_self_signed_cert("192.168.29.141")
