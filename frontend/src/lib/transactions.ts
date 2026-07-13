import { apiClient } from './apiClient'
import type { PaginatedTransactions, TransactionDetail, TransactionQueryParams } from '../types/api'

export async function fetchTransactions(params: TransactionQueryParams): Promise<PaginatedTransactions> {
  const { data } = await apiClient.get<PaginatedTransactions>('/transactions', { params })
  return data
}

export async function fetchTransactionDetail(id: number): Promise<TransactionDetail> {
  const { data } = await apiClient.get<TransactionDetail>(`/transactions/${id}`)
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
