import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { party: { col: number; row: number; facing: string } } } }

test('a4 走路 — ArrowDown 5 次 → party.row 增加(至少 3,可能被 NPC / 边界阻挡)', async ({ page }) => {
  await bootstrap(page)

  const initialRow = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.row,
  )

  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(120)
  }

  const finalRow = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.row,
  )
  expect(finalRow).toBeGreaterThanOrEqual(initialRow + 3)
})

test('a4 走路 — Right N + Left N 回原位(误差 ≤ 1 格,可能边界 clamp)', async ({ page }) => {
  await bootstrap(page)
  const initial = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(120)
  }
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(120)
  }

  const final = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  expect(Math.abs(final.col - initial.col)).toBeLessThanOrEqual(1)
})
