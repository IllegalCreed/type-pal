// 320×200 逻辑坐标。选人时右侧面板盖住网格右两列，露出左列作为物品上下文。
// 坐标以 PAL_ItemUseMenu 和一阶段 drawItemUseMenu 为依据。
import {
  type CombatStat,
  type EquipDescribeCtx,
  effectiveStat,
  type ItemDataMap,
  type Locale,
  lookupText,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import type { UseMenuState } from '../use-menu-state.js'
import { drawItemGridList } from './item-list.js'
import {
  COLOR_NORMAL,
  drawNumber,
  drawSlicedBox,
  drawStatNumber,
  type MenuAssets,
  SELECTED_COLORS,
} from './menu-box.js'

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
const UB_STATS: { label: TextId; stat: 'level' | 'hp' | 'mp' | CombatStat }[] = [
  { label: 'stat.level', stat: 'level' },
  { label: 'stat.hp', stat: 'hp' },
  { label: 'stat.mp', stat: 'mp' },
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
  items: ItemDataMap,
  describeCtx?: EquipDescribeCtx,
): void {
  // ① 整宽物品列表(两阶段都画;pick-target 时右两列被黄框盖)
  drawItemGridList(ctx, state.items, state.cursor, world, assets, glyphs, now, describeCtx)
  if (state.phase !== 'pick-target') return

  const target = world.party[state.targetIdx]
  if (!target) return
  const sel = state.selectedItemId ? items[state.selectedItemId] : undefined

  // ② 右侧黄框(主菜单九宫格 style 0)
  drawSlicedBox(ctx, assets.box, UB_BOX.x, UB_BOX.y, UB_BOX.w, UB_BOX.h)

  // ③ 8 属性:label(深米黄)+ 值(黄;hp/mp 带斜杠 + 蓝 max)
  UB_STATS.forEach(({ label, stat }, i) => {
    const ly = UB_LABEL_Y0 + UB_ROW_DY * i
    const vy = ly + UB_VAL_DY
    renderSpans(ctx, [{ text: lookupText(label, locale) }], UB_LABEL_X, ly, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_STAT_LABEL,
    })
    if (stat === 'level') {
      drawNumber(ctx, target.level, UB_VAL_RIGHT, vy, assets.nums)
    } else if (stat === 'hp' || stat === 'mp') {
      const max = stat === 'hp' ? target.maxHP : target.maxMP
      drawNumber(ctx, target[stat], UB_VAL_RIGHT, vy, assets.nums)
      if (assets.slash) ctx.drawImage(assets.slash, UB_SLASH_X, vy + 1)
      drawNumber(ctx, max, UB_MAX_RIGHT, vy + UB_MAX_DOWN, assets.numsBlue)
    } else {
      drawStatNumber(
        ctx,
        effectiveStat(target, stat, items),
        UB_VAL_RIGHT,
        vy,
        assets.nums,
        'yellow',
      )
    }
  })

  // ④ 角色名(按队伍顺序绘制，当前目标闪烁)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  world.party.forEach((member, i) => {
    const selected = i === state.targetIdx
    renderSpans(
      ctx,
      [{ text: lookupText(`name.${member.template}` as TextId, locale) }],
      UB_NAME_X,
      UB_NAME_Y0 + UB_NAME_DY * i,
      { glyphs, shadow: true, forceRgba: selected ? blink : COLOR_NORMAL },
    )
  })

  // ⑤ 选中物:itembox + 图标 + 名(0xBE)+ 数量(青右对齐)
  drawSlicedBox(ctx, assets.itembox, UB_ITEMBOX.x, UB_ITEMBOX.y, 64, 64, { shadow: false })
  if (sel) {
    const icon = sel.icon ? assets.itemIcons[sel.icon] : undefined
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
