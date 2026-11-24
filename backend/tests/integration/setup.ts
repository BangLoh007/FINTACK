const databaseUrl = process.env.DATABASE_URL
const allowedDatabaseHost = process.env.ALLOWED_TEST_DB_HOST

if (!databaseUrl) {
  throw new Error('Integration tests require DATABASE_URL from the process environment.')
}

if (!allowedDatabaseHost) {
  throw new Error('Integration tests require ALLOWED_TEST_DB_HOST from the process environment.')
}

let databaseHost: string
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase()
} catch {
  throw new Error('Integration tests refused to run because DATABASE_URL is not a valid URL.')
}

if (databaseHost !== allowedDatabaseHost.toLowerCase()) {
  throw new Error('Integration tests refused to run because DATABASE_URL host is not allowlisted.')
}

process.env.NODE_ENV = 'test'
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173'
process.env.JWT_SECRET ??= 'integration-test-secret-that-is-at-least-32-characters'
