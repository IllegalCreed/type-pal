import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { encodeSpriteChunk } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { json, put, tempRepo } from './__tests__/pal-asset-fixtures.js'
import { loadPalBattleSprites, loadPalWorldSprites } from './pal-assets.js'

const EXTRACTED = 'data/extracted'

const frame2x2 = (): Uint8Array =>
  encodeSpriteChunk([
    { width: 2, height: 2, pixels: new Uint8Array(4).fill(3), opaque: new Uint8Array(4).fill(1) },
  ])

/** 合法 3 槽 chunk：frame0 合法 + 坏尾槽 + 0 sentinel（shared rle.boundaries 同构配方）。 */
function legacyTailChunk(): Uint8Array {
  const frame = [0x01, 0x00, 0x01, 0x00, 0x01, 0x07] // 1×1 单像素帧
  const badTail = [0xff, 0x0f, 0xff, 0x0f, 0x01, 0x00] // width/height 0x0FFF 不可解
  const declared = 3
  const tableBytes = declared * 2
  const chunk = new Uint8Array(tableBytes + frame.length + badTail.length)
  const view = new DataView(chunk.buffer)
  view.setUint16(0, declared, true)
  view.setUint16(2, (tableBytes + frame.length) / 2, true) // slot1 = 坏尾（word 偏移）
  // slot2 (byte 4) 保持 0 = trailing sentinel
  chunk.set(frame, tableBytes)
  chunk.set(badTail, tableBytes + frame.length)
  return chunk
}

function buildWorldSpriteTree(repo: string, sprite1: Uint8Array): void {
  mkdirSync(resolve(repo, EXTRACTED, 'data/sprite'), { recursive: true })
  put(repo, `${EXTRACTED}/data/sprite/1.rle`, sprite1)
  const filler = gzipSync(frame2x2())
  for (let sprite = 2; sprite <= 636; sprite++)
    put(repo, `${EXTRACTED}/data/sprite/${sprite}.rle`, filler)
}

describe('PAL world sprite sources', () => {
  test('源集合不完整（空目录）精确拒绝', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, EXTRACTED, 'data/sprite'), { recursive: true })
    expect(() => loadPalWorldSprites(repo)).toThrow('PAL 大世界精灵源集合期望完整 1..636')
  })

  test('sprite 1 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）', () => {
    const repo = tempRepo()
    buildWorldSpriteTree(repo, new Uint8Array([0x1f, 0x00]))
    expect(() => loadPalWorldSprites(repo)).toThrow('PAL 大世界精灵 1 必须是 gzip RLE')
  })

  test('accepts a legacy tail before rejecting a noncanonical world sprite byte total', () => {
    const repo = tempRepo()
    const canonicalFrame = gzipSync(frame2x2())
    const withLegacyTail = gzipSync(legacyTailChunk())
    buildWorldSpriteTree(repo, withLegacyTail)
    expect(() => loadPalWorldSprites(repo)).toThrow(
      `PAL 大世界精灵字节期望 1332725，收到 ${635 * canonicalFrame.length + withLegacyTail.length}`,
    )
  })
})

// ── battle sprites ──────────────────────────────────────────────────────

function battleManifest() {
  return {
    sprites: [
      ...Array.from({ length: 19 }, (_, id) => ({ kind: 'player', id })),
      ...Array.from({ length: 153 }, (_, index) => ({ kind: 'enemy', id: index + 1 })),
    ],
  }
}

function buildBattleSpriteTree(repo: string, player0: Uint8Array): void {
  json(repo, `${EXTRACTED}/data/battle-sprites.json`, battleManifest())
  put(repo, `${EXTRACTED}/data/battle-sprite/player/0.rle`, player0)
  const filler = gzipSync(frame2x2())
  for (let id = 1; id <= 18; id++)
    put(repo, `${EXTRACTED}/data/battle-sprite/player/${id}.rle`, filler)
  for (let id = 1; id <= 153; id++)
    put(repo, `${EXTRACTED}/data/battle-sprite/enemy/${id}.rle`, filler)
}

describe('PAL battle sprite sources', () => {
  test('manifest.sprites 非数组精确拒绝', () => {
    const repo = tempRepo()
    json(repo, `${EXTRACTED}/data/battle-sprites.json`, { sprites: {} })
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL battle-sprites.json 期望 sprites 数组')
  })

  test('源序列不符（player 段混入 enemy）精确拒绝', () => {
    const repo = tempRepo()
    const manifest = battleManifest()
    const [first] = manifest.sprites
    if (!first) throw new Error('Missing player sprite fixture')
    manifest.sprites[0] = { ...first, kind: 'enemy' }
    json(repo, `${EXTRACTED}/data/battle-sprites.json`, manifest)
    expect(() => loadPalBattleSprites(repo)).toThrow(
      'PAL battle-sprites 源集合期望 player 0..18 后接 enemy 1..153',
    )
  })

  test('player 目录集合漂移精确拒绝', () => {
    const repo = tempRepo()
    json(repo, `${EXTRACTED}/data/battle-sprites.json`, battleManifest())
    mkdirSync(resolve(repo, EXTRACTED, 'data/battle-sprite/player'), { recursive: true })
    put(repo, `${EXTRACTED}/data/battle-sprite/player/0.rle`, gzipSync(frame2x2()))
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL battle-sprite/player 目录集合发生漂移')
  })

  test('player 0 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）', () => {
    const repo = tempRepo()
    buildBattleSpriteTree(repo, new Uint8Array([0x1f, 0x00]))
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL player 战斗精灵 0 必须是 gzip RLE')
  })

  test('reports exact source totals including one malformed enemy tail slot', () => {
    const repo = tempRepo()
    const frame = frame2x2()
    const malformed = legacyTailChunk()
    const normalBytes = gzipSync(frame)
    const malformedBytes = gzipSync(malformed)
    buildBattleSpriteTree(repo, normalBytes)
    // Enemy 24 is a source whose legacy decoder tolerates a malformed trailing slot.
    put(repo, `${EXTRACTED}/data/battle-sprite/enemy/24.rle`, malformedBytes)
    const totalBytes = 171 * normalBytes.length + malformedBytes.length
    const totalRaw = 171 * frame.length + malformed.length
    expect(() => loadPalBattleSprites(repo)).toThrow(
      `PAL 战斗精灵基线漂移: bytes=${totalBytes} raw=${totalRaw} frames=172 bad-tail=1`,
    )
  })
})
