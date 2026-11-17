# Use Case Descriptions

**Project:** Clinic Booking System with SMS/Email Notification
**Course:** Systems Integration and Architecture 1 (IT 118)
**Group:** [Group Name]

## Use Case Index

| ID | Use case | Primary actor | Related FRs |
|---|---|---|---|
| UC-01 | Register / Log In | Patient | FR-01 to FR-04 |
| UC-02 | Search Doctors | Patient | FR-08, FR-09, FR-12 |
| UC-03 | Book Appointment | Patient | FR-13, FR-14, FR-19, FR-24 |
| UC-04 | Reschedule / Cancel Appointment | Patient | FR-15, FR-16, FR-25 |
| UC-05 | View Appointment History | Patient | FR-18 |
| UC-06 | Book Walk-in | Receptionist | FR-17 |
| UC-07 | Check In Patient | Receptionist | FR-20 |
| UC-08 | View Daily Schedule | Doctor | FR-21 |
| UC-09 | Update Status and Visit Notes | Doctor | FR-22, FR-23 |
| UC-10 | Manage Doctor Schedules | Admin | FR-10, FR-11, FR-12 |
| UC-11 | Manage Users | Admin | FR-07 |
| UC-12 | Generate Reports | Admin | FR-29, FR-30, FR-31 |
| UC-13 | Send Reminder | System scheduler | FR-26, FR-27, FR-28 |

*Note: the numbering here groups use cases by actor. If you keep the numbering used in the Requirements Document, update one of the two files so they match.*

---

## UC-01: Register / Log In

| Field | Description |
|---|---|
| **Primary actor** | Patient (all other roles use only the login part) |
| **Description** | A user creates an account or signs in to access role-specific features. |
| **Precondition** | The user has a web browser and internet access. For login, the account already exists and is active. |
| **Trigger** | The user opens the system and selects Register or Log In. |
| **Main flow** | 1. User selects Register.<br>2. User enters name, email, phone number, and password.<br>3. System validates the input and checks that the email is not already used.<br>4. System hashes the password and saves the account with the role "patient".<br>5. User logs in with email and password.<br>6. System verifies the credentials and issues a JWT.<br>7. System redirects the user to the dashboard for their role. |
| **Alternate flow** | 3a. Email already registered: the system shows an error and offers login or password reset.<br>3b. Invalid input (weak password, wrong phone format): the system shows field-level errors.<br>6a. Wrong credentials: the system shows a generic "invalid email or password" message.<br>6b. Account deactivated: the system denies access and advises contacting the clinic. |
| **Postcondition** | The user is authenticated and sees only the pages allowed for their role. |
| **Business rules** | Passwords are stored hashed. Only patients can self-register. Staff, doctor, and admin accounts are created by the admin. |

## UC-02: Search Doctors

| Field | Description |
|---|---|
| **Primary actor** | Patient |
| **Description** | A patient looks for a doctor by specialty and checks availability. |
| **Precondition** | The patient is logged in. At least one doctor has a schedule. |
| **Trigger** | The patient opens "Find a Doctor". |
| **Main flow** | 1. System displays the list of active doctors with specialty.<br>2. Patient selects a specialty filter (optional).<br>3. System shows matching doctors and their working days.<br>4. Patient selects a doctor to view the profile and available dates. |
| **Alternate flow** | 3a. No doctor matches the filter: the system shows "No doctors available" and suggests clearing the filter. |
| **Postcondition** | The patient can proceed to book an appointment with the chosen doctor. |

## UC-03: Book Appointment

| Field | Description |
|---|---|
| **Primary actor** | Patient |
| **Secondary actor** | SMS/Email service |
| **Description** | A patient reserves an available time slot with a doctor. |
| **Precondition** | The patient is logged in. The doctor has a published schedule with open slots. |
| **Trigger** | The patient selects "Book Appointment" for a doctor. |
| **Main flow** | 1. Patient selects a date from the doctor's available dates.<br>2. System displays open time slots for that date.<br>3. Patient selects a slot and enters a reason for the visit (optional).<br>4. Patient confirms the booking.<br>5. System checks that the slot is still free and saves the appointment with status "Confirmed".<br>6. System sends an SMS/email confirmation (includes UC: Send Notification).<br>7. System shows a confirmation page with the appointment details. |
| **Alternate flow** | 5a. Slot taken by another user at the same moment: the database rejects the duplicate, and the system shows the next available slots.<br>6a. SMS fails: the system sends email instead and logs the failure.<br>6b. Both SMS and email fail: the booking stays valid, the failure is logged, and the patient sees the details on screen. |
| **Postcondition** | The appointment is saved, the slot is no longer available to others, and a notification record exists. |
| **Business rules** | One active appointment per doctor, date, and time slot. A notification failure never cancels a successful booking. |

## UC-04: Reschedule / Cancel Appointment

| Field | Description |
|---|---|
| **Primary actor** | Patient |
| **Secondary actor** | SMS/Email service |
| **Description** | A patient changes the date or time of an appointment, or cancels it. |
| **Precondition** | The patient is logged in and owns an appointment with status "Confirmed". |
| **Trigger** | The patient selects Reschedule or Cancel on an appointment in "My Appointments". |
| **Main flow** | 1. Patient opens "My Appointments" and selects an appointment.<br>2. Patient chooses Reschedule or Cancel.<br>3. System checks the cutoff rule (at least 24 hours before the appointment).<br>4. For rescheduling, the patient picks a new date and slot.<br>5. System updates the appointment (or sets status "Cancelled") and releases the old slot.<br>6. System sends a notification (includes UC: Send Notification). |
| **Alternate flow** | 3a. Within the cutoff: the system blocks the change and advises the patient to contact the clinic.<br>4a. New slot taken: the system shows other available slots.<br>2a. Patient closes the dialog: no change is made. |
| **Postcondition** | The appointment is updated or Cancelled, and the old slot becomes bookable again. |
| **Business rules** | A patient can only change their own appointments. Only appointments with status "Confirmed" can be changed. |

## UC-05: View Appointment History

| Field | Description |
|---|---|
| **Primary actor** | Patient |
| **Description** | A patient reviews their upcoming and past appointments. |
| **Precondition** | The patient is logged in. |
| **Trigger** | The patient opens "My Appointments". |
| **Main flow** | 1. System retrieves the patient's appointments.<br>2. System displays them grouped as Upcoming and Past, with doctor, date, time, and status.<br>3. Patient optionally opens an appointment to see its details. |
| **Alternate flow** | 2a. The patient has no appointments: the system shows an empty state with a "Book now" button. |
| **Postcondition** | None (read-only). |
| **Business rules** | A patient can only view their own records. Doctor visit notes are not shown unless the clinic decides otherwise. |

## UC-06: Book Walk-in

| Field | Description |
|---|---|
| **Primary actor** | Receptionist |
| **Secondary actor** | SMS/Email service |
| **Description** | A receptionist books an appointment for a walk-in or phone patient. |
| **Precondition** | The receptionist is logged in. The doctor has an open slot. |
| **Trigger** | A patient arrives or calls without a prior online booking. |
| **Main flow** | 1. Receptionist searches for the patient by name or phone.<br>2. If the patient has no account, the receptionist enters basic details to create one.<br>3. Receptionist selects the doctor, date, and an open slot.<br>4. System saves the appointment with status "Confirmed".<br>5. System sends a confirmation to the patient if a phone number or email exists. |
| **Alternate flow** | 3a. No slot available today: the system suggests the next available dates.<br>5a. The patient has no phone or email: the system skips the notification and notes it in the log. |
| **Postcondition** | The appointment is saved and linked to the patient. |

## UC-07: Check In Patient

| Field | Description |
|---|---|
| **Primary actor** | Receptionist |
| **Description** | A receptionist marks a patient as arrived so the doctor sees them in the queue. |
| **Precondition** | The receptionist is logged in. The patient has a confirmed appointment for today. |
| **Trigger** | The patient arrives at the clinic. |
| **Main flow** | 1. Receptionist opens the day's appointment list.<br>2. Receptionist finds the patient's appointment.<br>3. Receptionist selects "Check in".<br>4. System updates the status to "Checked-in" and records the time. |
| **Alternate flow** | 2a. Appointment not found: the receptionist uses UC-06 (Book Walk-in).<br>2b. Appointment is for another day: the system warns and the receptionist may reschedule it. |
| **Postcondition** | The appointment shows "Checked-in" and appears in the doctor's queue. |

## UC-08: View Daily Schedule

| Field | Description |
|---|---|
| **Primary actor** | Doctor |
| **Description** | A doctor views their appointments for a selected day. |
| **Precondition** | The doctor is logged in. |
| **Trigger** | The doctor opens the dashboard or the schedule page. |
| **Main flow** | 1. System loads the doctor's appointments for today (default) or the selected date.<br>2. System lists them in time order with patient name, status, and reason for visit.<br>3. Doctor selects an appointment to view details. |
| **Alternate flow** | 2a. No appointments: the system shows "No appointments for this date". |
| **Postcondition** | None (read-only). |
| **Business rules** | A doctor can only see their own appointments. |

## UC-09: Update Status and Visit Notes

| Field | Description |
|---|---|
| **Primary actor** | Doctor |
| **Description** | A doctor marks an appointment as Completed or No-show and records brief notes. |
| **Precondition** | The doctor is logged in and the appointment belongs to them. |
| **Trigger** | The doctor finishes a consultation or the patient fails to appear. |
| **Main flow** | 1. Doctor opens the appointment.<br>2. Doctor selects "Completed" or "No-show".<br>3. For Completed, the doctor enters brief visit notes (optional).<br>4. System saves the status, notes, and timestamp. |
| **Alternate flow** | 2a. Doctor selected the wrong status: the doctor corrects it, and the system records the latest status.<br>3a. Notes too long: the system shows a length limit error. |
| **Postcondition** | The appointment has its final status. No-show data feeds the reports (UC-12). |
| **Business rules** | Only the assigned doctor can set Completed or add notes. |

## UC-10: Manage Doctor Schedules

| Field | Description |
|---|---|
| **Primary actor** | Admin (staff may also perform this if permitted) |
| **Description** | The admin sets a doctor's working days, hours, slot duration, and blocked dates. |
| **Precondition** | The admin is logged in and the doctor account exists. |
| **Trigger** | A doctor is added, or the doctor's availability changes. |
| **Main flow** | 1. Admin selects a doctor.<br>2. Admin sets working days, working hours, and slot duration (for example 30 minutes).<br>3. Admin adds blocked dates with a reason (holiday, leave).<br>4. System validates and saves the schedule.<br>5. System generates available slots from the schedule. |
| **Alternate flow** | 3a. A blocked date already has booked appointments: the system lists them and asks the admin to reschedule or notify those patients first.<br>4a. Invalid hours (end before start): the system shows an error. |
| **Postcondition** | The schedule is saved and patients see only valid slots. |

## UC-11: Manage Users

| Field | Description |
|---|---|
| **Primary actor** | Admin |
| **Description** | The admin creates, edits, deactivates, or deletes user accounts. |
| **Precondition** | The admin is logged in. |
| **Trigger** | A new staff or doctor joins, or an account must be changed or disabled. |
| **Main flow** | 1. Admin opens "Manage Users" and views the user list.<br>2. Admin selects Add, Edit, or Deactivate.<br>3. For Add, the admin enters details and assigns a role (staff, doctor, admin). For doctors, the admin also enters specialty.<br>4. System validates and saves the change. |
| **Alternate flow** | 4a. Duplicate email: the system shows an error.<br>2a. Admin tries to deactivate a doctor with upcoming appointments: the system warns and requires a decision first. |
| **Postcondition** | The user list is updated. Deactivated users can no longer log in. |
| **Business rules** | Only the admin can create staff, doctor, or admin accounts. Deactivation is preferred to deletion so records remain intact. |

## UC-12: Generate Reports

| Field | Description |
|---|---|
| **Primary actor** | Admin |
| **Description** | The admin views summary reports on clinic activity. |
| **Precondition** | The admin is logged in. Appointment data exists. |
| **Trigger** | The admin opens the Reports page. |
| **Main flow** | 1. Admin selects a report type (daily appointments, no-show rate, appointments per doctor).<br>2. Admin selects a date range.<br>3. System queries the appointments and computes totals.<br>4. System displays the results in a table or chart. |
| **Alternate flow** | 3a. No data in range: the system shows "No records found". |
| **Postcondition** | None (read-only). Optional: the admin exports the result. |

## UC-13: Send Reminder

| Field | Description |
|---|---|
| **Primary actor** | System scheduler |
| **Secondary actor** | SMS/Email service |
| **Description** | The system automatically reminds patients of upcoming appointments. |
| **Precondition** | A confirmed appointment falls within the reminder window (24 hours or 2 hours ahead) and has no reminder sent for that window. |
| **Trigger** | The scheduled job (`node-cron`) runs at its set interval. |
| **Main flow** | 1. The job queries upcoming confirmed appointments without a reminder.<br>2. For each appointment, the system builds the reminder message.<br>3. System sends an SMS to the patient's phone through the SMS API.<br>4. System records the result in the notification log and marks the appointment as reminded. |
| **Alternate flow** | 3a. The SMS API returns an error: the system falls back to email, logs the failure, and retries once.<br>3b. The patient has no valid phone number: the system sends email only. |
| **Postcondition** | Each reminder is logged as sent or failed, and the same reminder is not sent twice. |

---

## Include Relationships

| Base use case | Includes |
|---|---|
| UC-03 Book Appointment | Send SMS / Email |
| UC-04 Reschedule / Cancel Appointment | Send SMS / Email |
| UC-06 Book Walk-in | Send SMS / Email |
| UC-13 Send Reminder | Send SMS / Email |
