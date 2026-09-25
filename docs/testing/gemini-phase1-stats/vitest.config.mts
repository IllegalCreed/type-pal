import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../..')

export default defineConfig({
  root: here,
  resolve: {
    alias: {
      '@type-pal/shared': path.join(repo, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(repo, 'packages/game/vitest.setup.ts')],
    include: ['tests/**/*.test.ts'],
    exclude: ['diagnostics/**', 'node_modules/**'],
    fileParallelism: false,
    maxWorkers: 1,
  },
})
