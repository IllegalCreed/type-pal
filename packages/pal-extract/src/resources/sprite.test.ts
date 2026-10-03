import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { extractCharacterSprites } from './sprite.js'

describe('extractCharacterSprites', () => {
  it('给定 sprite id 集合,从 chunk map 提取每个 sprite 的全部帧', () => {
    const fakeMgoChunks = new Map<number, Uint8Array>()
    const emptySpriteChunk = new Uint8Array(4)
    new DataView(emptySpriteChunk.buffer).setUint16(0, 0, true) // frameCount=0
    fakeMgoChunks.set(78, emptySpriteChunk)

    const result = extractCharacterSprites([78], fakeMgoChunks)
    expect(result).toHaveLength(1)
    expect(result[0]?.spriteId).toBe(78)
    expect(result[0]?.frames).toEqual([])
  })

  it('未在 mgoChunks 中找到的 sprite id —— skip 且记 warn(不抛错)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = extractCharacterSprites([999], new Map())
    expect(result).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sprite 999'))
    warnSpy.mockRestore()
  })
})

/**
 * M3.5 T5 sanity:cli.ts sprite 提取 loop scene chain(SLICE_SCENE_IDS = [1, 14, 17])
 *
 * 不重跑 cli(慢 + 依赖 data/raw 原盘);直接读已 dump 产物 verify:
 *  - 跨 scene union 真覆盖了仙靈島碼頭(14) + 仙靈島入口(17),不是只 scene 1
 *  - 同 spriteId 在多 scene 出现仅产一份(Set dedup)
 *  - 每个 EventObject.spriteNum(非 0)都有对应 canonical `data/sprite/NN.rle`
 *
 * data/extracted/ 是 gitignored —— 没跑过 `pnpm extract` 的 clean checkout 直接 skip + warn,
 * 不 block pnpm check(同 D29 tilemap-baseline.test.ts 套路)。
 */
describe('M3.5 T5 character sprite extraction loops scene chain', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  // src/resources → src → pal-extract → packages → repo root
  const REPO_ROOT = resolve(HERE, '../../../..')
  const DATA_DIR = resolve(REPO_ROOT, 'data/extracted/data')
  const SLICE_SCENE_IDS = [1, 14, 17] as const

  it('union scene 1 + 14 + 17 EventObject spriteNum + dedup;每个非 0 sprite 都已 dump', () => {
    const sceneFiles = SLICE_SCENE_IDS.map((id) => resolve(DATA_DIR, 'scene', `${id}.json`))
    if (sceneFiles.some((f) => !existsSync(f))) {
      console.warn(
        `[M3.5 T5 skip] data/extracted/data/scene/{1,14,17}.json 缺失 —— 跑 \`pnpm extract\` 后启用`,
      )
      return
    }

    // 1) 跨 scene union EventObject.spriteNum(>0)+ dedup
    const unionSpriteNums = new Set<number>()
    const perScene: Record<number, number[]> = {}
    for (const sceneId of SLICE_SCENE_IDS) {
      const scene = JSON.parse(
        readFileSync(resolve(DATA_DIR, 'scene', `${sceneId}.json`), 'utf-8'),
      ) as { eventObjects: { spriteNum: number }[] }
      const ids = scene.eventObjects.map((eo) => eo.spriteNum).filter((n) => n > 0)
      perScene[sceneId] = [...new Set(ids)].sort((a, b) => a - b)
      for (const n of ids) unionSpriteNums.add(n)
    }

    // 仙靈島入口(scene 17)真有 EventObject —— 防 SLICE_SCENE_IDS 漏配 / scene dump 不全的回归
    expect(perScene[17]!.length).toBeGreaterThan(0)
    // 仙靈島碼頭(scene 14)真有 EventObject
    expect(perScene[14]!.length).toBeGreaterThan(0)
    // union 至少比 scene 1 单独 strict 多(verify 真合并,不是覆盖)
    expect(unionSpriteNums.size).toBeGreaterThan(perScene[1]!.length)

    // 2) canonical sprite/*.rle 文件名解出已 dump 的 sprite id 集合
    const dumpedIds = new Set(
      readdirSync(resolve(DATA_DIR, 'sprite'))
        .filter((f) => /^\d+\.rle$/.test(f))
        .map((f) => parseInt(f.match(/(\d+)\.rle/)![1]!, 10)),
    )

    // 3) verify EventObject.spriteNum 全部都有对应 sprite/*.rle
    //    (cli.ts 提取 loop union 真覆盖 + 同 id 不重复 fetch + 全产出)
    const missing: number[] = []
    for (const id of unionSpriteNums) {
      if (!dumpedIds.has(id)) missing.push(id)
    }
    expect(missing).toEqual([])
  })
})
