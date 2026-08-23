import { type AmbienceDef, isIdentityTint } from '@type-pal/content'

/** RGB multiply tint used by both the runtime final pass and editor previews. */
export type AmbienceTint = Readonly<AmbienceDef['tint']>

/**
 * Composite the canonical ambience filter over an already-rendered frame.
 * Identity white is deliberately handled here so every consumer gets the same
 * zero-work fast path and cannot drift into a CSS approximation.
 */
export function compositeAmbienceTint(
  context: CanvasRenderingContext2D,
  tint: AmbienceTint,
  width: number,
  height: number,
): void {
  if (isIdentityTint(tint)) return
  context.save()
  context.globalCompositeOperation = 'multiply'
  context.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`
  context.fillRect(0, 0, width, height)
  context.restore()
}
