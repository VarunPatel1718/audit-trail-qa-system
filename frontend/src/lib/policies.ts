import { apiClient } from './apiClient'
import type { PolicySearchResponse } from '../types/api'

export async function searchPolicies(query: string, topK: number): Promise<PolicySearchResponse> {
  const { data } = await apiClient.post<PolicySearchResponse>('/policies/search', {
    query,
    top_k: topK,
  })
  return data
}
