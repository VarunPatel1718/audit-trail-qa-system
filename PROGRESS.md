# Audit Trail Q&A System — Progress Tracker

> Keep this file at the root of your repo. Update it at the end of every work session (ask Claude Code to do it automatically — see instructions at the bottom). This is your single source of truth across devices.

**Last updated:** _(update this line each session)_
**Current phase:** Phase 1 — Requirements Analysis

---

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Phase Checklist

### Phase 1 — Requirements Analysis
- [ ] Business requirements defined
- [ ] User roles identified (Auditor, Finance Manager, Admin)
- [ ] Functional & non-functional requirements documented
- [ ] Use cases written

### Phase 2 — High-Level Design (HLD)
- [ ] Architecture confirmed
- [ ] Tech stack finalized
- [ ] Service interaction diagram

### Phase 3 — Low-Level Design (LLD)
- [ ] Folder structure created
- [ ] DB schema drafted
- [ ] API contracts drafted

### Phase 4 — Database Design
- [ ] PostgreSQL schema implemented
- [ ] Relationships/foreign keys set
- [ ] Seed synthetic ledger + audit data

### Phase 5 — Backend Foundation
- [ ] FastAPI project scaffolded
- [ ] JWT authentication
- [ ] Role-based authorization
- [ ] Logging + exception handling
- [ ] Config management (.env, settings)

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

- YYYY-MM-DD: —

## What's next (top priority, always keep this current)
1. —
2. —
3. —

## Blockers / open questions
- —

## Key decisions log
_(Record anything you decided that deviates from the original design doc, so future-you knows why)_

- —

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