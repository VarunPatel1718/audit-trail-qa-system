import axios from 'axios'
import { apiClient } from './apiClient'
import type {
  AuditNote,
  AuditNoteStatus,
  PaginatedTransactions,
  TransactionDetail,
  TransactionFlags,
  TransactionQueryParams,
} from '../types/api'

export async function fetchTransactions(params: TransactionQueryParams): Promise<PaginatedTransactions> {
  const { data } = await apiClient.get<PaginatedTransactions>('/transactions', { params })
  return data
}

export async function fetchTransactionDetail(id: number): Promise<TransactionDetail> {
  const { data } = await apiClient.get<TransactionDetail>(`/transactions/${id}`)
  return data
}

export async function fetchTransactionFlags(id: number): Promise<TransactionFlags> {
  const { data } = await apiClient.get<TransactionFlags>(`/transactions/${id}/flags`)
  return data
}

/** Returns null (not an error) when no note exists yet -- a 404 here is an
 * expected, common state the caller checks to decide whether to show a
 * "Generate" button, not a failure. */
export async function fetchAuditNotes(status?: AuditNoteStatus): Promise<AuditNote[]> {
  const { data } = await apiClient.get<AuditNote[]>('/audit-notes', { params: { status } })
  return data
}

export async function fetchAuditNote(id: number): Promise<AuditNote | null> {
  try {
    const { data } = await apiClient.get<AuditNote>(`/transactions/${id}/audit-note`)
    return data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}

export async function generateAuditNote(id: number): Promise<AuditNote> {
  const { data } = await apiClient.post<AuditNote>(`/transactions/${id}/generate-audit-note`)
  return data
}

export async function submitAuditNote(noteId: number): Promise<AuditNote> {
  const { data } = await apiClient.post<AuditNote>(`/audit-notes/${noteId}/submit`)
  return data
}

export async function approveAuditNote(noteId: number): Promise<AuditNote> {
  const { data } = await apiClient.post<AuditNote>(`/audit-notes/${noteId}/approve`)
  return data
}

export async function rejectAuditNote(noteId: number, reason: string | null): Promise<AuditNote> {
  const { data } = await apiClient.post<AuditNote>(`/audit-notes/${noteId}/reject`, { reason })
  return data
}

/** Monday 00:00:00 local time of the current week, ISO-formatted for the API's date_from filter. */
export function startOfWeekIso(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  return monday.toISOString()
}
