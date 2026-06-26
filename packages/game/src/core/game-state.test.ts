import { describe, it, expect } from 'vitest'
import { clearHiddenExpCounts, createInitialGameState, hydrateNpcStaticDefaults, hydratePlayerRolesRuntime, initExpLevelsFromLevels, loadDefaultGame, normalizePlayerRolesRuntime, npcFromEventObject, projectRuntimeToBattleRoles, resetPresentationTransients, resetSceneRuntimeForNewGame, resumePostBattleScript, scriptRunHits0x4F, sliceSceneEventObjects, writeBackBattleRolesToRuntime, type Facing, type GameState, type Mode, type NpcState } from './game-state.js'
import { startDialogLine } from '../present/dialog-box.js'
import type { Command, PlayerRole, SceneEventObject } from '@type-pal/shared'

// E04(隐藏属性经验):wCount 是 ExpEntry 第三字段(sdlpal EXPERIENCE.wCount),战前清零 7 隐藏池(非主经验)。
describe('clearHiddenExpCounts(隐藏经验 wCount 战前清零,battle.c:1565-1586)', () => {
  it('清 7 隐藏池各 role 的 wCount,**不动** rgPrimaryExp', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 预置:7 隐藏池 + 主经验都给 wCount
    const pools = [
      gs.Exp.rgHealthExp, gs.Exp.rgMagicExp, gs.Exp.rgAttackExp, gs.Exp.rgMagicPowerExp,
      gs.Exp.rgDefenseExp, gs.Exp.rgDexterityExp, gs.Exp.rgFleeExp,
    ]
    for (const p of pools) for (const e of p) e.wCount = 5
    gs.Exp.rgPrimaryExp[0]!.wCount = 7 // 主经验不该被清
    clearHiddenExpCounts(gs)
    for (const p of pools) for (const e of p) expect(e.wCount).toBe(0)
    expect(gs.Exp.rgPrimaryExp[0]!.wCount).toBe(7) // 主经验保留
  })

  it('createInitialGameState 的 Exp wCount 初始 0', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.Exp.rgAttackExp[0]!.wCount).toBe(0)
  })
})

// F1(新游戏默认值核对):sdlpal PAL_LoadDefaultGame(global.c:455-465)memset Exp 全 0 后,
//   for i<MAX_PLAYER_ROLES 把全 8 类经验的 .wLevel 设为 rgwLevel[i](角色等级),wExp 保持 0。
//   ts createEmptyExp 全 0、hydrate 不碰 Exp → 新游戏后 Exp.wLevel 全 0,与真值不符(本测锁定修复)。
describe('initExpLevelsFromLevels(新游戏 Exp.wLevel 初始化,global.c:455-465)', () => {
  it('8 类经验 × 6 角色 wLevel 全 = 对应等级,wExp 不动', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.Exp.rgPrimaryExp[3]?.wLevel).toBe(0) // 前置:createEmptyExp 全 0
    const levels = [1, 5, 3, 48, 28, 40] // player-roles.json role0..5 真默认等级
    initExpLevelsFromLevels(gs.Exp, levels)
    const cats = [
      gs.Exp.rgPrimaryExp, gs.Exp.rgHealthExp, gs.Exp.rgMagicExp, gs.Exp.rgAttackExp,
      gs.Exp.rgMagicPowerExp, gs.Exp.rgDefenseExp, gs.Exp.rgDexterityExp, gs.Exp.rgFleeExp,
    ]
    for (const cat of cats) {
      for (let i = 0; i < 6; i++) {
        expect(cat[i]?.wLevel).toBe(levels[i])
        expect(cat[i]?.wExp).toBe(0)
      }
    }
  })

  it('rgwLevel 缺项(undefined)→ 该角色 wLevel 退化 0,不抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    initExpLevelsFromLevels(gs.Exp, [7]) // 只给 role0
    expect(gs.Exp.rgPrimaryExp[0]?.wLevel).toBe(7)
    expect(gs.Exp.rgPrimaryExp[5]?.wLevel).toBe(0)
  })
})

// H1(2026-06-07 sdlpal 差异审查):通关/退出回标题后再开新游戏,gs 沿用上一局脏数据
//   (金钱/背包/毒/队伍/经验等)。sdlpal PAL_LoadDefaultGame(global.c:434-465)每次新游戏都把
//   这组字段重置为默认。本测锁定 loadDefaultGame 的重置语义。
describe('loadDefaultGame(新游戏重置,PAL_LoadDefaultGame global.c:434-465)', () => {
  const fixtureRoles: import('@type-pal/shared').PlayerRoles = {
    roles: [
      {
        id: 0, avatar: 0, spriteNumInBattle: 0, spriteNum: 0, name: 0, attackAll: 0,
        level: 5, maxHP: 100, maxMP: 50, hp: 80, mp: 40,
        attackStrength: 10, magicStrength: 5, defense: 8, dexterity: 12,
        fleeRate: 3, poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        walkFrames: 3,
        attackSound: -1, weaponSound: -1, criticalSound: -1, magicSound: -1, deathSound: -1,
      },
    ],
  }

  it('清空上一局金钱/背包/毒/队伍/trail/采集值,标量回默认(global.c:434-453)', () => {
    const gs = createInitialGameState({ x: 5, y: 5, facing: 'up' })
    // 弄脏:模拟玩过一局
    gs.dwCash = 9999
    gs.inventory = [{} as GameState['inventory'][number]]
    gs.rgPoisonStatus = { '0:1': {} as GameState['rgPoisonStatus'][string] }
    gs.partyMembers = [1, 2]
    gs.trail = [{} as GameState['trail'][number]]
    gs.wCollectValue = 50
    gs.nightPalette = true
    gs.wLayer = 8
    gs.nFollower = 2
    gs.wChaseRange = 5
    gs.numPalette = 3
    gs.wNumMusic = 7
    gs.wBattleSpeed = 4
    gs.iCurInvMenuItem = 9 // L6:弄脏物品菜单光标
    gs.currentSaveSlot = 3

    loadDefaultGame(gs, fixtureRoles)

    expect(gs.dwCash).toBe(0)
    expect(gs.inventory).toEqual([])
    expect(gs.rgPoisonStatus).toEqual({})
    // memset(rgParty)+wMaxPartyMemberIndex=0 表示队伍含 role0,不是空队伍。
    expect(gs.partyMembers).toEqual([0])
    expect(gs.trail).toEqual([])
    expect(gs.wCollectValue).toBe(0)
    expect(gs.nightPalette).toBe(false)
    expect(gs.wLayer).toBe(0)
    expect(gs.nFollower).toBe(0)
    expect(gs.wChaseRange).toBe(1) // sdlpal global.c:444 default = 1(非 0)
    expect(gs.numPalette).toBe(0)
    expect(gs.wNumMusic).toBe(0)
    expect(gs.wBattleSpeed).toBe(2) // sdlpal global.c:446 default = 2
    expect(gs.iCurInvMenuItem).toBe(0) // L6:PAL_InitGameData global.c:948 复位物品菜单光标
    expect(gs.currentSaveSlot).toBe(0) // PAL_InitGameData(0):新游戏不得沿用上一存档槽
  })

  it('hydrate PlayerRoles 基线 + 8 类经验 wLevel = 角色等级(global.c:455-465)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 弄脏 runtime + Exp
    gs.PlayerRolesRuntime.rgwHP[0] = 1
    gs.Exp.rgPrimaryExp[0]!.wLevel = 99

    loadDefaultGame(gs, fixtureRoles)

    // hydrate 回基线
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(80)
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(100)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(5)
    // 8 类经验 wLevel = level 5,wExp 不动
    expect(gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(5)
    expect(gs.Exp.rgAttackExp[0]!.wLevel).toBe(5)
    expect(gs.Exp.rgFleeExp[0]!.wLevel).toBe(5)
  })

  it('M6:清 rgPlayerStatus(大世界施放的持久状态不带入新游戏,PAL_InitGameData global.c:951)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.rgPlayerStatus[1]![5] = 99 // 弄脏:role1 某 status 非 0(大世界上的护身/勇气等)
    loadDefaultGame(gs, fixtureRoles)
    expect(gs.rgPlayerStatus[1]![5]).toBe(0) // 清零(非装备持久状态丢弃,装备状态由 updateEquipments 重建)
  })
})

// H1 续:scene 运行时复位(通关后重开,清上一局 scene flag/对象状态/onEnter 停点 + 重建全局对象表)
describe('resetSceneRuntimeForNewGame(新游戏 scene 运行时复位)', () => {
  it('清 scene 持久 records + 从初始对象表重建 allEventObjects', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 弄脏:上一局 scene 进度
    gs.rgScene = { 1: {} as GameState['rgScene'][number] }
    gs.sceneOnEnterIp = { 1: 5 }
    gs.sceneOnEnterOverride = { 2: 123 }
    gs.sceneOnTeleportOverride = { 2: 456 }
    gs.sceneOnTeleportEntry = 789
    gs.rgObject = { 1: {} as GameState['rgObject'][number] }
    gs.rgEventObject = { 1: {} as GameState['rgEventObject'][number] }
    gs.allEventObjects = [{ id: 99 } as NpcState]
    gs.eventCursor = { ip: 123 }
    gs.gameOverActive = true
    gs.deathHoldActive = true
    gs.blackScreenHold = true
    gs.paletteFadeState = {} as NonNullable<GameState['paletteFadeState']>
    gs.fadeState = {} as NonNullable<GameState['fadeState']>
    gs.needToFadeIn = true
    gs.sceneLoading = true
    gs.pendingSceneLoad = 9
    gs.dialogBox = {} as NonNullable<GameState['dialogBox']>
    gs.dialogBoxKept = {} as NonNullable<GameState['dialogBoxKept']>
    gs.currentDialogPortraitIcon = 88
    // DM25:上一局残留的波/震/战斗域/追逐周期/跟随者
    gs.wScreenWave = 4
    gs.sWaveProgression = 0
    gs.shakeTime = 6
    gs.shakeLevel = 3
    gs.wNumBattleMusic = 17
    gs.wNumBattleField = 9
    gs.wChasespeedChangeCycles = 5
    gs.followers = [3]

    const initial = [
      { id: 1, x: 10, y: 20, spriteNum: 5 } as SceneEventObject,
      { id: 2, x: 30, y: 40, spriteNum: 6 } as SceneEventObject,
    ]
    resetSceneRuntimeForNewGame(gs, initial)

    expect(gs.rgScene).toEqual({})
    expect(gs.sceneOnEnterIp).toEqual({})
    expect(gs.sceneOnEnterOverride).toEqual({})
    expect(gs.sceneOnTeleportOverride).toEqual({})
    expect(gs.sceneOnTeleportEntry).toBe(0)
    expect(gs.rgObject).toEqual({})
    expect(gs.rgEventObject).toEqual({})
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.gameOverActive).toBe(false)
    // DM25:新游戏语义恒 0(C 进程静态零/FreeGlobals memset,global.c:262)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
    expect(gs.shakeTime).toBe(0)
    expect(gs.shakeLevel).toBe(0)
    expect(gs.wNumBattleMusic).toBe(0)
    expect(gs.wNumBattleField).toBe(0)
    expect(gs.wChasespeedChangeCycles).toBe(0)
    expect(gs.followers).toEqual([])
    expect(gs.deathHoldActive).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.fadeState).toBeUndefined()
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.sceneLoading).toBe(false)
    expect(gs.pendingSceneLoad).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.dialogBoxKept).toBeUndefined()
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    // allEventObjects 从初始表重建(不再是脏的 [{id:99}])
    expect(gs.allEventObjects?.length).toBe(2)
    expect(gs.allEventObjects?.map((o) => o.id)).toEqual([1, 2])
  })
})

describe('GameState', () => {
  it('初始态:无 NPC、explore 模式、无对话框', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.party.x).toBe(0)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('top')  // sdlpal PAL_InitText 默认 kDialogUpper
    expect(gs.frameNum).toBe(0)
  })

  it('初始态:partyMembers / inventory 默认空数组,battleState 缺省', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.partyMembers).toEqual([])
    expect(gs.inventory).toEqual([])
    expect(gs.battleState).toBeUndefined()
  })

  it('Mode 三态(M3 加 battle)', () => {
    const modes: Mode[] = ['explore', 'event', 'battle']
    expect(modes).toHaveLength(3)
    // 类型层面允许赋值 'battle'(若被收窄会编译失败,代守护)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    expect(gs.mode).toBe('battle')
  })

  it('Facing 四向', () => {
    const facings: Facing[] = ['up', 'down', 'left', 'right']
    expect(facings).toHaveLength(4)
  })

  it('GameState 可 JSON 序列化(含 eventCursor.commands)', () => {
    const gs = createInitialGameState({ x: 10 * 16, y: 20 * 8, facing: 'right' })
    gs.eventCursor = {
      commands: [
        { op: 'showDialog', messageIndex: 5, text: 'hi' },
        { op: 'end' },
      ],
      labelMap: { L_0: 0 },
      ip: 0,
      waiting: 'dialog',
    }
    gs.dialogBox = startDialogLine('hi', { style: 'center' })
    gs.currentDialogStyle = 'top'

    const parsed = JSON.parse(JSON.stringify(gs)) as GameState
    expect(parsed.party.x).toBe(10 * 16)
    expect(parsed.eventCursor?.ip).toBe(0)
    expect(parsed.eventCursor?.waiting).toBe('dialog')
    expect(parsed.eventCursor?.commands).toHaveLength(2)
    expect(parsed.eventCursor?.commands?.[0]?.op).toBe('showDialog')
    expect(parsed.dialogBox?.currentLineText).toBe('hi')
    expect(parsed.currentDialogStyle).toBe('top')
  })
})

describe('Sync.1 GameState 全字段冻结(SAVEDGAME_WIN 倒推)', () => {
  it('round-trip JSON.stringify → parse → deep equal', () => {
    const gs = createInitialGameState({ x: 256, y: 128, facing: 'down' })
    // 触发非 default 状态:
    gs.dwCash = 1000
    gs.wSavedTimes = 3
    gs.wNumScene = 7
    gs.wBattleSpeed = 3
    gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 2 }
    gs.Exp.rgHealthExp[1] = { wExp: 30, wLevel: 1 }
    gs.PlayerRolesRuntime.rgwHP[0] = 255
    gs.PlayerRolesRuntime.rgwLevel[0] = 5
    gs.rgEventObject[5] = {
      sState: -1, x: 100, y: 100, sLayer: 0,
      wTriggerScript: 0, wAutoScript: 0,
      wTriggerMode: 0, wSpriteNum: 3, nSpriteFrames: 4,
      wDirection: 2, wCurrentFrameNum: 0, nScriptIdleFrame: 0,
      wSpritePtrOffset: 0, nSpriteFramesAuto: 0, wScriptIdleFrameCountAuto: 0,
      sVanishTime: 0,
    }
    gs.rgScene[15] = { wMapNum: 3, wScriptOnEnter: 42, wScriptOnTeleport: 0, wEventObjectIndex: 10 }
    gs.rgObject[100] = { rgwData: [1, 2, 3, 4, 5, 6, 7] }
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 3, wPoisonScript: 100 }

    const json = JSON.stringify(gs)
    const restored = JSON.parse(json) as GameState
    expect(restored).toEqual(gs)
  })

  it('default initial state 所有新字段非 undefined', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 平铺杂项字段
    expect(gs.wSavedTimes).toBe(0)
    expect(gs.wNumScene).toBe(0)
    expect(gs.wPaletteOffset).toBe(0)
    expect(gs.wNumMusic).toBe(0)
    expect(gs.wNumBattleMusic).toBe(0)
    expect(gs.wNumBattleField).toBe(0)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.wBattleSpeed).toBe(2)   // sdlpal global.c default
    expect(gs.wCollectValue).toBe(0)
    expect(gs.wLayer).toBe(0)
    expect(gs.wChaseRange).toBe(1)
    expect(gs.wChasespeedChangeCycles).toBe(0)
    expect(gs.nFollower).toBe(0)
    expect(gs.dwCash).toBe(0)
    expect(gs.blackScreenHold).toBe(false)
    // 嵌套 struct
    expect(gs.Exp).toBeDefined()
    expect(gs.Exp.rgPrimaryExp).toBeInstanceOf(Array)
    expect(gs.Exp.rgPrimaryExp).toHaveLength(6)   // MAX_PLAYER_ROLES
    expect(gs.Exp.rgHealthExp).toHaveLength(6)
    expect(gs.Exp.rgMagicExp).toHaveLength(6)
    expect(gs.Exp.rgAttackExp).toHaveLength(6)
    expect(gs.Exp.rgMagicPowerExp).toHaveLength(6)
    expect(gs.Exp.rgDefenseExp).toHaveLength(6)
    expect(gs.Exp.rgDexterityExp).toHaveLength(6)
    expect(gs.Exp.rgFleeExp).toHaveLength(6)
    expect(gs.PlayerRolesRuntime).toBeDefined()
    expect(gs.PlayerRolesRuntime.rgwHP).toHaveLength(6)
    expect(gs.PlayerRolesRuntime.rgwLevel).toHaveLength(6)
    expect(gs.PlayerRolesRuntime.rgwEquipment).toHaveLength(6)   // MAX_PLAYER_EQUIPMENTS
    expect(gs.PlayerRolesRuntime.rgwMagic).toHaveLength(32)      // MAX_PLAYER_MAGICS
    expect(gs.PlayerRolesRuntime.rgwElementalResistance).toHaveLength(5) // NUM_MAGIC_ELEMENTAL
    expect(gs.rgPoisonStatus).toEqual({})
    expect(gs.rgScene).toEqual({})
    expect(gs.rgObject).toEqual({})
    expect(gs.rgEventObject).toEqual({})
  })

  it('sparse Record:rgEventObject 只存改过的 EventObject', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(Object.keys(gs.rgEventObject)).toHaveLength(0)
    gs.rgEventObject[5] = {
      sState: -1, x: 100, y: 100, sLayer: 0,
      wTriggerScript: 0, wAutoScript: 0,
      wTriggerMode: 0, wSpriteNum: 3, nSpriteFrames: 4,
      wDirection: 2, wCurrentFrameNum: 0, nScriptIdleFrame: 0,
      wSpritePtrOffset: 0, nSpriteFramesAuto: 0, wScriptIdleFrameCountAuto: 0,
      sVanishTime: 0,
    }
    expect(Object.keys(gs.rgEventObject)).toHaveLength(1)
    expect(gs.rgEventObject[5]?.sState).toBe(-1)
  })

  it('sparse Record:rgScene / rgObject 初始空,可单独写入', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(Object.keys(gs.rgScene)).toHaveLength(0)
    expect(Object.keys(gs.rgObject)).toHaveLength(0)
    gs.rgScene[15] = { wMapNum: 3, wScriptOnEnter: 42, wScriptOnTeleport: 0, wEventObjectIndex: 10 }
    gs.rgObject[100] = { rgwData: [1, 2, 3, 4, 5, 6, 7] }
    expect(Object.keys(gs.rgScene)).toHaveLength(1)
    expect(Object.keys(gs.rgObject)).toHaveLength(1)
  })

  it('AllExperience 初始值全零 ExpEntry', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    for (const entry of gs.Exp.rgPrimaryExp) {
      expect(entry.wExp).toBe(0)
      expect(entry.wLevel).toBe(0)
    }
  })

  it('PlayerRolesRuntime 初始值全零', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.PlayerRolesRuntime.rgwHP.every(v => v === 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwLevel.every(v => v === 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMagic.every(row => row.every(v => v === 0))).toBe(true)
  })
})

describe('npcFromEventObject', () => {
  it('System A:eo.x/y 直接透传(1:1 sdlpal pixel),其它字段透传', () => {
    const eo: SceneEventObject = {
      id: 3, x: 512, y: 800, spriteNum: 42, triggerLabel: 'L_59', triggerMode: 0,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.id).toBe(3)
    expect(npc.x).toBe(512)
    expect(npc.y).toBe(800)
    expect(npc.spriteNum).toBe(42)
    expect(npc.triggerLabel).toBe('L_59')
  })

  it('半 tile 位置原样保留(eo.x=720 / eo.y=664)', () => {
    // System A 1:1 透传,sdlpal scene.c:301-322 +7 锚点偏移在 present 渲染层加,
    // 不写进 logical x/y(contact 距离判断 scene.c:624 用原 eo.x/y)。
    const eo: SceneEventObject = {
      id: 7, x: 720, y: 664, spriteNum: 0, triggerMode: 0,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.x).toBe(720)
    expect(npc.y).toBe(664)
  })

  it('初始 currentFrameNum 透传为 scriptedFrame(水月宫拜谢李逍遥姿势 frame13)', () => {
    const eo: SceneEventObject = {
      id: 346,
      x: 1200,
      y: 1176,
      spriteNum: 193,
      triggerMode: 0,
      sState: 0,
      nSpriteFrames: 0,
      direction: 0,
      currentFrameNum: 13,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.scriptedFrame).toBe(13)
  })

  it('初始 vanishTime 透传为 sVanishTime(非 0 时不触发/不跑 autoScript)', () => {
    const eo: SceneEventObject = {
      id: 9,
      x: 0,
      y: 0,
      spriteNum: 1,
      triggerMode: 5,
      vanishTime: -15,
    }
    expect(npcFromEventObject(eo).sVanishTime).toBe(-15)
  })

  it('triggerLabel 缺时透传 undefined', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0, triggerMode: 0 }
    expect(npcFromEventObject(eo).triggerLabel).toBeUndefined()
  })

  // ── 扬州太守领赏 bug(tp 层修原版「书案太长够不到太守」data/布局 bug)─────────────
  // 太守(场景 81 obj 1518)原版是 Confirm-search(triggerMode 3),但公案在 map84 用 obstacle tile
  // 围成斜墙,玩家挤不到能搜查命中的格 → 5500 文赏金领不到(实测最近只到加权 160 被挡)。
  // tp 层把 obj 1518 改成走近自动触发(mode >= 4)+ autoTriggerOnce 只触发一次(防修好可达性后凭空
  // 多出原版没有的刷钱漏洞)。门禁靠 scene 81 只在擒贼后载入(结构性),不在此层加 flag。
  it('太守 obj 1518:Confirm-search(mode 3)→ 走近自动触发(mode >= 4)+ autoTriggerOnce', () => {
    const eo: SceneEventObject = {
      id: 1518, x: 1616, y: 968, spriteNum: 382, triggerLabel: 'L_15293', triggerMode: 3, sState: 1,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.triggerMode).toBeGreaterThanOrEqual(4) // sdlpal kTriggerTouchNear=4 起为自动触发区
    expect(npc.autoTriggerOnce).toBe(true)
    // 触发判定中心挪到书案前站立点(非太守 sprite)→ 出发点不在附近,不自动触发(速通不强制领赏)
    expect(npc.autoTriggerAnchorX).toBe(1600)
    expect(npc.autoTriggerAnchorY).toBe(1040)
  })

  it('其它对象 triggerMode 3 不受补丁影响(仍是 Confirm-search,无 autoTriggerOnce)', () => {
    const eo: SceneEventObject = {
      id: 999, x: 1616, y: 968, spriteNum: 382, triggerLabel: 'L_15293', triggerMode: 3, sState: 1,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.triggerMode).toBe(3)
    expect(npc.autoTriggerOnce).toBeUndefined()
  })
})

// ── 忠实全局 event object 数组(2026-05-28 李大娘重进重现回归)──────────────────
describe('sliceSceneEventObjects(sdlpal lprgEventObject 切片)', () => {
  it('gs.npcs = 当前 scene 切片,元素是 allEventObjects 引用 → 脚本改动持久', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 1, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 2, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    gs.sceneEventRanges = { 1: [1, 3] } // scene index 1(wNum 2)拥有 [1,3)
    gs.sceneLabelMap = {}
    const slice = sliceSceneEventObjects(gs, 2)
    expect(slice?.map((n) => n.id)).toEqual([1, 2])
    // 引用:改切片元素 = 改全局数组(脚本改动持久,重进保留)
    slice![0]!.sState = 0
    expect(gs.allEventObjects[1]!.sState).toBe(0)
  })

  it('首访延迟解析 autoCursor(P2#5:autoLabel = L_<全局下标>,identity 解析)', () => {
    // P2#5(game-state.ts:1093-1099 globalIpFromLabel):autoLabel = 'L_<n>' → 全局 ip = n(恒等),
    // 不再走 per-scene sceneLabelMap。sceneLabelMap 即使存在也被忽略。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.allEventObjects = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 1, autoLabel: 'L_100' }]
    gs.sceneEventRanges = { 0: [0, 1] }
    gs.sceneLabelMap = { L_100: 42 } // 旧 per-scene 映射:P2#5 下被忽略,不影响解析结果
    expect(sliceSceneEventObjects(gs, 1)?.[0]?.autoCursor).toEqual({ ip: 100 })
  })

  it('已推进的 autoCursor 不重解(保留 autoscript 进度)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 1, sState: 1, autoLabel: 'L_100', autoCursor: { ip: 55 } },
    ]
    gs.sceneEventRanges = { 0: [0, 1] }
    gs.sceneLabelMap = { L_100: 42 }
    expect(sliceSceneEventObjects(gs, 1)?.[0]?.autoCursor).toEqual({ ip: 55 }) // 不重解为 42
  })

  it('全局表缺失 → undefined(调用方兜底从 dump 建)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(sliceSceneEventObjects(gs, 2)).toBeUndefined()
  })
})

describe('hydrateNpcStaticDefaults(旧全局对象 / 旧存档字段迁移)', () => {
  const poseObject: SceneEventObject = {
    id: 346,
    x: 1200,
    y: 1176,
    spriteNum: 193,
    triggerMode: 0,
    sState: 0,
    nSpriteFrames: 0,
    direction: 0,
    currentFrameNum: 13,
  }

  it('scriptedFrame 缺失 → 补场景初始 frame 13(水月宫抱拳拜谢)', () => {
    const npcs = [{ id: 346, x: 1200, y: 1176, spriteNum: 193, sState: 0 }]
    hydrateNpcStaticDefaults(npcs, [poseObject])
    expect(npcs[0]).toMatchObject({ nSpriteFrames: 0, scriptedFrame: 13, facing: 'down' })
  })

  it('sVanishTime 缺失 → 补场景初始 vanishTime', () => {
    const npcs: NpcState[] = [{ id: 346, x: 1200, y: 1176, spriteNum: 193, sState: 1 }]
    hydrateNpcStaticDefaults(npcs, [{ ...poseObject, vanishTime: -15 }])
    expect(npcs[0]?.sVanishTime).toBe(-15)
  })

  it('scriptedFrame 已被脚本明确设为 0 → 不用场景默认 13 覆盖', () => {
    const npcs = [{
      id: 346, x: 1200, y: 1176, spriteNum: 193, sState: 1,
      nSpriteFrames: 0, scriptedFrame: 0, facing: 'right' as const,
    }]
    hydrateNpcStaticDefaults(npcs, [poseObject])
    expect(npcs[0]).toMatchObject({ nSpriteFrames: 0, scriptedFrame: 0, facing: 'right' })
  })
})

// ============================================================================
// player-roles 数据模型边界:projectRuntimeToBattleRoles(runtime→战斗 object)+
//   writeBackBattleRolesToRuntime(战斗→runtime)。战斗用 runtime 当前属性 + 战果持久化。
// ============================================================================

function staticRole(id: number, over: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id, _name: `role${id}`, avatar: id, spriteNumInBattle: 10 + id, spriteNum: 0, name: id, attackAll: 0,
    level: 1, maxHP: 100, maxMP: 30, hp: 100, mp: 30,
    attackStrength: 5, magicStrength: 5, defense: 5, dexterity: 5, fleeRate: 5,
    poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0, attackSound: 0, weaponSound: 0, criticalSound: 0, magicSound: 0, deathSound: 0,
    ...over,
  } as any as PlayerRole
}

describe('player-roles 战斗数据模型边界', () => {
  it('投影:战斗 roles 用 runtime 当前属性(升级后)+ 静态不可变字段(精灵/名字)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    // 模拟升级后 runtime:role0 level 50 / hp 123 / maxHP 500 / attack 99 / 风抗 60 / name 7
    rt.rgwLevel[0] = 50; rt.rgwHP[0] = 123; rt.rgwMaxHP[0] = 500; rt.rgwMP[0] = 40; rt.rgwMaxMP[0] = 80
    rt.rgwAttackStrength[0] = 99; rt.rgwMagicStrength[0] = 77; rt.rgwDefense[0] = 33
    rt.rgwDexterity[0] = 44; rt.rgwFleeRate[0] = 22; rt.rgwPoisonResistance[0] = 10
    rt.rgwElementalResistance[0]![0] = 60; rt.rgwName[0] = 7
    const staticRoles = { roles: [staticRole(0, { _name: '李逍遥', spriteNumInBattle: 5, level: 1, hp: 100, attackStrength: 5 })] }
    const r = projectRuntimeToBattleRoles(rt, staticRoles).roles[0]!
    // runtime 当前属性(非静态 1 级基线)
    expect(r.level).toBe(50)
    expect(r.hp).toBe(123)
    expect(r.maxHP).toBe(500)
    expect(r.attackStrength).toBe(99)
    expect(r.magicStrength).toBe(77)
    expect(r.elemResistance.wind).toBe(60)
    expect(r.poisonResistance).toBe(10)
    expect(r.name).toBe(7)
    // 静态不可变字段
    expect(r._name).toBe('李逍遥')
    expect(r.spriteNumInBattle).toBe(5)
    expect(r.id).toBe(0)
  })

  it('D14:投影并入装备 effect — 战斗 stat = base + Σ rgEquipmentEffect[0..6](attack/magic/def/dex/flee/poison/elem)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwAttackStrength[0] = 100; rt.rgwMagicStrength[0] = 60; rt.rgwDefense[0] = 40
    rt.rgwDexterity[0] = 20; rt.rgwFleeRate[0] = 10; rt.rgwPoisonResistance[0] = 30
    rt.rgwElementalResistance[3]![0] = 25 // 火抗 base
    // 装备 effect:手(part 3)+15 攻 / +5 火抗;Extra(part 6,0x30 战内 buff)+30 攻
    gs.rgEquipmentEffect[3]!.rgwAttackStrength[0] = 15
    gs.rgEquipmentEffect[3]!.rgwElementalResistance[3]![0] = 5
    gs.rgEquipmentEffect[6]!.rgwAttackStrength[0] = 30
    gs.rgEquipmentEffect[2]!.rgwDefense[0] = 7
    gs.rgEquipmentEffect[1]!.rgwPoisonResistance[0] = 90 // → clamp 30+90=120 → 100
    const staticRoles = { roles: [staticRole(0)] }
    const r = projectRuntimeToBattleRoles(rt, staticRoles, gs.rgEquipmentEffect).roles[0]!
    expect(r.attackStrength).toBe(145) // 100 + 15(手)+ 30(Extra)
    expect(r.magicStrength).toBe(60)   // 无装备 effect
    expect(r.defense).toBe(47)         // 40 + 7
    expect(r.dexterity).toBe(20)
    expect(r.fleeRate).toBe(10)
    expect(r.poisonResistance).toBe(100) // clamp [0,100]
    expect(r.elemResistance.fire).toBe(30) // 25 + 5
  })

  it('装备 override:attackAll(任一槽非0)/ spriteNumInBattle(末个非0 override)/ cooperativeMagic(末个非0 override)', () => {
    // sdlpal PAL_PlayerCanAttackAll(global.c:2047,任一槽 !=0)/ PAL_GetPlayerBattleSprite(2009,末非0 override)
    //   / PAL_GetPlayerCooperativeMagic(2044,末非0 override)。长鞭 attackAll=1 + sprite=6;圣灵珠 coopMagic=351。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const staticRoles = { roles: [staticRole(0, { attackAll: 0, spriteNumInBattle: 10, cooperativeMagic: 5 })] }
    gs.rgEquipmentEffect[3]!.rgwAttackAll[0] = 1   // 长鞭(Hand)群攻
    gs.rgEquipmentEffect[3]!.rgwSpriteNumInBattle[0] = 6 // 长鞭换战斗精灵
    gs.rgEquipmentEffect[5]!.rgwCooperativeMagic[0] = 351 // 圣灵珠(Wear)改合击
    const r = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles, gs.rgEquipmentEffect).roles[0]!
    expect(r.attackAll).toBe(1)          // 装备群攻 → 战斗 role.attackAll!=0(battle-system 读此判全体攻)
    expect(r.spriteNumInBattle).toBe(6)  // 末个非0 override 静态 10
    expect(r.cooperativeMagic).toBe(351) // 末个非0 override 静态 5
  })

  it('装备 override:无装备 effect → attackAll/sprite/coopMagic 退回 base(coopMagic 走 hydrate 后 runtime)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const staticRoles = { roles: [staticRole(0, { attackAll: 0, spriteNumInBattle: 10, cooperativeMagic: 5 })] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, staticRoles) // base coopMagic 5 → runtime(真实流程)
    const r = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles, gs.rgEquipmentEffect).roles[0]!
    expect(r.attackAll).toBe(0)        // attackAll/sprite 无 runtime 行 → 直读静态 base
    expect(r.spriteNumInBattle).toBe(10)
    expect(r.cooperativeMagic).toBe(5) // hydrate 后 runtime.rgwCooperativeMagic=5
  })

  it('大世界 spriteNum hydrate 到 runtime,投影也读取 runtime 当前值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const staticRoles = {
      roles: [
        staticRole(0, { spriteNum: 2 }),
        staticRole(1, { spriteNum: 3 }),
      ],
    }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, staticRoles)
    expect(gs.PlayerRolesRuntime.rgwSpriteNum[0]).toBe(2)
    expect(gs.PlayerRolesRuntime.rgwSpriteNum[1]).toBe(3)

    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 208
    const roles = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles).roles
    expect(roles[1]!.spriteNum).toBe(208)
  })

  it('D14:不传 equipmentEffect → 投影退回纯 base(向后兼容,装备 effect 不并入)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwAttackStrength[0] = 100
    gs.rgEquipmentEffect[3]!.rgwAttackStrength[0] = 15
    const r = projectRuntimeToBattleRoles(rt, { roles: [staticRole(0)] }).roles[0]!
    expect(r.attackStrength).toBe(100) // 装备 effect 未并入(无 3rd 参)
  })

  it('回写:战斗 HP/MP 战果回写 runtime;仅 party 成员(非 party 不碰)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 50; rt.rgwMP[0] = 10; rt.rgwHP[1] = 80; rt.rgwMP[1] = 20
    // 战后:role0 残血 30 / 扣 mp 至 5;role1 满血 200;role2(非 party)不该被碰
    const battleRoles = {
      roles: [staticRole(0, { hp: 30, mp: 5 }), staticRole(1, { hp: 200, mp: 0 }), staticRole(2, { hp: 999, mp: 999 })],
    }
    writeBackBattleRolesToRuntime(battleRoles, rt, [0, 1])
    expect(rt.rgwHP[0]).toBe(30)
    expect(rt.rgwMP[0]).toBe(5)
    expect(rt.rgwHP[1]).toBe(200)
    expect(rt.rgwMP[1]).toBe(0)
    expect(rt.rgwHP[2]).toBe(0) // 非 party,未回写(初始 0)
  })

  it('往返:残血进战斗 → 治满 → 出战斗 → runtime 反映"加满"(原打完复原的 bug 修了)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 50; rt.rgwMaxHP[0] = 200; rt.rgwMP[0] = 10; rt.rgwMaxMP[0] = 50
    const staticRoles = { roles: [staticRole(0)] }
    // 进战斗:投影 → 带 runtime 残血 50
    const battle = projectRuntimeToBattleRoles(rt, staticRoles)
    expect(battle.roles[0]!.hp).toBe(50)
    expect(battle.roles[0]!.maxHP).toBe(200)
    // 战斗里治满(模拟治疗 opcode 写 res.playerRoles)
    battle.roles[0]!.hp = battle.roles[0]!.maxHP // 200
    battle.roles[0]!.mp = battle.roles[0]!.maxMP // 50
    // 出战斗:回写
    writeBackBattleRolesToRuntime(battle, rt, [0])
    expect(rt.rgwHP[0]).toBe(200) // 大世界反映满血战果
    expect(rt.rgwMP[0]).toBe(50)
  })

  it('resumePostBattleScript:胜→wonIp + 恢复 currentEventObjectId + mode=event(打完怪接回 0x52 隐藏)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'explore'
    gs.postBattleResume = { wonIp: 1, lostIp: 41075, fledIp: 41073, currentEventObjectId: 3, triggerOwnerId: 3 }
    resumePostBattleScript(gs, 'won')
    expect(gs.eventCursor?.ip).toBe(1)
    expect(gs.eventCursor?.currentEventObjectId).toBe(3) // 隐藏的是开战那只怪
    expect(gs.eventCursor?.triggerOwnerId).toBe(3)
    expect(gs.mode).toBe('event')
    expect(gs.postBattleResume).toBeUndefined() // 消耗
  })

  it('resumePostBattleScript:负→lostIp(op[1]) / 逃→fledIp(op[2])', () => {
    const gsL = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsL.postBattleResume = { wonIp: 1, lostIp: 41075, fledIp: 41073 }
    resumePostBattleScript(gsL, 'lost')
    expect(gsL.eventCursor?.ip).toBe(41075)

    const gsF = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsF.postBattleResume = { wonIp: 1, lostIp: 41075, fledIp: 41073 }
    resumePostBattleScript(gsF, 'fled')
    expect(gsF.eventCursor?.ip).toBe(41073)
  })

  it('resumePostBattleScript:负/逃但无对应分支 → 退回 wonIp(sdlpal else ip++)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.postBattleResume = { wonIp: 1 } // 无 lostIp/fledIp
    resumePostBattleScript(gs, 'lost')
    expect(gs.eventCursor?.ip).toBe(1)
  })

  // ── C2(gameOverActive 重构):lost + lostIp 指死亡脚本(含 0x4F)→ 置 deathHoldActive(过渡帧 hold) ──
  // 不再由 outcome==='lost' 无条件置 gameOverActive(它误伤石长老/team21/team29 续剧情);
  // 改用 scriptRunHits0x4F 预判 lostIp 指向的脚本是否真死亡。gameOverActive 改由 0x4F handler 置(C4)。
  it('resumePostBattleScript:lost + lostIp 指死亡脚本(含 0x4F)→ 置 deathHoldActive,不置 gameOverActive', () => {
    const death: Command[] = [
      { op: 'raw', opcode: 0x43, operands: [1, 1, 0] }, // ip0 音乐
      { op: 'raw', opcode: 0x4f, operands: [0, 0, 0] }, // ip1 FadeToRed
      { op: 'end' },
    ]
    const gsL = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsL.postBattleResume = { wonIp: 9, lostIp: 0, commands: death } // lostIp=0(死亡脚本起点)
    resumePostBattleScript(gsL, 'lost')
    expect(gsL.eventCursor?.ip).toBe(0) // 跳进死亡脚本
    expect(gsL.deathHoldActive).toBe(true) // T0 过渡帧 hold(0x4F 预判命中)
    expect(gsL.gameOverActive).toBeFalsy() // 不在此置(改由 0x4F handler)
  })

  it('resumePostBattleScript:lost + lostIp 续剧情(0x4F 前撞 goto,team21 式)→ 不置 deathHoldActive', () => {
    const cont: Command[] = [
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] }, // ip0 对白前
      { op: 'goto', to: 'L_41075' }, // ip1 跳死亡脚本(0x4F 之前)
      { op: 'raw', opcode: 0x4f, operands: [0, 0, 0] },
    ]
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.postBattleResume = { wonIp: 9, lostIp: 0, commands: cont }
    resumePostBattleScript(gs, 'lost')
    expect(gs.eventCursor?.ip).toBe(0) // 跳进续剧情(先播对白)
    expect(gs.deathHoldActive).toBeFalsy() // 遇 goto 停 → 不 pre-light(正常重绘对白)
    expect(gs.gameOverActive).toBeFalsy()
  })

  it('resumePostBattleScript:lost 但 lostIp=undefined(石长老 op[1]=0)→ 回退 wonIp,不置死亡 hold', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.postBattleResume = { wonIp: 5 } // 无 lostIp
    resumePostBattleScript(gs, 'lost')
    expect(gs.eventCursor?.ip).toBe(5) // 续剧情(石长老必败续剧情)
    expect(gs.deathHoldActive).toBeFalsy()
    expect(gs.gameOverActive).toBeFalsy()
  })

  it('resumePostBattleScript:won → 不置任何死亡 hold(正常返回大世界)', () => {
    const gsW = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsW.postBattleResume = { wonIp: 1 }
    resumePostBattleScript(gsW, 'won')
    expect(gsW.deathHoldActive).toBeFalsy()
    expect(gsW.gameOverActive).toBeFalsy()
  })

  it('resumePostBattleScript:无 postBattleResume → no-op(非 0x07 触发的战斗 / dev panel 战斗)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'explore'
    resumePostBattleScript(gs, 'won')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })

  // ── C1(gameOverActive 重构):scriptRunHits0x4F 死亡帧预判 ──
  // 从 lostIp 起线性扫描脚本 run(遇首个 end/goto 停),命中 0x4F(死亡红屏)→ true。
  // 数据真值:死亡脚本 L_41075 = 41075 0x43 → 41076 0x4F;team21 lostIp=6186 在 0x4F 前撞 goto。
  describe('scriptRunHits0x4F(死亡帧预判)', () => {
    const raw = (opcode: number): Command => ({ op: 'raw', opcode, operands: [0, 0, 0] })

    it('run 含 0x4F(死亡脚本 41075:0x43→0x4F)→ true', () => {
      const cmds: Command[] = [raw(0x43), raw(0x4f), { op: 'end' }]
      expect(scriptRunHits0x4F(cmds, 0)).toBe(true)
    })

    it('run 在 0x4F 前撞 goto(team21:对白→goto L_41075)→ false(不跨 goto 追)', () => {
      const cmds: Command[] = [raw(0x4b), { op: 'goto', to: 'L_41075' }, raw(0x4f)]
      expect(scriptRunHits0x4F(cmds, 0)).toBe(false)
    })

    it('run 遇 end 前无 0x4F(续剧情)→ false', () => {
      const cmds: Command[] = [raw(0x78), raw(0x49), { op: 'end' }, raw(0x4f)]
      expect(scriptRunHits0x4F(cmds, 0)).toBe(false)
    })

    it('commands undefined → false', () => {
      expect(scriptRunHits0x4F(undefined, 0)).toBe(false)
    })

    it('startIp 越过 0x43 从 0x4F 处起 → true', () => {
      const cmds: Command[] = [raw(0x43), raw(0x4f), { op: 'end' }]
      expect(scriptRunHits0x4F(cmds, 1)).toBe(true)
    })
  })

  it('往返:满血进战斗 → 受伤残血 → 出战斗 → runtime 反映伤害(伤害持久化)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 200; rt.rgwMaxHP[0] = 200
    const battle = projectRuntimeToBattleRoles(rt, { roles: [staticRole(0)] })
    battle.roles[0]!.hp = 45 // 战斗受伤残血
    writeBackBattleRolesToRuntime(battle, rt, [0])
    expect(rt.rgwHP[0]).toBe(45) // 伤害持久化(原 finalizeBattle 不回写 → 复原 200)
  })
})

// ============================================================================
// 读档归一化:旧 schema 存档缺后续版本新增的 runtime 字段 — 回归(ESC 开菜单崩溃)。
//   bootstrap.loadGameFromSlot 的 Object.assign(gs, loadedGs) 用存档那份 PlayerRolesRuntime
//   整体替换了 createInitialGameState 建好的完整 runtime。2026-06-07 加的 rgwAvatar/rgwWalkFrames
//   在更早的存档里不存在 → 替换后字段 undefined → ESC 开菜单时 projectRuntimeToBattleRoles 读
//   runtime.rgwAvatar[0] = undefined[0] 抛 "Cannot read properties of undefined"。
// ============================================================================
describe('normalizePlayerRolesRuntime(读档归一化 — 旧存档缺新增字段回归)', () => {
  /** 模拟 2026-06-07 之前旧代码存的档:rgwAvatar/rgwWalkFrames 当时不在 schema 里。 */
  function staleRuntime(): ReturnType<typeof createInitialGameState>['PlayerRolesRuntime'] {
    const rt = createInitialGameState({ x: 0, y: 0, facing: 'down' }).PlayerRolesRuntime
    delete (rt as unknown as Record<string, unknown>).rgwAvatar
    delete (rt as unknown as Record<string, unknown>).rgwWalkFrames
    return rt
  }

  it('复现:缺 rgwAvatar 的存档 runtime 直接投影 → 抛(undefined[0])', () => {
    const stale = staleRuntime()
    expect(() => projectRuntimeToBattleRoles(stale, { roles: [staticRole(0)] })).toThrow()
  })

  it('归一化补齐缺失字段(rgwAvatar/rgwWalkFrames),投影不再崩', () => {
    const fixed = normalizePlayerRolesRuntime(staleRuntime())
    expect(fixed.rgwAvatar).toHaveLength(6)
    expect(fixed.rgwWalkFrames).toHaveLength(6)
    expect(() => projectRuntimeToBattleRoles(fixed, { roles: [staticRole(0)] })).not.toThrow()
  })

  it('存档已有的真实数据原样保留(归一化只补缺失键,不覆盖)', () => {
    const stale = staleRuntime()
    stale.rgwHP[0] = 123; stale.rgwLevel[0] = 50; stale.rgwName[0] = 7
    const fixed = normalizePlayerRolesRuntime(stale)
    expect(fixed.rgwHP[0]).toBe(123)
    expect(fixed.rgwLevel[0]).toBe(50)
    expect(fixed.rgwName[0]).toBe(7)
  })

  it('runtime 整体缺失(极旧档无 PlayerRolesRuntime)→ 返回全零完整 runtime', () => {
    const fixed = normalizePlayerRolesRuntime(undefined)
    expect(fixed.rgwAvatar).toHaveLength(6)
    expect(fixed.rgwMagic).toHaveLength(32)
    expect(fixed.rgwElementalResistance).toHaveLength(5)
  })
})

// 结局片尾回主菜单 bug:0xA0 QUIT 从「拜月投河 RNG(chunk9)演出对话」期触发,播完片尾 4/5/6.mp4 后
//   returnToTitle 若漏清 dialogPlayingRNG+rngDialogBackup,present.ts 命中短路分支画结局 RNG 末帧(血池)
//   盖住主菜单 + return → user 报「看完片尾自动回 RNG 末帧、全部按键无效」(菜单其实在响应,只是被盖住)。
describe('resetPresentationTransients(回标题/新游戏清演出残留)', () => {
  it('清结局 RNG 演出残留 + 黑屏/fade/死亡演出/eventCursor', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 模拟结局 0xA0 QUIT 触发瞬间的残留(拜月投河 RNG 演出对话期)
    gs.dialogPlayingRNG = true
    gs.rngDialogBackup = new Uint8Array(320 * 200).fill(7)
    gs.rngFrameActive = true
    gs.blackScreenHold = true
    gs.gameOverActive = true
    gs.deathHoldActive = true
    gs.needToFadeIn = true
    gs.sceneLoading = true
    gs.eventCursor = { ip: 35621 }

    resetPresentationTransients(gs)

    // present.ts 短路分支 `if (dialogPlayingRNG && rngDialogBackup)` 依赖的两字段必须清 → 主菜单不再被盖
    expect(gs.dialogPlayingRNG).toBe(false)
    expect(gs.rngDialogBackup).toBeUndefined()
    expect(gs.rngFrameActive).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.gameOverActive).toBe(false)
    expect(gs.deathHoldActive).toBe(false)
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.sceneLoading).toBe(false)
    expect(gs.eventCursor).toBeUndefined()
  })

  it('resetSceneRuntimeForNewGame 复用 helper:同样清掉结局 RNG 残留(防重构回归)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogPlayingRNG = true
    gs.rngDialogBackup = new Uint8Array(10)
    gs.rngFrameActive = true
    gs.blackScreenHold = true

    resetSceneRuntimeForNewGame(gs, [])

    expect(gs.dialogPlayingRNG).toBe(false)
    expect(gs.rngDialogBackup).toBeUndefined()
    expect(gs.rngFrameActive).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
  })
})
