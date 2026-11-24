/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：受控 IO 观察器。
 * 声音播放用记录器（只记录 AssetId 序列，不播）；GlyphTable 空实现与旧单测同型
 * （has/get 兜底，不参与断言）；palette/glyph 属渲染资源替身，不 mock 被测业务本体。
 */

import type { Palette } from '@type-pal/shared'
import type { SfxPlayer } from '../../audio/sfx.js'
import type { GlyphTable } from '../../text/glyph.js'

/** 记录型 SfxPlayer：每次 play 记 AssetId；不播放。 */
export function recordingSfx(): { player: SfxPlayer; plays: string[] } {
  const plays: string[] = []
  return {
    plays,
    player: { play: (asset: string) => plays.push(asset) } as unknown as SfxPlayer,
  }
}

/** 无字模时使用生产文字渲染的缺字路径。 */
export const stubGlyphs: GlyphTable = {
  has: () => false,
  get: () => undefined,
}

/** 不检查颜色的用例仍提供完整的索引色表。 */
export const stubPalette: Palette = {
  colors: Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0]),
  cycles: [],
}

/** 确定性 RNG 工厂：固定序列循环。 */
export function fixedRng(values: readonly number[] = [0]): () => number {
  let index = 0
  return () => {
    const value = values[index % values.length]
    if (value === undefined) throw new Error('fixedRng: values 不能为空')
    index += 1
    return value
  }
}
