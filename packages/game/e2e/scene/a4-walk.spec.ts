import { expect, test } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

// M5 P0.0:party 改像素坐标(X_STEP=16/Y_STEP=8)。
// Down(South): dx=-16, dy=+8; Up(North): dx=+16, dy=-8(sdlpal scene.c:804-805)
type Probe = { __game: { gs: { party: { x: number; y: number; facing: string } } } }

test('a4 走路 — 持续按 ArrowDown ~5 walk 时长 → party.y 增加(至少 3*8,可能被 NPC / 边界阻挡)', async ({
  page,
}) => {
  await bootstrap(page)

  const initialY = await page.evaluate(() => (window as unknown as Probe).__game.gs.party.y)

  // 5 walks worth(120ms / walk) + slack
  await walk(page, 'ArrowDown', 800)

  const finalY = await page.evaluate(() => (window as unknown as Probe).__game.gs.party.y)
  // Down: dy=+8 per step, 3 steps minimum
  expect(finalY).toBeGreaterThanOrEqual(initialY + 3 * 8)
})

test('a4 走路 — 持续 Down N + Up N 大致回原位(误差 ≤ X_STEP)', async ({ page }) => {
  // P0.e: 原版初始位置(1312,288)右侧被 NPC 阻挡,改用 Down+Up 对称测试。
  // Down(dx=-16,dy=+8) + Up(dx=+16,dy=-8) → 完美抵消(只要路上无障碍)。
  await bootstrap(page)
  const initial = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)

  await walk(page, 'ArrowDown', 400)
  await walk(page, 'ArrowUp', 400)

  const final = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
  // Down(dx=-16,dy=+8) + Up(dx=+16,dy=-8) → 完美抵消,误差 ≤ 1 步 = 16px
  expect(Math.abs(final.x - initial.x)).toBeLessThanOrEqual(16)
})
