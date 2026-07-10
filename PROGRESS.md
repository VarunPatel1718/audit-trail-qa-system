# Audit Trail Q&A System — Progress Tracker

> Keep this file at the root of your repo. Update it at the end of every work session (ask Claude Code to do it automatically — see instructions at the bottom). This is your single source of truth across devices.

**Last updated:** 2026-07-11
**Current phase:** Phase 6 — Ledger Service (complete)

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
- [ ] Duplicate detection
- [ ] Threshold violation
- [ ] Round-number detection
- [ ] Vendor-account mismatch
- [ ] Split payment detection
- [ ] Weekend/holiday transactions
- [ ] Missing approval
- [ ] Inactive vendor
- [ ] Benford's Law analysis
- [ ] Risk scoring engine

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

## What's next (top priority, always keep this current)
1. Rule engine (Phase 7) — start with duplicate detection and threshold violation, using the anomalies seeded in `scripts/seed_transactions.py` (6 duplicate pairs, 8 threshold violations >$10,000, 10 round-number amounts) as test fixtures
2. Risk scoring engine (Phase 7) — write to the denormalized `transactions.risk_score`/`risk_level` columns
3. Continue through the remaining Phase 7 rules (round-number, debit/credit validation, vendor-account pairing, split payment, weekend/holiday, missing approval, inactive vendor — 2 vendors already seeded inactive, Benford's Law)

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