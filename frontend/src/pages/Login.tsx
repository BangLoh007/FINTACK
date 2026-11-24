import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'

function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('auth.loginError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
          </div>

          <PasswordField
            id="password"
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          {t('auth.noAccount')} <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200">{t('auth.createOne')}</Link>
        </p>
    </AuthCard>
  )
}

export default Login
