import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { party: { col: number; row: number; facing: string } } } }

test('a4 走路 — 持续按 ArrowDown ~5 walk 时长 → party.row 增加(至少 3,可能被 NPC / 边界阻挡)', async ({
  page,
}) => {
  await bootstrap(page)

  const initialRow = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.row,
  )

  // 5 walks worth(120ms / walk) + slack
  await walk(page, 'ArrowDown', 800)

  const finalRow = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party.row,
  )
  expect(finalRow).toBeGreaterThanOrEqual(initialRow + 3)
})

test('a4 走路 — 持续 Right N + Left N 大致回原位(误差 ≤ 1 格)', async ({ page }) => {
  await bootstrap(page)
  const initial = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )

  await walk(page, 'ArrowRight', 400)
  await walk(page, 'ArrowLeft', 400)

  const final = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  expect(Math.abs(final.col - initial.col)).toBeLessThanOrEqual(1)
})
