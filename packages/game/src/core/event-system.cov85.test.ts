/**
 * TEST-COVERAGE85-GLM-GAME-1 — event-system.ts 优先区间分支合同
 * (627-728 palette fade / auto fade-in;1070-1425 autoScript runner)。
 *
 * 公开 caller:tickAutoScripts(gs) / tickSceneAutoFadeIn(gs)(mode.ts 每帧调)。
 * 全局脚本数组走公开 setGlobalEvents;NPC fixture 走 NpcState 公开字段。
 * 旧证去重:不重复 event-system.test.ts / glm-event-k01~k06 已证的 trigger 主循环、
 * 对话分页、opcode 语义与 palette-fade.test.ts 已证的 fade 步进。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  setLoadLastSaveHandler,
  tickAutoScripts,
  tickEventSystem,
  tickSceneAutoFadeIn,
} from './event-system.js'
import {
  createInitialGameState,
  type DialogBoxState,
  type EventCursor,
  type GameState,
  type NpcState,
} from './game-state.js'
import { setGlobalEvents } from './script-catalog.js'

function freshGs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

function npc(id: number, over: Partial<NpcState> = {}): NpcState {
  return { id, x: 100, y: 100, spriteNum: 1, ...over }
}

function install(cmds: Command[]): GameState {
  setGlobalEvents(cmds)
  return freshGs()
}

afterEach(() => {
  setGlobalEvents([])
  setLoadLastSaveHandler(null)
  vi.restoreAllMocks()
})

describe('cov85 tickAutoScripts 前提门(1209-1252)', () => {
  it('全局脚本数组空 → 直接返回,NPC 不动', () => {
    const gs = install([])
    gs.npcs = [npc(0, { autoCursor: { ip: 0 } })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor).toEqual({ ip: 0 })
  })

  it('sState≤0(隐藏态)与 sVanishTime≠0(临时消失)→ autoScript 不跑', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x10, operands: [0, 0, 0] }, // NPCWalkTo → tile(0,0),会动 x
      { op: 'end', label: 'L_1' },
    ]
    const gs = install(commands)
    gs.npcs = [
      npc(0, { autoCursor: { ip: 0 }, sState: -1 }),
      npc(1, { autoCursor: { ip: 0 }, sState: 1, sVanishTime: 3 }),
    ]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.x).toBe(100)
    expect(gs.npcs[1]!.x).toBe(100)
  })

  it('owner 门:triggerOwnerId 在 waiting===undefined 且脚本未开跑(startedExecution falsy)时跳 owner,其余 NPC 照跑', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x10, operands: [0, 0, 0] },
      { op: 'end', label: 'L_1' },
    ]
    const gs = install(commands)
    gs.npcs = [
      npc(0, { autoCursor: { ip: 0 }, sState: 1 }),
      npc(1, { autoCursor: { ip: 0 }, sState: 1 }),
    ]
    gs.eventCursor = {
      ip: 5,
      triggerOwnerId: 0,
      // waiting === undefined + startedExecution 缺省 → owner 跳过
    }
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.x).toBe(100) // owner 冻结
    expect(gs.npcs[1]!.x).toBeLessThan(100) // 非 owner 走了
  })

  it('owner 门豁免:startedExecution=true 或 waiting 已设 → owner autoScript 照跑', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x10, operands: [0, 0, 0] },
      { op: 'end', label: 'L_1' },
    ]
    const gs1 = install(commands)
    gs1.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    gs1.eventCursor = { ip: 5, triggerOwnerId: 0, startedExecution: true }
    tickAutoScripts(gs1)
    expect(gs1.npcs[0]!.x).toBeLessThan(100)

    const gs2 = install(commands)
    gs2.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    gs2.eventCursor = { ip: 5, triggerOwnerId: 0, waiting: 'frame-wait' }
    tickAutoScripts(gs2)
    expect(gs2.npcs[0]!.x).toBeLessThan(100)
  })

  it('无 autoCursor:按 autoLabel 延迟解析到全局 ip;解析失败(label 缺)→ 保持 undefined 不跑', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x10, operands: [0, 0, 0], label: 'L_0' },
      { op: 'end', label: 'L_1' },
    ]
    const gs = install(commands)
    gs.npcs = [
      npc(0, { autoLabel: 'L_0', sState: 1 }),
      npc(1, { autoLabel: 'L_9999', sState: 1 }),
      npc(2, { sState: 1 }), // 无 label 不动
    ]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(0) // 走一步未到 → ip 不变
    expect(gs.npcs[0]!.x).toBeLessThan(100)
    expect(gs.npcs[1]!.autoCursor).toBeUndefined()
    expect(gs.npcs[1]!.x).toBe(100)
    expect(gs.npcs[2]!.x).toBe(100)
  })
})

describe('cov85 runOneAutoOp end/goto/wait 分支(1264-1338,1340-1350)', () => {
  it('end plain:park(ip 不变,每帧重读);end advance:ip++', () => {
    const gs = install([
      { op: 'end', label: 'L_0' },
      { op: 'end', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ])
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(0) // plain park
    const gs2 = install([
      { op: 'raw', opcode: 0x09, operands: [1, 0, 0], label: 'L_10' },
      { op: 'end', label: 'L_11', advance: true },
      { op: 'end', label: 'L_12' },
    ])
    gs2.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs2) // wait 1 帧 → idleFrameCount 1 >= 1 → ip=1
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(1)
    tickAutoScripts(gs2) // end advance → ip=2
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(2)
  })

  it('end reset:idleFrames=0 恒跳 resetTo;计数满后复位+推进;resetTo 不存在 → 停', () => {
    // idleFrames=0:不累加,恒跳 resetTo(自身)→ ip 恒 0、count 恒 0
    const gs = install([
      { op: 'end', label: 'L_0', reset: true, resetTo: 0, idleFrames: 0 },
      { op: 'end', label: 'L_1' },
    ])
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    for (let i = 0; i < 3; i++) tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(0)
    expect(gs.npcs[0]!.autoCursor?.idleFrameCount).toBeUndefined()

    // idleFrames=2:第 1 次命中跳(count<2),第 2 次命中复位 + ip++
    const gs2 = install([
      { op: 'end', label: 'L_0', reset: true, resetTo: 0, idleFrames: 2 },
      { op: 'end', label: 'L_1' },
    ])
    gs2.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs2) // count 1 < 2 → 跳回 0
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(0)
    expect(gs2.npcs[0]!.autoCursor?.idleFrameCount).toBe(1)
    tickAutoScripts(gs2) // count 2 >= 2 → 复位 + ip++ = 1
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(1)
    expect(gs2.npcs[0]!.autoCursor?.idleFrameCount).toBe(0)

    // resetTo 不在全局 labelMap → autoCursor=undefined 停
    const gs3 = install([{ op: 'end', label: 'L_0', reset: true, resetTo: 999, idleFrames: 0 }])
    gs3.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs3)
    expect(gs3.npcs[0]!.autoCursor).toBeUndefined()
  })

  it('end 带 callStack:弹帧回 caller(全局 ip),restore currentEventObjectId', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x04, operands: [1, 0, 0], label: 'L_50' }, // call L_51
      { op: 'end', label: 'L_51' },
      { op: 'end', label: 'L_52' },
    ]
    const gs = install(commands)
    gs.npcs = [
      npc(0, {
        autoCursor: {
          ip: 0,
          callStack: [],
          currentEventObjectId: undefined,
        },
        sState: 1,
      }),
    ]
    tickAutoScripts(gs) // 0x04 call:压栈 + jump L_51 → 同帧消化 callee end → 弹栈
    const cur = gs.npcs[0]!.autoCursor
    expect(cur).toBeDefined()
    expect(cur?.callStack).toHaveLength(0)
    expect(cur?.ip).toBe(1) // 弹回 returnIp=1
  })

  it('goto:frameDelay=0 恒跳(同帧续跑,不消耗帧);frameDelay 计数满 fall-through;目标缺失 → 停', () => {
    // frameDelay=0:goto 循环体每帧都被执行 → 帧计数(frameNum)无关,同帧重跑
    const commands: Command[] = [
      { op: 'goto', to: 'L_60', frameDelay: 0, label: 'L_60' }, // 自环
    ]
    const gs = install(commands)
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs) // 自环超限 → 停(深度护栏)
    expect(gs.npcs[0]!.autoCursor).toBeUndefined()

    // frameDelay=2:第 1 次命中跳(count1<2),第 2 次命中 fall-through
    const commands2: Command[] = [
      { op: 'end', label: 'L_70' },
      { op: 'goto', to: 'L_70', frameDelay: 2, label: 'L_71' },
      { op: 'end', label: 'L_72' },
    ]
    const gs2 = install(commands2)
    gs2.npcs = [npc(0, { autoCursor: { ip: 1 }, sState: 1 })]
    tickAutoScripts(gs2) // count=1 < 2 → 跳 L_70(plain end park)
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(0)
    gs2.npcs[0]!.autoCursor = { ip: 1, idleFrameCount: 1 }
    tickAutoScripts(gs2) // count=2 >= 2 → 复位 + ip++ = 2
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(2)
    expect(gs2.npcs[0]!.autoCursor?.idleFrameCount).toBe(0)

    // 目标缺失
    const commands3: Command[] = [{ op: 'goto', to: 'L_9999', frameDelay: 0, label: 'L_80' }]
    const gs3 = install(commands3)
    gs3.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs3)
    expect(gs3.npcs[0]!.autoCursor).toBeUndefined()
  })

  it('0x09 wait N frames:逐帧累计,满 N 推进并复位计数', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x09, operands: [3, 0, 0], label: 'L_90' },
      { op: 'end', label: 'L_91' },
    ]
    const gs = install(commands)
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(0)
    expect(gs.npcs[0]!.autoCursor?.idleFrameCount).toBe(1)
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.idleFrameCount).toBe(2)
    tickAutoScripts(gs) // 满 3 → ip++ + 复位
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(1)
    expect(gs.npcs[0]!.autoCursor?.idleFrameCount).toBe(0)
  })

  it('ip 越界(≥cmds.length)→ autoCursor 置 undefined 停', () => {
    const gs = install([{ op: 'end', label: 'L_100' }])
    gs.npcs = [npc(0, { autoCursor: { ip: 5 }, sState: 1 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor).toBeUndefined()
  })
})

describe('cov85 runOneAutoOp 0x06 RandomLong 门(1360-1385)', () => {
  // Math.random 不可注入;用统计窗口证两臂:rate=0 恒推进,rate=101 恒跳(1..100 < 101 恒真)
  it('rate=0:每次掷 1..100 >= 0 恒推进(target=0 原地重掷 → ip 不动但帧消耗);rate 极大 + target≠0 → 同帧跳走', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x06, operands: [0, 0, 0], label: 'L_110' }, // target=0 原地重掷
      { op: 'end', label: 'L_111' },
    ]
    const gs = install(commands)
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    for (let i = 0; i < 5; i++) tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(0) // op1==0:恒原地重掷

    const commands2: Command[] = [
      { op: 'raw', opcode: 0x06, operands: [101, 1, 0], label: 'L_112' }, // 恒跳 L_113(plain park)
      { op: 'end', label: 'L_113' },
    ]
    const gs2 = install(commands2)
    gs2.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs2)
    expect(gs2.npcs[0]!.autoCursor?.ip).toBe(1) // 跳转 + 同帧 park 在 plain end
  })
})

describe('cov85 runOneAutoOp 0x10/0x11 walk 与隔帧 stagger(1416-1443)', () => {
  it('0x11 stagger gate:(id+1) 奇偶与 frameNum 不匹配的帧跳过移动,匹配帧走一步', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x11, operands: [0, 0, 0], label: 'L_120' }, // NPCWalkTo2 → tile(0,0)
      { op: 'end', label: 'L_121' },
    ]
    const gs = install(commands)
    // npc.id=0 → wEventObjectID=1(奇);frameNum=0(偶)→ 1^0=1 ≠ 0 → 走;frameNum=1 → 1^1=0 → 隔帧跳过
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    gs.frameNum = 0
    tickAutoScripts(gs)
    const xAfterEven = gs.npcs[0]!.x
    expect(xAfterEven).toBeLessThan(100)
    gs.npcs[0]!.autoCursor = { ip: 0 }
    gs.npcs[0]!.x = 100
    gs.frameNum = 1 // gate FALSE → 不动
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.x).toBe(100)
  })

  it('0x10 无 stagger 每帧都走;到达目标后 snap + ip 推进', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x10, operands: [0, 0, 0], label: 'L_130' }, // tile(0,0) 即 npc 位 → arrived
      { op: 'end', label: 'L_131' },
    ]
    const gs = install(commands)
    gs.npcs = [npc(0, { x: 0, y: 0, autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(1) // arrived → ip++
    expect(gs.npcs[0]!.x).toBe(0)
  })

  it('default 分支(showDialog 等):防御性 ip++ 跳过,不死循环', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: '不该出现在 autoScript', label: 'L_140' },
      { op: 'end', label: 'L_141' },
    ]
    const gs = install(commands)
    gs.npcs = [npc(0, { autoCursor: { ip: 0 }, sState: 1 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor?.ip).toBe(1)
  })
})

describe('cov85 tickSceneAutoFadeIn 门(700-730)', () => {
  it('explore + needToFadeIn → 起 600ms FadeIn、清 flag/blackScreenHold;fade 中/sceneLoading → 不起', () => {
    const gs = freshGs()
    gs.mode = 'explore'
    gs.needToFadeIn = true
    gs.blackScreenHold = true
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.paletteFadeState).toBeDefined()
    expect(gs.paletteFadeState?.totalMs).toBe(600)
    // fade 进行中(paletteFadeState 残留)→ 直接返回,不再起
    gs.needToFadeIn = true
    const pf = gs.paletteFadeState
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState).toBe(pf)
    // sceneLoading → 返回
    gs.paletteFadeState = undefined
    gs.sceneLoading = true
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState).toBeUndefined()
  })

  it('无 needToFadeIn → 零动作;fadeState(非 palette)进行中 → 不起', () => {
    const gs = freshGs()
    gs.mode = 'explore'
    tickSceneAutoFadeIn(gs)
    expect(gs.paletteFadeState).toBeUndefined()
    gs.needToFadeIn = true
    gs.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 0, appliedSteps: 0 }
    tickSceneAutoFadeIn(gs)
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.needToFadeIn).toBe(true)
  })

  it('event 模式:仅 frame-wait/scene-fade/camera-pan waiting 或停在 MakeScene 步时放行', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x70, operands: [10, 10, 0], label: 'L_150' }, // PartyWalkTo(MakeScene 步)
      { op: 'end', label: 'L_151' },
    ]
    setGlobalEvents(commands)
    const gs = freshGs()
    gs.mode = 'event'
    gs.needToFadeIn = true
    gs.eventCursor = { ip: 0 } // 停在 PartyWalkTo → isEventCursorAtMakeSceneStep
    tickSceneAutoFadeIn(gs)
    expect(gs.paletteFadeState).toBeDefined()

    // waiting='dialog' → 不放行
    const gs2 = freshGs()
    gs2.mode = 'event'
    gs2.needToFadeIn = true
    gs2.eventCursor = { ip: 0, waiting: 'dialog' }
    tickSceneAutoFadeIn(gs2)
    expect(gs2.paletteFadeState).toBeUndefined()

    // waiting='camera-pan' → 放行
    const gs3 = freshGs()
    gs3.mode = 'event'
    gs3.needToFadeIn = true
    gs3.eventCursor = { ip: 1, waiting: 'camera-pan' }
    tickSceneAutoFadeIn(gs3)
    expect(gs3.paletteFadeState).toBeDefined()
  })

  it('isEventCursorAtMakeSceneStep:0x7F pan(非 0 步长)算 MakeScene;非 pan(全 0/flag 0xFFFF)不算', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x7f, operands: [10, 10, 3], label: 'L_160' }, // pan
      { op: 'raw', opcode: 0x7f, operands: [0, 0, 0xffff], label: 'L_161' }, // 非 pan
      { op: 'raw', opcode: 0x7f, operands: [10, 10, 1], label: 'L_162' }, // 步长 1(<=1)非多帧
      { op: 'raw', opcode: 0x7a, operands: [10, 10, 3], label: 'L_163' }, // RideObject2
      { op: 'end', label: 'L_164' },
    ]
    setGlobalEvents(commands)
    const mk = (ip: number): GameState => {
      const gs = freshGs()
      gs.mode = 'event'
      gs.needToFadeIn = true
      gs.eventCursor = { ip }
      return gs
    }
    const pan = mk(0)
    tickSceneAutoFadeIn(pan)
    expect(pan.paletteFadeState).toBeDefined()
    const notPan = mk(1)
    tickSceneAutoFadeIn(notPan)
    expect(notPan.paletteFadeState).toBeUndefined()
    const singleStep = mk(2)
    tickSceneAutoFadeIn(singleStep)
    expect(singleStep.paletteFadeState).toBeUndefined()
    const ride = mk(3)
    tickSceneAutoFadeIn(ride)
    expect(ride.paletteFadeState).toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════════════════
// r3:tickEventSystem waiting/resume/cancel + trigger/onEnter 生命周期
// 公开 caller:tickEventSystem(gs, input, bus)(mode.ts event 模式每帧调)。
// cursor 经 gs.eventCursor 公开 typed 字段构造;时间源 performance.now 用 spy(非业务核心)。
// ══════════════════════════════════════════════════════════════════════════

function snapR3(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

const busStub = (): { emit: () => number; drain: () => []; complete: () => void } => ({
  emit: () => 0,
  drain: () => [],
  complete: () => {},
})

/** 全局脚本:waitingIp 处挂起,waitingIp+1 = 0x1E 现金 +111(fall-through oracle)。 */
function installWaitScript(waitingIp: number): GameState {
  const commands: Command[] = []
  for (let i = 0; i <= waitingIp + 2; i++) {
    if (i === waitingIp + 1) commands.push({ op: 'raw', opcode: 0x1e, operands: [111, 0, 0] })
    else commands.push({ op: 'end', label: `L_${i}` })
  }
  setGlobalEvents(commands)
  const gs = freshGs()
  gs.mode = 'event'
  gs.dwCash = 0
  return gs
}

function cursorAt(ip: number, extra: Partial<EventCursor> = {}): EventCursor {
  return { ip, ...extra }
}

describe('cov85r3 tickEventSystem waiting 家族(1480-1672)', () => {
  it('无 cursor → 直接切 explore(1473-1475)', () => {
    const gs = freshGs()
    gs.mode = 'event'
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.mode).toBe('explore')
  })

  it('frame-wait:逐帧递减 → 归零清 waiting + ip++ 续跑;waitGestureReset 复位行走帧(1480-1495)', () => {
    const gs = installWaitScript(0)
    gs.eventCursor = cursorAt(0, {
      waiting: 'frame-wait',
      waitFramesRemaining: 2,
      waitGestureReset: true,
    })
    gs.walkingFrame.walking = true
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.eventCursor?.waitFramesRemaining).toBe(1)
    expect(gs.walkingFrame.walking).toBe(false)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(111)
    expect(gs.eventCursor).toBeUndefined()
  })

  it('camera-pan:每帧 camera += (dx,dy) 递减 → 归零清字段 + ip++ 续跑(1499-1512)', () => {
    const gs = installWaitScript(1)
    gs.eventCursor = cursorAt(1, {
      waiting: 'camera-pan',
      cameraPanFramesRemaining: 2,
      cameraPanDx: 4,
      cameraPanDy: 2,
    })
    const camX0 = gs.camera.x
    const camY0 = gs.camera.y
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.camera.x).toBe(camX0 + 4)
    expect(gs.camera.y).toBe(camY0 + 2)
    expect(gs.eventCursor?.cameraPanFramesRemaining).toBe(1)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(111)
    expect(gs.eventCursor?.cameraPanDx).toBeUndefined()
  })

  it('fade-screen:未到 totalMs 阻塞;到点清 + ip++;无 fadeState 防御清 waiting(1518-1531)', () => {
    const gs = installWaitScript(0)
    const now = vi.spyOn(performance, 'now').mockReturnValue(5000)
    gs.eventCursor = cursorAt(0, { waiting: 'fade-screen' })
    gs.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 4000, appliedSteps: 0 }
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(0) // elapsed 1000 < 2160 → 阻塞
    now.mockReturnValue(6200)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.fadeState).toBeUndefined()
    expect(gs.dwCash).toBe(111)
    const gs2 = installWaitScript(0)
    gs2.eventCursor = cursorAt(1, { waiting: 'fade-screen' }) // 防御臂不推 ip → 直落 0x1E
    tickEventSystem(gs2, snapR3(), busStub())
    expect(gs2.dwCash).toBe(111)
  })

  it('palette-fade 完成路径:finalize + ip++;未到阻塞(1537-1560)', () => {
    const gs = installWaitScript(0)
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    gs.eventCursor = cursorAt(0, { waiting: 'palette-fade' })
    gs.paletteFadeState = {
      startColors: [],
      targetColors: [],
      startTimeMs: 4900,
      totalMs: 600,
      mode: 'lerp',
      steps: 6,
      increment: 4,
    }
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(0) // elapsed 100 < 600 → 阻塞
    vi.spyOn(performance, 'now').mockReturnValue(5600)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.dwCash).toBe(111)
  })

  it('palette-fade + 0x4E reloadSlotAfterFade:淡完停脚本并调 handler(1551-1556)', () => {
    const gs = installWaitScript(0)
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    const reloaded: number[] = []
    setLoadLastSaveHandler((slot) => {
      reloaded.push(slot)
    })
    gs.eventCursor = cursorAt(0, { waiting: 'palette-fade', reloadSlotAfterFade: 3 })
    gs.paletteFadeState = {
      startColors: [],
      targetColors: [],
      startTimeMs: 4900,
      totalMs: 600,
      mode: 'lerp',
      steps: 6,
      increment: 4,
    }
    tickEventSystem(gs, snapR3(), busStub())
    expect(reloaded).toEqual([])
    vi.spyOn(performance, 'now').mockReturnValue(5600)
    tickEventSystem(gs, snapR3(), busStub())
    expect(reloaded).toEqual([3])
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dwCash).toBe(0)
  })

  it('六个 modal waiting → 阻塞不步进(1574-1597)', () => {
    for (const w of [
      'shop',
      'rng-play',
      'show-fbp',
      'scroll-fbp',
      'ending-anim',
      'quit',
    ] as const) {
      const gs = installWaitScript(0)
      gs.eventCursor = cursorAt(0, { waiting: w })
      tickEventSystem(gs, snapR3(['Confirm']), busStub())
      expect(gs.dwCash).toBe(0)
      expect(gs.eventCursor?.waiting).toBe(w)
    }
  })

  it('scene-load:等 callback 替换 cursor,期间不步进;替换后续跑(1567-1569)', () => {
    const gs = installWaitScript(0)
    gs.eventCursor = cursorAt(0, { waiting: 'scene-load' })
    tickEventSystem(gs, snapR3(), busStub())
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(0)
    gs.eventCursor = cursorAt(1)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(111)
  })

  it('wait-key:无新按键/方向键阻塞;Confirm → 清 + ip++(1604-1611)', () => {
    const gs = installWaitScript(0)
    gs.eventCursor = cursorAt(0, { waiting: 'wait-key' })
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(0)
    tickEventSystem(gs, snapR3(['Down']), busStub())
    expect(gs.dwCash).toBe(0)
    tickEventSystem(gs, snapR3(['Confirm']), busStub())
    expect(gs.dwCash).toBe(111)
  })

  it('delay:未到 delayUntilMs 阻塞;到点清 + ip++(1664-1671)', () => {
    const gs = installWaitScript(0)
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    gs.eventCursor = cursorAt(0, { waiting: 'delay', delayUntilMs: 2000 })
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(0)
    now.mockReturnValue(2000)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(111)
    expect(gs.eventCursor?.delayUntilMs).toBeUndefined()
  })

  it('confirm(0x0A):方向 toggle;默认否 Confirm → goto op0;Cancel=否;是 → ip++(1620-1652)', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x0a, operands: [9, 0, 0], label: 'L_0' },
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
      { op: 'end', label: 'L_2' },
      { op: 'end', label: 'L_3' },
      { op: 'end', label: 'L_4' },
      { op: 'end', label: 'L_5' },
      { op: 'end', label: 'L_6' },
      { op: 'end', label: 'L_7' },
      { op: 'end', label: 'L_8' },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_9' },
      { op: 'end', label: 'L_10' },
    ]
    const mk = (): GameState => {
      setGlobalEvents([...commands])
      const gs = freshGs()
      gs.mode = 'event'
      gs.dwCash = 0
      gs.eventCursor = cursorAt(0, { waiting: 'confirm', confirmYes: false })
      return gs
    }
    const no = mk()
    tickEventSystem(no, snapR3(['Confirm']), busStub())
    expect(no.dwCash).toBe(222)
    const cancel = mk()
    tickEventSystem(cancel, snapR3(['Cancel']), busStub())
    expect(cancel.dwCash).toBe(222)
    const yes = mk()
    tickEventSystem(yes, snapR3(['Down']), busStub())
    expect(yes.eventCursor?.confirmYes).toBe(true)
    tickEventSystem(yes, snapR3(['Confirm']), busStub())
    expect(yes.dwCash).toBe(111)
  })

  it('waiting=dialog 无 dialogBox → 防御清 waiting 续跑(1682-1684)', () => {
    const gs = installWaitScript(0)
    gs.eventCursor = cursorAt(1, { waiting: 'dialog' }) // 防御臂不推 ip → 直落 0x1E
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.dwCash).toBe(111)
  })
})

describe('cov85r3 trigger/onEnter end 写回(1877-1960)', () => {
  function dialogBox(over: Partial<DialogBoxState> = {}): DialogBoxState {
    return {
      shownLines: [],
      currentLineText: null,
      typingFrames: 0,
      charsRevealed: 0,
      dialogLineCount: 0,
      phase: 'typing',
      style: 'top',
      fontColor: 0x4f,
      shadow: true,
      keyIconBlink: false,
      ...over,
    }
  }

  it('end + triggerOwnerId + advance → triggerResume={ip+1};plain → 不动;清场复位(1910-1944+)', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0', advance: true },
      { op: 'end', label: 'L_1', advance: true },
      { op: 'end', label: 'L_2' },
    ]
    setGlobalEvents([...commands])
    const gs = freshGs()
    gs.mode = 'event'
    gs.npcs = [npc(0)]
    gs.eventCursor = cursorAt(0, { triggerOwnerId: 0 })
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.npcs[0]!.triggerResume).toEqual({ ip: 1 })
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogPortraitLayout).toBe(false)
    gs.npcs = [npc(0, { triggerResume: { ip: 2 } })]
    gs.eventCursor = cursorAt(2, { triggerOwnerId: 0 })
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.npcs[0]!.triggerResume).toEqual({ ip: 2 })
  })

  it('end + reset:resetTo 在表 → triggerResume 落 label;idleFrames 未满 → 计数 + 续跑(1917-1937)', () => {
    {
      const commands: Command[] = [
        { op: 'end', label: 'L_0', reset: true, resetTo: 0 },
        { op: 'raw', opcode: 0x1e, operands: [55, 0, 0] },
        { op: 'end', label: 'L_2' },
      ]
      setGlobalEvents([...commands])
      const gs = freshGs()
      gs.mode = 'event'
      gs.dwCash = 0
      gs.npcs = [npc(0)]
      gs.eventCursor = cursorAt(0, { triggerOwnerId: 0 })
      tickEventSystem(gs, snapR3(), busStub())
      expect(gs.npcs[0]!.triggerResume).toEqual({ ip: 0 })
    }
    {
      // idleFrames=3:第 1/2 次 → 计数保留 + 跳 resetTo 结束(0x1E 未跑)
      const withIdle: Command[] = [
        { op: 'end', label: 'L_0', reset: true, resetTo: 0, idleFrames: 3 },
        { op: 'raw', opcode: 0x1e, operands: [55, 0, 0] },
        { op: 'end', label: 'L_2' },
      ]
      setGlobalEvents([...withIdle])
      const gs = freshGs()
      gs.mode = 'event'
      gs.dwCash = 0
      gs.npcs = [npc(0)]
      gs.eventCursor = cursorAt(0, { triggerOwnerId: 0 })
      tickEventSystem(gs, snapR3(), busStub())
      expect(gs.npcs[0]!.triggerEndIdleCount).toBe(1)
      expect(gs.npcs[0]!.triggerResume).toEqual({ ip: 0 }) // 未满 → 跳 resetTo 收尾
      expect(gs.dwCash).toBe(0)
      // 第 3 次(预置 count=2)→ 计数清 0 + cursor.ip++ 续跑本次(0x1E 执行)
      const gs3 = freshGs()
      gs3.mode = 'event'
      gs3.dwCash = 0
      gs3.npcs = [npc(0, { triggerEndIdleCount: 2 })]
      gs3.eventCursor = cursorAt(0, { triggerOwnerId: 0 })
      tickEventSystem(gs3, snapR3(), busStub())
      expect(gs3.npcs[0]!.triggerEndIdleCount).toBe(0)
      expect(gs3.dwCash).toBe(55)
    }
  })

  it('end + onEnterSceneId:advance/reset/plain 三臂写 sceneOnEnterIp + 清 sceneLoading(1896-1908)', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0', advance: true },
      { op: 'end', label: 'L_1', reset: true, resetTo: 0 },
      { op: 'end', label: 'L_2' },
    ]
    const run = (ip: number, sceneId: number, startIp: number): GameState => {
      setGlobalEvents([...commands])
      const gs = freshGs()
      gs.mode = 'event'
      gs.sceneLoading = true
      gs.eventCursor = cursorAt(ip, { onEnterSceneId: sceneId, onEnterStartIp: startIp })
      tickEventSystem(gs, snapR3(), busStub())
      return gs
    }
    expect(run(0, 7, 0).sceneOnEnterIp[7]).toBe(1)
    expect(run(1, 7, 0).sceneOnEnterIp[7]).toBe(0)
    expect(run(2, 7, 5).sceneOnEnterIp[7]).toBe(5)
  })

  it('end 前有未收尾 dialog:dialogLineCount>0 → 等 end-key;count=0 → 直接清(1877-1888)', () => {
    const commands: Command[] = [{ op: 'end', label: 'L_0' }]
    setGlobalEvents([...commands])
    const gs = freshGs()
    gs.mode = 'event'
    gs.dialogBox = dialogBox({ dialogLineCount: 2, phase: 'typing' })
    gs.eventCursor = cursorAt(0)
    tickEventSystem(gs, snapR3(), busStub())
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    const gs2 = freshGs()
    gs2.mode = 'event'
    gs2.dialogBox = dialogBox({ dialogLineCount: 0 })
    gs2.eventCursor = cursorAt(0)
    tickEventSystem(gs2, snapR3(), busStub())
    expect(gs2.dialogBox).toBeUndefined()
    expect(gs2.eventCursor).toBeUndefined()
  })

  it('narration dialog:任意键立即关 + ip++;typingFrames 满 1.4s 自动关(1685-1703)', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: '得到物品', label: 'L_0' },
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
      { op: 'end', label: 'L_2' },
    ]
    {
      setGlobalEvents([...commands])
      const gs = freshGs()
      gs.mode = 'event'
      gs.dwCash = 0
      gs.eventCursor = cursorAt(0, { waiting: 'dialog' })
      gs.dialogBox = dialogBox({
        style: 'narration',
        currentLineText: '得到物品',
        dialogLineCount: 1,
      })
      tickEventSystem(gs, snapR3(['Down']), busStub())
      expect(gs.dialogBox).toBeUndefined()
      expect(gs.dwCash).toBe(111)
    }
    {
      setGlobalEvents([...commands])
      const gs = freshGs()
      gs.mode = 'event'
      gs.dwCash = 0
      gs.eventCursor = cursorAt(0, { waiting: 'dialog' })
      gs.dialogBox = dialogBox({
        style: 'narration',
        currentLineText: '得到物品',
        dialogLineCount: 1,
        typingFrames: 84,
      })
      tickEventSystem(gs, snapR3(), busStub())
      expect(gs.dialogBox).toBeUndefined()
      expect(gs.dwCash).toBe(111)
    }
  })
})
