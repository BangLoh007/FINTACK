import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    budget: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }))

import app from '../src/app'

const userId = '00000000-0000-4000-8000-000000000001'
const jwtSecret = process.env.JWT_SECRET ?? 'test-only-jwt-secret-with-at-least-32-characters'

function authCookie() {
  const token = jwt.sign({ sub: userId }, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })
  return `fintrack_token=${token}`
}

describe('user settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication for profile routes', async () => {
    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(401)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns profile fields without passwordHash', async () => {
    const user = {
      id: userId,
      name: 'Fin User',
      email: 'fin@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    prismaMock.user.findUnique.mockResolvedValue(user)

    const response = await request(app).get('/api/users/me').set('Cookie', authCookie())

    expect(response.status).toBe(200)
    expect(response.body.user).toEqual({ ...user, createdAt: user.createdAt.toISOString() })
    expect(response.body.user).not.toHaveProperty('passwordHash')
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    })
  })

  it('validates and updates the authenticated user profile', async () => {
    const user = {
      id: userId,
      name: 'Fin User',
      email: 'fin@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    prismaMock.user.update.mockResolvedValue(user)

    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', authCookie())
      .send({ name: '  Fin User  ', email: '  FIN@example.com  ' })

    expect(response.status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { name: 'Fin User', email: 'fin@example.com' },
      select: { id: true, name: true, email: true, createdAt: true },
    })
    expect(response.body.user).not.toHaveProperty('passwordHash')
  })

  it('rejects invalid profile fields without updating the user', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', authCookie())
      .send({ name: '   ', email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('returns 409 when the updated email is already taken', async () => {
    prismaMock.user.update.mockRejectedValue({ code: 'P2002' })

    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', authCookie())
      .send({ name: 'Fin User', email: 'taken@example.com' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ message: 'An account with this email already exists.' })
  })

  it('rejects an incorrect current password without changing the password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, passwordHash: 'stored-hash' })
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)

    const response = await request(app)
      .put('/api/users/me/password')
      .set('Cookie', authCookie())
      .send({ currentPassword: 'incorrect', newPassword: 'new-secure-password' })

    expect(response.status).toBe(401)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('hashes and saves a new password after verifying the current password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, passwordHash: 'stored-hash' })
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never)
    prismaMock.user.update.mockResolvedValue({ id: userId })

    const response = await request(app)
      .put('/api/users/me/password')
      .set('Cookie', authCookie())
      .send({ currentPassword: 'correct-current', newPassword: 'new-secure-password' })

    expect(response.status).toBe(204)
    expect(bcrypt.compare).toHaveBeenCalledWith('correct-current', 'stored-hash')
    expect(bcrypt.hash).toHaveBeenCalledWith('new-secure-password', 12)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { passwordHash: 'new-hash' },
      select: { id: true },
    })
    expect(response.text).toBeFalsy()
  })

  it('rejects a new password shorter than 8 characters', async () => {
    const response = await request(app)
      .put('/api/users/me/password')
      .set('Cookie', authCookie())
      .send({ currentPassword: 'current-password', newPassword: 'short' })

    expect(response.status).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})
