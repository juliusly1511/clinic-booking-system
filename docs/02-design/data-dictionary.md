# Data Dictionary (MongoDB Collections)

Reference ERD: [`erd.png`](erd.png)

---

## 1. `users` Collection
Stores account credentials, contact details, role assignment, and privacy consent metadata for all system actors.

| Field | Type | Required | Unique | Default / Constraints | References | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Yes | Auto-generated | — | Primary key |
| `name` | `String` | Yes | No | Trimmed, 2–100 chars | — | Full legal name |
| `email` | `String` | Yes | Yes | Lowercase, valid email | — | Login identifier |
| `phone` | `String` | Yes | No | Normalized `+639XXXXXXXXX` | — | Mobile number for SMS reminders |
| `passwordHash` | `String` | Yes | No | `select: false`, bcrypt hash | — | Hashed password |
| `role` | `String` | Yes | No | Enum: `patient`, `staff`, `doctor`, `admin` | — | RBAC role |
| `isActive` | `Boolean` | Yes | No | `true` | — | Soft-disable flag |
| `consentAt` | `Date` | No | No | `Date.now` on registration | — | RA 10173 privacy consent timestamp |
| `createdAt` | `Date` | Yes | No | Mongoose timestamp | — | Record creation time |
| `updatedAt` | `Date` | Yes | No | Mongoose timestamp | — | Last update time |

**Indexes:** `{ email: 1 }` (Unique), `{ role: 1, isActive: 1 }`.

---

## 2. `doctors` Collection
Extends a `users` record (`role: 'doctor'`) with clinical specialty and weekly slot-generation schedule.

| Field | Type | Required | Unique | Default / Constraints | References | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Yes | Auto-generated | — | Primary key |
| `userId` | `ObjectId` | Yes | Yes | — | `users._id` | Linked user account |
| `specialty` | `String` | Yes | No | e.g., `General Medicine`, `Pediatrics` | — | Medical department |
| `bio` | `String` | No | No | `""` | — | Short physician profile |
| `roomNumber` | `String` | No | No | `"Room 101"` | — | Clinic consultation room |
| `slotDuration` | `Number` | Yes | No | `30` (allowed: `15`, `20`, `30`) | — | Minutes per appointment slot |
| `workingDays` | `[Number]` | Yes | No | `[1,2,3,4,5]` (`0=Sun..6=Sat`) | — | Recurring weekly clinic days |
| `startTime` | `String` | Yes | No | `"09:00"` (`HH:mm` 24h) | — | Shift start time (PHT) |
| `endTime` | `String` | Yes | No | `"17:00"` (`HH:mm` 24h) | — | Shift end time (PHT) |
| `isActive` | `Boolean` | Yes | No | `true` | — | Whether doctor accepts bookings |

**Indexes:** `{ userId: 1 }` (Unique), `{ specialty: 1, isActive: 1 }`.

---

## 3. `appointments` Collection
Stores booked consultations, queue check-in states, walk-in flags, reminder dispatch markers, and clinical notes.

| Field | Type | Required | Unique | Default / Constraints | References | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Yes | Auto-generated | — | Primary key |
| `patientId` | `ObjectId` | Yes | No | — | `users._id` | Patient user record |
| `doctorId` | `ObjectId` | Yes | No | — | `doctors._id` | Assigned doctor profile |
| `date` | `String` | Yes | No | `YYYY-MM-DD` (Asia/Manila) | — | Consultation date string |
| `timeSlot` | `String` | Yes | No | `HH:mm` 24-hour format | — | Slot start label |
| `startsAt` | `Date` | Yes | No | Computed UTC Date from PHT | — | Exact timestamp for cutoff & cron |
| `status` | `String` | Yes | No | Enum: `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show` | — | Lifecycle state |
| `reason` | `String` | Yes | No | Max 500 chars | — | Chief complaint / reason |
| `notes` | `String` | No | No | `""` (doctor-visible only) | — | Consultation notes |
| `isWalkIn` | `Boolean` | Yes | No | `false` | — | Created by front-desk walk-in |
| `reminder24hSent` | `Boolean` | Yes | No | `false` | — | Idempotency flag for 24h reminder |
| `reminder2hSent` | `Boolean` | Yes | No | `false` | — | Idempotency flag for 2h reminder |
| `createdBy` | `ObjectId` | No | No | — | `users._id` | Actor who created booking |

**Indexes:**
- **Double-Booking Guard (Partial Unique Index):**  
  `{ doctorId: 1, date: 1, timeSlot: 1 }`, `unique: true`, `partialFilterExpression: { status: { $in: ["confirmed", "checked_in"] } }`
- `{ patientId: 1, startsAt: -1 }`
- `{ status: 1, startsAt: 1 }` (used by `node-cron` reminder scanner)

---

## 4. `blockeddates` Collection
Stores full-day leaves, seminars, or clinic holidays per doctor.

| Field | Type | Required | Unique | Default / Constraints | References | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Yes | Auto-generated | — | Primary key |
| `doctorId` | `ObjectId` | Yes | No | — | `doctors._id` | Affected doctor |
| `date` | `String` | Yes | No | `YYYY-MM-DD` | — | Blocked calendar date |
| `reason` | `String` | Yes | No | Trimmed | — | Leave / holiday reason |
| `createdBy` | `ObjectId` | Yes | No | — | `users._id` | Admin or Doctor who created block |

**Indexes:** `{ doctorId: 1, date: 1 }` (Unique).

---

## 5. `notificationlogs` Collection
Audit trail of every SMS and Email confirmation or reminder sent by the system.

| Field | Type | Required | Unique | Default / Constraints | References | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Yes | Auto-generated | — | Primary key |
| `appointmentId` | `ObjectId` | Yes | No | — | `appointments._id` | Related booking |
| `recipient` | `String` | Yes | No | Phone or email address | — | Destination contact |
| `type` | `String` | Yes | No | Enum: `confirmation`, `reminder_24h`, `reminder_2h`, `cancellation`, `reschedule` | — | Notification category |
| `channel` | `String` | Yes | No | Enum: `sms`, `email` | — | Delivery medium |
| `status` | `String` | Yes | No | Enum: `sent`, `failed` | — | Provider outcome |
| `providerMessageId` | `String` | No | No | `""` | — | Gateway reference ID |
| `errorMessage` | `String` | No | No | `""` | — | Failure diagnostics |
| `sentAt` | `Date` | Yes | No | `Date.now` | — | Timestamp of attempt |

**Indexes:** `{ appointmentId: 1, type: 1, channel: 1 }`, `{ sentAt: -1 }`.
