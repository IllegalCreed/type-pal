import { describe, it, expect } from 'vitest'
import { createInitialGameState, npcFromEventObject, type Facing, type GameState, type Mode } from './game-state.js'
import type { SceneEventObject } from '@type-pal/shared'

describe('GameState', () => {
  it('初始态:无 NPC、explore 模式、无对话框', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.party.x).toBe(0)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('center')
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
    gs.dialogBox = { text: 'hi', style: 'center' }
    gs.currentDialogStyle = 'top'

    const parsed = JSON.parse(JSON.stringify(gs)) as GameState
    expect(parsed.party.x).toBe(10 * 16)
    expect(parsed.eventCursor?.ip).toBe(0)
    expect(parsed.eventCursor?.waiting).toBe('dialog')
    expect(parsed.eventCursor?.commands).toHaveLength(2)
    expect(parsed.eventCursor?.commands[0]?.op).toBe('showDialog')
    expect(parsed.dialogBox?.text).toBe('hi')
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

  it('triggerLabel 缺时透传 undefined', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0, triggerMode: 0 }
    expect(npcFromEventObject(eo).triggerLabel).toBeUndefined()
  })
})
