/**
 * PAL 原脚本中 14 个显式调色板站点的 clean 语义裁决。
 *
 * 调色板编号只留在迁移边界：普通全屏换色映射为作者氛围；两段 RNG 动画的
 * palette 2/6 及其 palette 0 恢复已经烘进 RGBA 资产，不得再发 setAmbience。
 */
export type PalPaletteSiteSpec =
  | {
      address: number
      paletteIndex: number
      treatment: 'ambience'
      ambience: 'day' | 'warm'
    }
  | {
      address: number
      paletteIndex: number
      treatment: 'asset-baked'
      assetId: 'frame-animation.pal.003' | 'frame-animation.pal.007'
    }

export const PAL_PALETTE_SITE_SPECS = [
  { address: 21_982, paletteIndex: 0, treatment: 'ambience', ambience: 'day' },
  { address: 21_990, paletteIndex: 0, treatment: 'ambience', ambience: 'day' },
  {
    address: 22_109,
    paletteIndex: 2,
    treatment: 'asset-baked',
    assetId: 'frame-animation.pal.003',
  },
  {
    address: 22_115,
    paletteIndex: 0,
    treatment: 'asset-baked',
    assetId: 'frame-animation.pal.003',
  },
  { address: 22_223, paletteIndex: 5, treatment: 'ambience', ambience: 'warm' },
  { address: 22_275, paletteIndex: 5, treatment: 'ambience', ambience: 'warm' },
  { address: 23_975, paletteIndex: 0, treatment: 'ambience', ambience: 'day' },
  { address: 24_710, paletteIndex: 5, treatment: 'ambience', ambience: 'warm' },
  { address: 28_624, paletteIndex: 5, treatment: 'ambience', ambience: 'warm' },
  { address: 28_850, paletteIndex: 0, treatment: 'ambience', ambience: 'day' },
  { address: 30_589, paletteIndex: 5, treatment: 'ambience', ambience: 'warm' },
  { address: 30_645, paletteIndex: 0, treatment: 'ambience', ambience: 'day' },
  {
    address: 32_055,
    paletteIndex: 6,
    treatment: 'asset-baked',
    assetId: 'frame-animation.pal.007',
  },
  {
    address: 32_062,
    paletteIndex: 0,
    treatment: 'asset-baked',
    assetId: 'frame-animation.pal.007',
  },
] as const satisfies readonly PalPaletteSiteSpec[]

const PAL_PALETTE_SITE_BY_ADDRESS = new Map<number, PalPaletteSiteSpec>(
  PAL_PALETTE_SITE_SPECS.map((spec) => [spec.address, spec]),
)

export function palPaletteSiteAt(address: number): PalPaletteSiteSpec | undefined {
  return PAL_PALETTE_SITE_BY_ADDRESS.get(address)
}
