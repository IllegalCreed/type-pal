// 使用面板 Canvas UI(D17)。两阶段,1:1 移植第一阶段 draw-inventory.ts:
//   pick-item    整宽物品列表(共享 item-list:红框 3 列 + 数量 + itembox + 多行描述)。
//   pick-target  列表照画(整宽)+ 右侧叠黄框(PAL_ItemUseMenu):角色名 + 8 属性 + 选中物 itembox。
//                黄框(x=110)盖住列表右两列,左列(col0)露出 —— 即原版"左窄列表 + 右属性面板"的样子。
// 坐标 = 一阶段 draw-inventory.ts drawItemUseMenu 真值(uigame.c:1289-1473)。320 逻辑坐标,调用方已 ctx.scale。
import {
  type CombatStat,
  DEMO_ITEMS,
  effectiveStat,
  type Locale,
  lookupText,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import type { UseMenuState } from '../use-menu-state.js'
import { drawItemGridList } from './item-list.js'
import { drawNumber, drawSlicedBox, type MenuAssets } from './menu-box.js'

// 右侧黄框(PAL_CreateBox(110,2) 7行×9列;w=cols*16+45,h=rows*18+40)
const UB_BOX = { x: 110, y: 2, w: 189, h: 166 }
// 8 属性:label(x=200,深米黄 0xBB)+ 值(右对齐;当前黄,max 蓝,斜杠分隔)
const UB_LABEL_X = 200
const UB_LABEL_Y0 = 16
const UB_ROW_DY = 18
const UB_VAL_DY = 4 // 值相对 label 偏下
const UB_VAL_RIGHT = 262
const UB_MAX_RIGHT = 284
const UB_SLASH_X = 264
const UB_MAX_DOWN = 3 // max 错落偏下(原版)
// 角色名(选目标列表;x=125,y=16+20i,选中闪烁)
const UB_NAME_X = 125
const UB_NAME_Y0 = 16
const UB_NAME_DY = 20
// 选中物详情:itembox + 图标 + 名 + 数量
const UB_ITEMBOX = { x: 120, y: 80 }
const UB_ICON = { x: 127, y: 88 }
const UB_ITEM_NAME = { x: 116, y: 143 }
const UB_AMOUNT_RIGHT = 182
const UB_AMOUNT_Y = 133
const COLOR_STAT_LABEL = [186, 166, 125] as const // 0xBB
const COLOR_ITEM_NAME = [231, 223, 195] as const // 0xBE
const COLOR_PARTY = [199, 186, 174] as const // 0x4F
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

// 8 属性行:修行=level / 体力=hp池 / 真气=mp池 / 其余 5 = effectiveStat。
const UB_STATS: { label: TextId; stat?: CombatStat; pool?: 'hp' | 'mp'; level?: boolean }[] = [
  { label: 'stat.level', level: true },
  { label: 'stat.hp', pool: 'hp' },
  { label: 'stat.mp', pool: 'mp' },
  { label: 'stat.attack', stat: 'attack' },
  { label: 'stat.magicAttack', stat: 'magicAttack' },
  { label: 'stat.defense', stat: 'defense' },
  { label: 'stat.speed', stat: 'speed' },
  { label: 'stat.luck', stat: 'luck' },
]

export function drawUseMenu(
  ctx: CanvasRenderingContext2D,
  state: UseMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: Locale,
): void {
  // ① 整宽物品列表(两阶段都画;pick-target 时右两列被黄框盖)
  drawItemGridList(ctx, state.items, state.cursor, world, assets, glyphs, now)
  if (state.phase !== 'pick-target') return

  const caster = world.party[0] // demo 单人 = 目标
  if (!caster) return
  const sel = state.selectedItemId ? DEMO_ITEMS[state.selectedItemId] : undefined

  // ② 右侧黄框(主菜单九宫格 style 0)
  drawSlicedBox(ctx, assets.box, UB_BOX.x, UB_BOX.y, UB_BOX.w, UB_BOX.h)

  // ③ 8 属性:label(深米黄)+ 值(黄;hp/mp 带斜杠 + 蓝 max)
  UB_STATS.forEach((row, i) => {
    const ly = UB_LABEL_Y0 + UB_ROW_DY * i
    const vy = ly + UB_VAL_DY
    renderSpans(ctx, [{ text: lookupText(row.label, locale) }], UB_LABEL_X, ly, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_STAT_LABEL,
    })
    if (row.level) {
      drawNumber(ctx, caster.level, UB_VAL_RIGHT, vy, assets.nums)
    } else if (row.pool) {
      const cur = row.pool === 'hp' ? caster.hp : caster.mp
      const max = row.pool === 'hp' ? caster.maxHP : caster.maxMP
      drawNumber(ctx, cur, UB_VAL_RIGHT, vy, assets.nums)
      if (assets.slash) ctx.drawImage(assets.slash, UB_SLASH_X, vy + 1)
      drawNumber(ctx, max, UB_MAX_RIGHT, vy + UB_MAX_DOWN, assets.numsBlue)
    } else if (row.stat) {
      drawNumber(ctx, effectiveStat(caster, row.stat, DEMO_ITEMS), UB_VAL_RIGHT, vy, assets.nums)
    }
  })

  // ④ 角色名(选目标列表;单人=李逍遥,选中闪烁)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_PARTY
  world.party.forEach((member, i) => {
    const selected = i === 0 // 单人:目标恒为 party[0]
    renderSpans(
      ctx,
      [{ text: lookupText(`name.${member.template}` as TextId, locale) }],
      UB_NAME_X,
      UB_NAME_Y0 + UB_NAME_DY * i,
      { glyphs, shadow: true, forceRgba: selected ? blink : COLOR_PARTY },
    )
  })

  // ⑤ 选中物:itembox + 图标 + 名(0xBE)+ 数量(青右对齐)
  if (assets.itembox) ctx.drawImage(assets.itembox, UB_ITEMBOX.x, UB_ITEMBOX.y)
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) ctx.drawImage(icon, UB_ICON.x, UB_ICON.y)
    renderSpans(ctx, [{ text: sel.name }], UB_ITEM_NAME.x, UB_ITEM_NAME.y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_ITEM_NAME,
    })
    const count = world.inventory.find((e) => e.itemId === sel.id)?.count ?? 0
    if (count > 0) drawNumber(ctx, count, UB_AMOUNT_RIGHT, UB_AMOUNT_Y, assets.numsCyan)
  }
}
