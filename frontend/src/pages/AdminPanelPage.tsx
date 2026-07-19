import { useQuery, useMutation } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { ThemeToggle } from '../components/ThemeToggle'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { canManageVendors, fetchActiveRules, fetchVendors, setVendorActive } from '../lib/vendors'
import { errorMessage } from '../lib/errors'
import { CARD_CLASS, SECTION_TITLE_CLASS } from '../lib/pageStyles'
import type { VendorSummary } from '../types/api'

function initials(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface VendorToggleProps {
  vendor: VendorSummary
  canManage: boolean
  isPending: boolean
  onToggle: () => void
}

function VendorToggle({ vendor, canManage, isPending, onToggle }: VendorToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={vendor.is_active}
      aria-label={`${vendor.is_active ? 'Deactivate' : 'Activate'} ${vendor.name}`}
      disabled={!canManage || isPending}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        vendor.is_active ? 'bg-gold-light dark:bg-gold-dark' : 'bg-input-border-light dark:bg-input-border-dark'
      } ${canManage ? '' : 'cursor-not-allowed'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          vendor.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function AdminPanelPage() {
  const { user } = useAuth()
  const canManage = canManageVendors(user?.role)

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })

  const rulesQuery = useQuery({
    queryKey: ['rules'],
    queryFn: fetchActiveRules,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => setVendorActive(id, is_active),
    onSuccess: () => vendorsQuery.refetch(),
  })

  const vendors = vendorsQuery.data ?? []
  const activeCount = vendors.filter((v) => v.is_active).length
  const inactiveCount = vendors.length - activeCount

  const isStatsLoading = vendorsQuery.isLoading || rulesQuery.isLoading

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-10 pt-7">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-sans text-[26px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Admin Panel
            </h1>
            <p className="mt-1 font-sans text-[13.5px] text-muted-light dark:text-muted-dark">
              System overview and vendor management
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle className="h-9 w-9" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-tint-strong-light font-sans text-[12.5px] font-bold text-gold-light dark:bg-gold-tint-strong-dark dark:text-gold-dark">
              {initials(user?.full_name) || '—'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-[18px]">
          <StatCard
            label="Vendors"
            value={isStatsLoading ? '—' : String(vendors.length)}
            meta={isStatsLoading ? '' : `${activeCount} active · ${inactiveCount} inactive`}
            tone="flat"
          />
          <StatCard
            label="Active Rules"
            value={isStatsLoading ? '—' : String(rulesQuery.data?.count ?? 0)}
            meta={isStatsLoading ? '' : 'rule-engine modules currently registered'}
            tone="flat"
          />
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between">
            <h2 className={SECTION_TITLE_CLASS}>Vendor Management</h2>
            {!canManage && (
              <span className="font-sans text-[12px] font-medium text-muted-light dark:text-muted-dark">
                Read-only — only an Admin can change vendor status
              </span>
            )}
          </div>

          <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-muted-light dark:text-muted-dark">
            Toggling a vendor affects <span className="font-semibold text-body-light dark:text-body-dark">future</span> rule
            evaluations for its transactions — it does not retroactively change any transaction's
            already-computed risk score until that transaction is re-evaluated.
          </p>

          {toggleMutation.isError && (
            <p className="mt-3 font-sans text-[12.5px] text-critical-text-light dark:text-critical-text-dark">
              {errorMessage(toggleMutation.error, 'Failed to update this vendor. Try again.')}
            </p>
          )}

          <div className="mt-4 grid grid-cols-[minmax(220px,1.4fr)_140px_110px_80px] gap-x-4">
            <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
              Vendor
            </div>
            <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
              Code
            </div>
            <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
              Status
            </div>
            <div className="border-b border-divider-light py-2.5 font-sans text-[11.5px] font-bold uppercase tracking-wider text-muted-light dark:border-divider-dark dark:text-muted-dark">
              Active
            </div>

            {vendorsQuery.isLoading && (
              <div className="col-span-4 py-6 text-center font-sans text-sm text-muted-light dark:text-muted-dark">
                Loading vendors…
              </div>
            )}

            {vendorsQuery.isError && (
              <div className="col-span-4 py-6 text-center font-sans text-sm text-critical-text-light dark:text-critical-text-dark">
                Failed to load vendors.
              </div>
            )}

            {vendors.map((vendor) => {
              const isRowPending =
                toggleMutation.isPending && toggleMutation.variables?.id === vendor.id

              return (
                <div key={vendor.id} className="contents">
                  <div className="flex items-center border-b border-divider-light py-3 font-sans text-[13.5px] text-body-light dark:border-divider-dark dark:text-body-dark">
                    {vendor.name}
                  </div>
                  <div className="flex items-center border-b border-divider-light py-3 font-mono text-[12.5px] text-muted-light dark:border-divider-dark dark:text-muted-dark">
                    {vendor.vendor_code}
                  </div>
                  <div className="flex items-center border-b border-divider-light py-3 dark:border-divider-dark">
                    <span
                      className={`font-sans text-[12.5px] font-semibold ${
                        vendor.is_active
                          ? 'text-low-text-light dark:text-low-text-dark'
                          : 'text-critical-text-light dark:text-critical-text-dark'
                      }`}
                    >
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-divider-light py-3 dark:border-divider-dark">
                    <VendorToggle
                      vendor={vendor}
                      canManage={canManage}
                      isPending={isRowPending}
                      onToggle={() =>
                        toggleMutation.mutate({ id: vendor.id, is_active: !vendor.is_active })
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
