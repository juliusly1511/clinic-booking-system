# Technology Stack Justification

Each team member documented the architectural choice and trade-offs for their assigned layer.

---

## 1. Frontend Layer — React + Vite + Tailwind CSS + Axios (**FE**)
- **React 18 + React Router:** Component-based architecture separates role portals (`patient/`, `staff/`, `doctor/`, `admin/`) cleanly using a single `ProtectedRoute` guard and shared UI primitives (`Calendar`, `SlotPicker`, `StatusBadge`).
- **Vite:** Sub-second cold starts and fast ES-module bundling compared to legacy Create React App (`webpack`).
- **Tailwind CSS:** Utility-first styling guarantees responsive mobile-to-desktop layouts without bloated custom CSS files.
- **Axios:** Centralized interceptors inject `Authorization: Bearer <token>` on every API call and handle global `401` session expiration gracefully.

---

## 2. Backend & Integration Layer — Node.js + Express + JWT + node-cron (**BE**)
- **Node.js & Express:** Shares JavaScript/JSON across client and server, speeding up API contract development and allowing lightweight middleware chaining (`protect` → `authorize` → `validate`).
- **JWT (`jsonwebtoken`) + `bcryptjs`:** Stateless Bearer authentication scales cleanly behind reverse proxies without sticky sessions, while bcrypt protects stored user credentials.
- **`node-cron` + Semaphore SMS + Nodemailer:** Keeps scheduled 24h/2h reminder dispatching inside the application runtime without paying for external queue infrastructure, while logging every attempt to MongoDB.

---

## 3. Database Layer — MongoDB + Mongoose (**DB**)
- **MongoDB Document Model:** Doctor schedules (`workingDays`, `startTime`, `endTime`, `slotDuration`) map naturally to JSON documents without complex multi-table joins on every slot lookup.
- **Partial Compound Unique Index:** Enforcing `{ doctorId: 1, date: 1, timeSlot: 1 }` with `partialFilterExpression: { status: { $in: ['confirmed', 'checked_in'] } }` solves concurrent double-booking directly inside MongoDB while automatically freeing cancelled slots for re-booking.
- **Mongoose ODM:** Provides schema-level validation, `select: false` password protection, and clean `populate()` joins for appointment views.

---

## 4. QA, Testing & Governance (**GT**)
- **Jest + Supertest:** Automated integration tests run against Express endpoints to prove double-booking race conditions return `409 Conflict` and RBAC blocks unauthorized roles with `403 Forbidden`.
- **Postman Collection:** Enables rapid manual verification during sprint demos and grading defense.
- **Markdown + Diagram-as-Artifacts:** Version-controlled documentation keeps SRS, ERD, and test results synchronized with code changes.
