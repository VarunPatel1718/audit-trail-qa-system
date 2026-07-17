import { CARD_CLASS, SECTION_TITLE_CLASS } from '../lib/pageStyles'
import { ruleLabel } from '../lib/rules'
import type { TransactionFlags } from '../types/api'

interface RiskFindingsCardProps {
  isLoading: boolean
  isError: boolean
  data: TransactionFlags | undefined
}

export function RiskFindingsCard({ isLoading, isError, data }: RiskFindingsCardProps) {
  return (
    <div className={CARD_CLASS}>
      <h2 className={`${SECTION_TITLE_CLASS} mb-4`}>Risk Findings</h2>

      {isLoading && (
        <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Loading…</p>
      )}

      {isError && (
        <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
          Failed to load risk findings.
        </p>
      )}

      {data && !data.evaluated && (
        <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
          <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
            Not yet evaluated
          </p>
          <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
            This transaction hasn't been run through the rule engine yet.
          </p>
        </div>
      )}

      {data && data.evaluated && data.flags.length === 0 && (
        <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
          <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
            Evaluated — no open risk flags
          </p>
        </div>
      )}

      {data && data.flags.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.flags.map((flag) => (
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
  )
}
