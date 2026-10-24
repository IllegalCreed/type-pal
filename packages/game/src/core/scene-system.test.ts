import type { AbstractKey, Command, InputSnapshot, PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRole } from '../__tests__/coverage85-glm-game/harness.js'
import { SceneAssetsCache } from '../assets/loader.js'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import { createCommandBus } from './command-bus.js'
import { setGlobalEvents, tickEventSystem } from './event-system.js'
import {
  createInitialGameState,
  loadDefaultGame,
  npcFromEventObject,
  PARTYOFFSET_X,
  PARTYOFFSET_Y,
  setSpriteFrameCountProvider,
} from './game-state.js'
import { setMenuCatalogs } from './menu/menu-driver.js'
import { Save } from './save/api.js'
import { makeBlockedMap, makeFlatMap, makeSceneAssets, snap } from './scene.test-fixtures.js'
import {
  isWalkable,
  loadScene,
  type SceneContext,
  setCurrentMapNum,
  setSceneContext,
  tickSceneSystem,
} from './scene-system.js'

afterEach(() => {
  setGlobalEvents([])
  setSpriteFrameCountProvider(null)
  setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles: { roles: [] } })
  setSceneContext({ tilemap: makeFlatMap(0, 0), eventCommands: [], labelMap: {} })
  setCurrentMapNum(0)
  vi.restoreAllMocks()
})

// System A sanity:确认 4 方向都是 isometric 对角(非 cardinal)。
// sdlpal scene.c:804-805 真值 4 方向均 dx ≠ 0 且 dy ≠ 0。
describe('System A 对角移动 sanity(4 方向 dx/dy 都非零)', () => {
  it.each([
    ['Right' as const, 'right' as const, +16, +8], // East SE
    ['Left' as const, 'left' as const, -16, -8], // West NW
    ['Down' as const, 'down' as const, -16, +8], // South SW
    ['Up' as const, 'up' as const, +16, -8], // North NE
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
  })
})

describe('SceneSystem 走路', () => {
  it('走路:清 pose(partyScriptedFrame)但**保留** role0 sprite override(端酒菜持久)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    gs.partyScriptedFrame = { 0: 7 } // 0x15 设的剧情 pose
    gs.partyLeaderSpriteId = 208 // 旧兼容镜像:0x65 给 role0 设的端酒菜 sprite
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party).toEqual({ x: 272, y: 136, facing: 'right' })
    expect(gs.partyScriptedFrame[0]).toBeUndefined() // pose 清掉(走路覆写 wFrame)
    expect(gs.partyLeaderSpriteId).toBe(208) // sprite override 保留(边走边端酒菜)
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
    expect(isWalkable(map, 200, 80, [], 0, true)).toBe(false) // row=5<7 → 挡
    expect(isWalkable(map, 200, 200, [], 0, true)).toBe(true) // col6/row12 合法
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
    tickSceneSystem(gs, snap(['Up', 'Down']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.party.facing).toBe('down')
  })

  it('held = [Right, Up, Left](Left 后按)→ facing = left', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right', 'Up', 'Left']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.party.facing).toBe('left')
  })

  it('held = [Confirm, Down](Down 在末尾)→ facing = down(忽略非方向键)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Confirm', 'Down']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.party.facing).toBe('down')
  })

  it('held = [Up, Confirm](Confirm 在末尾但非方向)→ facing = up(反向找方向键)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up', 'Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
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

    tickSceneSystem(gs, snap(['Right'], ['Menu']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })

    expect(gs.party.x).toBe(17 * 16)
    expect(gs.party.y).toBe(17 * 8)
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack.at(-1)?.kind).toBe('in-game')
  })
})

describe('大世界快捷键直达子菜单(sdlpal play.c:558-584)', () => {
  const playerRoles: PlayerRoles = {
    roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
  }
  beforeEach(() => setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles }))

  const ctx = { tilemap: makeFlatMap(10, 10), eventCommands: [], labelMap: {} }
  function exploreGs(): ReturnType<typeof createInitialGameState> {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    loadDefaultGame(gs, playerRoles)
    gs.partyMembers = [0, 1, 2]
    return gs
  }

  // E→用物品 / W→装备 / F→法术 / S→状态屏(各跳过 in-game hub 直达,sdlpal play.c:558-584)
  it.each<[AbstractKey, string]>([
    ['UseItem', 'inventory'],
    ['ThrowItem', 'equip'],
    ['Force', 'in-game-magic'],
    ['Status', 'player-status'],
  ])('按 %s → 开 %s 子菜单 + mode=menu', (key, kind) => {
    const gs = exploreGs()
    const bus = createCommandBus()
    tickSceneSystem(gs, snap([], [key]), bus, ctx)
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
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.mode).toBe('explore')
  })

  it('面前像素有 NPC + Confirm → mode=event + eventCursor 装载', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [
      {
        id: 7,
        x: 6 * 16,
        y: 6 * 8,
        spriteNum: 78,
        triggerLabel: 'L_59',
        triggerMode: 1,
        sState: 1,
      },
    ]
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
    gs.npcs = [
      {
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
      },
    ]
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
    gs.npcs = [
      {
        id: 363,
        x: 6 * 16,
        y: 6 * 8,
        spriteNum: 10,
        triggerLabel: 'L_5139',
        triggerMode: 3,
        sState: 1,
        nSpriteFrames: 0,
        scriptedFrame: 1,
      },
    ]
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
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.mode).toBe('explore')
  })

  it('triggerLabel 存在但不在 labelMap → warn + 不切 mode', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // right(East): dx=+16, dy=+8 → NPC 在 (6*16, 6*8)
    gs.npcs = [
      {
        id: 1,
        x: 6 * 16,
        y: 6 * 8,
        spriteNum: 78,
        triggerLabel: 'L_999',
        triggerMode: 1,
        sState: 1,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // P2#5:全局数组空 → resolveScriptLabel(L_999) = null → loadEventFromNpc warn + 不切 mode。
    setGlobalEvents([])
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.mode).toBe('explore')
    expect(warnSpy.mock.calls).toEqual([
      ['scene-system: triggerLabel L_999 不在全局 labelMap(NPC id=1)'],
    ])
  })

  it('P2#5:triggerLabel 经全局 labelMap 解析 → 切 event,eventCursor.ip = 全局 ip', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    gs.npcs = [
      {
        id: 1,
        x: 6 * 16,
        y: 6 * 8,
        spriteNum: 78,
        triggerLabel: 'L_38592',
        triggerMode: 1,
        sState: 1,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    // P2#5:不再分 per-scene / shared 层 — 单一全局数组。L_38592 落在 index 50。
    const globalCmds = Array.from({ length: 51 }, (_, i) =>
      i === 50 ? { op: 'end' as const, label: 'L_38592' } : { op: 'end' as const },
    )
    setGlobalEvents(globalCmds)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [],
      labelMap: {},
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(50)
    // P2#5:生产 cursor 不内嵌 commands/labelMap → 默认读全局数组。
    expect(gs.eventCursor?.commands).toBeUndefined()
    expect(gs.eventCursor?.labelMap).toBeUndefined()
  })

  it('P2#5:全局 labelMap 唯一决定 triggerLabel → ip(ctx.labelMap 不再参与解析)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    gs.npcs = [
      { id: 1, x: 6 * 16, y: 6 * 8, spriteNum: 78, triggerLabel: 'L_X', triggerMode: 1, sState: 1 },
    ]
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
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 }]
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
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 0 }]
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
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 2 }]
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
// sState决定对象可见性和阻挡。
describe('明雷机制 反例 / edge case(M3.5 T12)', () => {
  it('party 同像素 NPC 无 triggerLabel(triggerMode=5)→ 不切 mode + eventCursor undefined', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // triggerMode 已是 contact 段(>= 4),但 triggerLabel 缺失(对照原版 triggerScript=0)
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerMode: 5 }]
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
    expect(warnSpy.mock.calls).toEqual([
      ['scene-system: triggerLabel L_9999 不在全局 labelMap(NPC id=7)'],
    ])
  })

  it('triggerMode=3 边界(Confirm-search 段最大值)→ 不自动触发(< CONTACT_MIN)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 3 }]
    setGlobalEvents([{ op: 'end', label: 'L_42' }])
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
    gs.npcs = [{ id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 4 }]
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

// PAL_GameUpdate推进消失计时、视口外复活及自动触发；碰撞由独立叶模块核对。
describe('M5.6 T7 PAL_GameUpdate fTrigger 完整真值(play.c:81-166)', () => {
  it('sVanishTime > 0 → 递减 + 不触发 trigger', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [
      {
        id: 1,
        x: 100,
        y: 100,
        spriteNum: 1,
        triggerLabel: 'L_X',
        triggerMode: 5,
        sState: 1,
        sVanishTime: 3,
      },
    ]
    setGlobalEvents([{ op: 'end', label: 'L_X' }])
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: { L_X: 0 } })
    expect(gs.mode).toBe('explore') // 不触发
    expect(gs.npcs[0]?.sVanishTime).toBe(2) // 递减
  })

  it('sVanishTime < 0 → 递增 + 不触发', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [
      {
        id: 1,
        x: 100,
        y: 100,
        spriteNum: 1,
        triggerLabel: 'L_X',
        triggerMode: 5,
        sState: 1,
        sVanishTime: -3,
      },
    ]
    setGlobalEvents([{ op: 'end', label: 'L_X' }])
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: { L_X: 0 } })
    expect(gs.mode).toBe('explore')
    expect(gs.npcs[0]?.sVanishTime).toBe(-2)
  })

  it('sState < 0 + viewport 外 → 复活 + scriptedFrame 0', () => {
    // 预输入阶段读取初始camera=(-60,-12)，尚未执行移动后的镜头钳制。
    // NPC(500,500)在这个320×320复活判定视口外。
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.npcs = [
      {
        id: 1,
        x: 500,
        y: 500,
        spriteNum: 1,
        triggerMode: 5,
        sState: -1,
        scriptedFrame: 99,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(40, 40)
    tickSceneSystem(gs, snap(), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.npcs[0]?.sState).toBe(1) // abs(-1) = 1
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)
  })

  it('触发 trigger zone → NPC 转向面对 party', () => {
    // party(110,100)、NPC(100,100)：party-NPC=(10,0)，原方向分支映射为up。
    const gs = createInitialGameState({ x: 110, y: 100, facing: 'down' })
    gs.npcs = [
      {
        id: 1,
        x: 100,
        y: 100,
        spriteNum: 1,
        sState: 1,
        triggerLabel: 'L_X',
        triggerMode: 5,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    setGlobalEvents([{ op: 'end' as const, label: 'L_X' }]) // P2#5:L_X → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    // xOffset = 110-100 = 10 > 0, yOffset = 100-100 = 0 → kDirNorth → ts 'up'
    expect(gs.npcs[0]?.facing).toBe('up')
    expect(gs.npcs[0]?.scriptedFrame).toBe(0) // 站立帧
    expect(gs.mode).toBe('event')
  })

  it('PAL_StartFrame 顺序:本帧走进 trigger zone 后下一帧才触发', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'right' })
    gs.npcs = [
      {
        id: 1,
        x: 336,
        y: 248,
        spriteNum: 1,
        sState: 1,
        triggerLabel: 'L_X',
        triggerMode: 4,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)
    setGlobalEvents([{ op: 'end' as const, label: 'L_X' }])

    tickSceneSystem(gs, snap(['Right']), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    expect(gs.party.x).toBe(336)
    expect(gs.party.y).toBe(248)
    expect(gs.mode).toBe('explore')

    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0)
  })

  it('阻挡 NPC 压到 party anchor → 按 NPC 朝向下一方向推离一格(play.c:197-228)', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'down' })
    gs.npcs = [
      {
        id: 1,
        x: 320,
        y: 240,
        spriteNum: 1,
        sState: 2,
        facing: 'down',
      },
    ]
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
    gs.npcs = [
      {
        id: 1,
        x: 324,
        y: 238,
        spriteNum: 1,
        sState: 2,
        facing: 'down',
        autoCursor: { ip: 0 },
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(64, 64)
    setGlobalEvents([
      { op: 'raw' as const, opcode: 0x007d, operands: [0, 0xfffc, 2], label: 'L_0' },
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
    gs.npcs = [
      {
        id: 1,
        x: 100,
        y: 100,
        spriteNum: 1,
        sState: 1,
        triggerLabel: 'L_X',
        triggerMode: 1,
        scriptedFrame: 99,
      },
    ]
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
    gs.npcs = [
      {
        id: 1,
        x: 100,
        y: 100,
        spriteNum: 1,
        sState: 1,
        triggerLabel: 'L_X',
        triggerMode: 1,
      },
    ]
    setGlobalEvents([{ op: 'end', label: 'L_X' }])
    const bus = createCommandBus()
    const map = makeFlatMap(20, 20)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: [{ op: 'end' as const }],
      labelMap: { L_X: 0 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.partyScriptedFrame[0]).toBe(9)
    expect(gs.partyScriptedFrame[1]).toBe(9)
    expect(gs.partyScriptedFrame[2]).toBe(9)
  })
})

describe('自动触发的加权距离边界(PAL_GameUpdate)', () => {
  it('严格相等:party 与 NPC 同像素 → 触发(legacy 兼容)', () => {
    const gs = createInitialGameState({ x: 1136, y: 1304, facing: 'down' })
    gs.npcs = [{ id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 }]
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
    // dx=16、dy=0，恰在mode4的严格距离边界16。
    const gs = createInitialGameState({ x: 1136 + 16, y: 1304, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 4, sState: 1 },
    ]
    setGlobalEvents([{ op: 'end', label: 'L_42' }])
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore') // 距离16不满足<16。
  })

  it('M5.6 W1.b:triggerMode 5 — 距离 = 32 < 48,触发(原简版误判)', () => {
    // sdlpal play.c:113-115:threshold = (5-4)*32+16 = 48
    const gs = createInitialGameState({ x: 1136 + 16, y: 1304 - 8, facing: 'down' })
    gs.npcs = [
      { id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5, sState: 1 },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event') // mode 5 threshold = 48,32 < 48,触发
  })

  it('party 在 NPC 旁 (+8, 0) → mode5距离8<48，触发', () => {
    // dx=8 dy=0 → 8 + 0 = 8 < 16
    const gs = createInitialGameState({ x: 1136 + 8, y: 1304, facing: 'down' })
    gs.npcs = [{ id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 }]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
  })

  it('party 在 NPC 旁 (0, +4) → mode5距离8<48，触发', () => {
    // dx=0 dy=4 → 0 + 4*2 = 8 < 16
    const gs = createInitialGameState({ x: 1136, y: 1304 + 4, facing: 'down' })
    gs.npcs = [{ id: 7, x: 1136, y: 1304, spriteNum: 468, triggerLabel: 'L_42', triggerMode: 5 }]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
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
    setGlobalEvents([{ op: 'end', label: 'L_42' }])
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('explore')
  })

  it('triggerMode=4 边界 + 距离 8 → 触发(契合 CONTACT_MIN 与新距离判)', () => {
    const gs = createInitialGameState({ x: 1136 + 8, y: 1304, facing: 'down' })
    gs.npcs = [{ id: 7, x: 1136, y: 1304, spriteNum: 1, triggerLabel: 'L_42', triggerMode: 4 }]
    const bus = createCommandBus()
    const map = makeFlatMap(128, 128)
    setGlobalEvents([
      { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
      { op: 'end' as const },
    ]) // P2#5:L_42 → 全局 index 0
    tickSceneSystem(gs, snap(), bus, {
      tilemap: map,
      eventCommands: [
        { op: 'showDialog' as const, messageIndex: 0, text: 'x', label: 'L_42' },
        { op: 'end' as const },
      ],
      labelMap: { L_42: 0 },
    })
    expect(gs.mode).toBe('event')
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

  it('trail保留最新五个移动前位置及方向，按新到旧排序', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const ctx = { tilemap: makeFlatMap(64, 32), eventCommands: [], labelMap: {} }
    const bus = createCommandBus()
    for (let i = 0; i < 7; i++) tickSceneSystem(gs, snap(['Right']), bus, ctx)
    expect(gs.trail).toEqual([
      { x: 352, y: 176, dir: 'right' },
      { x: 336, y: 168, dir: 'right' },
      { x: 320, y: 160, dir: 'right' },
      { x: 304, y: 152, dir: 'right' },
      { x: 288, y: 144, dir: 'right' },
    ])
  })

  it('撞墙不动 → trail 不变(不 unshift)', () => {
    // 起点(256,128)在可走范围，目标(272,136)落在[8,8]的h=1阻挡半格。
    const map = makeBlockedMap(16, 16, [], [[8, 8]])
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
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
    expect(gs.trail[0]!.dir).toBe('up') // 第 2 步用 'up'
    expect(gs.trail[1]!.dir).toBe('right') // 第 1 步用 'right'
  })
})

describe('场景碰撞装配', () => {
  // ── 10. 透过 tickSceneSystem 集成:墙挡住走路 ─────────────────────────────
  it('tickSceneSystem:party 往阻挡 tile 走 → 不动', () => {
    // 可走范围内的h=1阻挡半格，不能由fCheckRange提前拒绝而假通过。
    const map = makeBlockedMap(16, 16, [], [[8, 8]])
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.x).toBe(256) // 没走过去
    expect(gs.party.y).toBe(128)
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
    // 可走范围内的h=1阻挡半格。
    const map = makeBlockedMap(16, 16, [], [[8, 8]])
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    const bus = createCommandBus()
    const stepBefore = gs.walkingFrame.stepFrame // = 0

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.party.facing).toBe('right') // facing 改了
    expect(gs.party.x).toBe(256) // 没走
    // L5/L30:撞墙不计步,但 C 仍走 PAL_UpdatePartyGestures(FALSE) → 站立分支复位 stepFrame &=2;^=2
    //   (scene.c:773-774,为下次起步设相位)。stepBefore=0 → (0&2)^2 = 2,非冻结不变。
    expect(gs.walkingFrame.stepFrame).toBe((stepBefore & 2) ^ 2)
    expect(gs.walkingFrame.stepFrame).toBe(2)
  })

  it('NPC 阻挡 → walking=false,facing 转,stepFrame 走站立复位(L5/L30)', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    // 目标NPC在合法行走区域，单独检验NPC阻挡。
    gs.npcs = [{ id: 1, x: 272, y: 136, spriteNum: 78, sState: 2 }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const stepBefore = gs.walkingFrame.stepFrame // = 0

    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.party.facing).toBe('right')
    expect(gs.party.x).toBe(256) // 没走
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

  it('sState=1 的 contact NPC 不阻挡走路 → walking=true', () => {
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' }) // M5:起点 col8/row8(避开边缘带)
    // contact 怪:走进触发战斗但不阻挡走路
    gs.npcs = [
      // mode4 threshold16; initial distance32 is outside, walking enters the zone.
      {
        id: 7,
        x: 17 * 16,
        y: 17 * 8,
        spriteNum: 468,
        triggerLabel: 'L_42',
        triggerMode: 4,
        sState: 1,
      },
    ]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖来袭', label: 'L_42' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    tickSceneSystem(gs, snap(['Right']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_42: 0 },
    })
    // PAL_StartFrame:自动 trigger 检测在本帧走路前;走进去后一帧才触发。
    expect(gs.mode).toBe('explore')
    // contact 怪不阻挡走路 → walking=true, stepFrame=1。
    expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.walkingFrame.stepFrame).toBe(1)
    expect(gs.party).toMatchObject({ x: 17 * 16, y: 17 * 8 })
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
    ctx: SceneContext,
  ): void {
    if (gs.mode === 'explore') tickSceneSystem(gs, input, bus, ctx)
    else if (gs.mode === 'event') tickEventSystem(gs, input, bus)
  }

  function makeDeadlockFixture() {
    const gs = createInitialGameState({ x: 50 * 16, y: 50 * 8, facing: 'right' })
    gs.npcs = [
      // 李大娘等价:TouchFar(threshold 80),trigger 脚本单句对话 + plain end(不 advance → 可无限重触发)
      {
        id: 56,
        x: 50 * 16,
        y: 50 * 8,
        spriteNum: 21,
        triggerLabel: 'L_100',
        triggerMode: 6,
        sState: 1,
        nSpriteFrames: 3,
      },
    ]
    const commands = [
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '别怠慢了客人', label: 'L_100' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    const ctx = {
      tilemap: makeFlatMap(128, 128),
      eventCommands: commands,
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
    expect(gs.mode).toBe('explore') // 逃出半径后稳定 explore,无新触发
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

// ── 扬州太守领赏 bug 修复(走近自动触发 + 一次性 guard)──────────────────────────
// 原版 obj 1518(太守)是 Confirm-search(mode 3),公案 obstacle 墙太长玩家够不到 → 5500 文领不到。
// 纠错资源经 npcFromEventObject 透传自动触发(mode 6)+ autoTriggerOnce:走近即触发一次,
// 触发后消费(triggerMode → 0)不再复触发,避免每帧重跑后续段(匾额/欢迎再来)对白。
describe('扬州太守领赏 bug 修复(走近自动触发 + 一次性 guard)', () => {
  afterEach(async () => {
    await Save._clearAllForTest()
  })
  it('书案前自动领赏一次，保存恢复并重新载入场景后仍保持消费状态', async () => {
    const npc = npcFromEventObject({
      id: 1518,
      x: 1616,
      y: 968,
      spriteNum: 382,
      triggerLabel: 'L_15293',
      triggerMode: 6,
      autoTriggerOnce: true,
      autoTriggerAnchorX: 1600,
      autoTriggerAnchorY: 1040,
      sState: 1,
    })
    // party 站在书案前触发判定中心 (1600,1040)(autoTriggerAnchor);facing 任意(自动触发不看朝向)
    const gs = createInitialGameState({ x: 1600, y: 1040, facing: 'up' })
    gs.npcs = [npc]
    gs.allEventObjects = Array.from({ length: npc.id + 1 }, (_, id) => ({
      id,
      x: 0,
      y: 0,
      spriteNum: 0,
      sState: 0,
    }))
    gs.allEventObjects[npc.id] = npc
    gs.sceneEventRanges = { 81: [1518, 1519] }
    gs.wNumScene = 82
    const bus = createCommandBus()
    const map = makeFlatMap(200, 200)
    const commands: Command[] = [
      { op: 'end' as const },
      { op: 'raw' as const, opcode: 0x1e, operands: [5500, 0, 0], label: 'L_15293' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    const ctx = { tilemap: map, eventCommands: commands, labelMap: { L_15293: 1 } }

    // 第一次:走近 → 自动切 event mode(snap() 无按键 = 不靠 Confirm)
    tickSceneSystem(gs, snap(), bus, ctx)
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(1)
    expect(npc.triggerMode).toBe(0) // 一次性 guard:触发即消费

    // cutscene 跑完回到 explore,party 仍在原触发区内 → 不能再触发(否则刷后续段对白)
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(5500)
    await Save.saveSlot(1, parseImportedSave(serializeSave(gs)))
    const loaded = await Save.loadSlot(1)
    expect(loaded).not.toBeNull()
    const restored = createInitialGameState({ x: 1600, y: 1040, facing: 'up' })
    Object.assign(restored, loaded)
    const cache = new SceneAssetsCache(async (id) =>
      makeSceneAssets(id, [{ ...npc, triggerMode: 6 }]),
    )
    await loadScene({ gs: restored, sceneId: 81, assets: cache })
    expect(restored.npcs[0]?.triggerMode).toBe(0)
    tickSceneSystem(restored, snap(), bus, ctx)
    expect(restored.mode).toBe('explore')
    expect(restored.dwCash).toBe(5500)
  })

  it.each([
    [1616, 968],
    [1504, 1008],
  ])('太守图像或进场落点 (%i,%i) 不在书案前触发区，不会误触发', (x, y) => {
    // 触发判定中心 = 书案前 (1600,1040);mode6 阈值 80。
    const npc = npcFromEventObject({
      id: 1518,
      x: 1616,
      y: 968,
      spriteNum: 382,
      triggerLabel: 'L_15293',
      triggerMode: 6,
      autoTriggerOnce: true,
      autoTriggerAnchorX: 1600,
      autoTriggerAnchorY: 1040,
      sState: 1,
    })
    // party 在太守 sprite (1616,968):到判定中心 (1600,1040) 加权 16 + 144 = 160 >= 80 → 不触发
    //(证明触发点是书案前站立点而非太守本身;出发点同理在区外)。
    const gs = createInitialGameState({ x, y, facing: 'down' })
    gs.npcs = [npc]
    const bus = createCommandBus()
    const map = makeFlatMap(200, 200)
    const commands = [
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 5286, text: '太守∶', label: 'L_15293' },
      { op: 'end' as const },
    ]
    setGlobalEvents(commands)
    const ctx = { tilemap: map, eventCommands: commands, labelMap: { L_15293: 1 } }
    tickSceneSystem(gs, snap(), bus, ctx)
    expect(gs.mode).toBe('explore') // 太守 sprite 像素离书案前判定中心 >= 阈值 → 不自动触发
  })
})
