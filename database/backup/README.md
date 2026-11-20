# Database Backup & Restore Guide

JSON snapshots in this folder mirror the seeded MongoDB collections (`users`, `doctors`, `appointments`, `blockeddates`, `notificationlogs`) for offline grading inspection or quick `mongoimport`.

## Restore via `mongoimport`
```bash
mongoimport --db clinic_booking --collection users --file users.json --jsonArray
mongoimport --db clinic_booking --collection doctors --file doctors.json --jsonArray
mongoimport --db clinic_booking --collection appointments --file appointments.json --jsonArray
mongoimport --db clinic_booking --collection blockeddates --file blockeddates.json --jsonArray
mongoimport --db clinic_booking --collection notificationlogs --file notificationlogs.json --jsonArray
```

Or seed fresh hashed demo credentials directly via Node:
```bash
cd ../../server && npm run seed
```
