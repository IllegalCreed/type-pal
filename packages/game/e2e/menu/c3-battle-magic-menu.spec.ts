import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { battleState?: { uiState: string } } } }

test('c3 战斗法术菜单 — Down + Enter(选 cursor=1 法术)→ uiState=magicMenu', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh2') // fixture-zh2 队员通常有学法术

  // mainMenu cursor 0 → Down 到 1(法术)→ Enter
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(80)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)

  const uiState = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.uiState,
  )
  expect(uiState).toBe('magicMenu')

  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', 'c3-magic-menu'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})
