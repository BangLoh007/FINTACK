import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'

const pageTitleKeys: Record<string, string> = {
  '/': 'nav.dashboard',
  '/dashboard': 'nav.dashboard',
  '/transactions': 'nav.transactions',
  '/budgets': 'nav.budgets',
  '/reports': 'nav.reports',
  '/settings': 'nav.settings',
}

function Layout() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/80 text-slate-900 transition-colors duration-200 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40 dark:text-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1 md:ml-64">
        <Header title={t(pageTitleKeys[pathname] ?? 'common.pageNotFound')} />

        <main className="p-5 sm:p-8 lg:p-10 xl:p-12">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default Layout
