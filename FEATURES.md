# MediConnect Project Feature Audit

A complete audit of what the portal is capable of, currently divided into four distinct user spheres: **Patients, Doctors, Admin/Agency, and Core Infrastructure.**

---

## 🙎‍♂️ Patient Features

✅ **Authentication & Profiling**
- Secure JWT Login / Registration.
- Detailed medical profiles (Blood Group, DOB, Emergency Contact, Height/Weight).

✅ **Smart Booking System**
- **Public Widget:** Book appointments directly from the landing page.
- **Walk-in Tokens:** Dynamic queue system for physical hospital walk-ins showing estimated wait times.
- **Standard Appointments:** Schedule a video or in-person consultation with a specific doctor.
- **Department Filtering:** Search for doctors by specialization (Cardiology, Neurology, etc.).

✅ **Telehealth Dashboard**
- Join secured, native video consultation rooms (powered by Jitsi Meet).
- Post-consultation rating & feedback system (1-5 stars + comments).

✅ **Records & Prescriptions**
- Centralized hub to view all past diagnosis, medical history, and treatment plans.
- High-priority alarm sounds for new prescriptions pushed directly to the browser.

⚠️ *Pending Wiring:* Needs backend notifications to alert the patient when a doctor approves/rejects an appointment.

---

## 👨‍⚕️ Doctor Features

✅ **Schedule Management**
- Define weekly recurring availability (e.g., Mon-Wed 9am to 5pm).
- Mark specific single dates as "Unavailable".
- Toggle instant "Available Now" switch for emergency walk-in coverage.

✅ **Patient Management Console**
- View the daily queue of active tokens and appointments.
- Complete control over approving, rejecting, or marking sessions as completed.
- Access deep records of a patient's historical visits and vitals.

✅ **Real-Time Telehealth Tools**
- Connect to video calls with patients effortlessly.
- **In-Call Prescription Pad:** Overlay UI allowing the doctor to write a diagnosis and instantly issue a prescription *while* maintaining the video call.

✅ **Daily Operational Reports**
- System aggregates total appointments, total emergencies handled, and average wait times into a daily summary view.

⚠️ *Pending Wiring:* Needs backend notifications to alert the doctor when a new patient books a slot.

---

## 🚨 Emergency & Agency Features (Admin Layer)

✅ **Multi-role Access**
- Full agency dashboard meant for hospital administrators or dispatchers.

✅ **Ambulance Tracking**
- **Agencies:** Register and manage fleets of ambulances based in different cities.
- **Live Fleet Status:** Track individual ambulance parameters (Driver Name, Capacity, Vehicle Type).
- Mark units as `available`, `dispatched`, `maintenance`, or `on_mission`.

✅ **Emergency SOS System**
- Panic button integration for immediate distress signals.

⚠️ *Pending Wiring:* Needs to map the exact routing of an "SOS Emergency" click to dispatch a local ambulance agency automatically.

---

## ⚙️ Core System Architecture

✅ **Cloud Database Integration**
- fully migrated to Supabase PostgreSQL for maximum uptime.
- Scalable PgBouncer connection pooling enabled for high traffic.

✅ **Live WebSockets**
- Two-way connection keeps doctor dashboards and patient dashboards synced without refreshing the page.

✅ **Security**
- Argon2 password hashing.
- Vercel integrated Reverse-Proxy (All API calls go through secure `/api` funnels to prevent CORS exploits).
