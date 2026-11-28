/** Applies the project palette in place. The caller publishes pixels only after successful validation. */
export function colorizeIndexedBattlePixels(
  pixels: Uint8ClampedArray,
  palette: readonly (readonly [number, number, number])[],
): number | undefined {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const index = pixels[offset] ?? 0
    if (pixels[offset + 1] !== index || pixels[offset + 2] !== index || pixels[offset + 3] !== 255)
      return offset / 4

    const color = palette[index] ?? [0, 0, 0]
    pixels[offset] = color[0]
    pixels[offset + 1] = color[1]
    pixels[offset + 2] = color[2]
  }
  return undefined
}
