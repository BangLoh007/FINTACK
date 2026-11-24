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
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar />

      <div className="min-w-0 flex-1 md:ml-64">
        <Header title={t(pageTitleKeys[pathname] ?? 'common.pageNotFound')} />

        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default Layout
