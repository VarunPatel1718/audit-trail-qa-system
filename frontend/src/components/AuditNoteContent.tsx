import { LABEL_CLASS } from '../lib/pageStyles'
import { splitRejectionReason } from '../lib/auditNote'
import type { AuditNote } from '../types/api'

export function AuditNoteContent({ note }: { note: AuditNote }) {
  const { recommendedAction, rejectionReason } =
    note.status === 'rejected'
      ? splitRejectionReason(note.recommended_action)
      : { recommendedAction: note.recommended_action, rejectionReason: null }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className={LABEL_CLASS}>Summary</div>
        <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
          {note.summary}
        </p>
      </div>
      <div>
        <div className={LABEL_CLASS}>Reasoning</div>
        <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
          {note.reasoning}
        </p>
      </div>
      <div>
        <div className={LABEL_CLASS}>Risk Assessment</div>
        <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
          {note.risk_assessment}
        </p>
      </div>
      <div>
        <div className={LABEL_CLASS}>Recommended Action</div>
        <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-body-light dark:text-body-dark">
          {recommendedAction}
        </p>
      </div>

      {rejectionReason && (
        <div className="rounded-lg border border-critical-border-light bg-critical-bg-light p-3.5 dark:border-critical-border-dark dark:bg-critical-bg-dark">
          <div className="font-sans text-[11.5px] font-bold uppercase tracking-wider text-critical-text-light dark:text-critical-text-dark">
            Rejection Reason
          </div>
          <p className="mt-1 font-sans text-[13px] leading-relaxed text-critical-text-light dark:text-critical-text-dark">
            {rejectionReason}
          </p>
        </div>
      )}

      <div>
        <div className={LABEL_CLASS}>Cited Policy Clauses</div>
        {note.cited_policies.length === 0 && (
          <p className="mt-1.5 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
            No policy clauses were cited.
          </p>
        )}
        {note.cited_policies.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-2.5">
            {note.cited_policies.map((policy) => (
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
  )
}
