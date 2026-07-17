import { useState } from 'react'
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
import {
  approveAuditNote,
  generateAuditNote,
  rejectAuditNote,
  submitAuditNote,
} from '../lib/transactions'
import { canReviewAuditNote, canSubmitAuditNote } from '../lib/auditNote'
import { errorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'
import { CARD_CLASS, LABEL_CLASS, SECTION_TITLE_CLASS } from '../lib/pageStyles'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const PRIMARY_BUTTON_CLASS =
  'rounded-lg bg-gold-light px-4 py-2 font-sans text-[13px] font-bold text-on-gold-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark'

const DANGER_BUTTON_CLASS =
  'rounded-lg border border-critical-border-light bg-transparent px-4 py-2 font-sans text-[13px] font-bold text-critical-text-light hover:bg-critical-bg-light disabled:cursor-not-allowed disabled:opacity-60 dark:border-critical-border-dark dark:text-critical-text-dark dark:hover:bg-critical-bg-dark'

const SECONDARY_BUTTON_CLASS =
  'rounded-lg border border-input-border-light bg-input-light px-4 py-2 font-sans text-[13px] font-semibold text-body-light hover:opacity-80 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark'

export function AuditWorkspacePage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const isValidId = Number.isFinite(transactionId)

  const { detailQuery, flagsQuery, auditNoteQuery, refetchAuditNote } = useTransactionData(
    transactionId,
    isValidId,
  )

  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const generateMutation = useMutation({
    mutationFn: () => generateAuditNote(transactionId),
    onSuccess: () => refetchAuditNote(),
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!auditNoteQuery.data) throw new Error('No audit note loaded')
      return submitAuditNote(auditNoteQuery.data.id)
    },
    onSuccess: () => refetchAuditNote(),
  })

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!auditNoteQuery.data) throw new Error('No audit note loaded')
      return approveAuditNote(auditNoteQuery.data.id)
    },
    onSuccess: () => refetchAuditNote(),
  })

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!auditNoteQuery.data) throw new Error('No audit note loaded')
      return rejectAuditNote(auditNoteQuery.data.id, rejectReason.trim() || null)
    },
    onSuccess: () => {
      refetchAuditNote()
      setShowRejectInput(false)
      setRejectReason('')
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
  const note = auditNoteQuery.data
  const canSubmit = canSubmitAuditNote(user?.role)
  const canReview = canReviewAuditNote(user?.role)

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <Link
              to={`/transactions/${transactionId}`}
              className="font-sans text-[12.5px] font-semibold text-gold-light hover:underline dark:text-gold-dark"
            >
              ← Back to Transaction Details
            </Link>
            <h1 className="mt-1.5 font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Audit Workspace{tx ? ` — ${tx.transaction_ref}` : ''}
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Review, submit, approve, or reject this transaction's audit note
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

        {tx && <TransactionSummaryCard tx={tx} />}

        <RiskFindingsCard
          isLoading={flagsQuery.isLoading}
          isError={flagsQuery.isError}
          data={flagsQuery.data}
        />

        <div className={CARD_CLASS}>
          <h2 className={`${SECTION_TITLE_CLASS} mb-4`}>Audit Note &amp; Review</h2>

          {auditNoteQuery.isLoading && (
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Loading…</p>
          )}

          {auditNoteQuery.isError && (
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              Failed to load audit note.
            </p>
          )}

          {auditNoteQuery.isSuccess && note === null && (
            <GenerateNoteEmptyState
              onGenerate={() => generateMutation.mutate()}
              isPending={generateMutation.isPending}
              error={generateMutation.isError ? generateMutation.error : null}
            />
          )}

          {note && (
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center rounded-full border border-divider-light px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-light dark:border-divider-dark dark:text-muted-dark">
                {note.status}
              </span>

              <AuditNoteContent note={note} />

              <div className="border-t border-divider-light pt-4 dark:border-divider-dark">
                {note.status === 'draft' && (
                  <>
                    {canSubmit ? (
                      <div className="flex flex-col items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => submitMutation.mutate()}
                          disabled={submitMutation.isPending}
                          className={PRIMARY_BUTTON_CLASS}
                        >
                          {submitMutation.isPending ? 'Submitting…' : 'Submit for Review'}
                        </button>
                        {submitMutation.isError && (
                          <p className="font-sans text-[12.5px] text-critical-text-light dark:text-critical-text-dark">
                            {errorMessage(submitMutation.error, 'Failed to submit for review.')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                        Waiting for an Auditor to submit this note for review.
                      </p>
                    )}
                  </>
                )}

                {note.status === 'submitted' && (
                  <>
                    {canReview ? (
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                            className={PRIMARY_BUTTON_CLASS}
                          >
                            {approveMutation.isPending ? 'Approving…' : 'Approve'}
                          </button>
                          {!showRejectInput && (
                            <button
                              type="button"
                              onClick={() => setShowRejectInput(true)}
                              className={DANGER_BUTTON_CLASS}
                            >
                              Reject
                            </button>
                          )}
                        </div>

                        {showRejectInput && (
                          <div className="flex w-full max-w-lg flex-col gap-2.5">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Optional reason for rejection…"
                              rows={3}
                              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
                            />
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => rejectMutation.mutate()}
                                disabled={rejectMutation.isPending}
                                className={DANGER_BUTTON_CLASS}
                              >
                                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRejectInput(false)
                                  setRejectReason('')
                                }}
                                disabled={rejectMutation.isPending}
                                className={SECONDARY_BUTTON_CLASS}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {(approveMutation.isError || rejectMutation.isError) && (
                          <p className="font-sans text-[12.5px] text-critical-text-light dark:text-critical-text-dark">
                            {errorMessage(
                              approveMutation.error ?? rejectMutation.error,
                              'Failed to update this audit note.',
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                        Waiting for a Finance Manager to review this note.
                      </p>
                    )}
                  </>
                )}

                {(note.status === 'approved' || note.status === 'rejected') && (
                  <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                    <div>
                      <div className={LABEL_CLASS}>Submitted</div>
                      <div className="mt-1 font-sans text-[13px] text-body-light dark:text-body-dark">
                        {note.submitted_at ? formatDate(note.submitted_at) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className={LABEL_CLASS}>Reviewed By</div>
                      <div className="mt-1 font-sans text-[13px] text-body-light dark:text-body-dark">
                        {note.reviewed_by_id ? `User #${note.reviewed_by_id}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className={LABEL_CLASS}>Reviewed At</div>
                      <div className="mt-1 font-sans text-[13px] text-body-light dark:text-body-dark">
                        {note.reviewed_at ? formatDate(note.reviewed_at) : '—'}
                      </div>
                    </div>
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
