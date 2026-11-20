# Use Case Descriptions

Reference diagram: [`use-case-diagram.png`](use-case-diagram.png)

---

## UC-01: Book Appointment (Patient / Walk-In Staff)

| Attribute | Description |
| :--- | :--- |
| **Actor(s)** | Patient (Primary), Front-Desk Staff (Walk-in proxy) |
| **Preconditions** | User is authenticated with a valid JWT (`patient` or `staff` role); Doctor profile is active. |
| **Trigger** | User selects a doctor, picks a date on the calendar, chooses an open time slot, and submits booking form. |
| **Main Flow** | 1. Client requests `GET /api/doctors/:id/slots?date=YYYY-MM-DD`.<br>2. Server checks doctor `workingDays`, `BlockedDate` collection, and active `Appointment` bookings, returning open `HH:mm` slots.<br>3. User selects a slot, enters `reason`, and submits `POST /api/appointments`.<br>4. Server validates slot availability and inserts `Appointment` document guarded by compound unique index `{ doctorId, date, timeSlot }`.<br>5. Server dispatches SMS & Email confirmation asynchronously and logs delivery in `NotificationLog`.<br>6. System returns `201 Created` with booking reference. |
| **Alternative / Exception Flows** | - **A1 (Concurrent Double-Booking):** MongoDB throws duplicate key error (`11000`); server catches it and returns `409 Conflict` prompting user to select another slot.<br>- **A2 (Doctor on Leave):** `BlockedDate` matches date; server returns `400 Bad Request` (`Doctor is unavailable on this date`). |
| **Postconditions** | Appointment stored with status `confirmed`; slot is removed from future availability queries. |

---

## UC-02: Cancel or Reschedule Appointment

| Attribute | Description |
| :--- | :--- |
| **Actor(s)** | Patient (Owner), Front-Desk Staff, Admin |
| **Preconditions** | Appointment exists with status `confirmed`. |
| **Trigger** | Patient clicks **Cancel** or **Reschedule** from `My Appointments`, or Staff updates booking at reception. |
| **Main Flow** | 1. Client calls `PATCH /api/appointments/:id/cancel` or `PATCH /api/appointments/:id/reschedule`.<br>2. Server verifies ownership (`appointment.patientId === req.user.id`) or elevated role (`staff`/`admin`).<br>3. For patients, server verifies `startsAt - now >= 2 hours`.<br>4. **Cancel:** Updates `status` to `cancelled` (freeing the slot because partial unique index only covers `confirmed` & `checked_in`).<br>5. **Reschedule:** Validates new `date` + `timeSlot`, updates record atomically, resets reminder flags.<br>6. Server sends update notification and returns `200 OK`. |
| **Exception Flows** | - **E1 (< 2 Hours Cutoff):** Returns `400 Bad Request` instructing patient to call clinic reception.<br>- **E2 (Target Slot Taken on Reschedule):** Returns `409 Conflict`; original slot remains intact. |
| **Postconditions** | Appointment status or schedule updated; freed slot becomes immediately bookable. |

---

## UC-03: Manage Doctor Schedule & Blocked Dates

| Attribute | Description |
| :--- | :--- |
| **Actor(s)** | Clinic Administrator (`admin`), Doctor (`doctor` for own blocked dates) |
| **Preconditions** | Actor is authenticated as `admin` (or `doctor` when blocking own leave). |
| **Trigger** | Admin updates working hours/days or blocks a clinic holiday/doctor leave date. |
| **Main Flow** | 1. Admin opens **Manage Schedules** and edits doctor `workingDays`, `startTime`, `endTime`, or `slotDuration`.<br>2. Client sends `PATCH /api/admin/doctors/:id/schedule`.<br>3. To block a date (e.g., seminar or leave), actor submits `POST /api/admin/blocked-dates` with `doctorId`, `date`, and `reason`.<br>4. Server saves unique `{ doctorId, date }` entry in `BlockedDate` and flags affected existing appointments if any.<br>5. Subsequent slot queries return `[]` for that date. |
| **Exception Flows** | - **E1 (Duplicate Blocked Date):** Returns `409 Conflict` indicating date is already blocked.<br>- **E2 (Invalid Time Window):** `startTime >= endTime` returns `400 Bad Request`. |
| **Postconditions** | Updated doctor schedule or blocked date immediately governs slot generation. |

---

## UC-04: Send Automated 24h & 2h Appointment Reminders

| Attribute | Description |
| :--- | :--- |
| **Actor(s)** | System Scheduler (`node-cron` background worker) |
| **Preconditions** | Confirmed appointments exist whose `startsAt` enters the 24-hour or 2-hour notification window. |
| **Trigger** | Cron job executes every 15 minutes (`*/15 * * * *`). |
| **Main Flow** | 1. Scheduler queries `Appointment` records where `status === 'confirmed'`.<br>2. For appointments `23.5h–24.5h` away with `reminder24hSent === false`, calls `smsService` + `emailService`.<br>3. For appointments `1.5h–2.5h` away with `reminder2hSent === false`, calls `smsService` + `emailService`.<br>4. Writes delivery status (`sent` or `failed`) to `NotificationLog`.<br>5. Sets `reminder24hSent = true` / `reminder2hSent = true` so reminders are never duplicated. |
| **Exception Flows** | - **E1 (Gateway Timeout):** Logs `status: 'failed'` and `errorMessage` in `NotificationLog` without crashing the cron worker. |
| **Postconditions** | Patients receive timely reminders; audit trail recorded in `NotificationLog`. |
