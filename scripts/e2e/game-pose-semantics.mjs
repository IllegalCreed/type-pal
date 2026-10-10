import assert from 'node:assert/strict'
import dump from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import actors from '../../projects/pal/content/actors.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { requireTrace } from './trace-refinement.mjs'

const direction = { down: 0, left: 1, up: 2, right: 3 }

export function originalSpriteNumber(value) {
  if (Number.isSafeInteger(value)) return value
  const def = sprites.find(
    (e) => e.id === (actors.find((actor) => actor.id === value)?.spriteId ?? value),
  )
  const match = /^sprite\.pal\.(\d+)$/u.exec(def?.asset ?? '')
  return match ? Number(match[1]) : undefined
}

export function spriteResource(value) {
  if (Number.isSafeInteger(value))
    return sprites.find((sprite) => sprite.asset === `sprite.pal.${String(value).padStart(3, '0')}`)
      ?.asset
  return sprites.find(
    (sprite) => sprite.id === (actors.find((actor) => actor.id === value)?.spriteId ?? value),
  )?.asset
}

/** Independent semantic projection of PAL local frame into a requested directional frame.
 * Layout comes from EventObject.nSpriteFrames, NOT actor identity or decoded frame count.
 * A three-frame static drunkard and a three-frames-per-direction walker are different layouts.
 * Caller separately validates actual draw availability/geometry and compares the requested frame.
 */
export function gameNpcRequestedFrame(layout, localFrame, facing) {
  assert(Number.isSafeInteger(layout) && layout >= 0, 'Game sprite directional layout unobserved')
  assert(Number.isSafeInteger(localFrame) && localFrame >= 0, 'Game local frame invalid')
  assert(Object.hasOwn(direction, facing), 'Game facing unobserved')
  const local =
    layout === 3 && localFrame === 2 ? 0 : layout === 3 && localFrame === 3 ? 2 : localFrame
  return direction[facing] * layout + local
}

/** Archived collectors either store local frame, or explicitly provide localFrame alongside
 * a display index. Never reverse-engineer a local frame from the picture being validated.
 * This adapter's frozen-layout premise is explicit; a changed sprite needs a new layout receipt.
 */
export function archivedGameNpcFrame(id, state) {
  const meta = dump.eventObjects.find((e) => `e${e.id}` === id)
  assert(meta, 'Game event-object layout unavailable')
  assert.equal(state.sprite, meta.spriteNum, 'Game sprite changed without a layout receipt')
  return gameNpcRequestedFrame(
    meta.nSpriteFrames,
    state.localFrame ?? state.scriptedFrame ?? state.frame,
    state.facing,
  )
}

/** Reference renderer's +7 blit / +11 cull anchors. Position is in original pixels.
 * Cull eligibility comes from coordinates and viewport, never from drawStatus being checked.
 */
export function gameNpcDrawEligible(position, geometry, view) {
  requireTrace(
    JSON.stringify(view?.transform) === '[1,0,0,1,0,0]',
    'game-projection',
    [1, 0, 0, 1, 0, 0],
    view?.transform,
    'unknown',
  )
  requireTrace(
    JSON.stringify(view.canvasSize) === '[320,200]',
    'game-native-viewport',
    [320, 200],
    view.canvasSize,
  )
  const r = geometry?.worldRect
  requireTrace(
    Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > 0 && r[3] > 0,
    'game-sprite-bounds',
    'finite nonempty rectangle',
    r,
    'unknown',
  )
  requireTrace(
    r[0] === position[0] - Math.floor(r[2] / 2) && r[1] === position[1] + 7 - r[3],
    'game-sprite-anchor',
    position,
    r,
  )
  const camera = Array.isArray(view.camera) ? view.camera : [view.camera?.x, view.camera?.y]
  requireTrace(
    camera.every(Number.isFinite) &&
      view.canvasSize?.length === 2 &&
      view.canvasSize.every((n) => Number.isFinite(n) && n > 0),
    'game-viewport',
    'finite camera and positive canvas',
    view,
    'unknown',
  )
  const x = r[0] - camera[0],
    y = r[1] - camera[1] + 4
  return !(x >= view.canvasSize[0] || x < -r[2] || y >= view.canvasSize[1] || y < -r[3])
}
