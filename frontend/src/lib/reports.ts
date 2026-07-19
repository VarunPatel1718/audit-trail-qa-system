import { apiClient } from './apiClient'
import { fetchTransactions } from './transactions'

export type ReportableRiskLevel = 'medium' | 'high' | 'critical'

const REPORTABLE_RISK_LEVELS: ReportableRiskLevel[] = ['medium', 'high', 'critical']

export interface ReportFilters {
  date_from?: string
  date_to?: string
  department_id?: number
  risk_level?: ReportableRiskLevel
}

export interface ReportPreviewCounts {
  total: number
  medium: number
  high: number
  critical: number
}

/**
 * There's no backend count/summary endpoint for the report -- only the CSV
 * export itself. Gets an exact, cheap live count the same way Dashboard
 * already does for its stat cards (`page_size: 1`, just read `total` off a
 * real filtered `GET /transactions` query -- no rows actually transferred).
 * Since the report is always risk_level medium/high/critical, this issues
 * one `page_size: 1` request per relevant level (just the one selected
 * level, if the user picked one) and sums the totals -- exactly mirrors
 * what the backend's `risk_level IN (medium, high, critical)` filter counts.
 */
export async function fetchReportPreviewCounts(filters: ReportFilters): Promise<ReportPreviewCounts> {
  const levels = filters.risk_level ? [filters.risk_level] : REPORTABLE_RISK_LEVELS

  const results = await Promise.all(
    levels.map((risk_level) =>
      fetchTransactions({
        date_from: filters.date_from,
        date_to: filters.date_to,
        department_id: filters.department_id,
        risk_level,
        page_size: 1,
      }),
    ),
  )

  const counts: ReportPreviewCounts = { total: 0, medium: 0, high: 0, critical: 0 }
  levels.forEach((level, i) => {
    counts[level] = results[i].total
  })
  counts.total = counts.medium + counts.high + counts.critical
  return counts
}

function todayReportFilename(): string {
  return `audit_report_${new Date().toISOString().slice(0, 10)}.csv`
}

/**
 * Triggers a real browser file download of the CSV export. Can't use a plain
 * `<a href>`/`window.location` navigation (the task's suggested default) since
 * `GET /reports/export` requires a Bearer token in the `Authorization`
 * header, which a browser navigation never sends -- only `apiClient`'s axios
 * interceptor attaches it. Fetches the file as a blob instead (still a real
 * download, not a fetch-and-display-as-text: the blob is immediately handed
 * to the browser's native save mechanism via an object URL + a synthetic
 * `<a download>` click, never rendered on the page).
 *
 * Doesn't read the backend's `Content-Disposition` filename -- the dev
 * frontend (5173) and backend (8000) are different origins, and the
 * backend's CORS config doesn't set `Access-Control-Expose-Headers`, so
 * browsers block JS from reading that response header cross-origin. Builds
 * the same `audit_report_<today>.csv` filename client-side instead.
 */
export async function downloadReportCsv(filters: ReportFilters): Promise<void> {
  const response = await apiClient.get('/reports/export', {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      department_id: filters.department_id,
      risk_level: filters.risk_level,
    },
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = todayReportFilename()
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
