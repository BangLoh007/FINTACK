import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import SummaryCard from '../components/SummaryCard'
import EmptyState from '../components/EmptyState'
import { apiRequest } from '../lib/api'

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
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
  if (!Array.isArray(data)) throw new Error('The server returned invalid transaction data.')

  const transactions: Transaction[] = []
  for (const transaction of data as unknown[]) {
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTransactions() {
      try {
        setIsLoading(true)
        setLoadError(null)
        const data = await apiRequest<unknown>('/transactions', { signal: controller.signal })
        setTransactions(parseTransactions(data))
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
  }, [t])

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

  return (
    <div className="space-y-8">
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

      <section aria-labelledby="recent-transactions-title" className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="recent-transactions-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('dashboard.recent')}
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <span>View all</span>
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
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50/75 dark:bg-gray-800/50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('dashboard.date')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('dashboard.description')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('dashboard.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                {recentTransactions.map((transaction) => {
                  const isIncome = transaction.type === 'income'
                  return (
                    <tr key={transaction.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {transaction.date}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                            {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <span>{transaction.description}</span>
                        </div>
                      </td>
                      <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
  )
}

export default Dashboard
