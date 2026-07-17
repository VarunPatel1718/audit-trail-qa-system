import type { RiskLevel, TransactionStatus } from '../types/api'

/**
 * There is no vendors/departments list endpoint (see PROGRESS.md's Phase 11
 * decisions log — the same gap the Dashboard's per-row detail fetch works
 * around). These are the real rows from `scripts/seed_transactions.py`'s
 * seeded data, id-matched directly against the live DB, since a filter
 * dropdown needs the full picker list, not just the vendors/departments that
 * happen to appear on the current page.
 */
export const VENDOR_OPTIONS = [
  { id: 1, name: 'Acme Office Supplies' },
  { id: 2, name: 'Northwind Logistics' },
  { id: 3, name: 'Globex Industrial Parts' },
  { id: 4, name: 'Initech Software Licensing' },
  { id: 5, name: 'Umbrella Facilities Group' },
  { id: 6, name: 'Stark Engineering Services' },
  { id: 7, name: 'Wayne Consulting Partners' },
  { id: 8, name: 'Wonka Catering Co' },
  { id: 9, name: 'Hooli Cloud Services' },
  { id: 10, name: 'Pied Piper Data Systems' },
  { id: 11, name: 'Massive Dynamic Research' },
  { id: 12, name: 'Soylent Marketing Group' },
  { id: 13, name: 'Cyberdyne IT Hardware' },
  { id: 14, name: 'Aperture Lab Supplies' },
  { id: 15, name: 'Gringotts Financial Advisory' },
  { id: 16, name: 'Legacy Print & Signage' },
  { id: 17, name: 'Discontinued Freight Co' },
]

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

export function vendorName(id: number): string {
  return VENDOR_OPTIONS.find((v) => v.id === id)?.name ?? `Vendor #${id}`
}

export function departmentName(id: number): string {
  return DEPARTMENT_OPTIONS.find((d) => d.id === id)?.name ?? `Department #${id}`
}
