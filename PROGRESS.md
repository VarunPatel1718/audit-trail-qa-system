# Audit Trail Q&A System — Progress Tracker

> Keep this file at the root of your repo. Update it at the end of every work session (ask Claude Code to do it automatically — see instructions at the bottom). This is your single source of truth across devices.

**Last updated:** 2026-07-11
**Current phase:** Phase 7 — Rule Engine (in progress)

---

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Phase Checklist

### Phase 1 — Requirements Analysis
- [x] Business requirements defined
- [x] User roles identified (Auditor, Finance Manager, Admin)
- [x] Functional & non-functional requirements documented
- [x] Use cases written

### Phase 2 — High-Level Design (HLD)
- [ ] Architecture confirmed
- [ ] Tech stack finalized
- [ ] Service interaction diagram

### Phase 3 — Low-Level Design (LLD)
- [ ] Folder structure created
- [ ] DB schema drafted
- [ ] API contracts drafted

### Phase 4 — Database Design
- [x] PostgreSQL schema implemented
- [x] Relationships/foreign keys set
- [x] Seed synthetic ledger + audit data

### Phase 5 — Backend Foundation
- [x] FastAPI project scaffolded
- [x] JWT authentication
- [x] Role-based authorization
- [x] Logging + exception handling
- [x] Config management (.env, settings)

### Phase 6 — Ledger Service
- [x] Search & filter transactions
- [x] Pagination
- [x] Sorting
- [x] Input validation

### Phase 7 — Rule Engine
- [x] Duplicate detection
- [x] Threshold violation
- [ ] Round-number detection
- [ ] Vendor-account mismatch
- [ ] Split payment detection
- [ ] Weekend/holiday transactions
- [ ] Missing approval
- [ ] Inactive vendor
- [ ] Benford's Law analysis
- [x] Risk scoring engine

### Phase 8 — RAG Layer
- [ ] Policy PDF chunking
- [ ] Embeddings (sentence-transformers)
- [ ] Vector DB setup (Qdrant/Chroma)
- [ ] Policy retrieval
- [ ] Similar case retrieval

### Phase 9 — MCP Server
- [ ] query_ledger()
- [ ] flag_discrepancy()
- [ ] generate_audit_note()
- [ ] retrieve_policy()
- [ ] retrieve_similar_cases()
- [ ] risk_score()
- [ ] export_report()

### Phase 10 — LLM Integration
- [ ] Prompt templates
- [ ] Claude API integration
- [ ] JSON structured output parsing
- [ ] Audit note generator service

### Phase 11 — Frontend
- [ ] Login page
- [ ] Dashboard
- [ ] Ledger Explorer
- [ ] Transaction Details
- [ ] Audit Workspace
- [ ] Policy Search
- [ ] Case Library
- [ ] Reports
- [ ] Admin Panel

### Phase 12 — Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] RAG evaluation

### Phase 13 — Deployment
- [ ] Dockerfiles (backend, frontend)
- [ ] docker-compose
- [ ] Nginx config
- [ ] CI/CD (GitHub Actions)
- [ ] Monitoring (optional — Prometheus/Grafana)

---

## What's done (running log)
_(Append a dated bullet each session)_

- 2026-07-09: Completed docs/requirements.md — defined the 3 user roles (Auditor, Finance Manager, Admin), 9 functional requirements, and 4 non-functional requirements.
- 2026-07-10: Config management (.env, settings) completed. PostgreSQL is now running via docker-compose and verified connected.
- 2026-07-10: Created all 11 SQLAlchemy models (backend/app/models/) with relationships (transactions→vendors/departments, audit_flags→transactions, audit_notes→audit_flags, users→roles, approval_limits→departments/roles, audit_cases/policies for RAG, audit_logs as immutable append-only). Set up Alembic, generated and applied the initial migration against the docker-compose Postgres instance — verified all 11 tables created with no autogenerate drift.
- 2026-07-10: Database schema and relationships confirmed live: migration re-verified against Postgres, all 11 tables present with FKs matching the models. Seed data still outstanding — Phase 4 not fully closed.
- 2026-07-10: Implemented JWT authentication (Phase 5 complete). Added `POST /api/v1/auth/login` (email/password → access token) and `GET /api/v1/auth/me`; bcrypt password hashing via passlib (`app/auth/security.py`); `get_current_user` and `require_role(*role_names)` dependencies (`app/auth/dependencies.py`, case-insensitive role matching); `scripts/seed_users.py` creates one test user per role (Auditor, Finance Manager, Admin — password `ChangeMe123!`), idempotent. Added `JWT_SECRET_KEY`/`JWT_ALGORITHM`/`ACCESS_TOKEN_EXPIRE_MINUTES` to `.env`/`.env.example`. Verified end-to-end against the live server: login, `/auth/me`, wrong-password rejection, missing/garbage/expired token rejection (401), and role-based 403 rejection all confirmed working.
- 2026-07-10: **Phase 5 — Backend Foundation fully complete.** Re-verified the auth router is correctly wired in `app/main.py` (`app.include_router(auth_router, prefix=settings.api_v1_prefix)`) by starting the server fresh and manually exercising every case end-to-end: `POST /api/v1/auth/login` with valid credentials (200 + token), `GET /api/v1/auth/me` with a valid token (200), wrong password (401), missing token (401), garbage token (401), and expired token (401). All five Phase 5 items (FastAPI scaffold, JWT auth, role-based authorization, logging + exception handling, config management) confirmed working together.
- 2026-07-11: **Phase 6 — Ledger Service complete.** Added `GET /api/v1/transactions` (filter by date range, vendor, department, amount range, status; sort by transaction_date/amount/risk_score/created_at asc/desc; paginated with page/page_size, capped at 100/page) and `GET /api/v1/transactions/{id}` (404 if missing, includes nested vendor/department detail via `joinedload`) in `app/api/transactions.py`. Both endpoints require a valid JWT (any authenticated role) via the existing `get_current_user` dependency — no additional role restriction. Filtering/sorting/pagination/cross-field validation (date_from ≤ date_to, amount_min ≤ amount_max) is driven by a single Pydantic model, `TransactionFilterParams` (`app/schemas/transaction.py`), bound as query params via FastAPI 0.115's native "query parameter models" support (`Annotated[TransactionFilterParams, Query()]`) rather than individual `Query(...)` args. Also wrote `scripts/seed_transactions.py`: idempotently seeds 8 departments and 17 vendors (2 inactive, for the future "inactive vendor" rule), then inserts 260 transactions — 236 baseline + 10 round-number anomalies + 6 exact-duplicate-payment anomalies + 8 threshold-violating anomalies (>$10,000) — for Phase 7's rule engine to detect. Verified end-to-end against a live server: unauthenticated request (401), login as seeded auditor, list with default pagination (260 total / 25 per page / 11 pages), filter by amount_min+sort_by=amount (correctly surfaced all 8 threshold anomalies plus round-number 15000s), filter by department+status, filter by date range, detail endpoint with nested vendor/department, 404 on unknown id, and validation errors (amount_min > amount_max, date_from > date_to, invalid enum, page_size > 100, unknown query param) all return clean 422s.
- 2026-07-11: **Bug fix (pre-existing, surfaced by Phase 6 work):** `app/middleware/exception_handler.py`'s `RequestValidationError` handler was returning HTTP 500 instead of 422 whenever a Pydantic `@model_validator` raised a `ValueError` — `exc.errors()` embeds the raw exception instance in `ctx["error"]`, which `JSONResponse`'s `json.dumps` can't serialize. Fixed by stringifying `ctx["error"]` before building the response body. This was latent since Phase 5 (no schema had used a cross-field `model_validator` yet) and will affect any future validator that does the same.
- 2026-07-11: **Bug fix: `scripts/seed_transactions.py` was not idempotent.** It always appended a fresh batch of 260 transactions on top of whatever existed (continuing `transaction_ref` from the current max), so running it across two sessions left 520 rows instead of 260. Cleared the 520 duplicated rows from the live `transactions` table (`DELETE FROM transactions` — verified `audit_flags`/`audit_cases`/`audit_notes` were empty first, so no orphaned FK references). Fixed the script: it now deletes all existing transactions (`clear_transactions()`, a plain bulk `DELETE`, not `TRUNCATE ... CASCADE`, so it fails loudly instead of silently wiping dependent audit tables if Phase 7/8 ever populate them) and always re-inserts exactly `TARGET_TRANSACTION_COUNT` (260) fresh rows with refs starting at `TXN-000001`. Verified by running it twice in a row: second run printed "Cleared 260 existing transactions before reseeding" and the table still held exactly 260 rows afterward.
- 2026-07-11: **Phase 6 — Ledger Service and Phase 4's remaining seed-data item both confirmed fully closed.** Re-verified `GET /api/v1/transactions` filtering by every documented query param — `amount_min`/`amount_max`, `date_from`/`date_to`, `vendor_id`, `department_id`, `status` — plus `sort_by`/`sort_order`/`page`/`page_size`, and re-confirmed cross-field validation (`amount_min > amount_max`, `date_from > date_to`) returns clean 422s, not 500s. `scripts/seed_transactions.py` re-confirmed idempotent at exactly 260 rows after the duplicate-seeding fix above.
- 2026-07-11: **Phase 7 — Rule Engine started: duplicate detection, threshold violation, and the risk scoring engine.** Added `app/rules/duplicate.py` (flags transactions matching another on vendor_id + department_id + amount within a configurable `±duplicate_detection_window_hours`, default 24h) and `app/rules/threshold_violation.py` (flags amount > configurable `threshold_violation_amount`, default $10,000) — both new settings in `app/core/config.py`/`.env.example`, and `scripts/seed_transactions.py` now imports `settings.threshold_violation_amount` instead of its own hardcoded copy of the same number. Each rule module returns a `RuleFinding(rule_name, risk_points, details)` (`app/rules/base.py`); `app/rules/__init__.py` exposes `ACTIVE_RULES = [duplicate, threshold_violation]` as the registry future rule modules get added to. Risk scoring lives in `app/services/risk_scoring.py`: `evaluate_transaction()` runs every active rule, upserts `audit_flags` (updates an existing OPEN flag's `risk_points`/`details` in place if the rule still fires, resolves it with `status=RESOLVED`+`resolved_at` if it stops firing, so re-running never piles up duplicate flag rows), sums `risk_points` into `transactions.risk_score`, and buckets it into `risk_level` via score bands (≥75 CRITICAL, ≥50 HIGH, ≥25 MEDIUM, ≥1 LOW, 0 → null) — using duplicate=40/threshold=30 per docs/design.docx's example weights. Added two endpoints in `app/api/rule_engine.py`, both behind the existing JWT `get_current_user` dependency (no extra role restriction, matching the Phase 6 ledger endpoints): `POST /api/v1/transactions/{id}/evaluate` (re-evaluates one transaction, returns its updated risk_score/risk_level/open flags, 404 if missing) and `POST /api/v1/transactions/evaluate-all` (batch-evaluates every transaction, returns evaluated/flagged counts and a risk_level breakdown). Verified end-to-end against the live server and the seeded 260-row dataset: `evaluate-all` correctly flagged exactly 24 transactions (12 `duplicate` = all 6 seeded duplicate pairs, 12 `threshold_violation` = the 8 dedicated threshold anomalies plus 4 of the round-number-anomaly transactions that happened to land on $15,000, which legitimately also exceeds the $10k threshold) — cross-checked directly against `audit_flags`/`transactions` via psql, all `risk_score`/`risk_level` values correct (30/MEDIUM, 40/MEDIUM). Confirmed idempotency by re-running `evaluate-all` immediately after: identical counts, no duplicate flag rows. Confirmed the resolve path by manually changing one duplicate counterpart's amount, re-evaluating: `risk_score` dropped to 0, the old flag flipped to `RESOLVED` (kept, not deleted) — then restored the amount and re-ran `evaluate-all`, which correctly created a fresh `OPEN` duplicate flag and brought the count back to 24.
- 2026-07-11: **Bug fix: `status=flagged` ledger filter didn't surface rule-engine-flagged transactions, and there was no way to filter by risk_level at all.** User reported `evaluate-all` reporting `flagged_count=24` while `GET /transactions?status=flagged` only returned 7, with `risk_score=0`/`risk_level=null` on those 7. Root cause (confirmed directly in Postgres, not a persistence bug — `evaluate-all` was correctly writing `risk_score`/`risk_level` all along): `transactions.status` (`pending`/`approved`/`rejected`/`flagged`/`cleared`) is a workflow field randomly assigned by the seed script, completely independent of `risk_score`/`risk_level`, which only the rule engine sets — the shared word "flagged" was a coincidence, not a real link. Notably 18 of the 24 rule-engine-flagged transactions currently have `status=APPROVED` or `CLEARED`. Asked the user whether the rule engine should also set `status=FLAGGED` on `risk_score > 0` (which would silently overwrite those 18 prior approvals) — they chose **not** to couple the two; `status` stays a purely human/workflow field. Fix: added `risk_level` as a `TransactionFilterParams` field (`app/schemas/transaction.py`) and wired it into `GET /transactions` (`app/api/transactions.py`). Also fixed a knock-on issue this surfaced: `scripts/seed_transactions.py`'s `clear_transactions()` started failing with a `ForeignKeyViolation` once `audit_flags` rows existed (from running `evaluate-all`), since it deliberately doesn't cascade — now clears `audit_flags` first (safe: it's entirely rule-engine-derived, regenerated by re-running evaluate-all) while still leaving `audit_cases`/`audit_notes` alone. Re-verified end-to-end on a fresh reseed: `evaluate-all` → 24 flagged → `GET /transactions?risk_level=medium` returns exactly those 24 with correct `risk_score`/`risk_level` on every row, composes correctly with `sort_by=amount`, rejects an invalid `risk_level` value with 422, and `status=flagged` still correctly returns its unrelated 7.

## What's next (top priority, always keep this current)
1. Rule engine (Phase 7) — round-number detection (seed data already has 10 round-number anomalies to test against) and debit/credit validation
2. Rule engine (Phase 7) — vendor-account pairing and inactive vendor (2 vendors already seeded inactive: VEND-016, VEND-017)
3. Rule engine (Phase 7) — split payment detection, weekend/holiday transactions, missing approval, Benford's Law analysis; revisit the risk-level score bands in `app/services/risk_scoring.py` once more rules are feeding into the total (currently tuned for just duplicate+threshold maxing out at 70)

## Blockers / open questions
- —

## Key decisions log
_(Record anything you decided that deviates from the original design doc, so future-you knows why)_

- design.docx lists table names only, no columns — column design was inferred from requirements.md and the rule engine list (Phase 7) in design.docx.
- `transactions.risk_score`/`risk_level` are denormalized columns (not computed on the fly) so ledger search/filtering by risk stays index-backed per the NFR-4 performance requirement; the rule engine (Phase 7) will write to them.
- `audit_flags.rule_name` is a plain indexed string, not a DB enum, so new rule modules can be added without a migration.
- `audit_notes.cited_policy_ids`/`cited_case_ids` are JSON arrays of IDs rather than join tables — keeps the explainability citation list simple; may revisit as a proper many-to-many if we need to query "which notes cite policy X" efficiently.
- `audit_logs` has no `updated_at` and is treated as insert-only at the ORM level (NFR-2 immutability) — nothing currently enforces this at the DB level (e.g. no revoked UPDATE/DELETE grants); revisit if that becomes a compliance requirement.
- `/auth/login` accepts a JSON body (`email`/`password`) rather than OAuth2 form-encoded fields — simpler for a JSON-only API; `OAuth2PasswordBearer` is still used purely to extract the `Authorization: Bearer` header on protected routes, so Swagger's "Authorize" button still works for testing.
- `bcrypt` pinned to `4.0.1` alongside `passlib==1.7.4` — newer bcrypt (4.1+) removed an attribute passlib's version probe reads, which breaks hashing at import time.
- `require_role(*role_names)` matches role names case-insensitively (`casefold()`) since `roles.name` is admin-editable free text, not a fixed enum.
- Ledger endpoints (`GET /transactions`, `GET /transactions/{id}`) are open to any authenticated role (just `get_current_user`, no `require_role`) per the Phase 6 task — viewing the ledger isn't role-restricted, only actions like approving/flagging will be later.
- `TransactionFilterParams` is a Pydantic model bound directly as query params (FastAPI 0.115's "query parameter models": `Annotated[TransactionFilterParams, Query()]`), not individual `Query(...)` function args — keeps cross-field validation (date range, amount range) in one place via `@model_validator`, and `extra="forbid"` rejects unknown query params instead of silently ignoring them.
- `scripts/seed_transactions.py` uses a fixed `THRESHOLD_AMOUNT = 10000.00` purely as a reference point for generating "obviously too large" anomaly transactions — it does not seed `approval_limits` rows. Actual per-department/role thresholds for the Phase 7 rule engine should be seeded separately (or read from `approval_limits`) when that rule is implemented.
- Rule modules (`app/rules/*.py`) share a plain interface — `RULE_NAME: str` + `evaluate(transaction, db) -> RuleFinding | None` — rather than a class hierarchy; `app/rules/__init__.py`'s `ACTIVE_RULES` list is the only place a new rule module needs to be registered. Chosen over an ABC/plugin registry since 10 total rules (per design.docx) doesn't justify the extra machinery.
- `evaluate_transaction()` (`app/services/risk_scoring.py`) upserts `audit_flags` instead of always inserting a fresh row: an existing `OPEN` flag for a still-triggering rule gets its `risk_points`/`details` updated in place, and a flag whose rule stops triggering is marked `RESOLVED` (not deleted) — keeps `POST .../evaluate` and `.../evaluate-all` safe to call repeatedly (same lesson as the seed-script idempotency bug above) while preserving audit history instead of silently losing it.
- `threshold_violation_amount` (default $10,000) and `duplicate_detection_window_hours` (default 24h) are configurable via `Settings`/`.env`, not hardcoded in the rule modules, per the task's "configurable amount threshold" requirement. `scripts/seed_transactions.py` now reads the same `settings.threshold_violation_amount` instead of its own copy of the number, so the seed data and the rule that scores it can't drift apart.
- Risk-level score bands (`_RISK_LEVEL_BANDS` in `app/services/risk_scoring.py`: ≥75 CRITICAL, ≥50 HIGH, ≥25 MEDIUM, ≥1 LOW) are inferred, not specified in design.docx — it only gives one example (duplicate 40 + threshold 30 + vendor 15 + weekend 10 + round-number 5 = 100 → Critical). With only duplicate+threshold implemented so far (max 70), the bands are deliberately loose so a single rule lands in MEDIUM and both together land in HIGH; expect to retune once more rules contribute to the total.
- Rule engine / risk scoring endpoints (`POST /transactions/{id}/evaluate`, `POST /transactions/evaluate-all`) use `get_current_user` only, no `require_role` — matches the Phase 6 ledger endpoints' precedent (view/compute actions open to any authenticated role); revisit if the roadmap later restricts who can trigger re-scoring.
- `transactions.status` (workflow: pending/approved/rejected/flagged/cleared) and `risk_score`/`risk_level` (computed by the rule engine) are deliberately **not** coupled — `evaluate_transaction()` never touches `status`. Considered auto-setting `status=FLAGGED` when `risk_score > 0`, but that would silently overwrite transactions a human had already marked `APPROVED`/`CLEARED`; user explicitly chose to keep `status` as a purely human/workflow field. Filtering for rule-engine findings should use the `risk_level` ledger filter (added this session), not `status=flagged`.
- `scripts/seed_transactions.py`'s `clear_transactions()` also deletes `audit_flags` before deleting transactions (not just transactions) — once the Phase 7 rule engine has run, `audit_flags` rows reference transactions and a plain DELETE on `transactions` alone raises a `ForeignKeyViolation`. Safe because `audit_flags` is entirely rule-engine-derived output (regenerated by re-running `evaluate-all`); `audit_cases`/`audit_notes` are still deliberately left alone.

---

## Setup note for Claude Code
Add this to your `CLAUDE.md` at the repo root so updates happen automatically:

```
At the end of every working session, update PROGRESS.md:
- Move any newly finished checklist items to [x]
- Add a dated bullet under "What's done"
- Rewrite "What's next" with the actual next 1-3 priorities
- Log any architecture/schema decisions that differ from the original design doc
```