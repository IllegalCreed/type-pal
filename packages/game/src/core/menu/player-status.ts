/**
 * PlayerStatus state machine — sdlpal `uigame.c:1051-1286` PAL_PlayerStatus。
 *
 * 状态只持有队伍位置；头像、装备和属性的全屏布局由 draw-player-status 负责。
 *  - `iCurrent = 0` → 0..gpGlobals->wMaxPartyMemberIndex 循环遍历 party 成员
 *  - 输入循环(uigame.c:1265-1284):
 *      kKeyMenu        → iCurrent = -1 → break 外循环(关菜单)
 *      kKeyLeft/Up     → iCurrent-- → 上个 party 成员
 *      kKeyRight/Down/Search → iCurrent++ → 下个 party 成员
 *    cursor 越界(<0 或 > wMaxPartyMemberIndex)外循环 while 条件 false → break 关菜单。
 *
 * SDLPal 在同一屏显示全部信息，没有属性／装备／法术子页。
 */

export interface PlayerStatusState {
  /** 当前 party 成员索引(sdlpal `iCurrent`)。 */
  cursor: number
  /** partyMembers 数组(roleId 列表)— close 判断用 length。 */
  partyMembers: number[]
  /**
   * 退出标志(sdlpal `iCurrent = -1` 或越界 → break 等价)。
   * dispatcher(menu-driver)检测后 closeTopMenu;state 自身不直接 mutate menuStack。
   */
  done: boolean
}

export function createPlayerStatus(partyMembers: number[]): PlayerStatusState {
  return { cursor: 0, partyMembers: [...partyMembers], done: partyMembers.length === 0 }
}

/** sdlpal uigame.c:1276 — kKeyLeft | kKeyUp → iCurrent--;越界关菜单。 */
export function playerStatusPrev(s: PlayerStatusState): void {
  if (s.done) return
  s.cursor--
  if (s.cursor < 0) s.done = true
}

/** sdlpal uigame.c:1281 — kKeyRight | kKeyDown | kKeySearch → iCurrent++;越界关菜单。 */
export function playerStatusNext(s: PlayerStatusState): void {
  if (s.done) return
  s.cursor++
  if (s.cursor >= s.partyMembers.length) s.done = true
}

/** sdlpal uigame.c:1271 — kKeyMenu → iCurrent = -1 直接退。 */
export function playerStatusCancel(s: PlayerStatusState): void {
  s.done = true
}
