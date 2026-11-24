import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }))

import app from '../src/app'

describe('authentication routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers with a normalized email, hashes the password, and sets an httpOnly cookie', async () => {
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'person@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    prismaMock.user.create.mockResolvedValue(user)

    const response = await request(app).post('/api/auth/register').send({
      email: '  Person@Example.com ',
      password: 'long-safe-password',
    })

    expect(response.status).toBe(201)
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'person@example.com',
        passwordHash: expect.stringMatching(/^\$2[aby]\$12\$/),
      },
      select: { id: true, email: true, createdAt: true },
    })
    expect(response.body.user).toEqual({ ...user, createdAt: user.createdAt.toISOString() })
    expect(response.body).not.toHaveProperty('passwordHash')
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax')
    const token = response.headers['set-cookie'][0].split(';')[0].split('=')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] })
    expect(payload).toMatchObject({ sub: user.id })
    expect(Object.keys(payload)).toEqual(['sub', 'iat', 'exp'])
  })

  it('uses the same unauthorized response for unknown emails and wrong passwords', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const unknownEmailResponse = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'long-safe-password',
    })

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'person@example.com',
      passwordHash: await bcrypt.hash('a-different-valid-password', 12),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const wrongPasswordResponse = await request(app).post('/api/auth/login').send({
      email: 'person@example.com',
      password: 'long-safe-password',
    })

    expect(unknownEmailResponse.status).toBe(401)
    expect(wrongPasswordResponse.status).toBe(401)
    expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body)
  })

  it('returns the authenticated user without password data', async () => {
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'person@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    prismaMock.user.create.mockResolvedValue(user)
    prismaMock.user.findUnique.mockResolvedValue(user)

    const registerResponse = await request(app).post('/api/auth/register').send({
      email: user.email,
      password: 'long-safe-password',
    })
    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Cookie', registerResponse.headers['set-cookie'])

    expect(meResponse.status).toBe(200)
    expect(meResponse.body.user.email).toBe(user.email)
    expect(meResponse.body.user).not.toHaveProperty('passwordHash')
  })

  it('clears the session cookie on logout', async () => {
    const response = await request(app).post('/api/auth/logout')

    expect(response.status).toBe(204)
    expect(response.headers['set-cookie'][0]).toContain('fintrack_token=;')
  })
})
