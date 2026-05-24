import { describe, it, expect, vi } from 'vitest'
import type { Tilemap, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { loadScene, tickSceneSystem } from './scene-system.js'
import { createInitialGameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'
import { SceneAssetsCache, type SceneAssets } from '../assets/loader.js'

function makeFlatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

describe('SceneSystem 走路', () => {
  it('按住 Right → party.col + 1, facing=right', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(6)
    expect(gs.party.facing).toBe('right')
  })

  it('按住 Up → row - 1, facing=up', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.row).toBe(4)
    expect(gs.party.facing).toBe('up')
  })

  it('地图边界 clamp:已在最左不能再左', () => {
    const gs = createInitialGameState({ col: 0, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(0)
    expect(gs.party.facing).toBe('left')
  })

  it('相机边界 clamp:party.col 越界仍 clamp 到 tilemap.width - 1', () => {
    const gs = createInitialGameState({ col: 100, row: 100, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.camera.col).toBe(9) // clamp to width-1
    expect(gs.camera.row).toBe(9)
  })

  it('NPC 阻挡走路:面前格有 NPC + held=Right,party 不动', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [{ id: 1, col: 6, row: 5, spriteNum: 78 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(5) // 没走过去
    expect(gs.party.facing).toBe('right') // facing 变了
  })
})

describe('SceneSystem NPC 触发', () => {
  it('面前格无 NPC + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('面前格有 NPC + Confirm → mode=event + eventCursor 装载', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [{ id: 7, col: 6, row: 5, spriteNum: 78, triggerLabel: 'L_59' }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'end' as const },
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '你好', label: 'L_59' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_59: 2 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(2)
  })

  it('面前格 NPC 无 triggerLabel + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [{ id: 1, col: 6, row: 5, spriteNum: 78 }] // 无 triggerLabel
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('triggerLabel 存在但不在 labelMap → warn + 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [{ id: 1, col: 6, row: 5, spriteNum: 78, triggerLabel: 'L_999' }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('L_999'))
    warnSpy.mockRestore()
  })
})

// ── M3.5 T11: 明雷机制(D32 / 对照 sdlpal play.c::PAL_PartyWalk)──────────────
//
// triggerMode 真值(sdlpal global.h:84-92):
//  - 0       装饰 / 不触发
//  - 1/2/3   Confirm-search(M2 已实现,本 task 不动)
//  - 4..8    contact(走进自动触发)— M3.5 简版统一处理(>= 4)
//
// 测目标:party 走到 contact triggerMode NPC 同格 → 自动 enter event mode + ip 装载,
// 不依赖 Confirm 键。
describe('明雷机制(M3.5 T11 / D32)', () => {
  // 注:M2 NPC 阻挡逻辑会让 party 走不进面前的 NPC 格;
  // 真原版明雷怪不被 npcAt 阻挡(妖怪可重叠 party)。M3.5 简版:把 NPC 放在 party 当前格,
  // 模拟「走完路后,party 与 contact NPC 同格」的状态。
  it('party 在 contact cell(triggerMode=5)→ 自动切 event mode + ip 装载', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖来袭', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 1 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(1)
  })

  it('party 在 triggerMode=0 装饰 cell → 不触发(保持 explore)', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 0 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
  })

  it('party 在 triggerMode=2 Confirm-search cell → 不自动触发(保持 explore,等 Confirm)', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 2 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
  })
})

// ── M3.5 T12: 明雷反例 / edge case(D32)─────────────────────────────────────
//
// 与 T11 三个正例配对,补完 contact 路径的反例 + 边界:
//  - 无 triggerLabel(对照原版 triggerScript=0 段)
//  - triggerLabel 不在 labelMap(资源损坏 / 引用错 label,helper 应 warn + 不切 mode)
//  - triggerMode 边界 3(Confirm-search 段最大)/ 4(contact 段最小)
//
// 注:NpcState 当前 schema 没 state 字段(M5 加),本 task 不引入新 schema。
describe('明雷机制 反例 / edge case(M3.5 T12)', () => {
  it('party 同格 NPC 无 triggerLabel(triggerMode=5)→ 不切 mode + eventCursor undefined', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    // triggerMode 已是 contact 段(>= 4),但 triggerLabel 缺失(对照原版 triggerScript=0)
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 468, triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
  })

  it('party 同格 NPC triggerLabel 不在 labelMap(triggerMode=5)→ warn + 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 468, triggerLabel: 'L_9999', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_OTHER: 0 }, // 故意不含 L_9999
    })
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('L_9999'))
    warnSpy.mockRestore()
  })

  it('triggerMode=3 边界(Confirm-search 段最大值)→ 不自动触发(< CONTACT_MIN)', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 3 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
  })

  it('triggerMode=4 边界(contact 段最小值)→ 自动触发(=== CONTACT_MIN)', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    gs.npcs = [
      { id: 7, col: 5, row: 5, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 4 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
  })
})

// ── M3.5 T9: loadScene(D33 lazy 切场景)─────────────────────────────────────
//
// 设计契约(D33 + D34):
//  1. 通过 SceneAssetsCache lazy 拿新 scene 资源(同 scene 重复切不重复 fetch)
//  2. 重置 gs.npcs(从 eventObjects 走 npcFromEventObject)
//  3. partyStart 可选;不传则 party 位置 / facing 不变
//  4. **不**跑 onEnter(dev shortcut 跳过剧情;M5 真剧情链升级)
function makeSceneAssets(sceneId: number, eventObjects: any[] = []): SceneAssets {
  return {
    sceneId,
    tilemap: { width: 64, height: 128, cells: [], tilesetImage: 'fake' } as Tilemap,
    palette: { colors: [], cycles: [] } as any,
    eventObjects,
    npcSprites: new Map(),
  }
}

describe('loadScene(M3.5 T9 / D33)', () => {
  it('切到新 scene → gs.npcs 由 eventObjects 重置;party 不传则不动', async () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    // 旧 npcs(模拟之前 scene 的残留)
    gs.npcs = [{ id: 99, col: 0, row: 0, spriteNum: 1 }]

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [
        // npcFromEventObject 把 x/y 视作 pixel:32 px/tile 列 / 16 px/tile 行
        { id: 0, x: 320, y: 160, spriteNum: 78, triggerMode: 0, triggerLabel: 'L_A' },
        { id: 1, x: 64, y: 32, spriteNum: 12, triggerMode: 0 },
      ]),
    )
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 7, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(7)
    expect(gs.npcs).toHaveLength(2)
    expect(gs.npcs[0]).toMatchObject({ id: 0, col: 10, row: 10, spriteNum: 78, triggerLabel: 'L_A' })
    expect(gs.npcs[1]).toMatchObject({ id: 1, col: 2, row: 2, spriteNum: 12 })
    // partyStart 未传 → party 不动
    expect(gs.party).toEqual({ col: 5, row: 5, facing: 'down' })
  })

  it('传 partyStart → party 位置 / facing 重写;camera 跟到 party', async () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { col: 20, row: 30, facing: 'up' },
    })

    expect(gs.party).toEqual({ col: 20, row: 30, facing: 'up' })
    // camera 跟 party(避免下一帧渲染时仍指着旧 scene 坐标)
    expect(gs.camera).toEqual({ col: 20, row: 30 })
  })

  it('partyStart 不传 facing → 沿用当前 facing(只挪坐标)', async () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { col: 10, row: 15 },
    })

    expect(gs.party.col).toBe(10)
    expect(gs.party.row).toBe(15)
    expect(gs.party.facing).toBe('right')
  })

  it('SceneAssetsCache lazy hit:第二次切回同 scene,fetcher 不再调', async () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const fetcher = vi.fn(async (id: number) => makeSceneAssets(id))
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 1, assets: cache })
    await loadScene({ gs, sceneId: 2, assets: cache })
    await loadScene({ gs, sceneId: 1, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(2) // 1 和 2 各 fetch 一次,第二次 1 cache hit
  })
})
