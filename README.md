# City Health Clinic — Clinic Booking System (SIA 101)

A full-stack MERN (MongoDB, Express, React, Node.js) web application for outpatient clinic scheduling, walk-in queue intake, double-booking prevention, doctor schedule management, automated 24h/2h SMS & email reminders, and administrative reporting.

---

## Team Roles & Contributions

| Role | Code | Primary Ownership |
| :--- | :--- | :--- |
| **Group Leader / QA / Docs** | **GT** | Repository governance, SRS compilation, test cases & execution logs, PR reviews |
| **Frontend Engineer** | **FE** | React SPA (`client/`), wireframes, role-based UI flows, user manual |
| **Backend Engineer** | **BE** | Express API (`server/`), JWT RBAC, atomic booking logic, SMS/email & cron reminders, API tests |
| **Database Administrator** | **DB** | Mongoose schemas, compound unique indexes, ERD, data dictionary, seed & backup snapshots |

---

## Project Structure

```
SIA101_GroupName_ClinicBookingSystem/
├── README.md
├── .gitignore
├── CONTRIBUTING.md
├── docs/
│   ├── 01-requirements/        # Requirements_Document.md, use-case-diagram.png, use-case-descriptions.md
│   ├── 02-design/              # architecture, DFD, sequence, ERD, data-dictionary, wireframes, tech-stack
│   ├── 03-testing/             # test-cases.xlsx, test-results.md, issues-and-fixes.md
│   ├── 04-documentation/       # user-manual.md, technical-documentation.md
│   └── 05-presentation/        # slides.pptx, demo-script.md
├── client/                     # React + Vite + Tailwind CSS + Axios frontend
├── server/                     # Node.js + Express + Mongoose + JWT + node-cron backend
├── tests/                      # Jest/Supertest API suite + Postman collection
└── database/                   # Schema design notes + JSON collection backups
```

---

## Local Setup Steps

### Prerequisites
- Node.js v18+ and npm v9+
- MongoDB Community Server (local `mongodb://localhost:27017` or MongoDB Atlas URI)

### 1. Backend Setup (`server/`)
```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, SEMAPHORE_API_KEY, EMAIL_USER, EMAIL_PASS
npm install
npm run seed
npm run dev
```
The API server starts on `http://localhost:5000`.

### 2. Frontend Setup (`client/`)
```bash
cd client
npm install
npm run dev
```
The React client starts on `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:5000`.

### 3. Demo Accounts (Created by `npm run seed`)
| Role | Email | Password |
| :--- | :--- | :--- |
| Patient | `patient@clinic.test` | `Clinic123!` |
| Front-Desk Staff | `staff@clinic.test` | `Clinic123!` |
| Doctor (Cardiology) | `doctor.santos@clinic.test` | `Clinic123!` |
| Administrator | `admin@clinic.test` | `Clinic123!` |

---

## Key Features
- **Double-Booking Prevention:** Compound partial unique index `{ doctorId, date, timeSlot }` on active appointments (`confirmed`, `checked_in`) prevents race conditions at the database layer.
- **Role-Based Access Control (RBAC):** Distinct portals and JWT guards for `patient`, `staff`, `doctor`, and `admin`.
- **Asia/Manila Scheduling:** Server-side slot generation (`15`/`20`/`30` min intervals), working days, and blocked leave dates.
- **Automated Reminders:** `node-cron` runs every 15 minutes to dispatch 24h and 2h SMS (Semaphore/Twilio) and Email (Nodemailer) reminders with idempotent `NotificationLog` records.
- **Privacy & Auditability:** Clinical `notes` are restricted to doctors, and all notification deliveries are logged.

---

## Wireframes & Architecture Previews
- System Architecture: [`docs/02-design/architecture-diagram.png`](docs/02-design/architecture-diagram.png)
- Entity Relationship Diagram: [`docs/02-design/erd.png`](docs/02-design/erd.png)
- Booking Sequence: [`docs/02-design/sequence-booking.png`](docs/02-design/sequence-booking.png)
- Wireframes: [`docs/02-design/wireframes/`](docs/02-design/wireframes/)
