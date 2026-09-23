/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：受控 IO 观察器。
 * 声音播放用记录器（只记录 AssetId 序列，不播）；GlyphTable 空实现与旧单测同型
 * （has/get 兜底，不参与断言）；palette/glyph 属渲染资源替身，不 mock 被测业务本体。
 */
import type { SfxPlayer } from '../../../audio/sfx.js'
import type { GlyphTable } from '../../../text/glyph.js'
import type { Palette } from '@type-pal/shared'

/** 记录型 SfxPlayer：每次 play 记 AssetId；不播放。 */
export function recordingSfx(): { player: SfxPlayer; plays: string[] } {
  const plays: string[] = []
  return {
    plays,
    player: { play: (asset: string) => plays.push(asset) } as unknown as SfxPlayer,
  }
}

/** 空 GlyphTable（与旧 battle-session.test 同型兜底，has 恒 false）。 */
export const stubGlyphs: GlyphTable = {
  has: () => false,
  get: () => undefined,
} as unknown as GlyphTable

/** 空 palette 渲染替身（colors/cycles 不参与业务断言）。 */
export const stubPalette: Palette = {
  colors: [],
  cycles: [],
} as unknown as Palette

/** 确定性 RNG 工厂：固定序列循环或恒定值。 */
export function fixedRng(values: readonly number[] = [0]): () => number {
  let index = 0
  return () => {
    const value = values[index % values.length]!
    index += 1
    return value
  }
}
