import { test, expect } from '@playwright/test'
import {
  bootstrap,
  openDevPicker,
  selectBattleFixture,
  pressMenu,
} from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { battleState?: { uiState: string } } } }

test('c4 战斗物品菜单 — Down × 2(各等 tick)+ Enter → uiState=itemMenu', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  // pressMenu 各等 150ms 让 input.pressed 单独消费 — 否则相邻 press 折叠成 1 次 +1
  await pressMenu(page, 'ArrowDown')
  await pressMenu(page, 'ArrowDown')
  await pressMenu(page, 'Enter')

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
