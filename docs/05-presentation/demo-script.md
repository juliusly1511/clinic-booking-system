# Live Presentation & Demo Script

Target duration: **8–10 minutes** across all 4 team members.  
Companion deck: [`slides.pptx`](slides.pptx)

---

## 1. Introduction & Requirements — **GT** (2 mins)
- **Show:** Slides 1–3 (`Problem Statement`, `Stakeholders`, `Objectives`).
- **Script:** Explain the clinic's manual double-booking and no-show pain points, introduce the 4 roles (`Patient`, `Staff`, `Doctor`, `Admin`), and highlight RA 10173 privacy consent.

## 2. Database & Architecture Walkthrough — **DB** (2 mins)
- **Show:** `architecture-diagram.png` and `erd.png`.
- **Script:** Walk through the 5 MongoDB collections (`Users`, `Doctors`, `Appointments`, `BlockedDates`, `NotificationLogs`). Explain how the **partial compound unique index** on `{ doctorId, date, timeSlot }` guarantees zero double-bookings even under concurrent requests.

## 3. Patient Booking & Double-Booking Live Demo — **FE** (2.5 mins)
- **Show:** Running React app (`/login` → `/patient/doctors` → `/patient/book/:id`).
- **Actions:**
  1. Log in as `patient@clinic.test`.
  2. Filter by *Cardiology* and select Dr. Santos.
  3. Pick tomorrow's date, select `09:30`, enter reason `"Routine checkup"`, and submit.
  4. Show **My Appointments** and demonstrate the 2-hour cancellation/reschedule policy.

## 4. Staff Queue, Doctor Notes, Reminders & Admin Reports — **BE** (2.5 mins)
- **Show:** Staff, Doctor, and Admin portals + terminal/API test output.
- **Actions:**
  1. Log in as `staff@clinic.test`: Check in the newly booked patient and create a quick walk-in booking.
  2. Log in as `doctor.santos@clinic.test`: Open **Visit Notes**, record clinical notes, and mark consultation `completed` (point out that `staff` cannot see clinical `notes`).
  3. Log in as `admin@clinic.test`: Block a leave date on **Manage Schedules**, then open **Reports** to show updated completion & no-show KPIs.
  4. Show `NotificationLog` proof of SMS/Email confirmation dispatch and Jest test pass output.

## 5. Q&A Wrap-Up — **All** (1 min)
- Summarize test results (`16/16` passing) and hand over for panel questions.
