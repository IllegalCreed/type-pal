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

// facing 4 方向 — 用 down(key) hold 50ms(< walk tick 120ms)只触 face,不走路,
// 然后 up + 短缓冲。Playwright press() 太快 input.held 来不及 register,M3.5 ⚠️ #10。
test('a2 队长 sprite — facing 4 方向切换', async ({ page }) => {
  await bootstrap(page)

  const facings = [
    { key: 'ArrowRight', name: 'right' },
    { key: 'ArrowDown', name: 'down' },
    { key: 'ArrowLeft', name: 'left' },
    { key: 'ArrowUp', name: 'up' },
  ] as const

  for (const { key, name } of facings) {
    await page.keyboard.down(key)
    await page.waitForTimeout(150)
    await page.keyboard.up(key)
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
