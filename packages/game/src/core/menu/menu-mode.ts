/**
 * M5.6 W0.a:大世界 menu mode tick + 栈操作 helper。
 *
 * sdlpal `PAL_InGameMenu` / `PAL_SystemMenu` 等是 modal blocking 函数,
 * 内部 while loop 调 `PAL_ProcessEvent` 直到用户按 ESC/Confirm 退出。
 * ts 端用 gs.mode='menu' + gs.menuStack 显式化此栈,逐 tick 推进:
 *   - 栈空 → 切回 'explore'
 *   - 栈顶 entry.kind 决定 dispatch 哪个 menu 的输入处理
 *
 * Push/pop 不在这里 — 由 scene-system(开菜单)+ menu-driver(子菜单进出)调用 openMenu / closeTopMenu。
 */

import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { ActiveMenuEntry, GameState } from '../game-state.js'
import { dispatchMenuInput } from './menu-driver.js'

export function tickMenu(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  // 栈空(可能由前一帧 closeTopMenu 清空)→ 立即切回 explore
  if (gs.menuStack.length === 0) {
    gs.mode = 'explore'
    return
  }
  // dispatch 输入到当前栈顶 menu;dispatcher 可能调 closeTopMenu / openMenu 改栈
  dispatchMenuInput(gs, input, bus)
  // dispatch 后再次 sync mode(若 dispatcher 关掉了所有菜单)
  if (gs.menuStack.length === 0) {
    gs.mode = 'explore'
  }
}

/** 开新菜单:push 到栈顶 + 切 mode='menu'。scene-system 收到 'Menu' 键时调。 */
export function openMenu(gs: GameState, entry: ActiveMenuEntry): void {
  gs.menuStack.push(entry)
  gs.mode = 'menu'
}

/** 关栈顶菜单。若栈空,tickMenu 下帧自动切回 'explore'(避免本帧 mode flip 影响 dispatch)。 */
export function closeTopMenu(gs: GameState): void {
  gs.menuStack.pop()
}
