import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Shield, KeyRound, Save, CheckCircle2 } from 'lucide-react'
import { apiRequest } from '../lib/api'

type SettingsTab = 'profile' | 'security'

type UserProfile = {
  id: string
  name: string | null
  email: string
  createdAt: string
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    (typeof user.name === 'string' || user.name === null) &&
    typeof user.email === 'string' &&
    typeof user.createdAt === 'string'
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function Settings() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const data = await apiRequest<unknown>('/users/me', { signal: controller.signal })
        if (typeof data !== 'object' || data === null || !('user' in data) || !isUserProfile(data.user)) {
          throw new Error('The server returned an invalid user profile.')
        }
        setName(data.user.name ?? '')
        setEmail(data.user.email)
      } catch (error) {
        if (!controller.signal.aborted) {
          setProfileError(getErrorMessage(error, t('settings.loadError')))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingProfile(false)
      }
    }

    void loadProfile()
    return () => controller.abort()
  }, [t])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setIsSavingProfile(true)

    try {
      const data = await apiRequest<unknown>('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      if (typeof data !== 'object' || data === null || !('user' in data) || !isUserProfile(data.user)) {
        throw new Error('The server returned an invalid user profile.')
      }
      setName(data.user.name ?? '')
      setEmail(data.user.email)
      setProfileSuccess(t('settings.profileSuccess'))
    } catch (error) {
      setProfileError(getErrorMessage(error, t('settings.profileError')))
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 8) {
      setPasswordError(t('settings.shortPassword'))
      return
    }

    setIsChangingPassword(true)
    try {
      await apiRequest<void>('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordSuccess(t('settings.passwordSuccess'))
    } catch (error) {
      setPasswordError(getErrorMessage(error, t('settings.passwordError')))
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('nav.settings')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.description')}</p>
      </header>

      {/* Pill Tab Selector */}
      <div className="flex gap-2 rounded-2xl bg-gray-100/80 p-1.5 dark:bg-gray-800/80">
        <button
          id="profile-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          aria-controls="profile-panel"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-indigo-700 shadow-xs dark:bg-gray-700 dark:text-indigo-300'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <User className="h-4 w-4" />
          <span>{t('settings.profileTab')}</span>
        </button>

        <button
          id="security-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'security'}
          aria-controls="security-panel"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-white text-indigo-700 shadow-xs dark:bg-gray-700 dark:text-indigo-300'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>{t('settings.securityTab')}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        {activeTab === 'profile' ? (
          <section id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
            <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('settings.profileTitle')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.profileDescription')}</p>

            {isLoadingProfile ? (
              <div className="mt-6 space-y-4">
                <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="mt-6 max-w-xl space-y-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t('settings.name')}
                  <input
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    required
                    className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
                  />
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t('settings.email')}
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
                  />
                </label>

                {profileError && (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    {profileError}
                  </p>
                )}
                {profileSuccess && (
                  <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingProfile ? t('common.saving') : t('common.saveChanges')}</span>
                </button>
              </form>
            )}
          </section>
        ) : (
          <section id="security-panel" role="tabpanel" aria-labelledby="security-tab">
            <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('settings.passwordTitle')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.passwordDescription')}</p>

            <form onSubmit={handlePasswordSubmit} className="mt-6 max-w-xl space-y-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('settings.currentPassword')}
                <input
                  name="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('settings.newPassword')}
                <input
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
                />
                <span className="mt-1 block text-xs font-normal text-gray-400 dark:text-gray-500">
                  {t('settings.passwordHint')}
                </span>
              </label>

              {passwordError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <KeyRound className="h-4 w-4" />
                <span>{isChangingPassword ? t('settings.updatingPassword') : t('settings.changePassword')}</span>
              </button>
            </form>
          </section>
        )}
      </div>
    </section>
  )
}

export default Settings
