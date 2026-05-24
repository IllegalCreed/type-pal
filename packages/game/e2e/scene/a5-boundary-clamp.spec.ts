import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

// M5 P0.0 System A:party 坐标 = sdlpal pixel(tile 32×16)。
// sdlpal scene.c:804-805 DIR_DELTA:
//   Down  (South): (-16, +8) 左下 — x 减小 + y 增大
//
// M5 P0.a 更新:isWalkable 现在检真实 obstacle bit;party 会被 map tile 阻挡,
// 不一定能走到 x=0。改为验证:长按 Down 后 party 被阻挡(x 停止变化),
// 即两次读值相同 —— 无论是被 tile 墙挡还是被地图越界挡。
type Probe = { __game: { gs: { party: { x: number; y: number } } } }

test('a5 边界 clamp — 长 hold ArrowDown 撞墙后 x 不再减小(tile 碰撞或地图边界)', async ({ page }) => {
  await bootstrap(page)

  // hold Down → 左下方向走;8s 足以走到 tile 墙或地图左边界
  await walk(page, 'ArrowDown', 8000)

  const x1 = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )

  // 再 hold 一段 → 被阻挡后不动
  await walk(page, 'ArrowDown', 500)
  const x2 = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.x,
  )

  // 撞墙后 x 不再减小(tile 碰撞 or 地图边界 clamp 均满足)
  expect(x2).toBe(x1)
  // x 必须 ≥ 0(不超出地图左边界)
  expect(x2).toBeGreaterThanOrEqual(0)
})
