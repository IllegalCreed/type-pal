import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = { __game: { gs: { party: { col: number; row: number; facing: string } } } }

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
  await selectSceneJump(page, 'scene-16-mob')

  const party = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  // scene-jumps.json T16 真值:scene-16-mob partyStart = { col: 32, row: 32, facing: 'down' }
  expect(party.col).toBe(32)
  expect(party.row).toBe(32)
  expect(party.facing).toBe('down')
})
