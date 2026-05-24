import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { decodeRle } from '../io/rle.js'
import { encodeIndexedPng, extractCharacterSprites, framesToOut, parseSpriteChunk } from './sprite.js'

describe('sprite', () => {
  it('encodeIndexedPng 产 PNG 字节流,以 PNG 魔数开头', () => {
    const frame = decodeRle(new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa]))
    const png = encodeIndexedPng(frame.width, frame.height, frame.pixels)
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89)
    expect(png[1]).toBe(0x50)
    expect(png[2]).toBe(0x4e)
    expect(png[3]).toBe(0x47)
  })

  it('parseSpriteChunk 切 1 帧 —— byte 0..1 = imagecount = 1,frame[0] word-offset = 1 (=2 字节)', () => {
    // 仿 sdlpal palcommon.c::PAL_SpriteGetFrame:frame[i] 字节 offset = u16(byte i*2) << 1
    // frame 0:byte 0..1 = imagecount = 1 → word-offset = 1 → byte offset = 2
    // RLE data 从 byte 2 起
    const buf = new Uint8Array([
      0x01, 0x00,                                            // imagecount = 1;同时 frame[0] word-offset = 1 (=byte 2)
      0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa,  // RLE 2×2 at byte 2
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(2)
    expect(frames[0]!.height).toBe(2)
  })

  it('parseSpriteChunk 跳过 word-offset=0 的空帧', () => {
    // 2 帧:frame 0 byte 0..1 = imagecount = 2(也是 frame[0] word-offset = 2 = byte 4,有效)
    //       frame 1 byte 2..3 = 0(空缺)
    // RLE for frame 0 at byte 4
    const buf = new Uint8Array([
      0x02, 0x00,                                            // imagecount = 2 (= frame[0] word-offset = 2, byte 4)
      0x00, 0x00,                                            // frame[1] word-offset = 0 → 空
      0x01, 0x00, 0x01, 0x00, 0x01, 0xbb,                    // 1×1 RLE at byte 4
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1) // 只有 frame 0
    expect(frames[0]!.width).toBe(1)
    expect(frames[0]!.height).toBe(1)
  })

  it('framesToOut 转 SpriteFrameOut[]', () => {
    const frames = parseSpriteChunk(
      new Uint8Array([
        0x01, 0x00,                                            // imagecount = 1
        0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa,  // RLE 2×2
      ]),
    )
    const out = framesToOut(frames)
    expect(out).toHaveLength(1)
    expect(out[0]!.index).toBe(0)
    expect(out[0]!.width).toBe(2)
    expect(out[0]!.pngBytes[0]).toBe(0x89)
  })
})

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
 *  - 每个 EventObject.spriteNum(非 0)都有对应 sprite-NN.json
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
    const sceneFiles = SLICE_SCENE_IDS.map((id) => resolve(DATA_DIR, `scene-${id}.json`))
    if (sceneFiles.some((f) => !existsSync(f))) {
      console.warn(
        `[M3.5 T5 skip] data/extracted/data/scene-{1,14,17}.json 缺失 —— 跑 \`pnpm extract\` 后启用`,
      )
      return
    }

    // 1) 跨 scene union EventObject.spriteNum(>0)+ dedup
    const unionSpriteNums = new Set<number>()
    const perScene: Record<number, number[]> = {}
    for (const sceneId of SLICE_SCENE_IDS) {
      const scene = JSON.parse(
        readFileSync(resolve(DATA_DIR, `scene-${sceneId}.json`), 'utf-8'),
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

    // 2) sprite-*.json 文件名解出已 dump 的 sprite id 集合
    const dumpedIds = new Set(
      readdirSync(DATA_DIR)
        .filter((f) => /^sprite-\d+\.json$/.test(f))
        .map((f) => parseInt(f.match(/sprite-(\d+)/)![1]!, 10)),
    )

    // 3) verify EventObject.spriteNum 全部都有对应 sprite-*.json
    //    (cli.ts 提取 loop union 真覆盖 + 同 id 不重复 fetch + 全产出)
    const missing: number[] = []
    for (const id of unionSpriteNums) {
      if (!dumpedIds.has(id)) missing.push(id)
    }
    expect(missing).toEqual([])
  })
})
