import { type FormEvent, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { searchPolicies } from '../lib/policies'
import { errorMessage } from '../lib/errors'
import { CARD_CLASS } from '../lib/pageStyles'

const DEFAULT_TOP_K = 8
const MAX_TOP_K = 20

function nextTopK(current: number): number {
  if (current < 16) return 16
  return MAX_TOP_K
}

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PolicySearchPage() {
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  const [topK, setTopK] = useState(DEFAULT_TOP_K)

  const searchQueryResult = useQuery({
    queryKey: ['policies', 'search', submittedQuery, topK],
    queryFn: () => searchPolicies(submittedQuery as string, topK),
    enabled: submittedQuery !== null,
    placeholderData: keepPreviousData,
  })

  const canSubmit = inputValue.trim().length > 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setSubmittedQuery(trimmed)
    setTopK(DEFAULT_TOP_K)
  }

  const handleShowMore = () => {
    setTopK((k) => nextTopK(k))
  }

  const results = searchQueryResult.data?.results ?? []
  const hasSearched = submittedQuery !== null
  const canShowMore = results.length === topK && topK < MAX_TOP_K

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Policy Search
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Search RBI accounting and fraud-risk policy documents
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. what is the reporting threshold for fraud in NBFCs?"
            className="w-full max-w-xl rounded-lg border border-input-border-light bg-input-light px-3 py-2.5 font-sans text-[14px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-gold-light px-4 py-2.5 font-sans text-[13px] font-bold text-on-gold-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark"
          >
            Search
          </button>
        </form>

        {!hasSearched && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Search RBI policy documents by topic or question.
            </p>
          </div>
        )}

        {hasSearched && searchQueryResult.isLoading && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-muted-light dark:text-muted-dark">Searching…</p>
          </div>
        )}

        {hasSearched && searchQueryResult.isError && (
          <div className={CARD_CLASS}>
            <p className="font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
              {errorMessage(searchQueryResult.error, 'Search failed. Try a different query.')}
            </p>
          </div>
        )}

        {hasSearched &&
          !searchQueryResult.isLoading &&
          !searchQueryResult.isError &&
          results.length === 0 && (
            <div className={CARD_CLASS}>
              <p className="font-sans text-[13.5px] font-semibold text-body-light dark:text-body-dark">
                No matching policy clauses found.
              </p>
              <p className="mt-1 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
                Try rephrasing the query or asking about a different topic.
              </p>
            </div>
          )}

        {results.length > 0 && (
          <div className="flex flex-col gap-3.5">
            {results.map((result) => (
              <div key={result.policy_id} className={CARD_CLASS}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-sans text-[14.5px] font-bold text-hi-light dark:text-hi-dark">
                      {result.title}
                    </div>
                    <div className="mt-0.5 font-sans text-[12px] text-muted-light dark:text-muted-dark">
                      {result.document_name}
                      {result.chapter ? ` · ${result.chapter}` : ''}
                      {result.clause_ref ? ` · Clause ${result.clause_ref}` : ''}
                      {result.source_page ? ` · p.${result.source_page}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-gold-tint-border-light bg-gold-tint-light px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-gold-light dark:border-gold-tint-border-dark dark:bg-gold-tint-dark dark:text-gold-dark">
                    {Math.round(result.score * 100)}% match
                  </span>
                </div>
                <p className="mt-3 font-sans text-[13px] leading-relaxed text-body-light dark:text-body-dark">
                  {result.content}
                </p>
              </div>
            ))}

            {canShowMore && (
              <button
                type="button"
                onClick={handleShowMore}
                disabled={searchQueryResult.isFetching}
                className="self-center rounded-lg border border-input-border-light bg-input-light px-4 py-2 font-sans text-[13px] font-semibold text-body-light hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark"
              >
                {searchQueryResult.isFetching ? 'Loading…' : 'Show more results'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
