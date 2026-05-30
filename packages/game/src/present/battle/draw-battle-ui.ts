/**
 * 战斗 UI 渲染(M3 T26)。
 *
 * 主菜单(攻击 / 法术 / 物品 / 防御 / 逃跑)+ 二级菜单(法术 / 物品)+
 * 目标光标 + HP/MP 数字。`uiState` 决定画什么:
 *   - `mainMenu`     —— 5 项主菜单
 *   - `magicMenu`    —— 队员已学法术列表(M3 简版,前 5 个)
 *   - `itemMenu`     —— 持有物品列表(M3 简版,前 5 个)
 *   - `targetSelect` —— 敌方位置上方画 ▽(M3 简版,只画 enemy 目标)
 *   - `hidden`       —— 选择阶段以外不画菜单
 *
 * HP / MP 数字 + 队员名:每帧固定显示(屏幕底部状态栏)。
 *
 * 文字渲染依赖 M2 `renderText(fb, text, x, y, colorIndex)`(色块占位版,
 * 真字形 M3+ 替换);颜色用 PAL 索引 1(白色,FBP 调色板下能见)。
 *
 * **本 task 不处理输入** —— UI 只画。input 推 T27;dev panel 整合推 T29。
 *
 * 关键简化(实施过程发现 #N 留 M5 / M6 补全):
 *   - learnedSpells 不在 PlayerRole schema —— 通过 `(role as any).learnedSpells`
 *     兼容 T29 dev panel 临时附加。schema 真补到 PlayerRoles 推 M5。
 *   - target kind 默认 enemy —— spell.type=applyToPlayer / applyToParty 的目标光标
 *     落在队员位置上的逻辑推 M5。
 *   - 字符用 ASCII '>' / 'v' —— Unifont CN 子集对真 Unicode '▶' / '▽' 的覆盖
 *     M2 占位版本不验证,色块占位下任何字符都画一个 8×16 框。
 */

import type { Item, PlayerRoles, Spell } from '@type-pal/shared'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { GameState } from '../../core/game-state.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

/** PAL 索引 1 —— 白色(M3 战斗 UI 默认前景色)。M5 时按 sdlpal `MENUITEM_COLOR_*` 真值。 */
const UI_TEXT_COLOR = 1

const MAIN_MENU: ReadonlyArray<{ label: string, action: string }> = [
  { label: '攻击', action: 'attack' },
  { label: '法术', action: 'magic' },
  { label: '物品', action: 'item' },
  { label: '防御', action: 'defend' },
  { label: '逃跑', action: 'flee' },
]

/**
 * 敌方位置(与 draw-battle-sprites.ts ENEMY_POSITIONS 对齐 —— M3 简版 5 槽)。
 * targetSelect 光标的 anchor 取自该数组。
 */
const ENEMY_POSITIONS: ReadonlyArray<{ x: number, y: number }> = [
  { x: 160, y: 80 },
  { x: 100, y: 60 }, { x: 220, y: 60 },
  { x: 70, y: 90 }, { x: 250, y: 90 },
]

/**
 * 队员状态栏位置(屏幕底部一行,每人 60px 间距)。
 * 与 draw-battle-sprites PLAYER_POSITIONS y=145-160 错开,状态栏在更下方。
 */
const PARTY_STATUS_BASE_X = 5
const PARTY_STATUS_BASE_Y = 175
const PARTY_STATUS_STRIDE_X = 60

/** 主菜单 / 二级菜单的统一锚点。 */
const MENU_BASE_X = 5
const MENU_BASE_Y = 5
const MENU_ITEM_STRIDE_Y = 12
/** 法术/物品二级菜单一屏可见条数(超过则滚动窗口)。 */
const MENU_VISIBLE = 5

/**
 * 滚动窗口起点:5 条窗口尽量把 `cursor` 放中间,夹在 [0, len-VISIBLE]。
 * 短列表(≤5)→ 0(行为同旧 slice(0,5))。
 */
function menuWindowStart(cursor: number, len: number): number {
  return Math.min(Math.max(0, cursor - 2), Math.max(0, len - MENU_VISIBLE))
}

/** 目标光标在敌方 anchor 上方的偏移。 */
const TARGET_CURSOR_DY = -50
const TARGET_CURSOR_DX = -4

/**
 * 画战斗 UI。每帧调用一次(在 bg + sprites 之上)。
 *
 * - 队员状态栏:每帧固定显示(不受 uiState 影响)。
 * - 菜单 / 光标:按 uiState 分支画。
 *
 * @param fb 屏幕 framebuffer(320×200 索引)。
 * @param state BattleState(读 uiState / uiCursor / selectingPlayerIdx / players / enemies)。
 * @param playerRoles 角色表(显示 _name / hp / mp / maxHP / maxMP)。
 * @param spells 法术表(magicMenu 时查 _name)。
 * @param items 物品表(itemMenu 时查 _name)。
 * @param gs GameState(itemMenu 时读 inventory)。
 */
export function drawBattleUI(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  spells: Spell[],
  items: Item[],
  gs: GameState,
  glyphs?: GlyphTable,
): void {
  drawPartyStatus(fb, state, playerRoles, glyphs)
  switch (state.uiState) {
    case 'mainMenu':
      drawMainMenu(fb, state, playerRoles, glyphs)
      break
    case 'magicMenu':
      drawMagicMenu(fb, state, playerRoles, spells, glyphs)
      break
    case 'itemMenu':
      drawItemMenu(fb, state, items, gs, glyphs)
      break
    case 'targetSelect':
      drawTargetCursor(fb, state, glyphs)
      break
    case 'hidden':
      break
  }
}

/**
 * 屏幕底部状态栏:每个 party 成员显示 名字 / HP / MP。
 *
 * - role 找不到(fixture 错配)→ 跳过该位(不抛)。
 * - 超过 5 个成员的位置默认 stride 计算,屏外会被 framebuffer.writePixel clip。
 */
function drawPartyStatus(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  glyphs?: GlyphTable,
): void {
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role) return
    const x = PARTY_STATUS_BASE_X + i * PARTY_STATUS_STRIDE_X
    const y = PARTY_STATUS_BASE_Y
    renderText(fb, role._name ?? `P${i + 1}`, x, y, UI_TEXT_COLOR, glyphs)
    renderText(fb, `HP:${role.hp}/${role.maxHP}`, x, y + 8, UI_TEXT_COLOR, glyphs)
    renderText(fb, `MP:${role.mp}/${role.maxMP}`, x, y + 16, UI_TEXT_COLOR, glyphs)
  })
}

/**
 * 主菜单(5 项):攻击 / 法术 / 物品 / 防御 / 逃跑。
 * 高亮项以 `> ` 前缀标记(uiCursor 决定)。
 * selectingPlayerIdx 未定义(不在选择阶段)→ no-op。
 */
function drawMainMenu(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  glyphs?: GlyphTable,
): void {
  if (state.selectingPlayerIdx === undefined) return
  const player = state.players[state.selectingPlayerIdx]
  if (!player) return
  const role = playerRoles.roles[player.roleId]
  if (!role) return
  renderText(fb, `${role._name ?? 'P'} 行动:`, MENU_BASE_X, MENU_BASE_Y, UI_TEXT_COLOR, glyphs)
  MAIN_MENU.forEach((it, i) => {
    const prefix = i === state.uiCursor ? '> ' : '  '
    renderText(
      fb,
      prefix + it.label,
      MENU_BASE_X,
      MENU_BASE_Y + (i + 1) * MENU_ITEM_STRIDE_Y + 3,
      UI_TEXT_COLOR,
      glyphs,
    )
  })
}

/**
 * 法术二级菜单 —— 列当前队员已学法术的前 5 个。
 *
 * M3 简版:`learnedSpells` 不在 PlayerRole schema(M5 时按 sdlpal `wMagic[]`
 * 数组补)。当前通过 `(role as any).learnedSpells` 兼容 T29 dev panel 临时附加;
 * 缺失或空数组 → 显示「(无法术)」。
 */
function drawMagicMenu(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  spells: Spell[],
  glyphs?: GlyphTable,
): void {
  if (state.selectingPlayerIdx === undefined) return
  const player = state.players[state.selectingPlayerIdx]
  if (!player) return
  const role = playerRoles.roles[player.roleId]
  if (!role) return
  const learned: number[] = (role as unknown as { learnedSpells?: number[] }).learnedSpells ?? []
  if (learned.length === 0) {
    renderText(fb, '(无法术)', MENU_BASE_X, MENU_BASE_Y, UI_TEXT_COLOR, glyphs)
    renderText(fb, '(Esc 返回)', MENU_BASE_X, MENU_BASE_Y + 20, UI_TEXT_COLOR, glyphs)
    return
  }
  // 滚动窗口:列 5 条,以 uiCursor 为中心,长列表(dev 全法术 ~100 条)也能选到任意一条。
  const start = menuWindowStart(state.uiCursor, learned.length)
  learned.slice(start, start + MENU_VISIBLE).forEach((spellId, i) => {
    const absoluteIdx = start + i
    const spell = spells.find(s => s.id === spellId)
    if (!spell) return
    const prefix = absoluteIdx === state.uiCursor ? '> ' : '  '
    renderText(
      fb,
      prefix + (spell._name ?? `Spell ${spellId}`),
      MENU_BASE_X,
      MENU_BASE_Y + i * MENU_ITEM_STRIDE_Y,
      UI_TEXT_COLOR,
      glyphs,
    )
  })
  renderText(fb, '(Esc 返回)', MENU_BASE_X, MENU_BASE_Y + 70, UI_TEXT_COLOR, glyphs)
}

/**
 * 物品二级菜单 —— 列持有物品的前 5 个(count > 0)。
 *
 * inventory 在 T14 已加,T21 item action 已扣 count。M3 此处读 count > 0 的 entry,
 * 显示「名字 x{count}」。物品表查不到 itemId → 跳过该位。
 */
function drawItemMenu(
  fb: Framebuffer,
  state: BattleState,
  items: Item[],
  gs: GameState,
  glyphs?: GlyphTable,
): void {
  if (state.selectingPlayerIdx === undefined) return
  const inventory = gs.inventory.filter(e => e.count > 0)
  if (inventory.length === 0) {
    renderText(fb, '(无物品)', MENU_BASE_X, MENU_BASE_Y, UI_TEXT_COLOR, glyphs)
    renderText(fb, '(Esc 返回)', MENU_BASE_X, MENU_BASE_Y + 20, UI_TEXT_COLOR, glyphs)
    return
  }
  const start = menuWindowStart(state.uiCursor, inventory.length)
  inventory.slice(start, start + MENU_VISIBLE).forEach((entry, i) => {
    const absoluteIdx = start + i
    const item = items.find(it => it.id === entry.itemId)
    if (!item) return
    const prefix = absoluteIdx === state.uiCursor ? '> ' : '  '
    renderText(
      fb,
      `${prefix + (item._name ?? `Item ${entry.itemId}`)} x${entry.count}`,
      MENU_BASE_X,
      MENU_BASE_Y + i * MENU_ITEM_STRIDE_Y,
      UI_TEXT_COLOR,
      glyphs,
    )
  })
  renderText(fb, '(Esc 返回)', MENU_BASE_X, MENU_BASE_Y + 70, UI_TEXT_COLOR, glyphs)
}

/**
 * 目标选择光标:在 `uiCursor` 指向的敌方位置上方画 `v`(简化 ▽)。
 *
 * M3 简版:只画 enemy 目标(适用物理攻击 / spell.flags.usableToEnemy)。
 * applyToPlayer / applyToParty 把光标画到队员位置上的逻辑推 M5。
 *
 * - 无敌人(全 dead 但 phase 还在 selectAction)→ no-op,不抛。
 * - uiCursor 超界 → clamp 到最后一个敌人。
 */
function drawTargetCursor(fb: Framebuffer, state: BattleState, glyphs?: GlyphTable): void {
  if (state.enemies.length === 0) return
  const targetIdx = Math.min(Math.max(state.uiCursor, 0), state.enemies.length - 1)
  const pos = ENEMY_POSITIONS[targetIdx]
  if (!pos) return
  renderText(
    fb,
    'v',
    pos.x + TARGET_CURSOR_DX,
    pos.y + TARGET_CURSOR_DY,
    UI_TEXT_COLOR,
    glyphs,
  )
}
