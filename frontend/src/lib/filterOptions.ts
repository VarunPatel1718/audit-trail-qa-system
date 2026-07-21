import type { RiskLevel, TransactionStatus } from '../types/api'

/**
 * There is still no departments list endpoint (see PROGRESS.md's Phase 11
 * decisions log). These are the real rows from `scripts/seed_transactions.py`'s
 * seeded data, id-matched directly against the live DB, since a filter
 * dropdown needs the full picker list, not just the departments that happen
 * to appear on the current page. Vendors no longer live here — GET /vendors
 * exists now (Admin Panel work), so the vendor dropdown/name lookup on
 * LedgerPage.tsx fetches live via lib/vendors.ts's fetchVendors() instead.
 */
export const DEPARTMENT_OPTIONS = [
  { id: 1, name: 'Finance' },
  { id: 2, name: 'Information Technology' },
  { id: 3, name: 'Marketing' },
  { id: 4, name: 'Operations' },
  { id: 5, name: 'Human Resources' },
  { id: 6, name: 'Sales' },
  { id: 7, name: 'Legal' },
  { id: 8, name: 'Procurement' },
]

export const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'cleared', label: 'Cleared' },
]

export const RISK_LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const SORT_FIELD_OPTIONS: { value: 'transaction_date' | 'amount' | 'risk_score' | 'created_at'; label: string }[] = [
  { value: 'transaction_date', label: 'Transaction Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'risk_score', label: 'Risk Score' },
  { value: 'created_at', label: 'Date Added' },
]

export function departmentName(id: number): string {
  return DEPARTMENT_OPTIONS.find((d) => d.id === id)?.name ?? `Department #${id}`
}
