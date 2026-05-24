import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// M5 P0.0:party 改像素坐标(X_STEP=16/Y_STEP=8)。
type Probe = { __game: { gs: { party: { x: number; y: number; facing: string } } } }

test('a8 scene 切换 — scene 1 vs 仙灵岛入口(14)视觉差异 + 各自 baseline 一致', async ({ page }) => {
  await bootstrap(page)

  const scene1Buf = await snapshotCanvas(page)

  await openDevPicker(page)
  await selectSceneJump(page, 'scene-14-port')

  const portBuf = await snapshotCanvas(page)

  // 两张 buffer 必须不同(不同 scene 不同 tilemap)
  expect(scene1Buf.equals(portBuf)).toBe(false)

  expect(
    await pixelDiff({
      actual: scene1Buf,
      baselinePath: baselinePathFor('scene', 'a8-scene-1'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
  expect(
    await pixelDiff({
      actual: portBuf,
      baselinePath: baselinePathFor('scene', 'a8-scene-14-port'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)
})

test('a8 scene 切换 — party 写入 scene-jumps.json 的 partyStart 位置', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-15-mob')

  const party = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  // scene-jumps.json:scene-15-mob partyStart = { x: 544, y: 640, facing: 'down' }(= col:34*16, row:80*8)
  // M5 P0.0:位置调整为草妖 NPC(35,81)邻格(34,80),1 步即可触发 contact。
  expect(party.x).toBe(544)
  expect(party.y).toBe(640)
  expect(party.facing).toBe('down')
})
