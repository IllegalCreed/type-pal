import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { sdlpalDiff } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { mode: string } } }

test('b1 战斗背景渲染 — fixture-zh1', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  const mode = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.mode,
  )
  expect(mode).toBe('battle')

  const actual = await snapshotCanvas(page)
  // 与 sdlpal real baseline 对比(build/sdlpal-baseline/battles/fixture-zh1.png)
  const pct = await sdlpalDiff({ actual, baseline: 'fixture-zh1', threshold: 0.1 })
  expect(pct).toBeLessThan(0.05)
})
