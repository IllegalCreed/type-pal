/**
 * TEST-GLM-GAME-EVENT-STATE-OPCODES-1 — 事件解释器状态业务合同(GLM state-opcodes r1)。
 *
 * 范围:`event-system.ts` 状态/位置/走位/场景/持久写回业务轴中,经全量 coverage 并集
 * (game 全套件 × v8 statement 级,证据见本卡 evidence/coverage-probe)证实零旧证的臂:
 *   - partyWalkTo 到达/零距离/清 pose 三臂(trigger 侧走位从未跑到到达,旧测只起步);
 *   - loadScene 同场景 guard 跳过臂;
 *   - runEnterScript 结构化 goto 命中/缺失两臂(旧测只证 0x08/0x01 收尾与 raw 条件跳转);
 *   - 0x4C 阻挡追击菱形回弹基准 i+j*2>=48 子臂(旧测只证无障碍/浮空/驱魔香);
 *   - 0x90 rgObject 稀疏写回越界零填充扩展臂。
 * 公开 caller:tickEventSystem / runEnterScript(导出函数);fixture 全部合法 typed
 * Command + createInitialGameState 公开状态字段(与旧测同法),不读私有 cursor 内部、
 * 不 mock 业务核心(setObstacleChecker/setSceneLoader 是产品注入 setter,旧测同用法)。
 * 反控针 8 个,一一对应本文件 8 合同,见 evidence/mutation-points.json。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  OP_ADD_CASH,
  OP_MONSTER_CHASE,
  OP_PARTY_WALK_TO,
  OP_PARTY_WALK_TO_4,
  OP_SET_OBJECT_SCRIPT,
  OP_SET_PARTY_DIRECTION,
  OP_SET_PARTY_POS,
  runEnterScript,
  setObstacleChecker,
  setSceneLoader,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum }
}

function loadEvent(gs: GameState, commands: Command[], startIp = 0): void {
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: startIp }
  gs.mode = 'event'
}

/** 取已 loadEvent 的 cursor(测试 setup 后必非空);用 expect narrow 避免非空断言(旧测同法)。 */
function cursorOf(gs: GameState) {
  const cursor = gs.eventCursor
  expect(cursor).toBeDefined()
  return cursor as NonNullable<typeof cursor>
}

describe('event-system 状态 opcode 合同(GLM state-opcodes r1)', () => {
  it('0x7A partyWalkTo 多步走位到达:snap 到目标 + 站立帧 + DL26 相位复位,同 tick 续跑下一条 opcode(script.c:199/scene.c:773-774)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 预铺 5 条 trail(合法 rgTrail 满员形态),走位 unshift 后必须持续收口在 5(scene.c:823-830)
    gs.trail = [0, 1, 2, 3, 4].map((i) => ({ x: 0, y: -16 * (i + 1), dir: 'down' as const }))
    const bus = createCommandBus()
    // 目标 (col1,row1,h0) = (32,16);0x7A speed4 每 tick (+8,+4),第 4 tick |dx|=8<=8 / |dy|=4<=4 → snap 到达
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [1, 1, 0] },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
      { op: 'end' },
    ])
    for (let t = 0; t < 3; t++) {
      tickEventSystem(gs, snap(), bus)
      expect(gs.walkingFrame.walking).toBe(true) // 行进中 PAL_UpdatePartyGestures(TRUE)
    }
    tickEventSystem(gs, snap(), bus) // 第 4 tick:到达
    expect(gs.party.x).toBe(32)
    expect(gs.party.y).toBe(16)
    expect(gs.walkingFrame.walking).toBe(false) // UpdatePartyGestures(FALSE) — 站立
    // DL26:stepFrame 走 1→2→3→0 后按 `&2 ^2` 复位为 2(下段走路左右脚与 C 同拍)
    expect(gs.walkingFrame.stepFrame).toBe(2)
    expect(gs.trail.length).toBe(5) // 满员 trail 收口不超 5
    expect(gs.dwCash).toBe(100) // 到达同 tick 续跑下一条 opcode(break 回主 while)
  })

  it('0x7A 走位首步清 0x15 scripted pose(UpdatePartyGestures(TRUE) 覆写 rgParty[*].wFrame,script.c:185-188)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 0x15 [dir=up, frameOffset=1, member=1] → partyScriptedFrame[1] = 2*3+1 = 7;随后走位一步
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 1, 1] },
      { op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [1, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(8) // 走出一步(dx=32 → +8)
    expect(gs.walkingFrame.walking).toBe(true)
    // 走路覆写 wFrame:0x15 的 pose 被清,静止后不得恢复旧 pose(present 择帧依据)
    expect(gs.partyScriptedFrame).toEqual({})
  })

  it('0x70 零距离走位:立即到达且零副作用(不重写 facing/不污染 trail/不清 pose)(script.c:2125-2130)', () => {
    const gs = createInitialGameState({ x: 32, y: 16, facing: 'down' })
    gs.trail = [{ x: 32, y: 16, dir: 'down' }]
    gs.partyScriptedFrame = { 0: 7 } // 0x15 设的剧情 pose 必须保留
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PARTY_WALK_TO, operands: [1, 1, 0] }, // 目标 = 当前位
      { op: 'raw', opcode: OP_ADD_CASH, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 单 tick:零距离立即到达 + 续跑 0x1E + end
    expect(gs.dwCash).toBe(50)
    expect(gs.party.x).toBe(32)
    expect(gs.party.y).toBe(16)
    expect(gs.party.facing).toBe('down') // 不走常规分支重算朝向
    expect(gs.trail.length).toBe(1) // 不 unshift 污染 trail
    expect(gs.partyScriptedFrame).toEqual({ 0: 7 }) // 不清 pose
    expect(gs.walkingFrame.walking).toBe(false)
    expect(gs.walkingFrame.stepFrame).toBe(2) // DL26 相位复位照常
  })

  it('loadScene 同场景 guard:不 reload 不置 pendingSceneLoad/sceneLoading,脚本续跑(script.c:1870-1885)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    // SceneLoaderFn 契约返回 Promise(bootstrap 注入异步 loader;triggerPendingSceneLoad 消费 .catch)
    const loader = vi.fn(() => Promise.resolve())
    setSceneLoader(loader)
    try {
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 5 }, // 与当前场景相同 → 冗余 reload 被 guard 跳过
        { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.pendingSceneLoad).toBeUndefined() // 不进 reload 流程
      expect(gs.sceneLoading).toBeUndefined() // 不置冻屏(初值 undefined;reload 分支会置 true)
      expect(gs.wNumScene).toBe(5)
      expect(gs.dwCash).toBe(100) // 仅推进,续跑下一条
      expect(loader).not.toHaveBeenCalled() // 脚本 end 的 triggerPendingSceneLoad 无目标可触发
    } finally {
      setSceneLoader(null)
    }
  })

  it('runEnterScript goto 命中:跳到 label 续跑,跳过段 opcode 不执行(与 trigger/auto 同一 labelMap 契约)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
      { op: 'goto', to: 'L_3' },
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] }, // 跳过段:不得执行
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 2, 0], label: 'L_3' },
      { op: 'end' },
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0)
    expect(gs.dwCash).toBe(100) // 只有 ip0 生效
    expect(gs.party.x).toBe(64) // 2*32 + 0*16(label 目标执行)
    expect(gs.party.y).toBe(32) // 2*16 + 0*8
  })

  it('runEnterScript goto 缺失:warn + fail-stop,后续 opcode 不执行(不抛错不自旋)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: OP_ADD_CASH, operands: [100, 0, 0] },
      { op: 'goto', to: 'L_MISSING' }, // 不在 labelMap → 终止
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 2, 0] },
      { op: 'end' },
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0)
    expect(gs.dwCash).toBe(100) // goto 前的 opcode 已生效
    expect(gs.party.x).toBe(0) // goto 后的 opcode 不执行
    expect(gs.party.y).toBe(0)
  })

  it('0x4C 阻挡追击:i+j*2>=48 菱形子格回弹基准双进位(prevx/prevy 各 +1 tile,script.c:356-388)', () => {
    setObstacleChecker(() => true) // 全阻挡:走位被弹回菱形 snap 基准(产品注入 setter,旧测同法)
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      // npc (348,330):i=348%32=28, j=330%16=10 → i+j*2=48 >= 48 → 子格基准 = (floor+1)*tile 双进位
      gs.npcs = [{ id: 4, x: 348, y: 330, spriteNum: 1, facing: 'up' }]
      gs.party.x = 300 // x=-48, y=-30(均非 0,不触发随机方向;|x|+2|y|=108 < 8*32*1 在追击范围)
      gs.party.y = 300
      gs.wChaseRange = 1
      loadEvent(gs, [{ op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] }, { op: 'end' }])
      cursorOf(gs).currentEventObjectId = 4
      tickEventSystem(gs, snap(), bus)
      // 回弹基准 = ((10+1)*32, (20+1)*16) = (352,336);四向微调全阻挡逐个回弹,末步 speed=0 不位移
      expect(gs.npcs[0]?.x).toBe(352)
      expect(gs.npcs[0]?.y).toBe(336)
    } finally {
      setObstacleChecker(null)
    }
  })

  it('0x90 setObjectScript 稀疏写回:rgwData 不足长度零填充扩展后落值(script.c:2605-2611)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 新建 entry 零填充 7 槽;idx = 2+7 = 9 越界 → 扩展槽 [7]/[8] 必须是 0(C rgwData 定长零初始化语义)
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_SCRIPT, operands: [42, 777, 7] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    const row = gs.rgObject[42]?.rgwData
    expect(row?.length).toBe(10)
    expect(row?.[7]).toBe(0)
    expect(row?.[8]).toBe(0)
    expect(row?.[9]).toBe(777)
  })
})
