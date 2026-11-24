import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export const AUTH_COOKIE_NAME = 'fintrack_token'

export const requireAuth: RequestHandler = (request, response, next) => {
  const token = request.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string') {
    return response.status(401).json({ message: 'Authentication required.' })
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return response.status(401).json({ message: 'Authentication required.' })
    }

    request.userId = payload.sub
    return next()
  } catch {
    return response.status(401).json({ message: 'Authentication required.' })
  }
}
