import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

// M5 P0.0:party 改像素坐标(X_STEP=16/Y_STEP=8)。
// sdlpal scene.c:804-805 DIR_DELTA:
//   Down  (South): (-16, +8) 左下 — x 减小 + y 增大
// 起点 x=512(PARTY_START col=32*16),y=192;长 hold Down 走到 x=0(32 步 dx 累计)。
// 地图 map-12: 64×128,32 步 down 后 y=192+32*8=448(row=56,在范围内)。
type Probe = { __game: { gs: { party: { x: number; y: number } } } }

test('a5 边界 clamp — 长 hold ArrowDown 撞到地图最左 x=0 + 再按 Down 仍 0', async ({ page }) => {
  await bootstrap(page)

  // hold Down → 左下方向走;每 100ms 一步,32 步 = ~3.2s,留 5s
  await walk(page, 'ArrowDown', 5000)

  const x = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )
  expect(x).toBe(0)

  // 再 hold 一段 → clamp 不动
  await walk(page, 'ArrowDown', 300)
  const after = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )
  expect(after).toBe(0)
})
