/**
 * M5.6 T10d:PlayerStatus state machine — sdlpal `uigame.c:1051-1286` PAL_PlayerStatus 真值。
 *
 * sdlpal 真值(1:1):
 *  - `iCurrent = 0` → 0..gpGlobals->wMaxPartyMemberIndex 循环遍历 party 成员
 *  - 每次循环 fullscreen 渲染对应 player(`gpGlobals->rgParty[iCurrent].wPlayerRole`)
 *    的:FBP chunk 0 背景 + RGM 头像(`rgwAvatar[role]`)+ 6 装备槽 + 4 EXP/Lv/HP/MP 标签
 *    + 5 stat 标签(Atk/Mag/Res/Dex/Flee)+ 数字 + 毒素 row + roleName
 *  - 输入循环(uigame.c:1265-1284):
 *      kKeyMenu        → iCurrent = -1 → break 外循环(关菜单)
 *      kKeyLeft/Up     → iCurrent-- → 上个 party 成员
 *      kKeyRight/Down/Search → iCurrent++ → 下个 party 成员
 *    cursor 越界(<0 或 > wMaxPartyMemberIndex)外循环 while 条件 false → break 关菜单。
 *
 * sdlpal **没有**"属性页 / 装备页 / 法术页"切换的概念 — 一屏整布局 9 stat + 6 装备 + 头像
 * 同时显示。v1 ts 简版 `page='attribute'|'equipment'|'magic'` 是错的(用户截图打脸已删)。
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

/** 当前 cursor 对应 role id;done 状态返回 undefined。 */
export function currentRoleId(s: PlayerStatusState): number | undefined {
  if (s.done) return undefined
  return s.partyMembers[s.cursor]
}
