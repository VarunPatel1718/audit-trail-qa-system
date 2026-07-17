// Mirrors backend/app/services/audit_note_service.py's reject_note(): with no
// dedicated rejection_reason column, the reason is appended to `content` as
// `\n\nRejection Reason: <reason>`. Since _parse_content()'s regex captures
// everything after "Recommended Action: " to end-of-string, that marker ends
// up folded into `recommended_action` on the API response. This splits it
// back out so the UI shows a clean "Rejection Reason" section instead of
// letting it look like a broken/run-on field.
const REJECTION_REASON_MARKER = '\n\nRejection Reason: '

export function splitRejectionReason(recommendedAction: string): {
  recommendedAction: string
  rejectionReason: string | null
} {
  const idx = recommendedAction.indexOf(REJECTION_REASON_MARKER)
  if (idx === -1) return { recommendedAction, rejectionReason: null }
  return {
    recommendedAction: recommendedAction.slice(0, idx),
    rejectionReason: recommendedAction.slice(idx + REJECTION_REASON_MARKER.length),
  }
}

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
