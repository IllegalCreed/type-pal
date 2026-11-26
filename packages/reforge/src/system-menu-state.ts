// 只推进系统菜单的选项和子面板。浏览存档、写入音频首选项与返回标题交给 MenuSession。
import type { TextId } from '@type-pal/content'

export type SystemItemKind = 'save' | 'load' | 'music' | 'sound' | 'quit'

export interface SystemMenuItem {
  id: SystemItemKind
  label: TextId
  disabled?: boolean // 绘制器使用的禁用样式。固定的五项都可以确认。
}

/** 保留 SDLPal 经典模式的五个入口及其顺序（uigame.c 的 PAL_SystemMenu）。 */
export const SYSTEM_ITEMS: SystemMenuItem[] = [
  { id: 'save', label: 'menu.system.save' },
  { id: 'load', label: 'menu.system.load' },
  { id: 'music', label: 'menu.system.music' },
  { id: 'sound', label: 'menu.system.sound' },
  { id: 'quit', label: 'menu.system.quit' },
]

export interface SystemMenuState {
  active: boolean
  phase: 'menu' | 'confirm' | 'switch'
  items: SystemMenuItem[]
  cursor: number
  /** confirm 阶段:是(true)/否(false),默认否(原版 nDefault=0);switch 阶段:开(true)/关(false),默认当前态。 */
  confirmYes: boolean
  /** switch 阶段切的是哪个开关;其余阶段 undefined(对齐一阶段 in-game-menu.ts switchTarget)。 */
  switchTarget?: 'music' | 'sound'
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
 *  Up|Left = -1、Down|Right = +1(DL21);环绕 (cursor+delta+n)%n。 */
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

export type SystemAction =
  | { kind: 'quit' }
  | { kind: 'open-save' } // 开存档浏览界面·存模式
  | { kind: 'open-load' } // 开存档浏览界面·读模式
  | { kind: 'set-music'; on: boolean } // 音乐开关落定
  | { kind: 'set-sound'; on: boolean } // 音效开关落定

/** menu 阶段确认:按 id 分流 —— save/load → 开浏览界面;quit → 进 confirm;
 *  music/sound → 进 switch 子选单(默认高亮当前开关态,sdlpal PAL_SwitchMenu(fEnabled))。 */
export function systemConfirm(
  s: SystemMenuState,
  audio?: { musicOn: boolean; soundOn: boolean },
): {
  state: SystemMenuState
  action?: SystemAction
} {
  if (s.phase !== 'menu') return { state: s }
  const sel = s.items[s.cursor]
  if (!sel) return { state: s }
  if (sel.id === 'save') return { state: s, action: { kind: 'open-save' } }
  if (sel.id === 'load') return { state: s, action: { kind: 'open-load' } }
  if (sel.id === 'music')
    return {
      state: { ...s, phase: 'switch', switchTarget: 'music', confirmYes: audio?.musicOn ?? true },
    }
  if (sel.id === 'sound')
    return {
      state: { ...s, phase: 'switch', switchTarget: 'sound', confirmYes: audio?.soundOn ?? true },
    }
  return { state: { ...s, phase: 'confirm', confirmYes: false } } // quit → 退出确认
}

/** confirm/switch 阶段四方向 toggle(原版 PAL_SelectionMenu 两框,四方向皆 toggle)。 */
export function systemToggleConfirm(s: SystemMenuState): SystemMenuState {
  if (s.phase !== 'confirm' && s.phase !== 'switch') return s
  return { ...s, confirmYes: !s.confirmYes }
}

/** 交出已选的开关值。MenuSession 应用首选项并返回局内主菜单。 */
export function systemSwitchCommit(s: SystemMenuState): {
  state: SystemMenuState
  action?: SystemAction
} {
  if (s.phase !== 'switch' || !s.switchTarget) return { state: s }
  const kind = s.switchTarget === 'music' ? ('set-music' as const) : ('set-sound' as const)
  return { state: closeSystemMenu(), action: { kind, on: s.confirmYes } }
}

/** 将退出交给宿主。选否则结束系统面板，由 MenuSession 恢复局内主菜单。 */
export function systemConfirmYes(s: SystemMenuState): {
  state: SystemMenuState
  action?: SystemAction
} {
  if (s.phase !== 'confirm') return { state: s }
  if (s.confirmYes) return { state: s, action: { kind: 'quit' } }
  return { state: closeSystemMenu(), action: undefined }
}
