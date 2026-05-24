import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = {
  __game: {
    gs: {
      battleState?: {
        players: unknown[]
        enemies: unknown[]
      }
    }
  }
}

test('b2 双方 sprite 渲染 — 队员 + enemy 都画出来', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  const battleState = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.battleState,
  )
  expect(battleState).toBeTruthy()
  expect(battleState!.players.length).toBeGreaterThan(0)
  expect(battleState!.enemies.length).toBeGreaterThan(0)

  const actual = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual,
      baselinePath: baselinePathFor('battle', 'b2-sprites-fixture-zh1'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})
