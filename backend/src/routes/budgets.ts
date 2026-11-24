import { Category, type Budget } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).optional(),
})

const budgetCategoryValues = new Set(Object.values(Category).map((category) => category.toLowerCase()))
const budgetCategorySchema = z
  .string()
  .refine((category) => budgetCategoryValues.has(category), 'Category must be a supported lowercase value.')
  .transform((category) => category.toUpperCase() as Category)

const createBudgetSchema = z.object({
  amount: z.number().positive().max(9_999_999_999.99),
  category: budgetCategorySchema,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
})

const budgetIdParamSchema = z.string().uuid()

// Build the start and end Date for a given month/year (UTC)
function monthBounds(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))       // e.g. 2026-11-01T00:00:00Z
  const end   = new Date(Date.UTC(year, month, 1))           // e.g. 2026-12-01T00:00:00Z
  return { start, end }
}

function budgetSpendingKey(category: Category, month: number, year: number) {
  return `${year}-${month}-${category}`
}

function toBudgetDto(budget: Budget, spent: number) {
  return {
    id: budget.id,
    amount: Number(budget.amount),
    category: budget.category.toLowerCase(),
    month: budget.month,
    year: budget.year,
    // spent = total expense transactions for this month/year, regardless of category
    spent,
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

router.get('/', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  const parsedQuery = budgetQuerySchema.safeParse(request.query)
  if (!parsedQuery.success) {
    return response.status(400).json({ message: 'Month must be 1 to 12 and year must be an integer of 2020 or later.' })
  }

  try {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: request.userId,
        ...(parsedQuery.data.month === undefined ? {} : { month: parsedQuery.data.month }),
        ...(parsedQuery.data.year === undefined ? {} : { year: parsedQuery.data.year }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { category: 'asc' }],
    })

    if (budgets.length === 0) return response.json([])

    const userId = request.userId
    const budgetMonthBounds = budgets.map((budget) => monthBounds(budget.month, budget.year))
    const start = new Date(Math.min(...budgetMonthBounds.map((bounds) => bounds.start.getTime())))
    const end = new Date(Math.max(...budgetMonthBounds.map((bounds) => bounds.end.getTime())))

    // Group once by category and transaction date, then collapse dates into budget months.
    const expenseGroups = await prisma.transaction.groupBy({
      by: ['category', 'date'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    })

    const spentByBudgetKey = new Map<string, number>()
    for (const group of expenseGroups) {
      const month = group.date.getUTCMonth() + 1
      const year = group.date.getUTCFullYear()
      const key = budgetSpendingKey(group.category, month, year)
      const amount = Number(group._sum.amount ?? 0)
      spentByBudgetKey.set(key, (spentByBudgetKey.get(key) ?? 0) + amount)
    }

    const budgetsWithSpent = budgets.map((budget) => {
      const key = budgetSpendingKey(budget.category, budget.month, budget.year)
      return toBudgetDto(budget, spentByBudgetKey.get(key) ?? 0)
    })

    return response.json(budgetsWithSpent)
  } catch (error) {
    return next(error)
  }
})

router.post('/', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  const parsedBody = createBudgetSchema.safeParse(request.body)
  if (!parsedBody.success) {
    return response.status(400).json({
      message: 'Provide a positive amount, a valid lowercase category, a month from 1 to 12, and a year of 2020 or later.',
    })
  }

  try {
    const budget = await prisma.budget.create({
      data: {
        ...parsedBody.data,
        userId: request.userId,
      },
    })
    return response.status(201).json(toBudgetDto(budget, 0))
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return response.status(409).json({ message: 'A budget already exists for this category and month.' })
    }
    return next(error)
  }
})

router.delete('/:id', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  const parsedId = budgetIdParamSchema.safeParse(request.params.id)
  if (!parsedId.success) {
    return response.status(400).json({ message: 'Budget id must be a valid UUID.' })
  }

  try {
    const result = await prisma.budget.deleteMany({
      where: { id: parsedId.data, userId: request.userId },
    })

    if (result.count === 0) return response.status(404).json({ message: 'Budget not found.' })
    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
})

export default router
