# Test Execution Summary (`test-results.md`)

Detailed step-by-step matrix is maintained in [`test-cases.xlsx`](test-cases.xlsx).

---

## Summary by Test Suite

| Suite | Total | Passed | Failed | Coverage Focus |
| :--- | :---: | :---: | :---: | :--- |
| **Authentication & RBAC** | 4 | 4 | 0 | Registration, login, invalid credentials, role guard (`403`) |
| **Slot Engine & Booking** | 4 | 4 | 0 | Slot generation, successful booking, past-time filtering, blocked dates |
| **Concurrency & Rules** | 3 | 3 | 0 | Parallel double-booking (`409`), 2-hour cancel cutoff, reschedule release |
| **Staff, Doctor & Admin** | 3 | 3 | 0 | Walk-in intake, clinical note privacy, admin KPI report totals |
| **Notifications & Cron** | 2 | 2 | 0 | Confirmation dispatch log, idempotent 24h/2h reminder flags |
| **Total** | **16** | **16** | **0** | **100% Pass Rate** |

---

## Key Verified Scenarios

1. **TC-05 — Concurrent Double-Booking Prevention (`PASS`)**  
   Fired two parallel `POST /api/appointments` requests for the same `doctorId`, `date`, and `timeSlot`. MongoDB partial unique index accepted request #1 (`201 Created`) and rejected request #2 (`409 Conflict`).
2. **TC-07 — Cancelled Slot Reuse (`PASS`)**  
   Cancelled an active booking (`status: 'cancelled'`), then immediately booked the same slot with a second patient (`201 Created`), verifying the `partialFilterExpression` excludes cancelled records.
3. **TC-10 — Doctor Notes Privacy (`PASS`)**  
   Authenticated as `patient` and `staff`, requested `GET /api/appointments`, and confirmed clinical `notes` field is omitted from payloads while remaining editable by the assigned `doctor`.
4. **TC-15 — Reminder Idempotency (`PASS`)**  
   Executed `runReminderSweep()` twice consecutively for an appointment 24 hours away; verified `NotificationLog` recorded only one `reminder_24h` dispatch per channel (`sms`, `email`).
