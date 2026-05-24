import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey, Palette } from '@type-pal/shared'
import {
  tickEventSystem, buildLabelMap, runScript, setFetchPalette,
  setSharedEvents, setStartBattleHandler,
  OP_START_BATTLE, OP_SET_BATTLE_FIELD,
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
    expect(gs.dialogBox?.text).toBe('你好')
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(bus.drain()[0]?.cmd.op).toBe('showDialogBox')
  })

  it('waiting=dialog + Confirm 释放 → ip++ + 继续到 end → mode=explore', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 进入 waiting
    tickEventSystem(gs, snap(['Confirm']), bus) // 释放 + 继续到 end
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
    expect(gs.dialogBox?.text).toBe('in shared')
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
    expect(gs.wNumBattleField).toBeUndefined()

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
