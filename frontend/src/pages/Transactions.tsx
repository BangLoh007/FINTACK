import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusCircle,
  Trash2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Utensils,
  Car,
  Home,
  Zap,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  type LucideIcon,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { apiRequest } from '../lib/api'

type TransactionType = 'income' | 'expense'

// Category values must match the lowercase values from the backend enum
type Category =
  | 'food'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'other'

// All selectable categories in the form
const ALL_CATEGORIES: Category[] = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'shopping',
  'other',
]

// Icon mapping per category
const categoryIcons: Record<Category, LucideIcon> = {
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

// Tailwind color mapping per category
const categoryColors: Record<Category, { bg: string; text: string }> = {
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

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  category: Category
}

function isCategory(value: unknown): value is Category {
  return ALL_CATEGORIES.includes(value as Category)
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const transaction = value as Record<string, unknown>

  return (
    typeof transaction.id === 'string' &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === 'number' &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    (transaction.type === 'income' || transaction.type === 'expense') &&
    isCategory(transaction.category)
  )
}

function parseTransactions(data: unknown): { transactions: Transaction[]; pagination?: { page: number; limit: number; totalCount: number; totalPages: number } } {
  if (typeof data === 'object' && data !== null && 'data' in data && 'pagination' in data) {
    const wrapped = data as { data: unknown[]; pagination: { page: number; limit: number; totalCount: number; totalPages: number } }
    const items: Transaction[] = []
    for (const transaction of wrapped.data) {
      if (!isTransaction(transaction)) {
        throw new Error('The server returned an invalid transaction record.')
      }
      items.push(transaction)
    }
    return { transactions: items, pagination: wrapped.pagination }
  }

  if (!Array.isArray(data)) {
    throw new Error('The server returned an invalid transactions response.')
  }

  const transactions: Transaction[] = []
  for (const transaction of data as unknown[]) {
    if (!isTransaction(transaction)) {
      throw new Error('The server returned an invalid transaction record.')
    }
    transactions.push(transaction)
  }
  return { transactions }
}

function formatAmount(amount: number, language: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function Transactions() {
  const { t, i18n } = useTranslation()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('income')
  const [category, setCategory] = useState<Category>('other')

  // Search, Filter, and Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTransactions() {
      try {
        setIsLoading(true)
        setLoadError(null)

        const params = new URLSearchParams()
        params.set('page', String(currentPage))
        params.set('limit', '8')
        if (searchQuery.trim()) params.set('search', searchQuery.trim())
        if (filterType !== 'all') params.set('type', filterType)
        if (filterCategory !== 'all') params.set('category', filterCategory)

        const data = await apiRequest<unknown>(`/transactions?${params.toString()}`, {
          signal: controller.signal,
        })
        const parsed = parseTransactions(data)
        setTransactions(parsed.transactions)
        if (parsed.pagination) {
          setTotalPages(parsed.pagination.totalPages)
          setTotalCount(parsed.pagination.totalCount)
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : t('transactions.loadError'),
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    return () => controller.abort()
  }, [t, currentPage, searchQuery, filterType, filterCategory])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedDescription = description.trim()
    const numericAmount = Number(amount)

    if (!trimmedDescription || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError(t('transactions.invalidForm'))
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    try {
      const data = await apiRequest<unknown>('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description: trimmedDescription,
          amount: numericAmount,
          type,
          category,
        }),
      })

      if (!isTransaction(data)) {
        throw new Error(t('transactions.invalidResponse'))
      }

      setTransactions((currentTransactions) => [data, ...currentTransactions])
      setDescription('')
      setAmount('')
      setType('income')
      setCategory('other')
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : t('common.unexpectedError'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setFormError(null)

    try {
      await apiRequest<void>(`/transactions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      setTransactions((currentTransactions) =>
        currentTransactions.filter((transaction) => transaction.id !== id),
      )
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : t('transactions.deleteError'))
    }
  }

  function handleExportCsv() {
    if (transactions.length === 0) return

    const headers = ['ID', 'Date', 'Description', 'Type', 'Category', 'Amount (THB)']
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.amount.toFixed(2),
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `fintrack-transactions-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalIncome = transactions.reduce(
    (total, transaction) => (transaction.type === 'income' ? total + transaction.amount : total),
    0,
  )
  const totalExpense = transactions.reduce(
    (total, transaction) => (transaction.type === 'expense' ? total + transaction.amount : total),
    0,
  )

  return (
    <div className="space-y-8">
      {/* Form Card */}
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {t('transactions.addTitle')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-5 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('transactions.description')}
            </label>
            <input
              id="description"
              name="description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('transactions.descriptionPlaceholder')}
              required
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('transactions.amount')}
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t('transactions.amountPlaceholder')}
              required
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('transactions.type')}
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as TransactionType)}
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            >
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
            </select>
          </div>

          {/* Category selector — only shown for expenses, since income rarely has a category */}
          <div>
            <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('transactions.category')}
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600 md:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isSubmitting ? t('transactions.adding') : t('transactions.add')}</span>
          </button>
        </form>

        {loadError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {loadError}
          </p>
        )}
        {formError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {formError}
          </p>
        )}
      </section>

      {/* List Card */}
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('transactions.recent')} {totalCount > 0 && <span className="text-sm font-normal text-gray-400">({totalCount})</span>}
          </h2>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-48 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder={t('transactions.searchPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t('transactions.allTypes')}</option>
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t('transactions.allCategories')}</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={transactions.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Export to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('transactions.empty')}
            description="Use the form above to record your first transaction."
          />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence initial={false}>
              {transactions.map((transaction) => {
                const isIncome = transaction.type === 'income'
                // Use category icon and color; fall back to income/expense arrow for safety
                const CatIcon = categoryIcons[transaction.category] ?? (isIncome ? ArrowDownLeft : ArrowUpRight)
                const catColor = categoryColors[transaction.category] ?? (isIncome
                  ? { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400' }
                  : { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400' })
                return (
                  <motion.li
                    key={transaction.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Category icon with its color */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${catColor.bg} ${catColor.text}`}>
                        <CatIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {t(`categories.${transaction.category}`)} · {transaction.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatAmount(transaction.amount, i18n.resolvedLanguage ?? 'en')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        aria-label={t('transactions.deleteLabel', { description: transaction.description })}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('transactions.page')} <span className="font-semibold text-gray-900 dark:text-gray-100">{currentPage}</span> {t('transactions.of')}{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{t('transactions.previous')}</span>
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>{t('transactions.next')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-gray-100 pt-6 dark:border-gray-800 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('transactions.totalIncome')}</span>
            </div>
            <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {formatAmount(totalIncome, i18n.resolvedLanguage ?? 'en')}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex items-center gap-2.5">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('transactions.totalExpense')}</span>
            </div>
            <span className="text-base font-semibold text-rose-600 dark:text-rose-400">
              {formatAmount(totalExpense, i18n.resolvedLanguage ?? 'en')}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={transactions.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Export to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Transactions
