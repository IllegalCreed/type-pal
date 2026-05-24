import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

// M5 P0.0:party 改像素坐标(X_STEP=16/Y_STEP=8)。
// Left: dx=-16,dy=+8。起点 x=512(col=32*16),足够 hold 走到 x=0。
type Probe = { __game: { gs: { party: { x: number; y: number } } } }

test('a5 边界 clamp — 长 hold ArrowLeft 撞到地图最左 x=0 + 再按 Left 仍 0', async ({ page }) => {
  await bootstrap(page)

  // 起点 x=512(PARTY_START col=32*16),足够长 hold 走到 0(每 walk ~120ms × 32 steps = ~4s,留 5s)
  await walk(page, 'ArrowLeft', 5000)

  const x = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )
  expect(x).toBe(0)

  // 再 hold 一段 → clamp 不动
  await walk(page, 'ArrowLeft', 300)
  const after = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )
  expect(after).toBe(0)
})
