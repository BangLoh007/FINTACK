export const budgetCategories = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'shopping',
  'other',
] as const

export type BudgetCategory = (typeof budgetCategories)[number]

export type Budget = {
  id: string
  amount: number
  category: BudgetCategory
  month: number
  year: number
  // spent = sum of expense transactions in this category/month/year (from API)
  spent: number
}

// CreateBudgetInput does not include 'id' or 'spent' (server-computed)
export type CreateBudgetInput = Omit<Budget, 'id' | 'spent'>

export function isBudget(value: unknown): value is Budget {
  if (typeof value !== 'object' || value === null) return false

  const budget = value as Record<string, unknown>
  return (
    typeof budget.id === 'string' &&
    typeof budget.amount === 'number' &&
    Number.isFinite(budget.amount) &&
    budget.amount > 0 &&
    typeof budget.category === 'string' &&
    budgetCategories.includes(budget.category as BudgetCategory) &&
    typeof budget.month === 'number' &&
    Number.isInteger(budget.month) &&
    budget.month >= 1 &&
    budget.month <= 12 &&
    typeof budget.year === 'number' &&
    Number.isInteger(budget.year) &&
    budget.year >= 2020 &&
    budget.year <= 2100 &&
    typeof budget.spent === 'number' &&
    Number.isFinite(budget.spent) &&
    budget.spent >= 0
  )
}
