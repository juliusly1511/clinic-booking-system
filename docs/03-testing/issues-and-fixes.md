# Issues & Fixes Log

| Issue ID | Discovered By | Severity | Description | Root Cause | Fixed By | Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | GT | High | Cancelled appointments still blocked re-booking the same time slot | Initial unique index `{ doctorId, date, timeSlot }` applied to all statuses | **DB** | Added `partialFilterExpression: { status: { $in: ['confirmed', 'checked_in'] } }` on `Appointment` index |
| **ISS-02** | FE | Medium | Patients in UTC browsers saw today's past slots as bookable | Slot filtering compared UTC `Date.now()` with local `HH:mm` strings | **BE** | Standardized `dateHelpers.js` on explicit `Asia/Manila` (`+08:00`) offset calculation |
| **ISS-03** | BE | Medium | Rescheduling to a taken slot left the original booking cancelled | Original booking was mutated before validating target slot | **BE** | Inserted/updated target slot within conflict check first; rollback on `11000` error |
| **ISS-04** | GT | High | Reception `staff` could view doctor consultation notes in JSON payload | `GET /api/appointments` returned full Mongoose document | **BE** | Projected `.select('-notes')` unless `req.user.role === 'doctor' || 'admin'` |
| **ISS-05** | FE | Low | Empty state flashed before `/api/doctors` resolved | Initial `loading` state defaulted to `false` | **FE** | Set initial `loading` state to `true` with skeleton cards in `SearchDoctors.jsx` |
