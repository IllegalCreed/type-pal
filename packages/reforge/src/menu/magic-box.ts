// 仙术菜单 Canvas UI(D17)。真值坐标见 docs/phase2/menu/magic-menu-plan.md「真值规格」(= game draw-magic.ts)。
// 在 320 逻辑坐标画,调用方已 ctx.scale(WORLD_SCALE)。
import type { WorldState } from '@type-pal/content'
import type { MagicMenuState } from '../magic-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawCashBox, drawSlicedBox, type MenuAssets } from './menu-box.js'

// ── 网格(红框)──
const GRID_X = 10
const GRID_Y = 42
const GRID_W = 301 // PAL cols=16:左22+中256+右23
const GRID_H = 112 // PAL rows=4:上20+中18×4+下20
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
// ── MP box(左上单行框):needed(黄)/ current(青)── posX = draw-magic pos.x(字段左锚)
const MP_BOX_LEN = 5
const MP_NEEDED_X = 15
const MP_SLASH_X = 45
const MP_CUR_X = 50
const MP_NUM_Y = 14
// ── 角色框(底部,单人)──
const PBOX_X = 45
const PBOX_Y = 165
// ── 描述(顶部):选中仙术 desc(0x3C 浅黄)──
const DESC_X = 102
const DESC_Y = 3
const COLOR_DESC = [243, 239, 93] as const // 0x3C(palette 0)
// ── 选人红箭头(draw-magic PICKER_CURSOR (75 + 78×i, 158);单人 i=0)──
const PICKER_X = 75
const PICKER_Y = 158

// sdlpal PAL_DrawNumber:digit sprite 5px,但按 6px 步进(5 + 1px 间隙);右对齐固定 nLength 宽字段。
const DIGIT_STEP = 6
const NUM_FIELD = 4

/** sdlpal PAL_DrawNumber 右对齐 1:1。posX = 字段左锚(draw-magic pos.x);值贴字段右侧。 */
function drawNumRight(
  ctx: CanvasRenderingContext2D,
  value: number,
  posX: number,
  y: number,
  nums: (ImageBitmap | undefined)[],
): void {
  const num = Math.max(0, Math.floor(value))
  const actual = Math.min(String(num).length, NUM_FIELD)
  let x = posX - DIGIT_STEP + DIGIT_STEP * NUM_FIELD // 最右 digit blit 起点
  let rem = num
  for (let c = 0; c < actual; c++) {
    const img = nums[rem % 10]
    if (img) ctx.drawImage(img, x, y)
    x -= DIGIT_STEP
    rem = Math.floor(rem / 10)
  }
}

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

  // ① 红框网格 + 仙术名(3 列 × 5 行)。先画字、再画光标 → 光标在文字之上。
  drawSlicedBox(ctx, assets.redBox, GRID_X, GRID_Y, GRID_W, GRID_H)
  state.spells.forEach((sp, i) => {
    const x = ITEM_X0 + (i % GRID_COLS) * ITEM_DX
    const y = ITEM_Y0 + Math.floor(i / GRID_COLS) * ITEM_DY
    const selected = i === state.cursor
    renderSpans(ctx, [{ text: sp.name }], x, y, {
      glyphs,
      shadow: true,
      forceRgba: selected ? blink : COLOR_NORMAL,
    })
    if (selected && assets.cursorGrid)
      ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY)
  })

  // ② MP box:needed(黄)/ slash / current(青)
  drawCashBox(ctx, assets.cashBox, 0, 0, MP_BOX_LEN)
  if (sel) drawNumRight(ctx, sel.cost.mp ?? 0, MP_NEEDED_X, MP_NUM_Y, assets.nums)
  if (assets.slash) ctx.drawImage(assets.slash, MP_SLASH_X, MP_NUM_Y)
  if (caster) drawNumRight(ctx, caster.mp, MP_CUR_X, MP_NUM_Y, assets.numsCyan)

  // ③ 角色框(底部):playerbox + face + HP(全黄)/ MP(全青),右对齐;max 偏下错落(draw-magic 真值)
  if (assets.magicPlayerBox) ctx.drawImage(assets.magicPlayerBox, PBOX_X, PBOX_Y)
  if (assets.magicFace) ctx.drawImage(assets.magicFace, PBOX_X - 2, PBOX_Y - 4)
  if (caster) {
    if (assets.slash) {
      ctx.drawImage(assets.slash, PBOX_X + 49, PBOX_Y + 6)
      ctx.drawImage(assets.slash, PBOX_X + 49, PBOX_Y + 22)
    }
    drawNumRight(ctx, caster.hp, PBOX_X + 26, PBOX_Y + 5, assets.nums)
    drawNumRight(ctx, caster.maxHP, PBOX_X + 47, PBOX_Y + 8, assets.nums)
    drawNumRight(ctx, caster.mp, PBOX_X + 26, PBOX_Y + 21, assets.numsCyan)
    drawNumRight(ctx, caster.maxMP, PBOX_X + 47, PBOX_Y + 24, assets.numsCyan)
  }

  // 选人红箭头(单人:player 0)
  if (assets.cursorUp) ctx.drawImage(assets.cursorUp, PICKER_X, PICKER_Y)

  // ④ 描述(顶部,浅黄 0x3C):选中仙术 desc
  if (sel) {
    renderSpans(ctx, [{ text: sel.desc }], DESC_X, DESC_Y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DESC,
    })
  }
}
