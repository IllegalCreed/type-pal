import { expect, test } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { baselinePathFor, pixelDiff } from '../helpers/pixel-diff.js'
import { snapshotCanvas } from '../helpers/snapshot.js'

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
  // P0.e: scene-jumps.json 为 wScriptOnEnter 不含 setPartyPos 的 scene 加 dev-only partyStart fallback。
  // scene 15 的 wScriptOnEnter(L_4203)只有 setBattlefield + end,不含 setPartyPos。
  // 无 caller-trace(全域无 loadScene(15) 调用)→ 走 NPC-anchored 4-iso BFS:
  // 以 NPC 204 walkable 邻居为起点,只用 4 个 isometric 方向(±16, ±8)展开,
  // 跟 party 物理 movement 完全匹配 → 区内任两点 parity 一致 → party 可走到任一区内点。
  // 取连通区中心 (800, 1440),与所有 6 个 NPC(含 4 草妖)parity-matched 同区可达。
  await bootstrap(page)

  // 先确认 scene-1 的 enter script 把 party 放到正确位置(col=41,row=18 → x=1312,y=288)
  const scene1Party = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
  expect(scene1Party.x).toBe(1312)
  expect(scene1Party.y).toBe(288)

  await openDevPicker(page)
  await selectSceneJump(page, 'scene-15-mob')

  const gs = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, mode: w.__game.gs.mode }
  })
  // mode 应是 explore
  expect(gs.mode).toBe('explore')
  // scene-15 wScriptOnEnter 不含 setPartyPos + 无 caller-trace → 走 NPC-anchored 4-iso BFS
  // 连通区中心 (800, 1440),parity-matched 跟所有 6 个 NPC 同区可达
  expect(gs.party.x).toBe(800)
  expect(gs.party.y).toBe(1440)
})
