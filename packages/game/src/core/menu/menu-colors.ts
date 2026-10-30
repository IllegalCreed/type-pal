/** 第一阶段菜单项的调色板索引与闪烁规则，参照SDLPal ui.h同名宏。 */
export const MENUITEM_COLOR = 0x4f
export const MENUITEM_COLOR_INACTIVE = 0x18
export const MENUITEM_COLOR_SELECTED_INACTIVE = 0x1c
export const MENUITEM_COLOR_EQUIPPEDITEM = 0xc8
export const MENUITEM_COLOR_SELECTED_FIRST = 0xf9
export const MENUITEM_COLOR_SELECTED_TOTAL = 6

/** 毫秒时钟由caller提供；每100ms推进一色，600ms一轮，不读取系统时钟。 */
export function selectedMenuItemColor(nowMs: number): number {
  return MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(nowMs / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
}
