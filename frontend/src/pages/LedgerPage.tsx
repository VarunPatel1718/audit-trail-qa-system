import { Fragment, type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { RiskBadge } from '../components/RiskBadge'
import { useAuth } from '../context/AuthContext'
import { fetchTransactions } from '../lib/transactions'
import { fetchVendors } from '../lib/vendors'
import { formatCurrency } from '../lib/format'
import {
  DEPARTMENT_OPTIONS,
  RISK_LEVEL_OPTIONS,
  SORT_FIELD_OPTIONS,
  STATUS_OPTIONS,
  departmentName,
} from '../lib/filterOptions'
import type { RiskLevel, TransactionQueryParams, TransactionStatus } from '../types/api'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

type SortField = 'transaction_date' | 'amount' | 'risk_score' | 'created_at'

interface FilterState {
  date_from: string
  date_to: string
  vendor_id: string
  department_id: string
  amount_min: string
  amount_max: string
  status: string
  risk_level: string
}

const EMPTY_FILTERS: FilterState = {
  date_from: '',
  date_to: '',
  vendor_id: '',
  department_id: '',
  amount_min: '',
  amount_max: '',
  status: '',
  risk_level: '',
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

function buildQueryParams(
  filters: FilterState,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc',
  page: number,
  pageSize: number,
): TransactionQueryParams {
  return {
    date_from: filters.date_from || undefined,
    date_to: filters.date_to ? `${filters.date_to}T23:59:59` : undefined,
    vendor_id: filters.vendor_id ? Number(filters.vendor_id) : undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    amount_min: filters.amount_min ? Number(filters.amount_min) : undefined,
    amount_max: filters.amount_max ? Number(filters.amount_max) : undefined,
    status: (filters.status || undefined) as TransactionStatus | undefined,
    risk_level: (filters.risk_level || undefined) as RiskLevel | undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  }
}

export function LedgerPage() {
  const { user } = useAuth()

  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState<SortField>('transaction_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const queryParams = buildQueryParams(appliedFilters, sortBy, sortOrder, page, pageSize)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', 'ledger', queryParams],
    queryFn: () => fetchTransactions(queryParams),
  })

  // Live GET /vendors, not the old hardcoded list -- intentionally includes
  // inactive vendors (16/17) so Ledger can still filter by/display a vendor's
  // historical activity after it's deactivated.
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })

  const vendorName = (id: number): string =>
    vendors?.find((v) => v.id === id)?.name ?? `Vendor #${id}`

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0

  const handleApplyFilters = (e: FormEvent) => {
    e.preventDefault()
    setAppliedFilters(draftFilters)
    setPage(1)
  }

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const handleSortByChange = (value: SortField) => {
    setSortBy(value)
    setPage(1)
  }

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    setPage(1)
  }

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setPage(1)
  }

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
  }, [items.length, isLoading])

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Ledger Explorer
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              Search, filter, and sort the full transaction ledger
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <form
          onSubmit={handleApplyFilters}
          className="grid grid-cols-4 gap-x-4 gap-y-3.5 rounded-xl border border-surface-border-light bg-surface-light p-[18px] shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark"
        >
          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Date from
            <input
              type="date"
              value={draftFilters.date_from}
              onChange={(e) => setDraftFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Date to
            <input
              type="date"
              value={draftFilters.date_to}
              onChange={(e) => setDraftFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Amount min
            <input
              type="number"
              min="0"
              step="0.01"
              value={draftFilters.amount_min}
              onChange={(e) => setDraftFilters((f) => ({ ...f, amount_min: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-mono text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Amount max
            <input
              type="number"
              min="0"
              step="0.01"
              value={draftFilters.amount_max}
              onChange={(e) => setDraftFilters((f) => ({ ...f, amount_max: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-mono text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Vendor
            <select
              value={draftFilters.vendor_id}
              onChange={(e) => setDraftFilters((f) => ({ ...f, vendor_id: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">All vendors</option>
              {(vendors ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Department
            <select
              value={draftFilters.department_id}
              onChange={(e) => setDraftFilters((f) => ({ ...f, department_id: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">All departments</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Status
            <select
              value={draftFilters.status}
              onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px] font-sans text-[11.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Risk level
            <select
              value={draftFilters.risk_level}
              onChange={(e) => setDraftFilters((f) => ({ ...f, risk_level: e.target.value }))}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2 font-sans text-[13.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            >
              <option value="">All risk levels</option>
              {RISK_LEVEL_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-4 flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-input-border-light bg-input-light px-4 py-2 font-sans text-[13px] font-semibold text-body-light hover:opacity-80 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark"
            >
              Reset
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold-light px-4 py-2 font-sans text-[13px] font-bold text-on-gold-light dark:bg-gold-dark dark:text-on-gold-dark"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <div className="font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
            {isLoading ? 'Loading…' : `Showing ${rangeStart}–${rangeEnd} of ${total} transactions`}
          </div>
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 font-sans text-[12.5px] font-medium text-muted-light dark:text-muted-dark">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => handleSortByChange(e.target.value as SortField)}
                className="rounded-lg border border-input-border-light bg-input-light px-2.5 py-1.5 font-sans text-[12.5px] text-hi-light dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark"
              >
                {SORT_FIELD_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSortOrderToggle}
              aria-label="Toggle sort order"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-input-border-light bg-input-light font-sans text-[13px] text-hi-light hover:opacity-80 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <label className="flex items-center gap-2 font-sans text-[12.5px] font-medium text-muted-light dark:text-muted-dark">
              Per page
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-input-border-light bg-input-light px-2.5 py-1.5 font-sans text-[12.5px] text-hi-light dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-surface-border-light bg-surface-light shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
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

                {isLoading && (
                  <div className="col-span-5 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                    Loading transactions…
                  </div>
                )}

                {isError && (
                  <div className="col-span-5 py-6 text-center font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
                    Failed to load transactions. Check your filters and try again.
                  </div>
                )}

                {!isLoading && !isError && items.length === 0 && (
                  <div className="col-span-5 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                    No transactions match these filters.
                  </div>
                )}

                {items.map((tx) => (
                  <Fragment key={tx.id}>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-mono text-[13px] dark:border-divider-dark">
                      <Link
                        to={`/transactions/${tx.id}`}
                        className="text-body-light hover:text-gold-light hover:underline dark:text-body-dark dark:hover:text-gold-dark"
                      >
                        {tx.transaction_ref}
                      </Link>
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13.5px] text-body-light dark:border-divider-dark dark:text-body-dark">
                      {vendorName(tx.vendor_id)}
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 font-sans text-[13px] text-muted-light dark:border-divider-dark dark:text-muted-dark">
                      {departmentName(tx.department_id)}
                    </div>
                    <div className="flex items-center justify-end border-b border-divider-light py-3.5 font-mono text-[13.5px] text-hi-light dark:border-divider-dark dark:text-hi-dark">
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="flex items-center border-b border-divider-light py-3.5 dark:border-divider-dark">
                      {tx.risk_level && <RiskBadge risk={tx.risk_level} />}
                    </div>
                  </Fragment>
                ))}
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

        <div className="flex items-center justify-between">
          <div className="font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-input-border-light bg-input-light px-3.5 py-1.5 font-sans text-[12.5px] font-semibold text-body-light disabled:cursor-not-allowed disabled:opacity-40 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={totalPages === 0 || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-input-border-light bg-input-light px-3.5 py-1.5 font-sans text-[12.5px] font-semibold text-body-light disabled:cursor-not-allowed disabled:opacity-40 dark:border-input-border-dark dark:bg-input-dark dark:text-body-dark"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
