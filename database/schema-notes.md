# Database Schema Design Notes (MongoDB / Mongoose)

Author: **DB Lead**

---

## 1. Referencing vs. Embedding Decisions

| Relationship | Decision | Justification |
| :--- | :--- | :--- |
| `Doctor` → `User` | **Reference (`userId`)** | Separates authentication credentials (`passwordHash`, `role`, `isActive`) from scheduling metadata (`specialty`, `workingDays`, `slotDuration`). |
| `Doctor.workingDays` | **Embedded Array (`[Number]`)** | Fixed small array (`<= 7` integers `0..6`); read on every slot availability query without needing an extra join. |
| `Appointment` → `User` & `Doctor` | **References (`patientId`, `doctorId`)** | Allows independent patient history lookups, doctor daily queue filtering, and admin reporting without duplicating patient phone/email across appointments. |
| `BlockedDate` → `Doctor` | **Reference (`doctorId`)** | Keeps `Doctor` documents compact even as years of leave dates accumulate; enforces unique `{ doctorId, date }`. |
| `NotificationLog` → `Appointment` | **Reference (`appointmentId`)** | Append-only audit log grows unboundedly over time; keeping it separate avoids bloating `Appointment` documents. |

---

## 2. Double-Booking Prevention Index

```js
appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['confirmed', 'checked_in'] } }
  }
);
```

- **Why a Partial Index?**  
  If a patient cancels (`status: 'cancelled'`) or misses (`status: 'no_show'`) an appointment, the slot must immediately become bookable again. A standard unique index would block re-booking unless cancelled documents were deleted (which destroys historical reporting). Using `partialFilterExpression` guarantees **exactly one active booking** per slot while preserving full audit history.

---

## 3. Timezone & Reminder Query Optimization

- `date` (`YYYY-MM-DD`) and `timeSlot` (`HH:mm`) are stored as normalized `Asia/Manila` strings for deterministic slot matching.
- `startsAt` is stored as a UTC `Date` indexed with `{ status: 1, startsAt: 1 }` so `node-cron` scans upcoming 24h and 2h windows via index range queries (`IXSCAN`) rather than full collection scans (`COLLSCAN`).
