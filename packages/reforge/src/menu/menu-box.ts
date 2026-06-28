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

/** 9 个九宫格块的定位(0..8 = i*3+j,i=row,j=col;黄框 frame-00..08)。 */
interface BoxTiles {
  /** 9 块,已加载为 ImageBitmap;索引 = i*3+j。 */
  tiles: (ImageBitmap | undefined)[]
  /** 角块在左/上的厚度(用于目标区定位)。frame 尺寸不规则,取左上角块尺寸。 */
  cornerW: number
  cornerH: number
}

/**
 * 统一可切片框原语(design §4):四角按角块尺寸固定、四边各拉一向、中心双向拉。
 * 9 块直接定位(非拼单图)——原版 frame 尺寸不规则(右列 33/23/31),拼单图反而复杂。
 * edges 语义:某边角块不存在 → 该边/角跳过(将来横卷轴上下=0 自动退化)。
 * 大阴影:整框偏移 +6px 半透明黑(仿 PAL_CreateBoxWithShadow,阴影代码画不切素材)。
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
  const { tiles, cornerW, cornerH } = box
  const t = (i: number, j: number): ImageBitmap | undefined => tiles[i * 3 + j]

  // 大阴影:整框偏移 +6px,半透明黑铺一层(代码画,不切素材)。
  if (opts.shadow !== false) {
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#000'
    ctx.fillRect(x + 6, y + 6, w, h)
    ctx.restore()
  }

  const midW = w - cornerW * 2 // 中段宽(可负则不画)
  const midH = h - cornerH * 2
  const rightX = x + w - cornerW
  const bottomY = y + h - cornerH
  const midX = x + cornerW
  const midY = y + cornerH

  // 四角(固定尺寸)
  const tl = t(0, 0)
  const tr = t(0, 2)
  const bl = t(2, 0)
  const br = t(2, 2)
  if (tl) ctx.drawImage(tl, x, y, cornerW, cornerH)
  if (tr) ctx.drawImage(tr, rightX, y, cornerW, cornerH)
  if (bl) ctx.drawImage(bl, x, bottomY, cornerW, cornerH)
  if (br) ctx.drawImage(br, rightX, bottomY, cornerW, cornerH)

  // 四边(各拉一向):上/下边横拉、左/右边纵拉
  const top = t(0, 1)
  const bottom = t(2, 1)
  const left = t(1, 0)
  const right = t(1, 2)
  if (top && midW > 0) ctx.drawImage(top, midX, y, midW, cornerH)
  if (bottom && midW > 0) ctx.drawImage(bottom, midX, bottomY, midW, cornerH)
  if (left && midH > 0) ctx.drawImage(left, x, midY, cornerW, midH)
  if (right && midH > 0) ctx.drawImage(right, rightX, midY, cornerW, midH)

  // 中心(双向拉)
  const center = t(1, 1)
  if (center && midW > 0 && midH > 0) ctx.drawImage(center, midX, midY, midW, midH)
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
 * 加载菜单资产:黄框九宫格 frame-00..08 + 状态背景 + 装备格。
 * 九宫格从 /extracted(原版),背景/装备格从 /ui(public)。
 */
export async function loadMenuAssets(): Promise<MenuAssets> {
  // 黄框 9 块(frame-00..08 = i*3+j)
  const tiles: (ImageBitmap | undefined)[] = []
  for (let i = 0; i <= 8; i++) {
    const name = `frame-${String(i).padStart(2, '0')}.png`
    tiles.push(await loadPng(`/extracted/images/ui/${name}`))
  }
  // 左上角块(frame-00: 22×20)定 cornerW/H
  const tl = tiles[0]
  const cornerW = tl?.width ?? 16
  const cornerH = tl?.height ?? 16
  const [statusBg, equipSlot] = await Promise.all([
    loadPng('/ui/status-bg.png'),
    loadPng('/ui/equip-slot.png'),
  ])
  return {
    box: { tiles, cornerW, cornerH },
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
