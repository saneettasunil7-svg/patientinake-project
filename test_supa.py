import psycopg2

password = "J1D0JVIkXGclqDBR"
ref = "ykzgudouoqkrqigjsibw"

configs = [
    # 1. New direct pooler format (port 6543)
    f"postgresql://postgres.{ref}:{password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    # 2. Old direct pooler format (port 5432 on pooler)
    f"postgresql://postgres.{ref}:{password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
    # 3. No project ref on pooler
    f"postgresql://postgres:{password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
]

for i, uri in enumerate(configs, 1):
    print(f"Testing Config {i}...")
    try:
        conn = psycopg2.connect(uri, connect_timeout=5)
        print(f"✅ SUCCESS on Config {i}!")
        conn.close()
    except Exception as e:
        print(f"❌ FAILED on Config {i}: {e}")
