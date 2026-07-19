import { apiClient } from './apiClient'
import type { AuditCase } from '../types/api'

export async function fetchCases(): Promise<AuditCase[]> {
  const { data } = await apiClient.get<AuditCase[]>('/cases')
  return data
}
