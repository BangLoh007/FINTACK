import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  minLength?: number
  maxLength?: number
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  minLength,
  maxLength,
}: PasswordFieldProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name="password"
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
        />
        <button
          type="button"
          aria-label={t(isVisible ? 'auth.hidePassword' : 'auth.showPassword')}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300"
        >
          {isVisible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

export default PasswordField
