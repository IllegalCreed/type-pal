import { expect, test } from '@playwright/test'
import { bootstrap, walk } from '../helpers/bootstrap.js'
import { baselinePathFor, pixelDiff } from '../helpers/pixel-diff.js'
import { snapshotCanvas } from '../helpers/snapshot.js'

// M5 P0.0:camera 改像素坐标(X_STEP=16/Y_STEP=8)。Down: dx=-16, dy=+8。
// P0.e: 初始位置(1312,288)右侧被 NPC 阻挡;改用 Down 方向(camera.x 减少)验证 follow。
type Probe = { __game: { gs: { camera: { x: number; y: number } } } }

test('a7 相机 follow — 长 hold ArrowDown,camera.x 减少(party 走左下)+ visual baseline', async ({
  page,
}) => {
  await bootstrap(page)

  const cameraBefore = await page.evaluate(() => (window as unknown as Probe).__game.gs.camera.x)

  // 10 walks worth(120ms each)+ slack;Down: dx=-16,dy=+8 → camera.x 减少
  await walk(page, 'ArrowDown', 1500)

  const cameraAfter = await page.evaluate(() => (window as unknown as Probe).__game.gs.camera.x)
  // 验证 camera 跟随 party 移动(camera.x 减少,Down 方向 dx=-16)
  expect(cameraAfter).toBeLessThan(cameraBefore)

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
