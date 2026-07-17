import { errorMessage } from '../lib/errors'

interface GenerateNoteEmptyStateProps {
  onGenerate: () => void
  isPending: boolean
  error: unknown
}

export function GenerateNoteEmptyState({ onGenerate, isPending, error }: GenerateNoteEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-input-border-light px-4 py-6 text-center dark:border-input-border-dark">
      <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
        No audit note generated yet
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isPending}
        className="mt-3.5 rounded-lg bg-gold-light px-4 py-2 font-sans text-[13px] font-bold text-on-gold-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark"
      >
        {isPending ? 'Generating…' : 'Generate Audit Note'}
      </button>
      {error != null && (
        <p className="mt-3 font-sans text-[12.5px] text-critical-text-light dark:text-critical-text-dark">
          {errorMessage(error, 'Failed to generate audit note.')}
        </p>
      )}
    </div>
  )
}
