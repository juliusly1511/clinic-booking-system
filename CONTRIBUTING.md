# Contributing Guidelines

Welcome to the **SIA101 Clinic Booking System** repository. Please follow these conventions so our team (`GT`, `FE`, `BE`, `DB`) collaborates cleanly without merge conflicts.

---

## 1. Branch Naming Convention

Create feature or fix branches from `main` (or `develop`):
- `feat/<layer>-<short-description>` — e.g. `feat/be-slot-locking`, `feat/fe-book-appointment`
- `fix/<layer>-<short-description>` — e.g. `fix/db-unique-index`, `fix/fe-timezone-slot`
- `docs/<topic>` — e.g. `docs/srs-requirements`, `docs/user-manual`
- `test/<suite>` — e.g. `test/double-booking-race`

Never commit directly to `main`.

---

## 2. Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short imperative summary>
```

Allowed `<type>` values:
- `feat`: new feature or endpoint
- `fix`: bug fix
- `docs`: markdown, diagrams, wireframes, or manual updates
- `refactor`: code restructuring with no behavior change
- `test`: Jest, Supertest, or Postman test additions
- `chore`: dependency or config updates

Examples:
- `feat(be): add atomic appointment index and 409 conflict handler`
- `feat(fe): implement calendar and slot picker on BookAppointment`
- `docs(db): update data dictionary with NotificationLog indexes`

---

## 3. Pull Request (PR) Process

1. Rebase or merge latest `main` before opening your PR.
2. Ensure backend tests pass (`cd server && npm test`) and frontend builds cleanly (`cd client && npm run build`).
3. Do not include `.env`, `node_modules/`, or `dist/` in any commit.
4. Assign **GT** plus at least one peer reviewer (e.g., `BE` reviews `DB` schema changes; `FE` checks API contract changes).
5. Reference the corresponding test case or issue ID in the PR description.
