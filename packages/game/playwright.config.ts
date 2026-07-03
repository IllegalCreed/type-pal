import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // dev server 单 instance + 状态 mutate,serial 跑
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    // 端口规划(2026-07-04 用户,见 docs/dev-servers.md):game dev=6000、e2e=6001
    // (独立实例,dev 跑着也能 e2e);避开 vite 默认 517x 段(容器/其他工程常撞)。
    baseURL: 'http://localhost:6001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // 直调 vite(不走 `pnpm dev`:dev 脚本已烤死 --port 6000,叠 flag 易混)。
    // E2E=1 让 vite.config 不挂 basic-ssl → server 保持 http。
    command: 'E2E=1 pnpm exec vite --port 6001 --strictPort',
    url: 'http://localhost:6001',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
})
