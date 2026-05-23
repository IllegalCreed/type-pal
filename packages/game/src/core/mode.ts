/**
 * 顶层模式机分发(02 架构)。
 * M2:explore → tickSceneSystem,event → tickEventSystem。
 * M3 (T14):battle → tickBattle(T14 stub,T22 真实现)。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { tickBattle } from './battle/battle-system.js'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'
import { tickEventSystem } from './event-system.js'
import { tickSceneSystem } from './scene-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  gs.frameNum++ // 全局逻辑帧计数器(D13);所有模式都推进
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
