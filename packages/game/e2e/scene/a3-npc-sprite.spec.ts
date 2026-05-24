import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a3 NPC sprite 渲染 — scene 1 含 NPC count > 0 + pixel diff', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(300)

  // GameState NPC 列表非空(scene 1 客栈本身有几个 NPC)
  const npcCount = await page.evaluate(
    () => ((window as unknown as { __game: { gs: { npcs: unknown[] } } }).__game?.gs?.npcs?.length) ?? 0,
  )
  expect(npcCount).toBeGreaterThan(0)

  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a3-npc-render'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})
