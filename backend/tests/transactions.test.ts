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

const jwtSecret = process.env.JWT_SECRET ?? 'test-only-jwt-secret-with-at-least-32-characters'
const userA = '00000000-0000-4000-8000-000000000001'
const userB = '00000000-0000-4000-8000-000000000002'

function authCookie(userId: string) {
  const token = jwt.sign({ sub: userId }, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })
  return `fintrack_token=${token}`
}

describe('transaction ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes transaction reads to the user in the verified token', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([])

    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', authCookie(userA))

    expect(response.status).toBe(200)
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: userA },
      orderBy: { date: 'desc' },
    })
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: userB } }),
    )
  })

  it('takes userId from the token when creating a transaction', async () => {
    prismaMock.transaction.create.mockResolvedValue({
      id: 'transaction-1',
      date: new Date('2026-01-01T00:00:00.000Z'),
      description: 'Salary',
      amount: 1000,
      type: 'INCOME',
      userId: userA,
    })

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', authCookie(userA))
      .send({ description: 'Salary', amount: 1000, type: 'income', userId: userB })

    expect(response.status).toBe(201)
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: { description: 'Salary', amount: 1000, type: 'INCOME', userId: userA },
    })
  })

  it('returns 404 when the authenticated user deletes another user’s transaction', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(app)
      .delete('/api/transactions/transaction-b')
      .set('Cookie', authCookie(userA))

    expect(response.status).toBe(404)
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: 'transaction-b', userId: userA },
    })
  })

  it('rejects a JWT signed with a different algorithm', async () => {
    const token = jwt.sign({ sub: userA }, jwtSecret, { algorithm: 'HS384', expiresIn: '1h' })
    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', `fintrack_token=${token}`)

    expect(response.status).toBe(401)
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled()
  })
})
