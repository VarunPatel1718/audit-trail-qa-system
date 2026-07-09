# Audit Trail Q&A System — Progress Tracker

> Keep this file at the root of your repo. Update it at the end of every work session (ask Claude Code to do it automatically — see instructions at the bottom). This is your single source of truth across devices.

**Last updated:** 2026-07-10
**Current phase:** Phase 6 — Ledger Service

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
- [ ] Seed synthetic ledger + audit data

### Phase 5 — Backend Foundation
- [x] FastAPI project scaffolded
- [x] JWT authentication
- [x] Role-based authorization
- [x] Logging + exception handling
- [x] Config management (.env, settings)

### Phase 6 — Ledger Service
- [ ] Search & filter transactions
- [ ] Pagination
- [ ] Sorting
- [ ] Input validation

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

## What's next (top priority, always keep this current)
1. Ledger Service (Phase 6): search/filter/sort/paginate transactions endpoint
2. Seed synthetic ledger + audit data for local dev/testing (Phase 4 remainder)
3. Rule engine (Phase 7) — start with duplicate detection and threshold violation

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