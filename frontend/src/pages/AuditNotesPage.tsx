import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { fetchAuditNotes } from '../lib/transactions'
import { errorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'
import type { AuditNoteStatus } from '../types/api'

const STATUS_FILTERS: { value: AuditNoteStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

// Same neutral badge styling AuditWorkspacePage.tsx uses for a note's status.
const STATUS_BADGE_CLASS =
  'inline-flex w-fit items-center rounded-full border border-divider-light px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-light dark:border-divider-dark dark:text-muted-dark'

const HEADER_CELL_CLASS =
  'border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AuditNotesPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<AuditNoteStatus | ''>('')

  const notesQuery = useQuery({
    queryKey: ['audit-notes', statusFilter],
    queryFn: () => fetchAuditNotes(statusFilter || undefined),
  })

  const notes = notesQuery.data ?? []
  const activeLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? 'All'

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Audit Notes
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              All generated audit notes across every transaction
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={
                statusFilter === f.value
                  ? 'rounded-lg bg-gold-light px-3.5 py-1.5 font-sans text-[12.5px] font-bold text-on-gold-light dark:bg-gold-dark dark:text-on-gold-dark'
                  : 'rounded-lg border border-input-border-light bg-input-light px-3.5 py-1.5 font-sans text-[12.5px] font-semibold text-body-light hover:opacity-80 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark'
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-surface-border-light bg-surface-light shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
          <div className="grid grid-cols-[160px_120px_1fr_1fr] gap-x-4 px-[22px] pb-3.5 pt-[18px]">
            <div className={HEADER_CELL_CLASS}>Transaction</div>
            <div className={HEADER_CELL_CLASS}>Status</div>
            <div className={HEADER_CELL_CLASS}>Submitted</div>
            <div className={HEADER_CELL_CLASS}>Reviewed</div>

            {notesQuery.isLoading && (
              <div className="col-span-4 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                Loading audit notes…
              </div>
            )}

            {notesQuery.isError && (
              <div className="col-span-4 py-6 text-center font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
                {errorMessage(notesQuery.error, 'Failed to load audit notes.')}
              </div>
            )}

            {notesQuery.isSuccess && notes.length === 0 && (
              <div className="col-span-4 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                {statusFilter ? `No notes in ${activeLabel} status.` : 'No audit notes yet.'}
              </div>
            )}

            {notes.map((note) => (
              <Link key={note.id} to={`/audit-workspace/${note.transaction_id}`} className="contents group">
                <div className="flex items-center border-b border-divider-light py-3.5 font-mono text-[13px] text-body-light group-hover:text-gold-light group-hover:underline dark:border-divider-dark dark:text-body-dark dark:group-hover:text-gold-dark">
                  Transaction #{note.transaction_id}
                </div>
                <div className="flex items-center border-b border-divider-light py-3.5 dark:border-divider-dark">
                  <span className={STATUS_BADGE_CLASS}>{note.status}</span>
                </div>
                <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13px] text-body-light dark:border-divider-dark dark:text-body-dark">
                  {note.submitted_at ? formatDate(note.submitted_at) : '—'}
                </div>
                <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13px] text-body-light dark:border-divider-dark dark:text-body-dark">
                  {note.reviewed_at ? formatDate(note.reviewed_at) : '—'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
