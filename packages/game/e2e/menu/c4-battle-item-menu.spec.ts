import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { battleState?: { uiState: string } } } }

test('c4 战斗物品菜单 — Down × 2 + Enter(选 cursor=2 物品)→ uiState=itemMenu', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(100)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)

  const uiState = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.uiState,
  )
  expect(uiState).toBe('itemMenu')

  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', 'c4-item-menu'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})
