import { expect, test } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { baselinePathFor, pixelDiff } from '../helpers/pixel-diff.js'
import { snapshotCanvas } from '../helpers/snapshot.js'

type Probe = { __game: { gs: { battleState?: { uiCursor: number; uiState: string } } } }

test('c2 战斗主菜单 — cursor=0 默认(攻击)visual baseline', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  const cursor = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.uiCursor,
  )
  expect(cursor).toBe(0)

  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', 'c2-main-cursor-0'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})

test('c2 战斗主菜单 — Down 5 次循环 cursor 0..4 → 各自 baseline', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  for (let i = 0; i < 5; i++) {
    const cursor = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.battleState?.uiCursor,
    )
    expect(cursor).toBe(i)

    const actual = await snapshotCanvas(page)
    expect(
      await pixelDiff({
        actual,
        baselinePath: baselinePathFor('menu', `c2-main-cursor-${i}`),
        threshold: 0,
        updateBaseline: !!process.env.UPDATE_BASELINES,
      }),
    ).toBe(0)

    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
  }
})
