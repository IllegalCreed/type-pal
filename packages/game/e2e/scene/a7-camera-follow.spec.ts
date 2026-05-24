import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { camera: { col: number; row: number } } } }

test('a7 相机 follow — party 走 Right N 次,camera.col 增加 + visual diff', async ({ page }) => {
  await bootstrap(page)

  const cameraBefore = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.camera.col,
  )

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
  }

  const cameraAfter = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.camera.col,
  )
  expect(cameraAfter).toBeGreaterThan(cameraBefore)

  // visual sanity:camera 不同位置看到的 tilemap 不同
  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a7-camera-right'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})
