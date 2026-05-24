import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// M5 P0.0 System A:party 坐标 = sdlpal pixel(tile 32×16)。
type Probe = { __game: { gs: { party: { x: number; y: number; facing: string }; mode: string } } }

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

test('a8 scene 切换 — P0.e: wScriptOnEnter 设起点(非 hardcode partyStart)', async ({ page }) => {
  // P0.e: scene-jumps.json 已删 partyStart,loadScene 走 wScriptOnEnter → setPartyPos。
  // scene 15 无 onEnterLabel → party 留 scene-1 跑 enter script 后的坐标。
  // 验 mode=explore + party 在非 (0,0) 合理坐标。
  await bootstrap(page)

  // 先确认 scene-1 的 enter script 把 party 放到正确位置(col=41,row=18 → x=1312,y=288)
  const scene1Party = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  expect(scene1Party.x).toBe(1312)
  expect(scene1Party.y).toBe(288)

  await openDevPicker(page)
  await selectSceneJump(page, 'scene-15-mob')

  const gs = await page.evaluate(
    () => {
      const w = window as unknown as Probe
      return { party: w.__game.gs.party, mode: w.__game.gs.mode }
    },
  )
  // mode 应是 explore
  expect(gs.mode).toBe('explore')
  // scene-15 无 onEnterLabel → party 坐标保留 (1312,288) 不动
  expect(gs.party.x).toBe(1312)
  expect(gs.party.y).toBe(288)
})
