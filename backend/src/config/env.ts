import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  DATABASE_URL: z.string().refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must be a PostgreSQL connection string.',
  ),
  FRONTEND_ORIGIN: z
    .string()
    .url()
    .refine((value) => new URL(value).origin === value, 'FRONTEND_ORIGIN must be an origin without a path.')
    .default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters.'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
})

const parsedEnvironment = environmentSchema.safeParse(process.env)

if (!parsedEnvironment.success) {
  const missingOrInvalid = parsedEnvironment.error.issues
    .map((issue) => issue.path.join('.'))
    .join(', ')
  throw new Error(`Invalid environment configuration: ${missingOrInvalid}`)
}

export const env = {
  databaseUrl: parsedEnvironment.data.DATABASE_URL,
  frontendOrigin: parsedEnvironment.data.FRONTEND_ORIGIN,
  jwtSecret: parsedEnvironment.data.JWT_SECRET,
  nodeEnv: parsedEnvironment.data.NODE_ENV,
  port: parsedEnvironment.data.PORT,
}
