/**
 * tickByMode autoScript 调度门(P2#6a,2026-05-29)。
 *
 * sdlpal play.c:169-192:autoScript 循环在每个 PAL_GameUpdate 都跑(无条件)。PAL_GameUpdate 被调:
 * explore 主循环、0x09 wait、脚本控制走路/滚屏/ride(每步 PAL_GameUpdate(FALSE));**不**被调:
 * dialog/fadeScreen/delay/scene 重载(阻塞 spin)。
 * 修:旧版只在 event+frame-wait 跑 → 脚本走路(waiting=undefined)期间 NPC autoScript 冻结。
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

function palette(c: [number, number, number]): Palette {
  return { colors: Array.from({ length: 256 }, () => [...c] as [number, number, number]), cycles: [] }
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
    gs.eventCursor = { commands: [{ op: 'end' }], labelMap: {}, ip: 0, waiting: 'frame-wait', waitFramesRemaining: 5 }
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1)
  })

  it('event 模式 + waiting=dialog(对话阻塞)→ autoScript **不**跑(NPC 停)', () => {
    const gs = gsWithAutoNpc()
    gs.mode = 'event'
    gs.eventCursor = { commands: [{ op: 'end' }], labelMap: {}, ip: 0, waiting: 'dialog' }
    gs.dialogBox = {
      titleText: undefined, shownLines: [], currentLineText: '在', typingFrames: 0,
      charsRevealed: 0, dialogLineCount: 1, phase: 'typing', style: 'bottom', fontColor: 0x4f, shadow: true, keyIconBlink: false,
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
  it('水月宫:0x50→0x76 黑屏后,waiting 空档不抢先淡入;等居中字后 0x51 再亮屏', () => {
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
    tickByMode(gs, snap(), createCommandBus())
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.blackScreenHold).toBe(true)
    expect(gs.dialogBox?.style).toBe('center')
    expect(gs.dialogBox?.currentLineText).toBe('一夜过去．．')
    expect(gs.eventCursor?.waiting).toBe('dialog')

    // 居中字结束后才执行脚本里的 0x51 FadeIn。
    gs.dialogBox!.typingFrames = 999
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([180, 120, 60])
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
