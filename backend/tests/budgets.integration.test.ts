import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { Category, Prisma } from '@prisma/client'
import app from '../src/app'
import { AUTH_COOKIE_NAME } from '../src/middleware/auth'
import { pool, prisma } from '../src/lib/prisma'

const jwtSecret = process.env.JWT_SECRET!
const createdUserIds: string[] = []

function authCookie(userId: string) {
  const token = jwt.sign({ sub: userId }, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })
  return `${AUTH_COOKIE_NAME}=${token}`
}

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      email: `budget-integration-${randomUUID()}@example.test`,
      passwordHash: 'integration-test-only',
    },
    select: { id: true },
  })

  createdUserIds.push(user.id)
  return { id: user.id, cookie: authCookie(user.id) }
}

function postBudget(cookie: string, month: number) {
  return request(app)
    .post('/api/budgets')
    .set('Cookie', cookie)
    .send({ amount: 250, category: 'food', month, year: 2098 })
}

describe('budget routes against the allowlisted database', () => {
  it('returns 409 for a sequential duplicate', async () => {
    const user = await createTestUser()

    const first = await postBudget(user.cookie, 1)
    const duplicate = await postBudget(user.cookie, 1)

    expect(first.status).toBe(201)
    expect(duplicate.status).toBe(409)
  })

  it('returns exactly one 201 and one 409 for concurrent duplicates', async () => {
    const user = await createTestUser()

    const responses = await Promise.all([
      postBudget(user.cookie, 2),
      postBudget(user.cookie, 2),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
  })

  it('allows two users to create the same category and period', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()

    const responses = await Promise.all([
      postBudget(userA.cookie, 3),
      postBudget(userB.cookie, 3),
    ])

    expect(responses.map((response) => response.status)).toEqual([201, 201])
  })

  it("returns 404 when user B tries to delete user A's budget and confirms A's budget still exists", async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()
    const createdBudget = await postBudget(userA.cookie, 5)

    expect(createdBudget.status).toBe(201)

    const deleteResponse = await request(app)
      .delete(`/api/budgets/${createdBudget.body.id}`)
      .set('Cookie', userB.cookie)

    expect(deleteResponse.status).toBe(404)

    const stillExistingBudget = await prisma.budget.findUnique({
      where: { id: createdBudget.body.id },
    })
    expect(stillExistingBudget).not.toBeNull()
    expect(stillExistingBudget?.userId).toBe(userA.id)
  })

  it('logs and confirms the real Prisma unique-violation error shape', async () => {
    const user = await createTestUser()
    const data = {
      amount: new Prisma.Decimal(250),
      category: Category.HEALTH,
      month: 4,
      year: 2098,
      userId: user.id,
    }

    await prisma.budget.create({ data })

    let caughtError: unknown
    try {
      await prisma.budget.create({ data })
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    if (!(caughtError instanceof Prisma.PrismaClientKnownRequestError)) {
      throw new Error('Expected a Prisma known request error for the duplicate budget.')
    }

    const errorShape = {
      name: caughtError.name,
      code: caughtError.code,
      meta: caughtError.meta,
    }
    console.info('Observed Prisma unique-violation shape:', JSON.stringify(errorShape))
    expect(caughtError.code).toBe('P2002')
  })

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      }
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })
})
