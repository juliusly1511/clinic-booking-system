# Technical Documentation

---

## 1. Environment & Deployment Setup

### Server (`server/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/clinic_booking
JWT_SECRET=replace_with_64_char_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
SEMAPHORE_API_KEY=your_semaphore_key
SEMAPHORE_SENDER_NAME=CityClinic
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=clinic@example.com
EMAIL_PASS=your_app_password
```

### Commands
- Seed demo data: `cd server && npm run seed`
- Start API dev server: `cd server && npm run dev`
- Start React dev server: `cd client && npm run dev`
- Run Jest + Supertest suite: `cd server && npm test`

---

## 2. REST API Endpoints Reference

Base URL: `/api`

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register a `patient` account + capture `consentAt` |
| `POST` | `/auth/login` | Public | Authenticate credentials and return JWT + user profile |
| `GET` | `/auth/me` | Authenticated | Return current logged-in user + doctor profile if applicable |
| `POST` | `/auth/forgot-password` | Public | Issue password reset confirmation response |

### Doctors & Slots (`/api/doctors`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/doctors` | Public | List active doctors (`?specialty=&search=`) |
| `GET` | `/doctors/:id` | Public | Fetch single doctor profile |
| `GET` | `/doctors/:id/slots` | Public | Compute open `HH:mm` slots for `?date=YYYY-MM-DD` |

### Appointments (`/api/appointments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/appointments` | `patient`, `staff`, `admin` | Create booking (returns `409` on slot collision) |
| `GET` | `/appointments` | Authenticated | Role-scoped appointments (`patient`=own, `doctor`=own, `staff`/`admin`=all) |
| `GET` | `/appointments/:id` | Authenticated | Single appointment detail (hides `notes` for non-clinical roles) |
| `PATCH` | `/appointments/:id/cancel` | `patient` (owner >=2h), `staff`, `admin` | Cancel booking and release slot |
| `PATCH` | `/appointments/:id/reschedule` | `patient` (owner >=2h), `staff`, `admin` | Move booking atomically to new `date` + `timeSlot` |
| `PATCH` | `/appointments/:id/status` | `staff`, `doctor`, `admin` | Transition status (`checked_in`, `completed`, `no_show`) |
| `PATCH` | `/appointments/:id/notes` | `doctor` (assigned), `admin` | Save confidential clinical visit notes |

### Administration (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/users` | `admin`, `staff` | List users (`?role=`) |
| `POST` | `/admin/users` | `admin` | Provision user account (and `Doctor` record if `role=doctor`) |
| `PATCH` | `/admin/users/:id/toggle` | `admin` | Activate or deactivate user |
| `PATCH` | `/admin/doctors/:id/schedule` | `admin` | Update `workingDays`, `startTime`, `endTime`, `slotDuration` |
| `GET` | `/admin/blocked-dates` | `admin`, `doctor`, `staff` | List blocked leave/holiday dates |
| `POST` | `/admin/blocked-dates` | `admin`, `doctor` | Block a date for a doctor |
| `DELETE` | `/admin/blocked-dates/:id` | `admin`, `doctor` | Remove a blocked date |

### Reports (`/api/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/reports/summary` | `admin` | Aggregate KPI counts, no-show rate, breakdown by doctor (`?from=&to=`) |
| `GET` | `/reports/notifications` | `admin` | Inspect recent `NotificationLog` entries |

---

## 3. Integrations & Background Jobs

- **SMS (`server/services/smsService.js`):** Sends `POST https://api.semaphore.co/api/v4/messages` when `SEMAPHORE_API_KEY` is configured; falls back to safe sandbox console/log mode in development so offline testing never crashes.
- **Email (`server/services/emailService.js`):** Uses `nodemailer` SMTP transport when `EMAIL_USER` & `EMAIL_PASS` are present; falls back to safe mock log output otherwise.
- **Reminder Job (`server/services/reminderJob.js`):** Schedules `*/15 * * * *` via `node-cron` to evaluate 24h and 2h windows in `Asia/Manila` and persist idempotency flags (`reminder24hSent`, `reminder2hSent`).

---

## 4. Database Schema Highlights
See [`../02-design/data-dictionary.md`](../02-design/data-dictionary.md) and [`../../database/schema-notes.md`](../../database/schema-notes.md) for full Mongoose model definitions and partial unique index rules.
