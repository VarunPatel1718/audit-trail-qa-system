import { apiClient } from './apiClient'
import type { ActiveRulesSummary, VendorSummary } from '../types/api'

export async function fetchVendors(): Promise<VendorSummary[]> {
  const { data } = await apiClient.get<VendorSummary[]>('/vendors')
  return data
}

export async function setVendorActive(id: number, is_active: boolean): Promise<VendorSummary> {
  const { data } = await apiClient.patch<VendorSummary>(`/vendors/${id}`, { is_active })
  return data
}

export async function fetchActiveRules(): Promise<ActiveRulesSummary> {
  const { data } = await apiClient.get<ActiveRulesSummary>('/rules')
  return data
}

// Mirrors backend/app/api/vendors.py's require_role("Admin") gating exactly
// -- the app's first single-role gate -- matched case-insensitively like the
// backend's casefold() comparison, same pattern as lib/auditNote.ts's
// canSubmitAuditNote/canReviewAuditNote. Keeps the toggle non-interactive for
// roles that would just get a 403 back, rather than always rendering it live.
const ADMIN_ROLES = new Set(['admin'])

export function canManageVendors(role: string | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role.trim().toLowerCase())
}
