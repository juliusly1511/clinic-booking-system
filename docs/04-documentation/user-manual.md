# User Manual — City Health Clinic Booking System

Role-specific guide covering every portal. Reference UI wireframes are available in [`../02-design/wireframes/`](../02-design/wireframes/).

---

## 1. Patient Guide

### 1.1 Register & Sign In
1. Navigate to **Register** (`/register`), enter your full name, email, Philippine mobile number (`09XXXXXXXXX` or `+639XXXXXXXXX`), and password.
2. Check the **Data Privacy Act Consent** box and submit.
3. On subsequent visits, sign in via **Login** (`/login`) (`wireframes/login.png`).

### 1.2 Search Doctors & Book an Appointment
1. Open **Find Doctors** (`/patient/doctors`) (`wireframes/search-doctors.png`).
2. Filter by medical specialty (e.g., *General Medicine*, *Pediatrics*, *Cardiology*) or doctor name.
3. Click **Book Appointment** on a doctor card (`wireframes/book-appointment.png`).
4. Pick a date on the calendar (unblocked clinic working days are selectable).
5. Select an open time slot, enter your **Reason for Visit**, and click **Confirm Booking**.
6. You will receive an SMS and Email confirmation immediately.

### 1.3 Manage My Appointments
1. Open **My Appointments** (`/patient/appointments`).
2. Review **Upcoming** and **Past** visits.
3. Click **Reschedule** or **Cancel** at least **2 hours** before your scheduled slot. Within 2 hours of the appointment, contact clinic reception directly.

---

## 2. Front-Desk Staff Guide

### 2.1 Daily Clinic Queue (`staff/appointments`)
- Reference: `wireframes/staff-queue.png`
1. Filter the appointment list by date (defaults to today) or doctor.
2. When a patient arrives at the front desk, click **Check In** to move status from `confirmed` to `checked_in`.
3. If a patient fails to arrive after their slot window, click **Mark No-Show**.

### 2.2 Register Walk-In Patients (`staff/walk-in`)
1. Open **Walk-In Booking**.
2. Select an existing patient or enter walk-in patient contact details.
3. Choose the doctor, today's date, and the next open time slot.
4. Click **Book Walk-In**; the booking is flagged `isWalkIn: true` and enters today's queue immediately.

---

## 3. Doctor Guide

### 3.1 Daily Schedule (`doctor/schedule`)
- Reference: `wireframes/doctor-schedule.png`
1. View your scheduled and `checked_in` patients in chronological order.
2. Filter by date or inspect patient reason for visit.

### 3.2 Consultation & Visit Notes (`doctor/notes/:id`)
1. Click **Open Visit Notes** on a checked-in patient.
2. Record clinical observations and treatment summary in the confidential **Visit Notes** field.
3. Click **Save & Mark Completed** to update status to `completed`. Notes are visible strictly to clinical/admin staff and never exposed on reception screens.

---

## 4. Administrator Guide

### 4.1 Manage Users (`admin/users`)
- Create `staff`, `doctor`, or `admin` accounts, assign doctor specialties, or deactivate user access (`isActive: false`).

### 4.2 Manage Schedules & Leave Blocks (`admin/schedules`)
- Update a doctor's weekly `workingDays`, `startTime`, `endTime`, and `slotDuration` (`15`/`20`/`30` mins).
- Add **Blocked Dates** for doctor leave or clinic holidays so patients cannot book unavailable dates.

### 4.3 View Reports (`admin/reports`)
- Reference: `wireframes/admin-reports.png`
- Filter by date range to inspect total bookings, completion rate, no-show percentage, and bookings per doctor.
