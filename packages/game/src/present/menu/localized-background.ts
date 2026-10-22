import type { BattleBgAsset } from '../battle/draw-battle-bg.js'

const statusCache = new WeakMap<BattleBgAsset, Map<string, BattleBgAsset>>()
const equipCache = new WeakMap<BattleBgAsset, BattleBgAsset>()

/** Relocate the original decorative boxes, preserving the source image. SDLPal uigame.c:1094. */
export function englishStatusBackground(
  source: BattleBgAsset,
  positions: readonly { x: number; y: number }[],
): BattleBgAsset {
  const key = positions.map(({ x, y }) => `${x},${y}`).join(';')
  const cached = statusCache.get(source)?.get(key)
  if (cached) return cached
  const indices = source.indices.slice()
  const copy = (x: number, y: number, sx: number, sy: number, width: number) => {
    indices.copyWithin(y * 320 + x, sy * 320 + sx, sy * 320 + sx + width)
  }
  const box = new Uint8Array(50 * 49)
  for (let row = 0; row < 49; row++) {
    box.set(indices.subarray((row + 39) * 320 + 247, (row + 39) * 320 + 297), row * 50)
    copy(81, row + 125, 31, row + 125, 50)
    copy(141, row + 141, 31, row + 141, 50)
    copy(201, row + 133, 31, row + 133, 50)
    copy(251, row + 101, 31, row + 101, 50)
    copy(247, row + 39, 139, row + 39, 50)
    if (row > 0) copy(189, row - 1, 139, row - 1, 50)
  }
  for (const { x, y } of positions) {
    for (let row = 0; row < 49; row++) {
      for (let col = 0; col < 50; col++) {
        if (x + col < 0 || x + col >= 320 || y + row < 0 || y + row >= 200) continue
        indices[(y + row) * 320 + x + col] = box[row * 50 + col]!
      }
    }
  }
  const result = { ...source, indices }
  let layouts = statusCache.get(source)
  if (!layouts) {
    layouts = new Map()
    statusCache.set(source, layouts)
  }
  layouts.set(key, result)
  return result
}

/** Remove the baked Chinese equipment/stat labels. SDLPal uigame.c:1828–1843. */
export function englishEquipBackground(source: BattleBgAsset): BattleBgAsset {
  const cached = equipCache.get(source)
  if (cached) return cached
  const indices = source.indices.slice()
  const copy = (x: number, y: number, sy: number, width: number) => {
    indices.copyWithin(y * 320 + x, sy * 320 + x, sy * 320 + x + width)
  }
  for (let row = 8; row < 72; row++) {
    copy(92, row, row + 128, 32)
    copy(92, row + 64, row + 128, 32)
  }
  for (let row = 9; row < 90; row++) copy(226, row, row + 104, 32)
  for (let row = 99; row < 113; row++) copy(226, row, row + 16, 32)
  const result = { ...source, indices }
  equipCache.set(source, result)
  return result
}
