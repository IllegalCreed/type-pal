import type { Palette } from '@type-pal/shared'
import type { BattleSessionAssets } from '../../battle/battle-session.js'
import type { GlyphTable } from '../../text/glyph.js'

/** Record the sound IDs sent by the timeline at the playback port. */
export function recordingSfx() {
  const plays: string[] = []
  const player: NonNullable<BattleSessionAssets['sfx']> = {
    play(asset) {
      plays.push(asset)
      return true
    },
  }
  return { plays, player }
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

/** Finite sequence for contracts that specify the exact number and order of random draws. */
export function fixedDraws(values: readonly number[]): () => number {
  const draws = values.values()
  return () => {
    const draw = draws.next()
    if (draw.done) throw new Error('Battle consumed a draw beyond the fixture')
    return draw.value
  }
}
