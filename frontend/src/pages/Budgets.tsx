import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PiggyBank,
  PlusCircle,
  Trash2,
  Utensils,
  Car,
  Home,
  Zap,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useBudgets } from '../hooks/useBudgets'
import { budgetCategories, type BudgetCategory } from '../types/budget'

const categoryIcons: Record<BudgetCategory, LucideIcon> = {
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Film,
  shopping: ShoppingBag,
  other: MoreHorizontal,
}

const categoryColors: Record<BudgetCategory, { bg: string; text: string }> = {
  food: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-600 dark:text-amber-400' },
  transport: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-600 dark:text-blue-400' },
  housing: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-600 dark:text-indigo-400' },
  utilities: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400' },
  health: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400' },
  education: { bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-600 dark:text-cyan-400' },
  entertainment: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-600 dark:text-purple-400' },
  shopping: { bg: 'bg-pink-50 dark:bg-pink-950/60', text: 'text-pink-600 dark:text-pink-400' },
  other: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
}

function Budgets() {
  const { t, i18n } = useTranslation()
  const { isAuthReady } = useAuth()
  const [currentDate] = useState(() => new Date())
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<BudgetCategory>('food')
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1))
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [formError, setFormError] = useState<string | null>(null)
  const { budgets, isLoading, isSubmitting, error, addBudget, deleteBudget } = useBudgets(isAuthReady)

  const formatAmount = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const monthName = (monthNumber: number) => t(`months.${monthNumber}`)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const numericAmount = Number(amount)
    const numericMonth = Number(month)
    const numericYear = Number(year)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError(t('budgets.amountError'))
      return
    }
    if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) {
      setFormError(t('budgets.monthError'))
      return
    }
    if (!Number.isInteger(numericYear) || numericYear < 2020 || numericYear > 2100) {
      setFormError(t('budgets.yearError'))
      return
    }

    const succeeded = await addBudget({
      amount: numericAmount,
      category,
      month: numericMonth,
      year: numericYear,
    })

    if (succeeded) {
      setAmount('')
      setFormError(null)
    }
  }

  async function handleDelete(id: string) {
    setFormError(null)
    await deleteBudget(id)
  }

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('nav.budgets')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('budgets.description')}</p>
      </header>

      {/* Add Budget Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {t('budgets.addTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('budgets.category')}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as BudgetCategory)}
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            >
              {budgetCategories.map((budgetCategory) => (
                <option key={budgetCategory} value={budgetCategory}>
                  {t(`categories.${budgetCategory}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('budgets.amount')}
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              required
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('budgets.month')}
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((monthNumber) => (
                <option key={monthNumber} value={monthNumber}>
                  {monthName(monthNumber)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('budgets.year')}
            <input
              type="number"
              min="2020"
              max="2100"
              step="1"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            />
          </label>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {formError}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isSubmitting ? t('budgets.saving') : t('budgets.add')}</span>
          </button>
        </div>
      </form>

      {/* Budget List */}
      <section aria-labelledby="budget-list-heading" className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <PiggyBank className="h-5 w-5" />
            </div>
            <h3 id="budget-list-heading" className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('budgets.listTitle')}
            </h3>
          </div>
          {!isLoading && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {t('budgets.count', { count: budgets.length })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : budgets.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={PiggyBank}
              title={t('budgets.empty')}
              description="Create a category budget to keep your spending in check."
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => {
              const Icon = categoryIcons[budget.category] ?? MoreHorizontal
              const color = categoryColors[budget.category] ?? categoryColors.other

              return (
                <article
                  key={budget.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${color.bg} ${color.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t(`categories.${budget.category}`)}</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {monthName(budget.month)} {budget.year}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDelete(budget.id)}
                      disabled={isSubmitting}
                      aria-label={t('budgets.deleteLabel', {
                        category: t(`categories.${budget.category}`),
                        month: monthName(budget.month),
                        year: budget.year,
                      })}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress & Spending Warning */}
                  {(() => {
                    const spent = budget.spent ?? 0
                    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0
                    const remaining = budget.amount - spent
                    const isExceeded = percent >= 100
                    const isWarning = percent >= 80 && !isExceeded

                    return (
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400">
                            {t('budgets.spent')}: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatAmount(spent)}</span>
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">
                            {t('budgets.targetBudget')}: {formatAmount(budget.amount)}
                          </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeded
                                ? 'bg-rose-500 dark:bg-rose-600'
                                : isWarning
                                ? 'bg-amber-500 dark:bg-amber-600'
                                : 'bg-emerald-500 dark:bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>

                        {/* Status Label & Remaining/Over Amount */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="flex items-center gap-1.5 font-medium">
                            {isExceeded ? (
                              <>
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                                <span className="text-rose-600 dark:text-rose-400">{t('budgets.statusExceeded')}</span>
                              </>
                            ) : isWarning ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-amber-600 dark:text-amber-400">{t('budgets.statusWarning')} ({percent}%)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">{t('budgets.statusNormal')} ({percent}%)</span>
                              </>
                            )}
                          </div>

                          <span className={`font-semibold ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {isExceeded
                              ? `${t('budgets.overBudget')}: ${formatAmount(Math.abs(remaining))}`
                              : `${t('budgets.remaining')}: ${formatAmount(remaining)}`}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

export default Budgets
