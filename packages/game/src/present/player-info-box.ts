/** PAL_CLASSIC PlayerInfoBox pixels; each caller supplies its own live role values. */
import type { IndexedImage } from '../assets/png.js'
import type { GameState } from '../core/game-state.js'
import { partySlotForRole } from '../core/player-poison-state.js'
import { drawNumber } from './draw-number.js'
import { type GlyphTable, renderText } from './font.js'
import type { Framebuffer } from './framebuffer.js'

const PLAYER_INFO_BOX_FRAME = 18
const PLAYER_FACE_FIRST_FRAME = 48
const SLASH_FRAME = 39

/** Callers own live values; this view only paints them and never writes role/runtime state. */
export interface PlayerInfoBoxView {
  roleId: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  faceColor: number
  status: Readonly<{ confused?: number; paralyzed?: number; sleep?: number; silence?: number }>
}

// SDLPal status positions/colors; the other CLASSIC counters have no visible word.
const STATUS_LABELS: ReadonlyArray<{
  key: keyof PlayerInfoBoxView['status']
  char: string
  dx: number
  dy: number
  color: number
}> = [
  { key: 'confused', char: '乱', dx: 35, dy: 19, color: 0x5f },
  { key: 'paralyzed', char: '定', dx: 44, dy: 12, color: 0xbf },
  { key: 'sleep', char: '眠', dx: 54, dy: 1, color: 0x0e },
  { key: 'silence', char: '封', dx: 55, dy: 20, color: 0x3c },
]

function blitOpaque(fb: Framebuffer, frame: IndexedImage, x: number, y: number): void {
  for (let row = 0; row < frame.height; row++) {
    for (let col = 0; col < frame.width; col++) {
      const off = row * frame.width + col
      if (frame.opaque[off]! > 0) fb.writePixel(x + col, y + row, frame.indices[off]!)
    }
  }
}

/** Mono portraits retain the source shade; 0xff is SDLPal's full-color sentinel. */
function blitPortrait(
  fb: Framebuffer,
  frame: IndexedImage,
  x: number,
  y: number,
  color: number,
): void {
  if (color === 0xff) {
    blitOpaque(fb, frame, x, y)
    return
  }
  for (let row = 0; row < frame.height; row++) {
    for (let col = 0; col < frame.width; col++) {
      const off = row * frame.width + col
      if (frame.opaque[off]! === 0) continue
      fb.writePixel(x + col, y + row, (frame.indices[off]! & 0x0f) | (color & 0xf0))
    }
  }
}

/** SDLPal tints only levels <=3; ties use the later poison slot. HP0 overrides the tint. */
export function computePlayerFaceColor(
  gs: GameState,
  roleId: number,
  hp: number,
  objectPoisons: Map<number, { level: number; color: number }> | undefined,
): number {
  let bPoisonColor = 0xff
  let maxLevel = 0
  const partySlot = partySlotForRole(gs, roleId)
  if (objectPoisons) {
    for (let slot = 0; slot < 16; slot++) {
      const ps = partySlot >= 0 ? gs.rgPoisonStatus[`${slot}_${partySlot}`] : undefined
      if (!ps || ps.wPoisonID === 0) continue
      const pd = objectPoisons.get(ps.wPoisonID)
      if (pd && pd.level <= 3 && pd.level >= maxLevel) {
        maxLevel = pd.level
        bPoisonColor = pd.color & 0xff
      }
    }
  }
  if (hp === 0) bPoisonColor = 0 // 死亡:黑白 mono(uibattle.c:143-151)
  return bPoisonColor
}

export function drawPlayerInfoBox(
  fb: Framebuffer,
  pos: { x: number; y: number },
  view: Readonly<PlayerInfoBoxView>,
  frames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const { x, y } = pos
  const box = frames[PLAYER_INFO_BOX_FRAME]
  if (box) blitOpaque(fb, box, x, y)
  const face = frames[PLAYER_FACE_FIRST_FRAME + view.roleId]
  if (face) blitPortrait(fb, face, x - 2, y - 4, view.faceColor)
  const slash = frames[SLASH_FRAME]
  if (slash) blitOpaque(fb, slash, x + 49, y + 6)
  drawNumber(fb, view.maxHP, 4, { x: x + 47, y: y + 8 }, 'yellow', 'right', frames)
  drawNumber(fb, view.hp, 4, { x: x + 26, y: y + 5 }, 'yellow', 'right', frames)
  if (slash) blitOpaque(fb, slash, x + 49, y + 22)
  drawNumber(fb, view.maxMP, 4, { x: x + 47, y: y + 24 }, 'cyan', 'right', frames)
  drawNumber(fb, view.mp, 4, { x: x + 26, y: y + 21 }, 'cyan', 'right', frames)
  if (view.hp > 0) {
    for (const label of STATUS_LABELS) {
      if ((view.status[label.key] ?? 0) > 0)
        renderText(fb, label.char, x + label.dx, y + label.dy, label.color, glyphs, true)
    }
  }
}
