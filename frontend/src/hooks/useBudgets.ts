import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { isBudget, type Budget, type CreateBudgetInput } from '../types/budget'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

function parseBudgets(data: unknown): Budget[] {
  if (!Array.isArray(data)) {
    throw new Error('The server returned an invalid budgets response.')
  }

  return data.map((budget) => {
    if (!isBudget(budget)) {
      throw new Error('The server returned an invalid budget record.')
    }
    return budget
  })
}

function sortBudgets(budgets: Budget[]) {
  return [...budgets].sort(
    (left, right) =>
      right.year - left.year ||
      right.month - left.month ||
      left.category.localeCompare(right.category),
  )
}

export function useBudgets(isAuthReady = true) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBudgets = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiRequest<unknown>('/budgets', { signal })
      if (!signal?.aborted) {
        setBudgets(sortBudgets(parseBudgets(data)))
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(getErrorMessage(requestError))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthReady) {
      setIsLoading(true)
      return
    }

    const controller = new AbortController()
    void loadBudgets(controller.signal)
    return () => controller.abort()
  }, [loadBudgets, isAuthReady])

  const addBudget = useCallback(async (input: CreateBudgetInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const data = await apiRequest<unknown>('/budgets', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!isBudget(data)) {
        throw new Error('The server returned an invalid budget.')
      }

      setBudgets((current) => sortBudgets([data, ...current]))
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const deleteBudget = useCallback(async (id: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await apiRequest<void>(`/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setBudgets((current) => current.filter((budget) => budget.id !== id))
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { budgets, isLoading, isSubmitting, error, addBudget, deleteBudget }
}
