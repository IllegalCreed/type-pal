import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { extractCharacterSprites } from './sprite.js'

describe('extractCharacterSprites', () => {
  it('给定 sprite id 集合,从 chunk map 提取每个 sprite 的全部帧', () => {
    const fakeMgoChunks = new Map<number, Uint8Array>()
    // 一个 WORD 的空索引表：SDLPal 的帧数是表项数减一，即 0。
    const emptySpriteChunk = Uint8Array.of(1, 0)
    fakeMgoChunks.set(78, emptySpriteChunk)

    const result = extractCharacterSprites([78], fakeMgoChunks)
    expect(result).toHaveLength(1)
    expect(result[0]?.spriteId).toBe(78)
    expect(result[0]?.frames).toEqual([])
  })

  it('未在 mgoChunks 中找到的 sprite id —— skip 且记 warn(不抛错)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = extractCharacterSprites([999], new Map())
      expect(result).toHaveLength(0)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith('[pal-extract] sprite 999: MGO.MKF chunk 未找到,skip')
    } finally {
      warnSpy.mockRestore()
    }
  })
})

/**
 * 既有生成物连通性：三个场景引用的非零 sprite 都有 canonical .rle 文件。
 * 本用例不执行 CLI，不能证明提取器的 union、去重、读取次数或像素内容。
 * Set 只用于汇总待查 id；产物缺失必须失败，不能把提前 return 计作通过。
 */
describe('M3.5 T5 character sprite extraction loops scene chain', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  // src/resources → src → pal-extract → packages → repo root
  const REPO_ROOT = resolve(HERE, '../../../..')
  const DATA_DIR = resolve(REPO_ROOT, 'data/extracted/data')
  const SLICE_SCENE_IDS = [1, 14, 17] as const

  it('既有场景 1/14/17 引用的非零 sprite 均有 canonical .rle 产物', () => {
    const sceneFiles = SLICE_SCENE_IDS.map((id) => resolve(DATA_DIR, 'scene', `${id}.json`))
    expect(sceneFiles.every(existsSync), '需要既有场景产物；本用例不会执行提取').toBe(true)

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
    // 固定三个场景的引用集合确实比场景1大，不认证提取器如何生成这些文件。
    expect(unionSpriteNums.size).toBeGreaterThan(perScene[1]!.length)

    // 2) canonical sprite/*.rle 文件名解出已 dump 的 sprite id 集合
    const dumpedIds = new Set(
      readdirSync(resolve(DATA_DIR, 'sprite'))
        .filter((f) => /^\d+\.rle$/.test(f))
        .map((f) => parseInt(f.match(/(\d+)\.rle/)![1]!, 10)),
    )

    // 3) 只核已有产物能覆盖引用，不观察CLI执行。
    const missing: number[] = []
    for (const id of unionSpriteNums) {
      if (!dumpedIds.has(id)) missing.push(id)
    }
    expect(missing).toEqual([])
  })
})
