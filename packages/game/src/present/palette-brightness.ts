import type { Palette } from '@type-pal/shared'

/**
 * Scale RGB channels with floor rounding and clamp brightness to [0, 1].
 * Colors are copied; palette metadata, including cycles, stays borrowed and unchanged.
 * RNG's first-frame fade uses round rounding and retains its separate calculation.
 */
export function scalePaletteBrightness(base: Palette, factor: number): Palette {
  const brightness = Math.max(0, Math.min(1, factor))
  return {
    ...base,
    colors: base.colors.map((color): [number, number, number] => [
      Math.floor(color[0] * brightness),
      Math.floor(color[1] * brightness),
      Math.floor(color[2] * brightness),
    ]),
  }
}
