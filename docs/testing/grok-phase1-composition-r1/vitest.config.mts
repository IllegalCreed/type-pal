import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./docs/testing/grok-phase1-composition-r1/vitest.setup.ts'],
    include: ['docs/testing/grok-phase1-composition-r1/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build'],
  },
})
