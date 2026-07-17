import { Link, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { TransactionSummaryCard } from '../components/TransactionSummaryCard'
import { RiskFindingsCard } from '../components/RiskFindingsCard'
import { AuditNoteContent } from '../components/AuditNoteContent'
import { GenerateNoteEmptyState } from '../components/GenerateNoteEmptyState'
import { useAuth } from '../context/AuthContext'
import { useTransactionData } from '../hooks/useTransactionData'
import { generateAuditNote } from '../lib/transactions'
import { CARD_CLASS, SECTION_TITLE_CLASS } from '../lib/pageStyles'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function TransactionDetailsPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const isValidId = Number.isFinite(transactionId)

  const { detailQuery, flagsQuery, auditNoteQuery, refetchAuditNote } = useTransactionData(
    transactionId,
    isValidId,
  )

  const generateMutation = useMutation({
    mutationFn: () => generateAuditNote(transactionId),
    onSuccess: () => refetchAuditNote(),
  })

  if (!isValidId) {
    return (
      <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <p className="font-sans text-sm text-muted-light dark:text-muted-dark">
            Invalid transaction id.
          </p>
        </div>
      </div>
    )
  }

  const tx = detailQuery.data

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <Link
              to="/ledger"
              className="font-sans text-[12.5px] font-semibold text-gold-light hover:underline dark:text-gold-dark"
            >
              ← Back to Ledger Explorer
            </Link>
            <h1 className="mt-1.5 font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              {tx ? tx.transaction_ref : `Transaction #${transactionId}`}
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Transaction detail, risk findings, and audit note
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <Link
              to={`/audit-workspace/${transactionId}`}
              className="rounded-lg bg-gold-light px-4 py-2 font-sans text-[13px] font-bold text-on-gold-light dark:bg-gold-dark dark:text-on-gold-dark"
            >
              Open in Audit Workspace
            </Link>
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        {detailQuery.isLoading && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">
              Loading transaction…
            </p>
          </div>
        )}

        {detailQuery.isError && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              Transaction not found.
            </p>
          </div>
        )}

        {tx && <TransactionSummaryCard tx={tx} />}

        <RiskFindingsCard
          isLoading={flagsQuery.isLoading}
          isError={flagsQuery.isError}
          data={flagsQuery.data}
        />

        <div className={CARD_CLASS}>
          <h2 className={`${SECTION_TITLE_CLASS} mb-4`}>Audit Note</h2>

          {auditNoteQuery.isLoading && (
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Loading…</p>
          )}

          {auditNoteQuery.isError && (
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              Failed to load audit note.
            </p>
          )}

          {auditNoteQuery.isSuccess && auditNoteQuery.data === null && (
            <GenerateNoteEmptyState
              onGenerate={() => generateMutation.mutate()}
              isPending={generateMutation.isPending}
              error={generateMutation.isError ? generateMutation.error : null}
            />
          )}

          {auditNoteQuery.data && (
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center rounded-full border border-divider-light px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-light dark:border-divider-dark dark:text-muted-dark">
                {auditNoteQuery.data.status}
              </span>
              <AuditNoteContent note={auditNoteQuery.data} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
