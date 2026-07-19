import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { fetchCases } from '../lib/cases'
import { errorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'
import { CARD_CLASS, LABEL_CLASS } from '../lib/pageStyles'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function CaseLibraryPage() {
  const { user } = useAuth()

  const casesQuery = useQuery({
    queryKey: ['cases'],
    queryFn: fetchCases,
  })

  const cases = casesQuery.data ?? []

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Case Library
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Historical, resolved audit cases used as reference material
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        {casesQuery.isLoading && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Loading cases…</p>
          </div>
        )}

        {casesQuery.isError && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              {errorMessage(casesQuery.error, 'Failed to load the case library.')}
            </p>
          </div>
        )}

        {casesQuery.isSuccess && cases.length === 0 && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
              No cases in the library yet
            </p>
            <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
              Cases will appear here once added.
            </p>
          </div>
        )}

        {cases.length > 0 && (
          <div className="flex flex-col gap-3.5">
            {cases.map((auditCase) => (
              <div key={auditCase.id} className={CARD_CLASS}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-sans text-[14.5px] font-bold text-hi-light dark:text-hi-dark">
                      {auditCase.title}
                    </div>
                    <div className="mt-0.5 font-sans text-[12px] text-muted-light dark:text-muted-dark">
                      Created {formatDate(auditCase.created_at)} · Updated{' '}
                      {formatDate(auditCase.updated_at)}
                    </div>
                  </div>
                  {auditCase.transaction_id !== null ? (
                    <Link
                      to={`/transactions/${auditCase.transaction_id}`}
                      className="shrink-0 rounded-full border border-gold-tint-border-light bg-gold-tint-light px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-gold-light hover:opacity-80 dark:border-gold-tint-border-dark dark:bg-gold-tint-dark dark:text-gold-dark"
                    >
                      Txn #{auditCase.transaction_id}
                    </Link>
                  ) : (
                    <span className="shrink-0 rounded-full border border-surface-border-light bg-surface-light px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-muted-light dark:border-surface-border-dark dark:bg-surface-dark dark:text-muted-dark">
                      No linked transaction
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <div className={LABEL_CLASS}>Description</div>
                    <p className="mt-1 font-sans text-[13px] leading-relaxed text-body-light dark:text-body-dark">
                      {auditCase.description}
                    </p>
                  </div>
                  <div>
                    <div className={LABEL_CLASS}>Resolution</div>
                    <p className="mt-1 font-sans text-[13px] leading-relaxed text-body-light dark:text-body-dark">
                      {auditCase.resolution}
                    </p>
                  </div>
                  {auditCase.tags && (
                    <div>
                      <div className={LABEL_CLASS}>Tags</div>
                      <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                        {auditCase.tags}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
