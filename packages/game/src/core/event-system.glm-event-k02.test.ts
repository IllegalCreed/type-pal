/**
 * TEST-GLM-EVENT-WAVE-K-1 · K02 autoScript、onEnter 与跨帧等待
 *
 * 审计行(组 K02):
 * - 现行 caller:mode.ts:63/91(tickAutoScripts 门控 + tickEventSystem 派发)、bootstrap 同步
 *   runEnterScript(skip-intro / 无 partyStart)、event-system.ts:1208(tickAutoScripts)、
 *   :1471(tickEventSystem)、:5035(runEnterScript)。
 * - 旧测证据(排重):
 *   - auto 0x0002 reset:event-system.test.ts:3409(循环回 resetTo,**idleFrames:0** 恒跳分支)、
 *     :3529(resetTo 无 label → 停)→ **idleFrames>0 计数/满次 fall-through 零断言**。
 *   - onEnter 持久化::4226(0x01 advance)、:4246(0x00 plain)、:4268/:4288(0x08 checkpoint,
 *     异步/同步)→ **0x02 reset 收尾(异步 tick 路径与 runEnterScript 同步路径)零断言**。
 *   - 0x09 wait::1524/[3,0,0]、:1540([0,0,0])→ **operand[2]!=0 的等待期站立帧复位(DL16)零断言**。
 * - 一手真值:reference/sdlpal/script.c PAL_RunAutoScript case 0x0002(`op1==0 ||
 *   ++wScriptIdleFrameCountAuto < op1 → wScriptEntry=op0;否则清零 + wScriptEntry++`);
 *   PAL_RunTriggerScript case 0x0002(script.c:3218-3237)返回值由 play.c:64 写回
 *   rgScene[i].wScriptOnEnter;script.c:3354-3367(opcode 0x09:operand[2] → 每帧
 *   PAL_UpdatePartyGestures(FALSE))+ scene.c:773-774(`wFrame &= 2 ^= 2` 相位复位)。
 * - 缺口结论:上述四条合同(auto idleFrames 计数、onEnter reset 异步/同步、0x09 op2 站立复位)
 *   可达且无旧证 → 新增;auto 0x00/0x01/goto/0x06/0x04、onEnter advance/plain/checkpoint 已证不重做。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  OP_NOOP_A7,
  OP_WAIT_FRAMES,
  runEnterScript,
  setGlobalEvents,
  tickAutoScripts,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

/** 以 onEnter 上下文装 cursor(异步 tick 路径)。 */
function loadOnEnter(gs: GameState, commands: Command[], ip: number, sceneId: number): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip,
    onEnterSceneId: sceneId,
    onEnterStartIp: ip,
  }
  gs.mode = 'event'
}

describe('K02 autoScript 0x0002 reset 带 idleFrames:计数跳 resetTo,满次 fall-through(sdlpal PAL_RunAutoScript case 0x0002)', () => {
  it('idleFrames=3:前 2 tick 停在 resetTo(L_0),第 3 tick 计数满推进到 ip1 并 park,之后不再动', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 待机循环:[0x0002 reset → L_0, idleFrames=3] → 计满后落到 ip1(0x0000 plain park)
    const commands: Command[] = [
      { op: 'end', reset: true, resetTo: 0, idleFrames: 3, label: 'L_0' },
      { op: 'end' },
    ]
    gs.npcs = [{ id: 9, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    try {
      setGlobalEvents(commands) // P2#5:autoCursor.ip 默认读全局数组
      const tick = (): number | undefined => {
        tickAutoScripts(gs)
        return gs.npcs[0]?.autoCursor?.ip
      }
      // tick1/tick2:count 1,2 < 3 → 跳回 resetTo(ip0)
      expect(tick()).toBe(0)
      expect(tick()).toBe(0)
      // tick3:count 3 ≥ 3 → 计数清零 + ip++ → 落到 ip1(fall-through,不再跳回)
      expect(tick()).toBe(1)
      // tick4+:ip1 是 0x0000 plain → park(ip 不变,每帧重读 no-op)
      expect(tick()).toBe(1)
      expect(tick()).toBe(1)
      expect(gs.npcs[0]?.autoCursor).toBeDefined() // 全程未中断(park 不是停)
    } finally {
      setGlobalEvents([])
    }
  })
})

describe('K02 onEnter 0x02 reset 收尾 → sceneOnEnterIp 持久化 resetTo(play.c:64 写回)', () => {
  const commands: Command[] = [
    { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip0:演出(重进不该再跑)
    { op: 'end', reset: true, resetTo: 4 }, // ip1:0x02 收尾
    { op: 'end' }, // ip2 占位
    { op: 'end' }, // ip3 占位
    { op: 'end', label: 'L_4' }, // ip4:重臂点(重进从此跑)
  ]

  it('异步 tick 路径:onEnter cursor 撞 0x02 end → sceneOnEnterIp[sceneId]=4(非起始 0、非 advance ip+1=2)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadOnEnter(gs, commands, 0, 7)
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.eventCursor).toBeUndefined() // onEnter 结束
    expect(gs.mode).toBe('explore')
    // 单值 4 同时排除 plain(=起始 ip 0)与 advance(=ip+1=2)两臂
    expect(gs.sceneOnEnterIp[7]).toBe(4)
  })

  it('同步 runEnterScript 路径(skip-intro):0x02 end → 同样写回 resetTo=4', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    runEnterScript(gs, commands, buildLabelMap(commands), 0, 9)
    expect(gs.sceneOnEnterIp[9]).toBe(4)
  })
})

describe('K02 opcode 0x09 wait 带 operand[2]:等待期全队切站立帧 + 相位复位(sdlpal script.c:3360-3363 + scene.c:773-774)', () => {
  it('op2=1:进入等待后的第一个 wait tick 复位 walking/stepFrame;等待耗尽后续跑', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEventWalk(gs)
    gs.walkingFrame.walking = true
    gs.walkingFrame.stepFrame = 3 // 迈步相位(奇数;复位公式 (3&2)^2 = 0)
    tickEventSystem(gs, snap(), bus) // 撞 0x09 → waiting=frame-wait,remaining=2(gesture 未动:复位在下个 wait tick)
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.walkingFrame.walking).toBe(true)
    tickEventSystem(gs, snap(), bus) // wait tick 1:DL16 复位 + remaining 2→1
    expect(gs.walkingFrame.walking).toBe(false) // PAL_UpdatePartyGestures(FALSE)
    expect(gs.walkingFrame.stepFrame).toBe(0) // (3&2)^2 相位复位
    tickEventSystem(gs, snap(), bus) // wait tick 2:remaining 1→0 → ip++ 续跑
    expect(gs.mode).toBe('explore') // 跑完 end 收尾
  })

  it('单轴负控 op2=0:同一等待只倒数,walking/stepFrame 不被复位(sdlpal operand[2]=0 不调 UpdatePartyGestures)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEventWalk(gs, 0)
    gs.walkingFrame.walking = true
    gs.walkingFrame.stepFrame = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    tickEventSystem(gs, snap(), bus)
    expect(gs.walkingFrame.walking).toBe(true) // 未复位
    expect(gs.walkingFrame.stepFrame).toBe(3) // 相位原样
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })

  function loadEventWalk(gs: GameState, gestureFlag = 1): void {
    const commands: Command[] = [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [2, 0, gestureFlag] }, // ip0
      { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip1
      { op: 'end' }, // ip2
    ]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    gs.mode = 'event'
  }
})
