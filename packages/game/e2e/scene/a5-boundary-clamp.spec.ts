import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { party: { col: number; row: number } } } }

test('a5 边界 clamp — 长 hold ArrowLeft 撞到地图最左 col=0 + 再按 Left 仍 0', async ({ page }) => {
  await bootstrap(page)

  // 起点 col=32(PARTY_START),足够长 hold 走到 0(每 walk ~120ms × 32 cells = ~4s,留 5s)
  await walk(page, 'ArrowLeft', 5000)

  const col = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.col,
  )
  expect(col).toBe(0)

  // 再 hold 一段 → clamp 不动
  await walk(page, 'ArrowLeft', 300)
  const after = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.col,
  )
  expect(after).toBe(0)
})
