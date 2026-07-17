import axios from 'axios'

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return err instanceof Error ? err.message : fallback
}
