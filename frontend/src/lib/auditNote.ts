// Mirrors backend/app/api/audit_notes.py's require_role() gating exactly
// (submit: Auditor/Admin, approve+reject: Finance Manager/Admin), matched
// case-insensitively like the backend's casefold() comparison -- so the UI
// only shows actions a role can actually perform, rather than always
// rendering them and relying on a 403 to hide the mistake.
const SUBMIT_ROLES = new Set(['auditor', 'admin'])
const REVIEW_ROLES = new Set(['finance manager', 'admin'])

function roleMatches(role: string | undefined, allowed: Set<string>): boolean {
  return !!role && allowed.has(role.trim().toLowerCase())
}

export function canSubmitAuditNote(role: string | undefined): boolean {
  return roleMatches(role, SUBMIT_ROLES)
}

export function canReviewAuditNote(role: string | undefined): boolean {
  return roleMatches(role, REVIEW_ROLES)
}
