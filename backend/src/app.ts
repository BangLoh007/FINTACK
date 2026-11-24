import type { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { env } from './config/env'
import authRouter from './routes/auth'
import transactionsRouter from './routes/transactions'
import budgetsRouter from './routes/budgets'
import usersRouter from './routes/users'

const app = express()

app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(helmet())
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', message: 'FinTrack API is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/users', usersRouter)

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (
      typeof error === 'object' && error !== null &&
      'type' in error && error.type === 'entity.parse.failed'
    ) {
      return response.status(400).json({ message: 'Request body contains malformed JSON.' })
    }

    console.error(
      'API request failed:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined,
    )
    return response.status(500).json({ message: 'An internal server error occurred.' })
  },
)

export default app
