export type StatTone = 'up' | 'down' | 'flat'

const META_TONE_CLASSES: Record<StatTone, string> = {
  up: 'text-critical-text-light dark:text-critical-text-dark',
  down: 'text-low-text-light dark:text-low-text-dark',
  flat: 'text-muted-light dark:text-muted-dark',
}

interface StatCardProps {
  label: string
  value: string
  meta: string
  tone: StatTone
}

export function StatCard({ label, value, meta, tone }: StatCardProps) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-light p-[22px] px-[22px] shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
      <div className="font-sans text-[12.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
        {label}
      </div>
      <div className="mt-2.5 font-mono text-[30px] font-semibold tracking-tight text-gold-light dark:text-gold-dark">
        {value}
      </div>
      <div className={`mt-1.5 font-sans text-[12.5px] ${META_TONE_CLASSES[tone]}`}>{meta}</div>
    </div>
  )
}
