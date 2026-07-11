// 系统菜单 Canvas UI(D17)。坐标对齐一阶段 draw-menu.ts(PAL_SystemMenu)+ draw-confirm.ts。
// 320 逻辑坐标,调用方已 ctx.scale(WORLD_SCALE)。
// 色常量复用 menu-box(单一真值源,不本地重声明)。
import { type Locale, lookupText, type TextId } from '@type-pal/content'
import type { SystemMenuState } from '../system-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import {
  COLOR_DISABLED,
  COLOR_DISABLED_SEL,
  COLOR_NORMAL,
  drawConfirmBox,
  drawSlicedBox,
  type MenuAssets,
  SELECTED_COLORS,
} from './menu-box.js'

// 系统 menu box@(40,60),项起(53,72),行距 18(draw-menu.ts:54-56 真值)
const SYS_BOX = { x: 40, y: 60 }
const SYS_BOX_W = 92 // box 宽:作者两轮校准(84 贴边 → 100 偏宽 → 92 折中)
const SYS_ITEM_X = 53
const SYS_ITEM_Y0 = 72
const SYS_ITEM_DY = 18

export function drawSystemMenu(
  ctx: CanvasRenderingContext2D,
  state: SystemMenuState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: Locale,
  placeholder?: TextId, // 占位提示文案 id(选了占位项时显示)
): void {
  if (!state.active) return
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL

  // ① 系统 box@(40,60) + 5 项(53,72+i*18)
  drawSlicedBox(ctx, assets.box, SYS_BOX.x, SYS_BOX.y, SYS_BOX_W, 18 * state.items.length + 22)
  state.items.forEach((it, i) => {
    const y = SYS_ITEM_Y0 + i * SYS_ITEM_DY
    const selected = i === state.cursor && state.phase === 'menu'
    const color = it.disabled
      ? selected
        ? COLOR_DISABLED_SEL
        : COLOR_DISABLED
      : selected
        ? blink
        : COLOR_NORMAL
    renderSpans(ctx, [{ text: lookupText(it.label, locale) }], SYS_ITEM_X, y, {
      glyphs,
      shadow: true,
      forceRgba: color,
    })
  })

  // ② confirm 阶段:叠 否/是 确认框(draw-confirm.ts:31-46 真值)
  if (state.phase === 'confirm') {
    drawConfirmBox(
      ctx,
      assets.scroll,
      {
        leftText: lookupText('menu.system.no', locale),
        rightText: lookupText('menu.system.yes', locale),
        rightSelected: state.confirmYes,
      },
      glyphs,
      now,
    )
  }

  // ③ switch 阶段:音乐/音效 关/开 子选单 —— 复用确认框布局(一阶段 draw-confirm.ts:28
  //   PAL_SwitchMenu 真值:labels 换「关/开」,rightSelected = 开高亮)。
  if (state.phase === 'switch') {
    drawConfirmBox(
      ctx,
      assets.scroll,
      {
        leftText: lookupText('menu.system.off', locale),
        rightText: lookupText('menu.system.on', locale),
        rightSelected: state.confirmYes,
      },
      glyphs,
      now,
    )
  }

  // ④ 占位提示(quit 未实现等;main.ts 持 placeholder 态传入)
  if (placeholder) {
    renderSpans(ctx, [{ text: lookupText(placeholder, locale) }], 130, 84, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DISABLED,
    })
  }
}
