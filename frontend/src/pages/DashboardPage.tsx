import { Fragment, useEffect, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { RiskBadge } from '../components/RiskBadge'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { fetchTransactionDetail, fetchTransactions, startOfWeekIso } from '../lib/transactions'
import { formatCurrency } from '../lib/format'
import type { Transaction } from '../types/api'

const RECENT_FLAGGED_LIMIT = 8

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function riskBand(score: number): string {
  if (score >= 75) return 'High-Critical band'
  if (score >= 50) return 'Medium-High band'
  if (score >= 25) return 'Low-Medium band'
  return 'Low band'
}

export function DashboardPage() {
  const { user } = useAuth()
  const weekStart = startOfWeekIso()

  const highQuery = useQuery({
    queryKey: ['transactions', 'risk', 'high'],
    queryFn: () => fetchTransactions({ risk_level: 'high', sort_by: 'transaction_date', sort_order: 'desc', page_size: 100 }),
  })
  const criticalQuery = useQuery({
    queryKey: ['transactions', 'risk', 'critical'],
    queryFn: () => fetchTransactions({ risk_level: 'critical', sort_by: 'transaction_date', sort_order: 'desc', page_size: 100 }),
  })
  const highThisWeekQuery = useQuery({
    queryKey: ['transactions', 'risk', 'high', 'week', weekStart],
    queryFn: () => fetchTransactions({ risk_level: 'high', date_from: weekStart, page_size: 1 }),
  })
  const criticalThisWeekQuery = useQuery({
    queryKey: ['transactions', 'risk', 'critical', 'week', weekStart],
    queryFn: () => fetchTransactions({ risk_level: 'critical', date_from: weekStart, page_size: 1 }),
  })
  const clearedQuery = useQuery({
    queryKey: ['transactions', 'status', 'cleared'],
    queryFn: () => fetchTransactions({ status: 'cleared', page_size: 1 }),
  })
  const pendingQuery = useQuery({
    queryKey: ['transactions', 'status', 'pending'],
    queryFn: () => fetchTransactions({ status: 'pending', page_size: 1 }),
  })

  const flaggedItems: Transaction[] = [...(highQuery.data?.items ?? []), ...(criticalQuery.data?.items ?? [])].sort(
    (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
  )
  const recentFlagged = flaggedItems.slice(0, RECENT_FLAGGED_LIMIT)

  const avgRiskScore =
    flaggedItems.length > 0
      ? flaggedItems.reduce((sum, tx) => sum + tx.risk_score, 0) / flaggedItems.length
      : 0

  const detailQueries = useQueries({
    queries: recentFlagged.map((tx) => ({
      queryKey: ['transaction-detail', tx.id],
      queryFn: () => fetchTransactionDetail(tx.id),
      enabled: recentFlagged.length > 0,
    })),
  })

  const isStatsLoading =
    highQuery.isLoading ||
    criticalQuery.isLoading ||
    highThisWeekQuery.isLoading ||
    criticalThisWeekQuery.isLoading ||
    clearedQuery.isLoading ||
    pendingQuery.isLoading

  const flaggedTotal = (highQuery.data?.total ?? 0) + (criticalQuery.data?.total ?? 0)
  const flaggedThisWeek = (highThisWeekQuery.data?.total ?? 0) + (criticalThisWeekQuery.data?.total ?? 0)
  const clearedTotal = clearedQuery.data?.total ?? 0
  const pendingTotal = pendingQuery.data?.total ?? 0

  // Native OS/browser scrollbars for the table's overflow-x-auto container are
  // often invisible (auto-hiding overlay scrollbars on macOS, some Windows
  // settings) or absent entirely until actively dragged, so narrow-viewport
  // users get no visual cue that Amount/Risk are reachable by scrolling. Track
  // scroll position ourselves and render an explicit edge fade + arrow hint
  // instead of relying on scrollbar chrome to communicate that.
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollHints = () => {
    const el = tableScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    updateScrollHints()
    const el = tableScrollRef.current
    if (!el) return
    const observer = new ResizeObserver(updateScrollHints)
    observer.observe(el)
    window.addEventListener('resize', updateScrollHints)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScrollHints)
    }
  }, [recentFlagged.length, highQuery.isLoading, criticalQuery.isLoading])

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Dashboard
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Overview of flagged transactions and audit activity
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-[18px]">
          <StatCard
            label="Flagged Transactions"
            value={isStatsLoading ? '—' : String(flaggedTotal)}
            meta={isStatsLoading ? '' : `+${flaggedThisWeek} this week`}
            tone="up"
          />
          <StatCard
            label="Avg Risk Score"
            value={isStatsLoading ? '—' : avgRiskScore.toFixed(1)}
            meta={isStatsLoading ? '' : riskBand(avgRiskScore)}
            tone="flat"
          />
          <StatCard
            label="Cleared Transactions"
            value={isStatsLoading ? '—' : String(clearedTotal)}
            meta={isStatsLoading ? '' : `${pendingTotal} pending review`}
            tone="down"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-surface-border-light bg-surface-light shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
          <div className="flex items-center justify-between border-b border-divider-light px-[22px] py-[18px] dark:border-divider-dark">
            <div className="font-sans text-[15.5px] font-bold text-hi-light dark:text-hi-dark">
              Recent Flagged Transactions
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="font-sans text-[12.5px] font-semibold text-gold-light hover:underline dark:text-gold-dark"
            >
              View all →
            </a>
          </div>

          <div className="relative">
            <div ref={tableScrollRef} onScroll={updateScrollHints} className="table-scroll overflow-x-auto">
            <div className="grid grid-cols-[120px_minmax(220px,1.4fr)_minmax(160px,1.1fr)_140px_110px] gap-x-4 px-[22px] pb-3.5">
              <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
                Ref
              </div>
              <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
                Vendor
              </div>
              <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
                Department
              </div>
              <div className="border-b border-divider-light py-2.5 text-right font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
                Amount
              </div>
              <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
                Risk
              </div>

              {(highQuery.isLoading || criticalQuery.isLoading) && (
                <div className="col-span-5 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                  Loading transactions…
                </div>
              )}

              {!highQuery.isLoading && !criticalQuery.isLoading && recentFlagged.length === 0 && (
                <div className="col-span-5 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                  No flagged transactions.
                </div>
              )}

              {recentFlagged.map((tx, i) => {
                const detail = detailQueries[i]?.data
                return (
                  <Fragment key={tx.id}>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-mono text-[13px] text-body-light dark:border-divider-dark dark:text-body-dark">
                      {tx.transaction_ref}
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13.5px] text-body-light dark:border-divider-dark dark:text-body-dark">
                      {detail?.vendor.name ?? '…'}
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13px] text-muted-light dark:border-divider-dark dark:text-muted-dark">
                      {detail?.department.name ?? '…'}
                    </div>
                    <div className="flex items-center justify-end border-b border-divider-light py-3.5 font-mono text-[13.5px] text-hi-light dark:border-divider-dark dark:text-hi-dark">
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 dark:border-divider-dark">
                      {tx.risk_level && <RiskBadge risk={tx.risk_level} />}
                    </div>
                  </Fragment>
                )
              })}
            </div>
            </div>

            {canScrollLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center justify-start bg-gradient-to-r from-surface-light via-surface-light/90 to-transparent pl-1.5 dark:from-surface-dark dark:via-surface-dark/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-light font-sans text-lg font-bold leading-none text-on-gold-light shadow-card dark:bg-gold-dark dark:text-on-gold-dark">
                  ‹
                </span>
              </div>
            )}
            {canScrollRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end bg-gradient-to-l from-surface-light via-surface-light/90 to-transparent pr-1.5 dark:from-surface-dark dark:via-surface-dark/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-light font-sans text-lg font-bold leading-none text-on-gold-light shadow-card dark:bg-gold-dark dark:text-on-gold-dark">
                  ›
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
