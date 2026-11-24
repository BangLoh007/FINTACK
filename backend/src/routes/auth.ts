import bcrypt from 'bcrypt'
import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env'
import { AUTH_COOKIE_NAME, requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many registration attempts. Please try again later.' },
})
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many login attempts. Please try again later.' },
})

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
})

const dummyPasswordHash = bcrypt.hashSync('FinTrack missing-user password comparison', 12)
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
  path: '/',
  maxAge: 60 * 60 * 1000,
}

function createToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  })
}

function setAuthCookie(response: Response, token: string) {
  response.cookie(AUTH_COOKIE_NAME, token, cookieOptions)
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

router.post('/register', registerLimiter, async (request, response, next) => {
  const parsedBody = credentialsSchema.safeParse(request.body)
  if (!parsedBody.success) {
    return response.status(400).json({ message: 'Provide a valid email and a password from 8 to 72 characters.' })
  }

  const { email, password } = parsedBody.data

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    })

    setAuthCookie(response, createToken(user.id))
    return response.status(201).json({ user })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return response.status(409).json({ message: 'An account with this email already exists.' })
    }
    return next(error)
  }
})

router.post('/login', loginLimiter, async (request, response, next) => {
  const parsedBody = credentialsSchema.safeParse(request.body)
  if (!parsedBody.success) {
    return response.status(400).json({ message: 'Provide a valid email and a password from 8 to 72 characters.' })
  }

  const { email, password } = parsedBody.data

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, createdAt: true },
    })
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? dummyPasswordHash)

    if (!user || !passwordMatches) {
      return response.status(401).json({ message: 'Email or password is incorrect.' })
    }

    setAuthCookie(response, createToken(user.id))
    return response.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/logout', (_request, response) => {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
  })
  return response.status(204).end()
})

router.get('/me', requireAuth, async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  try {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, createdAt: true },
    })

    if (!user) return response.status(401).json({ message: 'Authentication required.' })
    return response.json({ user })
  } catch (error) {
    return next(error)
  }
})

export default router
