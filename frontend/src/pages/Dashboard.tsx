import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SummaryCard from '../components/SummaryCard'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useBudgets } from '../hooks/useBudgets'
import { apiRequest } from '../lib/api'

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category?: string
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) return false

  const transaction = value as Record<string, unknown>
  return (
    typeof transaction.id === 'string' &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    typeof transaction.amount === 'number' &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    (transaction.type === 'income' || transaction.type === 'expense')
  )
}

function parseTransactions(data: unknown): Transaction[] {
  const items = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && 'data' in data && Array.isArray((data as { data: unknown[] }).data)
    ? (data as { data: unknown[] }).data
    : null

  if (!items) throw new Error('The server returned invalid transaction data.')

  const transactions: Transaction[] = []
  for (const transaction of items) {
    if (!isTransaction(transaction)) {
      throw new Error('The server returned an invalid transaction record.')
    }
    transactions.push(transaction)
  }
  return transactions
}

function formatAmount(amount: number, language: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, isAuthReady } = useAuth()
  const { isDark } = useTheme()
  const { budgets, isLoading: isBudgetsLoading } = useBudgets(isAuthReady)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthReady) {
      setIsLoading(true)
      return
    }

    const controller = new AbortController()

    async function loadTransactions() {
      try {
        setIsLoading(true)
        setLoadError(null)
        const data = await apiRequest<unknown>('/transactions', { signal: controller.signal })
        if (!controller.signal.aborted) {
          setTransactions(parseTransactions(data))
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : t('common.unexpectedError'),
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadTransactions()
    return () => controller.abort()
  }, [t, isAuthReady])

  // Total summary calculations
  const totalIncome = transactions.reduce(
    (total, transaction) => (transaction.type === 'income' ? total + transaction.amount : total),
    0,
  )
  const totalExpense = transactions.reduce(
    (total, transaction) => (transaction.type === 'expense' ? total + transaction.amount : total),
    0,
  )
  const totalBalance = totalIncome - totalExpense
  const recentTransactions = transactions.slice(0, 5)

  // Dynamic Greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.greetingMorning')
    if (hour < 18) return t('dashboard.greetingAfternoon')
    return t('dashboard.greetingEvening')
  }, [t])

  // Financial health status
  const healthStatus = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return { text: t('dashboard.healthGood'), color: 'emerald' }
    if (totalExpense > totalIncome) return { text: t('dashboard.healthDanger'), color: 'rose' }
    if (totalExpense > totalIncome * 0.8) return { text: t('dashboard.healthWarning'), color: 'amber' }
    return { text: t('dashboard.healthGood'), color: 'emerald' }
  }, [totalIncome, totalExpense, t])

  // Trend Cashflow Data for AreaChart
  const cashflowData = useMemo(() => {
    if (transactions.length === 0) return []

    // Group transactions by date string
    const map = new Map<string, { income: number; expense: number }>()

    // Sort transactions oldest to newest for timeline
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    for (const item of sorted) {
      const dateKey = item.date.slice(0, 10)
      const current = map.get(dateKey) ?? { income: 0, expense: 0 }
      if (item.type === 'income') {
        current.income += item.amount
      } else {
        current.expense += item.amount
      }
      map.set(dateKey, current)
    }

    // Keep the most recent 7 data points
    const points = Array.from(map.entries()).map(([date, values]) => ({
      date: date.slice(5), // "MM-DD"
      income: values.income,
      expense: values.expense,
    }))

    return points.slice(-7)
  }, [transactions])

  const tooltipStyle = isDark
    ? {
        backgroundColor: '#111827',
        borderColor: '#374151',
        color: '#f9fafb',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
      }
    : {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        color: '#111827',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }

  const axisColor = isDark ? '#9ca3af' : '#6b7280'
  const gridColor = isDark ? '#374151' : '#f3f4f6'

  return (
    <div className="space-y-8">
      {/* Personalized Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-6 shadow-xs dark:border-indigo-950/60 dark:from-indigo-950/40 dark:via-gray-900 dark:to-purple-950/20 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t('dashboard.financialHealth')}: <span className="font-bold underline">{healthStatus.text}</span>
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
              {greeting}, {user?.name || user?.email?.split('@')[0] || 'FinTracker'}! 👋
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.greetingSub')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/transactions"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <span>{t('transactions.addTitle')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Top 3 Summary Cards */}
      <section aria-label={t('dashboard.summary')} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          title={t('dashboard.balance')}
          amount={formatAmount(totalBalance, i18n.resolvedLanguage ?? 'en')}
          icon={Wallet}
          iconBgClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
          colorClass="text-gray-900 dark:text-gray-100"
          subtitle="Current available balance"
        />
        <SummaryCard
          title={t('dashboard.income')}
          amount={formatAmount(totalIncome, i18n.resolvedLanguage ?? 'en')}
          icon={TrendingUp}
          iconBgClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          colorClass="text-emerald-600 dark:text-emerald-400"
          subtitle="Total recorded income"
        />
        <SummaryCard
          title={t('dashboard.expense')}
          amount={formatAmount(totalExpense, i18n.resolvedLanguage ?? 'en')}
          icon={TrendingDown}
          iconBgClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
          colorClass="text-rose-600 dark:text-rose-400"
          subtitle="Total recorded spending"
        />
      </section>

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {loadError}
        </div>
      )}

      {/* Mid Section: Cashflow Trend Chart (Area Chart) */}
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('dashboard.cashflowTrend')}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('dashboard.cashflowTrendDesc')}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('reports.income')}
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {t('reports.expense')}
            </span>
          </div>
        </div>

        <div className="mt-6 h-64 w-full">
          {cashflowData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-400">
              {t('reports.empty')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val: number) =>
                    new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en', { notation: 'compact' }).format(val)
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={45}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val) => formatAmount(Number(val), i18n.resolvedLanguage ?? 'en')}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#incomeGradient)"
                  name={t('reports.income')}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseGradient)"
                  name={t('reports.expense')}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 2-Column Split: Budget Watchlist & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Budget Watchlist Widget */}
        <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                  {t('dashboard.budgetWatch')}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('dashboard.budgetWatchDesc')}
                </p>
              </div>
            </div>
            <Link
              to="/budgets"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>{t('dashboard.viewAll')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {isBudgetsLoading ? (
              <div className="space-y-3 py-2">
                <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.noBudgets')}</p>
                <Link
                  to="/budgets"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                >
                  {t('dashboard.createBudget')}
                </Link>
              </div>
            ) : (
              budgets.slice(0, 4).map((budget) => {
                const spent = budget.spent ?? 0
                const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0
                const isExceeded = percent >= 100
                const isWarning = percent >= 80 && !isExceeded

                return (
                  <div key={budget.id} className="rounded-xl border border-gray-100 p-3.5 transition-colors dark:border-gray-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {isExceeded ? (
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {t(`categories.${budget.category}`)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">
                        {formatAmount(spent, i18n.resolvedLanguage ?? 'en')} / {formatAmount(budget.amount, i18n.resolvedLanguage ?? 'en')} ({percent}%)
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Recent Transactions List */}
        <section aria-labelledby="recent-transactions-title" className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 id="recent-transactions-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('dashboard.recent')}
            </h2>
            <Link
              to="/transactions"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <span>{t('dashboard.viewAll')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          ) : recentTransactions.length === 0 && !loadError ? (
            <div className="py-8">
              <EmptyState
                icon={Receipt}
                title={t('dashboard.empty')}
                description="You don't have any recorded transactions yet."
                action={
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    Add transaction
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800/80">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/75 dark:bg-gray-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('dashboard.description')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('dashboard.amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {recentTransactions.map((transaction) => {
                    const isIncome = transaction.type === 'income'
                    return (
                      <tr key={transaction.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                              {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{transaction.date.slice(0, 10)}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isIncome ? '+' : '-'}{formatAmount(transaction.amount, i18n.resolvedLanguage ?? 'en')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
