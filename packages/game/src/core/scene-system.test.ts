import { describe, it, expect, vi } from 'vitest'
import type { Tilemap, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { loadScene, tickSceneSystem, isWalkable } from './scene-system.js'
import { createInitialGameState } from './game-state.js'
import type { NpcState } from './game-state.js'
import { createCommandBus } from './command-bus.js'
import { SceneAssetsCache, type SceneAssets } from '../assets/loader.js'

function makeFlatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

/**
 * 生成包含阻挡 tile 的 tilemap。
 * blockedH0: [[col, row], ...] → 对应 cell.lower bit 13 (0x2000) 置 1。
 * blockedH1: [[col, row], ...] → 对应 cell.upper bit 13 (0x2000) 置 1。
 */
function makeBlockedMap(
  w: number,
  h: number,
  blockedH0: [number, number][] = [],
  blockedH1: [number, number][] = [],
): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  for (const [col, row] of blockedH0) {
    cells[row]![col]!.lower = 0x2000
  }
  for (const [col, row] of blockedH1) {
    cells[row]![col]!.upper = 0x2000
  }
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

// System A sanity:确认 4 方向都是 isometric 对角(非 cardinal)。
// sdlpal scene.c:804-805 真值 4 方向均 dx ≠ 0 且 dy ≠ 0。
describe('System A 对角移动 sanity(4 方向 dx/dy 都非零)', () => {
  it.each([
    ['Right' as const, 'right' as const, +16, +8],  // East SE
    ['Left' as const, 'left' as const, -16, -8],    // West NW
    ['Down' as const, 'down' as const, -16, +8],    // South SW
    ['Up' as const, 'up' as const, +16, -8],        // North NE
  ])('press %s → facing=%s, dx=%d, dy=%d(对角非 cardinal)', (key, expectedFacing, expectedDx, expectedDy) => {
    const startX = 1000
    const startY = 1000
    const gs = createInitialGameState({ x: startX, y: startY, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    tickSceneSystem(gs, snap([key]), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe(expectedFacing)
    expect(gs.party.x - startX).toBe(expectedDx)
    expect(gs.party.y - startY).toBe(expectedDy)
    // 确认非 cardinal:dx 和 dy 都非零
    expect(gs.party.x - startX).not.toBe(0)
    expect(gs.party.y - startY).not.toBe(0)
  })
})

describe('SceneSystem 走路', () => {
  it('按住 Right → party.x + 16 / party.y + 8, facing=right (East 右下)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(6 * 16)
    expect(gs.party.y).toBe(6 * 8)
    expect(gs.party.facing).toBe('right')
  })

  it('按住 Up → party.x + 16 / party.y - 8, facing=up (North 右上)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(6 * 16)
    expect(gs.party.y).toBe(4 * 8)
    expect(gs.party.facing).toBe('up')
  })

  it('地图边界 clamp:已在最左上角不能再左', () => {
    const gs = createInitialGameState({ x: 0, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(0)
    expect(gs.party.facing).toBe('left')
  })

  it('相机边界 clamp:party 越界仍 clamp 到 tilemap max pixel(System A:tile 32×16)', () => {
    const gs = createInitialGameState({ x: 100 * 32, y: 100 * 16, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.camera.x).toBe(9 * 32) // clamp to (width-1)*TILE_W
    expect(gs.camera.y).toBe(9 * 16) // clamp to (height-1)*TILE_H
  })

  it('NPC 阻挡走路:面前像素有 NPC + held=Right,party 不动', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // Right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(5 * 16) // 没走过去
    expect(gs.party.facing).toBe('right') // facing 变了
  })
})

// sdlpal input.c:180-189:user 同时按多键时,以最后按的为准(dwKeyOrder 最大者)。
// 我们的 pickFacing 走 held Set 反向迭代,Set 末位 = 最后按的键。
describe('pickFacing 走 last-press priority(sdlpal input.c:180-189)', () => {
  it('held = [Up, Down](Down 后按)→ facing = down', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up', 'Down']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe('down')
  })

  it('held = [Right, Up, Left](Left 后按)→ facing = left', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right', 'Up', 'Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe('left')
  })

  it('held = [Confirm, Down](Down 在末尾)→ facing = down(忽略非方向键)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Confirm', 'Down']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe('down')
  })

  it('held = [Up, Confirm](Confirm 在末尾但非方向)→ facing = up(反向找方向键)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up', 'Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe('up')
  })

  it('held = [](无键)→ facing 不变,party 不动', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.facing).toBe('right')
    expect(gs.party.x).toBe(5 * 16)
    expect(gs.party.y).toBe(5 * 8)
  })
})

describe('SceneSystem NPC 触发', () => {
  it('面前像素无 NPC + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('面前像素有 NPC + Confirm → mode=event + eventCursor 装载', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [{ id: 7, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_59' }]
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

  it('面前像素 NPC 无 triggerLabel + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78 }] // 无 triggerLabel
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('triggerLabel 存在但不在 labelMap → warn + 不切 mode', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_999' }]
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
  it('party 在 contact 像素(triggerMode=5)→ 自动切 event mode + ip 装载', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 },
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

  it('party 在 triggerMode=0 装饰像素 → 不触发(保持 explore)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 0 },
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

  it('party 在 triggerMode=2 Confirm-search 像素 → 不自动触发(保持 explore,等 Confirm)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 2 },
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
  it('party 同像素 NPC 无 triggerLabel(triggerMode=5)→ 不切 mode + eventCursor undefined', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // triggerMode 已是 contact 段(>= 4),但 triggerLabel 缺失(对照原版 triggerScript=0)
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerMode: 5 },
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

  it('party 同像素 NPC triggerLabel 不在 labelMap(triggerMode=5)→ warn + 不切 mode', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_9999', triggerMode: 5 },
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
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 3 },
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
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 4 },
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
function makeSceneAssets(
  sceneId: number,
  eventObjects: any[] = [],
  eventCommands: any[] = [],
  labelMap: Record<string, number> = {},
): SceneAssets {
  return {
    sceneId,
    tilemap: { width: 64, height: 128, cells: [], tilesetImage: 'fake' } as Tilemap,
    palette: { colors: [], cycles: [] } as any,
    eventObjects,
    npcSprites: new Map(),
    eventCommands,
    labelMap,
  }
}

describe('loadScene(M3.5 T9 / D33)', () => {
  it('切到新 scene → gs.npcs 由 eventObjects 重置;party 不传则不动', async () => {
    const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
    // 旧 npcs(模拟之前 scene 的残留)
    gs.npcs = [{ id: 99, x: 0, y: 0, spriteNum: 1 }]

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [
        // System A:npcFromEventObject 1:1 透传 eo.x/y
        { id: 0, x: 320, y: 160, spriteNum: 78, triggerMode: 0, triggerLabel: 'L_A' },
        { id: 1, x: 64, y: 32, spriteNum: 12, triggerMode: 0 },
      ]),
    )
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 7, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(7)
    expect(gs.npcs).toHaveLength(2)
    expect(gs.npcs[0]).toMatchObject({ id: 0, x: 320, y: 160, spriteNum: 78, triggerLabel: 'L_A' })
    expect(gs.npcs[1]).toMatchObject({ id: 1, x: 64, y: 32, spriteNum: 12 })
    // partyStart 未传 → party 不动
    expect(gs.party).toEqual({ x: 5 * 32, y: 5 * 16, facing: 'down' })
  })

  it('传 partyStart → party 位置 / facing 重写;camera 跟到 party', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { x: 20 * 16, y: 30 * 8, facing: 'up' },
    })

    expect(gs.party).toEqual({ x: 20 * 16, y: 30 * 8, facing: 'up' })
    // camera 跟 party(避免下一帧渲染时仍指着旧 scene 坐标)
    expect(gs.camera).toEqual({ x: 20 * 16, y: 30 * 8 })
  })

  it('partyStart 不传 facing → 沿用当前 facing(只挪坐标)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { x: 10 * 16, y: 15 * 8 },
    })

    expect(gs.party.x).toBe(10 * 16)
    expect(gs.party.y).toBe(15 * 8)
    expect(gs.party.facing).toBe('right')
  })

  it('SceneAssetsCache lazy hit:第二次切回同 scene,fetcher 不再调', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const fetcher = vi.fn(async (id: number) => makeSceneAssets(id))
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 1, assets: cache })
    await loadScene({ gs, sceneId: 2, assets: cache })
    await loadScene({ gs, sceneId: 1, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(2) // 1 和 2 各 fetch 一次,第二次 1 cache hit
  })
})

// ── P3.T1: loadScene 注入 eventCommands + labelMap(修 M3.5 ⚠️ a9 #8)────────
//
// 问题:dev panel scene jump 通过 loadScene 重置 npcs/party/camera,但之前不重置
// SceneContext 的 events/labelMap(scene 1 的 labelMap 留在内存)。
// 当 contact monster 触发 loadEventFromNpc 时,目标 scene 的 triggerLabel 不在
// 旧 labelMap → 早 return,mode 不切 battle。
//
// 修法:loadScene 拿到 sceneAssets 后调 setSceneContext 换入新 events + labelMap。
describe('loadScene 注入 eventCommands+labelMap(P3.T1)', () => {
  it('loadScene 后 SceneContext 换成新 scene 的 eventCommands + labelMap', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const newCommands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖', label: 'L_41179' },
      { op: 'end' as const },
    ]
    const newLabelMap: Record<string, number> = { L_41179: 0 }

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [], newCommands, newLabelMap),
    )
    const cache = new SceneAssetsCache(fetcher)
    await loadScene({ gs, sceneId: 15, assets: cache })

    // 装一个 contact NPC,triggerLabel 指向新 scene 的 label
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_41179', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 128)

    // tickSceneSystem 用 _ctx(setSceneContext 写入的 singleton)
    tickSceneSystem(gs, snap(), bus)

    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
    expect(gs.eventCursor?.labelMap['L_41179']).toBe(0)
  })

  it('连续 scene jump:每次 loadScene 都换入对应 scene 的 labelMap', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const scene1Map: Record<string, number> = { L_scene1: 0 }
    const scene2Map: Record<string, number> = { L_scene2: 0 }

    const fetcher = vi.fn(async (id: number) =>
      id === 1
        ? makeSceneAssets(1, [], [{ op: 'end' as const, label: 'L_scene1' }], scene1Map)
        : makeSceneAssets(2, [], [{ op: 'end' as const, label: 'L_scene2' }], scene2Map),
    )
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 1, assets: cache })
    // After scene 1: SceneContext should have scene1's labelMap
    gs.npcs = [{ id: 1, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 }]
    tickSceneSystem(gs, snap(), createCommandBus())
    // L_scene2 不在 scene1 labelMap → 不切 mode
    expect(gs.mode).toBe('explore')

    await loadScene({ gs, sceneId: 2, assets: cache })
    // After scene 2: SceneContext should have scene2's labelMap
    gs.npcs = [{ id: 2, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 }]
    tickSceneSystem(gs, snap(), createCommandBus())
    // L_scene2 在 scene2 labelMap → 切 event mode
    expect(gs.mode).toBe('event')
  })
})

// ── P0.a: 菱形 isometric 碰撞(port sdlpal scene.c:512 + map.c:298) ─────────
//
// sdlpal 真值:
//   obstacle bit = bit 13 (0x2000) of u16 tile word (map.c:298)。
//   h=0 → cell.lower;h=1 → cell.upper。
//   菱形四分法(scene.c:572-591)把像素坐标映射到 (col, row, h)。
//   NPC 菱形曼哈顿距离(scene.c:624):abs(dx)+abs(dy)*2 < 16。
describe('P0.a 菱形 isometric 碰撞', () => {
  // ── 1. tile 坐标映射:无残差直接 /32 /16 ─────────────────────────────────
  it('目标像素 /32 /16 取 tile col/row(无残差 → h=0)', () => {
    // pos (32, 16) → col=1, row=1, xr=0, yr=0, 0+0=0 < 16 → 不进 if → h=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 1]])
    expect(isWalkable(blockedMap, 32, 16)).toBe(false)
    // pos (0, 0) → col=0, row=0 — 该 tile 不阻
    expect(isWalkable(blockedMap, 0, 0)).toBe(true)
    // pos (64, 32) → col=2, row=2 — 不阻
    expect(isWalkable(blockedMap, 64, 32)).toBe(true)
  })

  // ── 2. 残差四分:h=1 三角区域 ─────────────────────────────────────────────
  it('残差进 h=1 分支(32-xr+yr*2 ∈ [16,48))', () => {
    // pos (24, 8) → col=0, row=0, xr=24, yr=8
    //   xr+yr*2 = 24+16 = 40 ≥ 16 进 if
    //   40 < 48,32-24+8*2 = 24 ∈ [16,48) → h=1
    const blockedMapH1 = makeBlockedMap(4, 4, [], [[0, 0]])
    expect(isWalkable(blockedMapH1, 24, 8)).toBe(false)
    // 同坐标,h=0 阻 tile 不影响
    const blockedMapH0Only = makeBlockedMap(4, 4, [[0, 0]])
    expect(isWalkable(blockedMapH0Only, 24, 8)).toBe(true)
  })

  // ── 3. 残差四分:右下角 x++,y++ ──────────────────────────────────────────
  it('残差 xr+yr*2 ≥ 48 → col++,row++ (右下角)', () => {
    // pos (28, 14) → col=0, row=0, xr=28, yr=14, xr+yr*2=56 ≥ 48 → col=1, row=1, h=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 1]])
    expect(isWalkable(blockedMap, 28, 14)).toBe(false)
  })

  // ── 4. 残差四分:右侧边 col++ ──────────────────────────────────────────────
  it('残差 32-xr+yr*2 < 16 → col++ (右侧边)', () => {
    // pos (30, 2) → col=0, row=0, xr=30, yr=2, xr+yr*2=34 ≥ 16 且 <48
    // 32-30+2*2 = 6 < 16 → col=1, h=0, row=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 0]])
    expect(isWalkable(blockedMap, 30, 2)).toBe(false)
  })

  // ── 5. 残差四分:下侧边 row++ ──────────────────────────────────────────────
  it('残差 32-xr+yr*2 ≥ 48 → row++ (下侧边)', () => {
    // pos (2, 14) → col=0, row=0, xr=2, yr=14, xr+yr*2=30 ≥ 16 且 <48
    // 32-2+14*2 = 58 ≥ 48 → row=1, h=0, col=0
    const blockedMap = makeBlockedMap(4, 4, [[0, 1]])
    expect(isWalkable(blockedMap, 2, 14)).toBe(false)
  })

  // ── 6. 越界返回 false ─────────────────────────────────────────────────────
  it('越界坐标(col 或 row 超出 tilemap)→ false', () => {
    const map = makeBlockedMap(2, 2)
    // 超出边界 → tilemapIsBlocked 返回 true → isWalkable false
    expect(isWalkable(map, 64, 0)).toBe(false)   // col=2 >= width=2
    expect(isWalkable(map, 0, 32)).toBe(false)   // row=2 >= height=2
  })

  // ── 7. NPC 菱形曼哈顿距离 abs(dx)+abs(dy)*2 < 16 ─────────────────────────
  it('NPC 在目标像素菱形范围内(距离 < 16)→ 阻挡', () => {
    const map = makeFlatMap(20, 20)
    const npcs: NpcState[] = [{ id: 1, x: 100, y: 50, spriteNum: 0, triggerMode: 0 }]
    // pos (105, 53): dx=5, dy=3, 5+6=11 < 16 → 阻
    expect(isWalkable(map, 105, 53, npcs, 0)).toBe(false)
    // pos (108, 54): dx=8, dy=4, 8+8=16, 不 < 16 → 不阻
    expect(isWalkable(map, 108, 54, npcs, 0)).toBe(true)
  })

  // ── 8. selfNpcId 跳过自己 ─────────────────────────────────────────────────
  it('selfNpcId 跳过自身 NPC', () => {
    const map = makeFlatMap(20, 20)
    const npcs: NpcState[] = [{ id: 3, x: 100, y: 50, spriteNum: 0, triggerMode: 0 }]
    // 自身 id=3,pos 就在 npc 正上,不应被自己阻挡
    expect(isWalkable(map, 100, 50, npcs, 3)).toBe(true)
  })

  // ── 9. contact 怪(triggerMode >= 4)不阻挡 ─────────────────────────────────
  it('contact monster(triggerMode=5)不阻挡走路', () => {
    const map = makeFlatMap(20, 20)
    const npcs: NpcState[] = [{ id: 2, x: 100, y: 50, spriteNum: 0, triggerMode: 5 }]
    // 即使距离=0,contact 怪不阻挡
    expect(isWalkable(map, 100, 50, npcs, 0)).toBe(true)
    // triggerMode=4 边界
    const npcs4: NpcState[] = [{ id: 2, x: 100, y: 50, spriteNum: 0, triggerMode: 4 }]
    expect(isWalkable(map, 100, 50, npcs4, 0)).toBe(true)
    // triggerMode=3 → 阻挡
    const npcs3: NpcState[] = [{ id: 2, x: 100, y: 50, spriteNum: 0, triggerMode: 3 }]
    expect(isWalkable(map, 100, 50, npcs3, 0)).toBe(false)
  })

  // ── 10. 透过 tickSceneSystem 集成:墙挡住走路 ─────────────────────────────
  it('tickSceneSystem:party 往阻挡 tile 走 → 不动', () => {
    // party at (48, 24) presses Right(+16,+8) → target (64, 32)
    // tile (64,32): col=2, row=2, xr=0, yr=0 → h=0, blocked
    const map = makeBlockedMap(10, 10, [[2, 2]])
    const gs = createInitialGameState({ x: 48, y: 24, facing: 'down' })
    const bus = createCommandBus()
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(48)   // 没走过去
    expect(gs.party.y).toBe(24)
    expect(gs.party.facing).toBe('right')
  })
})
