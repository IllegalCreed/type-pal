/**
 * tickByMode autoScript 调度门(P2#6a,2026-05-29)。
 *
 * sdlpal play.c:169-192:autoScript 循环在每个 PAL_GameUpdate 都跑(无条件)。PAL_GameUpdate 被调:
 * explore 主循环、0x09 wait、脚本控制走路/滚屏/ride(每步 PAL_GameUpdate(FALSE));**不**被调:
 * dialog/fadeScreen/delay/scene 重载(阻塞 spin)。
 * 修:旧版只在 event+frame-wait 跑 → 脚本走路(waiting=undefined)期间 NPC autoScript 冻结。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { setGlobalEvents } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { tickByMode } from './mode.js'

function snap(): InputSnapshot {
  return { held: new Set(), pressed: new Set(), frameNum: 0 }
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
      charsRevealed: 0, phase: 'typing', style: 'bottom', fontColor: 0x4f, shadow: true, keyIconBlink: false,
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
