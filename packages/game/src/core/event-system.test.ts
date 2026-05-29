import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey, Palette } from '@type-pal/shared'
import {
  tickEventSystem, tickAutoScripts, buildLabelMap, runScript, runEnterScript, setFetchPalette,
  setSharedEvents, setStartBattleHandler,
  OP_START_BATTLE, OP_SET_BATTLE_FIELD, OP_SET_SCENE_OBJECT_STATE,
  OP_SET_PARTY_DIRECTION,
  OP_WAIT_FRAMES, OP_SET_OBJECT_POS,
  OP_SET_OBJECT_GESTURE, OP_SET_EVENT_OBJECT_DIR_AND_FRAME, OP_SET_EVENT_OBJECT_DIR_OR_FRAME,
  OP_CALL_SCRIPT,
  OP_NPC_WALK_ONE_STEP, OP_PLAYER_WALK_ONE_STEP, OP_SET_PLAYER_SPRITE,
  OP_MOVE_OBJECT, OP_SET_OBJECT_LAYER, OP_ANIMATE_OBJECT,
  OP_NULLIFY_OBJECT, OP_HIDE_OBJECT, OP_CHASE_PAUSE, OP_CHASE_SPEEDUP,
  OP_PARTY_WALK_TO_4, OP_PARTY_WALK_TO_8, OP_NPC_WALK_TO_4,
  OP_RIDE_OBJECT_2, OP_RIDE_OBJECT_4, OP_RIDE_OBJECT_8, OP_MONSTER_CHASE,
  setObstacleChecker, setGlobalEvents, resolveScriptLabel,
  startOverworldItemScript, setSceneLoader,
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
    //  tick 1: showDialog 入,startDialogLine,waiting=dialog
    //  tick 2 (Confirm): skip-typing → 整行设满 → **return**(满行渲染一帧,2026-05-29 fix B)
    //  tick 3 (Confirm): line-done → 自动 ip++ → end → 有行 → setWaitingEndKey
    //  tick 4 (Confirm): waiting-end-key → dialog-end → 清 dialogBox + waiting=undef → end → mode=explore
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
  })

  it('快按 Space:skip-typing 当 tick 整行设满但 cursor **不**推进(留一帧渲染),下一 tick 才 line-done 推进', () => {
    // 2026-05-29 梦境快按 Space 只出 1 行就渐变的根因修复:skip 后整行先渲染一帧,
    // 否则下条 opcode(loadScene/fade 等渲染门)那帧把满行盖掉 → 玩家没看见。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: 'AB' }, // 2 字,typing 2 tick
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)            // tick1: typing(charsRevealed→1)
    tickEventSystem(gs, snap(['Confirm']), bus) // tick2: Confirm → skip → 整行设满 + return
    expect(gs.eventCursor?.ip).toBe(0)          // **没**推进(cursor 还在 showDialog,满行本帧渲染)
    expect(gs.dialogBox?.charsRevealed).toBe(2) // 整行已满(可渲染)
    expect(gs.dialogBox?.phase).toBe('line-done')
    tickEventSystem(gs, snap(), bus)            // tick3: line-done 自动推进 → ip=1(end)
    expect(gs.eventCursor?.ip).toBe(1)          // 已推进到 end
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

describe('B 类移动 opcode(sdlpal script.c 真值)', () => {
  function setup(npcs: GameState['npcs']) {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = npcs
    return { gs, bus }
  }

  it('0x7D moveObject:pCurrent.x += SHORT(op1), y += SHORT(op2)(script.c:2277-2283)', () => {
    const { gs, bus } = setup([{ id: 3, x: 100, y: 50, spriteNum: 1 }])
    // op0=0 → self(currentEventObjectId);op1 = -8(0xFFF8 SHORT),op2 = +6
    loadEvent(gs, [{ op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 0xFFF8, 6] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(92)
    expect(gs.npcs[0]?.y).toBe(56)
  })

  it('0x7D moveObject:operand[0] 显式选其他 NPC(1-based → id==op0-1)', () => {
    const { gs, bus } = setup([
      { id: 3, x: 0, y: 0, spriteNum: 1 },
      { id: 7, x: 200, y: 100, spriteNum: 1 },
    ])
    loadEvent(gs, [{ op: 'raw', opcode: OP_MOVE_OBJECT, operands: [8, 10, 20] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3   // self=3,但 op0=8 → 选 id=7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.x).toBe(210)
    expect(gs.npcs[1]?.y).toBe(120)
  })

  it('0x7E setObjectLayer:pCurrent.sLayer = SHORT(op1)(script.c:2285-2290)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sLayer: 0 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0, 3, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sLayer).toBe(3)
  })

  it('0x87 animateObject:仅推进动画帧 mod 4,不位移(script.c:2540-2544 PAL_NPCWalkOneStep id,0)', () => {
    const { gs, bus } = setup([{ id: 3, x: 100, y: 50, spriteNum: 1, scriptedFrame: 0 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_ANIMATE_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(1)
    expect(gs.npcs[0]?.x).toBe(100)   // 无位移
    expect(gs.npcs[0]?.y).toBe(50)
  })

  it('0x4B nullifyObject:self.sVanishTime = -15(script.c:1726-1730)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_NULLIFY_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sVanishTime).toBe(-15)
  })

  it('0x52 hideObject:self.sState *= -1; sVanishTime = op0?op0:800(script.c:1794-1799)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 2 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_HIDE_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-2)
    expect(gs.npcs[0]?.sVanishTime).toBe(800)   // op0=0 → 默认 800
  })

  it('0x52 hideObject:op0 非 0 → sVanishTime = op0', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_HIDE_OBJECT, operands: [120, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-1)
    expect(gs.npcs[0]?.sVanishTime).toBe(120)
  })

  it('0x62 chasePause:wChasespeedChangeCycles=op0, wChaseRange=0(script.c:1967-1972)', () => {
    const { gs, bus } = setup([])
    loadEvent(gs, [{ op: 'raw', opcode: OP_CHASE_PAUSE, operands: [50, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wChasespeedChangeCycles).toBe(50)
    expect(gs.wChaseRange).toBe(0)
  })

  it('0x63 chaseSpeedup:wChasespeedChangeCycles=op0, wChaseRange=3(script.c:1975-1980)', () => {
    const { gs, bus } = setup([])
    loadEvent(gs, [{ op: 'raw', opcode: OP_CHASE_SPEEDUP, operands: [30, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wChasespeedChangeCycles).toBe(30)
    expect(gs.wChaseRange).toBe(3)
  })

  it('0x7A partyWalkTo speed 4:每 tick 走 1 step(|dx|>8 → ±8)(script.c:2245-2249)', () => {
    const { gs, bus } = setup([])
    gs.party.x = 0; gs.party.y = 0
    // target (10,0,0) → tx=320,远 → 一步走 speed*2=8
    loadEvent(gs, [{ op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [10, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(8)
    expect(gs.eventCursor?.ip).toBe(0)   // 未到 → 不 ip++,下 tick 续走
  })

  it('0x7B partyWalkTo speed 8:一步走 16(script.c:2252-2256)', () => {
    const { gs, bus } = setup([])
    gs.party.x = 0; gs.party.y = 0
    loadEvent(gs, [{ op: 'raw', opcode: OP_PARTY_WALK_TO_8, operands: [10, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(16)
  })

  it('0x7C npcWalkTo speed 4:stagger gate TRUE(id 偶 + frameNum 偶)→ 走', () => {
    const { gs, bus } = setup([{ id: 2, x: 0, y: 0, spriteNum: 1 }])
    gs.frameNum = 0   // (id+1=3)&1=1 ^ 0&1=0 → 1 → gate TRUE
    // target (10,10,0):tx=320 ty=160,两轴均 >= speed*2 → 走 1 step(非 snap)
    loadEvent(gs, [{ op: 'raw', opcode: OP_NPC_WALK_TO_4, operands: [10, 10, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 2
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(8)   // 'right' → +2 * speed4
    expect(gs.npcs[0]?.y).toBe(4)   // 'right' → +1 * speed4
  })

  it('0x7C npcWalkTo speed 4:stagger gate FALSE(id 奇 + frameNum 偶)→ 本 tick 不走 + 重试', () => {
    const { gs, bus } = setup([{ id: 1, x: 0, y: 0, spriteNum: 1 }])
    gs.frameNum = 0   // (id+1=2)&1=0 ^ 0&1=0 → 0 → gate FALSE
    loadEvent(gs, [{ op: 'raw', opcode: OP_NPC_WALK_TO_4, operands: [10, 10, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 1
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(0)   // 隔帧:本 tick 跳过
    expect(gs.eventCursor?.ip).toBe(0)   // 未推进,下 tick 重试
  })

  it('0x3F/0x44/0x97 rideObject:party + 骑乘对象一起移动 dx/dy(script.c:203-307)', () => {
    const { gs, bus } = setup([{ id: 5, x: 200, y: 100, spriteNum: 1 }])
    gs.party.x = 0; gs.party.y = 0
    // 0x44 speed 4,target (10,0,0) → tx=320,xOffset=320 → dx=8;yOffset=0 → dy=0
    loadEvent(gs, [{ op: 'raw', opcode: OP_RIDE_OBJECT_4, operands: [10, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(8)       // party 移动
    expect(gs.npcs[0]?.x).toBe(208)  // 骑乘对象同步移动 +8
    expect(gs.npcs[0]?.y).toBe(100)  // y 不变
    expect(gs.party.facing).toBe('right')
  })

  it('0x4C monsterChase:无障碍 → 朝 party 走 1 步 + 设朝向(script.c:309-501)', () => {
    setObstacleChecker(null)   // 无 checker → isObstacle 恒 false(无障碍)
    const { gs, bus } = setup([{ id: 4, x: 132, y: 50, spriteNum: 1, facing: 'up' }])
    gs.party.x = 100; gs.party.y = 60   // party 在怪左下方,x=-32 y=10(均非 0,不触发 random)
    gs.wChaseRange = 1
    // op0=maxDist(默认 8),op1=speed(默认 4),op2=floating(0)
    loadEvent(gs, [{ op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')   // x<0,y>=0 → kDirSouth=down
    expect(gs.npcs[0]?.x).toBe(124)           // 132 + (-2 * speed4)
    expect(gs.npcs[0]?.y).toBe(54)            // 50 + (1 * speed4)
  })

  it('0x4C monsterChase:wChaseRange==0(驱魔香)→ 原地打转换向,不位移', () => {
    setObstacleChecker(null)
    const { gs, bus } = setup([{ id: 4, x: 132, y: 50, spriteNum: 1, facing: 'down' }])
    gs.party.x = 100; gs.party.y = 60
    gs.wChaseRange = 0
    gs.frameNum = 1   // 奇帧 → 换向
    loadEvent(gs, [{ op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('left')   // down(0) → +1 → left(1)
    expect(gs.npcs[0]?.x).toBe(132)           // wMonsterSpeed=0 → 不位移
    expect(gs.npcs[0]?.y).toBe(50)
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

  it('跨 scene:目标不在当前 scene → 回退全局 allEventObjects 改状态(客栈苗人→房间苗人显形)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 当前 scene 只有 id 59(客栈苗人头领);房间苗人头领是全局 obj 24(sState=0 隐藏),不在当前 scene。
    const roomMiao = { id: 24, x: 544, y: 288, spriteNum: 207, sState: 0 }
    gs.npcs = [{ id: 59, x: 0, y: 0, spriteNum: 207, sState: 2 }]
    gs.allEventObjects = [roomMiao, { id: 59, x: 0, y: 0, spriteNum: 207, sState: 2 }]
    // allEventObjects 需按 id 索引可取(resolveTargetNpc 用 allEventObjects[targetId])
    const dense: typeof gs.allEventObjects = []
    dense[24] = roomMiao
    dense[59] = gs.npcs[0]!
    gs.allEventObjects = dense
    loadEvent(gs, [
      // 0x49 [25,2,0]:operand[0]=25 → id 24(不在当前 scene)→ 全局表 obj 24 sState=2
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [25, 2, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 59
    tickEventSystem(gs, snap(), bus)
    expect(roomMiao.sState).toBe(2)   // 跨 scene 改到全局对象,进房间时 slice 引用即显形
  })

  it('setTriggerScript(0x25):operand[0] 选对象(非 self)→ 改该对象 triggerLabel(客栈酒剑仙)', () => {
    // sdlpal script.c:1147-1155:pCurrent(operand[0] 选)->wTriggerScript = op1,非 self。
    // 客栈 `0x25 [63, 604]`:李大娘对话后把酒剑仙(对象 63=id62)trigger 改 L_604(开新对话)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },                              // 触发 cutscene 的 self
      { id: 62, x: 100, y: 100, spriteNum: 56, sState: 2, triggerLabel: 'L_601' }, // 酒剑仙
    ]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x25, operands: [63, 604, 0] }, // op0=63 → id62,trigger → L_604
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerLabel).toBe('L_604')      // 酒剑仙(operand[0] 选)改了
    expect(gs.npcs[0]?.triggerLabel).toBeUndefined()    // self(id5)没动(旧 bug 会误改 self)
  })
})

describe('NPC trigger 脚本推进持久化(sdlpal play.c pEvtObj->wTriggerScript = RunTriggerScript)', () => {
  it('0x01 advance:trigger 跑完 → triggerResume 续跑下一条(不每次接触重播 cutscene)', () => {
    // 客栈李大娘苗人演出 L_285 以 0x01 收尾 → sdlpal 推进 wTriggerScript 到下一条("记得喔"),
    // 再接触不重播全段。旧实现不持久化 → 重播(2026-05-28 user 发现)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 56, x: 0, y: 0, spriteNum: 21, sState: 2 }]
    const commands: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 0: 演出
      { op: 'end', advance: true },                                      // 1: 0x01 advance
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0] }, // 2: 续跑目标("记得喔")
      { op: 'end' },                                                     // 3
    ]
    gs.eventCursor = { commands, labelMap: {}, ip: 0, currentEventObjectId: 56, triggerOwnerId: 56 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus) // 跑 ip0 raw → ip1 end advance → 持久化 + 结束
    expect(gs.mode).toBe('explore')
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(2)             // 续跑指 idx2,不重播 idx0
    expect(gs.npcs[0]?.triggerResume?.commands).toBe(commands)
  })

  it('0x00 plain:trigger 跑完 → triggerResume **不动**(sdlpal 返回起始 entry,原地可重触发)', () => {
    // 已推进到续跑点(idx 5)的 trigger 再跑、以 plain 收尾 → 应停在 idx 5(原地),不回退重播。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [0, 0, 0] }, // 0..4 占位
      { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 5: 续跑点
      { op: 'end' },                                                     // 6: 0x00 plain
    ]
    const resume = { commands, labelMap: {}, ip: 5 }
    gs.npcs = [{ id: 62, x: 0, y: 0, spriteNum: 56, sState: 2, triggerResume: resume }]
    gs.eventCursor = { commands, labelMap: {}, ip: 5, currentEventObjectId: 62, triggerOwnerId: 62 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(5)            // plain 不动 → 停在续跑点 5(不回退原点)
  })

  it('0x08 checkpoint:推进 resume 点到 0x08 后 + 继续跑;0x00 plain 不覆盖 → 重触发跳过 0x08 前内容(P2#6b)', () => {
    // 商店类:[内容..., 0x08, buyMenu, 0x00 end] — 重触发从 0x08 后续(不重播对话)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.dwCash = 100
    gs.npcs = [{ id: 5, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    const commands: Command[] = [
      { op: 'giveItem', itemId: 1, count: 1 },         // 0:第一次内容(0x08 前)
      { op: 'raw', opcode: 0x08, operands: [0, 0, 0] }, // 1:0x08 checkpoint
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] }, // 2:halveCash(0x08 后,代表 buyMenu 等)
      { op: 'end' },                                    // 3:0x00 plain
    ]
    gs.eventCursor = { commands, labelMap: {}, ip: 0, currentEventObjectId: 5, triggerOwnerId: 5 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)                       // 0x08 继续跑到 halveCash(没停)
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(2)    // checkpoint = 0x08 后(ip1→2);重触发跳过 ip0 giveItem
  })

  it('0x25 setTriggerScript:清 triggerResume(新 trigger label 生效,不被旧续跑点盖)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 62, x: 0, y: 0, spriteNum: 56, sState: 2, triggerLabel: 'L_601', triggerResume: { commands: [], labelMap: {}, ip: 9 } },
    ]
    loadEvent(gs, [
      { op: 'raw', opcode: 0x25, operands: [63, 604, 0] }, // 设 id62 trigger L_604
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerLabel).toBe('L_604')
    expect(gs.npcs[1]?.triggerResume).toBeUndefined()       // 旧续跑点清掉 → L_604 生效
  })
})

describe('对话框样式复位(sdlpal PAL_EndDialog text.c:1814 → kDialogUpper)', () => {
  it('脚本结束 → currentDialogStyle 复位 top(下段无 setDialogStyle 的 showDialog 用 top 默认)', () => {
    // 厨房李大娘 L_560 直接 showDialog 没 setDialogStyle → 应继承 top 默认而非上段 cutscene 的
    // center/narration(2026-05-28 "逍遥快把酒菜"显示成居中框的根因)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.currentDialogStyle = 'narration'  // 上段 cutscene 残留
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [0, 0, 0] }, // 任意非对话 raw(shakeScreen stub)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('top')            // PAL_EndDialog 复位
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
    // tick 2 Confirm: skip-typing → 整行设满 → return(满行渲染一帧,2026-05-29 fix B)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('line-done')
    // tick 3 Confirm: line-done → ip++ → opcode 5 ClearDialog → wait page key
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    // tick 4 Confirm: page-advance (no pending) → keep dialogBox (empty) + ip++ → setDialogStyleBottom
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

  it('setAutoScript(0x24):operand[1] 是全局 entry → 经 sceneLabelMap[L_<entry>] 解本地 ip', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    // operand[1]=42 是全局 script entry;切片后映射到本地 ip 7(模拟 sceneLabelMap)
    gs.sceneLabelMap = { L_42: 7 }
    const bus = createCommandBus()
    loadEvent(gs, [
      // operand[0]=0xFFFF(self),operand[1]=42(全局 entry → L_42)
      { op: 'raw', opcode: 0x24, operands: [0xFFFF, 42, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoLabel).toBe('L_42')
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(7)   // 本地 ip,非全局 42
    expect(gs.npcs[0]?.autoCursor?.labelMap).toBe(gs.sceneLabelMap) // 来源 = 当前 scene
  })

  it('setAutoScript(0x24):目标在 shared(scene labelMap 没有)→ cursor 指 shared 来源', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    gs.sceneLabelMap = {}                          // scene 没有 → 回退 shared
    const sharedCmds: Command[] = [{ op: 'end' }]
    setSharedEvents(sharedCmds, { L_406: 0 })      // shared labelMap 有 L_406
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x24, operands: [0xFFFF, 406, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(0)
    expect(gs.npcs[0]?.autoCursor?.commands).toBe(sharedCmds) // cursor 指向 shared 脚本来源
    setSharedEvents([], {})  // 复位,避免污染其他用例
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
  it('walkOneStep dir=South(0x0B):facing=down,位移 (-4,+2)(PAL_NPCWalkOneStep iSpeed=2)', () => {
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
    expect(gs.npcs[0]?.x).toBe(96)   // 100 + (-2*2)
    expect(gs.npcs[0]?.y).toBe(52)   // 50 + (1*2)
  })

  it('walkOneStep dir=East(0x0E):facing=right,位移 (+4,+2)', () => {
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
    expect(gs.npcs[0]?.x).toBe(104)  // 100 + (2*2)
    expect(gs.npcs[0]?.y).toBe(52)   // 50 + (1*2)
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

  it('丁大伯:autoLabel 入口在全局数组(sceneLabelMap 解不到)→ tickAutoScripts 走全局兜底解析 autoCursor + 跑', () => {
    // 复刻丁大伯:挥锄 autoScript 入口 entry 36205 在 events/all.json 全局区,不在 scene 切片
    //   labelMap → scene-load 解析失败 → autoCursor undefined → 冻首帧。tickAutoScripts 应走
    //   resolveScriptLabel(scene→shared→global)补解析。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // NPC 有 autoLabel 但无 autoCursor(scene-load 时 sceneLabelMap 无 L_5)
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2, autoLabel: 'L_5' }]
    gs.sceneCommands = [{ op: 'end' }] // 当前 scene 切片(不含 L_5)
    gs.sceneLabelMap = {}
    const globalCmds: Command[] = [
      { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'end', advance: true, label: 'L_5' },                        // 5: 0x01 advance → ip6
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [3, 0, 0] }, // 6: 设帧3
      { op: 'end' },                                                     // 7: park
    ]
    setGlobalEvents(globalCmds)
    try {
      tickAutoScripts(gs)
      // 全局兜底解析 autoCursor 指向全局数组,ip 从 5(L_5)起;首帧 0x01 advance → 6
      expect(gs.npcs[0]?.autoCursor).toBeDefined()
      expect(gs.npcs[0]?.autoCursor?.commands).toBe(globalCmds)
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(6)
    }
    finally {
      setGlobalEvents([]) // 清理模块级注入,避免污染后续测试
    }
  })

  it('0x0002 reset:resetTo 跨文件(labelMap 无)→ 停 autoCursor(不死循环)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    gs.sceneCommands = [{ op: 'end', reset: true, resetTo: 9999, idleFrames: 0 }]
    gs.sceneLabelMap = {} // L_9999 不在本 scene
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('0x04 call-script:autoScript 调子脚本(开门)+ op1 覆盖作用对象 + end 弹帧续跑', () => {
    // 苗人(id 5)autoScript:call 开门子脚本(作用门对象 id 9)→ 子脚本设门 sState→1 → 返回
    // 续跑设自己 gesture。验证:门(id 9)被改、苗人(id 5)续跑、autoCursor 返回主脚本。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 207, sState: 2, autoCursor: { ip: 0 } },
      { id: 9, x: 100, y: 100, spriteNum: 54, sState: 0 },  // 门,初始隐藏
    ]
    gs.sceneCommands = [
      // 主脚本 @0
      { op: 'raw', opcode: OP_CALL_SCRIPT, operands: [50, 10, 0] }, // 0: call L_50,op1=10→对象 id9
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 1: 续跑(作用 self=苗人 5)
      { op: 'end' },                                                // 2: park
      // 子脚本 L_50 @3:把当前作用对象(门 id9)设 sState=1
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0xFFFF, 1, 0], label: 'L_50' }, // 3
      { op: 'end' },                                                // 4: 子脚本 end → 弹帧回 ip1
    ]
    gs.sceneLabelMap = { L_50: 3 }
    tickAutoScripts(gs) // 跑 0x04 → 跳子脚本 ip3
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(3)
    expect(gs.npcs[0]!.autoCursor!.currentEventObjectId).toBe(9) // op1=10 → 作用对象 id9
    tickAutoScripts(gs) // 跑子脚本 0x49[65535]→门 sState=1
    expect(gs.npcs[1]?.sState).toBe(1)  // 门被开(子脚本作用门对象)
    tickAutoScripts(gs) // 子脚本 end → 弹帧回主脚本 ip1
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(1)
    expect(gs.npcs[0]!.autoCursor!.currentEventObjectId).toBeUndefined() // 还原
    tickAutoScripts(gs) // 主脚本 ip1 setObjectGesture 作用 self(苗人 5)
    expect(gs.npcs[0]?.scriptedFrame).toBe(1)
  })

  it('架构统一:条件跳转(0x95 jumpIfScene)在 autoScript 内生效(经 autoCursor,非 gs.eventCursor)', () => {
    // 重构前:jumpToGlobalIp 写死 gs.eventCursor(explore 下 undefined)→ autoScript 条件跳转全失效。
    // 现在 applyRawOpcode 收 cursor → 跳转操作 autoCursor。验证:scene==3 → 跳过哨兵到 L_4。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 3
    const px0 = gs.party.x
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    gs.sceneCommands = [
      { op: 'raw', opcode: 0x95, operands: [3, 4, 0] },                  // 0: scene==3 → jump L_4
      { op: 'raw', opcode: 0x46, operands: [9, 9, 0] },                  // 1: 哨兵 setPartyPos(绝不能跑)
      { op: 'end' },                                                     // 2
      { op: 'end' },                                                     // 3
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0], label: 'L_4' }, // 4
      { op: 'end' },                                                     // 5
    ]
    gs.sceneLabelMap = { L_4: 4 }
    tickAutoScripts(gs) // 0x95 scene==3 → 跳 L_4
    expect(gs.npcs[0]!.autoCursor!.ip).toBe(4)
    tickAutoScripts(gs) // ip4 setObjectGesture → frame 2
    expect(gs.npcs[0]?.scriptedFrame).toBe(2)
    expect(gs.party.x).toBe(px0) // 哨兵 setPartyPos(ip1)从未跑
  })
})

describe('全局脚本兜底 resolveScriptLabel(events/all.json,跨 scene 脚本引用)', () => {
  it('scene/shared 都没有 → 回退 global(李大娘 L_560 等 116 处跨 scene trigger 的根治)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.sceneLabelMap = { L_1: 0 }       // 当前 scene 只有 L_1
    gs.sceneCommands = [{ op: 'end' }]
    setSharedEvents([], {})             // shared 空
    // 全局脚本数组:命令带 label L_560(全局 entry index 1)
    setGlobalEvents([
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: '去去去', label: 'L_560' },
      { op: 'end' },
    ])
    const r = resolveScriptLabel(gs, 'L_560')
    expect(r?.ip).toBe(1)                          // 命中 global 的 index 1
    expect(r?.commands?.[1]?.op).toBe('showDialog') // commands 指向 global 数组
    // scene 优先:scene 有的 label 不会落 global
    const rScene = resolveScriptLabel(gs, 'L_1')
    expect(rScene?.ip).toBe(0)
    expect(rScene?.commands).toBe(gs.sceneCommands)
    setGlobalEvents([])  // 复位
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

describe('0x81 jumpIfNotFacing(用桂花酒对酒剑仙 — 设对象 triggerMode 触发剧情)', () => {
  it('面对 → pCurrent(operand[0] 选的对象,非 self)triggerMode = 5+op1(应用 applyToAll 物品 self=0xFFFF)', () => {
    // facing up 几何:pCurrent.x=116,y=42 → fx=fy=0 命中(< op1*32+16)。
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'up' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 5, x: 116, y: 42, spriteNum: 1, sState: 1, triggerMode: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: 0x81, operands: [6, 1, 999] }, // op0=6→id5,op1=1
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0xFFFF // applyToAll 物品上下文(self 找不到)
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(6) // 5+op1=6,设到 pCurrent(id5)非 self
  })
})

describe('pCurrent(operand[0] 选对象)对象 opcode 类(对齐 sdlpal pCurrent,非 self)', () => {
  it('0x12 setObjectPosRelParty:operand[0] 选对象(非 self)→ 设该对象相对 party 位置', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },   // self(触发者)
      { id: 7, x: 0, y: 0, spriteNum: 1, sState: 1 },   // op0 选的对象
    ]
    loadEvent(gs, [{ op: 'raw', opcode: 0x12, operands: [8, 16, 8] }, { op: 'end' }]) // op0=8→id7
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.x).toBe(116)   // id7 = op1 + party.x(非 self id5)
    expect(gs.npcs[1]?.y).toBe(58)
    expect(gs.npcs[0]?.x).toBe(0)     // self(id5)未动
  })

  it('0x6F syncObjState:pCurrent.sState==op1 → pEvtObj(self).sState=op1', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 0 },   // self(pEvtObj)
      { id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 },   // pCurrent(op0 选)
    ]
    loadEvent(gs, [{ op: 'raw', opcode: 0x6F, operands: [8, 2, 0] }, { op: 'end' }]) // op0=8→id7,op1=2
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(2)  // pCurrent(id7).sState==2 → self(id5).sState=2
  })

  it('0x84 placeUsedItem:把 pCurrent(op0)放 party 正前方 + sState=op1(无障碍)', () => {
    setObstacleChecker(null) // 无 checker → 无障碍
    const gs = createInitialGameState({ x: 200, y: 100, facing: 'right' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    loadEvent(gs, [{ op: 'raw', opcode: 0x84, operands: [8, 1, 999] }, { op: 'end' }]) // op0=8→id7
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(216)     // facing right → party.x + 16
    expect(gs.npcs[0]?.y).toBe(108)     // party.y + 8
    expect(gs.npcs[0]?.sState).toBe(1)  // sState = op1
  })
})

// ── A 类补全(A1:自包含数据/状态 opcode)──────────────────────────────────────
describe('A1 opcode:0x40 setTriggerMethod / 0x55 addMagic / 0x56 removeMagic / 0x9A setMultiState', () => {
  it('0x40 setTriggerMethod:operand[0]=0xFFFF → self;operand[0]=N → pCurrent(object N-1)(script.c:1613-1621 + 624-639)', () => {
    // sdlpal pCurrent 选取(script.c:624-639):operand[0]==0/0xFFFF → self(pEvtObj);
    //   否则 → lprgEventObject[operand[0]-1]。0x40 恒改 self 是旧 bug:水生叔 trigger
    //   `0x40 [124,6]` 本应激活张四(object 124 = id 123),却复位水生叔 → proximity 对话无限循环。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 0 },
      { id: 6, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 0 },
    ]
    const bus = createCommandBus()
    // operand[0]=0xFFFF → self(currentEventObjectId=5)
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [0xFFFF, 4, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(4)  // self id5
    expect(gs.npcs[1]?.triggerMode).toBe(0)  // 未动
    // operand[0]=7 → pCurrent = object[7-1=6] = id6(非 self)
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [7, 6, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerMode).toBe(6)  // pCurrent id6
    expect(gs.npcs[0]?.triggerMode).toBe(4)  // self id5 不变
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

  it('0x9A setMultiState:sdlpal `lprgEventObject[i-1]` for i in [op0..op1](1-based)(script.c:2756)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 6, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    const bus = createCommandBus()
    // P0#2:operands [4,5,2] → i=4→idx3, i=5→idx4 → 设 id 3/4(不是旧错的 id 4/5)
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [4, 5, 2] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs.map((n) => n.sState)).toEqual([2, 2, 1, 1]) // id 3/4 改成 2
  })

  it('0x9A setMultiState:范围内不在当前 scene 的对象走全局表 gs.allEventObjects(同 0x49)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 全局表:id 3..6;当前 scene 只切了 id 4
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 1, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 2, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    gs.npcs = [gs.allEventObjects[4]!] // 当前 scene 只含 id 4(引用)
    const bus = createCommandBus()
    // [4,6,2] → i=4/5/6 → idx 3/4/5 → 设 id 3/4/5,其中 3/5 只在全局表
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [4, 6, 2] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.allEventObjects.map((n) => n.sState)).toEqual([1, 1, 1, 2, 2, 2]) // id 3/4/5 全改(含跨 scene)
  })
})

// ── A 类补全(2026-05-29):0x8F halveCash / 0xA1 setAllPartyPos / 0x8D levelUp / 0x85 delay ──
describe('A 类补全:0x8F / 0xA1 / 0x8D / 0x85', () => {
  it('0x8F halveCash:dwCash /= 2(向下取整)(script.c:2598-2603)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 101
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8f, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)
  })

  it('0xA1 setAllPartyPos:全 trail(5 项)= 队首世界坐标 + 朝向(script.c:2998-3014)', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'left' })
    gs.trail = [{ x: 1, y: 2, dir: 'up' }] // 旧 trail 被覆盖
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0xa1, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.trail).toHaveLength(5)
    for (const t of gs.trail) expect(t).toEqual({ x: 320, y: 240, dir: 'left' })
  })

  it('0x8D increasePlayerLevel:level += op0(clamp 99)+ stat 增长 + Exp 重置(global.c:2347-2409)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwLevel[0] = 5
    r.rgwMaxHP[0] = 100
    r.rgwAttackStrength[0] = 20
    gs.Exp.rgPrimaryExp[0] = { wExp: 999, wLevel: 5 }
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8d, operands: [2, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0 // role 0
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwLevel[0]).toBe(7) // +2
    // 2 级:MaxHP += (10..17)×2 → [120,134];Atk += (4..5)×2 → [28,30]
    expect(r.rgwMaxHP[0]).toBeGreaterThanOrEqual(120)
    expect(r.rgwMaxHP[0]).toBeLessThanOrEqual(134)
    expect(r.rgwAttackStrength[0]).toBeGreaterThanOrEqual(28)
    expect(r.rgwAttackStrength[0]).toBeLessThanOrEqual(30)
    expect(gs.Exp.rgPrimaryExp[0]).toEqual({ wExp: 0, wLevel: 7 }) // 重置 wExp + 同步 level
  })

  it('0x8D level clamp 99', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwLevel[0] = 98
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8d, operands: [5, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(99)
  })

  it('0x85 delay:op0>0 → waiting=delay,到 delayUntilMs 后继续跑后续 opcode(script.c:2511-2516)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    const t0 = 1000
    const spy = vi.spyOn(performance, 'now').mockReturnValue(t0)
    // 0:delay [3] → 240ms;1:halveCash(延迟后继续的证据);2:end
    loadEvent(gs, [
      { op: 'raw', opcode: 0x85, operands: [3, 0, 0] },
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('delay')
    expect(gs.eventCursor?.delayUntilMs).toBe(t0 + 240)
    expect(gs.dwCash).toBe(100) // 还没跑到 halveCash
    // 未到点:仍等
    spy.mockReturnValue(t0 + 100)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('delay')
    expect(gs.dwCash).toBe(100)
    // 到点:清 waiting + 继续跑 halveCash
    spy.mockReturnValue(t0 + 240)
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)
    spy.mockRestore()
  })

  it('0x85 delay op0=0 → 即时(不进 waiting,本 tick 继续)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x85, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50) // op0=0 即时 → 同 tick 跑到 halveCash
  })
})

// ── P0#1(2026-05-29):0x19/0x1A 行索引表错位修复(setAttackStrength 曾误写 MagicStrength)──
describe('0x19/0x1A player-stat 行索引(sdlpal global.h tagPLAYERROLES 真值)', () => {
  it('0x1A setPlayerStat operand[0]=17 → 写 AttackStrength(不是 MagicStrength)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwAttackStrength[0] = 10
    r.rgwMagicStrength[0] = 20
    const bus = createCommandBus()
    // operand: [row=17(AttackStrength), value=99, role+1=1→role0]
    loadEvent(gs, [{ op: 'raw', opcode: 0x1a, operands: [17, 99, 1] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwAttackStrength[0]).toBe(99) // 旧错表会写到 MagicStrength → 这里仍是 10
    expect(r.rgwMagicStrength[0]).toBe(20) // 未被误写
  })

  it('0x19 increasePlayerAttr operand[0]=6 → 加 Level;18 → MagicStrength;31 → CoveredBy', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwLevel[0] = 3
    r.rgwMagicStrength[0] = 5
    r.rgwCoveredBy[0] = 0
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x19, operands: [6, 2, 1] },   // Level += 2
      { op: 'raw', opcode: 0x19, operands: [18, 7, 1] },  // MagicStrength += 7
      { op: 'raw', opcode: 0x1a, operands: [31, 1, 1] },  // CoveredBy = 1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwLevel[0]).toBe(5)
    expect(r.rgwMagicStrength[0]).toBe(12)
    expect(r.rgwCoveredBy[0]).toBe(1) // 旧错表 CoveredBy=28(写不进)→ 仍 0
  })
})

// ── P1#3(2026-05-29):g_fScriptSuccess + 物品延迟消耗 gate(sdlpal play.c:298 / script.c:3187)──
describe('P1#3 g_fScriptSuccess + 物品消耗 gate', () => {
  it('默认 fScriptSuccess=true;0x41 markScriptFailed → false', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.fScriptSuccess).toBe(true)
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x41, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('0x1B HP delta 单体:满血(无变化)→ false;有变化 → 保持 true(script.c:889-892)', () => {
    // 满血:HP=max → +50 不变 → false
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs1.PlayerRolesRuntime.rgwHP[0] = 100
    gs1.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const bus = createCommandBus()
    loadEvent(gs1, [{ op: 'raw', opcode: 0x1b, operands: [0, 50, 0] }, { op: 'end' }])
    gs1.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs1, snap(), bus)
    expect(gs1.fScriptSuccess).toBe(false)
    // 受伤:HP=50 → +50 → 100(变化)→ 仍 true
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.PlayerRolesRuntime.rgwHP[0] = 50
    gs2.PlayerRolesRuntime.rgwMaxHP[0] = 100
    loadEvent(gs2, [{ op: 'raw', opcode: 0x1b, operands: [0, 50, 0] }, { op: 'end' }])
    gs2.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs2, snap(), bus)
    expect(gs2.fScriptSuccess).toBe(true)
    expect(gs2.PlayerRolesRuntime.rgwHP[0]).toBe(100)
  })

  it('0x22 revive 单体:活人(HP!=0)→ false(用复活药在活人身上)(script.c:1099)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwHP[0] = 30
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x22, operands: [0, 5, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.fScriptSuccess).toBe(false)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // 未复活
  })

  it('物品延迟消耗:脚本成功 → 扣 1;脚本 0x41 失败 → 不扣(play.c:298)', () => {
    const bus = createCommandBus()
    // 成功脚本:L_1 = 单条 end(无失败 opcode)
    const gsOk = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsOk.inventory = [{ itemId: 5, count: 3 }]
    gsOk.sceneCommands = [{ op: 'end' }, { op: 'end' }]
    gsOk.sceneLabelMap = { L_1: 1 }
    expect(startOverworldItemScript(gsOk, 5, 1, 0, true)).toBe(true)
    expect(gsOk.pendingItemConsume).toBe(5) // 延迟:还没扣
    expect(gsOk.inventory[0]?.count).toBe(3)
    tickEventSystem(gsOk, snap(), bus)
    expect(gsOk.inventory[0]?.count).toBe(2) // 脚本成功 → 扣 1
    expect(gsOk.pendingItemConsume).toBeUndefined()

    // 失败脚本:L_1 跑 0x41 再 end
    const gsFail = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsFail.inventory = [{ itemId: 5, count: 3 }]
    gsFail.sceneCommands = [{ op: 'end' }, { op: 'raw', opcode: 0x41, operands: [0, 0, 0] }, { op: 'end' }]
    gsFail.sceneLabelMap = { L_1: 1 }
    startOverworldItemScript(gsFail, 5, 1, 0, true)
    tickEventSystem(gsFail, snap(), bus)
    expect(gsFail.inventory[0]?.count).toBe(3) // 脚本失败 → 不扣
    expect(gsFail.pendingItemConsume).toBeUndefined()
  })

  it('applyToAll 物品(0xFFFF)用完 → 关全菜单回 explore(桂花酒);非 applyToAll → 留菜单(INNER 循环)', () => {
    const bus = createCommandBus()
    // applyToAll(targetRoleIdOrAll=0xFFFF):脚本结束应关菜单回 explore,让世界 trigger 触发
    const gsAll = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsAll.menuStack = [{ kind: 'inventory', state: {} }]
    gsAll.sceneCommands = [{ op: 'end' }, { op: 'end' }]
    gsAll.sceneLabelMap = { L_1: 1 }
    startOverworldItemScript(gsAll, 272, 1, 0xFFFF, false) // 桂花酒类:applyToAll consuming=false
    expect(gsAll.itemUseApplyToAll).toBe(true)
    tickEventSystem(gsAll, snap(), bus) // L_1 = end → 脚本结束
    expect(gsAll.mode).toBe('explore')
    expect(gsAll.menuStack).toEqual([])
    expect(gsAll.itemUseApplyToAll).toBeUndefined()

    // 非 applyToAll(role 0):脚本结束 menuStack 非空 → 留 'menu'(ItemUseMenu 反复用)
    const gsOne = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsOne.menuStack = [{ kind: 'inventory', state: {} }]
    gsOne.sceneCommands = [{ op: 'end' }, { op: 'end' }]
    gsOne.sceneLabelMap = { L_1: 1 }
    startOverworldItemScript(gsOne, 5, 1, 0, true)
    expect(gsOne.itemUseApplyToAll).toBe(false)
    tickEventSystem(gsOne, snap(), bus)
    expect(gsOne.mode).toBe('menu')
    expect(gsOne.menuStack.length).toBe(1)
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

  it('onEnter 结束幂等清 sceneLoading(override 入口无 fadeScreen 也不残留)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.sceneLoading = true // P2#7:loadScene 设的"加载期跳渲染"标志(正常已在 loadSceneCommon 清)
    // override 入口 = 已推进过开场的 0x00(无 fadeScreen)
    onEnterCursor(gs, [{ op: 'end' }], 0, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneLoading).toBe(false) // onEnter 结束 → 幂等清(防御:任何路径不残留)
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

  it('runEnterScript:cursor 传入 → 条件跳转(0x95 jumpIfScene)生效(旧版不传 cursor → no-op 走 fall-through)', () => {
    // P2#6c:旧版 runEnterScript 不传 cursor → 跳转类 opcode 在 applyRawOpcode 内 no-op → 走 fall-through
    //   (party 落 x=320)。修后跳转生效 → 走 jump 目标(x=640)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    const commands: Command[] = [
      { op: 'raw', opcode: 0x95, operands: [5, 99, 0] },                 // ip0: scene==5 → jump L_99
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] },               // ip1: fall-through 哨兵(x=320)
      { op: 'end' },                                                     // ip2
      { label: 'L_99', op: 'raw', opcode: 0x46, operands: [20, 20, 0] }, // ip3: jump 目标(x=640)
      { op: 'end' },                                                     // ip4
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0)
    expect(gs.party.x).toBe(640) // 跳转生效;旧版 no-op 会走 ip1 → x=320
  })

  it('loadScene 续跑调用脚本(setPartyPos 不被抛弃)+ 脚本结束才触发 reload(sdlpal 0x59 continue,2026-05-29)', () => {
    // 无 onEnter scene 的 party 位置只能来自 loadScene 后的 setPartyPos(scene 13/wNumScene14 黑屏根因)。
    let loadedScene = -1
    setSceneLoader(async (sid) => { loadedScene = sid })
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 14 },                   // ip0
        { op: 'raw', opcode: 0x46, operands: [21, 55, 0] }, // ip1 setPartyPos(续跑必须执行)
        { op: 'end' },                                      // ip2
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.party.x).toBe(21 * 32) // setPartyPos col21 → x=672(续跑没被抛弃;旧版会丢)
      expect(gs.sceneLoading).toBe(true) // reload 期间保留旧帧
      expect(loadedScene).toBe(14)       // 脚本结束触发延迟 reload
    }
    finally {
      setSceneLoader(null)
    }
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
