import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey, Palette } from '@type-pal/shared'
import {
  tickEventSystem, buildLabelMap, runScript, setFetchPalette,
  setSharedEvents, setStartBattleHandler,
  OP_START_BATTLE, OP_SET_BATTLE_FIELD,
  OP_SET_PARTY_DIRECTION,
  OP_WAIT_FRAMES, OP_SET_OBJECT_POS,
  OP_SET_OBJECT_GESTURE, OP_SET_EVENT_OBJECT_DIR_AND_FRAME, OP_SET_EVENT_OBJECT_DIR_OR_FRAME,
  OP_NPC_WALK_ONE_STEP, OP_PLAYER_WALK_ONE_STEP,
  type BattleCtx,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'
import type { BattleState } from './battle/battle-state.js'
import { createSeedableRng } from './rng.js'

function snap(pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum }
}

function loadEvent(gs: GameState, commands: Command[], startIp = 0): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip: startIp,
  }
  gs.mode = 'event'
}

describe('buildLabelMap', () => {
  it('收集所有带 label 的命令', () => {
    const cmds: Command[] = [
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: 'a', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ]
    expect(buildLabelMap(cmds)).toEqual({ L_1: 1, L_2: 2 })
  })
})

describe('EventSystem', () => {
  it('showDialog → 设 dialogBox + waiting + emit', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.currentLineText).toBe('你好')
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(bus.drain()[0]?.cmd.op).toBe('showDialogBox')
  })

  it('waiting=dialog + Confirm 释放 → ip++ + 继续到 end → mode=explore', () => {
    // Sync.2 4 行/屏:
    //  tick 1: showDialog 入,startDialogLine,waiting=dialog
    //  tick 2 (Confirm): tickDialog typing 中 → Confirm skip-typing → line-done → 自动 ip++ → end → 有行 → setWaitingEndKey
    //  tick 3 (Confirm): waiting-end-key → Confirm dialog-end → 清 dialogBox + waiting=undef → end → mode=explore
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
  })

  it('setDialogStyle 累积到 currentDialogStyle', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop' },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('top')
    expect(gs.dialogBox?.style).toBe('top')
  })

  it('setDialogStyleTop 带 arg0 (iNumCharFace) + arg1 (bFontColor) → 写入 gs.currentDialogPortraitIcon/FontColor', () => {
    // sdlpal script.c:3404 PAL_StartDialog(kDialogUpper, op[1], op[0], ...)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55, arg1: 12 },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBe(55)
    expect(gs.currentDialogFontColor).toBe(12)
    expect(gs.dialogBox?.portraitIcon).toBe(55)
    expect(gs.dialogBox?.fontColor).toBe(12)
  })

  it('setDialogStyleCenter arg0 = fontColor(不是 portraitIcon — sdlpal Center 不画头像)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleCenter', arg0: 22 },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    expect(gs.currentDialogFontColor).toBe(22)
  })

  it('setDialogStyleX 在已有 dialog 时触发 PAL_ClearDialog(TRUE)— wait Confirm + apply pending', () => {
    // sdlpal script.c:3389-3426 真值:每 setDialogStyleX 入口先 PAL_ClearDialog(TRUE)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleBottom', arg0: 5, arg1: 10 },   // NPC head
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'setDialogStyleTop', arg0: 55, arg1: 12 },     // 主角 head — 应触发 ClearDialog wait
      { op: 'showDialog', messageIndex: 0, text: 'B' },
      { op: 'end' },
    ])
    // tick 1: setDialogStyleBottom 直接 apply(无 prev dialog) + showDialog 入 dialogBox = 'A' typing
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('bottom')
    expect(gs.currentDialogPortraitIcon).toBe(5)
    expect(gs.dialogBox?.currentLineText).toBe('A')
    // tick 2 Confirm: skip-typing → line-done → 自动 ip++ → setDialogStyleTop → applySetDialogStyle 检测 prev dialog
    // → setWaitingPageKey + pendingStyle = {top, 55, 12} + waiting='dialog' return
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.dialogBox?.pendingStyle).toEqual({ style: 'top', portraitIcon: 55, fontColor: 12 })
    expect(gs.currentDialogStyle).toBe('bottom')  // 还未 apply
    // tick 3 Confirm: page-advance → 读 pendingStyle apply → 清 dialogBox + ip++ → 下条 showDialog 重建
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogStyle).toBe('top')
    expect(gs.currentDialogPortraitIcon).toBe(55)
    expect(gs.currentDialogFontColor).toBe(12)
    expect(gs.dialogBox?.currentLineText).toBe('B')   // showDialog 已 startDialogLine
    expect(gs.dialogBox?.style).toBe('top')
    expect(gs.dialogBox?.portraitIcon).toBe(55)
  })

  it('raw 命令 skip + console.debug + ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: 16, operands: [36, 24, 0] },
      { op: 'raw', opcode: 73, operands: [4, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore') // 一帧内连跑完
    expect(debugSpy).toHaveBeenCalledTimes(2)
    debugSpy.mockRestore()
  })

  it('goto 跳转', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'target' },
      { op: 'raw', opcode: 0, operands: [0, 0, 0] }, // 不应执行
      { op: 'end', label: 'target' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })

  it('单 tick > 256 条 → 抛错防死循环', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const cmds: Command[] = []
    for (let i = 0; i < 1000; i++) cmds.push({ op: 'raw', opcode: 0, operands: [0, 0, 0] })
    loadEvent(gs, cmds)
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() => tickEventSystem(gs, snap(), bus)).toThrow(/single-tick instruction limit/)
    debugSpy.mockRestore()
  })
})

/** 最小 BattleState fixture(T17 runScript 测试用;无需真实 enemy/player 数据)。 */
function makeMinimalBattleCtx(): BattleCtx {
  const state: BattleState = {
    players: [],
    enemies: [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'preBattle',
    turn: 0,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
  return { state, caster: { type: 'player', idx: 0 } }
}

describe('runScript (M3 T17, battle mode)', () => {
  it('runtimeMode=explore 不传 battleCtx 时 end 立即返回,不修改 GameState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const before = JSON.stringify(gs)
    const bus = createCommandBus()
    runScript({
      commands: [{ op: 'end' }],
      ip: 0,
      bus,
      runtimeMode: 'explore',
    })
    expect(JSON.stringify(gs)).toBe(before) // GameState 完全不动
    expect(bus.drain()).toEqual([])
  })

  it('runtimeMode=battle + showDialog → emit showBattleMessage(不阻塞,继续到 end)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const before = JSON.stringify(gs)
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'showDialog', messageIndex: 0, text: '受到攻击' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    const drained = bus.drain()
    expect(drained).toHaveLength(1)
    expect(drained[0]?.cmd).toEqual({ op: 'showBattleMessage', text: '受到攻击' })
    // 不改 GameState(不变量)
    expect(JSON.stringify(gs)).toBe(before)
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
  })

  it('runtimeMode=battle + raw → console.debug 含 [event-system battle] 前缀 + ip++', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'raw', opcode: 0x42, operands: [1, 2, 3] },
        { op: 'raw', opcode: 0x99, operands: [0, 0, 0] },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    expect(debugSpy).toHaveBeenCalledTimes(2)
    // 前缀含 battle 标记,方便 T20/T21 grep
    const firstCall = debugSpy.mock.calls[0]?.[0] as string
    expect(firstCall).toMatch(/\[event-system battle\]/)
    expect(firstCall).toMatch(/opcode=66/) // 0x42 = 66
    debugSpy.mockRestore()
  })

  it('runtimeMode=battle 缺 battleCtx 抛错', () => {
    const bus = createCommandBus()
    expect(() =>
      runScript({
        commands: [{ op: 'end' }],
        ip: 0,
        bus,
        runtimeMode: 'battle',
      }),
    ).toThrow(/battleCtx/)
  })

  it('runtimeMode=explore 误传 battleCtx 抛错', () => {
    const bus = createCommandBus()
    expect(() =>
      runScript({
        commands: [{ op: 'end' }],
        ip: 0,
        bus,
        runtimeMode: 'explore',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).toThrow(/explore/)
  })

  it('goto 跳转在 battle mode 仍生效', () => {
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'goto', to: 'target' },
        { op: 'raw', opcode: 0, operands: [0, 0, 0] }, // 不应执行
        { op: 'end', label: 'target' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    expect(bus.drain()).toEqual([]) // 没 emit 任何东西(raw 被跳过)
  })

  it('battle mode 下 setDialogStyle* 视为 no-op skip,不改 GameState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const beforeStyle = gs.currentDialogStyle
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'setDialogStyleTop' },
        { op: 'setDialogStyleBottom' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    // GameState.currentDialogStyle 完全不动(不变量)
    expect(gs.currentDialogStyle).toBe(beforeStyle)
  })

  it('死循环防御:battle mode raw 链 > 256 条抛错', () => {
    const bus = createCommandBus()
    const cmds: Command[] = []
    for (let i = 0; i < 1000; i++) cmds.push({ op: 'raw', opcode: 0, operands: [0, 0, 0] })
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() =>
      runScript({
        commands: cmds,
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).toThrow(/single-tick instruction limit/)
    debugSpy.mockRestore()
  })
})

describe('loadScene opcode handler stub(M3.5 T10 / B 路线)', () => {
  it('explore mode 撞 loadScene → no-op + console.debug + ip++ 不抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'loadScene', sceneId: 42 },
      { op: 'end' },
    ])
    // 不抛错(stub no-op)
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    // 一帧内 loadScene + end 连跑完 → mode=explore
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    // console.debug 被调用,信息含 loadScene + sceneId
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('loadScene')
    expect(msg).toContain('42')
    debugSpy.mockRestore()
  })

  it('battle mode 同样 stub(D26 跨 mode 一致):no-op + console.debug + ip++', () => {
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() =>
      runScript({
        commands: [
          { op: 'loadScene', sceneId: 7 },
          { op: 'end' },
        ],
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).not.toThrow()
    // stub 是 no-op,不 emit 任何 bus 命令
    expect(bus.drain()).toEqual([])
    // console.debug 被调用,信息含 loadScene + sceneId + battle 前缀(D26 跨 mode 一致)
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('loadScene')
    expect(msg).toContain('7')
    expect(msg).toMatch(/\[event-system battle\]/)
    debugSpy.mockRestore()
  })
})

describe('setPalette opcode handler(M4 P3.T2)', () => {
  const fakePalette: Palette = { colors: Array(256).fill([0, 0, 0]) as [number, number, number][], cycles: [] }

  it('explore mode: fetchPalette 被调用,gs.palette 异步更新', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const mockFetch = vi.fn().mockResolvedValue(fakePalette)
    setFetchPalette(mockFetch)

    loadEvent(gs, [
      { op: 'setPalette', paletteIndex: 3 },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    // tickEventSystem は同期で ip++ して end まで走る → mode=explore
    expect(gs.mode).toBe('explore')
    // fetchPalette が paletteIndex=3 で呼ばれていること
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledWith(3)

    // Promise が resolve するのを待つ
    await vi.waitFor(() => expect(gs.palette).toBe(fakePalette))
  })

  it('explore mode: fetchPalette 未注入 → console.debug + ip++ 不抛错', () => {
    // reset injection to null so handler takes the "未注入" branch
    setFetchPalette(null)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    loadEvent(gs, [
      { op: 'setPalette', paletteIndex: 5 },
      { op: 'end' },
    ])

    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore')
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('setPalette')
    expect(msg).toContain('5')
    debugSpy.mockRestore()
    // cleanup: restore a no-op fetchPalette so other tests aren't affected
    setFetchPalette(() => Promise.resolve(fakePalette))
  })

  it('battle mode(runScript): setPalette → no-op skip + console.debug + ip++', () => {
    setFetchPalette(() => Promise.resolve(fakePalette))
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    expect(() =>
      runScript({
        commands: [
          { op: 'setPalette', paletteIndex: 2 },
          { op: 'end' },
        ],
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).not.toThrow()

    expect(bus.drain()).toEqual([])
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('setPalette')
    expect(msg).toContain('2')
    expect(msg).toMatch(/\[event-system battle\]/)
    debugSpy.mockRestore()
  })
})

// ── P0.e: opcode 7 startBattle handler 注入 ──────────────────────────────────
describe('opcode 7 startBattle(P0.e — sdlpal script.c:3318 PAL_StartBattle)', () => {
  it('raw#7 → 调 startBattle handler + 清 eventCursor + mode 切 battle', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: handlerGs }: { gs: GameState }) => {
      handlerGs.mode = 'battle'
    })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [15, 41075, 41073] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 15,
      isBoss: false,
    })
    expect(gs.mode).toBe('battle')
    expect(gs.eventCursor).toBeUndefined()
    setStartBattleHandler(null)
  })

  it('operand[2]=0 → isBoss=true(sdlpal !operand[2])', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: g }: { gs: GameState }) => { g.mode = 'battle' })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [5, 0, 0] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 5,
      isBoss: true,
    })
    setStartBattleHandler(null)
  })

  it('handler 未注入 → warn + 清 cursor 但不抛错(P0.e 简化版安全网)', () => {
    setStartBattleHandler(null)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [7, 0, 0] },
      { op: 'end' },
    ])

    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    expect(gs.eventCursor).toBeUndefined()
    warnSpy.mockRestore()
  })

  it('具名 op:startBattle → 同 raw#7 走 handler 路径', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: g }: { gs: GameState }) => { g.mode = 'battle' })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'startBattle', enemyTeamId: 9, operands: [9, 0, 1234] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 9,
      isBoss: false,
    })
    expect(gs.mode).toBe('battle')
    expect(gs.eventCursor).toBeUndefined()
    setStartBattleHandler(null)
  })
})

// ── P0.e: goto "shared#L_xxx" 跨 scene 共享脚本支持 ──────────────────────────
describe('goto shared#L_xxx(P0.e — events/shared.json 跨 scene 共享脚本)', () => {
  it('goto shared#L_X → cursor 切到 shared commands + 找对 label', () => {
    const sharedCommands: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: 'in shared', label: 'L_S1' },
      { op: 'end' },
    ]
    const sharedLabelMap = buildLabelMap(sharedCommands)
    setSharedEvents(sharedCommands, sharedLabelMap)

    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'shared#L_S1' },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(gs.eventCursor?.commands).toBe(sharedCommands)
    expect(gs.eventCursor?.labelMap).toBe(sharedLabelMap)
    expect(gs.dialogBox?.currentLineText).toBe('in shared')
    setSharedEvents([], {})
  })

  it('shared label 不存在 → 抛错指明 sharedLabelMap', () => {
    setSharedEvents([], {})
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'shared#L_DOES_NOT_EXIST' },
      { op: 'end' },
    ])

    expect(() => tickEventSystem(gs, snap(), bus)).toThrow(/shared goto label/)
  })

  it('普通 goto(无 shared# 前缀)走 cursor.labelMap 原路径', () => {
    setSharedEvents([], {})
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'L_LOCAL' },
      { op: 'showDialog', messageIndex: 0, text: 'wrong path' },
      { op: 'end', label: 'L_LOCAL' },
    ])

    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
  })

  it('shared script 内 end → mode 回 explore + 清 cursor', () => {
    const sharedCommands: Command[] = [
      { op: 'end', label: 'L_S_END' },
    ]
    const sharedLabelMap = buildLabelMap(sharedCommands)
    setSharedEvents(sharedCommands, sharedLabelMap)

    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'shared#L_S_END' },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    setSharedEvents([], {})
  })
})

// ── P0.e: opcode 0x4A setBattlefield 写 gs.wNumBattleField ────────────────────
describe('opcode 0x4A setBattlefield(P0.e — sdlpal script.c:1719)', () => {
  it('raw#0x4A → gs.wNumBattleField = operand[0]', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    expect(gs.wNumBattleField).toBe(0) // M5 Sync.1: 改为 required 字段, 初始值 0

    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)

    expect(gs.wNumBattleField).toBe(10)
    expect(gs.mode).toBe('explore')
  })

  it('多次 setBattlefield → 写入最后一次值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [5, 0, 0] },
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumBattleField).toBe(10)
  })
})

// ── Sync.2 fix3: 5 个 cutscene opcode(scene 1 onEnter 高频用) ──────────────

describe('opcode 0x0009 wait N frames(sdlpal script.c:3593-3604)', () => {
  it('wait 3 frames → cursor 卡 3 tick 再 ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [3, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.eventCursor?.waitFramesRemaining).toBe(3)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(1)
    tickEventSystem(gs, snap(), bus)
    // 第 3 次 waitFramesRemaining 减到 0 → clear waiting + ip++ + end → mode=explore
    expect(gs.mode).toBe('explore')
  })

  it('wait operand[0]==0 → 视作 1 帧(sdlpal 真值 fallback)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(1)
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })
})

describe('opcode 0x0013 setObjectPos(sdlpal script.c:716-722)', () => {
  it('设当前 trigger NPC 坐标 → gs.npcs[id].x/y', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 5, x: 100, y: 100, spriteNum: 1 }]
    // 手动模拟 scene-system 触发:设 currentEventObjectId
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 200, 150] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(200)
    expect(gs.npcs[0]?.y).toBe(150)
  })

  it('无 currentEventObjectId → 跳过 + warn(不抛错)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 50, 60] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(warnSpy).toHaveBeenCalled()
    expect(gs.mode).toBe('explore')
    warnSpy.mockRestore()
  })
})

describe('opcode 0x0014 setObjectGesture(sdlpal script.c:724-730)— pose 核心', () => {
  it('设 npc.scriptedFrame=operand[0] + 强制 facing=down', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, facing: 'up' }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [5, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(5)
    expect(gs.npcs[0]?.facing).toBe('down')  // sdlpal 强制 kDirSouth
  })
})

describe('opcode 0x0016 setEventObjectDirAndFrame(sdlpal script.c:741-750)', () => {
  it('operand[0]!=0 → facing=operand[1] + scriptedFrame=operand[2](fix3 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1 }]
    loadEvent(gs, [
      // operand[0]=1 触发,operand[1]=2 → up,operand[2]=8 → scriptedFrame=8
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [1, 2, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('up')
    expect(gs.npcs[0]?.scriptedFrame).toBe(8)
  })

  it('operand[0]==0 → no-op(sdlpal 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, facing: 'down', scriptedFrame: 3 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [0, 2, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')       // 未改
    expect(gs.npcs[0]?.scriptedFrame).toBe(3)     // 未改
  })
})

describe('opcode 0x000F setEventObjectDirOrFrame(sdlpal script.c:663-675)', () => {
  it('operand[0] != 0xFFFF → 设 facing;operand[1] != 0xFFFF → 设 scriptedFrame', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1 }]
    loadEvent(gs, [
      // operand[0]=3 → right (kDirEast),operand[1]=2 → frame=2
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_OR_FRAME, operands: [3, 2, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('right')
    expect(gs.npcs[0]?.scriptedFrame).toBe(2)
  })

  it('operand[0]==0xFFFF → 仅设 scriptedFrame,不改 facing', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, facing: 'left' }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_OR_FRAME, operands: [0xFFFF, 7, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('left')      // 未改
    expect(gs.npcs[0]?.scriptedFrame).toBe(7)
  })
})

describe('opcode 0x0015 setPartyDirectionAndFrame(sdlpal script.c:732-739)— fix3 真值修', () => {
  it('设 facing=op[0] + partyScriptedFrame[op[2]] = op[0]*3 + op[1]', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      // op[0]=2 (up=North), op[1]=1 (frame offset), op[2]=0 (leader)
      // 期望 wFrame = 2*3 + 1 = 7,facing=up
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.facing).toBe('up')
    expect(gs.partyScriptedFrame[0]).toBe(7)
  })

  it('member index 非 0 → 写到对应槽位', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [1, 2, 2] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyScriptedFrame[2]).toBe(1 * 3 + 2)  // dir=1 (left) * 3 + 2 = 5
    expect(gs.partyScriptedFrame[0]).toBeUndefined()
  })
})

describe('opcode 0x006C npcWalkOneStep(sdlpal script.c:2056-2063)', () => {
  it('apply operand[1]/[2] 偏移 + SHORT 真转(负值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 3, x: 100, y: 50, spriteNum: 1 }]
    loadEvent(gs, [
      // operand[1] = -8(0xFFF8 SHORT),operand[2] = +4
      { op: 'raw', opcode: OP_NPC_WALK_ONE_STEP, operands: [0, 0xFFF8, 4] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(92)
    expect(gs.npcs[0]?.y).toBe(54)
  })
})

describe('opcode 0x006E playerWalkOneStep(sdlpal script.c:2091-2113)', () => {
  it('trail unshift + party.x/y += operand[0]/[1](SHORT)+ wLayer 设', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'right' })
    const bus = createCommandBus()
    gs.trail = [{ x: 84, y: 42, dir: 'right' }]
    loadEvent(gs, [
      // operand[0] = 16(向右),operand[1] = 8,operand[2] = 1 → wLayer = 8
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [16, 8, 1] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(116)
    expect(gs.party.y).toBe(58)
    expect(gs.wLayer).toBe(8)
    // trail 头部应是原 party 位置(100, 50, right)
    expect(gs.trail[0]).toEqual({ x: 100, y: 50, dir: 'right' })
    expect(gs.trail).toHaveLength(2)  // unshift 后 [新, 旧]
  })

  it('trail 已 5 项 → unshift 后截至长度 5', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.trail = Array.from({ length: 5 }, (_, i) => ({ x: i, y: i, dir: 'down' as const }))
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 8, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.trail).toHaveLength(5)
    expect(gs.trail[0]).toEqual({ x: 100, y: 50, dir: 'down' })
  })

  it('operand[0]==0 && operand[1]==0 → 不推 stepFrame(sdlpal 真值)', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.walkingFrame = { stepFrame: 2, walking: false }
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.walkingFrame.stepFrame).toBe(2)
    expect(gs.walkingFrame.walking).toBe(false)
  })
})
