// 仙术菜单 Canvas UI(D17)。真值坐标见 docs/phase2/menu/magic-menu-plan.md「真值规格」(= game draw-magic.ts)。
// 在 320 逻辑坐标画,调用方已 ctx.scale(WORLD_SCALE)。视觉活,坐标在浏览器对原版微调。
import type { WorldState } from '@type-pal/content'
import type { MagicMenuState } from '../magic-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import {
  drawCashBox,
  drawNumber,
  drawNumberLeft,
  drawSlicedBox,
  type MenuAssets,
} from './menu-box.js'

// ── 网格(红框)──
const GRID_X = 10
const GRID_Y = 42
const GRID_W = 300 // 容 3 列仙术名;浏览器对齐微调
const GRID_H = 112
const ITEM_X0 = 35
const ITEM_Y0 = 54
const ITEM_DX = 87 // 列间距
const ITEM_DY = 18 // 行间距
const GRID_COLS = 3
const CURSOR_DX = 25 // 光标相对 item 偏移(draw-magic)
const CURSOR_DY = 10
// 色(palette 0):普通米白 / 选中黄(6 帧闪烁)
const COLOR_NORMAL = [199, 186, 174] as const
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const
// ── MP box(左上单行框):needed(选中仙术 cost.mp,黄)/ current(角色 mp,青)──
const MP_BOX_LEN = 5
const MP_NEEDED_RIGHT = 15
const MP_SLASH_X = 45
const MP_CUR_RIGHT = 50
const MP_NUM_Y = 14
// ── 角色框(底部,单人)──
const PBOX_X = 45
const PBOX_Y = 165
// ── 描述(顶部):选中仙术 desc(色 0x3C 近白,浏览器对齐微调)──
const DESC_X = 102
const DESC_Y = 3
const COLOR_DESC = [255, 255, 255] as const

/** 大世界仙术菜单(单人查看版):红框网格 + MP box + 角色框 + 描述。 */
export function drawMagicMenu(
  ctx: CanvasRenderingContext2D,
  state: MagicMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
): void {
  const caster = world.party[0]
  const sel = state.spells[state.cursor]
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL

  // ① 红框网格 + 仙术名(3 列 × 5 行)+ 选中光标
  drawSlicedBox(ctx, assets.redBox, GRID_X, GRID_Y, GRID_W, GRID_H)
  state.spells.forEach((sp, i) => {
    const x = ITEM_X0 + (i % GRID_COLS) * ITEM_DX
    const y = ITEM_Y0 + Math.floor(i / GRID_COLS) * ITEM_DY
    const selected = i === state.cursor
    if (selected && assets.cursorGrid)
      ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY)
    renderSpans(ctx, [{ text: sp.name }], x, y, {
      glyphs,
      shadow: true,
      forceRgba: selected ? blink : COLOR_NORMAL,
    })
  })

  // ② MP box:needed / current
  drawCashBox(ctx, assets.cashBox, 0, 0, MP_BOX_LEN)
  if (sel) drawNumber(ctx, sel.cost.mp ?? 0, MP_NEEDED_RIGHT, MP_NUM_Y, assets.nums)
  if (assets.slash) ctx.drawImage(assets.slash, MP_SLASH_X, MP_NUM_Y)
  if (caster) drawNumber(ctx, caster.mp, MP_CUR_RIGHT, MP_NUM_Y, assets.numsCyan)

  // ③ 角色框(底部):playerbox + face + HP/MP(当前黄·青 / 最大蓝)
  if (assets.magicPlayerBox) ctx.drawImage(assets.magicPlayerBox, PBOX_X, PBOX_Y)
  if (assets.magicFace) ctx.drawImage(assets.magicFace, PBOX_X - 2, PBOX_Y - 4)
  if (caster) {
    if (assets.slash) {
      ctx.drawImage(assets.slash, PBOX_X + 49, PBOX_Y + 6)
      ctx.drawImage(assets.slash, PBOX_X + 49, PBOX_Y + 22)
    }
    drawNumber(ctx, caster.hp, PBOX_X + 26, PBOX_Y + 5, assets.nums)
    drawNumberLeft(ctx, caster.maxHP, PBOX_X + 47, PBOX_Y + 8, assets.numsBlue)
    drawNumber(ctx, caster.mp, PBOX_X + 26, PBOX_Y + 21, assets.numsCyan)
    drawNumberLeft(ctx, caster.maxMP, PBOX_X + 47, PBOX_Y + 24, assets.numsBlue)
  }

  // ④ 描述(顶部):选中仙术 desc
  if (sel) {
    renderSpans(ctx, [{ text: sel.desc }], DESC_X, DESC_Y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DESC,
    })
  }
}
