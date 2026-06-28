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
import { measureSpans, renderSpans } from '../text/text-render.js'

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
  // 画布留余量:框右侧卷轴头探出(~10px)+ 阴影偏移(6),否则右边阴影被裁
  const off = document.createElement('canvas')
  off.width = Math.ceil(w) + 16
  off.height = Math.ceil(h) + 16
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

// ── 主菜单布局(原版 sdlpal uigame.c:974-989)───────────────────
// 框 PAL_XY(3,37)、项 PAL_XY(16,50) 行距 18;框高 = border 20 + 中段 18×3 + border 20
const MENU_X = 3
const MENU_Y = 37
// 原版 PAL_MenuTextMaxWidth("状态"=2字)=(32+8)>>4=2 → nColumns=1(中段 1 块 16px)。
// 框宽 = 左 22 + 中 16 + 右 23 = 61(TR 卷轴头探出到 3+61+10=74,与原版行0=3+22+16+33 一致)
const MENU_W = 61
const MENU_H = 94 // 上 20 + 中 18×3(nRows=3) + 下 20
const ITEM_X = 16
const ITEM_Y0 = 50
const ITEM_H = 18

// 菜单项色(palette 0;ui.h):普通 0x4F / 禁用 0x18 / 禁用选中 0x1C / 选中 0xF9-FE(6 帧闪烁)
const COLOR_NORMAL = [199, 186, 174] as const
const COLOR_DISABLED = [166, 40, 32] as const
const COLOR_DISABLED_SEL = [215, 109, 93] as const
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

// ── 状态面板布局(三栏:左属性 / 中名字+立绘 / 右 6 装备格 2×3 平铺)──
// 左栏:属性 9 项(label 字模 + value 数字 sprite)
const STAT_X = 8 // label x
const STAT_VAL_RIGHT = 70 // value(当前)数字右对齐 x
const STAT_SLASH_X = 72 // 斜杠紧跟当前值
const STAT_MAX_LEFT = 79 // 最大值左对齐起点(紧跟斜杠,不预留位数空间)
const STAT_MAX_DOWN = 5 // 最大值偏下(原版错落:当前在上、最大错落偏下)
const STAT_Y0 = 10
const STAT_LINE_H = 20 // 属性行距(作者:再增加)
const STAT_NUM_DY = 4 // 数字 sprite 相对 label 顶 y 微调
// 中栏:名字(上) + 立绘(下),整体垂直居中
const MID_CX = 158
const NAME_Y = 30
const AVATAR_Y = 50
const COLOR_NAME = [255, 203, 113] as const // 名字色 = 原版 MENUITEM_COLOR_CONFIRMED 0x2C 金黄
// 右栏:6 装备格 2 列 × 3 行平铺(放大到接近原版 50×49)
const EQUIP_X0 = 200
const EQUIP_Y0 = 8
const EQUIP_COLS = 2
const EQUIP_SLOT_SIZE = 56
const EQUIP_GAP_X = 6
const EQUIP_GAP_Y = 8
const EQUIP_BORDER = 7 // slot 占位框边框厚(按比例;图标缩进此内凹区,定位条不压边框)
const EQUIP_NAME_INSET = 13 // 槽名距格底(格内底,无衬底)

/** 画数字(右对齐:个位右边缘固定在 rightX,往左排)。原版 PAL_DrawNumber 黄色右对齐。 */
function drawNumber(
  ctx: CanvasRenderingContext2D,
  value: number,
  rightX: number,
  y: number,
  nums: (ImageBitmap | undefined)[],
): void {
  const s = String(Math.max(0, Math.floor(value)))
  let x = rightX
  for (let i = s.length - 1; i >= 0; i--) {
    const d = s.charCodeAt(i) - 48 // '0'=48
    const img = nums[d]
    if (img) {
      x -= img.width
      ctx.drawImage(img, x, y)
    }
  }
}

/** 画数字(左对齐:首位左边缘固定在 leftX,往右排)。max 紧跟斜杠用,不预留位数空间。 */
function drawNumberLeft(
  ctx: CanvasRenderingContext2D,
  value: number,
  leftX: number,
  y: number,
  nums: (ImageBitmap | undefined)[],
): void {
  const s = String(Math.max(0, Math.floor(value)))
  let x = leftX
  for (let i = 0; i < s.length; i++) {
    const img = nums[s.charCodeAt(i) - 48]
    if (img) {
      ctx.drawImage(img, x, y)
      x += img.width
    }
  }
}

/**
 * 金钱横卷轴(原版 PAL_CreateSingleLineBox):左头 + 中段×nLen + 右头。frame 44/45/46。
 * 阴影(原版 PAL_CreateSingleLineBoxWithShadow,+6 偏移):整框画到离屏 → source-in 染黑
 * 剪影 → alpha 0.35 偏移 +6 画到主 canvas(同 drawBoxShadow 思路,保卷轴镂空形状)。
 */
function drawCashBox(
  ctx: CanvasRenderingContext2D,
  box: { left?: ImageBitmap; mid?: ImageBitmap; right?: ImageBitmap },
  x: number,
  y: number,
  nLen: number,
  opts: { shadow?: boolean } = {},
): void {
  // 离屏画卷轴本体(供阴影剪影)
  const leftW = box.left?.width ?? 0
  const midW = box.mid?.width ?? 0
  const rightW = box.right?.width ?? 0
  const h = box.left?.height ?? box.mid?.height ?? box.right?.height ?? 0
  const w = leftW + midW * nLen + rightW
  if (w <= 0 || h <= 0) return

  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const octx = off.getContext('2d')
  if (!octx) return
  octx.imageSmoothingEnabled = false
  let cx = 0
  if (box.left) {
    octx.drawImage(box.left, cx, 0)
    cx += box.left.width
  }
  if (box.mid) {
    for (let i = 0; i < nLen; i++) {
      octx.drawImage(box.mid, cx, 0)
      cx += box.mid.width
    }
  }
  if (box.right) octx.drawImage(box.right, cx, 0)

  // 阴影:离屏 source-in 染黑 → 主 canvas alpha 偏移 +6
  if (opts.shadow !== false) {
    const shadowOff = document.createElement('canvas')
    shadowOff.width = w
    shadowOff.height = h
    const sctx = shadowOff.getContext('2d')
    if (sctx) {
      sctx.drawImage(off, 0, 0)
      sctx.globalCompositeOperation = 'source-in'
      sctx.fillStyle = '#000'
      sctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.drawImage(shadowOff, x + 6, y + 6)
      ctx.restore()
    }
  }

  // 本体
  ctx.drawImage(off, x, y)
}

// demo:李逍遥 1→2 升级所需 exp(原版 rgLevelUpExp[1]);升级系统建后取真值
const EXP_TO_NEXT = 15

/** 状态面板属性行(数据驱动:加属性 = 列表多一条)。顺序对齐原版。
 *  带 max 的显「当前 / 最大」:hp/mp 最大值蓝(maxKind blue)、exp 下一级青(cyan)。 */
interface StatRow {
  labelId: TextId
  value: number
  max?: number
  maxKind?: 'blue' | 'cyan'
}
function statList(c: CharacterInstance): StatRow[] {
  return [
    { labelId: 'stat.exp', value: c.exp, max: EXP_TO_NEXT, maxKind: 'cyan' },
    { labelId: 'stat.level', value: c.level },
    { labelId: 'stat.hp', value: c.hp, max: c.maxHP, maxKind: 'blue' },
    { labelId: 'stat.mp', value: c.mp, max: c.maxMP, maxKind: 'blue' },
    { labelId: 'stat.attack', value: c.attack },
    { labelId: 'stat.magicAttack', value: c.magicAttack },
    { labelId: 'stat.defense', value: c.defense },
    { labelId: 'stat.speed', value: c.speed },
    { labelId: 'stat.luck', value: c.luck },
  ]
}

/** 装备槽列表(可扩展:加槽位 = 列表多一条)。 */
const EQUIP_SLOTS: { slot: string; label: TextId }[] = [
  { slot: 'weapon', label: 'equip.weapon' },
  { slot: 'head', label: 'equip.head' },
  { slot: 'body', label: 'equip.body' },
  { slot: 'feet', label: 'equip.feet' },
  { slot: 'accessory', label: 'equip.accessory' },
  { slot: 'amulet', label: 'equip.amulet' },
]

export interface MenuAssets {
  /** 黄框九宫格 9 块(ImageBitmap,索引 i*3+j)。 */
  box: BoxTiles
  /** 状态背景图。 */
  statusBg: ImageBitmap | undefined
  /** 装备格图。 */
  equipSlot: ImageBitmap | undefined
  /** 金钱横卷轴 3 帧(左/中/右,frame 44/45/46)。 */
  cashBox: {
    left: ImageBitmap | undefined
    mid: ImageBitmap | undefined
    right: ImageBitmap | undefined
  }
  /** 数字 0-9 预烘(索引=数字值)。 */
  nums: (ImageBitmap | undefined)[]
  /** 角色立绘(状态面板;李逍遥 = RGM avatar chunk 1 = portraits/1)。 */
  avatar: ImageBitmap | undefined
  /** 蓝数字 0-9(HP/MP 最大值;PAL_DrawNumber kNumColorBlue)。 */
  numsBlue: (ImageBitmap | undefined)[]
  /** 青数字 0-9(exp 下一级;PAL_DrawNumber kNumColorCyan)。 */
  numsCyan: (ImageBitmap | undefined)[]
  /** 斜杠 sprite(HP/MP 当前/最大分隔;SPRITENUM_SLASH)。 */
  slash: ImageBitmap | undefined
  /** demo 装备图标(slotId → sprite;item 系统未建前的占位 demo)。 */
  equipDemo: Record<string, ImageBitmap | undefined>
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
 * 加载菜单资产:黄框九宫格 + 状态背景 + 装备格 + 金钱卷轴 + 数字。
 * 全部 = 预烘 RGBA(@type-pal/migrate bake-assets,palette 0),drawImage 直接用、零运行时烤。
 */
export async function loadMenuAssets(): Promise<MenuAssets> {
  // 黄框 9 块预烘 RGBA(frame-00..08 = i*3+j),drawImage 直接用、零运行时烤
  const tiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    const name = `frame-${String(i).padStart(2, '0')}.png`
    tiles.push(await loadPng(`/ui/box/${name}`))
  }
  const [statusBg, equipSlot, left, mid, right, nums, avatar, numsBlue, numsCyan, slash] =
    await Promise.all([
      loadPng('/ui/status/bg.png'),
      loadPng('/ui/status/slot.png'),
      loadPng('/ui/cashbox/left.png'),
      loadPng('/ui/cashbox/mid.png'),
      loadPng('/ui/cashbox/right.png'),
      Promise.all(Array.from({ length: 10 }, (_, d) => loadPng(`/ui/num/${d}.png`))),
      loadPng('/portraits/1.png'), // 李逍遥状态立绘(RGM avatar chunk 1,复用对话头像)
      Promise.all(Array.from({ length: 10 }, (_, d) => loadPng(`/ui/num-blue/${d}.png`))),
      Promise.all(Array.from({ length: 10 }, (_, d) => loadPng(`/ui/num-cyan/${d}.png`))),
      loadPng('/ui/num/slash.png'),
    ])
  // demo 装备图标(item 系统未建前;slotId → sprite)
  const equipDemoArr = await Promise.all(
    EQUIP_SLOTS.map(({ slot }) => loadPng(`/ui/status/equip-demo/${slot}.png`)),
  )
  const equipDemo: Record<string, ImageBitmap | undefined> = {}
  EQUIP_SLOTS.forEach(({ slot }, i) => {
    equipDemo[slot] = equipDemoArr[i]
  })
  return {
    box: { tiles },
    statusBg,
    equipSlot,
    cashBox: { left, mid, right },
    nums,
    avatar,
    numsBlue,
    numsCyan,
    slash,
    equipDemo,
  }
}

export class MenuBox {
  constructor(
    private readonly glyphs: GlyphTable,
    private readonly locale: Locale,
    private readonly assets: MenuAssets,
  ) {}

  render(ctx: CanvasRenderingContext2D, state: MenuState, world: WorldState, now: number): void {
    if (state.menu === 'status') {
      this.renderStatus(ctx, world)
      return
    }
    // main(占位子菜单也显示 main 框)
    this.renderMain(ctx, state, world, now)
  }

  private renderMain(
    ctx: CanvasRenderingContext2D,
    state: MenuState,
    world: WorldState,
    now: number,
  ): void {
    // 金钱横卷轴(原版主菜单顶部 PAL_ShowCash):卷轴 (0,0) + 「金钱」label (10,10) + 黄数字 (49,14) 右对齐
    drawCashBox(ctx, this.assets.cashBox, 0, 0, 5, { shadow: true })
    renderSpans(ctx, [{ text: lookupText('menu.cash', this.locale) }], 10, 10, {
      glyphs: this.glyphs,
      shadow: true,
      forceRgba: COLOR_NORMAL,
    })
    drawNumber(ctx, world.money, 85, 14, this.assets.nums)

    drawSlicedBox(ctx, this.assets.box, MENU_X, MENU_Y, MENU_W, MENU_H)

    // 选中项颜色:6 帧闪烁(原版 ui.h MENUITEM_COLOR_SELECTED,600ms 轮 6 色);非箭头,纯变色高亮
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
    MAIN_ITEMS.forEach((item, idx) => {
      const y = ITEM_Y0 + idx * ITEM_H
      const selected = idx === state.cursor
      const color = item.enabled
        ? selected
          ? blink
          : COLOR_NORMAL
        : selected
          ? COLOR_DISABLED_SEL
          : COLOR_DISABLED
      renderSpans(ctx, [{ text: lookupText(item.label, this.locale) }], ITEM_X, y, {
        glyphs: this.glyphs,
        shadow: true,
        forceRgba: color,
      })
    })
  }

  private renderStatus(ctx: CanvasRenderingContext2D, world: WorldState): void {
    // 背景(全屏 320×200)
    if (this.assets.statusBg) ctx.drawImage(this.assets.statusBg, 0, 0, 320, 200)

    // demo 单人:取 party[0]。将来多人菜单选角。
    const c = world.party[0]
    if (!c) return

    // 左栏:属性 9 项 —— label 字模(米白)+ value 数字 sprite(黄);HP/MP 当前/最大(max 蓝 + 斜杠)
    let y = STAT_Y0
    for (const row of statList(c)) {
      renderSpans(ctx, [{ text: lookupText(row.labelId, this.locale) }], STAT_X, y, {
        glyphs: this.glyphs,
        shadow: true,
        forceRgba: COLOR_NORMAL,
      })
      const ny = y + STAT_NUM_DY
      drawNumber(ctx, row.value, STAT_VAL_RIGHT, ny, this.assets.nums)
      if (row.max !== undefined) {
        if (this.assets.slash) ctx.drawImage(this.assets.slash, STAT_SLASH_X, ny)
        const maxNums = row.maxKind === 'cyan' ? this.assets.numsCyan : this.assets.numsBlue
        drawNumberLeft(ctx, row.max, STAT_MAX_LEFT, ny + STAT_MAX_DOWN, maxNums) // 左对齐紧跟斜杠 + 偏下
      }
      y += STAT_LINE_H
    }

    // 中栏:名字(金黄,上) + 立绘(下),水平居中于 MID_CX
    const nameSpans = [{ text: lookupText('name.li-xiaoyao', this.locale) }]
    renderSpans(ctx, nameSpans, MID_CX - measureSpans(nameSpans, this.glyphs) / 2, NAME_Y, {
      glyphs: this.glyphs,
      shadow: true,
      forceRgba: COLOR_NAME,
    })
    const { avatar } = this.assets
    if (avatar) ctx.drawImage(avatar, Math.round(MID_CX - avatar.width / 2), AVATAR_Y)

    // 右栏:6 装备格 2 列 × 3 行平铺 —— 格 + 装备图标(demo,格内居中)+ 槽名(格下居中)
    EQUIP_SLOTS.forEach(({ slot, label }, i) => {
      const gx = EQUIP_X0 + (i % EQUIP_COLS) * (EQUIP_SLOT_SIZE + EQUIP_GAP_X)
      const gy = EQUIP_Y0 + Math.floor(i / EQUIP_COLS) * (EQUIP_SLOT_SIZE + EQUIP_GAP_Y)
      if (this.assets.equipSlot) {
        ctx.drawImage(this.assets.equipSlot, gx, gy, EQUIP_SLOT_SIZE, EQUIP_SLOT_SIZE)
      }
      // 装备图标:缩进 slot 内凹区(避开占位框边框,定位条完整在格内),保比例居中
      const icon = this.assets.equipDemo[slot]
      if (icon) {
        const inner = EQUIP_SLOT_SIZE - EQUIP_BORDER * 2
        const scale = Math.min(inner / icon.width, inner / icon.height, 1)
        const iw = icon.width * scale
        const ih = icon.height * scale
        ctx.drawImage(
          icon,
          Math.round(gx + (EQUIP_SLOT_SIZE - iw) / 2),
          Math.round(gy + (EQUIP_SLOT_SIZE - ih) / 2),
          Math.round(iw),
          Math.round(ih),
        )
      }
      // 槽名:格内底部,无衬底(shadow 描边即可读)
      const nameSpan = [{ text: lookupText(label, this.locale) }]
      renderSpans(
        ctx,
        nameSpan,
        gx + (EQUIP_SLOT_SIZE - measureSpans(nameSpan, this.glyphs)) / 2,
        gy + EQUIP_SLOT_SIZE - EQUIP_NAME_INSET,
        { glyphs: this.glyphs, shadow: true, forceRgba: COLOR_NORMAL },
      )
    })
  }
}
