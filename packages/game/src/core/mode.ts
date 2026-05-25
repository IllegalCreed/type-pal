/**
 * 顶层模式机分发(02 架构)。
 * M2:explore → tickSceneSystem,event → tickEventSystem。
 * M3 (T14):battle → tickBattle(T14 stub,T22 真实现)。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { tickBattle } from './battle/battle-system.js'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'
import { tickAutoScripts, tickEventSystem } from './event-system.js'
import { tickSceneSystem } from './scene-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  gs.frameNum++ // 全局逻辑帧计数器(D13);所有模式都推进

  // port sdlpal `PAL_GameUpdate` 调度真值:autoScript 只在两处被调:
  //   - 主循环每帧(= explore mode)
  //   - opcode 0x09 wait N frames 内每帧 PAL_GameUpdate(= event mode + waiting='frame-wait')
  // dialog/fade/scene-load yield 期间 PAL_GameUpdate 不调 → autoScript 暂停(对应"对话期间
  // NPC 停止"的视觉)。
  const cursor = gs.eventCursor
  const shouldRunAutoScripts =
    gs.mode === 'explore'
    || (gs.mode === 'event' && cursor?.waiting === 'frame-wait')
  if (shouldRunAutoScripts) {
    tickAutoScripts(gs)
  }

  switch (gs.mode) {
    case 'explore':
      tickSceneSystem(gs, input, bus)
      break
    case 'event':
      tickEventSystem(gs, input, bus)
      break
    case 'battle':
      tickBattle(gs, input, bus)
      break
  }
}
