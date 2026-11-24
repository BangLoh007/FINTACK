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
    budget: {
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

describe('budget routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication before accessing budgets', async () => {
    const response = await request(app).get('/api/budgets')

    expect(response.status).toBe(401)
    expect(prismaMock.budget.findMany).not.toHaveBeenCalled()
  })

  it('lists only the authenticated user’s budgets and applies optional filters', async () => {
    prismaMock.budget.findMany.mockResolvedValue([])

    const response = await request(app)
      .get('/api/budgets?month=4&year=2026')
      .set('Cookie', authCookie(userA))

    expect(response.status).toBe(200)
    expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
      where: { userId: userA, month: 4, year: 2026 },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { category: 'asc' }],
    })
    expect(prismaMock.budget.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: userB }) }),
    )
  })

  it('rejects invalid month and year filters', async () => {
    const response = await request(app)
      .get('/api/budgets?month=13&year=2019')
      .set('Cookie', authCookie(userA))

    expect(response.status).toBe(400)
    expect(prismaMock.budget.findMany).not.toHaveBeenCalled()
  })

  it('validates budget input and takes userId only from the verified token', async () => {
    const invalidResponse = await request(app)
      .post('/api/budgets')
      .set('Cookie', authCookie(userA))
      .send({ amount: 0, category: 'food', month: 13, year: 2019 })

    expect(invalidResponse.status).toBe(400)
    expect(prismaMock.budget.create).not.toHaveBeenCalled()

    const unknownCategoryResponse = await request(app)
      .post('/api/budgets')
      .set('Cookie', authCookie(userA))
      .send({ amount: 5000, category: 'travel', month: 4, year: 2026 })

    expect(unknownCategoryResponse.status).toBe(400)
    expect(prismaMock.budget.create).not.toHaveBeenCalled()

    const budget = {
      id: '00000000-0000-4000-8000-000000000101',
      amount: 5000,
      category: 'FOOD',
      month: 4,
      year: 2026,
      userId: userA,
    }
    prismaMock.budget.create.mockResolvedValue(budget)

    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', authCookie(userA))
      .send({ amount: 5000, category: 'food', month: 4, year: 2026, userId: userB })

    expect(response.status).toBe(201)
    expect(prismaMock.budget.create).toHaveBeenCalledWith({
      data: { amount: 5000, category: 'FOOD', month: 4, year: 2026, userId: userA },
    })
    expect(response.body).toEqual({
      id: budget.id,
      amount: 5000,
      category: 'food',
      month: 4,
      year: 2026,
    })
    expect(response.body).not.toHaveProperty('userId')
  })

  it('returns a conflict for duplicate category budgets in the same month', async () => {
    prismaMock.budget.create.mockRejectedValue(Object.assign(new Error('unique constraint'), { code: 'P2002' }))

    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', authCookie(userA))
      .send({ amount: 5000, category: 'food', month: 4, year: 2026 })

    expect(response.status).toBe(409)
  })

  it('deletes only a budget owned by the authenticated user', async () => {
    prismaMock.budget.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(app)
      .delete('/api/budgets/00000000-0000-4000-8000-000000000202')
      .set('Cookie', authCookie(userA))

    expect(response.status).toBe(404)
    expect(prismaMock.budget.deleteMany).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000202', userId: userA },
    })
  })
})
