import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import i18n from '../lib/i18n'

type HeaderProps = {
  title: string
}

function Header({ title }: HeaderProps) {
  const { logout, user } = useAuth()
  const { t } = useTranslation()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLogoutError(null)
    try {
      await logout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : t('header.logoutError'))
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur transition-colors sm:px-6 lg:px-8 dark:border-gray-800 dark:bg-gray-900/95">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>

      <div className="flex items-center gap-3">
        {logoutError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{logoutError}</p>}

        {user?.email && (
          <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 sm:flex dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span>{user.email}</span>
          </div>
        )}

        <div role="group" aria-label={t('header.language')} className="flex items-center rounded-lg border border-gray-200 bg-gray-50/60 p-0.5 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            aria-pressed={i18n.resolvedLanguage === 'en'}
            onClick={() => void i18n.changeLanguage('en')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              i18n.resolvedLanguage === 'en'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-gray-700 dark:text-indigo-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={i18n.resolvedLanguage === 'th'}
            onClick={() => void i18n.changeLanguage('th')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              i18n.resolvedLanguage === 'th'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-gray-700 dark:text-indigo-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            TH
          </button>
        </div>

        <ThemeToggle />

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:focus:ring-offset-gray-900"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('header.logout')}</span>
        </button>
      </div>
    </header>
  )
}

export default Header
