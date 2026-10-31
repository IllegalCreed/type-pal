import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Full-map raster tests keep the real 64×128 input and default deadlines.
    // Bound concurrent coverage heaps instead of competing with another worker.
    maxWorkers: 1,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // 浏览器 E2E 由 scripts/e2e 的独立入口运行；此配置只负责 Vitest 单元测试。
    exclude: ['node_modules', 'dist', 'build', 'e2e/**'],
  },
})
