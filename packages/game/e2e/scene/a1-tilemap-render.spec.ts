import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// 5 个 scene 真 ID(scene-jumps.json,M3.5 T16):scene 1 客栈 / 仙灵岛入口 / 通道 1 / 通道 2 / 迷宫
const SCENES = [
  { id: 'scene-1', isInitial: true },
  { id: 'scene-14-port', isInitial: false },
  { id: 'scene-15-mob', isInitial: false },
  { id: 'scene-16-corridor', isInitial: false },
  { id: 'scene-17-maze', isInitial: false },
]

for (const { id, isInitial } of SCENES) {
  test(`a1 tilemap 渲染 — ${id}`, async ({ page }) => {
    await bootstrap(page)
    if (!isInitial) {
      await openDevPicker(page)
      await selectSceneJump(page, id)
    }
    await page.waitForTimeout(300) // 等 SceneAssetsCache lazy load + render 一帧

    const actual = await snapshotCanvas(page)
    const diff = await pixelDiff({
      actual,
      baselinePath: baselinePathFor('scene', `a1-${id}`),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })
    expect(diff).toBe(0)
  })
}
