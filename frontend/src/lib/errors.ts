import axios from 'axios'

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return err instanceof Error ? err.message : fallback
}

/** True for a 409 Conflict -- e.g. generate-audit-note's `draft_already_exists`
 * (a note was created elsewhere between this page's last fetch and the
 * click) or a workflow `invalid_transition`. Callers that can recover by
 * refetching the real current state, rather than just displaying the
 * error, check this before doing so. */
export function isConflictError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 409
}
