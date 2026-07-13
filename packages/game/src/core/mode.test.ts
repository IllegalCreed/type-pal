/**
 * tickByMode event-mode autoScript 调度门(P2#6a,2026-05-29)。
 *
 * sdlpal play.c:169-192:autoScript 循环在每个 PAL_GameUpdate 都跑(无条件)。PAL_GameUpdate 被调:
 * explore 主循环、0x09 wait、脚本控制走路/滚屏/ride(每步 PAL_GameUpdate(FALSE));**不**被调:
 * dialog/fadeScreen/delay/scene 重载(阻塞 spin)。
 * explore 主循环的 PAL_StartFrame 顺序在 scene-system 内测;本文件只覆盖 event 模式 gate,
 * 防止脚本走路(waiting=undefined)期间 NPC autoScript 冻结。
 */

import type { InputSnapshot, Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  OP_FADE_IN,
  OP_PARTY_WALK_TO,
  OP_SHOW_FBP,
  setGlobalEvents,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { tickByMode } from './mode.js'

function snap(): InputSnapshot {
  return { held: new Set(), pressed: new Set(), frameNum: 0 }
}

/**
 * Bug1 fix(2026-06-26):模拟主循环每 tick 推进 100ms 墙钟(gs.nowMs),让 wall-clock 打字推进。
 * 旧测试靠"每 tick=100ms 打字"的隐含语义,改 wall-clock 后必须显式推 gs.nowMs。
 * now 从 1000 起(避免 lineStartMs=0 的缺省回退路径被误触发)。
 */
function tickWithTime(gs: GameState, ms = 100): void {
  gs.nowMs += ms
  tickByMode(gs, snap(), createCommandBus())
}

function palette(c: [number, number, number]): Palette {
  return {
    colors: Array.from({ length: 256 }, () => [...c] as [number, number, number]),
    cycles: [],
  }
}

/**
 * 装一个 autoScript NPC:autoCursor.ip=0,**全局**脚本 [0]=end advance(跑一下就 ip++ 到 1)。
 * P2#5(单一全局脚本数组):autoCursor 不带 commands → 默认读 _globalCommands,故须 setGlobalEvents
 * 注册全局数组(tickAutoScripts 在全局数组为空时早返回)。
 */
function gsWithAutoNpc(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
  // P2#5:cursor.ip=0 是全局下标 → 注册全局数组([0]=end advance,跑一帧 ip++ 到 1)。
  setGlobalEvents([{ op: 'end', advance: true }, { op: 'end' }])
  return gs
}

describe('tickByMode autoScript gate (P2#6a)', () => {
  it('event 模式 + waiting=undefined(脚本步进:party-walk 等)→ autoScript 跑(NPC 不冻)', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.eventCursor = { commands: [{ op: 'end' }], labelMap: {}, ip: 0 } // waiting=undefined
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1) // autoScript 推进了(0x01 advance)
  })

  it('event 模式 + waiting=frame-wait(0x09)→ autoScript 跑', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.eventCursor = {
      commands: [{ op: 'end' }],
      labelMap: {},
      ip: 0,
      waiting: 'frame-wait',
      waitFramesRemaining: 5,
    }
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1)
  })

  it('M4:event 模式 + waiting=camera-pan(0x7F 相对 pan)→ autoScript 跑(script.c:2364)', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.eventCursor = {
      commands: [{ op: 'end' }],
      labelMap: {},
      ip: 0,
      waiting: 'camera-pan',
      cameraPanDx: 0,
      cameraPanDy: 0,
      cameraPanFramesRemaining: 5,
    }
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1) // pan 期间 autoScript 不冻(C 每帧 PAL_GameUpdate)
  })

  it('event 模式 + waiting=dialog(对话阻塞)→ autoScript **不**跑(NPC 停)', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.eventCursor = { commands: [{ op: 'end' }], labelMap: {}, ip: 0, waiting: 'dialog' }
    gs.dialogBox = {
      titleText: undefined,
      shownLines: [],
      currentLineText: '在',
      typingFrames: 0,
      charsRevealed: 0,
      dialogLineCount: 1,
      phase: 'typing',
      style: 'bottom',
      fontColor: 0x4f,
      shadow: true,
      keyIconBlink: false,
    }
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(0) // 未推进
  })

  it('sceneLoading=true(切场景冻屏)→ autoScript **不**跑', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.sceneLoading = true
    gs.eventCursor = { commands: [{ op: 'end' }], labelMap: {}, ip: 0 }
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(0) // 未推进
  })
})

describe('tickByMode auto fade-in gate', () => {
  it('水月宫:0x50→0x76 黑屏后,waiting 空档不抢先淡入;居中字 + 0x51 期间 blackScreenHold 撑住(场景靠后续 0x73 揭)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.palette = palette([0, 0, 0])
    gs.basePalette = palette([180, 120, 60])
    gs.needToFadeIn = true
    gs.blackScreenHold = true
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_SHOW_FBP, operands: [0xffff, 0, 0] },
        { op: 'setDialogStyleCenter' },
        { op: 'showDialog', messageIndex: 1774, text: '"一夜过去．．"~40' },
        { op: 'raw', opcode: OP_FADE_IN, operands: [0, 0, 0] },
        { op: 'end' },
      ],
      labelMap: {},
      ip: 1,
    }

    // 模拟 0x76 handler 已把屏幕清黑、ip++、释放 waiting,下一帧进入顶层 mode 调度。
    gs.nowMs = 1000
    tickByMode(gs, snap(), createCommandBus()) // nowMs=1000 锚点
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.blackScreenHold).toBe(true)
    expect(gs.dialogBox?.style).toBe('center')
    expect(gs.dialogBox?.currentLineText).toBe('一夜过去．．')
    expect(gs.eventCursor?.waiting).toBe('dialog')

    // 居中字结束后才执行脚本里的 0x51 FadeIn。
    // Bug1 fix:旧 hack typingFrames=999(旧 tick 语义),改 wall-clock 推进 nowMs 超过 doneAt(601)。
    gs.nowMs = 1000 + 700 // 相对行起 700ms > 601 doneAt → 尾暂停结束
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.dialogBox?.lineDoneRenderPending).toBe(false)
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(false)
    // 0x51 FadeIn 只 ramp 调色板、**不**清 blackScreenHold(2026-06-08 修):内容仍 index0 黑 → 字幕保持黑屏。
    //   "一夜过去"的场景靠之后的 0x73 fadeScreen(PAL_MakeScene)才揭(不在本截断脚本里)。
    expect(gs.blackScreenHold).toBe(true)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([180, 120, 60])
  })

  it('水月宫:`一夜过去~40` 尾暂停结束后先保留完整文字一帧,下 tick 才执行 0x51', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.palette = palette([0, 0, 0])
    gs.basePalette = palette([180, 120, 60])
    gs.needToFadeIn = true
    gs.blackScreenHold = true
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_SHOW_FBP, operands: [0xffff, 0, 0] },
        { op: 'setDialogStyleCenter' },
        { op: 'showDialog', messageIndex: 1774, text: '"一夜过去．．"~40' },
        { op: 'raw', opcode: OP_FADE_IN, operands: [0, 0, 0] },
        { op: 'end' },
      ],
      labelMap: {},
      ip: 1,
    }

    gs.nowMs = 1000
    tickByMode(gs, snap(), createCommandBus()) // set style + show dialog(nowMs=1000 锚点)
    expect(gs.eventCursor?.waiting).toBe('dialog')

    // Bug1 fix:wall-clock 打字。6 字×24ms=144ms + ~40 尾停 457ms = doneAt 601。
    //   推进到 1600(=1000+600 < 601 doneAt,相对行起 600ms)→ 整句已出但尾暂停未结束。
    for (let i = 0; i < 6; i++) tickWithTime(gs) // nowMs: 1100..1600,相对行起 100..600ms
    expect(gs.dialogBox?.currentLineText).toBe('一夜过去．．')
    expect(gs.dialogBox?.charsRevealed).toBe(6)
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.paletteFadeState).toBeUndefined()

    tickWithTime(gs) // nowMs=1700,相对行起 700ms > 601 → 尾暂停结束:保留完整文字给 present 渲染一帧
    expect(gs.dialogBox?.phase).toBe('line-done')
    expect(gs.dialogBox?.lineDoneRenderPending).toBe(false)
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.paletteFadeState).toBeUndefined()

    tickWithTime(gs) // 下一 tick 才续跑到 0x51
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([180, 120, 60])
  })

  // 厨房李大娘"当夜"/"次日"(scene-020 L_2920 / all.json):字幕序列 = ...FadeOut/SceneFade → 0x76 ShowFBP(黑)
  //   → **0x51 FadeIn → showDialog 字幕(无 setDialogStyle)**。与"一夜过去"(FadeIn 在字幕**后**)相反:
  //   FadeIn 在字幕**前**。sdlpal:0x51 只淡 palette、内容仍 index0 黑,场景靠之后 loadScene/PAL_MakeScene 才揭 →
  //   字幕必须仍在黑屏上、无头像。user 2026-06-08 报"黑屏没了背景出来 + 李大娘头像说当夜"。
  it('当夜/次日:0x76→0x51 FadeIn 不揭场景(blackScreenHold 撑住)+ ShowFBP 清残留头像', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.palette = palette([0, 0, 0])
    gs.basePalette = palette([180, 120, 60])
    // 前一段李大娘 bottom 对话残留的 style/portrait(当夜字幕前无 setDialogStyle → 沿用)
    gs.currentDialogStyle = 'bottom'
    gs.currentDialogPortraitIcon = 55
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_SHOW_FBP, operands: [0xffff, 0, 0] },
        { op: 'raw', opcode: OP_FADE_IN, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 1031, text: '"　　　　　当夜．．"' },
        { op: 'end' },
      ],
      labelMap: {},
      ip: 0,
    }

    // 一 tick:ShowFBP(无 handler → blackScreenHold=true + 清头像 + ip++)→ 同 tick 续跑 0x51 FadeIn
    tickEventSystem(gs, snap(), createCommandBus())
    // 0x51 FadeIn 启 palette ramp 但 **不**清 blackScreenHold(内容仍黑,场景靠后续 MakeScene 揭)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.blackScreenHold).toBe(true)
    // ShowFBP 刷黑 = sdlpal 把屏上头像一并抹掉 → 残留头像清空,"当夜"showDialog 建框时 portraitIcon=undefined
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
  })

  it('event+frame-wait 仍可按 PAL_MakeScene 自动淡入', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.palette = palette([0, 0, 0])
    gs.basePalette = palette([90, 60, 30])
    gs.needToFadeIn = true
    gs.eventCursor = {
      commands: [{ op: 'end' }],
      labelMap: {},
      ip: 0,
      waiting: 'frame-wait',
      waitFramesRemaining: 2,
    }

    tickByMode(gs, snap(), createCommandBus())
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([90, 60, 30])
  })

  it('event+undefined 只有当前 opcode 会 MakeScene(PartyWalkTo 等)时才自动淡入', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.palette = palette([0, 0, 0])
    gs.basePalette = palette([70, 50, 30])
    gs.needToFadeIn = true
    gs.eventCursor = {
      commands: [{ op: 'raw', opcode: OP_PARTY_WALK_TO, operands: [1, 1, 0] }],
      labelMap: {},
      ip: 0,
    }

    tickByMode(gs, snap(), createCommandBus())
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([70, 50, 30])
  })
})
