import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey, Palette } from '@type-pal/shared'
import {
  tickEventSystem, tickAutoScripts, buildLabelMap, runScript, runEnterScript, setFetchPalette,
  setSharedEvents, setStartBattleHandler,
  OP_START_BATTLE, OP_SET_BATTLE_FIELD, OP_SET_SCENE_OBJECT_STATE,
  OP_SET_PARTY_DIRECTION,
  OP_WAIT_FRAMES, OP_SET_OBJECT_POS,
  OP_SET_OBJECT_GESTURE, OP_SET_EVENT_OBJECT_DIR_AND_FRAME, OP_SET_EVENT_OBJECT_DIR_OR_FRAME,
  OP_NPC_WALK_ONE_STEP, OP_PLAYER_WALK_ONE_STEP, OP_SET_PLAYER_SPRITE,
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
    // 用两个明确未具名 opcode 走 default debug 分支(0x10 / 0x49 等已陆续实做,改用 0xC0 / 0xD0)
    loadEvent(gs, [
      { op: 'raw', opcode: 0xC0, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0xD0, operands: [0, 0, 0] },
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
  it('explore mode 撞 loadScene → no-op + console.warn + ip++ 不抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // M4 P3:无 _sceneLoader 注入时走 warn 分支(配置缺失 → warn 比 debug 更准)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'loadScene', sceneId: 42 },
      { op: 'end' },
    ])
    // 不抛错(stub no-op)
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    // 一帧内 loadScene + end 连跑完 → mode=explore
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    // console.warn 被调用,信息含 loadScene + sceneId
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = warnSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('loadScene')
    expect(msg).toContain('42')
    warnSpy.mockRestore()
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
  it('operand[0]=0xFFFF → 用 self(currentEventObjectId)+ facing=operand[1] + scriptedFrame=operand[2]', () => {
    // fix4:operand[0]=0/0xFFFF → self;operand[0]==0 在 0x16 是 silent skip,所以 self 用 0xFFFF
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [0xFFFF, 2, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('up')
    expect(gs.npcs[0]?.scriptedFrame).toBe(8)
  })

  it('operand[0] 显式 NPC id(1-based)→ 作用于 npcs.find(id==op0-1),即使 currentEventObjectId 不同', () => {
    // fix4:operand[0] = 8 → 显式找 npc.id = 7(1-based op[0] - 1 = 0-based id)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 0, x: 0, y: 0, spriteNum: 1 },
      { id: 7, x: 100, y: 0, spriteNum: 1 },
    ]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [8, 1, 5] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0   // self 是 npc 0,但 operand[0]=8 显式找 npc 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBeUndefined()       // npc 0 未改
    expect(gs.npcs[1]?.facing).toBe('left')          // npc 7 被改
    expect(gs.npcs[1]?.scriptedFrame).toBe(5)
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

  it('Sync.2 fix5:每次调 wCurrentFrameNum++ 循环 mod 4(初值 undefined → 0,然后 1/2/3/0)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 9, x: 0, y: 0, spriteNum: 628 }]
    const cmds: Array<{ op: 'raw', opcode: number, operands: [number, number, number] }> = []
    for (let i = 0; i < 5; i++) {
      cmds.push({ op: 'raw' as const, opcode: OP_NPC_WALK_ONE_STEP, operands: [0, 0, 0] })
    }
    loadEvent(gs, [...cmds, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 9
    // 单 tick 跑完 5 walkOneStep + end:scriptedFrame 应循环到 (0+1+1+1+1) mod 4 = 4 mod 4 = 0
    // (undefined → 0 → 1 → 2 → 3 → 0)
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)  // 5 次后回到 0
  })
})

describe('opcode 0x0005 redrawScreen / PAL_ClearDialog(TRUE)(sdlpal script.c:3267-3297)— fix5', () => {
  it('有 dialog → wait page key(等 Confirm 翻页 + 清屏)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)  // 起 dialog typing
    tickEventSystem(gs, snap(['Confirm']), bus) // skip-typing + line-done auto ip++ → 0x05 → wait page key
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  it('无 dialog → no-op + ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
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

describe('opcode 0x0049 setSceneObjectState(sdlpal script.c:1711-1717)— fix4', () => {
  it('operand[0]=0 → silent no-op', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0, 5, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(0)  // 未改
  })

  it('operand[0]=0xFFFF → self;operand[1] → sState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 11, x: 0, y: 0, spriteNum: 628, sState: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0xFFFF, -1 & 0xFFFF, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 11
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-1 & 0xFFFF)
  })

  it('operand[0]=explicit NPC id(1-based)→ 选别的 NPC', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 0, x: 0, y: 0, spriteNum: 1, sState: 0 },
      { id: 11, x: 0, y: 0, spriteNum: 628, sState: 0 },
    ]
    loadEvent(gs, [
      // operand[0]=12 → id=11(1-based - 1)
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [12, 3, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(0)   // 未改
    expect(gs.npcs[1]?.sState).toBe(3)
  })
})

describe('opcode 0x0065 setPlayerSprite(sdlpal script.c:1999-2004)— fix4', () => {
  it('operand[0]=0 (主角) + operand[1]=spriteId → 写 gs.partyLeaderSpriteId', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PLAYER_SPRITE, operands: [0, 18, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyLeaderSpriteId).toBe(18)
  })

  it('operand[0] != 0(非主角)→ no-op(M5 简版仅支持队长)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PLAYER_SPRITE, operands: [1, 18, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyLeaderSpriteId).toBeUndefined()
  })
})

describe('setDialogStyleX 真值 reset(每次 opcode 重设 portrait/fontColor,不 inherit)— fix6', () => {
  it('setDialogStyleTop arg0=55 → showDialog → 0x05 + Confirm → setDialogStyleBottom 无 arg0 → 主角对话不显头像', () => {
    // scene 1 真实 flow:李大娘对话(头像 55)→ ClearDialog → 李逍遥对话(无头像)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55, arg1: 0x4F },
      { op: 'showDialog', messageIndex: 0, text: '李大娘A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },   // ClearDialog
      { op: 'setDialogStyleBottom' },                   // 无 arg0 → portraitIcon undefined
      { op: 'showDialog', messageIndex: 0, text: '李逍遥B' },
      { op: 'end' },
    ])
    // tick 1: setDialogStyleTop + showDialog → dialogBox 含 portraitIcon=55
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.portraitIcon).toBe(55)
    expect(gs.currentDialogPortraitIcon).toBe(55)
    // tick 2 Confirm: skip-typing + line-done → ip++ → opcode 5 ClearDialog → wait page key
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    // tick 3 Confirm: page-advance (no pending) → keep dialogBox (empty) + ip++ → setDialogStyleBottom
    //   → 无 prev dialog 行(shownLines=[]/currentLineText=null)→ 直接 apply + clear dialogBox + ip++
    //   → showDialog → startDialogLine with portraitIcon=undefined
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('bottom')
    expect(gs.dialogBox?.portraitIcon).toBeUndefined()   // 主角对话不显头像 ✓
    expect(gs.dialogBox?.currentLineText).toBe('李逍遥B')
  })

  it('连续 setDialogStyleTop arg0=55 → arg0=63 → portrait 重设为 63(不 inherit)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55 },
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'setDialogStyleTop', arg0: 63 },
      { op: 'showDialog', messageIndex: 0, text: 'B' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogPortraitIcon).toBe(63)
    expect(gs.dialogBox?.portraitIcon).toBe(63)
  })

  it('setDialogStyleBottom arg0=1 arg1=10 → portrait=1 + fontColor=10(显式 set,不 default)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleBottom', arg0: 1, arg1: 10 },
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBe(1)
    expect(gs.currentDialogFontColor).toBe(10)
    expect(gs.dialogBox?.portraitIcon).toBe(1)
    expect(gs.dialogBox?.fontColor).toBe(10)
  })
})

// ── M5.I-w1.a: chest opcode(addCash / addItem / removeItem / playSound)──────
// sdlpal script.c:952-968 / 970-975 / 977+ / 1704-1709 真值。
describe('I-w1.a chest opcodes', () => {
  it('addCash(0x1E):正数加;u16 0xFFFF = signed -1', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1E, operands: [200, 0, 0] },
      { op: 'raw', opcode: 0x1E, operands: [0xFFFF, 0, 0] },  // signed -1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(299) // 100+200-1
  })

  it('addCash:dwCash 不足时 clamp 到 0(简版,不做 sdlpal onFail goto 分支)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 10
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1E, operands: [0xFFCE, 0, 0] },  // signed -50
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(0)
  })

  it('addItem(0x1F):空 inventory → 新增条目', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 3, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 3 }])
  })

  it('addItem:已有 itemId → count 累加', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 5, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 7 }])
  })

  it('removeItem(0x20):qty=0 默认按 1 移除', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 3 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x20, operands: [42, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 2 }])
  })

  it('removeItem:count 减到 0 → entry 从 inventory 删除', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x20, operands: [42, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([])
  })

  it('playSound(0x47):console.debug 不报错 + ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: 0x47, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore') // 一帧跑完
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockRestore()
  })
})

// ── M5.I-w1.b: 机关 / scene-state opcode(setObjectPosRelParty / setAutoScript / shakeScreen)
describe('I-w1.b 机关 / scene-state opcodes', () => {
  it('setObjectPosRelParty(0x12):pCurrent.x = operand[1] + party.x', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x12, operands: [0, 16, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(116)  // 16 + 100
    expect(gs.npcs[0]?.y).toBe(58)   // 8 + 50
  })

  it('setAutoScript(0x24):operand[0]!=0 → npc.autoCursor.ip = operand[1]', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      // operand[0]=0xFFFF(self),operand[1]=42(new ip)
      { op: 'raw', opcode: 0x24, operands: [0xFFFF, 42, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor).toEqual({ ip: 42 })
  })

  it('setAutoScript:operand[0]==0 → no-op(sdlpal `if (operand[0] != 0)` 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 5 } }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x24, operands: [0, 99, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor).toEqual({ ip: 5 })  // 未改
  })

  it('setAutoScript:operand[1]=0 → 清空 autoCursor', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 5 } }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x24, operands: [0xFFFF, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('shakeScreen(0x35):console.debug stub 不报错 + ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [10, 4, 0] },
      { op: 'end' },
    ])
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore')
    const calls = debugSpy.mock.calls.map((c) => String(c[0]))
    expect(calls.some((m) => m.includes('shakeScreen'))).toBe(true)
    debugSpy.mockRestore()
  })
})

// ── M5.I-w1.c: NPC contact opcode(walkOneStepDir x4)──────────────────────
// sdlpal script.c:652-661 真值:0x0B-0x0E 共用 case,dir=opcode-0x0B,走 1 步。
describe('I-w1.c NPC contact opcodes', () => {
  it('walkOneStep dir=South(0x0B):facing=down,位移 (-16,+8)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')
    expect(gs.npcs[0]?.x).toBe(84)   // 100 - 16
    expect(gs.npcs[0]?.y).toBe(58)   // 50 + 8
  })

  it('walkOneStep dir=East(0x0E):facing=right,位移 (+16,+8)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0E, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('right')
    expect(gs.npcs[0]?.x).toBe(116)  // 100 + 16
    expect(gs.npcs[0]?.y).toBe(58)   // 50 + 8
  })

  it('walkOneStep 4 个 opcode dir 映射:0x0B/C/D/E → down/left/up/right', () => {
    const dirs = ['down', 'left', 'up', 'right'] as const
    for (let i = 0; i < 4; i++) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'raw', opcode: 0x0B + i, operands: [0, 0, 0] },
        { op: 'end' },
      ])
      gs.eventCursor!.currentEventObjectId = 5
      tickEventSystem(gs, snap(), bus)
      expect(gs.npcs[0]?.facing).toBe(dirs[i])
    }
  })

  it('chest 完整流程(I-w2.1 集成):trigger script 跑 addItem + setSceneObjectState + showDialog → inventory 加 / npc 隐藏 / 对话框显', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 设 chest NPC 在 (100, 50),trigger script 跑:加 1 个 item 42 + 隐藏自己 + 显对话框
    gs.npcs = [{ id: 9, x: 100, y: 50, spriteNum: 1, sState: 1, triggerLabel: 'L_chest' }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 1, 0], label: 'L_chest' },  // addItem 42 x1
      { op: 'raw', opcode: 0x49, operands: [0xFFFF, 0, 0] },                // setSceneObjectState self → 0 (Hidden)
      { op: 'showDialog', messageIndex: 0, text: '得到 上品丹药 ×1' },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 9
    tickEventSystem(gs, snap(), bus)
    // 跑到 showDialog 时停在 dialog 等键
    expect(gs.inventory).toEqual([{ itemId: 42, count: 1 }])
    expect(gs.npcs[0]?.sState).toBe(0)
    expect(gs.dialogBox?.currentLineText).toBe('得到 上品丹药 ×1')
  })

  it('walkOneStep 推进 scriptedFrame mod 4(动画循环)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },  // 第 5 次 → frame=0(回环)
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)  // (-1+1)%4=0 → 1 → 2 → 3 → 0
  })
})

// ── autoScript 控制流 fall-through(2026-05-28 黑屏根因回归)─────────────────
//
// 黑屏 root cause:events 提取 BFS 对 `end` 一律不收 fall-through,但 0x0001(advance)
// 运行时 ip++ 到下一行、0x0002(reset)跳 resetTo。提取丢了续行 → local 数组把不相干的
// 邻接脚本(L_1649 setPartyPos+loadScene)塞在 autoscript(L_734)正后面 → autoscript
// ip++ 跑进 setPartyPos → party 被拉到地图空白区 → 黑屏。
//
// 真值:scene-003 id=62 autoscript(全局 734-740)= NPC 待机动画循环:
//   end advance → setGesture(1) → end advance → setGesture(0) → wait → end reset(回 734)
// 该循环**绝不能**落到后面的 setPartyPos。
describe('autoScript 控制流(sdlpal PAL_RunAutoScript script.c:3518-3547)', () => {
  // scene-003 id=62 待机动画 1:1 结构 + 一个哨兵 setPartyPos(绝不能被跑到)
  function idleLoopCommands(): Command[] {
    return [
      { op: 'end', advance: true },                       // 0: 0x0001 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 1
      { op: 'end', advance: true },                       // 2: 0x0001 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [0, 0, 0] }, // 3
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [2, 0, 0] },        // 4: wait 2 帧
      { op: 'end', reset: true, resetTo: 734, idleFrames: 0 },           // 5: 0x0002 → 跳回 ip0
      // ↓ 哨兵:邻接脚本(原 L_1649)。autoscript 绝不能 fall-through 到此。
      { op: 'raw', opcode: 0x46 /* setPartyPos */, operands: [39, 56, 0] }, // 6
      { op: 'end' },                                      // 7
    ]
  }

  it('0x0002 reset:循环回 resetTo(L_734),NPC 待机动画不停 + 绝不 fall-through 到 setPartyPos', () => {
    const gs = createInitialGameState({ x: 1408, y: 1424, facing: 'down' })
    const px0 = gs.party.x
    const py0 = gs.party.y
    gs.npcs = [{ id: 62, x: 1024, y: 1680, spriteNum: 1, sState: 2, autoCursor: { ip: 0 } }]
    gs.sceneCommands = idleLoopCommands()
    gs.sceneLabelMap = { L_734: 0 } // resetTo=734 → local ip 0

    // 跑 40 帧(远超一个动画周期 6 帧)
    for (let i = 0; i < 40; i++) tickAutoScripts(gs)

    // party 位置纹丝不动 — setPartyPos(哨兵 ip6)从未被执行
    expect(gs.party.x).toBe(px0)
    expect(gs.party.y).toBe(py0)
    // autoCursor 始终在循环体内 [0,5],绝不到 ip6/ip7
    expect(gs.npcs[0]?.autoCursor).toBeDefined()
    expect(gs.npcs[0]!.autoCursor!.ip).toBeLessThanOrEqual(5)
  })

  it('0x0001 advance:autoscript 推进至下一行(不 park、不停)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    gs.sceneCommands = [
      { op: 'end', advance: true },                       // 0 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0] }, // 1
      { op: 'end' },                                      // 2: 0x0000 park
    ]
    gs.sceneLabelMap = {}
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(1) // 0x0001 推进到 1
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(2) // raw 跑完推进到 2
    tickAutoScripts(gs)
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(2) // 0x0000 park(原地不动)
  })

  it('0x0002 reset:resetTo 跨文件(labelMap 无)→ 停 autoCursor(不死循环)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    gs.sceneCommands = [{ op: 'end', reset: true, resetTo: 9999, idleFrames: 0 }]
    gs.sceneLabelMap = {} // L_9999 不在本 scene
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })
})

// ── narration(kDialogCenterWindow)自动消失(2026-05-28 物品UI卡操作回归)──────
//
// sdlpal text.c:1663-1710:kDialogCenterWindow(物品提示 "得到XX")显示后走
// PAL_DialogWaitForKeyWithMaximumSeconds(1.4)→ 最多 1.4s 自动消失(或按键提前)→
// PAL_DeleteBox + PAL_EndDialog。**不卡死等空格**。
// bug:之前 narration 走 typing → line-done → 下条 opcode 前 pre-op ClearDialog 等 Confirm,
// 用户必须按空格才能继续。
describe('narration dialog 自动消失(sdlpal text.c:1701 PAL_DialogWaitForKeyWithMaximumSeconds(1.4))', () => {
  it('narration:跑满 14 帧(1.4s @10fps)自动消失,无需 Confirm', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.currentDialogStyle = 'narration'
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', text: '得到净衣符', messageIndex: 0 },
      { op: 'end' },
    ])
    // tick 1:showDialog 建 narration 框
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.style).toBe('narration')
    // 不按任何键,跑 12 帧仍在显示(< 14)
    for (let i = 0; i < 12; i++) tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox).toBeDefined()
    // 再跑几帧凑满 14 → 自动消失(全程无 Confirm)
    for (let i = 0; i < 5; i++) tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox).toBeUndefined()
  })

  it('narration:任意键(非只 Confirm)提前消失 — sdlpal text.c:1433 dwKeyPress!=0', () => {
    // sdlpal 任意键都关:方向键 / Cancel(ESC)/ Menu 都行,不被迫等满 1.4s
    for (const key of ['Confirm', 'Cancel', 'Down', 'Menu'] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.currentDialogStyle = 'narration'
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'showDialog', text: '得到净衣符', messageIndex: 0 },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus) // 建框
      expect(gs.dialogBox).toBeDefined()
      tickEventSystem(gs, snap([key]), bus) // 任意键 → 立即消失
      expect(gs.dialogBox, `key=${key} 应能关闭 narration`).toBeUndefined()
    }
  })

  it('narration 消失后 cursor 继续推进(后续 opcode 不被阻塞)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.currentDialogStyle = 'narration'
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', text: '得到大蒜', messageIndex: 0 },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 建框
    // Confirm 提前关 → 同 tick fall-through 跑 'end' → eventCursor 清空 → 回 explore
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })
})

// ── A 类补全(A1:自包含数据/状态 opcode)──────────────────────────────────────
describe('A1 opcode:0x40 setTriggerMethod / 0x55 addMagic / 0x56 removeMagic / 0x9A setMultiState', () => {
  it('0x40 setTriggerMethod:operand[0]!=0 → pCurrent.triggerMode = operand[1](script.c:1613-1621)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 0 }]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [1, 4, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(4)
  })

  it('0x40:operand[0]==0 → no-op(triggerMode 不变)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 6 }]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [0, 4, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(6) // 未改
  })

  it('0x55 addMagic:role=operand[1]-1,spell=operand[0] 填空槽(global.c:2084)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x55, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    // role 0(operand[1]=1 → 1-1=0)第一个空槽 = 350
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(350)
  })

  it('0x55 addMagic:已学该法术 → no-op(不重复填槽)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 350
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x55, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(350)
    expect(gs.PlayerRolesRuntime.rgwMagic[1]?.[0]).toBe(0) // 第二槽未被占
  })

  it('0x56 removeMagic:找到该 spell 的槽置 0(global.c:2139)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 350
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 351
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x56, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(0) // 移除
    expect(gs.PlayerRolesRuntime.rgwMagic[1]?.[0]).toBe(351) // 其他不动
  })

  it('0x9A setMultiState:id ∈ [operand[0],operand[1]] 的 NPC sState = operand[2](script.c:2756)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 6, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [4, 5, 2] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs.map((n) => n.sState)).toEqual([1, 2, 2, 1]) // 仅 id 4/5 改成 2
  })
})

// ── onEnter 脚本持久化(2026-05-28 开场 cutscene 重进重播回归)──────────────────
//
// sdlpal play.c:64:rgScene[i].wScriptOnEnter = PAL_RunTriggerScript(wScriptOnEnter,...)
// —— onEnter 跑完把"下一条 entry"存回场景。开场 cutscene 以 0x01(advance)收尾 →
// 推进到下一条 0x00(stop)→ 重进只跑 0x00 → 不重播。
// bug:ts 每次从 onEnterLabel 重跑,没存回 → 出场景再回去 cutscene 重播。
function onEnterCursor(gs: GameState, commands: Command[], ip: number, sceneId: number): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip,
    onEnterSceneId: sceneId,
    onEnterStartIp: ip,
  }
  gs.mode = 'event'
}

describe('onEnter 脚本持久化(sdlpal play.c:64)', () => {
  it('0x01(advance)收尾 → sceneOnEnterIp 存 ip+1;重进从 0x00 跑不重播 cutscene', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: 0x15, operands: [0, 0, 0] }, // ip0 cutscene 动作(重进不该再跑)
      { op: 'end', advance: true }, // ip1 0x01 收尾
      { op: 'end' }, // ip2 0x00 stop
    ]
    // 首次进 scene 2:从 ip0 跑
    onEnterCursor(gs, commands, 0, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined() // onEnter 结束
    expect(gs.sceneOnEnterIp[2]).toBe(2) // 0x01@ip1 → ip1+1=2(下一条 0x00)

    // 重进 scene 2:用持久化的 override ip=2(0x00)
    onEnterCursor(gs, commands, gs.sceneOnEnterIp[2]!, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterIp[2]).toBe(2) // 0x00 → 原地不推进,cutscene(ip0)不再跑
  })

  it('0x00 直接收尾 → sceneOnEnterIp 存起始 ip(replay-in-place,"每次进都跑"的脚本)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: 0x15, operands: [0, 0, 0] }, // ip0
      { op: 'end' }, // ip1 0x00(无 advance)
    ]
    onEnterCursor(gs, commands, 0, 3)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterIp[3]).toBe(0) // 0x00 → 返回起始 ip 0(下次仍从头跑)
  })

  it('onEnter 结束清 fEnteringScene(override 入口无 fadeScreen 也解冻,不卡死)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.fEnteringScene = true // loadScene 设的"加载期冻结渲染"标志
    // override 入口 = 已推进过开场的 0x00(无 fadeScreen 来清 fEnteringScene)
    onEnterCursor(gs, [{ op: 'end' }], 0, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.fEnteringScene).toBe(false) // onEnter 结束 → 解冻(否则 present 永久跳渲染 → 卡死)
  })

  it('runEnterScript(skip-intro 同步路径):0x01 收尾也持久化 sceneOnEnterIp(重进不重播)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip0 setPartyPos(开场起点)
      { op: 'showDialog', text: '很久很久以前', messageIndex: 0 }, // ip1 同步路径跳过对话
      { op: 'end', advance: true }, // ip2 0x01 收尾
      { op: 'end' }, // ip3 0x00
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0, 2)
    expect(gs.sceneOnEnterIp[2]).toBe(3) // 0x01@ip2 → ip2+1=3(下一条 0x00),重进不重播开场
  })
})

// ── A2 条件跳转 opcode(2026-05-28)──────────────────────────────────────────────
// 跳转目标 = operand 值(全局 entry),经 labelMap 解析。分支用 setPartyPos(0x46)做哨兵观测:
// fall-through 落点 vs jump-target 落点不同,看 party.x 判定哪个分支跑了。
describe('A2 条件跳转 opcode', () => {
  // 公共脚本:ip0 跳转判断 → 命中跳 L_T(setPartyPos 20,20→x=640);未命中 fall-through(setPartyPos 10,10→x=320)
  function jumpScript(opcode: number, operands: [number, number, number]): Command[] {
    return [
      { op: 'raw', opcode, operands }, // ip0 条件跳转
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip1 fall-through 哨兵
      { op: 'end' }, // ip2
      { label: 'L_99', op: 'raw', opcode: 0x46, operands: [20, 20, 0] }, // ip3 jump 目标哨兵
      { op: 'end' }, // ip4
    ]
  }

  it('0x95 jumpIfScene:wNumScene==op0 → 跳(L_99→x=640);不等 → fall-through(x=320)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x95, [5, 99, 0])) // scene==5 → jump L_99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640) // 跳了

    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.wNumScene = 6
    loadEvent(gs2, jumpScript(0x95, [5, 99, 0]))
    tickEventSystem(gs2, snap(), createCommandBus())
    expect(gs2.party.x).toBe(320) // 没跳,fall-through
  })

  it('0x58 jumpIfItemLess:背包不足 op1 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 7, count: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x58, [7, 5, 99])) // item7 数量 2 < 5 → jump op2=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640) // 数量不足 → 跳
  })

  it('0x79 jumpIfPlayerInParty:队伍含 name==op0 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwName[0] = 36 // 李逍遥 name=36
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x79, [36, 99, 0])) // name 36 在队伍 → jump op1=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640)
  })

  it('0x94 jumpIfObjState:pCurrent.sState==op1 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x94, [5, 2, 99])) // obj id=5(op0-1=4) sState==2 → jump op2=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640)
  })

  it('0xA2 randomJump:cursor.ip += RandomLong(0,op0-1)(op0=1 → offset 0,确定)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // op0=1 → RandomLong(0,0)=0 → ip += 0 → caller ip++ → ip1(setPartyPos 10,10 → x=320)
    loadEvent(gs, [
      { op: 'raw', opcode: 0xa2, operands: [1, 0, 0] }, // ip0
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(320) // offset 0 → 跑 ip1
  })
})

// ── A3 数据 opcode(2026-05-28)──────────────────────────────────────────────────
describe('A3 opcode:0x75 setParty / 0x90 setObjectScript', () => {
  it('0x75 setParty:operand[0..2]=roleId+1 → partyMembers,清 poison(script.c:2164)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.rgPoisonStatus = { '0_0': { wPoisonID: 5, wPoisonScript: 0 } }
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x75, operands: [1, 2, 3] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyMembers).toEqual([0, 1, 2]) // roleId = operand-1
    expect(gs.rgPoisonStatus).toEqual({}) // poison 清空
  })

  it('0x75 setParty:全 0 → 兜底 [0](sdlpal HACK)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x75, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyMembers).toEqual([0])
  })

  it('0x90 setObjectScript:rgObject[op0].rgwData[2+op2]=op1(script.c:2605)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x90, operands: [42, 777, 1] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgObject[42]?.rgwData[3]).toBe(777) // idx = 2 + op2(1) = 3
  })

  it('0x6D setSceneScripts:op1!=0 → sceneOnEnterOverride[op0]=op1;op1=0&&op2=0 → 0(清)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x6d, operands: [3, 500, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterOverride?.[3]).toBe(500)

    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs2, [{ op: 'raw', opcode: 0x6d, operands: [3, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs2, snap(), createCommandBus())
    expect(gs2.sceneOnEnterOverride?.[3]).toBe(0) // 清
  })

  it('0x98 setFollower:operand[0..1]>0 → gs.followers + nFollower(script.c:2709)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x98, operands: [3, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.followers).toEqual([3]) // role id 直接(sdlpal 无 -1)
    expect(gs.nFollower).toBe(1)
  })

  it('0x99 changeMap:op0!=0xFFFF → sceneMapNumOverride[op0]=op1(script.c:2740)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x99, operands: [5, 99, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneMapNumOverride?.[5]).toBe(99)
  })
})

// ── 0x04 call-script(2026-05-28,238 次最高频,调用栈)──────────────────────────
describe('0x04 callScript(script.c:3258 — 调用栈)', () => {
  it('调用子脚本 → 跑完 → 返回 caller 下一条继续', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [50, 0, 0] }, // ip0 call L_50
      { op: 'raw', opcode: 0x46, operands: [30, 30, 0] }, // ip1 返回后:setPartyPos → x=960
      { op: 'end' }, // ip2 真结束
      { label: 'L_50', op: 'raw', opcode: 0x49, operands: [5, 7, 0] }, // ip3 子脚本:npc id4 sState=7
      { op: 'end' }, // ip4 子脚本 end → 弹栈返回 ip1
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(7) // 子脚本跑了(0x49)
    expect(gs.party.x).toBe(960) // 返回 caller 后继续跑了 ip1
    expect(gs.eventCursor).toBeUndefined() // 最终 end 清 cursor
  })

  it('嵌套调用:A 调 B,B 调 C,逐层返回', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 0 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 0 },
    ]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [60, 0, 0] }, // ip0 call B(L_60)
      { op: 'raw', opcode: 0x46, operands: [30, 30, 0] }, // ip1 A 返回后 x=960
      { op: 'end' }, // ip2
      { label: 'L_60', op: 'raw', opcode: 0x04, operands: [80, 0, 0] }, // ip3 B call C(L_80)
      { op: 'raw', opcode: 0x49, operands: [5, 1, 0] }, // ip4 B 返回后:npc id4 sState=1
      { op: 'end' }, // ip5 B end → 返回 ip1
      { label: 'L_80', op: 'raw', opcode: 0x49, operands: [6, 2, 0] }, // ip6 C:npc id5 sState=2
      { op: 'end' }, // ip7 C end → 返回 ip4
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.sState).toBe(2) // C 跑了
    expect(gs.npcs[0]?.sState).toBe(1) // B 返回后跑了
    expect(gs.party.x).toBe(960) // A 返回后跑了
    expect(gs.eventCursor).toBeUndefined()
  })

  it('op1!=0 → 子脚本内 currentEventObjectId 覆盖为 op1-1(作用于 op1 指定 npc)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 8, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [50, 9, 0] }, // ip0 call L_50,eventObj=9(1-based)→ id 8
      { op: 'end' }, // ip1
      // 子脚本 0x14 setObjectGesture(用 self = currentEventObjectId,被覆盖为 8)→ 设 id8 scriptedFrame
      { label: 'L_50', op: 'raw', opcode: 0x14, operands: [5, 0, 0] }, // ip2
      { op: 'end' }, // ip3
    ])
    gs.eventCursor!.currentEventObjectId = 0 // caller 的
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(5) // 子脚本 self 作用于 op1 指定的 npc id8
  })
})
