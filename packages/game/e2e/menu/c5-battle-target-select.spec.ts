import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { battleState?: { uiState: string; uiCursor: number } } } }

test('c5 战斗目标光标 — Confirm 攻击 → uiState=targetSelect + Left/Right 切', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  // mainMenu Confirm 攻击(cursor 默认 0)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)

  const uiState = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.uiState,
  )
  expect(uiState).toBe('targetSelect')

  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', 'c5-target-0'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)

  // Right 切 target(alive subset 内循环);verify uiCursor 不抛错
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  const cursor = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.uiCursor,
  )
  expect(typeof cursor).toBe('number')
  expect(cursor).toBeGreaterThanOrEqual(0)
})
