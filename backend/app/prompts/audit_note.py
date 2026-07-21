"""Prompt template for drafting an explainable audit note (Phase 10).

Builds the system + user prompt for `POST /transactions/{id}/generate-audit-note`
from a flagged transaction, its open rule-engine findings, policy clauses
retrieved via the Phase 8 RAG service (`app.services.policy_search`), and
similar past audit cases retrieved via `app.services.case_search`. The case
corpus is empty as of this writing (`audit_cases` has never been seeded), so
`_format_cases()`'s empty-list branch is what every real generation call
exercises today -- see PROGRESS.md for the honest "untested against real
case data" caveat this implies.
"""

from app.models.audit_flag import AuditFlag
from app.models.transaction import Transaction
from app.schemas.case import CaseSearchResult
from app.schemas.policy import PolicySearchResult

# Human-readable descriptions of each rule module, so Claude doesn't have to
# guess what a bare rule_name like "vendor_account_mismatch" means.
RULE_DESCRIPTIONS: dict[str, str] = {
    "duplicate": "Duplicate payment: matches another transaction on vendor, department, and amount within a short time window.",
    "threshold_violation": "Threshold violation: the payment amount exceeds the configured approval threshold.",
    "round_number": "Round-number amount: the payment is an exact multiple of $100, a pattern associated with estimated rather than invoiced amounts.",
    "debit_credit_mismatch": "Debit/credit mismatch: a vendor payment was recorded as a CREDIT instead of a DEBIT.",
    "vendor_account_mismatch": "Vendor-account mismatch: the account number on the transaction does not match the vendor's registered bank account.",
    "split_payment": "Split payment (structuring): multiple payments to the same vendor in a short window, each individually under the approval threshold, that sum to at or above it.",
    "weekend_holiday": "Weekend/holiday transaction: processed on a non-business day.",
    "missing_approval": "Missing approval: the transaction is approved/cleared but has no recorded approver.",
    "inactive_vendor": "Inactive vendor: the payment was made to a vendor marked inactive in the vendor master.",
    "manual": "Manually flagged by an auditor for review.",
}

# Short natural-language phrases per rule, used to build the RAG query over
# the policy corpus — descriptive phrases retrieve better than raw rule_name
# tokens (verified in Phase 8).
_POLICY_QUERY_HINTS: dict[str, str] = {
    "duplicate": "duplicate payment detection and reporting",
    "threshold_violation": "transaction amount approval threshold",
    "round_number": "round number or estimated amount transactions",
    "debit_credit_mismatch": "transaction classification and recording accuracy",
    "vendor_account_mismatch": "vendor bank account verification",
    "split_payment": "structuring transactions to avoid an approval threshold",
    "weekend_holiday": "transactions processed outside business hours",
    "missing_approval": "approval authorization requirements for transactions",
    "inactive_vendor": "payments to inactive or deactivated vendors",
    "manual": "internal audit review of a flagged transaction",
}

SYSTEM_PROMPT = """You are an internal audit assistant for a finance team's Audit Trail Q&A System.

You are given a flagged financial transaction, the specific rule-engine findings that flagged it, a set of candidate accounting/compliance policy clauses retrieved via semantic search, and a set of candidate similar past audit cases retrieved via semantic search. Draft a structured, explainable audit note that a human auditor will review and a Finance Manager will approve or reject.

Rules you must follow:
- Ground every factual claim in the transaction, flag, policy, and case data provided below. Do not invent amounts, dates, policy clause numbers, document names, or case details that are not present in the context.
- Only include a policy_id in cited_policy_ids if its retrieved content is genuinely relevant to explaining or justifying this specific flag. If none of the retrieved policies are actually relevant, return an empty list — do not cite a policy just because it was retrieved.
- Keep cited_policy_ids consistent with reasoning: every policy_id you discuss or reference in reasoning must also appear in cited_policy_ids, and every policy_id in cited_policy_ids must be discussed in reasoning. Never mention a policy_id in your reasoning text without also adding it to the cited_policy_ids list.
- If the retrieved policies don't clearly address the flagged issue, say so plainly in your reasoning instead of forcing a connection.
- Only include a case_id in cited_case_ids if that past case is genuinely similar and useful precedent for this specific flag (same kind of issue, comparable circumstances, or a resolution pattern worth following). If no similar cases were retrieved, or none of the retrieved ones are actually relevant, return an empty list for cited_case_ids — this is the normal, expected outcome and needs no comment or apology in your reasoning.
- Keep cited_case_ids consistent with reasoning the same way as cited_policy_ids: every case_id you discuss must also appear in cited_case_ids, and every case_id in cited_case_ids must be discussed in reasoning.
- When describing what a cited clause requires, match its actual verb — e.g. a clause that says a transaction type "shall be monitored" requires monitoring, not a "violation" or something "prohibited". Only use prohibitive language (violation, breach, prohibited, not permitted) if the clause text itself is prohibitive. Overstating a monitoring or reporting requirement as a violation misrepresents the policy to the reviewer.
- Write for a human reviewer who will verify your reasoning, not just trust it — be specific about which rule finding, policy clause, and/or similar case (if any) support each point."""


def build_policy_query(flags: list[AuditFlag]) -> str:
    """Build a natural-language RAG query from a transaction's open flags."""
    seen: set[str] = set()
    hints: list[str] = []
    for flag in flags:
        if flag.rule_name in seen:
            continue
        seen.add(flag.rule_name)
        hints.append(_POLICY_QUERY_HINTS.get(flag.rule_name, flag.rule_name.replace("_", " ")))
    return "; ".join(hints)


def _format_transaction(transaction: Transaction) -> str:
    return (
        f"- Reference: {transaction.transaction_ref}\n"
        f"- Vendor: {transaction.vendor.name} (code {transaction.vendor.vendor_code}, "
        f"active={transaction.vendor.is_active})\n"
        f"- Department: {transaction.department.name}\n"
        f"- Amount: {transaction.amount} {transaction.currency}\n"
        f"- Debit/Credit: {transaction.debit_credit.value}\n"
        f"- Account number on transaction: {transaction.account_number}\n"
        f"- Transaction date: {transaction.transaction_date.isoformat()}\n"
        f"- Status: {transaction.status.value}\n"
        f"- Description: {transaction.description or '(none)'}\n"
        f"- Current risk score / level: {transaction.risk_score} / "
        f"{transaction.risk_level.value if transaction.risk_level else 'none'}"
    )


def _format_flags(flags: list[AuditFlag]) -> str:
    lines = []
    for flag in flags:
        description = RULE_DESCRIPTIONS.get(flag.rule_name, flag.rule_name)
        lines.append(
            f"- [{flag.rule_name}] {description}\n"
            f"  Risk points: {flag.risk_points}\n"
            f"  Details: {flag.details or '(none)'}"
        )
    return "\n".join(lines)


def _format_policies(policies: list[PolicySearchResult]) -> str:
    if not policies:
        return "(no policy clauses retrieved)"
    lines = []
    for policy in policies:
        clause = f"clause {policy.clause_ref}" if policy.clause_ref else "no clause reference"
        chapter = f", {policy.chapter}" if policy.chapter else ""
        lines.append(
            f"- policy_id={policy.policy_id} | {policy.document_name} ({clause}{chapter}) "
            f"[relevance score {policy.score:.3f}]\n"
            f"  \"{policy.content}\""
        )
    return "\n".join(lines)


def _format_cases(cases: list[CaseSearchResult]) -> str:
    if not cases:
        return "(no similar cases retrieved)"
    lines = []
    for case in cases:
        tags = f" | tags: {case.tags}" if case.tags else ""
        lines.append(
            f"- case_id={case.case_id} | \"{case.title}\" [relevance score {case.score:.3f}]{tags}\n"
            f"  Description: {case.description}\n"
            f"  Resolution: {case.resolution}"
        )
    return "\n".join(lines)


def build_user_message(
    transaction: Transaction,
    flags: list[AuditFlag],
    policies: list[PolicySearchResult],
    cases: list[CaseSearchResult],
) -> str:
    return (
        "## Flagged Transaction\n"
        f"{_format_transaction(transaction)}\n\n"
        "## Rule-Engine Findings (open flags)\n"
        f"{_format_flags(flags)}\n\n"
        "## Retrieved Policy Clauses (candidates — cite only if genuinely relevant)\n"
        f"{_format_policies(policies)}\n\n"
        "## Similar Past Cases (candidates — cite only if genuinely relevant)\n"
        f"{_format_cases(cases)}\n\n"
        "Draft the audit note now."
    )
