import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { DEPARTMENT_OPTIONS } from '../lib/filterOptions'
import { downloadReportCsv, fetchReportPreviewCounts, type ReportableRiskLevel } from '../lib/reports'
import { errorMessage } from '../lib/errors'
import { CARD_CLASS } from '../lib/pageStyles'

interface FilterState {
  date_from: string
  date_to: string
  department_id: string
  risk_level: '' | ReportableRiskLevel
}

const EMPTY_FILTERS: FilterState = {
  date_from: '',
  date_to: '',
  department_id: '',
  risk_level: '',
}

// The export is always scoped to medium/high/critical (see report_service.py
// -- REPORTABLE_RISK_LEVELS), so "Low" is deliberately left out here: picking
// it would always yield zero rows (the backend ANDs it with that fixed
// range), which would just read as a confusing broken filter.
const RISK_LEVEL_OPTIONS: { value: ReportableRiskLevel; label: string }[] = [
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ReportsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const activeFilters = {
    date_from: filters.date_from || undefined,
    date_to: filters.date_to ? `${filters.date_to}T23:59:59` : undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    risk_level: filters.risk_level || undefined,
  }

  const previewQuery = useQuery({
    queryKey: ['reports', 'preview', activeFilters],
    queryFn: () => fetchReportPreviewCounts(activeFilters),
  })

  const counts = previewQuery.data

  const handleReset = () => setFilters(EMPTY_FILTERS)

  const handleExport = async () => {
    setIsDownloading(true)
    setDownloadError(null)
    try {
      await downloadReportCsv(activeFilters)
    } catch (err) {
      setDownloadError(errorMessage(err, 'Failed to export the report. Try again.'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Reports
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Export flagged transactions as CSV
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <div className={CARD_CLASS}>
          <p className="font-sans text-[13px] leading-relaxed text-muted-light dark:text-muted-dark">
            This exports <span className="font-semibold text-body-light dark:text-body-dark">flagged/audited
            transactions</span> (risk level medium and above) along with each one's audit note status
            (draft, submitted, approved, rejected, or "no note"). It is <span className="font-semibold text-body-light dark:text-body-dark">not</span> a
            full ledger dump — use Ledger Explorer for that.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 rounded-xl border border-surface-border-light bg-surface-light p-[18px] shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Date from
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Date to
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Department
            <select
              value={filters.department_id}
              onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">All departments</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Risk level
            <select
              value={filters.risk_level}
              onChange={(e) =>
                setFilters((f) => ({ ...f, risk_level: e.target.value as FilterState['risk_level'] }))
              }
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">Medium and above (all)</option>
              {RISK_LEVEL_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} only
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-3 flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-input-border-light bg-input-light px-4 py-2 font-sans text-[13px] font-semibold text-body-light hover:opacity-80 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark"
            >
              Reset
            </button>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {previewQuery.isLoading && (
                <p className="font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
                  Counting matching transactions…
                </p>
              )}
              {previewQuery.isError && (
                <p className="font-sans text-[13.5px] text-critical-text-light dark:text-critical-text-dark">
                  {errorMessage(previewQuery.error, 'Failed to count matching transactions.')}
                </p>
              )}
              {counts && (
                <>
                  <p className="font-sans text-[15.5px] font-bold text-hi-light dark:text-hi-dark">
                    {counts.total} transaction{counts.total === 1 ? '' : 's'} match{counts.total === 1 ? 'es' : ''}{' '}
                    these filters
                  </p>
                  <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                    {counts.medium} medium · {counts.high} high · {counts.critical} critical
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isDownloading}
              className="shrink-0 rounded-lg bg-gold-light px-5 py-2.5 font-sans text-[13px] font-bold text-on-gold-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark"
            >
              {isDownloading ? 'Preparing export…' : 'Export CSV'}
            </button>
          </div>

          {downloadError && (
            <p className="mt-3 font-sans text-[13px] text-critical-text-light dark:text-critical-text-dark">
              {downloadError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
