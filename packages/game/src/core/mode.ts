/**
 * 顶层模式调度：统一推进逻辑帧和允许的场景自动脚本，再交给当前模式的 Owner。
 * 战斗/菜单返回事件脚本时同帧续跑到等待点，避免呈现一帧未推进的场景。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { tickBattle } from './battle/battle-system.js'
import type { CommandBus } from './command-bus.js'
import {
  tickAutoScripts,
  tickChaseTimer,
  tickEventSystem,
  tickSceneAutoFadeIn,
} from './event-system.js'
import type { GameState } from './game-state.js'
import { tickMenu } from './menu/menu-mode.js'
import { tickSceneSystem } from './scene-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  gs.frameNum++ // 全局逻辑帧计数器(D13);所有模式都推进

  // PAL_MakeScene 的自动淡入可能冻结探索；先交给 event-system 判断当前等待点是否会绘制场景。
  tickSceneAutoFadeIn(gs)

  // PAL_GameUpdate 每次调用都跑自动脚本和追逐计时（play.c:169-238）。探索模式由 scene-system
  // 按 trigger→autoScript→party 的顺序处理；这里仅补 event 模式的逐帧等待/走路/滚屏。
  // 对话、delay、fadeScreen、paletteFade 和场景重载是阻塞操作，不能偷跑 NPC 或消耗追逐周期。
  const waiting = gs.eventCursor?.waiting
  const shouldRunAutoScripts =
    !gs.sceneLoading &&
    gs.mode === 'event' &&
    (waiting === undefined ||
      waiting === 'frame-wait' ||
      waiting === 'scene-fade' ||
      waiting === 'camera-pan')
  if (shouldRunAutoScripts) {
    tickAutoScripts(gs)
    tickChaseTimer(gs)
  }

  const prevMode = gs.mode
  switch (gs.mode) {
    case 'explore':
      tickSceneSystem(gs, input)
      break
    case 'event':
      tickEventSystem(gs, input)
      break
    case 'battle':
      tickBattle(gs, input, bus)
      break
    case 'menu':
      tickMenu(gs, input)
      break
  }

  // 原 C 的战斗/菜单同步返回后，调用栈会立即续跑事件。这里同帧推进到首个等待点，
  // 让战后隐藏怪物、菜单物品效果等先于下一次呈现生效，避免露出一帧旧场景或消失的菜单。
  // tickEventSystem 新建对话时会先设置 waiting，不会再消费本帧已用于确认菜单的按键。
  if ((prevMode === 'battle' || prevMode === 'menu') && gs.mode === 'event') {
    tickEventSystem(gs, input)
  }
}
