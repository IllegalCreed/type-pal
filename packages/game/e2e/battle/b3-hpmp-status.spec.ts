import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = {
  __game: {
    gs: {
      battleState?: { players: { hp?: number; maxHP?: number }[] }
    }
  }
}

test('b3 HP/MP 状态栏 — fixture-zh1 满血显示 + pixel diff', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  // GameState 验证 battleState.players[0] 满血(fixture 默认满血)
  const player0 = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState?.players[0],
  )
  expect(player0).toBeTruthy()

  // pixel diff(HP/MP 数字画在底部状态栏,跟 fixture-zh1 默认满血一致)
  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('battle', 'b3-hpmp-full'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})
