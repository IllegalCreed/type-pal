// 存档浏览界面 UI。隐藏整个菜单,卷轴横向铺满全宽(main.ts saveBrowser 打开时不画 menuBox)。
// 每槽 = 金钱卷轴纹理「重切九宫格」(drawScrollBox):3 横向条各纵向再切 3 段(中段平铺非拉伸)→ 任意高×宽,保金钱卷轴皮。
// 槽内横排:三角光标(选中,竖直居中) + 槽号(auto/quick「自动存档/快速存档」2 行) + 缩略图 + 队伍·等级(上) + 地图名(左)·时间(右)(同一下行)。
import { type Locale, lookupText } from '@type-pal/content'
import { pageOf, type SaveBrowserState } from '../save/browser-state.js'
import { ALL_SLOT_IDS, SLOTS_PER_PAGE, type SlotId, slotKind, TOTAL_PAGES } from '../save/types.js'
import type { GlyphTable } from '../text/glyph.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import {
  COLOR_DISABLED,
  COLOR_DISABLED_SEL,
  COLOR_NORMAL,
  drawConfirmBox,
  type MenuAssets,
  SELECTED_COLORS,
} from './menu-box.js'

const COLOR_TITLE = [247, 231, 109] as const // 黄(标题/翻页三角)
// 隐藏整个菜单,卷轴横向铺满全宽
const PANEL_X = 6
const PANEL_RIGHT = 314
const TITLE_Y = 4 // 标题/页码上移,与首条卷轴留间距
const ROW_Y0 = 28
const ROW_DY = 56
const BOX_H = 50
// 金钱卷轴源 34px 高(实测):上/下边框各 4px(y0-3 / y30-33),中段 26px(y4-29,纯色 → 平铺无缝)
const SCROLL_BT = 4
const SCROLL_BB = 4

/** 金钱卷轴(单行 3 条)重切九宫格:横向 左帽+中段(tile)+右帽,纵向 上边+中段(平铺,非拉伸)+下边。 */
function drawScrollBox(
  ctx: CanvasRenderingContext2D,
  box: { left?: ImageBitmap; mid?: ImageBitmap; right?: ImageBitmap },
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { left, mid, right } = box
  if (!left || !mid || !right) return
  const srcH = left.height
  const midSrcH = srcH - SCROLL_BT - SCROLL_BB
  // 一列:上边(原高) + 中段(纵向平铺,非拉伸,源恒取中段顶部 dh 行) + 下边(原高)
  const col = (img: ImageBitmap, dx: number, dw: number, sw: number): void => {
    ctx.drawImage(img, 0, 0, sw, SCROLL_BT, dx, y, dw, SCROLL_BT)
    let dy = y + SCROLL_BT
    const midEnd = y + h - SCROLL_BB
    while (dy < midEnd) {
      const dh = Math.min(midSrcH, midEnd - dy)
      ctx.drawImage(img, 0, SCROLL_BT, sw, dh, dx, dy, dw, dh)
      dy += dh
    }
    ctx.drawImage(img, 0, srcH - SCROLL_BB, sw, SCROLL_BB, dx, y + h - SCROLL_BB, dw, SCROLL_BB)
  }
  col(left, x, left.width, left.width) // 左帽
  const endX = x + w - right.width
  let cx = x + left.width
  while (cx < endX) {
    const dw = Math.min(mid.width, endX - cx) // 中段横向 tile(末块裁剪)
    col(mid, cx, dw, dw)
    cx += dw
  }
  col(right, endX, right.width, right.width) // 右帽
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 三角(字库无 ◄►)。**像素行绘制**(非 ctx.fill,避免抗锯齿糊边,保点阵锐利)。
 *  黑三重阴影(同文字 renderSpans:offset +1,0 / 0,+1 / +1,+1)+ 主色。right=尖朝右、left=尖朝左。 */
function fillTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dir: 'left' | 'right',
  rgb: readonly [number, number, number],
): void {
  // 一遍(偏移 ox,oy):逐行 fillRect。right 左竖边在 x、尖在 x+size;left 右竖边在 x+size、尖在 x。
  const rows = (color: string, ox: number, oy: number): void => {
    ctx.fillStyle = color
    for (let dy = -size; dy <= size; dy++) {
      const w = size - Math.abs(dy) + 1
      const rowX = dir === 'right' ? x : x + Math.abs(dy)
      ctx.fillRect(rowX + ox, y + dy + oy, w, 1)
    }
  }
  ctx.save()
  rows('#000', 1, 0)
  rows('#000', 0, 1)
  rows('#000', 1, 1)
  rows(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, 0, 0)
  ctx.restore()
}

export function drawSaveBrowser(
  ctx: CanvasRenderingContext2D,
  state: SaveBrowserState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: Locale,
  thumbs: Map<SlotId, ImageBitmap>,
  overwriteYes = false,
): void {
  if (!state.active) return
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  const cb = assets.cashBox
  const boxW = PANEL_RIGHT - PANEL_X
  const rx = PANEL_X + boxW - 8 // 文本右界(时间右对齐到此)

  // 标题(黄)
  const titleId = state.mode === 'save' ? 'menu.system.save' : 'menu.system.load'
  renderSpans(ctx, [{ text: lookupText(titleId, locale) }], PANEL_X + 2, TITLE_Y, {
    glyphs,
    shadow: true,
    forceRgba: COLOR_TITLE,
  })

  // 翻页:◄ 页码 ►(屏内顶部右;有上/下页才画三角)
  const page = pageOf(state.cursor)
  const pageText = `${page + 1}/${TOTAL_PAGES}`
  const pageW = measureSpans([{ text: pageText }], glyphs)
  const pageX = rx - pageW
  renderSpans(ctx, [{ text: pageText }], pageX, TITLE_Y, {
    glyphs,
    shadow: true,
    forceRgba: COLOR_NORMAL,
  })
  if (page > 0) fillTriangle(ctx, pageX - 13, TITLE_Y + 8, 4, 'left', COLOR_TITLE)
  if (page < TOTAL_PAGES - 1) fillTriangle(ctx, rx + 4, TITLE_Y + 8, 4, 'right', COLOR_TITLE)

  // 当前页 3 槽(金钱卷轴九宫格)
  const pageStart = page * SLOTS_PER_PAGE
  for (let row = 0; row < SLOTS_PER_PAGE; row++) {
    const idx = pageStart + row
    if (idx >= ALL_SLOT_IDS.length) break
    const slotId = ALL_SLOT_IDS[idx]
    if (!slotId) break
    const meta = state.metas[idx] ?? null
    const kind = slotKind(slotId)
    const selected = idx === state.cursor && !state.confirmOverwrite
    const blocked = state.mode === 'save' && kind !== 'manual' // save 模式 auto/quick 不可写
    const cy = ROW_Y0 + row * ROW_DY
    const labelColor = blocked
      ? selected
        ? COLOR_DISABLED_SEL
        : COLOR_DISABLED
      : selected
        ? blink
        : COLOR_NORMAL

    drawScrollBox(ctx, cb, PANEL_X, cy, boxW, BOX_H)

    // 选中光标:三角(同翻页风格,带黑阴影;框内,竖直居中=框心);色用 blink → 六色流光炫彩
    if (selected) fillTriangle(ctx, PANEL_X + 10, cy + BOX_H / 2, 4, 'right', labelColor)

    // 槽号:auto/quick「自动存档/快速存档」2 行,manual 单行号(上移居中,让出左侧三角)
    const lx = PANEL_X + 20
    if (kind === 'auto' || kind === 'quick') {
      const word = kind === 'auto' ? '自动' : '快速'
      renderSpans(ctx, [{ text: word }], lx, cy + 8, {
        glyphs,
        shadow: true,
        forceRgba: labelColor,
      })
      renderSpans(ctx, [{ text: '存档' }], lx, cy + 26, {
        glyphs,
        shadow: true,
        forceRgba: labelColor,
      })
    } else {
      const num = slotId.replace(/^m/, '')
      const numX = PANEL_X + 37 - measureSpans([{ text: num }], glyphs) / 2 // 水平居中于标签列
      renderSpans(ctx, [{ text: num }], numX, cy + 17, {
        glyphs,
        shadow: true,
        forceRgba: labelColor,
      })
    }

    // 缩略图 + 信息(仅已存槽;空槽只显槽号)
    if (meta) {
      const tw = 52
      const th = 33
      const tx = PANEL_X + 60 // 让开 auto/quick 2 字标签(后移防挡字)
      const thumb = thumbs.get(slotId)
      if (thumb) ctx.drawImage(thumb, tx, cy + 8, tw, th)
      const ix = tx + tw + 6
      const party = meta.party.map((p) => `${p.name} ${p.level}`).join('  ')
      renderSpans(ctx, [{ text: party }], ix, cy + 8, {
        glyphs,
        shadow: true,
        forceRgba: COLOR_NORMAL,
      })
      // 地图名(左对齐) + 时间(右对齐),同一行
      renderSpans(ctx, [{ text: meta.mapName }], ix, cy + 26, {
        glyphs,
        shadow: true,
        forceRgba: COLOR_NORMAL,
      })
      const t = formatTime(meta.savedAt)
      const tW = measureSpans([{ text: t }], glyphs)
      renderSpans(ctx, [{ text: t }], rx - tW, cy + 26, {
        glyphs,
        shadow: true,
        forceRgba: COLOR_NORMAL,
      })
    }
  }

  // 覆盖确认框(覆盖已存手动槽)
  if (state.confirmOverwrite) {
    drawConfirmBox(
      ctx,
      cb,
      {
        leftText: lookupText('menu.system.no', locale),
        rightText: lookupText('menu.system.yes', locale),
        rightSelected: overwriteYes,
      },
      glyphs,
      now,
    )
  }
}
