/**
 * TEST-GLM-PHASE1-LEAVES-3 本队列专用绘制 fixture（不与其它对话/grok 旧例共享）。
 *  - 字形：每字只在 (4,4) 点亮 1px（避开阴影 (+1,0)/(0,+1)/(+1,+1)），断言不依赖真实字体资源。
 *  - uiSpriteFrames：SPRITEUI 槽位语义与生产 draw-* 对齐的素色/单点小图（只证协议/坐标，
 *    不冒称原版观感）。
 *  - freezeNow：冻结 Date.now 使 selectedColor 闪烁确定性（tick 0 → 0xF9）。
 */
import type { Item, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { vi } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import type { Glyph, GlyphTable } from '../../present/font.js'
import { createFramebuffer, type Framebuffer } from '../../present/framebuffer.js'

export const SENTINEL = 0x5a
export const BOX_STYLE0 = 0x11
export const BOX_STYLE1 = 0x22
export const TILE = 8

export const ITEMBOX_ID = 0x6e
export const SLASH_ID = 0x39
export const CURSOR_ID = 0x69
export const CURSOR_UP_ID = 0x67
export const INFOBOX_ID = 0x17

export function yellowDigit(digit: number): number {
  return 0xb0 + digit
}
export function blueDigit(digit: number): number {
  return 0xd0 + digit
}
export function cyanDigit(digit: number): number {
  return 0x70 + digit
}

/** 右对齐数字字段里从右数第 place 位（0 = 个位）精灵左上角（draw-number sdlpal ui.c:705-731 步进）。 */
export function rightDigitX(posX: number, nLength: number, placeFromRight: number): number {
  return posX - 6 + 6 * nLength - 6 * placeFromRight
}

export function solidImage(width: number, height: number, index: number): IndexedImage {
  const n = width * height
  return {
    width,
    height,
    indices: new Uint8Array(n).fill(index),
    opaque: new Uint8Array(n).fill(1),
  }
}

export function sparseImage(
  width: number,
  height: number,
  pixels: readonly { x: number; y: number; index: number }[],
): IndexedImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  for (const p of pixels) {
    const off = p.y * width + p.x
    indices[off] = p.index
    opaque[off] = 1
  }
  return { width, height, indices, opaque }
}

export function iconImage(index: number): IndexedImage {
  return sparseImage(1, 1, [{ x: 0, y: 0, index }])
}

/** SPRITEUI 槽位全集（未用槽留空，缺帧让 drawBox 自己 fail-loud）。 */
export function makeUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidImage(TILE, TILE, BOX_STYLE0)
  for (let i = 9; i < 18; i++) frames[i] = solidImage(TILE, TILE, BOX_STYLE1)
  frames[18] = iconImage(INFOBOX_ID)
  for (let d = 0; d < 10; d++) {
    frames[19 + d] = sparseImage(6, 8, [{ x: 0, y: 0, index: yellowDigit(d) }])
    frames[29 + d] = sparseImage(6, 8, [{ x: 0, y: 0, index: blueDigit(d) }])
    frames[56 + d] = sparseImage(6, 8, [{ x: 0, y: 0, index: cyanDigit(d) }])
  }
  frames[39] = iconImage(SLASH_ID)
  frames[44] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[45] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[46] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[47] = iconImage(0x47)
  for (let role = 0; role < 6; role++) frames[48 + role] = iconImage(0xa0 + role)
  frames[67] = iconImage(CURSOR_UP_ID)
  const cursor = sparseImage(3, 1, [
    { x: 0, y: 0, index: 0 },
    { x: 2, y: 0, index: CURSOR_ID },
  ])
  cursor.indices[1] = 0xee
  frames[69] = cursor
  frames[70] = iconImage(ITEMBOX_ID)
  return frames
}

/** 每个支持的字都在 (4,4) 点亮 1px 的字形表。 */
const GLYPH_CHARS = '甲乙丙丁戊己庚辛壬癸否是关开装备使用进度一二三四五现有金钱售价'
const glyphMap = new Map<number, Glyph>()
for (const ch of GLYPH_CHARS) {
  const bitmap = new Uint8Array(32)
  bitmap[8] = 0x08 // row 4（bytesPerRow=2 → byte 8），col 4
  glyphMap.set(ch.codePointAt(0)!, { width: 16, height: 16, bitmap })
}

export const fixtureGlyphs: GlyphTable = {
  has: (cp) => glyphMap.has(cp),
  get: (cp) => glyphMap.get(cp),
}

/** 字符串第 index 个字（CJK 16px 步进）的唯一亮点屏幕坐标。 */
export function textDot(
  _text: string,
  index: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return { x: x + index * 16 + 4, y: y + 4 }
}

export function pixel(fb: Framebuffer, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= fb.width || y >= fb.height)
    throw new Error(`pixel out of range (${x},${y})`)
  return fb.indices[y * fb.width + x]!
}

export function newFb(): Framebuffer {
  const fb = createFramebuffer()
  fb.indices.fill(SENTINEL)
  return fb
}

/** 冻结 Date.now → selectedColor 确定性 0xF9（tick 0）。返回恢复函数，finally 调用。 */
export function freezeNow(ms = 0): () => void {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(ms)
  return () => spy.mockRestore()
}

const NO_ROLE: Item['flags']['equipableBy'] = [false, false, false, false, false, false]

export function mkItem(
  id: number,
  name: string | undefined,
  patch: Partial<Omit<Item, 'flags'>> & { flags?: Partial<Item['flags']> } = {},
): Item {
  const { flags, ...rest } = patch
  return {
    id,
    _name: name,
    bitmap: 1,
    price: 10,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    ...rest,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: NO_ROLE,
      ...flags,
    },
  }
}

export function mkRole(id: number, name: string, patch: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: name,
    avatar: id + 1,
    spriteNumInBattle: 1,
    spriteNum: 1,
    name: 36 + id,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 40,
    hp: 99,
    mp: 99,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [],
    ...patch,
  }
}

export function makeRoles(): PlayerRoles {
  return { roles: ['甲', '乙', '丙', '丁', '戊', '己'].map((name, id) => mkRole(id, name)) }
}

/** explore 底座 + 常用 runtime 数值。 */
export function makeGs(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.dwCash = 123
  gs.partyMembers = [0, 1]
  const rt = gs.PlayerRolesRuntime
  rt.rgwLevel[0] = 3
  rt.rgwHP[0] = 41
  rt.rgwMaxHP[0] = 58
  rt.rgwMP[0] = 12
  rt.rgwMaxMP[0] = 34
  rt.rgwHP[1] = 77
  rt.rgwMaxHP[1] = 90
  rt.rgwMP[1] = 25
  rt.rgwMaxMP[1] = 66
  return gs
}
