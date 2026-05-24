import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // M3.5 T18+:e2e/ 下是 Playwright spec,不让 vitest 拾起。
    // 跑 L2 用 `pnpm e2e`,跑 L1 用 `pnpm test`。
    exclude: ['node_modules', 'dist', 'build', 'e2e/**'],
  },
})
