/**
 * C06 战斗帧像素 oracle：期望色来自夹具写入的 RLE 帧索引 × 标准调色板，
 * 与被测组件的 gzip 解码 → bakeFrame 路径独立。
 */
import type { AssetId } from '@type-pal/content'
import { expect } from 'vitest'
import type { CursorBattleProject } from './battle-sprite-fixtures.js'
import type { Rgb } from './canvas-pixels.js'

export function expectedBattleRgb(
  project: Pick<CursorBattleProject, 'seeded' | 'palette'>,
  asset: AssetId,
  index: number,
): Rgb {
  const seeded = project.seeded.get(asset)
  if (!seeded) throw new Error(`夹具未注入 ${asset}`)
  const frame = seeded.encoded.frames[index]
  if (!frame) throw new Error(`${asset} 没有第 ${index} 帧`)
  expect(
    frame.opaque.every((value) => value === 1),
    `${asset}#${index} 夹具帧必须整帧不透明`,
  ).toBe(true)
  const first = frame.pixels[0] ?? 0
  expect(
    frame.pixels.every((value) => value === first),
    `${asset}#${index} 夹具帧必须是单一色索引`,
  ).toBe(true)
  const color = project.palette.colors[first]
  if (!color) throw new Error(`调色板缺索引 ${first}`)
  return [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0]
}

/** 夹具色互异性自证：断言期望色不会因量化碰撞让“换帧”无法被像素区分。 */
export function assertDistinctFrameColors(
  project: Pick<CursorBattleProject, 'seeded' | 'palette'>,
  asset: AssetId,
  indices: readonly number[],
): void {
  const keys = indices.map((index) => expectedBattleRgb(project, asset, index).join(','))
  expect(new Set(keys).size, `${asset} 帧 ${indices.join('/')} 的期望色必须互异`).toBe(
    indices.length,
  )
}
