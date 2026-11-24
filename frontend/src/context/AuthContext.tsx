import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, setUnauthorizedHandler } from '../lib/api'
import type { AuthResponse, AuthUser } from '../types/auth'

type Credentials = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthReady: boolean
  login: (credentials: Credentials) => Promise<void>
  register: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const handleUnauthorized = useCallback(() => {
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  useLayoutEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  useEffect(() => {
    const controller = new AbortController()

    async function restoreSession() {
      try {
        const response = await apiRequest<AuthResponse>('/auth/me', {
          requiresAuth: false,
          signal: controller.signal,
        })
        setUser(response.user)
      } catch {
        if (!controller.signal.aborted) setUser(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials: Credentials) => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify(credentials),
    })
    setUser(response.user)
  }, [])

  const register = useCallback(async (credentials: Credentials) => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify(credentials),
    })
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    await apiRequest<void>('/auth/logout', {
      method: 'POST',
      requiresAuth: false,
    })
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const isAuthReady = !isLoading && user !== null

  const value = useMemo(
    () => ({ user, isLoading, isAuthReady, login, register, logout }),
    [user, isLoading, isAuthReady, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.')
  return context
}
