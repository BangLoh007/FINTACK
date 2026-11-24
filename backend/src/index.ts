import app from './app'
import { env } from './config/env'
import { pool, prisma } from './lib/prisma'

const server = app.listen(env.port, () => {
  console.log(`FinTrack API is listening on port ${env.port}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Failed to start FinTrack API:', error.message, error.stack)
  process.exitCode = 1
})

let isShuttingDown = false

process.on('SIGTERM', () => {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log('SIGTERM received; shutting down FinTrack API.')

  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error.message, error.stack)
      process.exitCode = 1
    }

    void Promise.allSettled([prisma.$disconnect(), pool.end()]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('Resource shutdown failed:', result.reason)
          process.exitCode = 1
        }
      }
    })
  })
})
