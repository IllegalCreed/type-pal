// 仙术菜单 Canvas UI(D17 → P2 施法链)。真值坐标见 docs/phase2/archive/plans/magic-menu-plan.md
// (= game draw-magic.ts,uigame.c:653-875 1:1)。在 320 逻辑坐标画,调用方已 ctx.scale(WORLD_SCALE)。
// 三阶段:pick-caster(全队信息框 + 选人竖列框)/ pick-spell(网格 + MP box + 描述)/
// pick-target(同 pick-spell + 队员框顶红箭头)。
import type { WorldState } from '@type-pal/content'
import type { MagicMenuState } from '../magic-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawScroll, drawSlicedBox, type MenuAssets } from './menu-box.js'

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
const COLOR_DISABLED = [166, 40, 32] as const // 0x18 MP 不足(原版 MENUITEM_COLOR_INACTIVE)
const COLOR_DISABLED_SEL = [215, 109, 93] as const // 0x1C MP 不足 + 选中(SELECTED_INACTIVE)
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
// ── 队员信息框(底部,全队;uigame.c:686-693:x=45+78i, y=165)──
const PBOX_X = 45
const PBOX_Y = 165
const PBOX_STEP = 78
// ── 选施法人竖列框(uigame.c:717:box(35,62),项 (48, 75+18i))──
const CASTER_BOX_X = 35
const CASTER_BOX_Y = 62
const CASTER_ITEM_X = 48
const CASTER_ITEM_Y = 75
const CASTER_LINE = 18
// ── 描述(顶部):选中仙术 desc(0x3C 浅黄)──
const DESC_X = 102
const DESC_Y = 3
const COLOR_DESC = [243, 239, 93] as const // 0x3C(palette 0)
// ── 选人红箭头(draw-magic PICKER_CURSOR (75 + 78×i, 158))──
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

/** 大世界仙术菜单:三阶段渲染(见文件头)。nameFor = 队员显示名(locale 由壳层闭包)。 */
export function drawMagicMenu(
  ctx: CanvasRenderingContext2D,
  state: MagicMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  opts: {
    faceFor?: (template: string) => ImageBitmap | undefined
    nameFor?: (template: string) => string
  } = {},
): void {
  const caster = world.party[state.casterIdx]
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL

  // ── 底部全队信息框(全阶段常画;uigame.c:684-693)──
  world.party.forEach((c, i) => {
    const x = PBOX_X + i * PBOX_STEP
    if (assets.magicPlayerBox) ctx.drawImage(assets.magicPlayerBox, x, PBOX_Y)
    const face = opts.faceFor?.(c.template)
    if (face) ctx.drawImage(face, x - 2, PBOX_Y - 4)
    if (assets.slash) {
      ctx.drawImage(assets.slash, x + 49, PBOX_Y + 6)
      ctx.drawImage(assets.slash, x + 49, PBOX_Y + 22)
    }
    drawNumRight(ctx, c.hp, x + 26, PBOX_Y + 5, assets.nums)
    drawNumRight(ctx, c.maxHP, x + 47, PBOX_Y + 8, assets.nums)
    drawNumRight(ctx, c.mp, x + 26, PBOX_Y + 21, assets.numsCyan)
    drawNumRight(ctx, c.maxMP, x + 47, PBOX_Y + 24, assets.numsCyan)
  })

  // ── pick-caster:选施法人竖列框(box(35,62) 项 (48,75+18i);死人灰红、选中黄闪)──
  if (state.phase === 'pick-caster') {
    const names = world.party.map((c) => opts.nameFor?.(c.template) ?? c.template)
    const maxLen = names.reduce((m, n) => Math.max(m, n.length), 2)
    // 白框宽随最长名(字 16px);高 = 行数×18 + 上下沿(drawSlicedBox w/h 为主体尺寸)
    drawSlicedBox(
      ctx,
      assets.box,
      CASTER_BOX_X,
      CASTER_BOX_Y,
      maxLen * 16 + 22,
      world.party.length * CASTER_LINE + 20,
    )
    world.party.forEach((c, i) => {
      const selected = i === state.casterIdx
      const dead = c.hp <= 0
      const color = dead
        ? selected
          ? COLOR_DISABLED_SEL
          : COLOR_DISABLED
        : selected
          ? blink
          : COLOR_NORMAL
      renderSpans(
        ctx,
        [{ text: names[i] ?? c.template }],
        CASTER_ITEM_X,
        CASTER_ITEM_Y + i * CASTER_LINE,
        {
          glyphs,
          shadow: true,
          forceRgba: color,
        },
      )
    })
    return // 选人阶段不画网格/MP box(spellMenu 未建;uigame.c 真值)
  }

  const sel = state.spells[state.cursor]

  // ① 红框网格 + 仙术名(3 列 × 5 行)。先画字、再画光标 → 光标在文字之上。
  drawSlicedBox(ctx, assets.redBox, GRID_X, GRID_Y, GRID_W, GRID_H)
  state.spells.forEach((sp, i) => {
    const x = ITEM_X0 + (i % GRID_COLS) * ITEM_DX
    const y = ITEM_Y0 + Math.floor(i / GRID_COLS) * ITEM_DY
    const selected = i === state.cursor
    // MP 不足 → 灰显禁用(原版 magic-select insufficient → 0x18/选中 0x1C);够 → 米白/选中黄闪
    const affordable = !caster || caster.mp >= (sp.cost.mp ?? 0)
    const color = affordable
      ? selected
        ? blink
        : COLOR_NORMAL
      : selected
        ? COLOR_DISABLED_SEL
        : COLOR_DISABLED
    renderSpans(ctx, [{ text: sp.name }], x, y, { glyphs, shadow: true, forceRgba: color })
    if (selected && assets.cursorGrid)
      ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY)
  })

  // ② MP box:needed(黄)/ slash / current(青)
  drawScroll(ctx, assets.scroll, 0, 0, MP_BOX_LEN)
  if (sel) drawNumRight(ctx, sel.cost.mp ?? 0, MP_NEEDED_X, MP_NUM_Y, assets.nums)
  if (assets.slash) ctx.drawImage(assets.slash, MP_SLASH_X, MP_NUM_Y)
  if (caster) drawNumRight(ctx, caster.mp, MP_CUR_X, MP_NUM_Y, assets.numsCyan)

  // ③ 选人红箭头:仅「选目标」阶段画,指向 targetIdx 队员框顶(uigame.c:793-796)
  if (state.phase === 'pick-target' && assets.cursorUp) {
    ctx.drawImage(assets.cursorUp, PICKER_X + state.targetIdx * PBOX_STEP, PICKER_Y)
  }

  // ④ 描述(顶部,浅黄 0x3C):选中仙术 desc
  if (sel) {
    renderSpans(ctx, [{ text: sel.desc }], DESC_X, DESC_Y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DESC,
    })
  }
}
