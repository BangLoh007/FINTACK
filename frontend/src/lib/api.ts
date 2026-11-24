const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')

type ApiRequestOptions = RequestInit & {
  requiresAuth?: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function getMessage(body: unknown, fallback: string) {
  if (
    typeof body === 'object' && body !== null &&
    'message' in body && typeof body.message === 'string'
  ) {
    return body.message
  }
  return fallback
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers, ...requestOptions } = options
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const requestHeaders = new Headers(headers)
  if (requestOptions.body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...requestOptions,
    credentials: 'include',
    headers: requestHeaders,
  })

  const responseText = await response.text()
  let responseBody: unknown
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = undefined
    }
  }

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      unauthorizedHandler?.()
      if (!unauthorizedHandler && window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    throw new ApiError(getMessage(responseBody, 'The request failed.'), response.status)
  }

  if (response.status === 204 || !responseText) return undefined as T
  if (responseBody === undefined) throw new ApiError('The server returned an invalid response.', response.status)
  return responseBody as T
}
