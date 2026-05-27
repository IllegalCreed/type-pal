/**
 * M5.6 W0.b:menu mode 输入路由 — 从 menuStack 顶取出 entry,按 entry.kind switch,
 * 把 InputSnapshot.pressed 映射到对应 menu state machine fn(各 menu 文件已 M5 port)。
 *
 * sdlpal 真值:各 PAL_*Menu 函数内部 while loop 调 PAL_ProcessEvent → 读 g_InputState.dwKeyPress
 * → switch kKeyUp/Down/Search/Menu → 调对应 state 修改。ts 端等价拆出为单一帧 dispatch fn,
 * 由 tickMenu(menu-mode.ts)每帧调一次。
 *
 * 当前 W0.a 阶段:dispatcher 仅识别栈顶 'in-game' / 'system' 等 hub kind,各子菜单 dispatch
 * 在 W0.e/f task 内逐个填(inventory / equip / magic / status / save-slot / shop)。
 */

import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { GameState } from '../game-state.js'

export function dispatchMenuInput(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const top = gs.menuStack[gs.menuStack.length - 1]
  if (!top) return

  // 通用 'Menu' 键 = 关栈顶(sdlpal 菜单内 kKeyMenu 即返回上一级 / 关菜单)
  // 各 kind 的 dispatcher 在 W0.b/e/f 内填,会覆盖此默认行为(若需要保留状态等)
  if (input.pressed.has('Menu')) {
    gs.menuStack.pop()
    return
  }
  // 详细 kind dispatcher 占位 — W0.b/e/f 填实
  switch (top.kind) {
    case 'in-game':
    case 'system':
    case 'save-slot':
    case 'inventory':
    case 'equip':
    case 'in-game-magic':
    case 'player-status':
    case 'shop-buy':
    case 'shop-sell':
      // W0.b/e/f 内逐 kind 填实 dispatch handler
      break
  }
  // 静默 bus / input 引用避免 lint 误报(填实时移除)
  void bus
  void input
}
