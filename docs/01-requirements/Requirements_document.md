# Software Requirements Specification (SRS) — City Health Clinic Booking System

**Project Name:** City Health Clinic — Outpatient Appointment & Queue Booking System  
**Course:** SIA 101 — Systems Integration and Architecture  
**Prepared By:** Group Team (GT, FE, BE, DB)  

---

## 1. Introduction

City Health Clinic currently relies on manual logbooks and phone calls for appointment scheduling, causing frequent double-bookings, missed consultations, and long lobby wait times. The **City Health Clinic Booking System** is an integrated MERN-stack web application that digitizes appointment self-service, walk-in intake, doctor schedule management, automated SMS/email reminders, and operational reporting.

### 1.1 Project Objectives
1. **Eliminate Double-Bookings:** Enforce database-level uniqueness per doctor, date, and time slot so two patients can never reserve the same slot concurrently.
2. **Enable 24/7 Patient Self-Service:** Allow patients to search doctors by specialty, view real-time availability, book slots, and reschedule/cancel within clinic policy.
3. **Streamline Front-Desk Queue Operations:** Provide reception staff with check-in, no-show marking, and walk-in booking workflows.
4. **Reduce No-Show Rates:** Dispatch automated 24-hour and 2-hour reminders via SMS (Semaphore/Twilio) and Email (Nodemailer).
5. **Empower Clinical & Admin Decisions:** Give doctors a live daily schedule with private visit notes and give administrators KPI reports (completion rate, no-show rate, daily volume).

### 1.2 Stakeholders
| Stakeholder | Role in System | Primary Goals |
| :--- | :--- | :--- |
| **Patients** | `patient` | Find doctors, book/reschedule/cancel appointments, receive SMS & email reminders |
| **Reception / Front-Desk Staff** | `staff` | Check in arriving patients, register walk-in bookings, manage lobby queue |
| **Physicians / Doctors** | `doctor` | Review daily appointments, mark consultations complete, record confidential visit notes |
| **Clinic Administrators** | `admin` | Manage staff/doctor accounts, configure weekly schedules & leave blocks, export reports |
| **Clinic Management** | Business Sponsor | Reduce missed appointments, improve clinic throughput, ensure Data Privacy Act compliance |

---

## 2. Business Requirements

### 2.1 Project Scope
**In Scope:**
- Role-based authentication (JWT + bcrypt password hashing) for Patient, Staff, Doctor, and Admin.
- Doctor directory with specialty search, working days, hours, and slot duration (`15`, `20`, or `30` minutes).
- Dynamic slot availability generator checking weekly schedules, blocked leave dates, past-time cutoffs (`Asia/Manila`), and booked slots.
- Atomic booking creation with `409 Conflict` handling for simultaneous requests.
- Walk-in booking and check-in management for front-desk staff.
- Doctor daily schedule view and consultation notes restricted to clinical access.
- Automated `node-cron` reminder scheduler dispatching 24h and 2h SMS/email alerts.
- Administrative user management, doctor schedule blocking, and KPI analytics dashboard.

**Out of Scope:**
- Online payment gateway processing (consultations are settled at the clinic).
- Full Electronic Medical Records (EMR), laboratory ordering, or e-prescription fulfillment.
- Native iOS/Android binaries (responsive web browser delivery is used).

### 2.2 Project Constraints
1. **Timezone Standardization:** All booking dates and slots operate strictly in `Asia/Manila` (`UTC+08:00`) regardless of client browser timezone.
2. **Cancellation/Reschedule Policy:** Patients may cancel or reschedule online up to **2 hours** prior to `startsAt`; late adjustments require staff assistance.
3. **Academic & Budget Constraints:** Built with open-source MERN stack and free-tier/sandbox SMTP & SMS gateways.
4. **Data Privacy Compliance:** Aligned with the Philippine Data Privacy Act of 2012 (RA 10173); registration captures patient consent timestamp (`consentAt`), and visit notes are hidden from non-clinical roles.

---

## 3. Functional Requirements

| ID | Module | Requirement Description |
| :--- | :--- | :--- |
| **FR-01** | Authentication | Users register as patients with name, email, PH mobile number (`+639...` / `09...`), password, and privacy consent. |
| **FR-02** | Authentication | System authenticates credentials via bcrypt + JWT and routes users to their role-specific portal. |
| **FR-03** | Doctor Discovery | Patients and staff can filter active doctors by specialty, name, or availability date. |
| **FR-04** | Slot Engine | System computes open slots from doctor working days, start/end hours, slot duration, blocked dates, and active bookings. |
| **FR-05** | Booking | Authenticated patients book an available slot with reason for visit; concurrent attempts return HTTP `409`. |
| **FR-06** | Self-Service Updates | Patients view upcoming/past appointments and cancel or reschedule at least 2 hours before start time. |
| **FR-07** | Staff Queue | Staff view today's clinic queue, mark arrivals `checked_in`, mark `no_show`, and create walk-in appointments. |
| **FR-08** | Doctor Portal | Doctors view their assigned daily schedule, update status to `completed`, and save clinical `notes`. |
| **FR-09** | Admin Management | Admins create/deactivate user accounts, edit doctor schedules, and add/remove blocked leave dates. |
| **FR-10** | Notifications | System sends booking confirmation and automated 24h/2h reminders via SMS and email, logging each attempt. |
| **FR-11** | Reporting | Admins view summary metrics (total bookings, completed, cancelled, no-show rate, top doctors) by date range. |

---

## 4. Non-Functional Requirements

### 4.2.1 Operational Requirements
- **Browser Support:** Compatible with modern Chromium, Firefox, Safari, and mobile browsers (viewport widths `360px` to `1440px+`).
- **Maintainability:** Modular MVC separation (`routes/`, `controllers/`, `models/`, `services/`) with `.env` externalized configuration.
- **Availability:** Target `99.5%` uptime during clinic operating hours (`07:00–20:00 PHT`); graceful fallback logging if third-party SMS/SMTP providers experience downtime.

### 4.2.2 Performance Requirements
- **API Latency:** Slot availability and booking endpoints respond within `< 500 ms` under normal clinic concurrency (`50` concurrent users).
- **Atomic Concurrency:** Database unique partial index resolves race conditions deterministically within a single MongoDB write operation without locking entire collections.
- **UI Responsiveness:** Client bundle loads initial view in `< 2.0 s` over standard broadband.

### 4.2.3 Security Requirements
- **Authentication & Passwords:** Passwords hashed using `bcryptjs` (salt rounds `>= 10`); JWT tokens signed with `HS256` and short expiry (`7d`).
- **Role-Based Access Control:** Express `protect` and `authorize(...roles)` middleware verify permissions on every protected route.
- **Field-Level Privacy:** `passwordHash` is excluded by default (`select: false`); `Appointment.notes` is stripped for `patient` and `staff` responses when configured for clinical confidentiality.
- **Input Validation:** Strict server-side validation for dates (`YYYY-MM-DD`), 24h time slots (`HH:mm`), ObjectIds, and Philippine phone formats.

### 4.2.4 Cultural and Political Requirements
- **Philippine Regulatory Alignment:** Captures explicit privacy notice consent (`consentAt`) per RA 10173 (Data Privacy Act of 2012).
- **Local Phone & Time Conventions:** Normalizes `09XXXXXXXXX` and `+639XXXXXXXXX` mobile numbers for local Semaphore SMS routing and displays dates/times in `Asia/Manila`.
- **Inclusive Accessibility:** High-contrast clinic color palette, plain-language English labels, and clear status badges for non-technical reception staff and senior patients.

---

## 5. References
1. Republic of the Philippines. *Republic Act No. 10173 — Data Privacy Act of 2012*. National Privacy Commission.
2. MongoDB Inc. *Partial Indexes and Unique Constraints Documentation*. https://www.mongodb.com/docs/manual/core/index-partial/
3. Express.js & Node.js Foundation. *Express 4.x Security Best Practices*. https://expressjs.com/en/advanced/best-practice-security.html
4. React Team. *React 18 Documentation*. https://react.dev/
5. Semaphore SMS API. *Philippine SMS Gateway Developer Reference*. https://semaphore.co/docs
