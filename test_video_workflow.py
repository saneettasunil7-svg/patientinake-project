import asyncio
import os
import sqlite3
import urllib.request
from playwright.async_api import async_playwright
import time

# Create a test doctor with fixed password
def ensure_test_doctor():
    conn = sqlite3.connect('d:/patientintake/server/patientintake.db')
    cursor = conn.cursor()
    # Ensure doctor exists and get ID
    cursor.execute("""
        INSERT OR IGNORE INTO users (email, hashed_password, role, is_active)
        VALUES ('testdoc@test.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGGa31lW', 'doctor', 1)
    """)
    conn.commit()
    cursor.execute("SELECT id FROM users WHERE email='testdoc@test.com'")
    doc_id = cursor.fetchone()[0]
    
    # Ensure patient exists
    cursor.execute("""
        INSERT OR IGNORE INTO users (email, hashed_password, role, is_active)
        VALUES ('testpat@test.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGGa31lW', 'patient', 1)
    """)
    conn.commit()
    cursor.execute("SELECT id FROM users WHERE email='testpat@test.com'")
    pat_id = cursor.fetchone()[0]

    # Create a waiting token for this doctor and patient
    cursor.execute("""
        INSERT INTO tokens (patient_id, doctor_id, token_number, status)
        VALUES (?, ?, 999, 'waiting')
    """, (pat_id, doc_id))
    conn.commit()
    cursor.execute("SELECT last_insert_rowid()")
    token_id = cursor.fetchone()[0]
    
    conn.close()
    return token_id

async def test_workflow():
    token_id = ensure_test_doctor()
    print(f"Created/Found Test Token: {token_id}")

    # Wait for servers if needed, though they should be up
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        print("Navigating to login...")
        await page.goto("http://localhost:3000/auth/login")
        
        # Login
        await page.fill("input[type='email']", "testdoc@test.com")
        await page.fill("input[type='password']", "password")
        await page.click("button[type='submit']")
        
        print("Waiting for dashboard to load...")
        await page.wait_for_url("**/doctor/dashboard**", timeout=10000)
        await page.wait_for_timeout(2000)
        
        print(f"Starting consultation for token {token_id}...")
        # Find the video button - it should have title="Start Consultation"
        await page.click("button[title='Start Consultation']")
        
        print("Waiting for video page...")
        await page.wait_for_url("**/video/**", timeout=10000)
        await page.wait_for_timeout(2000)
        
        print("Verifying Complete button is missing...")
        complete_btns = await page.locator("button:has-text('Complete')").count()
        if complete_btns > 0:
            print("❌ FAILED: 'Complete' button found on video page!")
        else:
            print("✅ PASS: No 'Complete' button on video page.")
            
        print("Ending call...")
        await page.click("button[title='End Call']")
        
        print("Waiting for redirect to dashboard with callEnded=true...")
        await page.wait_for_url("**/doctor/dashboard?callEnded=true**", timeout=10000)
        await page.wait_for_timeout(2000) # Give modal time to open
        
        print("Verifying Prescription Modal opened...")
        modal_visible = await page.locator("text='New Record:'").is_visible()
        if not modal_visible:
            print("❌ FAILED: Prescription modal did not open automatically!")
        else:
            print("✅ PASS: Prescription modal opened automatically.")
            
            print("Filling prescription...")
            await page.fill("input[type='text']:nth-of-type(1)", "Test Diagnosis")
            # Fill textareas
            textareas = await page.locator("textarea").all()
            if len(textareas) >= 2:
                await textareas[0].fill("Test Treatment")
                await textareas[1].fill("Test Prescription")
                
                print("Saving prescription...")
                # Try to mock window.alert
                await page.evaluate("window.alert = function() {};")
                await page.click("button:has-text('Save Record')")
                
                print("Waiting for modal to close...")
                await page.wait_for_timeout(2000)
                
                print("Checking for Complete button...")
                complete_dashboard = await page.locator("button:has-text('CheckCircle')").count()
                complete_text = await page.locator("button:has-text('Complete')").count()
                
                if complete_text > 0:
                    print("✅ PASS: 'Complete' button appeared after prescription.")
                else:
                    print("❌ FAILED: 'Complete' button physically missing after prescription.")
            else:
                 print("❌ FAILED: Could not find prescription textareas")

        await browser.close()
        print("Test finished.")

if __name__ == "__main__":
    asyncio.run(test_workflow())
