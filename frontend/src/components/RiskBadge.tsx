import type { RiskLevel } from '../types/api'

const RISK_CLASSES: Record<RiskLevel, string> = {
  critical:
    'bg-critical-bg-light dark:bg-critical-bg-dark border-critical-border-light dark:border-critical-border-dark text-critical-text-light dark:text-critical-text-dark',
  high: 'bg-high-bg-light dark:bg-high-bg-dark border-high-border-light dark:border-high-border-dark text-high-text-light dark:text-high-text-dark',
  medium:
    'bg-medium-bg-light dark:bg-medium-bg-dark border-medium-border-light dark:border-medium-border-dark text-medium-text-light dark:text-medium-text-dark',
  low: 'bg-low-bg-light dark:bg-low-bg-dark border-low-border-light dark:border-low-border-dark text-low-text-light dark:text-low-text-dark',
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[10px] py-[3px] font-sans text-xs font-semibold capitalize tracking-wide ${RISK_CLASSES[risk]}`}
    >
      {risk}
    </span>
  )
}
