import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('f1 F1 dump GameState — console 含 "[dev] GameState dump:"', async ({ page }) => {
  const messages: string[] = []
  page.on('console', (msg) => messages.push(msg.text()))

  await bootstrap(page)
  await page.keyboard.press('F1')
  await page.waitForTimeout(300)

  // dev-panel.ts:101 `console.log('[dev] GameState dump:', ...)` —— 匹配前缀字符串即可
  const hasDump = messages.some((m) => m.includes('[dev] GameState dump:'))
  expect(hasDump).toBe(true)
})
