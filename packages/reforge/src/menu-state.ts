import type { TextId } from '@type-pal/content'

export type MenuId = 'main' | 'status' | 'item' | 'magic' | 'system'

export interface MenuState {
  active: boolean
  menu: MenuId
  cursor: number
}

/** 主菜单四项;仅「状态」enabled,其余占位(D17 范围)。 */
export const MAIN_ITEMS: { id: MenuId; label: TextId; enabled: boolean }[] = [
  { id: 'status', label: 'menu.status', enabled: true },
  { id: 'magic', label: 'menu.magic', enabled: true },
  { id: 'item', label: 'menu.item', enabled: false },
  { id: 'system', label: 'menu.system', enabled: false },
]

export const CLOSED: MenuState = { active: false, menu: 'main', cursor: 0 }

export function openMenu(): MenuState {
  return { active: true, menu: 'main', cursor: 0 }
}
export function closeMenu(): MenuState {
  return CLOSED
}
/** 环绕移动(仅 main 列表;子菜单暂无列表导航)。 */
export function moveCursor(s: MenuState, delta: number): MenuState {
  if (s.menu !== 'main') return s
  const n = MAIN_ITEMS.length
  return { ...s, cursor: (s.cursor + delta + n) % n }
}
/** 确认:main 选 enabled 项进子菜单(占位项不动);子菜单暂无动作。 */
export function confirm(s: MenuState): MenuState {
  if (s.menu !== 'main') return s
  const item = MAIN_ITEMS[s.cursor]
  if (item?.enabled === true) return { ...s, menu: item.id, cursor: 0 }
  return s
}
/** 返回:子菜单 → main;main → 关。 */
export function back(s: MenuState): MenuState {
  if (s.menu !== 'main') return { ...s, menu: 'main', cursor: 0 }
  return CLOSED
}
