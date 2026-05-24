import { test, expect } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// M5 P0.0:camera 改像素坐标(X_STEP=16/Y_STEP=8)。Right: dx=+16。
type Probe = { __game: { gs: { camera: { x: number; y: number } } } }

test('a7 相机 follow — 长 hold ArrowRight,camera.x 增加 + visual baseline', async ({ page }) => {
  await bootstrap(page)

  const cameraBefore = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.camera.x,
  )

  // 10 walks worth(120ms each)+ slack;party 走右 → camera follow
  await walk(page, 'ArrowRight', 1500)

  const cameraAfter = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.camera.x,
  )
  expect(cameraAfter).toBeGreaterThan(cameraBefore)

  // visual baseline:camera 不同位置看到的 tilemap 不同
  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a7-camera-right'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})
