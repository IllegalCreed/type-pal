// 系统菜单状态机(纯逻辑;非视觉)。三阶段 menu/confirm(switch 留接口本期不进)。
// 交互对齐一阶段 game in-game-menu.ts(PAL_SystemMenu)+ menu-driver.ts。
// 范围:5 项框架 + 退出确认;save/load/music/sound 占位(disabled,确认弹 placeholder)。
import type { TextId } from '@type-pal/content'

export type SystemItemKind = 'save' | 'load' | 'music' | 'sound' | 'quit'

export interface SystemMenuItem {
  id: SystemItemKind
  label: TextId
  disabled?: boolean // 占位项(存档/读档/音乐/音效)=true;quit 正常
}

/** 5 项(对齐 sdlpal ui.h SYSMENU_LABEL_* 顺序);前 4 占位(依赖未建子系统),quit 正常。 */
export const SYSTEM_ITEMS: SystemMenuItem[] = [
  { id: 'save', label: 'menu.system.save', disabled: true }, // 占位:存档系统未建
  { id: 'load', label: 'menu.system.load', disabled: true }, // 占位:存档系统未建
  { id: 'music', label: 'menu.system.music', disabled: true }, // 占位:音频系统未建
  { id: 'sound', label: 'menu.system.sound', disabled: true }, // 占位:音频系统未建
  { id: 'quit', label: 'menu.system.quit' }, // 退出(本期"是"=占位提示,无标题屏)
]

export interface SystemMenuState {
  active: boolean
  phase: 'menu' | 'confirm' // 'switch' 类型留口,本期不进(music/sound 占位)
  items: SystemMenuItem[]
  cursor: number
  confirmYes: boolean // confirm 阶段:是(true)/否(false),默认否(原版 nDefault=0)
}

/** openSystemMenu:initialCursor 恢复上次光标(原版 iCurSystemMenuItem);越界 clamp。 */
export function openSystemMenu(initialCursor = 0): SystemMenuState {
  const n = SYSTEM_ITEMS.length
  const cursor = n === 0 ? 0 : Math.min(Math.max(0, initialCursor), n - 1)
  return { active: true, phase: 'menu', items: SYSTEM_ITEMS, cursor, confirmYes: false }
}

export function closeSystemMenu(): SystemMenuState {
  return { active: false, phase: 'menu', items: [], cursor: 0, confirmYes: false }
}

/** menu 阶段导航:单列环绕(对齐一阶段 primitives.moveSelection,非 inventory 多列 clamp)。
 *  Up|Left = -1、Down|Right = +1(DL21);环绕 (cursor+delta+n)%n。
 *  占位项可停(原版 PAL_ReadMenu 光标可停 disabled),确认时 systemConfirm 返 placeholder。 */
export function systemMoveCursor(
  s: SystemMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): SystemMenuState {
  if (s.phase !== 'menu') return s
  const n = s.items.length
  if (n === 0) return s
  const delta = dir === 'up' || dir === 'left' ? -1 : 1
  return { ...s, cursor: (s.cursor + delta + n) % n }
}

export type SystemAction = { kind: 'quit' } | { kind: 'placeholder'; id: SystemItemKind }

/** menu 阶段确认:占位项 → 返回 placeholder(留 menu);quit → 进 confirm。 */
export function systemConfirm(s: SystemMenuState): {
  state: SystemMenuState
  action?: SystemAction
} {
  if (s.phase !== 'menu') return { state: s }
  const sel = s.items[s.cursor]
  if (!sel) return { state: s }
  if (sel.disabled) return { state: s, action: { kind: 'placeholder', id: sel.id } } // 占位 → 不进 confirm
  return { state: { ...s, phase: 'confirm', confirmYes: false }, action: undefined } // quit → confirm(默认否)
}

/** confirm 阶段四方向 toggle 是/否(原版 PAL_SelectionMenu 两框,四方向皆 toggle)。 */
export function systemToggleConfirm(s: SystemMenuState): SystemMenuState {
  if (s.phase !== 'confirm') return s
  return { ...s, confirmYes: !s.confirmYes }
}

/** confirm 确认:是 → quit action(本期占位,main.ts 弹提示);否 → 关菜单。
 *  ⚠ 「否」关菜单后,main.ts 走 menu=back(menu) 回主菜单 hub(不复刻原版「弹回大世界」)。 */
export function systemConfirmYes(s: SystemMenuState): {
  state: SystemMenuState
  action?: SystemAction
} {
  if (s.phase !== 'confirm') return { state: s }
  if (s.confirmYes) return { state: s, action: { kind: 'quit' } } // 是 → 退出(占位)
  return { state: closeSystemMenu(), action: undefined } // 否 → 关菜单(回 hub)
}
