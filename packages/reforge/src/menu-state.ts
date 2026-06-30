import type { TextId } from '@type-pal/content'

/** 叶子菜单打开的功能面板。 */
export type PanelId = 'status' | 'magic' | 'equip' | 'use' | 'system'

/** 菜单节点:有 children = 子菜单(级联展开);有 panel = 叶子打开面板。改这棵树 = 调菜单。 */
export interface MenuNode {
  id: string
  label: TextId
  enabled?: boolean // 默认 true
  children?: MenuNode[]
  panel?: PanelId
}

/** 主菜单树。状态/仙术 已建;物品 → 装备/使用(二级);系统 待建。 */
export const MAIN_MENU: MenuNode[] = [
  { id: 'status', label: 'menu.status', panel: 'status' },
  { id: 'magic', label: 'menu.magic', panel: 'magic' },
  {
    id: 'item',
    label: 'menu.item',
    children: [
      { id: 'equip', label: 'menu.equip', panel: 'equip' },
      { id: 'use', label: 'menu.use', panel: 'use' },
    ],
  },
  { id: 'system', label: 'menu.system', panel: 'system' },
]

interface MenuLevel {
  nodes: MenuNode[]
  cursor: number
}

/** 多级菜单态:级联栈 + 叶子面板。stack[0]=主菜单,末层=当前导航层;openPanel 有值=面板打开(导航暂停)。 */
export interface MenuState {
  active: boolean
  stack: MenuLevel[]
  openPanel?: PanelId
}

export const CLOSED: MenuState = { active: false, stack: [] }

export function openMenu(): MenuState {
  return { active: true, stack: [{ nodes: MAIN_MENU, cursor: 0 }] }
}

export function closeMenu(): MenuState {
  return CLOSED
}

/** 当前末层(导航层)。 */
export function topLevel(s: MenuState): MenuLevel | undefined {
  return s.stack[s.stack.length - 1]
}

/** 末层光标环绕移动(面板打开时不动)。 */
export function moveCursor(s: MenuState, delta: number): MenuState {
  if (s.openPanel) return s
  const top = topLevel(s)
  if (!top) return s
  const n = top.nodes.length
  const cursor = (top.cursor + delta + n) % n
  return { ...s, stack: [...s.stack.slice(0, -1), { ...top, cursor }] }
}

/** 确认:有 children → 压栈展开子菜单;叶子 panel → 开面板;disabled / 面板已开 → 不动。 */
export function confirm(s: MenuState): MenuState {
  if (s.openPanel) return s
  const top = topLevel(s)
  const node = top?.nodes[top.cursor]
  if (!node || node.enabled === false) return s
  if (node.children && node.children.length > 0) {
    return { ...s, stack: [...s.stack, { nodes: node.children, cursor: 0 }] }
  }
  if (node.panel) return { ...s, openPanel: node.panel }
  return s
}

/** 返回:面板打开 → 关面板;多层 → 弹栈;单层 → 关菜单。 */
export function back(s: MenuState): MenuState {
  if (s.openPanel) {
    const { openPanel: _drop, ...rest } = s
    return rest
  }
  if (s.stack.length > 1) return { ...s, stack: s.stack.slice(0, -1) }
  return CLOSED
}
