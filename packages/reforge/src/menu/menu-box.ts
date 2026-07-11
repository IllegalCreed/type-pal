/**
 * 菜单 UI(D17)。在 320 逻辑坐标画,调用方已设 ctx.scale(WORLD_SCALE=4)。
 *
 * 复用:renderSpans/measureSpans(字模)、ctx.scale(4)(同对话框高清)。
 * 数据驱动:属性/装备遍历列表动态画,加维度自动适配(不写死坐标)。
 * 九宫格框:原版 UI box frame-00..08(9 块直接定位,因 frame 尺寸不规则)。
 */
import {
  type ActorDef,
  type CharacterInstance,
  EQUIP_SLOT_IDS,
  effectiveStat,
  type ItemDataMap,
  type Locale,
  lookupText,
  type PoisonDef,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import type { MenuState } from '../menu-state.js'
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
const MENU_H_BASE = 22 // 框高 = MENU_H_BASE + ITEM_H × 项数(主菜单 4 项 → 94,对齐原版)
const ITEM_X = 16
const ITEM_Y0 = 50
const ITEM_H = 18
// 级联:每深一级卷轴偏移(原版 uigame.c 物品子菜单 box(30,60) vs 主菜单(3,37) → +27/+23)
const CASCADE_DX = 27
const CASCADE_DY = 23

// 菜单项色(palette 0;ui.h):普通 0x4F / 禁用 0x18 / 禁用选中 0x1C / 选中 0xF9-FE(6 帧闪烁)
export const COLOR_NORMAL = [199, 186, 174] as const
export const COLOR_DISABLED = [166, 40, 32] as const
export const COLOR_DISABLED_SEL = [215, 109, 93] as const
export const SELECTED_COLORS = [
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
const COLOR_EQUIP_NAME = [231, 223, 195] as const // 0xBE 装备物名(原版 STATUS_COLOR_EQUIPMENT)
// 右栏:6 装备格 2 列 × 3 行平铺(放大到接近原版 50×49)
const EQUIP_X0 = 200
const EQUIP_Y0 = 6
const EQUIP_COLS = 2
const EQUIP_SLOT_SIZE = 56
const EQUIP_GAP_X = 6
const EQUIP_GAP_Y = 4 // 压缩:3 行装备(大格)整体对齐左栏 9 属性的上下范围
const EQUIP_BORDER = 7 // slot 占位框边框厚(按比例;图标缩进此内凹区,定位条不压边框)
const EQUIP_NAME_INSET = 13 // 槽名距格底(格内底,无衬底)

/** 画数字(右对齐:个位右边缘固定在 rightX,往左排)。原版 PAL_DrawNumber 黄色右对齐。 */
export function drawNumber(
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
export function drawNumberLeft(
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
 * 单行卷轴(原版 PAL_CreateSingleLineBox):左帽 + 中段×nLen + 右帽,高=自然(上+中+下边)。
 * 卷轴现为九宫格 9 块(scroll BoxTiles):本函数按 nLen 算宽 + 自然高,转 drawSlicedBox 撑出
 * (撑成 = 原单行卷轴逐像素一致;阴影/形状由 drawSlicedBox 的 drawBoxShadow 保留)。
 */
export function drawScroll(
  ctx: CanvasRenderingContext2D,
  scroll: BoxTiles,
  x: number,
  y: number,
  nLen: number,
  opts: { shadow?: boolean } = {},
): void {
  const t = scroll.tiles
  const leftW = t[3]?.width ?? 0 // 左列(左-中 tile)宽
  const midW = t[4]?.width ?? 0 // 中列(中-中 tile)宽
  const rightW = t[5]?.width ?? 0
  const h = (t[1]?.height ?? 0) + (t[4]?.height ?? 0) + (t[7]?.height ?? 0) // 上+中+下
  const w = leftW + midW * nLen + rightW
  if (w <= 0 || h <= 0) return
  drawSlicedBox(ctx, scroll, x, y, w, h, opts)
}

/** 确认框(否/是 或 关/开):左框(130,100)len2 + 右框(205,100)len2 + 文字。
 *  对齐一阶段 draw-confirm.ts:31-46(sdlpal PAL_SelectionMenu 两框)。320 逻辑坐标,调用方已 ctx.scale。
 *  rightSelected=confirmYes:右=是/开 高亮;左=否/关 高亮 = 非右选中。 */
export function drawConfirmBox(
  ctx: CanvasRenderingContext2D,
  scroll: BoxTiles,
  opts: { leftText: string; rightText: string; rightSelected: boolean },
  glyphs: GlyphTable,
  now: number,
): void {
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  drawScroll(ctx, scroll, 130, 100, 2)
  drawScroll(ctx, scroll, 205, 100, 2)
  renderSpans(ctx, [{ text: opts.leftText }], 145, 110, {
    glyphs,
    shadow: true,
    forceRgba: opts.rightSelected ? COLOR_NORMAL : blink, // 左高亮 = 非右选中
  })
  renderSpans(ctx, [{ text: opts.rightText }], 220, 110, {
    glyphs,
    shadow: true,
    forceRgba: opts.rightSelected ? blink : COLOR_NORMAL,
  })
}

// 阈值表缺失时的兜底(原版 rgLevelUpExp[1] = 李逍遥 1→2 所需;正路取 battler.leveling.expTable)
const EXP_TO_NEXT = 15

/** 状态面板属性行(数据驱动:加属性 = 列表多一条)。顺序对齐原版。
 *  带 max 的显「当前 / 最大」:hp/mp 最大值蓝(maxKind blue)、exp 下一级青(cyan)。 */
interface StatRow {
  labelId: TextId
  value: number
  max?: number
  maxKind?: 'blue' | 'cyan'
}
function statList(c: CharacterInstance, items: ItemDataMap, expToNext?: number): StatRow[] {
  return [
    { labelId: 'stat.exp', value: c.exp, max: expToNext ?? EXP_TO_NEXT, maxKind: 'cyan' },
    { labelId: 'stat.level', value: c.level },
    { labelId: 'stat.hp', value: c.hp, max: c.maxHP, maxKind: 'blue' },
    { labelId: 'stat.mp', value: c.mp, max: c.maxMP, maxKind: 'blue' },
    { labelId: 'stat.attack', value: effectiveStat(c, 'attack', items) },
    { labelId: 'stat.magicAttack', value: effectiveStat(c, 'magicAttack', items) },
    { labelId: 'stat.defense', value: effectiveStat(c, 'defense', items) },
    { labelId: 'stat.speed', value: effectiveStat(c, 'speed', items) },
    { labelId: 'stat.luck', value: effectiveStat(c, 'luck', items) },
  ]
}

/** 装备槽列表(来自 content EQUIP_SLOT_IDS 单一真值;label = equip.<slot>)。 */
const EQUIP_SLOTS: { slot: string; label: TextId }[] = EQUIP_SLOT_IDS.map((slot) => ({
  slot,
  label: `equip.${slot}`,
}))

export interface MenuAssets {
  /** 黄框九宫格 9 块(ImageBitmap,索引 i*3+j)。 */
  box: BoxTiles
  /** 状态背景图。 */
  statusBg: ImageBitmap | undefined
  /** 装备格图。 */
  equipSlot: ImageBitmap | undefined
  /** 卷轴 scroll 九宫格 9 块(原单行卷轴 frame 44/45/46 重切;金钱/否是确认/存档槽通用,撑任意高宽)。 */
  scroll: BoxTiles
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
  /** 物品图标(bitmap chunk → sprite;状态板/装备菜单按 item.icon 取)。 */
  itemIcons: Record<number, ImageBitmap | undefined>
  /** 仙术菜单:红框九宫格 9 块(ui/box-red,iStyle1)。 */
  redBox: BoxTiles
  /** 仙术菜单:角色框(playerbox;全队 x=45+78i 排开)。 */
  magicPlayerBox: ImageBitmap | undefined
  /** 仙术菜单:网格选中光标(cursor/grid,frame 69)。 */
  cursorGrid: ImageBitmap | undefined
  /** 仙术菜单/战斗选队友箭头常色帧(cursor/up,frame 67)。 */
  cursorUp: ImageBitmap | undefined
  /** 战斗选队友箭头红帧(cursor/up-red,frame 66;与 67 常色 40ms 交替闪 —— 一阶段
   *  SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED/arrowBlinkRed 真值)。 */
  cursorUpRed: ImageBitmap | undefined
  /** 战斗当前行动者红手指(cursor/down,frame 68;与 cursorGrid 69 交替闪)。 */
  cursorDown: ImageBitmap | undefined
  /** 结算升级屏 old→cur 箭头(frame 47)。 */
  settleArrow: ImageBitmap | undefined
  /** 物品/装备列表:选中物详情框 itembox 九宫格 9 块(frame 70 重切;64×64 处与原图一致,可扩尺寸)。 */
  itembox: BoxTiles
}

/** 加载 PNG → ImageBitmap;失败返回 undefined(不阻断,渲染容错)。 */
export async function loadPng(url: string): Promise<ImageBitmap | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    return await createImageBitmap(await res.blob())
  } catch {
    return undefined
  }
}

/** 菜单资产目录(AssetBase 的子集;loader 已解析成完整前缀)。 */
export interface MenuAssetDirs {
  /** 立绘目录(状态面板/对话头像)。 */
  portraits: string
  /** 物品图标目录。 */
  itemIcons: string
  /** 战斗小头像目录(仙术菜单角色头像)。 */
  faces: string
  /** UI chrome 覆盖目录(工程皮肤;缺省 = 引擎默认皮 /ui)。 */
  uiOverride?: string
}

/**
 * 加载菜单资产:黄框九宫格 + 状态背景 + 装备格 + 金钱卷轴 + 数字。
 * 全部 = 预烘 RGBA(@type-pal/migrate bake-assets,palette 0),drawImage 直接用、零运行时烤。
 * chrome(框/数字/光标)= 引擎默认皮,工程可经 dirs.uiOverride 覆盖(有则优先,404 退默认);
 * 内容资产(立绘/物品图标/头像)按 dirs 目录取(随库/工程)。
 */
export async function loadMenuAssets(items: ItemDataMap, dirs: MenuAssetDirs): Promise<MenuAssets> {
  // chrome 取图:工程覆盖优先,退引擎默认皮
  const ui = async (rel: string): Promise<ImageBitmap | undefined> =>
    dirs.uiOverride
      ? ((await loadPng(`${dirs.uiOverride}/${rel}`)) ?? loadPng(`/ui/${rel}`))
      : loadPng(`/ui/${rel}`)
  // 黄框 9 块预烘 RGBA(frame-00..08 = i*3+j),drawImage 直接用、零运行时烤
  const tiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    const name = `frame-${String(i).padStart(2, '0')}.png`
    tiles.push(await ui(`box/${name}`))
  }
  // 仙术菜单红框 9 块(ui/box-red,iStyle1)
  const redTiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    redTiles.push(await ui(`box-red/frame-${String(i).padStart(2, '0')}.png`))
  }
  // 卷轴 scroll 9 块(原单行卷轴重切;金钱/否是/存档槽通用,撑任意高宽)
  const scrollTiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    scrollTiles.push(await ui(`scroll/frame-${String(i).padStart(2, '0')}.png`))
  }
  // 物品详情框 itembox 9 块(frame 70 重切)
  const itemboxTiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    itemboxTiles.push(await ui(`itembox/frame-${String(i).padStart(2, '0')}.png`))
  }
  const [statusBg, equipSlot, nums, avatar, numsBlue, numsCyan, slash] = await Promise.all([
    ui('status/bg.png'),
    ui('status/slot.png'),
    Promise.all(Array.from({ length: 10 }, (_, d) => ui(`num/${d}.png`))),
    loadPng(`${dirs.portraits}/1.png`), // 李逍遥状态立绘(RGM avatar chunk 1,复用对话头像)
    Promise.all(Array.from({ length: 10 }, (_, d) => ui(`num-blue/${d}.png`))),
    Promise.all(Array.from({ length: 10 }, (_, d) => ui(`num-cyan/${d}.png`))),
    ui('num/slash.png'),
  ])
  // 物品图标(按 item.icon = bitmap chunk;状态板/装备菜单数据驱动渲染)
  const iconChunks = [...new Set(Object.values(items).map((it) => it.icon))]
  const iconArr = await Promise.all(iconChunks.map((ch) => loadPng(`${dirs.itemIcons}/${ch}.png`)))
  const itemIcons: Record<number, ImageBitmap | undefined> = {}
  iconChunks.forEach((ch, i) => {
    itemIcons[ch] = iconArr[i]
  })
  // 仙术菜单专用 sprite(角色框 / 网格光标;队员头像 magic-box faceFor 按 template 懒加载)
  const [magicPlayerBox, cursorGrid, cursorUp, cursorUpRed, cursorDown, settleArrow] =
    await Promise.all([
      ui('magic/playerbox.png'),
      ui('cursor/grid.png'),
      ui('cursor/up.png'),
      ui('cursor/up-red.png'),
      ui('cursor/down.png'),
      ui('cursor/settle-arrow.png'),
    ])
  return {
    box: { tiles },
    statusBg,
    equipSlot,
    scroll: { tiles: scrollTiles },
    nums,
    avatar,
    numsBlue,
    numsCyan,
    slash,
    itemIcons,
    redBox: { tiles: redTiles },
    magicPlayerBox,
    cursorGrid,
    cursorUp,
    cursorUpRed,
    cursorDown,
    settleArrow,
    itembox: { tiles: itemboxTiles },
  }
}

export class MenuBox {
  /** 状态板头像懒加载缓存(chunk 号 → 图;null = 加载中/失败,回落 assets.avatar)。 */
  private readonly portraitCache = new Map<number, ImageBitmap | null>()

  constructor(
    private readonly glyphs: GlyphTable,
    private readonly locale: Locale,
    private readonly assets: MenuAssets,
    private readonly items: ItemDataMap,
    /** 状态板数据源(P2 补缺:毒行/头像随队员/EXP 阈值查表)。缺省 = 旧行为(单测兜底)。 */
    private readonly extras: {
      /** 毒表(状态板毒行:curability≠incurable 显示 ≙ 原版 level≤3 门)。 */
      poisonsById?: Record<number, PoisonDef>
      /** 角色表(头像号 portraits.default / 升级阈值 battler.leveling.expTable)。 */
      actorsById?: Record<string, ActorDef>
      /** 立绘目录(按角色头像号懒加载;menuAssets.avatar 只是李逍遥兜底)。 */
      portraitsDir?: string
      /** 调色板(毒名色 = colors[wColor+10],uigame.c:1252)。 */
      palette?: Palette
    } = {},
  ) {}

  /** 按 RGM 头像号取立绘(懒加载 + 缓存;未就绪返回 undefined 由调用方回落)。 */
  private portraitFor(num: number | undefined): ImageBitmap | undefined {
    if (num === undefined || !this.extras.portraitsDir) return undefined
    const hit = this.portraitCache.get(num)
    if (hit) return hit
    if (hit === null) return undefined // 加载中/失败
    this.portraitCache.set(num, null)
    void loadPng(`${this.extras.portraitsDir}/${num}.png`).then((img) => {
      if (img) this.portraitCache.set(num, img)
    })
    return undefined
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: MenuState,
    world: WorldState,
    now: number,
    statusMember = 0,
  ): void {
    if (state.openPanel === 'status') {
      this.renderStatus(ctx, world, statusMember)
      return
    }
    // 级联(无面板 = 主菜单/子菜单;openPanel==='system' = 主菜单常驻,系统框由 main.ts 叠在上)。
    // magic/equip/use 全屏面板由 main.ts 各自 draw 替换,不到这。
    this.renderCascade(ctx, state, world, now)
  }

  /** 级联菜单:金钱框 + 逐层卷轴(每深一级偏移 +CASCADE_DX/DY,对齐原版)。打开面板时不画(由 render 分流)。 */
  private renderCascade(
    ctx: CanvasRenderingContext2D,
    state: MenuState,
    world: WorldState,
    now: number,
  ): void {
    // 金钱横卷轴(原版主菜单顶部 PAL_ShowCash):卷轴 (0,0) + 「金钱」label (10,10) + 黄数字右对齐
    drawScroll(ctx, this.assets.scroll, 0, 0, 5, { shadow: true })
    renderSpans(ctx, [{ text: lookupText('menu.cash', this.locale) }], 10, 10, {
      glyphs: this.glyphs,
      shadow: true,
      forceRgba: COLOR_NORMAL,
    })
    drawNumber(ctx, world.money, 85, 14, this.assets.nums)

    // 选中色:6 帧闪烁(原版 ui.h MENUITEM_COLOR_SELECTED);父层选中项静态高亮指示已展开路径
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
    state.stack.forEach((level, depth) => {
      const isDeepest = depth === state.stack.length - 1
      const bx = MENU_X + CASCADE_DX * depth
      const by = MENU_Y + CASCADE_DY * depth
      drawSlicedBox(ctx, this.assets.box, bx, by, MENU_W, MENU_H_BASE + ITEM_H * level.nodes.length)
      level.nodes.forEach((node, idx) => {
        const selected = idx === level.cursor
        const enabled = node.enabled !== false
        let color: readonly [number, number, number]
        if (!enabled) color = selected ? COLOR_DISABLED_SEL : COLOR_DISABLED
        else if (!selected) color = COLOR_NORMAL
        // 子面板(系统)打开时,最深级联层(主菜单)显静态高亮,闪烁让位给子面板自身选择
        else color = isDeepest && !state.openPanel ? blink : (SELECTED_COLORS[3] ?? COLOR_NORMAL)
        renderSpans(
          ctx,
          [{ text: lookupText(node.label, this.locale) }],
          bx + (ITEM_X - MENU_X),
          by + (ITEM_Y0 - MENU_Y) + idx * ITEM_H,
          { glyphs: this.glyphs, shadow: true, forceRgba: color },
        )
      })
    })
  }

  private renderStatus(ctx: CanvasRenderingContext2D, world: WorldState, member = 0): void {
    // 背景(全屏 320×200)
    if (this.assets.statusBg) ctx.drawImage(this.assets.statusBg, 0, 0, 320, 200)

    // 当前查看的队员(原版 iCurrent;越界 clamp)
    const c = world.party[Math.min(Math.max(0, member), world.party.length - 1)]
    if (!c) return
    const actor = this.extras.actorsById?.[c.template]
    // EXP 阈值 = 该角色升级曲线 expTable[level](原版 rgLevelUpExp[level];曾写死 15)
    const expToNext = actor?.battler?.leveling?.expTable?.[c.level]

    // 左栏:属性 9 项 —— label 字模(米白)+ value 数字 sprite(黄);HP/MP 当前/最大(max 蓝 + 斜杠)
    let y = STAT_Y0
    for (const row of statList(c, this.items, expToNext)) {
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
    const nameSpans = [{ text: lookupText(`name.${c.template}` as TextId, this.locale) }]
    renderSpans(ctx, nameSpans, MID_CX - measureSpans(nameSpans, this.glyphs) / 2, NAME_Y, {
      glyphs: this.glyphs,
      shadow: true,
      forceRgba: COLOR_NAME,
    })
    // 立绘随队员切(原版 rgwAvatar[role] → RGM chunk;曾恒李逍遥,作者 P2 审计条)。
    // 懒加载未就绪时回落 assets.avatar(首帧闪一下李逍遥,下一帧即对)
    const avatar = this.portraitFor(actor?.portraits?.default) ?? this.assets.avatar
    if (avatar) ctx.drawImage(avatar, Math.round(MID_CX - avatar.width / 2), AVATAR_Y)
    // 毒名(作者裁决 2026-07-11:原版 (185,58) 竖排在 reforge 状态板上与装备格重叠 ——
    // 改**头像下方横向流式排列,超宽自动换行**;显示门(curability≠incurable ≙ 原版
    // level≤3)与名色(调色板[wColor+10],uigame.c:1252)不变)
    let px = MID_CX - 40
    let py = AVATAR_Y + (avatar?.height ?? 84) + 8
    for (const ap of c.poisons ?? []) {
      const def = this.extras.poisonsById?.[ap.poisonId]
      if (!def || def.curability === 'incurable') continue
      const spans = [{ text: def.name }]
      const w = measureSpans(spans, this.glyphs)
      if (px + w > MID_CX + 40 && px > MID_CX - 40) {
        px = MID_CX - 40
        py += 18
      }
      const col = this.extras.palette?.colors[(def.color + 10) & 0xff]
      renderSpans(ctx, spans, px, py, {
        glyphs: this.glyphs,
        shadow: true,
        ...(col ? { forceRgba: col } : {}),
      })
      px += w + 8
    }

    // 右栏:6 装备格 2 列 × 3 行平铺 —— 格 + 装备图标 + 装备物名(格下居中,0xBE)。
    // 原版 draw-player-status:画穿戴物名(item._name)非槽位名;空槽(无装备)跳过、留空。
    EQUIP_SLOTS.forEach(({ slot }, i) => {
      const gx = EQUIP_X0 + (i % EQUIP_COLS) * (EQUIP_SLOT_SIZE + EQUIP_GAP_X)
      const gy = EQUIP_Y0 + Math.floor(i / EQUIP_COLS) * (EQUIP_SLOT_SIZE + EQUIP_GAP_Y)
      if (this.assets.equipSlot) {
        ctx.drawImage(this.assets.equipSlot, gx, gy, EQUIP_SLOT_SIZE, EQUIP_SLOT_SIZE)
      }
      const equippedId = c.equipment[slot]
      if (!equippedId) return // 空槽:格画了,图标/名都不画(留空)
      const equipped = this.items[equippedId]
      // 装备图标:items[itemId].icon → itemIcons;缩进内凹区、保比例居中
      const icon = this.assets.itemIcons[equipped?.icon ?? -1]
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
      // 装备物名:格内底部,0xBE(原版 STATUS_COLOR_EQUIPMENT);shadow 描边
      const nameSpan = [{ text: equipped?.name ?? `?${equippedId}` }]
      renderSpans(
        ctx,
        nameSpan,
        gx + (EQUIP_SLOT_SIZE - measureSpans(nameSpan, this.glyphs)) / 2,
        gy + EQUIP_SLOT_SIZE - EQUIP_NAME_INSET,
        { glyphs: this.glyphs, shadow: true, forceRgba: COLOR_EQUIP_NAME },
      )
    })
  }
}
