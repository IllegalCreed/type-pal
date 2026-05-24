import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // dev server 单 instance + 状态 mutate,serial 跑
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    // e2e 用 5174,跟 dev 默认 5173 分开,user 可 dev 跑着同时 e2e 也跑。
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Vite CLI flag `--port 5174` 把 e2e server 推到 5174;dev (`pnpm dev`) 仍走 5173。
    // 注:用 `pnpm dev --port 5174` 不加 `--` 分隔符 — pnpm 直接转给 vite,
    // 加 `--` 会变成 `vite -- --port 5174`(vite 不识别 `--`)。
    command: 'pnpm dev --port 5174 --strictPort',
    url: 'http://localhost:5174',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
})
