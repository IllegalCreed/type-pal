/**
 * 顶层模式机分发(02 架构)。
 * M2 只两态:explore → tickSceneSystem,event → tickEventSystem。
 * 注:scene-system / event-system 由 Task 9 / 10 实现,本文件在 Task 8 提交时
 *     typecheck 仍会因缺失模块报错,属预期,Task 9 / 10 落地后即解。
 */

import type { InputSnapshot } from '@type-pal/shared'
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
  }
}
