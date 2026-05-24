import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { party: { col: number; row: number } } } }

test('a5 边界 clamp — party 走到地图最左 → clamp 到 col=0,再按 Left 仍 0', async ({ page }) => {
  await bootstrap(page)

  // 持续按 Left 撑到底(scene 1 width 64,起点 col=32,40 次按键够走到 0)
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(80)
  }

  const col = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.col,
  )
  expect(col).toBe(0)

  // 再按 Left 一次 → 应仍是 0(clamp 不动)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(120)
  const after = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.col,
  )
  expect(after).toBe(0)
})
