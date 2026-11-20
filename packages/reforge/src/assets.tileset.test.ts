import type { AssetRecordV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import { gzipFrames, rleRecord } from './__tests__/asset-rle-fixtures.js'
import { AssetResolver } from './asset-resolver.js'
import { loadTileset, loadTilesetAsset, tilesFromChunkBytes } from './assets.js'
import type { FileSource } from './file-source.js'

const tile = [17, 31, 47, 63] as const

test('瓦片通过 catalog 取唯一物理路径并按帧编号保留原索引像素', async () => {
  const id = 'tileset.courtyard'
  const bytes = await gzipFrames(tile)
  const record = await rleRecord('tileset', 'courtyard', bytes)
  const reads: string[] = []
  const source: FileSource = {
    async readBytes(path) {
      reads.push(path)
      if (path !== 'assets/generated/courtyard.rle') throw new Error(`unexpected path ${path}`)
      return bytes
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
  const assetResolver = new AssetResolver(
    'project',
    { version: 1, assets: { [id]: record } },
    {},
    source,
  )
  const frames = await loadTileset({ source, assetResolver }, id)
  expect(reads).toEqual(['assets/generated/courtyard.rle'])
  expect([...frames.keys()]).toEqual([0])
  expect(frames.get(0)?.pixels).toEqual(Uint8Array.from(tile))
})

test('瓦片读取按登记的媒体类型、长度和 SHA 拒收坏记录', async () => {
  const bytes = await gzipFrames(tile)
  const record = await rleRecord('tileset', 'courtyard', bytes)
  const reader = (entry: AssetRecordV1) => ({ record: () => entry, readBytes: async () => bytes })
  await expect(loadTilesetAsset(reader(record), 'tile')).resolves.toEqual(
    new Map([
      [
        0,
        { width: 2, height: 2, pixels: Uint8Array.from(tile), opaque: Uint8Array.of(1, 1, 1, 1) },
      ],
    ]),
  )
  await expect(
    loadTilesetAsset(reader({ ...record, mediaType: 'application/json' }), 'tile'),
  ).rejects.toThrow('tileset AssetId "tile": mediaType 非法 application/json')
  await expect(
    loadTilesetAsset(reader({ ...record, bytes: bytes.byteLength + 1 }), 'tile'),
  ).rejects.toThrow(
    `tileset AssetId "tile": bytes 登记 ${bytes.byteLength + 1}，实际 ${bytes.byteLength}`,
  )
  await expect(
    loadTilesetAsset(reader({ ...record, sha256: '0'.repeat(64) }), 'tile'),
  ).rejects.toThrow('tileset AssetId "tile": sha256 不符')
})

test('瓦片字节入口拒收裸 RLE，错误保留传入的资源名', async () => {
  const raw = Uint8Array.of(1, 0, 1, 0, 1, 0, 1, 7).buffer
  await expect(tilesFromChunkBytes(raw)).rejects.toThrow('tileset: canonical .rle 必须带 gzip 头')
  await expect(tilesFromChunkBytes(raw, { label: 'yard' })).rejects.toThrow(
    'yard: canonical .rle 必须带 gzip 头',
  )
  const frames = await tilesFromChunkBytes(await gzipFrames(tile, [2, 3, 5, 7], [9, 13, 17, 19]))
  expect([...frames.keys()]).toEqual([0, 1, 2])
  expect(frames.get(0)?.pixels).toEqual(Uint8Array.from(tile))
})
