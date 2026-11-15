// 存档浏览界面 UI。隐藏整个菜单,卷轴横向铺满全宽(main.ts saveBrowser 打开时不画 menuBox)。
// 每槽 = 卷轴 scroll 九宫格(烘焙 9 块,drawSlicedBox 撑任意高×宽,平铺不拉伸),保金钱卷轴皮。
// 槽内横排:选中光标、槽号、缩略图。右半部分两行，右列留给保存序号和时间。
import { type Locale, lookupText } from '@type-pal/content'
import { pageOf, type SaveBrowserState } from '../save/browser-state.js'
import {
  ALL_SLOT_IDS,
  type SaveMeta,
  SLOTS_PER_PAGE,
  type SlotId,
  slotKind,
  TOTAL_PAGES,
} from '../save/types.js'
import type { GlyphTable } from '../text/glyph.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import {
  COLOR_DISABLED,
  COLOR_DISABLED_SEL,
  COLOR_NORMAL,
  drawConfirmBox,
  drawNumber,
  drawSlicedBox,
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
const METADATA_GAP = 8
const COMPACT_SCALE = 0.75 // 16px 点阵变成 12px，在 4× 画布上仍为整数像素。
const PARTY_SEPARATOR = '  '
const ELLIPSIS = '…'

function formatTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fitLabel(text: string, width: number, glyphs: GlyphTable): string {
  const limit = width - 1 // renderSpans 的阴影向右多画 1px。
  const ellipsisWidth = measureSpans([{ text: ELLIPSIS }], glyphs)
  let textWidth = 0
  let prefix = ''
  let ellipsisPrefix = ''
  for (const character of text) {
    textWidth += measureSpans([{ text: character }], glyphs)
    if (textWidth > limit) return ellipsisWidth <= limit ? ellipsisPrefix + ELLIPSIS : ''
    prefix += character
    if (textWidth + ellipsisWidth <= limit) ellipsisPrefix = prefix
  }
  return text
}

function fitMetadata(text: string, width: number, compactWidth: number, glyphs: GlyphTable) {
  if (fitLabel(text, width, glyphs) === text) return { text, scale: 1 }
  return {
    text: fitLabel(text, compactWidth / COMPACT_SCALE, glyphs),
    scale: COMPACT_SCALE,
  }
}

function drawMetadataText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  glyphs: GlyphTable,
): void {
  const spans = [{ text }]
  const style = { glyphs, shadow: true, forceRgba: COLOR_NORMAL }
  if (scale === 1) {
    renderSpans(ctx, spans, x, y, style)
    return
  }
  ctx.save()
  ctx.translate(x, y + 2)
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = false
  renderSpans(ctx, spans, 0, 0, style)
  ctx.restore()
}

function firstPartyRowSize(members: readonly string[], width: number, glyphs: GlyphTable): number {
  const spacing = measureSpans([{ text: PARTY_SEPARATOR }], glyphs)
  let remaining = width / COMPACT_SCALE - 1
  for (const [index, text] of members.entries()) {
    remaining -= measureSpans([{ text }], glyphs)
    if (remaining < 0) return Math.max(1, index)
    remaining -= spacing
  }
  return members.length
}

function drawSaveMetadata(
  ctx: CanvasRenderingContext2D,
  meta: SaveMeta,
  x: number,
  right: number,
  rowY: number,
  glyphs: GlyphTable,
  digits: MenuAssets['nums'],
): void {
  const count = meta.savedTimes
  let partyRight = right
  if (count !== undefined) {
    // PAL 的跨槽保存序号，用黄色的原数字图集右对齐。
    let digitsWidth = 0
    for (const digit of String(Math.max(0, Math.floor(count))))
      digitsWidth += digits[Number(digit)]?.width ?? 0
    partyRight -= digitsWidth + METADATA_GAP
  }
  const members = meta.party.map(({ name, level }) => `${name} ${level}`)
  const party = members.join(PARTY_SEPARATOR)
  const partyWidth = partyRight - x
  const partyLabel = fitMetadata(party, partyWidth, partyWidth, glyphs)
  const stacked = members.length > 1 && partyLabel.text !== party
  if (count !== undefined) drawNumber(ctx, count, right, rowY + (stacked ? 7 : 12), digits)
  if (stacked) {
    const split = firstPartyRowSize(members, partyWidth, glyphs)
    const first = fitLabel(
      members.slice(0, split).join(PARTY_SEPARATOR),
      partyWidth / COMPACT_SCALE,
      glyphs,
    )
    const second = fitLabel(
      members.slice(split).join(PARTY_SEPARATOR),
      (right - x) / COMPACT_SCALE,
      glyphs,
    )
    // 12px with shadow leaves clearance for two roster lines and one metadata line in the scroll.
    drawMetadataText(ctx, first, x, rowY + 3, COMPACT_SCALE, glyphs)
    drawMetadataText(ctx, second, x, rowY + 17, COMPACT_SCALE, glyphs)
  } else {
    drawMetadataText(ctx, partyLabel.text, x, rowY + 8, partyLabel.scale, glyphs)
  }

  const time = formatTime(meta.savedAt)
  const timeWidth = measureSpans([{ text: time }], glyphs)
  const detailsWidth = right - x - METADATA_GAP
  const compactWidth = detailsWidth - timeWidth * COMPACT_SCALE
  const title = stacked
    ? { text: fitLabel(meta.mapName, compactWidth / COMPACT_SCALE, glyphs), scale: COMPACT_SCALE }
    : fitMetadata(meta.mapName, detailsWidth - timeWidth, compactWidth, glyphs)
  const detailsY = rowY + (stacked ? 31 : 26)
  drawMetadataText(ctx, title.text, x, detailsY, title.scale, glyphs)
  drawMetadataText(ctx, time, right - timeWidth * title.scale, detailsY, title.scale, glyphs)
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
  const cb = assets.scroll
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

    drawSlicedBox(ctx, cb, PANEL_X, cy, boxW, BOX_H, { shadow: false }) // 卷轴 9-slice(scroll tiles)撑满槽

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
      drawSaveMetadata(ctx, meta, tx + tw + 6, rx, cy, glyphs, assets.nums)
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
