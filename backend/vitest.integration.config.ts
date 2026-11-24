import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  envDir: false,
  resolve: {
    alias: [
      {
        find: /^dotenv\/config$/,
        replacement: resolve(__dirname, 'tests/integration/no-dotenv.ts'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/budgets.integration.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
