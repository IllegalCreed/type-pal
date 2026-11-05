import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import {
  buildLabelMap,
  OP_ADD_CASH,
  OP_MONSTER_CHASE,
  OP_PARTY_WALK_TO,
  OP_PARTY_WALK_TO_4,
  OP_SET_PARTY_DIRECTION,
  OP_SET_PARTY_POS,
  runEnterScript,
  setObstacleChecker,
  setSceneLoader,
  tickEventSystem,
} from './event-system.js'
import type { EventCursor, GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum }
}

function loadEvent(gs: GameState, commands: Command[]): EventCursor {
  const cursor: EventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  gs.eventCursor = cursor
  gs.mode = 'event'
  return cursor
}

describe('event-driven scene state', () => {
  it('a four-step walk arrives standing, bounds the trail and executes the following instruction once', () => {
    const gs = freshPlayerOpcodeState()
    // 预铺 5 条 trail(合法 rgTrail 满员形态),走位 unshift 后必须持续收口在 5(scene.c:823-830)
    gs.trail = [0, 1, 2, 3, 4].map((i) => ({ x: 0, y: -16 * (i + 1), dir: 'down' as const }))

    // 目标 (col1,row1,h0) = (32,16);0x7A speed4 每 tick (+8,+4),第 4 tick |dx|=8<=8 / |dy|=4<=4 → snap 到达
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [1, 1, 0] },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
      { op: 'end' },
    ])
    for (let t = 0; t < 3; t++) {
      tickEventSystem(gs, snap())
      expect(gs.walkingFrame.walking).toBe(true) // 行进中 PAL_UpdatePartyGestures(TRUE)
    }
    tickEventSystem(gs, snap()) // 第 4 tick:到达
    expect(gs.party.x).toBe(32)
    expect(gs.party.y).toBe(16)
    expect(gs.walkingFrame.walking).toBe(false) // UpdatePartyGestures(FALSE) — 站立
    // DL26:stepFrame 走 1→2→3→0 后按 `&2 ^2` 复位为 2(下段走路左右脚与 C 同拍)
    expect(gs.walkingFrame.stepFrame).toBe(2)
    expect(gs.trail.length).toBe(5) // 满员 trail 收口不超 5
    expect(gs.dwCash).toBe(100) // 到达同 tick 续跑下一条 opcode(break 回主 while)
  })

  it('the first walking step clears an actual scripted pose', () => {
    const gs = freshPlayerOpcodeState()

    gs.partyMembers = [0, 1]
    // 0x15 [dir=up, frameOffset=1, member=1] → partyScriptedFrame[1] = 2*3+1 = 7;随后走位一步
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 1, 1] },
      { op: 'raw', opcode: 0x09, operands: [1, 0, 0] },
      { op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [1, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap())
    expect(gs.partyScriptedFrame[1]).toBe(7) // Prove a pose exists before the walking instruction.
    expect(gs.party.x).toBe(0)
    tickEventSystem(gs, snap())
    expect(gs.party.x).toBe(8)
    expect(gs.walkingFrame.walking).toBe(true)
    // 走路覆写 wFrame:0x15 的 pose 被清,静止后不得恢复旧 pose(present 择帧依据)
    expect(gs.partyScriptedFrame).toEqual({})
  })

  it('zero-distance walk preserves facing, trail and pose while resetting the standing phase', () => {
    const gs = freshPlayerOpcodeState()
    gs.party = { x: 32, y: 16, facing: 'down' }
    gs.trail = [{ x: 32, y: 16, dir: 'down' }]
    gs.partyScriptedFrame = { 0: 7 } // 0x15 设的剧情 pose 必须保留

    loadEvent(gs, [
      { op: 'raw', opcode: OP_PARTY_WALK_TO, operands: [1, 1, 0] }, // 目标 = 当前位
      { op: 'raw', opcode: OP_ADD_CASH, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap()) // 单 tick:零距离立即到达 + 续跑 0x1E + end
    expect(gs.dwCash).toBe(50)
    expect(gs.party.x).toBe(32)
    expect(gs.party.y).toBe(16)
    expect(gs.party.facing).toBe('down') // 不走常规分支重算朝向
    expect(gs.trail).toEqual([{ x: 32, y: 16, dir: 'down' }])
    expect(gs.partyScriptedFrame).toEqual({ 0: 7 }) // 不清 pose
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.walkingFrame.stepFrame).toBe(2) // DL26 相位复位照常
  })

  it('loading the current scene skips resource loading and continues the script', () => {
    const gs = freshPlayerOpcodeState()
    gs.wNumScene = 5
    // SceneLoaderFn 契约返回 Promise(bootstrap 注入异步 loader;triggerPendingSceneLoad 消费 .catch)
    const loader = vi.fn(() => Promise.resolve())
    setSceneLoader(loader)
    try {
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 5 }, // 与当前场景相同 → 冗余 reload 被 guard 跳过
        { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap())
      expect(gs.pendingSceneLoad).toBeUndefined() // 不进 reload 流程
      expect(gs.sceneLoading).toBeUndefined() // 不置冻屏(初值 undefined;reload 分支会置 true)
      expect(gs.wNumScene).toBe(5)
      expect(gs.mode).toBe('explore')
      expect(gs.dwCash).toBe(100) // 仅推进,续跑下一条
      expect(loader).not.toHaveBeenCalled() // 脚本 end 的 triggerPendingSceneLoad 无目标可触发
    } finally {
      setSceneLoader(null)
    }
  })

  it('synchronous scene entry follows a goto without executing the skipped cash instruction', () => {
    const gs = freshPlayerOpcodeState()
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0], label: 'L_1' },
      { op: 'goto', to: 'L_4' },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] }, // skipped branch
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 2, 0], label: 'L_4' },
      { op: 'end' },
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 1)
    expect(gs.dwCash).toBe(100) // only the pre-goto cash instruction ran
    expect(gs.party.x).toBe(64) // 2*32 + 0*16(label 目标执行)
    expect(gs.party.y).toBe(32) // 2*16 + 0*8
  })

  it('synchronous scene entry stops with an exact warning when the target label is missing', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warning.mockRestore())
    const gs = freshPlayerOpcodeState()
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0], label: 'L_1' },
      { op: 'goto', to: 'L_60000' }, // 不在 labelMap → 终止
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 2, 0] },
      { op: 'end' },
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 1)
    expect(gs.dwCash).toBe(100) // goto 前的 opcode 已生效
    expect(gs.party.x).toBe(0) // goto 后的 opcode 不执行
    expect(gs.party.y).toBe(0)
    expect(warning.mock.calls).toEqual([['runEnterScript: goto label L_60000 不在 labelMap']])
  })

  it('a blocked chase at the diamond boundary snaps both coordinates to the next tile', () => {
    setObstacleChecker(() => true) // 全阻挡:走位被弹回菱形 snap 基准(产品注入 setter,旧测同法)
    try {
      const gs = freshPlayerOpcodeState()

      // npc (348,330):i=348%32=28, j=330%16=10 → i+j*2=48 >= 48 → 子格基准 = (floor+1)*tile 双进位
      gs.npcs = [{ id: 4, x: 348, y: 330, spriteNum: 1, facing: 'up' }]
      gs.party.x = 300 // x=-48, y=-30(均非 0,不触发随机方向;|x|+2|y|=108 < 8*32*1 在追击范围)
      gs.party.y = 300
      gs.wChaseRange = 1
      const cursor = loadEvent(gs, [
        { op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] },
        { op: 'end' },
      ])
      cursor.currentEventObjectId = 4
      tickEventSystem(gs, snap())
      // 回弹基准 = ((10+1)*32, (20+1)*16) = (352,336);四向微调全阻挡逐个回弹,末步 speed=0 不位移
      expect(gs.npcs[0]?.x).toBe(352)
      expect(gs.npcs[0]?.y).toBe(336)
    } finally {
      setObstacleChecker(null)
    }
  })
})
