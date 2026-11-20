import type { AssetRecordV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import { gzipFrames, rleRecord } from './__tests__/asset-rle-fixtures.js'
import { AssetResolver } from './asset-resolver.js'
import { loadEffectSprite, loadFireSprite } from './assets.js'
import type { FileSource } from './file-source.js'

const physical = 'effect-sprite.pal.physical-hit'
const fire = 'effect-sprite.pal.magic.005'
const otherMagic = 'effect-sprite.pal.magic.007'
const physicalPixels = [1, 2, 3, 4] as const
const firePixels = [31, 17, 41, 9] as const
const otherMagicPixels = [13, 19, 2, 8] as const

function project(...assets: { id: string; record: AssetRecordV1; bytes: ArrayBuffer }[]) {
  const reads: string[] = []
  const files = new Map(assets.map(({ record, bytes }) => [record.path, bytes]))
  const source: FileSource = {
    async readBytes(path) {
      reads.push(path)
      const bytes = files.get(path)
      if (!bytes) throw new Error(`missing ${path}`)
      return bytes.slice(0)
    },
    async readText(path) {
      throw new Error(`unexpected text path ${path}`)
    },
    async readJson(path) {
      throw new Error(`unexpected JSON path ${path}`)
    },
    async urlFor(path) {
      throw new Error(`unexpected URL path ${path}`)
    },
  }
  const records = Object.fromEntries(assets.map(({ id, record }) => [id, record]))
  return {
    source,
    assetResolver: new AssetResolver('battle', { version: 1, assets: records }, {}, source),
    reads,
  }
}

test('物理与法术特效分别按稳定身份读取自己的图帧，锚点保持为零', async () => {
  const physicalBytes = await gzipFrames(physicalPixels)
  const fireBytes = await gzipFrames(firePixels)
  const otherMagicBytes = await gzipFrames(otherMagicPixels)
  const base = project(
    {
      id: physical,
      record: await rleRecord('effect-sprite', 'physical-hit', physicalBytes),
      bytes: physicalBytes,
    },
    {
      id: fire,
      record: await rleRecord('effect-sprite', 'fire-variant', fireBytes),
      bytes: fireBytes,
    },
    {
      id: otherMagic,
      record: await rleRecord('effect-sprite', 'other-magic', otherMagicBytes),
      bytes: otherMagicBytes,
    },
  )
  const hit = await loadEffectSprite(base)
  const magic = await loadFireSprite(base, 5)
  const other = await loadFireSprite(base, 7)
  expect(base.reads).toEqual([
    'assets/generated/physical-hit.rle',
    'assets/generated/fire-variant.rle',
    'assets/generated/other-magic.rle',
  ])
  expect(hit).toMatchObject({
    anchorX: 0,
    anchorY: 0,
    frames: [{ pixels: Uint8Array.from(physicalPixels) }],
  })
  expect(magic).toMatchObject({
    anchorX: 0,
    anchorY: 0,
    frames: [{ pixels: Uint8Array.from(firePixels) }],
  })
  expect(other).toMatchObject({
    anchorX: 0,
    anchorY: 0,
    frames: [{ pixels: Uint8Array.from(otherMagicPixels) }],
  })
})

test('物理特效拒收错误媒体类型、登记长度和 SHA', async () => {
  const bytes = await gzipFrames(physicalPixels)
  const record = await rleRecord('effect-sprite', 'physical-hit', bytes)
  const load = (entry: AssetRecordV1) =>
    loadEffectSprite(project({ id: physical, record: entry, bytes }))
  await expect(load(record)).resolves.toMatchObject({
    frames: [{ pixels: Uint8Array.from(physicalPixels) }],
  })
  await expect(load({ ...record, mediaType: 'image/png' })).rejects.toThrow(
    'mediaType 非法 image/png',
  )
  await expect(load({ ...record, bytes: bytes.byteLength + 1 })).rejects.toThrow(
    `bytes 登记 ${bytes.byteLength + 1}，实际 ${bytes.byteLength}`,
  )
  await expect(load({ ...record, sha256: '0'.repeat(64) })).rejects.toThrow('sha256 不符')
})
