import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  Settings,
  Wallet,
} from 'lucide-react'

const navItems = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard },
  { key: 'transactions', to: '/transactions', icon: Receipt },
  { key: 'budgets', to: '/budgets', icon: PiggyBank },
  { key: 'reports', to: '/reports', icon: BarChart3 },
  { key: 'settings', to: '/settings', icon: Settings },
]

function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-white/70 bg-gradient-to-b from-white/85 to-indigo-50/70 shadow-xl shadow-indigo-950/5 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:from-slate-900/90 dark:to-indigo-950/60 dark:shadow-black/20 md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/70 px-6 dark:border-slate-800/80">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
          <Wallet className="h-5 w-5" />
        </div>
        <Link to="/" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          FinTrack
        </Link>
      </div>

      <nav aria-label={t('nav.main')} className="flex-1 space-y-1 px-3 py-5">
        {navItems.map(({ key, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                ? 'rounded-xl bg-gradient-to-r from-indigo-100 via-indigo-50 to-violet-50 text-indigo-800 shadow-md shadow-indigo-500/15 ring-1 ring-indigo-200/60 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-violet-500/10 dark:text-indigo-200 dark:shadow-indigo-500/10 dark:ring-indigo-400/20'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
                  }`}
                />
                <span>{t(`nav.${key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
