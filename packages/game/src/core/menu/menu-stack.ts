/** 菜单栈与退出模式；不依赖输入路由/场景/脚本执行器。 */
import type { ActiveMenuEntry, GameState } from '../game-state.js'

/**
 * 所有菜单关闭后切回哪个 mode:
 *  - 战斗中开的状态屏(gs.battleState 仍在)→ 回 mode='battle' 续选动作
 *    (sdlpal PAL_PlayerStatus 战斗内调用返回后回战斗 UI,uibattle.c:930-934/1399-1401)。
 *  - 商店菜单(opcode 0x26/0x27 开,cursor.waiting='shop')→ 续跑脚本(mode='event' + 清 waiting),
 *    对齐 sdlpal PAL_BuyMenu 返回后脚本继续(script.c:1163)。
 *  - 否则(玩家自己开的 in-game/inventory 等)→ 回 explore。
 */
export function resumeAfterMenusClosed(gs: GameState): void {
  if (gs.battleState) {
    gs.mode = 'battle'
  } else if (gs.eventCursor?.waiting === 'shop') {
    gs.eventCursor.waiting = undefined
    gs.mode = 'event'
  } else {
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
