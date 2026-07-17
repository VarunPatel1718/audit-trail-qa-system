import { RiskBadge } from './RiskBadge'
import { CARD_CLASS, LABEL_CLASS, SECTION_TITLE_CLASS } from '../lib/pageStyles'
import { formatCurrency, formatDate } from '../lib/format'
import type { TransactionDetail } from '../types/api'

export function TransactionSummaryCard({ tx }: { tx: TransactionDetail }) {
  return (
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
          {/* Explicitly "Transaction Status" (not just "Status") to avoid
              reading as the Audit Note & Review section's workflow status
              (draft/submitted/approved/rejected) on Audit Workspace, which
              is a completely separate field with overlapping values. */}
          <div className={LABEL_CLASS}>Transaction Status</div>
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
  )
}
