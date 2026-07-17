import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { RiskBadge } from '../components/RiskBadge'
import { useAuth } from '../context/AuthContext'
import {
  fetchAuditNote,
  fetchTransactionDetail,
  fetchTransactionFlags,
  generateAuditNote,
} from '../lib/transactions'
import { formatCurrency } from '../lib/format'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return err instanceof Error ? err.message : fallback
}

function ruleLabel(ruleName: string): string {
  return ruleName
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

const CARD_CLASS =
  'rounded-xl border border-surface-border-light bg-surface-light p-[22px] shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark'

const SECTION_TITLE_CLASS =
  'font-sans text-[15.5px] font-bold text-hi-light dark:text-hi-dark'

const LABEL_CLASS =
  'font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark'

export function TransactionDetailsPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const isValidId = Number.isFinite(transactionId)
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: ['transactions', transactionId, 'detail'],
    queryFn: () => fetchTransactionDetail(transactionId),
    enabled: isValidId,
    retry: false,
  })

  const flagsQuery = useQuery({
    queryKey: ['transactions', transactionId, 'flags'],
    queryFn: () => fetchTransactionFlags(transactionId),
    enabled: isValidId,
  })

  const auditNoteQueryKey = ['transactions', transactionId, 'audit-note']
  const auditNoteQuery = useQuery({
    queryKey: auditNoteQueryKey,
    queryFn: () => fetchAuditNote(transactionId),
    enabled: isValidId,
  })

  const generateMutation = useMutation({
    mutationFn: () => generateAuditNote(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditNoteQueryKey })
    },
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

        {tx && (
          <div className={CARD_CLASS}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={SECTION_TITLE_CLASS}>Transaction Summary</h2>
              {tx.risk_level && <RiskBadge risk={tx.risk_level} />}
            </div>
            <div className="grid grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className={LABEL_CLASS}>Vendor</div>
                <div className="mt-1 font-sans text-[13.5px] text-body-light dark:text-body-dark">
                  {tx.vendor.name}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Department</div>
                <div className="mt-1 font-sans text-[13.5px] text-body-light dark:text-body-dark">
                  {tx.department.name}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Amount</div>
                <div className="mt-1 font-mono text-[13.5px] text-hi-light dark:text-hi-dark">
                  {formatCurrency(tx.amount, tx.currency)}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Debit / Credit</div>
                <div className="mt-1 font-sans text-[13.5px] capitalize text-body-light dark:text-body-dark">
                  {tx.debit_credit}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Status</div>
                <div className="mt-1 font-sans text-[13.5px] capitalize text-body-light dark:text-body-dark">
                  {tx.status}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Transaction Date</div>
                <div className="mt-1 font-sans text-[13.5px] text-body-light dark:text-body-dark">
                  {formatDate(tx.transaction_date)}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Account Number</div>
                <div className="mt-1 font-mono text-[13.5px] text-body-light dark:text-body-dark">
                  {tx.account_number ?? '—'}
                </div>
              </div>
              <div>
                <div className={LABEL_CLASS}>Risk Score</div>
                <div className="mt-1 font-mono text-[13.5px] text-hi-light dark:text-hi-dark">
                  {tx.risk_score}
                </div>
              </div>
              <div className="col-span-4">
                <div className={LABEL_CLASS}>Description</div>
                <div className="mt-1 font-sans text-[13.5px] text-body-light dark:text-body-dark">
                  {tx.description ?? '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={CARD_CLASS}>
          <h2 className={`${SECTION_TITLE_CLASS} mb-4`}>Risk Findings</h2>

          {flagsQuery.isLoading && (
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Loading…</p>
          )}

          {flagsQuery.isError && (
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              Failed to load risk findings.
            </p>
          )}

          {flagsQuery.data && !flagsQuery.data.evaluated && (
            <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
              <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
                Not yet evaluated
              </p>
              <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                This transaction hasn't been run through the rule engine yet.
              </p>
            </div>
          )}

          {flagsQuery.data && flagsQuery.data.evaluated && flagsQuery.data.flags.length === 0 && (
            <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
              <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
                Evaluated — no open risk flags
              </p>
            </div>
          )}

          {flagsQuery.data && flagsQuery.data.flags.length > 0 && (
            <div className="flex flex-col gap-3">
              {flagsQuery.data.flags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-lg border border-divider-light p-3.5 dark:border-divider-dark"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[13.5px] font-bold text-hi-light dark:text-hi-dark">
                      {ruleLabel(flag.rule_name)}
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-gold-light dark:text-gold-dark">
                      +{flag.risk_points} pts
                    </span>
                  </div>
                  {flag.details && (
                    <p className="mt-1.5 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                      {flag.details}
                    </p>
                  )}
                  <span className="mt-2 inline-block rounded-full border border-divider-light px-2 py-0.5 font-sans text-[10.5px] font-semibold uppercase tracking-wide text-muted-light dark:border-divider-dark dark:text-muted-dark">
                    {flag.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

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
            <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
              <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
                No audit note generated yet
              </p>
              <button
                type="button"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="mt-3.5 rounded-lg bg-gold-light px-4 py-2 font-sans text-[13px] font-bold text-on-gold-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark"
              >
                {generateMutation.isPending ? 'Generating…' : 'Generate Audit Note'}
              </button>
              {generateMutation.isError && (
                <p className="mt-3 font-sans text-[12.5px] text-critical-text-light dark:text-critical-text-dark">
                  {errorMessage(generateMutation.error, 'Failed to generate audit note.')}
                </p>
              )}
            </div>
          )}

          {auditNoteQuery.data && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-divider-light px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-light dark:border-divider-dark dark:text-muted-dark">
                  {auditNoteQuery.data.status}
                </span>
              </div>

              <div>
                <div className={LABEL_CLASS}>Summary</div>
                <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
                  {auditNoteQuery.data.summary}
                </p>
              </div>
              <div>
                <div className={LABEL_CLASS}>Reasoning</div>
                <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
                  {auditNoteQuery.data.reasoning}
                </p>
              </div>
              <div>
                <div className={LABEL_CLASS}>Risk Assessment</div>
                <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
                  {auditNoteQuery.data.risk_assessment}
                </p>
              </div>
              <div>
                <div className={LABEL_CLASS}>Recommended Action</div>
                <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
                  {auditNoteQuery.data.recommended_action}
                </p>
              </div>

              <div>
                <div className={LABEL_CLASS}>Cited Policy Clauses</div>
                {auditNoteQuery.data.cited_policies.length === 0 && (
                  <p className="mt-1.5 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                    No policy clauses were cited.
                  </p>
                )}
                {auditNoteQuery.data.cited_policies.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-2.5">
                    {auditNoteQuery.data.cited_policies.map((policy) => (
                      <div
                        key={policy.policy_id}
                        className="rounded-lg border border-divider-light p-3.5 dark:border-divider-dark"
                      >
                        <div className="font-sans text-[13px] font-bold text-hi-light dark:text-hi-dark">
                          {policy.title}
                        </div>
                        <div className="mt-0.5 font-sans text-[11.5px] text-muted-light dark:text-muted-dark">
                          {policy.chapter ?? policy.document_name}
                          {policy.clause_ref ? ` · Clause ${policy.clause_ref}` : ''}
                        </div>
                        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-body-light dark:text-body-dark">
                          {policy.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
