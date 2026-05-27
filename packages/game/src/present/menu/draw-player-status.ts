/**
 * M5.6 T10d:PlayerStatus 全屏 UI — sdlpal `uigame.c:1051-1286` PAL_PlayerStatus 1:1 port。
 *
 * 真值锚:
 *  - 渲染段:[reference/sdlpal/uigame.c:1089-1253](../../../../../reference/sdlpal/uigame.c#L1089-L1253)
 *  - 默认 ScreenLayout:[reference/sdlpal/palcfg.c:333-376](../../../../../reference/sdlpal/palcfg.c#L333-L376)
 *  - 常量:ui.h `STATUS_BACKGROUND_FBPNUM=0` / `STATUS_LABEL_*` / `STATUS_COLOR_EQUIPMENT=0xBE` /
 *    `MENUITEM_COLOR=0x4F` / `MENUITEM_COLOR_CONFIRMED=0x2C` / `SPRITENUM_SLASH=39`
 *
 * 渲染顺序(sdlpal uigame.c:1127-1258):
 *  1. FBP chunk 0 全屏背景(`PAL_FBPBlitToSurface`)
 *  2. RGM 头像 at RoleImage(`PAL_RLEBlitToSurface(rgwAvatar[role], fpRGM)`)
 *  3. 6 装备槽:BALL 图标 at RoleEquipImageBoxes[i]+(1,1) + 装备名 at RoleEquipNames[i],色 0xBE
 *  4. 4 EXP/Lv/HP/MP labels at &RoleExpLabel+i,色 MENUITEM_COLOR 0x4F,fShadow=TRUE
 *  5. 5 stat labels(Atk/Mag/Res/Dex/Flee)at RoleStatusLabels[i],同上
 *  6. roleName at RoleName,色 MENUITEM_COLOR_CONFIRMED 0x2C,fShadow=TRUE
 *  7. 3 slash sprite(SPRITENUM_SLASH=39):RoleExpSlash(默认 (0,0) skip)/ HPSlash / MPSlash
 *  8. 7 数字:curExp(yellow 5)+ nextExp=LevelUpExp[level](cyan 5)+ level(yellow 2)
 *           + curHP/MP(yellow 4)+ maxHP/MP(blue 4)
 *  9. 5 stat 数字:PAL_GetPlayerAttackStrength / MagicStrength / Defense / Dexterity / FleeRate
 *           各 4 位 yellow at RoleStatusValues[i]
 * 10. poison row(uigame.c:1245-1253)— 首版 skip,留 follow-up(需 items poison 字段 + gs.rgPoisonStatus 接入)
 *
 * v1 ts 简版 page='attribute'|'equipment'|'magic' 3 页签是错的 — sdlpal 一屏整布局,无页切换。
 * 已删,见 [player-status.ts](../../core/menu/player-status.ts) state machine 重写。
 */

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import type { GameState } from '../../core/game-state.js'
import type { PlayerStatusState } from '../../core/menu/player-status.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { drawBattleBg } from '../battle/draw-battle-bg.js'
import { drawNumber } from '../draw-number.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
} from '../../core/equip-effect.js'

// ── sdlpal ui.h 真值色 ──────────────────────────────────────────────────────
const MENUITEM_COLOR = 0x4F            // ui.h:29 — 4 EXP/Lv/HP/MP labels + 5 stat labels
const MENUITEM_COLOR_CONFIRMED = 0x2C  // ui.h:31 — roleName
const STATUS_COLOR_EQUIPMENT = 0xBE    // ui.h:97 — equipment 名字
const SPRITENUM_SLASH = 39             // ui.h:109

// ── sdlpal palcfg.c:333-376 默认 ScreenLayout 真值(PlayerStatus 段) ──────────
const ROLE_NAME = { x: 110, y: 8 }
const ROLE_IMAGE = { x: 110, y: 30 }
const ROLE_EXP_LABEL = { x: 6, y: 6 }
const ROLE_LEVEL_LABEL = { x: 6, y: 32 }
const ROLE_HP_LABEL = { x: 6, y: 54 }
const ROLE_MP_LABEL = { x: 6, y: 76 }
const ROLE_STATUS_LABELS = [
  { x: 6, y: 98 }, { x: 6, y: 118 }, { x: 6, y: 138 }, { x: 6, y: 158 }, { x: 6, y: 178 },
] as const
const ROLE_CURR_EXP = { x: 58, y: 6 }
const ROLE_NEXT_EXP = { x: 58, y: 15 }
const ROLE_EXP_SLASH = { x: 0, y: 0 } // 默认 (0,0) → uigame.c:1203 `!= 0` 判断为 false,跳过
const ROLE_LEVEL = { x: 54, y: 35 }
const ROLE_CUR_HP = { x: 42, y: 56 }
const ROLE_MAX_HP = { x: 63, y: 61 }
const ROLE_HP_SLASH = { x: 65, y: 58 }
const ROLE_CUR_MP = { x: 42, y: 78 }
const ROLE_MAX_MP = { x: 63, y: 83 }
const ROLE_MP_SLASH = { x: 65, y: 80 }
const ROLE_STATUS_VALUES = [
  { x: 42, y: 102 }, { x: 42, y: 122 }, { x: 42, y: 142 }, { x: 42, y: 162 }, { x: 42, y: 182 },
] as const
const ROLE_EQUIP_IMAGE_BOXES = [
  { x: 189, y: -1 }, { x: 247, y: 39 }, { x: 251, y: 101 },
  { x: 201, y: 133 }, { x: 141, y: 141 }, { x: 81, y: 125 },
] as const
const ROLE_EQUIP_NAMES = [
  { x: 195, y: 38 }, { x: 253, y: 78 }, { x: 257, y: 140 },
  { x: 207, y: 172 }, { x: 147, y: 180 }, { x: 87, y: 164 },
] as const

// ── sdlpal WORD.DAT flat[N] 真值(verify via lookup/words.json) ─────────────
// flat[2] = 'Exp'(原版 WIN95 WORD.DAT 真值就是英文 — 不是渲染漏字符;
// 后续 T20 真值 audit 可考虑改运行时 PAL_GetWord(2) lookup,与其他 menu 一致简化)
const LABEL_EXP = 'Exp'           // STATUS_LABEL_EXP=2
const LABEL_LEVEL = '修行'         // STATUS_LABEL_LEVEL=48
const LABEL_HP = '体力'            // STATUS_LABEL_HP=49
const LABEL_MP = '真气'            // STATUS_LABEL_MP=50
const LABEL_ATTACK = '武术'        // STATUS_LABEL_ATTACKPOWER=51
const LABEL_MAGIC = '灵力'         // STATUS_LABEL_MAGICPOWER=52
const LABEL_RESIST = '防御'        // STATUS_LABEL_RESISTANCE=53
const LABEL_DEXTERITY = '身法'     // STATUS_LABEL_DEXTERITY=54
const LABEL_FLEERATE = '吉运'      // STATUS_LABEL_FLEERATE=55

const MAX_PLAYER_EQUIPMENTS = 6 // sdlpal palcommon.h:63

// ── effective stat(sdlpal global.c:1736-1899 真值)─────────────────────────
//
// sdlpal `PAL_GetPlayerXxxStrength(role) = PlayerRoles.rgwXxx[role] + Σ rgEquipmentEffect[i].rgwXxx[role]`
// C5(2026-05-28)接通真 getter:见 [core/equip-effect.ts](../../core/equip-effect.ts)。

function runtimeOrBase(
  gs: GameState,
  roleId: number,
  playerRoles: PlayerRoles,
  field: 'level' | 'hp' | 'maxHP' | 'mp' | 'maxMP',
): number {
  const runtime = gs.PlayerRolesRuntime
  const base = playerRoles.roles[roleId]
  switch (field) {
    case 'level': return runtime.rgwLevel[roleId] || base?.level || 0
    case 'hp':    return runtime.rgwHP[roleId]    || base?.hp    || 0
    case 'maxHP': return runtime.rgwMaxHP[roleId] || base?.maxHP || 0
    case 'mp':    return runtime.rgwMP[roleId]    || base?.mp    || 0
    case 'maxMP': return runtime.rgwMaxMP[roleId] || base?.maxMP || 0
  }
}

// ── sprite blit(opaque mask)— 与 draw-inventory 同模式 ─────────────────────
function blitSpriteOpaque(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) {
        fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
      }
    }
  }
}

export interface DrawPlayerStatusInput {
  fb: Framebuffer
  state: PlayerStatusState
  /** 渲染需要 PlayerRolesRuntime / Exp / rgPoisonStatus / dwCash 等 runtime state。 */
  gs: GameState
  /** Static PlayerRoles(avatar / _name / base stats / equipment 表)。 */
  playerRoles: PlayerRoles
  /** Item catalog(查 equipment._name)。 */
  items: Item[]
  /** SPRITEUI frames(slash sprite)。 */
  uiSpriteFrames: IndexedImage[]
  glyphs?: GlyphTable
  /** FBP chunk 0 全屏背景(sdlpal STATUS_BACKGROUND_FBPNUM=0)。 */
  statusBg?: BattleBgAsset
  /** RGM portrait map(chunkIndex → image),key = role.avatar。 */
  portraitIcons?: Map<number, IndexedImage>
  /** BALL item icon map(chunkIndex → image),key = item.bitmap。 */
  itemIcons?: Map<number, IndexedImage>
  /** DATA.MKF chunk 14 LevelUpExp[100](RoleNextExp 显示用)。 */
  levelUpExp?: number[]
}

export function drawPlayerStatus(input: DrawPlayerStatusInput): void {
  const {
    fb, state, gs, playerRoles, items, uiSpriteFrames, glyphs,
    statusBg, portraitIcons, itemIcons, levelUpExp,
  } = input

  const roleId = state.partyMembers[state.cursor]
  if (roleId === undefined) return
  const role = playerRoles.roles[roleId]
  if (!role) return

  // 1. FBP chunk 0 全屏背景(sdlpal uigame.c:1089 + 1127)
  if (statusBg) {
    drawBattleBg(fb, statusBg)
  }

  // 2. RGM portrait(sdlpal uigame.c:1132-1135)
  // role.avatar = sdlpal PlayerRoles.rgwAvatar[roleId] = RGM.MKF chunk index
  const portrait = portraitIcons?.get(role.avatar)
  if (portrait) {
    blitSpriteOpaque(fb, portrait, ROLE_IMAGE.x, ROLE_IMAGE.y)
  }

  // 3. 6 equipment slots(sdlpal uigame.c:1140-1177)
  //    w = rgwEquipment[i][role];if w==0 skip;
  //    BALL 图标 at RoleEquipImageBoxes[i]+(1,1)(sdlpal uigame.c:1158 PAL_XY_OFFSET ... 1, 1)
  //    PAL_DrawText(GetWord(w), RoleEquipNames[i], STATUS_COLOR_EQUIPMENT, fShadow=TRUE, FALSE, fUse8x8Font)
  for (let slot = 0; slot < MAX_PLAYER_EQUIPMENTS; slot++) {
    const w = gs.PlayerRolesRuntime.rgwEquipment[slot]?.[roleId] ?? 0
    if (w === 0) continue
    const item = items.find((it) => it.id === w)
    if (!item) continue

    const boxPos = ROLE_EQUIP_IMAGE_BOXES[slot]!
    const namePos = ROLE_EQUIP_NAMES[slot]!

    // BALL icon
    const icon = itemIcons?.get(item.bitmap)
    if (icon) {
      blitSpriteOpaque(fb, icon, boxPos.x + 1, boxPos.y + 1)
    }
    // equipment 名字 — sdlpal STATUS_COLOR_EQUIPMENT=0xBE,fShadow=TRUE
    renderText(fb, item._name ?? `?${w}`, namePos.x, namePos.y, STATUS_COLOR_EQUIPMENT, glyphs, true)
  }

  // 4. 4 EXP/Lv/HP/MP labels(sdlpal uigame.c:1182-1188)
  //    labels0[]={EXP, LEVEL, HP, MP},pos = &RoleExpLabel + i(RoleExpLabel/LevelLabel/HPLabel/MPLabel)
  //    color = MENUITEM_COLOR 0x4F,fShadow=TRUE
  renderText(fb, LABEL_EXP,   ROLE_EXP_LABEL.x,   ROLE_EXP_LABEL.y,   MENUITEM_COLOR, glyphs, true)
  renderText(fb, LABEL_LEVEL, ROLE_LEVEL_LABEL.x, ROLE_LEVEL_LABEL.y, MENUITEM_COLOR, glyphs, true)
  renderText(fb, LABEL_HP,    ROLE_HP_LABEL.x,    ROLE_HP_LABEL.y,    MENUITEM_COLOR, glyphs, true)
  renderText(fb, LABEL_MP,    ROLE_MP_LABEL.x,    ROLE_MP_LABEL.y,    MENUITEM_COLOR, glyphs, true)

  // 5. 5 stat labels(sdlpal uigame.c:1189-1195)
  //    labels[]={ATTACK, MAGIC, RESISTANCE, DEXTERITY, FLEERATE},pos = RoleStatusLabels[i]
  const STAT_LABELS = [LABEL_ATTACK, LABEL_MAGIC, LABEL_RESIST, LABEL_DEXTERITY, LABEL_FLEERATE] as const
  for (let i = 0; i < 5; i++) {
    const pos = ROLE_STATUS_LABELS[i]!
    renderText(fb, STAT_LABELS[i]!, pos.x, pos.y, MENUITEM_COLOR, glyphs, true)
  }

  // 6. roleName(sdlpal uigame.c:1197-1198)
  //    color = MENUITEM_COLOR_CONFIRMED 0x2C,fShadow=TRUE
  renderText(fb, role._name ?? `role#${roleId}`, ROLE_NAME.x, ROLE_NAME.y, MENUITEM_COLOR_CONFIRMED, glyphs, true)

  // 7. 3 slash sprite(sdlpal uigame.c:1203-1214)
  //    SPRITENUM_SLASH=39 from SPRITEUI;只在坐标非 (0,0) 时画。
  //    默认 RoleExpSlash=(0,0) → skip;HPSlash=(65,58);MPSlash=(65,80)
  const slashFrame = uiSpriteFrames[SPRITENUM_SLASH]
  if (slashFrame) {
    if (ROLE_EXP_SLASH.x !== 0 || ROLE_EXP_SLASH.y !== 0) {
      blitSpriteOpaque(fb, slashFrame, ROLE_EXP_SLASH.x, ROLE_EXP_SLASH.y)
    }
    blitSpriteOpaque(fb, slashFrame, ROLE_HP_SLASH.x, ROLE_HP_SLASH.y)
    blitSpriteOpaque(fb, slashFrame, ROLE_MP_SLASH.x, ROLE_MP_SLASH.y)
  }

  // 8. 7 vital 数字(sdlpal uigame.c:1216-1229)
  const curExp = gs.Exp.rgPrimaryExp[roleId]?.wExp ?? 0
  const level = runtimeOrBase(gs, roleId, playerRoles, 'level')
  const nextExp = levelUpExp?.[level] ?? 0
  drawNumber(fb, curExp,  5, ROLE_CURR_EXP, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, nextExp, 5, ROLE_NEXT_EXP, 'cyan',   'right', uiSpriteFrames)
  drawNumber(fb, level,   2, ROLE_LEVEL,    'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, runtimeOrBase(gs, roleId, playerRoles, 'hp'),    4, ROLE_CUR_HP, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, runtimeOrBase(gs, roleId, playerRoles, 'maxHP'), 4, ROLE_MAX_HP, 'blue',   'right', uiSpriteFrames)
  drawNumber(fb, runtimeOrBase(gs, roleId, playerRoles, 'mp'),    4, ROLE_CUR_MP, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, runtimeOrBase(gs, roleId, playerRoles, 'maxMP'), 4, ROLE_MAX_MP, 'blue',   'right', uiSpriteFrames)

  // 9. 5 stat 数字(sdlpal uigame.c:1231-1240)
  //    PAL_GetPlayerAttackStrength / MagicStrength / Defense / Dexterity / FleeRate
  //    C5(2026-05-28)真 getter 含装备 effect 加成 — 见 core/equip-effect.ts。
  drawNumber(fb, getPlayerAttackStrength(gs, roleId), 4, ROLE_STATUS_VALUES[0]!, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerMagicStrength(gs, roleId),  4, ROLE_STATUS_VALUES[1]!, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerDefense(gs, roleId),        4, ROLE_STATUS_VALUES[2]!, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerDexterity(gs, roleId),      4, ROLE_STATUS_VALUES[3]!, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerFleeRate(gs, roleId),       4, ROLE_STATUS_VALUES[4]!, 'yellow', 'right', uiSpriteFrames)

  // 10. poisons(sdlpal uigame.c:1245-1253)— 首版 skip;留 follow-up 待
  //     items[poisonId].poison.wPoisonLevel + .wColor 字段 + gs.rgPoisonStatus 完整接入
}
