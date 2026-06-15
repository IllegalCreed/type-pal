import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Tilemap, InputSnapshot, AbstractKey, Item, Spell, Magic, PlayerRoles } from '@type-pal/shared'
import { setMenuCatalogs } from './menu/menu-driver.js'
import { loadScene, tickSceneSystem, isWalkable } from './scene-system.js'
import { createInitialGameState, PARTYOFFSET_X, PARTYOFFSET_Y, setSpriteFrameCountProvider } from './game-state.js'
import type { NpcState } from './game-state.js'
import { createCommandBus } from './command-bus.js'
import { SceneAssetsCache, type SceneAssets } from '../assets/loader.js'
import {
  OP_SET_PARTY_POS, OP_SET_PARTY_DIRECTION,
  OP_SET_CAMERA, OP_CENTER_CAMERA_ON_PARTY,
  OP_PLAY_MUSIC, OP_SET_SCENE_OBJECT_STATE,
  setGlobalEvents, tickEventSystem,
} from './event-system.js'

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
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(避开边缘带)
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(17 * 16)
    expect(gs.party.y).toBe(17 * 8)
    expect(gs.party.facing).toBe('right')
  })

  it('走路:清 pose(partyScriptedFrame)但**保留** role0 sprite override(端酒菜持久)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    gs.partyScriptedFrame = { 0: 7 }       // 0x15 设的剧情 pose
    gs.partyLeaderSpriteId = 208           // 旧兼容镜像:0x65 给 role0 设的端酒菜 sprite
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.partyScriptedFrame[0]).toBeUndefined()   // pose 清掉(走路覆写 wFrame)
    expect(gs.partyLeaderSpriteId).toBe(208)           // sprite override 保留(边走边端酒菜)
  })

  it('按住 Up → party.x + 16 / party.y - 8, facing=up (North 右上)', () => {
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(避开边缘带)
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(17 * 16)
    expect(gs.party.y).toBe(15 * 8)
    expect(gs.party.facing).toBe('up')
  })

  it('M5:队首在左上边缘带边界(col5/row7),按 Left 被 fCheckRange 下边界挡', () => {
    // 起点 (5*32,7*16)=(160,112) col5/row7 = 边缘带最小合法位;Left(dx-16,dy-8)→(144,104)
    //   col4/row6 越 blockX=5/blockY=7 下边界 → isWalkable false → 不动(对齐 sdlpal 队首恒居中)。
    const gs = createInitialGameState({ x: 5 * 32, y: 7 * 16, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(5 * 32) // 被下边界挡,不动
    expect(gs.party.y).toBe(7 * 16)
    expect(gs.party.facing).toBe('left') // facing 仍更新(转向但不走)
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
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(隔离 NPC 阻挡,非边缘带)
    // Right(East): dx=+16, dy=+8 → NPC 在 (17*16, 17*8)
    gs.npcs = [{ id: 1, x: 17 * 16, y: 17 * 8, spriteNum: 78, sState: 2 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(16 * 16) // 没走过去(NPC 阻挡)
    expect(gs.party.facing).toBe('right') // facing 变了
  })

  // M5:走路碰撞下边界 fCheckRange(sdlpal scene.c:551/563-567:blockX=partyoffset.x/32=5、
  //   blockY=partyoffset.y/16=7;队首 tile 列<5/行<7 一律阻挡 → 队首恒居屏幕中心、viewport 不为负)。
  it('M5:fCheckRange=true 挡 col<5 / row<7 边缘带', () => {
    const map = makeFlatMap(20, 20) // 全可走
    expect(isWalkable(map, 120, 200, [], 0, true)).toBe(false) // col=3<5 → 挡
    expect(isWalkable(map, 200, 80, [], 0, true)).toBe(false)  // row=5<7 → 挡
    expect(isWalkable(map, 200, 200, [], 0, true)).toBe(true)  // col6/row12 合法
  })

  it('M5:fCheckRange=false(怪物追击/默认)不挡边缘带', () => {
    const map = makeFlatMap(20, 20)
    expect(isWalkable(map, 120, 80, [], 0, false)).toBe(true)
    expect(isWalkable(map, 120, 80)).toBe(true) // 默认 false
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

describe('PAL_StartFrame input order(play.c:534-566)', () => {
  it('方向键 + Menu 同帧 → 先移动再开菜单', () => {
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(避开边缘带)
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)

    tickSceneSystem(gs, snap(['Right'], ['Menu']), bus, { tilemap: map, eventCommands: [], labelMap: {} })

    expect(gs.party.x).toBe(17 * 16)
    expect(gs.party.y).toBe(17 * 8)
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack.at(-1)?.kind).toBe('in-game')
  })
})

describe('大世界快捷键直达子菜单(sdlpal play.c:558-584)', () => {
  const MOCK_CATALOGS = {
    items: [] as Item[],
    spells: [] as Spell[],
    magics: [] as Magic[],
    playerRoles: { roles: [{ id: 0 }, { id: 1 }, { id: 2 }] } as unknown as PlayerRoles,
  }
  beforeEach(() => setMenuCatalogs(MOCK_CATALOGS))

  const ctx = { tilemap: makeFlatMap(10, 10), eventCommands: [], labelMap: {} }
  function exploreGs(): ReturnType<typeof createInitialGameState> {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.partyMembers = [0, 1, 2]
    return gs
  }

  // E→用物品 / W→装备 / F→法术 / S→状态屏(各跳过 in-game hub 直达,sdlpal play.c:558-584)
  it.each([
    ['UseItem', 'inventory'],
    ['ThrowItem', 'equip'],
    ['Force', 'in-game-magic'],
    ['Status', 'player-status'],
  ])('按 %s → 开 %s 子菜单 + mode=menu', (key, kind) => {
    const gs = exploreGs()
    const bus = createCommandBus()
    tickSceneSystem(gs, snap([], [key as AbstractKey]), bus, ctx)
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack.at(-1)?.kind).toBe(kind)
  })

  it('Menu 优先于快捷键(同帧 Menu+UseItem → in-game hub,对齐 play.c else-if 链)', () => {
    const gs = exploreGs()
    const bus = createCommandBus()
    tickSceneSystem(gs, snap([], ['Menu', 'UseItem']), bus, ctx)
    expect(gs.menuStack.at(-1)?.kind).toBe('in-game')
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
    gs.npcs = [{ id: 7, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_59', triggerMode: 1, sState: 1 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'end' as const },
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '你好', label: 'L_59' },
      { op: 'end' as const },
    ]
    // P2#5:trigger 解析走全局 labelMap(setGlobalEvents 由命令 label 建 L_59 → index 2)。
    setGlobalEvents(commands)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_59: 2 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(2)
  })

  it('方向性 NPC 被触发时面向 party,并重置站立帧(sdlpal nSpriteFrames>0)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    gs.npcs = [{
      id: 7,
      x: 6 * 16,
      y: 6 * 8,
      spriteNum: 78,
      triggerLabel: 'L_59',
      triggerMode: 1,
      sState: 1,
      nSpriteFrames: 3,
      facing: 'up',
      scriptedFrame: 2,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '你好', label: 'L_59' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_59: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)
    expect(gs.npcs[0]?.facing).toBe('left')
  })

  it('非方向性箱子被再次调查时不重置已打开帧(水月宫苗刀箱回归)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // 水月宫苗刀箱(scene 20 obj id 363):spriteNum=10,nSpriteFrames=0;开箱后 frame=1。
    gs.npcs = [{
      id: 363,
      x: 6 * 16,
      y: 6 * 8,
      spriteNum: 10,
      triggerLabel: 'L_5139',
      triggerMode: 3,
      sState: 1,
      nSpriteFrames: 0,
      scriptedFrame: 1,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'setDialogStyleNarration' as const, label: 'L_5139' },
      { op: 'showDialog' as const, messageIndex: 1894, text: '箱子里什么都没有' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_5139: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
    expect(gs.npcs[0]?.scriptedFrame).toBe(1)
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
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_999', triggerMode: 1, sState: 1 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // P2#5:全局数组空 → resolveScriptLabel(L_999) = null → loadEventFromNpc warn + 不切 mode。
    setGlobalEvents([])
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('L_999'))
    warnSpy.mockRestore()
  })

  it('P2#5:triggerLabel 经全局 labelMap 解析 → 切 event,eventCursor.ip = 全局 ip', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_38592', triggerMode: 1, sState: 1 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    // P2#5:不再分 per-scene / shared 层 — 单一全局数组。L_38592 落在 index 50。
    const globalCmds = Array.from({ length: 51 }, (_, i) =>
      i === 50 ? { op: 'end' as const, label: 'L_38592' } : { op: 'end' as const },
    )
    setGlobalEvents(globalCmds)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(50)
    // P2#5:生产 cursor 不内嵌 commands/labelMap → 默认读全局数组。
    expect(gs.eventCursor?.commands).toBeUndefined()
    expect(gs.eventCursor?.labelMap).toBeUndefined()
  })

  it('P2#5:全局 labelMap 唯一决定 triggerLabel → ip(ctx.labelMap 不再参与解析)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_X', triggerMode: 1, sState: 1 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    // L_X 落在全局 index 10。ctx 传的 labelMap 已不再用于解析,纯渲染上下文。
    const globalCmds = Array.from({ length: 11 }, (_, i) =>
      i === 10 ? { op: 'end' as const, label: 'L_X' } : { op: 'end' as const },
    )
    setGlobalEvents(globalCmds)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: { L_X: 999 }, // 不再被 trigger 解析读取
    })
    expect(gs.eventCursor?.ip).toBe(10)
    expect(gs.eventCursor?.commands).toBeUndefined()
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
    setGlobalEvents(commands) // P2#5:L_42 → 全局 index 1
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
    // P2#5:全局数组不含 L_9999 → resolveScriptLabel = null → warn + 不切 mode。
    setGlobalEvents([{ op: 'end' as const, label: 'L_OTHER' }])
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
    setGlobalEvents(commands) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
  })
})

// ── P0.e contact 菱形 Manhattan 触发(sdlpal scene.c:624)──────────────────────
//
// 旧 contact 检测用 npcAt 严格 == (party.x === npc.x && party.y === npc.y)。
// 但 party 步长 (±16, ±8) 的 parity 限制让从任意 partyStart 走到 NPC 精确像素
// **经常无整数解**(如 scene 15 草妖:dx=272 / dy=-128 → 2(a-d)=33 无解)。
// → contact 永不触发 → 永远不进战斗。
//
// sdlpal scene.c:624 真值是菱形 isometric Manhattan:
//   if (abs(p->x - npc->x) + abs(p->y - npc->y) * 2 < 16) ...
// → party 步进到 NPC ±1 步内即触发。
describe('M5.6 T7 PAL_GameUpdate fTrigger 完整真值(play.c:81-166)', () => {
  it('sVanishTime > 0 → 递减 + 不触发 trigger', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 100, y: 100, spriteNum: 1,
      triggerLabel: 'L_X', triggerMode: 5, sState: 1,
      sVanishTime: 3,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: { L_X: 0 } })
    expect(gs.mode).toBe('explore') // 不触发
    expect(gs.npcs[0]?.sVanishTime).toBe(2) // 递减
  })

  it('sVanishTime < 0 → 递增 + 不触发', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 100, y: 100, spriteNum: 1,
      triggerLabel: 'L_X', triggerMode: 5, sState: 1,
      sVanishTime: -3,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: { L_X: 0 } })
    expect(gs.mode).toBe('explore')
    expect(gs.npcs[0]?.sVanishTime).toBe(-2)
  })

  it('sState < 0 + viewport 外 → 复活 + scriptedFrame 0', () => {
    // gs.party (100,100) → camera = max(0, 100-160), max(0, 100-112) = (0,0);
    // viewport (0,0)..(320,320)。NPC 在 (500, 500) 完全在外 → 复活。
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 500, y: 500, spriteNum: 1, triggerMode: 5,
      sState: -1, scriptedFrame: 99,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(40, 40)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.npcs[0]?.sState).toBe(1) // abs(-1) = 1
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)
  })

  it('触发 trigger zone → NPC 转向面对 party', () => {
    // party (100, 100),NPC 在 party 东边 (110, 100):xOffset=10>0, yOffset=0 → kDirNorth(up)
    // sdlpal 真值:xOffset>0 + yOffset<=0 → kDirNorth(NPC 朝 party 反向?
    // 实际逻辑:NPC face party 的方向 — party 在 NPC 左 / 上 → NPC 朝右 / 下
    // 重读 play.c:132-139:NPC's xOffset = party.x - npc.x;NPC face this direction
    const gs = createInitialGameState({ x: 110, y: 100, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 100, y: 100, spriteNum: 1, sState: 1,
      triggerLabel: 'L_X', triggerMode: 5,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    setGlobalEvents([{ op: 'end' as const, label: 'L_X' }]) // P2#5:L_X → 全局 index 0
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [{ op: 'end' as const }], labelMap: { L_X: 0 } })
    // xOffset = 110-100 = 10 > 0, yOffset = 100-100 = 0 → kDirNorth → ts 'up'
    expect(gs.npcs[0]?.facing).toBe('up')
    expect(gs.npcs[0]?.scriptedFrame).toBe(0) // 站立帧
    expect(gs.mode).toBe('event')
  })

  it('PAL_StartFrame 顺序:本帧走进 trigger zone 后下一帧才触发', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'right' })
    gs.npcs = [{
      id: 1, x: 336, y: 248, spriteNum: 1, sState: 1,
      triggerLabel: 'L_X', triggerMode: 4,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)
    setGlobalEvents([{ op: 'end' as const, label: 'L_X' }])

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [{ op: 'end' as const }], labelMap: { L_X: 0 } })
    expect(gs.party.x).toBe(336)
    expect(gs.party.y).toBe(248)
    expect(gs.mode).toBe('explore')

    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [{ op: 'end' as const }], labelMap: { L_X: 0 } })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
  })

  it('阻挡 NPC 压到 party anchor → 按 NPC 朝向下一方向推离一格(play.c:197-228)', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 320, y: 240, spriteNum: 1, sState: 2,
      facing: 'down',
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)

    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })

    // down(0) 的下一方向是 west/left(1):(-16,-8)
    expect(gs.party.x).toBe(304)
    expect(gs.party.y).toBe(232)
    expect(gs.camera).toEqual({ x: 304 - PARTYOFFSET_X, y: 232 - PARTYOFFSET_Y })
    expect(gs.walkingFrame.walking).toBe(false)
  })

  it('autoScript 先移动 blocker,NPC 压到 party 后同帧 push party(play.c:169-228)', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'down' })
    gs.npcs = [{
      id: 1, x: 324, y: 238, spriteNum: 1, sState: 2,
      facing: 'down', autoCursor: { ip: 0 },
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)
    setGlobalEvents([
      { op: 'raw' as const, opcode: 0x007D, operands: [0, 0xfffc, 2], label: 'L_0' },
      { op: 'end' as const },
    ])

    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })

    expect(gs.npcs[0]?.x).toBe(320)
    expect(gs.npcs[0]?.y).toBe(240)
    expect(gs.party.x).toBe(304)
    expect(gs.party.y).toBe(232)
  })

  it('压到 party anchor 但 sState<2 或 spriteNum=0 → 不推离', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'down' })
    gs.npcs = [
      { id: 1, x: 320, y: 240, spriteNum: 1, sState: 1, facing: 'down' },
      { id: 2, x: 320, y: 240, spriteNum: 0, sState: 2, facing: 'down' },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)

    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })

    expect(gs.party.x).toBe(320)
    expect(gs.party.y).toBe(240)
    expect(gs.camera).toEqual({ x: 320 - PARTYOFFSET_X, y: 240 - PARTYOFFSET_Y })
  })

  it('推离首选方向被挡 → 按 SDLPal 四向顺序尝试下一方向', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'down' })
    gs.npcs = [
      // 触发推离:down(0) → 先试 left(-16,-8)
      { id: 1, x: 320, y: 240, spriteNum: 1, sState: 2, facing: 'down' },
      // 挡住首选 left 目标(304,232),迫使改试 up(+16,-8)
      { id: 2, x: 304, y: 232, spriteNum: 1, sState: 2, facing: 'down' },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)

    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })

    expect(gs.party.x).toBe(336)
    expect(gs.party.y).toBe(232)
    expect(gs.camera).toEqual({ x: 336 - PARTYOFFSET_X, y: 232 - PARTYOFFSET_Y })
  })
})

describe('M5.6 T8 PAL_Search 视觉效果(play.c:468-490)', () => {
  it('Confirm 触发 SearchNear NPC → NPC 朝 party 反方向 + scriptedFrame 0', () => {
    // party facing 'down' (kDirSouth=0);NPC 朝向 = (0+2)%4 = 2 = North = 'up'
    // mode 1 cells[0] = (party.x, party.y) = (100,100)同 grid;NPC 放 (100,100)同 grid
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.partyMembers = [0, 1, 2]
    gs.npcs = [{
      id: 1, x: 100, y: 100, spriteNum: 1, sState: 1,
      triggerLabel: 'L_X', triggerMode: 1, scriptedFrame: 99,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    setGlobalEvents([{ op: 'end' as const, label: 'L_X' }]) // P2#5:L_X → 全局 index 0
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    expect(gs.npcs[0]?.facing).toBe('up') // sdlpal play.c:483 (partyDir+2)%4
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)
    expect(gs.mode).toBe('event')
  })

  it('Confirm 触发 → party 全员 partyScriptedFrame[i] = partyDirNum * 3', () => {
    // party facing 'right' (kDirEast=3);wFrame = 3*3 = 9
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'right' })
    gs.partyMembers = [0, 1, 2] // 3 队员
    gs.npcs = [{
      id: 1, x: 100, y: 100, spriteNum: 1, sState: 1,
      triggerLabel: 'L_X', triggerMode: 1,
    }]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    expect(gs.partyScriptedFrame[0]).toBe(9)
    expect(gs.partyScriptedFrame[1]).toBe(9)
    expect(gs.partyScriptedFrame[2]).toBe(9)
  })
})

describe('P0.e contact 菱形距离触发(sdlpal scene.c:624)', () => {
  it('严格相等:party 与 NPC 同像素 → 触发(legacy 兼容)', () => {
    const gs = createInitialGameState({ x: 1136, y: 1304, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖来袭', label: 'L_42' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
  })

  it('M5.6 W1.b:triggerMode 4 — 距离 = 16 边界不触发(< 16 = false)', () => {
    // dx=16 dy=-8 → |16| + |-8|*2 = 16 + 16 = 32(threshold mode 4 = 16,32 ≥ 16,不触发)
    const gs = createInitialGameState({ x: 1136 + 16, y: 1304 - 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 4, sState: 1 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore') // mode 4 threshold = 16,32 ≥ 16,不触发
  })

  it('M5.6 W1.b:triggerMode 5 — 距离 = 32 < 48,触发(原简版误判)', () => {
    // sdlpal play.c:113-115:threshold = (5-4)*32+16 = 48
    const gs = createInitialGameState({ x: 1136 + 16, y: 1304 - 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5, sState: 1 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event') // mode 5 threshold = 48,32 < 48,触发
  })

  it('party 在 NPC 旁 (+8, 0) → 距离 = 8 < 16,触发', () => {
    // dx=8 dy=0 → 8 + 0 = 8 < 16
    const gs = createInitialGameState({ x: 1136 + 8, y: 1304, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
  })

  it('party 在 NPC 旁 (0, +4) → 距离 = 0 + 8 = 8 < 16,触发', () => {
    // dx=0 dy=4 → 0 + 4*2 = 8 < 16
    const gs = createInitialGameState({ x: 1136, y: 1304 + 4, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
  })

  it('triggerMode < 4 不触发即使距离 < 16(只阻挡 NPC,不是 contact 怪)', () => {
    const gs = createInitialGameState({ x: 1136 + 8, y: 1304, facing: 'down' })
    gs.npcs = [
      // triggerMode=2:Confirm-search 段,即使距离 8 也不自动触发
      { id: 7, x: 1136, y: 1304, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 2 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore')
  })

  it('triggerMode=4 边界 + 距离 8 → 触发(契合 CONTACT_MIN 与新距离判)', () => {
    const gs = createInitialGameState({ x: 1136 + 8, y: 1304, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 4 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' }, { op: 'end' as const }],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
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
  onEnterLabel?: string,
): SceneAssets {
  return {
    sceneId,
    mapNum: sceneId, // 测试用占位:让 getCurrentMapNum 有可断言的非 0 值(真值来自 scene JSON）
    tilemap: { width: 64, height: 128, cells: [], tilesetImage: 'fake' } as Tilemap,
    palette: { colors: [], cycles: [] } as any,
    eventObjects,
    npcSprites: new Map(),
    eventCommands,
    labelMap,
    onEnterLabel,
  }
}

/**
 * P0.e 测试用:构建含 wScriptOnEnter 入口的 SceneAssets。
 * enterCmds 会加 onEnterLabel='L_enter',被 loadScene 触发。
 *
 * P2#5:loadScene 经 resolveScriptLabel(全局 _globalLabelMap)解 onEnterLabel,
 * 故在此把 commands 注册为全局数组(L_enter → 全局 index 0),scene labelMap 已不参与解析。
 */
function makeFakeAssetsWithEnterScript(
  sceneId: number,
  enterCmds: any[],
): SceneAssets {
  const commands = [
    ...enterCmds.map((c, i) => ({ ...c, label: i === 0 ? 'L_enter' : undefined })),
    { op: 'end' as const },
  ]
  const labelMap: Record<string, number> = { L_enter: 0 }
  setGlobalEvents(commands) // P2#5:onEnterLabel 走全局 labelMap
  return makeSceneAssets(sceneId, [], commands, labelMap, 'L_enter')
}

describe('loadScene × nSpriteFramesAuto 回填(sdlpal res.c:295-298,血池冒泡/血柱动画根因)', () => {
  it('装载时按精灵总帧数回填 nSpriteFramesAuto;无 sprite(spriteNum=0)不回填', async () => {
    // bootstrap 注入的 provider 等价物:spriteNum → 已装帧数
    setSpriteFrameCountProvider((spriteNum) => ({ 272: 24, 11: 11 } as Record<number, number>)[spriteNum])
    try {
      const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
      const cache = new SceneAssetsCache(async (id: number) =>
        makeSceneAssets(id, [
          { id: 0, x: 0, y: 0, spriteNum: 272, triggerMode: 0, nSpriteFrames: 0, currentFrameNum: 0 },
          { id: 1, x: 0, y: 0, spriteNum: 11, triggerMode: 0, nSpriteFrames: 0, currentFrameNum: 0 },
          { id: 2, x: 0, y: 0, spriteNum: 0, triggerMode: 0, nSpriteFrames: 0, currentFrameNum: 0 },
        ]),
      )
      await loadScene({ gs, sceneId: 7, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(24)
      expect(gs.npcs[1]!.nSpriteFramesAuto).toBe(11)
      expect(gs.npcs[2]!.nSpriteFramesAuto ?? 0).toBe(0)
    } finally {
      setSpriteFrameCountProvider(null)
    }
  })

  it('重复装载覆盖旧值(C 每次 kLoadScene 重新回填)', async () => {
    setSpriteFrameCountProvider(() => 24)
    try {
      const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
      const cache = new SceneAssetsCache(async (id: number) =>
        makeSceneAssets(id, [
          { id: 0, x: 0, y: 0, spriteNum: 272, triggerMode: 0, nSpriteFrames: 0, currentFrameNum: 0 },
        ]),
      )
      await loadScene({ gs, sceneId: 7, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(24)
      setSpriteFrameCountProvider(() => 6) // 换精灵后帧数变(0x17 setObjectSprite 场景)
      await loadScene({ gs, sceneId: 8, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(6)
    } finally {
      setSpriteFrameCountProvider(null)
    }
  })
})

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

  it('有 allEventObjects 时按 wNumScene 切全局引用,重进 scene 保留 sState/位置/vanishTime', async () => {
    const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 1, x: 320, y: 160, spriteNum: 78, triggerMode: 5, sState: -1, sVanishTime: 123 },
      { id: 2, x: 64, y: 32, spriteNum: 12, triggerMode: 0, sState: 2 },
    ]
    // core loadScene 的 sceneId 是资源 dump 下标(0-based);sceneId=1 → wNumScene=2 → range key 1。
    gs.sceneEventRanges = { 1: [1, 3] }
    const cache = new SceneAssetsCache(async (id) =>
      makeSceneAssets(id, [
        { id: 1, x: 999, y: 999, spriteNum: 78, triggerMode: 5, sState: 1, vanishTime: 0 },
        { id: 2, x: 888, y: 888, spriteNum: 12, triggerMode: 0, sState: 1, vanishTime: 0 },
      ]),
    )

    await loadScene({ gs, sceneId: 1, assets: cache })

    expect(gs.wNumScene).toBe(2)
    expect(gs.npcs).toEqual([gs.allEventObjects[1], gs.allEventObjects[2]])
    expect(gs.npcs[0]).toMatchObject({ id: 1, x: 320, y: 160, sState: -1, sVanishTime: 123 })
    gs.npcs[0]!.sState = 0
    expect(gs.allEventObjects[1]?.sState).toBe(0)
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
    // camera = viewport = party - partyoffset(160, 112)
    expect(gs.camera).toEqual({ x: 20 * 16 - 160, y: 30 * 8 - 112 })
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

  // C6(gameOverActive 重构):死亡读档/场景重载是死亡演出的退出点。loadScene 必须把两个死亡标记都清掉,
  //   否则残留的 deathHoldActive(纯 hold)会让 present 永久保持上一帧、冻住新场景渲染。
  it('loadScene 清 gameOverActive + deathHoldActive(死亡演出退出 → 新场景恢复正常渲染)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.gameOverActive = true
    gs.deathHoldActive = true
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({ gs, sceneId: 3, assets: cache })

    expect(gs.gameOverActive).toBe(false)
    expect(gs.deathHoldActive).toBe(false)
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

// ── P2#5: trigger 解析走单一全局数组(原 P3.T1 per-scene gating 已废)──────────
//
// 原 P3.T1 测的是"loadScene 换入 per-scene labelMap,只有当前 scene 的 label 才能解析"
// 的 gating 行为。P2#5 故意**移除**该 gating:trigger 现统一经 _globalLabelMap 解析,
// **与当前加载哪个 scene 无关**(这正是 P2#5 目的 — 支持跨场景 trigger,如李大娘 L_560)。
//
// 下面两测改为验证新的全局解析语义:
//  1. trigger 经 setGlobalEvents 注册的全局 labelMap 解析,loadScene 加载的 scene 不影响。
//  2. 全局注册一次后,任意 scene 下同一 triggerLabel 都能解析(跨场景 trigger,反 gating)。
describe('P2#5 trigger 经全局 labelMap 解析(原 P3.T1)', () => {
  it('contact NPC triggerLabel 经全局 labelMap 解析 → 切 event(loadScene 用 _ctx singleton)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const globalCommands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖', label: 'L_41179' },
      { op: 'end' as const },
    ]
    // P2#5:trigger 走全局数组 — 注册全局即可解析(loadScene 的 sceneAssets labelMap 不再参与)。
    setGlobalEvents(globalCommands)

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [], globalCommands, { L_41179: 0 }),
    )
    const cache = new SceneAssetsCache(fetcher)
    await loadScene({ gs, sceneId: 15, assets: cache })

    // 装一个 contact NPC,triggerLabel 指向全局 label
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_41179', triggerMode: 5 },
    ]
    const bus = createCommandBus()

    // tickSceneSystem 用 _ctx(loadScene 内 setSceneContext 写入的 singleton)
    tickSceneSystem(gs, snap(), bus)

    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0) // 全局 ip
    // P2#5:生产 cursor 不内嵌 labelMap → 默认读全局数组。
    expect(gs.eventCursor?.labelMap).toBeUndefined()
  })

  it('全局 label 跨 scene 解析:任意 scene 下同一 triggerLabel 都能切 event(反 per-scene gating)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // P2#5:单一全局数组。L_scene2 落在 index 1(L_scene1 在 0)。
    const globalCommands = [
      { op: 'end' as const, label: 'L_scene1' },
      { op: 'end' as const, label: 'L_scene2' },
    ]
    setGlobalEvents(globalCommands)

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [], globalCommands, { L_scene1: 0, L_scene2: 1 }),
    )
    const cache = new SceneAssetsCache(fetcher)

    // 加载 scene 1:旧模型下 L_scene2 不在 scene1 labelMap → 不触发。
    // 新模型:L_scene2 在全局 labelMap → 不论加载哪个 scene 都能触发(跨场景 trigger)。
    await loadScene({ gs, sceneId: 1, assets: cache })
    gs.npcs = [{ id: 1, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 }]
    tickSceneSystem(gs, snap(), createCommandBus())
    expect(gs.mode).toBe('event') // P2#5:全局解析 → 切 event(原 gating 下是 explore)
    expect(gs.eventCursor?.ip).toBe(1) // L_scene2 全局 ip

    // 切到 scene 2 后同样能解析(全局,不分 scene)。
    const gs2 = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    await loadScene({ gs: gs2, sceneId: 2, assets: cache })
    gs2.npcs = [{ id: 2, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 }]
    tickSceneSystem(gs2, snap(), createCommandBus())
    expect(gs2.mode).toBe('event')
    expect(gs2.eventCursor?.ip).toBe(1)
  })
})

// ── P0.d: 队友 trail rgTrail[5](port sdlpal scene.c:823-830 PAL_UpdateParty)────
//
// sdlpal scene.c:823-830 真值:
//   for (i=3; i>=0; i--) gpGlobals->rgTrail[i+1] = gpGlobals->rgTrail[i];
//   rgTrail[0].wDirection = dir; rgTrail[0].x = xSource; rgTrail[0].y = ySource;
// → 移动成功后,将移动前 leader pos 插入 trail 头部,上限 5 项。
describe('P0.d 队友 trail(sdlpal scene.c:823-830 rgTrail shift)', () => {
  it('初始 trail 为空', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    expect(gs.trail).toEqual([])
  })

  it('成功移动一步 → trail unshift 移动前 leader pos(长度 1)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    // Right(East): dx=+16, dy=+8
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.trail).toHaveLength(1)
    // trail[0] = 移动前 leader pos + 移动方向
    expect(gs.trail[0]).toEqual({ x: 256, y: 128, dir: 'right' })
    // leader 已移到新位
    expect(gs.party.x).toBe(272)
    expect(gs.party.y).toBe(136)
  })

  it('连续移动两步 → trail[0] 是上一步前 leader pos,trail[1] 是更早的', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.trail).toHaveLength(2)
    // 第 2 次移动前 leader pos = (272, 136)
    expect(gs.trail[0]).toEqual({ x: 272, y: 136, dir: 'right' })
    // 第 1 次移动前 leader pos = (256, 128)
    expect(gs.trail[1]).toEqual({ x: 256, y: 128, dir: 'right' })
  })

  it('trail 长度上限 5(移动 7 步后仍为 5 项)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    for (let i = 0; i < 7; i++) {
      tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    }
    expect(gs.trail).toHaveLength(5)
  })

  it('trail[0] 始终是上一步移动前的 leader pos(最新)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    for (let i = 0; i < 7; i++) {
      tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    }
    // 走了 7 步:party.x = 256 + 7*16 = 368;上一步移动前 = 256 + 6*16 = 352
    expect(gs.trail[0]).toMatchObject({ x: 352, y: 128 + 6 * 8 })
  })

  it('撞墙不动 → trail 不变(不 unshift)', () => {
    // party at (48, 24), Right(+16,+8) → target (64, 32), tile [2,2] blocked
    const map = makeBlockedMap(10, 10, [[2, 2]])
    const gs = createInitialGameState({ x: 48, y: 24, facing: 'down' })
    const bus = createCommandBus()
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    // 撞墙没动,trail 不应有新记录
    expect(gs.trail).toEqual([])
  })

  it('idle(无方向键)→ trail 不变', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    // 先走一步建立 trail
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.trail).toHaveLength(1)
    // idle:trail 不新增
    tickSceneSystem(gs, snap([]), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.trail).toHaveLength(1)
  })

  it('方向变化时,trail 记录各自方向', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.trail[0]!.dir).toBe('up')    // 第 2 步用 'up'
    expect(gs.trail[1]!.dir).toBe('right') // 第 1 步用 'right'
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
    const npcs: NpcState[] = [{ id: 1, x: 100, y: 50, spriteNum: 0, triggerMode: 0, sState: 2 }]
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
    const npcs3: NpcState[] = [{ id: 2, x: 100, y: 50, spriteNum: 0, triggerMode: 3, sState: 2 }]
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

// ── P0.c: 走动 4 帧动画(sdlpal scene.c:636 PAL_UpdatePartyGestures)───────────
//
// s_iThisStepFrame 0-3 循环,走一步 +1 mod 4;撞墙 / idle → walking=false。
// present.ts 按 walking / stepFrame 选 party leader frame。
describe('P0.c 走动 4 帧动画(sdlpal scene.c:636 PAL_UpdatePartyGestures)', () => {
  it('初始状态:walking=false, stepFrame=0', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.walkingFrame.stepFrame).toBe(0)
  })

  it('按住方向键 → walking=true,stepFrame 0→1→2→3→0 循环', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.walkingFrame.stepFrame).toBe(1)

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(2)

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(3)

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(0)

    // 继续循环
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(1)
  })

  it('停按方向键 → walking=false,party.facing 不变', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.party.facing).toBe('right')

    tickSceneSystem(gs, snap([]), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    // facing 不变(仍是上一帧 set 的)
    expect(gs.party.facing).toBe('right')
  })

  it('撞墙(阻挡 tile)→ walking=false,facing 已转,stepFrame 走站立复位(L5/L30)', () => {
    // party at (48, 24), Right(+16,+8) → target (64, 32)
    // tile (64,32): col=2, row=2, xr=0, yr=0 → h=0, blocked
    const map = makeBlockedMap(10, 10, [[2, 2]])
    const gs = createInitialGameState({ x: 48, y: 24, facing: 'down' })
    const bus = createCommandBus()
    const stepBefore = gs.walkingFrame.stepFrame // = 0

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.party.facing).toBe('right')   // facing 改了
    expect(gs.party.x).toBe(48)             // 没走
    // L5/L30:撞墙不计步,但 C 仍走 PAL_UpdatePartyGestures(FALSE) → 站立分支复位 stepFrame &=2;^=2
    //   (scene.c:773-774,为下次起步设相位)。stepBefore=0 → (0&2)^2 = 2,非冻结不变。
    expect(gs.walkingFrame.stepFrame).toBe((stepBefore & 2) ^ 2)
    expect(gs.walkingFrame.stepFrame).toBe(2)
  })

  it('NPC 阻挡 → walking=false,facing 转,stepFrame 走站立复位(L5/L30)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // Right(+16,+8) → NPC 在 (6*16, 6*8)
    gs.npcs = [{ id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, sState: 2 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const stepBefore = gs.walkingFrame.stepFrame // = 0

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.party.facing).toBe('right')
    expect(gs.party.x).toBe(5 * 16)        // 没走
    // L5/L30:NPC 阻挡同撞墙,C 走 PAL_UpdatePartyGestures(FALSE) → 复位 stepFrame(scene.c:773-774)。
    expect(gs.walkingFrame.stepFrame).toBe((stepBefore & 2) ^ 2) // 0 → 2
  })

  it('L5/L30:idle → walking=false,stepFrame 站立复位 &=2;^=2(scene.c:773-774)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(64, 32)

    // 先走 2 步把 stepFrame 推到 2
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(2)

    // idle:C 站立分支复位 stepFrame &=2;^=2 → (2&2)^2 = 0(为下次起步设相位,非冻结保持 2)。
    //   站立渲染用 dir*walkFrames 不读 stepFrame,故 0↔2 翻转不影响站立姿,仅决定下次起步迈腿。
    tickSceneSystem(gs, snap([]), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.walkingFrame.stepFrame).toBe(0)

    // 再 idle 一帧:C 每站立帧都跑复位 → 0↔2 翻转(scene.c:847 PAL_StartFrame 每帧调)。
    tickSceneSystem(gs, snap([]), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.stepFrame).toBe(2)
  })

  it('contact NPC(triggerMode >= 4)不阻挡走路 → walking=true', () => {
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(避开边缘带)
    // contact 怪:走进触发战斗但不阻挡走路
    gs.npcs = [{ id: 7, x: 17 * 16, y: 17 * 8, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖来袭', label: 'L_42' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap(['Right']), bus, {
      tilemap: map, eventCommands: commands, labelMap: { L_42: 0 },
    })
    // PAL_StartFrame:自动 trigger 检测在本帧走路前;走进去后一帧才触发。
    expect(gs.mode).toBe('explore')
    // contact 怪不阻挡走路 → walking=true, stepFrame=1。
    expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.walkingFrame.stepFrame).toBe(1)
  })
})

// ── P0.e: wScriptOnEnter 真跑 ─────────────────────────────────────────────────
//
// sdlpal SCENE struct(global.h:115-121):wScriptOnEnter → 进场景即跑此段脚本。
// 6 具名 opcode 真编号(grep reference/sdlpal/script.c 得到):
//   OP_SET_PARTY_POS        = 0x0046 (70)  — Set the party position on the map
//   OP_SET_PARTY_DIRECTION  = 0x0015 (21)  — Set the direction and gesture for party member
//   OP_SET_CAMERA           = 0x007F (127) — Move the viewport(setCamera / centerCameraOnParty)
//   OP_CENTER_CAMERA_ON_PARTY = 0x007F     — 同 opcode,op[0]=0,op[1]=0 变体
//   OP_PLAY_MUSIC           = 0x0043 (67)  — Set background music
//   OP_SET_SCENE_OBJECT_STATE = 0x0049 (73)— Set state of current event object
describe('P0.e wScriptOnEnter 真跑', () => {
  it('loadScene 不传 partyStart → 跑 wScriptOnEnter,setPartyPos 把 party 放到指定位', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // setPartyPos col=6, row=4, h=0 → x=192, y=64
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(6 * 32)   // 192
    expect(gs.party.y).toBe(4 * 16)   // 64
    // camera = viewport = party - partyoffset(160, 112)
    expect(gs.camera.x).toBe(192 - 160)
    expect(gs.camera.y).toBe(64 - 112)
  })

  it('setPartyPos 坐标: col=41, row=18, h=0 → x=1312, y=288 (scene 1 真实值)', async () => {
    // scene 1 wScriptOnEnter: opcode 70 operands=[41, 18, 0]
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(1, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [41, 18, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 1, assets: cache })
    expect(gs.party.x).toBe(41 * 32)   // 1312
    expect(gs.party.y).toBe(18 * 16)   // 288
  })

  it('setPartyPos h=1 → 加 16/8 半 tile 偏移', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 3, 1] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // x = 2*32 + 1*16 = 80; y = 3*16 + 1*8 = 56
    expect(gs.party.x).toBe(80)
    expect(gs.party.y).toBe(56)
  })

  it('setPartyDirection opcode → gs.party.facing 转换(dir=2→up)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 0, 0] },  // kDirNorth=2 → up
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.facing).toBe('up')
  })

  it('setPartyDirection 4 方向映射: 0=down, 1=left, 2=up, 3=right', async () => {
    const mapping: [number, 'down' | 'left' | 'up' | 'right'][] = [
      [0, 'down'], [1, 'left'], [2, 'up'], [3, 'right'],
    ]
    for (const [dir, expected] of mapping) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const assets = makeFakeAssetsWithEnterScript(5, [
        { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [dir, 0, 0] },
      ])
      const cache = new SceneAssetsCache(async () => assets)
      await loadScene({ gs, sceneId: 5, assets: cache })
      expect(gs.party.facing).toBe(expected)
    }
  })

  it('loadScene 传显式 partyStart → override enter script(dev panel manual)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache, partyStart: { x: 500, y: 250, facing: 'left' } })
    // partyStart override 优先:enter script 的 setPartyPos 不跑
    expect(gs.party.x).toBe(500)
    expect(gs.party.y).toBe(250)
    expect(gs.party.facing).toBe('left')
  })

  it('未 dump wScriptOnEnter / 空 onEnterLabel → party 留在原坐标(不报错)', async () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'right' })
    // 没有 onEnterLabel 的 scene
    const assets = makeSceneAssets(5)
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(100)
    expect(gs.party.y).toBe(100)
    expect(gs.party.facing).toBe('right')
  })

  it('onEnterLabel 在 labelMap 中找不到 → party 留原位(不报错)', async () => {
    const gs = createInitialGameState({ x: 200, y: 150, facing: 'up' })
    // labelMap 里没有 L_enter
    const assets = makeSceneAssets(5, [], [], {}, 'L_enter_MISSING')
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(200)
    expect(gs.party.y).toBe(150)
  })

  it('setCamera opcode 真生效 → camera 跟 party', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_SET_CAMERA, operands: [6, 4, 0xFFFF] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // OP_SET_CAMERA absolute flag: camera = viewport = party - partyoffset
    expect(gs.camera.x).toBe(gs.party.x - 160)
    expect(gs.camera.y).toBe(gs.party.y - 112)
  })

  it('centerCameraOnParty opcode(0,0 变体)→ camera = party - partyoffset', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_CENTER_CAMERA_ON_PARTY, operands: [0, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.camera.x).toBe(192 - 160)
    expect(gs.camera.y).toBe(64 - 112)
  })

  it('playMusic opcode 写 gs.wNumMusic(shell audio 轮询播放)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_PLAY_MUSIC, operands: [31, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect((gs as any).wNumMusic).toBe(31)
  })

  it('setSceneObjectState opcode 不报错(no-op, M5+ field)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [1, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    // 不应抛错
    await expect(loadScene({ gs, sceneId: 5, assets: cache })).resolves.toBeUndefined()
  })

  it('enter script 含 showDialog → skip(不阻塞,party 位置已设)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // enter script: setPartyPos → showDialog → end
    const commands = [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0], label: 'L_enter' },
      { op: 'showDialog', messageIndex: 1, text: '你好', label: undefined },
      { op: 'end' as const },
    ]
    const labelMap: Record<string, number> = { L_enter: 0 }
    setGlobalEvents(commands as any) // P2#5:onEnterLabel 走全局 labelMap(L_enter → index 0)
    const assets = makeSceneAssets(5, [], commands, labelMap, 'L_enter')
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // party 已被 setPartyPos 设好,showDialog 被 skip
    expect(gs.party.x).toBe(192)
    expect(gs.party.y).toBe(64)
    expect(gs.mode).toBe('explore')  // 没切到 event 模式
  })
})

// ── TouchFar 自动触发 × 脚本结束首帧移动 —— 客栈李大娘"别怠慢了客人"死锁回归 ──
//
// sdlpal 真值:PAL_RunTriggerScript 是同步阻塞调用(play.c:153),返回后**同一帧**
// PAL_StartFrame 继续跑 PAL_UpdateParty(play.c:534→543)→ 按住方向键的玩家在每轮
// 自动触发脚本结束后必得到一次移动,逐帧逃出触发半径(原版站半径内会反复弹对话,但能走开)。
// ts 异步 cursor 化后,脚本 'end' 切回 explore 的下一帧 tickScenePreInput 先扫触发:
// 玩家位置未变 → 必再次命中 → tickSceneInput(移动)永远不执行 → 真死锁
// (2026-06-12 user 报:客栈苗人戏后,李大娘 TouchFar(80px)半径内无限"别怠慢了客人")。
// 修复:脚本结束设 suppressAutoTriggerOnce,切回 explore 的首帧跳过触发扫描(= C 同帧语义)。
describe('TouchFar 自动触发脚本结束后首帧可移动(李大娘死锁回归)', () => {
  function runFrame(
    gs: ReturnType<typeof createInitialGameState>,
    input: InputSnapshot,
    bus: ReturnType<typeof createCommandBus>,
    ctx: { tilemap: Tilemap; eventCommands: never[]; labelMap: Record<string, number> },
  ): void {
    if (gs.mode === 'explore') tickSceneSystem(gs, input, bus, ctx as never)
    else if (gs.mode === 'event') tickEventSystem(gs, input, bus)
  }

  function makeDeadlockFixture() {
    const gs = createInitialGameState({ x: 50 * 16, y: 50 * 8, facing: 'right' })
    gs.npcs = [
      // 李大娘等价:TouchFar(threshold 80),trigger 脚本单句对话 + plain end(不 advance → 可无限重触发)
      { id: 56, x: 50 * 16, y: 50 * 8, spriteNum: 21, triggerLabel: 'L_100', triggerMode: 6, sState: 1, nSpriteFrames: 3 },
    ]
    const commands = [
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '别怠慢了客人', label: 'L_100' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    const ctx = {
      tilemap: makeFlatMap(128, 128),
      eventCommands: commands as never[],
      labelMap: { L_100: 1 },
    }
    return { gs, ctx, bus: createCommandBus() }
  }

  it('按住方向键 + 连按 Confirm:有限帧内逃出 TouchFar 半径,不死锁', () => {
    const { gs, ctx, bus } = makeDeadlockFixture()
    const startX = gs.party.x
    // 每帧按住 Right + 点按 Confirm(关对话)。死锁版:explore 帧永远先触发,party.x 恒不变。
    // 每步加权距离 |dx|+|dy|*2 = 16+8*2 = 32,3 步 ≥ 80 逃出;60 帧裕量(每轮对话耗 2-3 帧)。
    for (let f = 0; f < 60; f++) {
      runFrame(gs, snap(['Right'], ['Confirm'], f), bus, ctx)
    }
    expect(gs.party.x).toBeGreaterThan(startX) // 死锁版恒等于 startX
    expect(gs.mode).toBe('explore')            // 逃出半径后稳定 explore,无新触发
    expect(gs.eventCursor).toBeUndefined()
  })

  it("脚本 'end' 切回 explore 的首帧:移动先于触发扫描(sdlpal 同帧 UpdateParty 语义)", () => {
    const { gs, ctx, bus } = makeDeadlockFixture()
    // 帧1 explore:扫描命中 → 切 event(本帧无移动)
    runFrame(gs, snap(['Right']), bus, ctx)
    expect(gs.mode).toBe('event')
    const startX = gs.party.x
    // event 帧:连按 Confirm 直至脚本 'end' 切回 explore(单句对话 ≤4 帧:展示/等键/end等键/收尾)
    for (let f = 0; f < 8 && gs.mode === 'event'; f++) {
      runFrame(gs, snap(['Right'], ['Confirm'], f), bus, ctx)
    }
    expect(gs.mode).toBe('explore')
    // 切回 explore 后首帧:held Right 必须生效走一步(修复前此帧先扫描 → 再次切 event,x 不变)
    runFrame(gs, snap(['Right']), bus, ctx)
    expect(gs.party.x).toBe(startX + 16)
    // 第二帧起恢复正常扫描:位置仍在半径内(32 < 80)→ 再次触发,与原版"反复弹但能走"一致
    runFrame(gs, snap(['Right']), bus, ctx)
    expect(gs.mode).toBe('event')
  })
})

describe('DH5:blocker 阻挡只看 sState,无 triggerMode 豁免(scene.c:619-628)', () => {
  it('sState>=2 且 triggerMode=5(门卫类)阻挡走路(修前可穿行)', () => {
    const tilemap = makeFlatMap(20, 20)
    const npcs = [
      { id: 0, x: 200, y: 200, spriteNum: 1, sState: 2, triggerMode: 5 },
    ]
    // 紧贴 npc(曼哈顿 |dx|+|dy|*2 < 16)→ 阻挡
    expect(isWalkable(tilemap, 204, 202, npcs as never, 99)).toBe(false)
  })

  it('sState=1 的明雷怪(triggerMode=4)不阻挡(本就不过 blocker 关,踩怪触发不受影响)', () => {
    const tilemap = makeFlatMap(20, 20)
    const npcs = [
      { id: 0, x: 200, y: 200, spriteNum: 1, sState: 1, triggerMode: 4 },
    ]
    expect(isWalkable(tilemap, 204, 202, npcs as never, 99)).toBe(true)
  })
})
