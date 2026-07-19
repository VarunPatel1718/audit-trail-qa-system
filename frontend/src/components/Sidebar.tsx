import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', enabled: true },
  { label: 'Ledger', to: '/ledger', enabled: true },
  { label: 'Policy Search', to: '/policy-search', enabled: true },
  { label: 'Case Library', to: '/case-library', enabled: true },
  { label: 'Audit Notes', to: '#', enabled: false },
  { label: 'Reports', to: '/reports', enabled: true },
  { label: 'Admin', to: '#', enabled: false },
]

export function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <aside className="flex w-[216px] shrink-0 flex-col gap-[26px] border-r border-surface-border-light bg-sidebar-light px-4 py-[22px] dark:border-surface-border-dark dark:bg-sidebar-dark">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold-tint-border-light bg-gold-tint-strong-light dark:border-gold-tint-border-dark dark:bg-gold-tint-strong-dark">
          <div className="h-3 w-3 rounded-[3px] bg-gold-light dark:bg-gold-dark" />
        </div>
        <div className="font-sans text-[12.5px] font-bold leading-tight text-hi-light dark:text-hi-dark">
          Audit Trail
          <br />
          Q&amp;A System
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <Link
              key={item.label}
              to={item.to}
              className={
                location.pathname === item.to
                  ? 'flex items-center gap-2.5 rounded-lg bg-gold-tint-light px-3 py-[9px] font-sans text-sm font-semibold text-gold-light dark:bg-gold-tint-dark dark:text-gold-dark'
                  : 'flex items-center gap-2.5 rounded-lg px-3 py-[9px] font-sans text-sm font-medium text-body-light hover:opacity-80 dark:text-body-dark'
              }
            >
              <span
                className={
                  location.pathname === item.to
                    ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-gold-light dark:bg-gold-dark'
                    : 'h-1.5 w-1.5 shrink-0 rounded-full bg-muted-light dark:bg-muted-dark'
                }
              />
              {item.label}
            </Link>
          ) : (
            <a
              key={item.label}
              href={item.to}
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-2.5 rounded-lg px-3 py-[9px] font-sans text-sm font-medium text-body-light hover:opacity-80 dark:text-body-dark"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-light dark:bg-muted-dark" />
              {item.label}
            </a>
          ),
        )}
      </nav>

      <div className="flex flex-col gap-[3px] border-t border-surface-border-light px-1 pt-3 dark:border-surface-border-dark">
        <div className="font-sans text-[11px] font-bold uppercase tracking-wider text-gold-light dark:text-gold-dark">
          {user?.role ?? '—'}
        </div>
        <div className="font-sans text-[13px] font-medium text-body-light dark:text-body-dark">
          {user?.full_name ?? ''}
        </div>
      </div>
    </aside>
  )
}
