import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a2 队长 sprite — 初始(facing=down)', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(150)

  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a2-leader-initial'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})

// facing 4 方向 — 按方向键后立即截图(走路 tick 也会同时发生,但 sprite frame 切到对应朝向)
test('a2 队长 sprite — facing 4 方向切换', async ({ page }) => {
  await bootstrap(page)

  const facings = [
    { key: 'ArrowRight', name: 'right' },
    { key: 'ArrowDown', name: 'down' },
    { key: 'ArrowLeft', name: 'left' },
    { key: 'ArrowUp', name: 'up' },
  ]

  for (const { key, name } of facings) {
    await page.keyboard.press(key)
    await page.waitForTimeout(150)

    const actual = await snapshotCanvas(page)
    const diff = await pixelDiff({
      actual,
      baselinePath: baselinePathFor('scene', `a2-leader-facing-${name}`),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })
    expect(diff).toBe(0)
  }
})
