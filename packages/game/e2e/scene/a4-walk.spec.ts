import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

// M5 P0.0:party 改像素坐标(X_STEP=16/Y_STEP=8)。
// Down: dx=+16,dy=+8; Right: dx=+16,dy=-8; Left: dx=-16,dy=+8。
type Probe = { __game: { gs: { party: { x: number; y: number; facing: string } } } }

test('a4 走路 — 持续按 ArrowDown ~5 walk 时长 → party.y 增加(至少 3*8,可能被 NPC / 边界阻挡)', async ({
  page,
}) => {
  await bootstrap(page)

  const initialY = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.y,
  )

  // 5 walks worth(120ms / walk) + slack
  await walk(page, 'ArrowDown', 800)

  const finalY = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.y,
  )
  // Down: dy=+8 per step, 3 steps minimum
  expect(finalY).toBeGreaterThanOrEqual(initialY + 3 * 8)
})

test('a4 走路 — 持续 Right N + Left N 大致回原位(误差 ≤ X_STEP)', async ({ page }) => {
  await bootstrap(page)
  const initial = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )

  await walk(page, 'ArrowRight', 400)
  await walk(page, 'ArrowLeft', 400)

  const final = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  // Right(dx=+16,dy=-8) + Left(dx=-16,dy=+8) → perfect cancel,误差 ≤ 1 步 = 16px
  expect(Math.abs(final.x - initial.x)).toBeLessThanOrEqual(16)
})
