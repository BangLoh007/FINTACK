import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useTheme } from '../context/ThemeContext'
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
    (transaction.type === 'income' || transaction.type === 'expense')
  )
}

function parseTransactions(data: unknown): Transaction[] {
  const items = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && 'data' in data && Array.isArray((data as { data: unknown[] }).data)
    ? (data as { data: unknown[] }).data
    : null

  if (!items) {
    throw new Error('The server returned an invalid transactions response.')
  }

  return items.map((transaction) => {
    if (!isTransaction(transaction)) {
      throw new Error('The server returned an invalid transaction record.')
    }
    return transaction
  })
}

const chartColors = ['#10b981', '#f43f5e']

const categoryPalette = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#ec4899', // pink
  '#6b7280', // gray
]

function formatCurrency(value: number, language: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function Reports() {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTransactions() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await apiRequest<unknown>('/transactions', { signal: controller.signal })
        setTransactions(parseTransactions(data))
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
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
  }, [t])

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        if (transaction.type === 'income') result.income += transaction.amount
        else result.expense += transaction.amount
        return result
      },
      { income: 0, expense: 0 },
    )
  }, [transactions])

  const chartData = [
    { name: t('reports.income'), amount: totals.income },
    { name: t('reports.expense'), amount: totals.expense },
  ]

  const categoryData = useMemo(() => {
    const expenseMap: Record<string, number> = {}
    for (const transaction of transactions) {
      if (transaction.type === 'expense') {
        const cat = transaction.category ?? 'other'
        expenseMap[cat] = (expenseMap[cat] ?? 0) + transaction.amount
      }
    }

    return Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      name: t(`categories.${category}`, category),
      amount,
    }))
  }, [transactions, t])

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
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('nav.reports')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('reports.description')}</p>
      </header>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-emerald-50/50 p-6 shadow-lg shadow-emerald-500/5 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('reports.income')}</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.income, i18n.resolvedLanguage ?? 'en')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-rose-50/50 p-6 shadow-lg shadow-rose-500/5 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('reports.expense')}</p>
              <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {formatCurrency(totals.expense, i18n.resolvedLanguage ?? 'en')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : totals.income === 0 && totals.expense === 0 ? (
        <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-indigo-50/40 p-8 shadow-lg shadow-indigo-500/5 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 sm:p-12">
          <EmptyState
            icon={BarChart3}
            title={t('reports.empty')}
            description="Add some income and expense transactions to generate visual reports."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Income vs Expense Pie Chart */}
          <article className="rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-lg shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/15 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('reports.pieTitle')}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('reports.noCategories')}</p>
              </div>
            </div>

            <div className="mt-6 h-72" aria-label={t('reports.pieLabel')}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter((entry) => entry.amount > 0)}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {chartData.filter((entry) => entry.amount > 0).map((entry) => (
                      <Cell key={entry.name} fill={chartColors[entry.name === t('reports.income') ? 0 : 1]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => formatCurrency(Number(value), i18n.resolvedLanguage ?? 'en')}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Cashflow Bar Chart */}
          <article className="rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-blue-50/40 p-6 shadow-lg shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/15 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 sm:p-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('reports.barTitle')}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('reports.barDescription')}</p>
              </div>
            </div>

            <div className="mt-6 h-72" aria-label={t('reports.barLabel')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en', { notation: 'compact' }).format(value)
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: axisColor, fontSize: 12 }}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => formatCurrency(Number(value), i18n.resolvedLanguage ?? 'en')}
                  />
                  <Bar dataKey="amount" name={t('reports.amount')} radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Expense Breakdown by Category */}
          {categoryData.length > 0 && (
            <article className="rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-purple-50/40 p-6 shadow-lg shadow-purple-500/10 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/15 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40 sm:p-8 xl:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                    {t('reports.categoryTitle')}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('reports.categoryDescription')}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={50}
                        paddingAngle={3}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={index} fill={categoryPalette[index % categoryPalette.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => formatCurrency(Number(value), i18n.resolvedLanguage ?? 'en')}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {categoryData.map((item, index) => {
                    const color = categoryPalette[index % categoryPalette.length]
                    const percent = totals.expense > 0 ? Math.round((item.amount / totals.expense) * 100) : 0
                    return (
                      <div key={item.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{percent}%</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.amount, i18n.resolvedLanguage ?? 'en')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  )
}

export default Reports
