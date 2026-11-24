import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
})

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

router.get('/me', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  try {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    if (!user) return response.status(401).json({ message: 'Authentication required.' })
    return response.json({ user })
  } catch (error) {
    return next(error)
  }
})

router.put('/me', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  const parsedBody = profileSchema.safeParse(request.body)
  if (!parsedBody.success) {
    return response.status(400).json({ message: 'Provide a name and a valid email address.' })
  }

  try {
    const user = await prisma.user.update({
      where: { id: request.userId },
      data: parsedBody.data,
      select: { id: true, name: true, email: true, createdAt: true },
    })
    return response.json({ user })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return response.status(409).json({ message: 'An account with this email already exists.' })
    }
    if (isPrismaErrorCode(error, 'P2025')) {
      return response.status(401).json({ message: 'Authentication required.' })
    }
    return next(error)
  }
})

router.put('/me/password', async (request, response, next) => {
  if (!request.userId) return response.status(401).json({ message: 'Authentication required.' })

  const parsedBody = passwordSchema.safeParse(request.body)
  if (!parsedBody.success) {
    return response.status(400).json({ message: 'Provide the current password and a new password of at least 8 characters.' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, passwordHash: true },
    })

    if (!user) return response.status(401).json({ message: 'Authentication required.' })

    const currentPasswordMatches = await bcrypt.compare(parsedBody.data.currentPassword, user.passwordHash)
    if (!currentPasswordMatches) {
      return response.status(401).json({ message: 'Current password is incorrect.' })
    }

    const passwordHash = await bcrypt.hash(parsedBody.data.newPassword, 12)
    await prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash },
      select: { id: true },
    })

    return response.status(204).end()
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2025')) {
      return response.status(401).json({ message: 'Authentication required.' })
    }
    return next(error)
  }
})

export default router
