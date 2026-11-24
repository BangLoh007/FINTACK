import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { env } from '../config/env'

export const pool = new Pool({ connectionString: env.databaseUrl })

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message, error.stack)
})

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })
