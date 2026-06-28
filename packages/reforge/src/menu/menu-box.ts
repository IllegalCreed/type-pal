/**
 * 菜单 UI(D17)。在 320 逻辑坐标画,调用方已设 ctx.scale(WORLD_SCALE=4)。
 *
 * 复用:renderSpans/measureSpans(字模)、ctx.scale(4)(同对话框高清)。
 * 数据驱动:属性/装备遍历列表动态画,加维度自动适配(不写死坐标)。
 * 九宫格框:原版 UI box frame-00..08(9 块直接定位,因 frame 尺寸不规则)。
 */
import {
  type CharacterInstance,
  type Locale,
  lookupText,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import type { MenuState } from '../menu-state.js'
import { MAIN_ITEMS } from '../menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'

/** 9 个九宫格块(0..8 = i*3+j,i=row,j=col;黄框 frame-00..08)。 */
interface BoxTiles {
  /** 9 块预烘 RGBA,索引 = i*3+j。frame 尺寸不规则 → drawSlicedBox 按各块实际宽高定位。 */
  tiles: (ImageBitmap | undefined)[]
}

/** 平铺填充:在 (dx,dy,dw,dh) 内重复画 img(原版 RLEBlit 平铺,非拉伸),clip 裁出界部分。 */
function tileFill(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (dw <= 0 || dh <= 0) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, dy, dw, dh)
  ctx.clip()
  for (let yy = dy; yy < dy + dh; yy += img.height) {
    for (let xx = dx; xx < dx + dw; xx += img.width) {
      ctx.drawImage(img, xx, yy)
    }
  }
  ctx.restore()
}

/**
 * 大阴影:框的**镂空形状**(非实心方块)偏移 +6 画半透明黑,仿原版 PAL_CreateBoxWithShadow。
 * 离屏画一遍框 → source-in 染黑(保 alpha 形状)→ 半透明偏移贴主画布。
 */
function drawBoxShadow(
  ctx: CanvasRenderingContext2D,
  box: BoxTiles,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const off = document.createElement('canvas')
  off.width = Math.ceil(w)
  off.height = Math.ceil(h)
  const octx = off.getContext('2d')
  if (!octx) return
  octx.imageSmoothingEnabled = false
  drawSlicedBox(octx, box, 0, 0, w, h, { shadow: false }) // shadow:false 避免递归
  octx.globalCompositeOperation = 'source-in' // 仅已画像素处填 → 黑剪影,保框形状
  octx.fillStyle = '#000'
  octx.fillRect(0, 0, off.width, off.height)
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.drawImage(off, x + 6, y + 6)
  ctx.restore()
}

/**
 * 统一可切片框原语(design §4)。九宫格 frame 尺寸不规则(右列卷轴头 33/31 > 中段 23)
 * → 各块按**实际宽高**定位:左列锚左 / 右列锚右 / 上行锚上 / 下行锚下;四边 + 中心
 * **平铺**(非拉伸);四角原尺寸最后画(盖住重叠端)。大阴影按框镂空形状(见 drawBoxShadow)。
 */
export function drawSlicedBox(
  ctx: CanvasRenderingContext2D,
  box: BoxTiles,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { shadow?: boolean } = {},
): void {
  const { tiles } = box
  const t = (i: number, j: number): ImageBitmap | undefined => tiles[i * 3 + j]
  const tl = t(0, 0)
  const tr = t(0, 2)
  const bl = t(2, 0)
  const br = t(2, 2)
  const top = t(0, 1)
  const bottom = t(2, 1)
  const left = t(1, 0)
  const right = t(1, 2)
  const center = t(1, 1)

  if (opts.shadow !== false) drawBoxShadow(ctx, box, x, y, w, h)

  // 列宽/行高取边框块实际尺寸。右列宽用「中段右块」R(其余右块 = 卷轴头,更宽 → 往右探出)
  const leftW = left?.width ?? tl?.width ?? 0
  const rightW = right?.width ?? tr?.width ?? 0
  const topH = top?.height ?? tl?.height ?? 0
  const botH = bottom?.height ?? bl?.height ?? 0
  const innerX = x + leftW
  const innerY = y + topH
  const innerW = w - leftW - rightW // 中段宽(中心 + 上下边)
  const innerH = h - topH - botH // 中段高(中心 + 左右边)
  const rightColX = x + w - rightW // 右列左边缘 = 中段右边界:角块回纹主体对齐 R、卷轴头从此右探(非锚右)
  const botRowY = y + h - botH

  // 中心 + 四边:平铺(替拉伸,纹理不变形)
  if (center) tileFill(ctx, center, innerX, innerY, innerW, innerH)
  if (top) tileFill(ctx, top, innerX, y, innerW, topH)
  if (bottom) tileFill(ctx, bottom, innerX, botRowY, innerW, botH)
  if (left) tileFill(ctx, left, x, innerY, leftW, innerH)
  if (right) tileFill(ctx, right, rightColX, innerY, rightW, innerH)

  // 四角原尺寸:左列锚左 x / 右列锚左 rightColX(回纹主体对齐、卷轴头右探);上行锚上 / 下行锚下。
  // 仿原版 sdlpal PAL_CreateBox 逐块顺序拼接(右列各行左边缘对齐,非右对齐 → 修错位)。
  if (tl) ctx.drawImage(tl, x, y)
  if (tr) ctx.drawImage(tr, rightColX, y)
  if (bl) ctx.drawImage(bl, x, botRowY)
  if (br) ctx.drawImage(br, rightColX, botRowY)
}

// ── 主菜单布局 ───────────────────────────────────────────────

const MENU_X = 110
const MENU_Y = 40
const MENU_W = 100
const MENU_ITEM_H = 18
const MENU_TEXT_X = MENU_X + 16

// ── 状态面板布局 ─────────────────────────────────────────────

const STAT_X = 30
const STAT_Y0 = 50
const STAT_LINE_H = 16
const STAT_VAL_X = 90 // 属性值 x
const EQUIP_X = 180
const EQUIP_Y0 = 50
const EQUIP_SLOT_SIZE = 32 // 装备格显示尺寸(逻辑)
const EQUIP_LINE_H = 40

/** 状态面板属性显示列表(数据驱动:加属性 = 列表多一条,UI 自动多一行)。 */
function statList(c: CharacterInstance): [TextId, number][] {
  return [
    ['stat.level', c.level],
    ['stat.hp', c.hp],
    ['stat.mp', c.mp],
    ['stat.attack', c.attack],
    ['stat.defense', c.defense],
    ['stat.magicAttack', c.magicAttack],
    ['stat.speed', c.speed],
  ]
}

/** 装备槽列表(可扩展:加槽位 = 列表多一条)。 */
const EQUIP_SLOTS: TextId[] = [
  'equip.weapon',
  'equip.head',
  'equip.body',
  'equip.feet',
  'equip.accessory',
  'equip.amulet',
]

export interface MenuAssets {
  /** 黄框九宫格 9 块(ImageBitmap,索引 i*3+j)。 */
  box: BoxTiles
  /** 状态背景图。 */
  statusBg: ImageBitmap | undefined
  /** 装备格图。 */
  equipSlot: ImageBitmap | undefined
}

/** 加载 PNG → ImageBitmap;失败返回 undefined(不阻断,渲染容错)。 */
async function loadPng(url: string): Promise<ImageBitmap | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    return await createImageBitmap(await res.blob())
  } catch {
    return undefined
  }
}

/**
 * 加载菜单资产:黄框九宫格 + 状态背景 + 装备格。
 * 九宫格 = 预烘 RGBA(@type-pal/migrate bake-assets,palette 0),从 /ui/box;背景/装备格从 /ui。
 */
export async function loadMenuAssets(): Promise<MenuAssets> {
  // 黄框 9 块预烘 RGBA(frame-00..08 = i*3+j),drawImage 直接用、零运行时烤
  const tiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    const name = `frame-${String(i).padStart(2, '0')}.png`
    tiles.push(await loadPng(`/ui/box/${name}`))
  }
  const [statusBg, equipSlot] = await Promise.all([
    loadPng('/ui/status-bg.png'),
    loadPng('/ui/equip-slot.png'),
  ])
  return {
    box: { tiles },
    statusBg,
    equipSlot,
  }
}

export class MenuBox {
  constructor(
    private readonly glyphs: GlyphTable,
    private readonly locale: Locale,
    private readonly assets: MenuAssets,
  ) {}

  render(ctx: CanvasRenderingContext2D, state: MenuState, world: WorldState): void {
    if (state.menu === 'status') {
      this.renderStatus(ctx, world)
      return
    }
    // main(其余占位菜单也显示 main 框 + 未实现提示)
    this.renderMain(ctx, state)
  }

  private renderMain(ctx: CanvasRenderingContext2D, state: MenuState): void {
    const h = 16 + MAIN_ITEMS.length * MENU_ITEM_H
    drawSlicedBox(ctx, this.assets.box, MENU_X, MENU_Y, MENU_W, h)

    MAIN_ITEMS.forEach((item, idx) => {
      const y = MENU_Y + 10 + idx * MENU_ITEM_H
      const isCursor = idx === state.cursor
      const txt = lookupText(item.label, this.locale)
      // 光标(▶)+ 项文本;disabled 暗色
      const spans = [{ text: `${isCursor ? '▶' : '　'}${txt}` }]
      renderSpans(ctx, spans, MENU_TEXT_X, y, {
        glyphs: this.glyphs,
        shadow: true,
        forceRgba: item.enabled ? undefined : ([100, 100, 100] as const),
      })
    })

    // 占位项选中显「未实现」
    const cur = MAIN_ITEMS[state.cursor]
    if (cur && !cur.enabled) {
      renderSpans(
        ctx,
        [{ text: lookupText('menu.not-implemented', this.locale) }],
        MENU_TEXT_X,
        MENU_Y + h + 4,
        {
          glyphs: this.glyphs,
          shadow: true,
          forceRgba: [200, 200, 80] as const,
        },
      )
    }
  }

  private renderStatus(ctx: CanvasRenderingContext2D, world: WorldState): void {
    // 状态背景(全屏 320×200)
    if (this.assets.statusBg) {
      ctx.drawImage(this.assets.statusBg, 0, 0, 320, 200)
    }

    // demo 单人:取 party[0]。将来多人菜单选角。
    const c = world.party[0]
    if (!c) return

    // 角色名
    renderSpans(ctx, [{ text: lookupText('name.li-xiaoyao', this.locale) }], STAT_X, STAT_Y0 - 24, {
      glyphs: this.glyphs,
      shadow: true,
    })

    // 属性列表(数据驱动遍历:加属性 = 列表多一条,UI 自动多一行,不返工)
    let y = STAT_Y0
    for (const [labelId, val] of statList(c)) {
      renderSpans(ctx, [{ text: lookupText(labelId, this.locale) }], STAT_X, y, {
        glyphs: this.glyphs,
        shadow: true,
      })
      renderSpans(ctx, [{ text: String(val) }], STAT_VAL_X, y, {
        glyphs: this.glyphs,
        shadow: true,
      })
      y += STAT_LINE_H
    }

    // 装备槽(数据驱动遍历:加槽位 = 列表多一条,自动适配)
    let ey = EQUIP_Y0
    for (const slotLabel of EQUIP_SLOTS) {
      // 装备格图标(空槽也画)
      if (this.assets.equipSlot) {
        ctx.drawImage(this.assets.equipSlot, EQUIP_X, ey, EQUIP_SLOT_SIZE, EQUIP_SLOT_SIZE)
      }
      // 槽位名 + 装备(空则 —)
      const slotName = lookupText(slotLabel, this.locale)
      renderSpans(ctx, [{ text: slotName }], EQUIP_X + EQUIP_SLOT_SIZE + 4, ey + 4, {
        glyphs: this.glyphs,
        shadow: true,
      })
      ey += EQUIP_LINE_H
    }
  }
}
