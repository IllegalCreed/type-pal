/**
 * 戰鬥 runScript 的世界/NPC raw fallback 接線合同。
 * 真實 caller 是 battle-system 的傷亡/結算腳本；裝備與大世界仙術另有同步 runner。
 * 本檔只核 opcode 到狀態/服務的接線；等待調度、色表逐步數學由 event-system / palette-fade 專測持有。
 * 0x75 例外：走正式 event tick 並接真實裝備重建，驗證換隊後的毒槽與角色歸屬。
 */
import type { Command, Item, Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeEnemy, makeField, makeRole } from '../__tests__/coverage85-glm-game/harness.js'
import { createBattleState } from './battle/battle-state.js'
import { createCommandBus } from './command-bus.js'
import { updateAllEquipments } from './equip-effect.js'
import {
  runScript,
  setMapReloader,
  setRefreshEquipmentsHandler,
  tickEventSystem,
} from './event-system.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
  type NpcState,
  npcFromEventObject,
} from './game-state.js'
import { setObjectPoisons } from './player-poison-state.js'
import { createSeedableRng } from './rng.js'
import { setGlobalEvents } from './script-catalog.js'

function freshGs(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const playerRoles = { roles: Array.from({ length: 6 }, (_, id) => makeRole(id)) }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  gs.wNumScene = 1
  gs.mode = 'battle'
  gs.battleState = createBattleState({
    gs,
    playerRoles,
    enemies: [makeEnemy()],
    field: makeField(),
    isBoss: false,
    rng: createSeedableRng(1),
  })
  return gs
}

function npc(id: number, overrides: Partial<NpcState> = {}): NpcState {
  return {
    ...npcFromEventObject({
      id,
      x: 100,
      y: 100,
      spriteNum: 1,
      triggerMode: 0,
      nSpriteFrames: 3,
      currentFrameNum: 0,
      direction: 0,
    }),
    ...overrides,
  }
}

/** 場景 slice 與全局表借用相同對象；不讓測試另造兩份可變 NPC。 */
function installNpcs(gs: GameState, ...objects: NpcState[]): void {
  gs.npcs = objects
  gs.allEventObjects = objects
}

function paletteGs(): GameState {
  const gs = freshGs()
  const base: Palette = {
    colors: Array.from({ length: 256 }, () => [16, 32, 48]),
    nightColors: Array.from({ length: 256 }, () => [4, 8, 12]),
    cycles: [],
  }
  base.colors[255] = [32, 64, 96]
  gs.basePalette = base
  gs.palette = { colors: Array.from({ length: 256 }, () => [96, 64, 32]), cycles: [] }
  return gs
}

function runCommands(gs: GameState, commands: Command[], eventObjectId?: number): void {
  if (!gs.battleState) throw new Error('battle fixture must have a real BattleState')
  runScript({
    commands,
    ip: 0,
    bus: createCommandBus(),
    runtimeMode: 'battle',
    battleCtx: { state: gs.battleState, gs },
    eventObjectId,
  })
}

function run1(
  gs: GameState,
  opcode: number,
  operands: [number, number, number],
  eventObjectId?: number,
): void {
  runCommands(gs, [{ op: 'raw', opcode, operands }, { op: 'end' }], eventObjectId)
}

afterEach(() => {
  setMapReloader(null)
  setRefreshEquipmentsHandler(null)
  setObjectPoisons([])
  setGlobalEvents([])
  vi.restoreAllMocks()
})

describe('battle raw fallback — palette', () => {
  it('0x51 FadeIn: 黑色到基線色表，清除待淡入旗標', () => {
    const gs = paletteGs()
    gs.needToFadeIn = true
    run1(gs, 0x51, [1, 0, 0])
    expect(gs.paletteFadeState).toMatchObject({ mode: 'lerp', totalMs: 600, fade60: 'in' })
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([16, 32, 48])
    expect(gs.needToFadeIn).toBe(false)
  })

  it('0x93 SceneFade: SHORT 負步長淡出，正步長淡入並清除旗標', () => {
    const gs = paletteGs()
    run1(gs, 0x93, [0xfffe, 0, 0])
    expect(gs.paletteFadeState).toMatchObject({ totalMs: 3200, fade63: 'out' })
    expect(gs.paletteFadeState?.startColors[0]).toEqual([96, 64, 32])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
    expect(gs.needToFadeIn).toBe(true)
    run1(gs, 0x93, [2, 0, 0])
    expect(gs.paletteFadeState).toMatchObject({ totalMs: 3200, fade63: 'in' })
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([16, 32, 48])
    expect(gs.needToFadeIn).toBe(false)
  })

  it('0x80 PaletteFade: 翻轉日夜色組，保留兩檔時長', () => {
    const gs = paletteGs()
    run1(gs, 0x80, [0, 0, 0])
    expect(gs.nightPalette).toBe(true)
    expect(gs.paletteFadeState?.startColors[0]).toEqual([96, 64, 32])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([4, 8, 12])
    expect(gs.paletteFadeState?.totalMs).toBe(3200)
    run1(gs, 0x80, [1, 0, 0])
    expect(gs.nightPalette).toBe(false)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([16, 32, 48])
    expect(gs.paletteFadeState?.totalMs).toBe(800)
  })

  it('0x8C ColorFade: BYTE 色號、方向與零延時回退均落在實際色表', () => {
    const gs = paletteGs()
    gs.needToFadeIn = true
    run1(gs, 0x8c, [0x1ff, 3, 1])
    expect(gs.paletteFadeState).toMatchObject({
      mode: 'approach',
      steps: 64,
      increment: 4,
      totalMs: 1920,
    })
    expect(gs.paletteFadeState?.startColors[0]).toEqual([32, 64, 96])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([16, 32, 48])
    expect(gs.needToFadeIn).toBe(false)
    run1(gs, 0x8c, [0x1ff, 0, 0])
    expect(gs.paletteFadeState?.startColors[0]).toEqual([16, 32, 48])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([32, 64, 96])
    expect(gs.paletteFadeState?.totalMs).toBe(640)
  })

  it('0x50 FadeOut: 零 delay 回退一檔，凍結當前畫面並標記下次淡入', () => {
    const gs = paletteGs()
    run1(gs, 0x50, [0, 0, 0])
    expect(gs.paletteFadeState).toMatchObject({
      totalMs: 600,
      mode: 'lerp',
      fade60: 'out',
      freeze: true,
    })
    expect(gs.paletteFadeState?.startColors[0]).toEqual([96, 64, 32])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
    expect(gs.needToFadeIn).toBe(true)
  })
})

describe('世界/隊伍 opcode', () => {
  it('0x46 SetPartyPos: 半格座標同步隊首、鏡頭與 trail', () => {
    const gs = freshGs()
    run1(gs, 0x46, [2, 3, 1])
    expect(gs.party).toMatchObject({ x: 80, y: 56 })
    expect(gs.camera).toEqual({ x: -80, y: -56 })
    expect(gs.trail).toEqual([
      { x: 80, y: 56, dir: 'down' },
      { x: 96, y: 48, dir: 'down' },
      { x: 112, y: 40, dir: 'down' },
      { x: 128, y: 32, dir: 'down' },
      { x: 144, y: 24, dir: 'down' },
    ])
  })

  it('0x75 SetParty:事件换队先清旧毒，再为新队伍重建寿葫芦效果', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, {
      roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
    })
    gs.partyMembers = [4, 1]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 1 }
    gs.rgPoisonStatus['0_1'] = { wPoisonID: 553, wPoisonScript: 1 }
    gs.PlayerRolesRuntime.rgwHP[0] = 30
    gs.PlayerRolesRuntime.rgwHP[1] = 40
    gs.PlayerRolesRuntime.rgwMP[1] = 10
    gs.PlayerRolesRuntime.rgwEquipment = Array.from({ length: 6 }, (_, part) =>
      Array.from({ length: 6 }, (_, role) => (part === 5 && (role === 0 || role === 1) ? 269 : 0)),
    )
    // items.json 269；全局脚本39163/40860/40858的原始opcode，压缩数组用原label解析。
    const gourd: Item = {
      id: 269,
      bitmap: 8,
      price: 8600,
      scriptOnUse: 0,
      scriptOnEquip: 39163,
      scriptOnThrow: 0,
      scriptDesc: 40275,
      flags: {
        usable: false,
        equipable: true,
        throwable: false,
        consuming: false,
        applyToAll: false,
        sellable: true,
        equipableBy: [true, true, true, false, true, false],
      },
    }
    setGlobalEvents([
      { op: 'raw', opcode: 0x75, operands: [2, 3, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x18, operands: [16, 269, 0], label: 'L_39163' },
      { op: 'raw', opcode: 0x29, operands: [0, 563, 0] },
      { op: 'raw', opcode: 0x29, operands: [0, 564, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_40860' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1c, operands: [0, 20, 0], label: 'L_40858' },
      { op: 'end' },
    ])
    setObjectPoisons([
      { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 },
      { id: 553, level: 1, color: 33, playerScript: 40870, enemyScript: 40872 },
      { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 },
      { id: 564, level: 99, color: 0, playerScript: 40858, enemyScript: 0 },
    ])
    // bootstrap 的刷新回调同样委派真实装备重建；核角色与完整毒槽结果。
    setRefreshEquipmentsHandler((state) => updateAllEquipments(state, [gourd]))
    gs.eventCursor = { ip: 0 }
    gs.mode = 'event'
    tickEventSystem(gs, { held: new Set(), pressed: new Set(), frameNum: 0 }, createCommandBus())

    expect(gs.partyMembers).toEqual([1, 2])
    expect(gs.rgPoisonStatus).toEqual({
      ...Object.fromEntries(
        Array.from({ length: 16 }, (_, slot) => [`${slot}_0`, { wPoisonID: 0, wPoisonScript: 0 }]),
      ),
      '0_0': { wPoisonID: 563, wPoisonScript: 6 },
      '1_0': { wPoisonID: 564, wPoisonScript: 8 },
    })
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(60)
    expect(gs.PlayerRolesRuntime.rgwMP[1]).toBe(30)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // 离队role0的装备仍被遍历，但不得施毒/跑入口。
    expect(gs.mode).toBe('explore')
  })

  it('0x71 WaveScreen: 波幅與 SHORT 負進度分別寫入', () => {
    const gs = freshGs()
    run1(gs, 0x71, [4, 0xfffe, 0])
    expect(gs.wScreenWave).toBe(4)
    expect(gs.sWaveProgression).toBe(-2)
  })

  it('0x36 SetRNG: 設定後續動畫 chunk', () => {
    const gs = freshGs()
    run1(gs, 0x36, [12, 0, 0])
    expect(gs.iCurPlayingRNG).toBe(12)
  })
})

describe('battle raw fallback — music', () => {
  it('0x43 PlayMusic: 曲目與一次播放旗標交給音樂宿主', () => {
    const gs = freshGs()
    gs.musicLoop = true
    run1(gs, 0x43, [5, 1, 0])
    expect(gs.wNumMusic).toBe(5)
    expect(gs.musicLoop).toBe(false)
  })

  it('0x45 SetBattleMusic: 只改下一場戰鬥曲目', () => {
    const gs = freshGs()
    gs.wNumMusic = 5
    run1(gs, 0x45, [7, 0, 0])
    expect(gs.wNumBattleMusic).toBe(7)
    expect(gs.wNumMusic).toBe(5)
  })

  it('0x77 StopMusic: 停止當前曲目，保留戰鬥曲目', () => {
    const gs = freshGs()
    gs.wNumMusic = 5
    gs.wNumBattleMusic = 7
    run1(gs, 0x77, [3, 0, 0])
    expect(gs.wNumMusic).toBe(0)
    expect(gs.wNumBattleMusic).toBe(7)
  })

  it('0xA3 PlayCDMusic: 使用第二操作數的回退曲目並開啟循環', () => {
    const gs = freshGs()
    gs.musicLoop = false
    gs.wNumBattleMusic = 7
    run1(gs, 0xa3, [2, 9, 0])
    expect(gs.wNumMusic).toBe(9)
    expect(gs.musicLoop).toBe(true)
    expect(gs.wNumBattleMusic).toBe(7)
  })
})

describe('battle raw fallback — cash/items', () => {
  it('0x1E AddCash: SHORT 負數支出與正數收入', () => {
    const gs = freshGs()
    gs.dwCash = 100
    run1(gs, 0x1e, [0xff9c, 0, 0])
    expect(gs.dwCash).toBe(0)
    run1(gs, 0x1e, [50, 0, 0])
    expect(gs.dwCash).toBe(50)
  })

  it('0x20 RemoveItem: 按量減少，超量移除清空條目', () => {
    const gs = freshGs()
    gs.inventory = [{ itemId: 61, count: 5 }]
    run1(gs, 0x20, [61, 2, 0])
    expect(gs.inventory).toEqual([{ itemId: 61, count: 3 }])
    run1(gs, 0x20, [61, 99, 0])
    expect(gs.inventory).toEqual([])
  })
})

describe('battle raw fallback — NPC', () => {
  it('0x12 SetObjectPosRelParty: WORD 負偏移以像素相對隊首定位', () => {
    const gs = freshGs()
    gs.party.x = 500
    gs.party.y = 300
    gs.camera = { x: 340, y: 188 }
    installNpcs(gs, npc(0))
    run1(gs, 0x12, [1, 0xfffb, 2])
    expect(gs.npcs[0]).toMatchObject({ x: 495, y: 302 })
  })

  it('0x6F SyncObjState: 目標狀態匹配才同步 self，目標本身不變', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0, { sState: 2 }), npc(1, { sState: 9 }))
    run1(gs, 0x6f, [1, 7, 0], 1)
    expect(gs.npcs[1]?.sState).toBe(9)
    run1(gs, 0x6f, [1, 2, 0], 1)
    expect(gs.npcs.map((n) => n.sState)).toEqual([2, 2])
  })

  it('0x24 SetAutoScript: 全局 label 命中重置 cursor，零入口清除 label/cursor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setGlobalEvents([
      { op: 'end', label: 'L_55' },
      { op: 'end', label: 'L_0' },
    ])
    const gs = freshGs()
    installNpcs(gs, npc(0, { autoCursor: { ip: 1 } }))
    run1(gs, 0x24, [1, 55, 0], 0)
    expect(gs.npcs[0]?.autoLabel).toBe('L_55')
    expect(gs.npcs[0]?.autoCursor).toEqual({ ip: 0 })
    expect(warn).not.toHaveBeenCalled()
    run1(gs, 0x24, [1, 0, 0], 0)
    expect(gs.npcs[0]?.autoLabel).toBeUndefined()
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })

  it('0x24 SetAutoScript: 缺失全局入口保留 label，警告一次且不建立 cursor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x24, [1, 999, 0], 0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: setAutoScript id=0 L_999 不在全局 labelMap')
    expect(gs.npcs[0]?.autoLabel).toBe('L_999')
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('0x14 SetObjectGesture: 指定姿勢並強制朝南', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0, { facing: 'up', scriptedFrame: 1 }))
    run1(gs, 0x14, [3, 0, 0], 0)
    expect(gs.npcs[0]).toMatchObject({ facing: 'down', scriptedFrame: 3 })
  })

  it('0x0F SetDirOrFrame: 方向與姿勢分別取兩操作數', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x0f, [2, 1, 0], 0)
    expect(gs.npcs[0]).toMatchObject({ facing: 'up', scriptedFrame: 1 })
  })

  it('0x6C NpcWalkOneStep: 有符號位移並推進一幀', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x6c, [0, 3, 0xfffb], 0)
    expect(gs.npcs[0]).toMatchObject({ x: 103, y: 95, scriptedFrame: 1 })
  })

  it('0x7D MoveObject: 有符號位移不推進動畫', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0, { scriptedFrame: 2 }))
    run1(gs, 0x7d, [0, 0xfffb, 5], 0)
    expect(gs.npcs[0]).toMatchObject({ x: 95, y: 105, scriptedFrame: 2 })
  })

  it('0x7E SetObjectLayer: 對象層使用 SHORT', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x7e, [0, 4, 0], 0)
    expect(gs.npcs[0]?.sLayer).toBe(4)
    run1(gs, 0x7e, [0, 0xfffc, 0], 0)
    expect(gs.npcs[0]?.sLayer).toBe(-4)
  })

  it('0x87 AnimateObject: 四幀循環末幀回零，坐標不變', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0, { scriptedFrame: 3 }))
    run1(gs, 0x87, [0, 0, 0], 0)
    expect(gs.npcs[0]).toMatchObject({ scriptedFrame: 0, x: 100, y: 100 })
  })

  it('0x40 SetTriggerMethod: 設定指定對象的觸發方式', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x40, [1, 4, 0], 0)
    expect(gs.npcs[0]?.triggerMode).toBe(4)
  })

  it('0x25 SetTriggerScript: 指定對象記住入口 label', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x25, [1, 77, 0], 0)
    expect(gs.npcs[0]?.triggerLabel).toBe('L_77')
  })

  it('0x9A SetMultiObjectState: 一基閉區間兩端均更新', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0), npc(1), npc(2, { sState: 9 }))
    run1(gs, 0x9a, [1, 2, 5])
    expect(gs.npcs.map((n) => n.sState)).toEqual([5, 5, 9])
  })

  it('0x49 SetSceneObjectState: 指定全局對象可隱藏', () => {
    const gs = freshGs()
    installNpcs(gs, npc(0))
    run1(gs, 0x49, [1, 0, 0])
    expect(gs.npcs[0]?.sState).toBe(0)
  })

  it('0x99 ChangeMap: 當前場景記住覆寫值並通知換圖服務', () => {
    const gs = freshGs()
    const reloaded: number[] = []
    setMapReloader(async (mapNum) => {
      reloaded.push(mapNum)
    })
    run1(gs, 0x99, [0xffff, 8, 0])
    expect(gs.sceneMapNumOverride).toEqual({ 1: 8 })
    expect(reloaded).toEqual([8])
  })
})

describe('battle raw fallback — conditional jumps', () => {
  it('0x58 JumpIfItemLess:库存不足 → 跳 op2;足 → 顺序推进(现金标记判别)', () => {
    const jumpScript: Command[] = [
      { op: 'raw', opcode: 0x58, operands: [61, 5, 2] }, // 不足 → 跳 ip2(只跳过 ip1)
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] }, // ip1(不跳才跑)
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] }, // ip2
      { op: 'end' }, // ip3
    ]
    const gs = freshGs()
    gs.inventory = [{ itemId: 61, count: 2 }] // 2 < 5 → 跳
    runCommands(gs, jumpScript)
    expect(gs.dwCash).toBe(222)
    const gs2 = freshGs()
    gs2.inventory = [{ itemId: 61, count: 9 }] // 足 → 顺序
    runCommands(gs2, jumpScript)
    expect(gs2.dwCash).toBe(333)
  })

  it('0x81 JumpIfNotFacing:party 面对对象 → 顺序;背对 → 跳(现金标记判别)', () => {
    const mkGs = (): GameState => {
      // party 留在 (0,0)(camera 与 party 同步基线);npc 在正下方 40px,sState>0 才算可面对
      const gs = freshGs()
      installNpcs(gs, npc(0, { x: 0, y: 40, sState: 1 }))
      return gs
    }
    const script: Command[] = [
      { op: 'raw', opcode: 0x81, operands: [0, 3, 2] }, // 不面对 → 跳 ip2;op1=3 触发半径
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] },
      { op: 'end' },
    ]
    const facing = mkGs()
    facing.party.facing = 'down' // npc 在下方 → 面对 → 顺序
    runCommands(facing, script, 0)
    expect(facing.dwCash).toBe(333)
    expect(facing.npcs[0]!.triggerMode).toBe(8) // 面对中且 op1=3 → contact 触发模式 5+3
    const back = mkGs()
    back.party.facing = 'up' // 背对 → 跳
    runCommands(back, script, 0)
    expect(back.dwCash).toBe(222)
    expect(back.npcs[0]?.triggerMode).toBe(0)
  })
})
