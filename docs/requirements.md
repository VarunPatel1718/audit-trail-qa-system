# Requirements — Audit Trail Q&A System

Source: [docs/design.docx](design.docx) (system spec) and [docs/roadmap.docx](roadmap.docx) (phased build plan), Phase 1: Requirements Analysis.

## 1. User Roles

### Auditor
The primary day-to-day user. Filters and searches the ledger for transactions, reviews anomalies surfaced by the rule engine and their risk scores, inspects retrieved policy clauses and similar historical cases, and reviews/edits the AI-drafted audit note before submitting it for approval.

### Finance Manager
Reviews and approves (or rejects) audit notes submitted by auditors, oversees risk scores and flagged transactions at a department/vendor level, manages approval limits, and consumes dashboards and reports to track audit throughput and outstanding risk.

### Admin
Manages users, roles, and permissions; configures system settings such as rule thresholds and risk-scoring weights; maintains reference data (vendors, departments, approval limits); uploads and manages accounting policy documents used by the RAG pipeline; and has visibility into system-wide audit logs.

## 2. Functional Requirements

1. **Authentication & Authorization** — Users log in via JWT-based authentication; access to features and data is restricted by role (Auditor, Finance Manager, Admin).
2. **Ledger Search & Filtering** — Users can search, filter, sort, and paginate ledger transactions (by date, vendor, department, amount, status, etc.).
3. **Rule-Based Anomaly Detection** — The system evaluates each transaction against deterministic rules (duplicate detection, threshold violations, round-number detection, debit/credit validation, vendor-account mismatch, split payments, weekend/holiday transactions, missing approval, inactive vendor, Benford's Law analysis) and flags anomalies.
4. **Risk Scoring** — Flagged anomalies are combined into a weighted overall risk score per transaction (e.g., Critical/High/Medium/Low).
5. **Policy & Case Retrieval (RAG)** — The system retrieves relevant accounting policy clauses and similar resolved audit cases from a vector database, using semantic search over embedded policy documents and historical cases.
6. **AI-Generated Audit Notes** — Given a flagged transaction, the system uses the Claude API to draft a structured, explainable audit note grounded in the retrieved policies and cases.
7. **Human Review & Approval Workflow** — Auditors review and edit AI-drafted notes; Finance Managers approve or reject them before the note is finalized and archived.
8. **Dashboards & Reporting** — Users can view KPI dashboards and generate/export reports summarizing anomalies, risk levels, and audit outcomes.
9. **PDF Export** — Users can export finalized audit notes and reports as PDF documents for offline review, archival, and sharing outside the system.

## 3. Non-Functional Requirements

1. **Security** — All financial and audit data is protected by role-based access control and JWT authentication; sensitive endpoints require authorization checks; no unauthorized role may access or modify data outside its scope.
2. **Auditability & Immutability** — Every material action (flag, note generation, edit, approval) is written to an immutable audit log (`audit_logs`) so the audit trail itself cannot be altered after the fact.
3. **Explainability** — AI-generated audit notes must cite the specific policy clauses and/or historical cases that informed them, so a human reviewer can verify the reasoning rather than trust an opaque output.
4. **Performance & Scalability** — Ledger search, rule evaluation, and RAG retrieval must remain responsive (paginated queries, indexed lookups) as transaction volume scales to enterprise-sized ledgers.
