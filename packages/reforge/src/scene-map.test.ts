import { validateAssetCatalog, validateMapIndex, validateTilesets } from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import { compressGzip } from './assets.js'
import type { FileSource } from './file-source.js'
import { sha256Bytes } from './hash.js'
import { loadSceneMap } from './scene-map.js'

const mapPath = 'content/maps/author-room.json'
const mapIndex = validateMapIndex({
  version: 1,
  maps: [{ id: 'home', name: '民居', path: mapPath }],
})

async function authorMapFixture(tilesetRefs: [string] | [string, string]) {
  const sourceCells = tilesetRefs.length === 2 ? [[0], [1]] : [[0], [0]]
  const map = {
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs,
    layers: [{ id: 'floor', name: '地板', tiles: [[0], [0]], sources: sourceCells }],
    collision: [[0], [0]],
  }
  const inputs = [
    { id: 'inside', asset: 'rle-room', path: 'assets/generated/stone.rle', color: 7 },
    { id: 'outside', asset: 'rle-field', path: 'assets/generated/grass.rle', color: 91 },
  ]
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  const records = await Promise.all(
    inputs.map(async ({ asset, path, color }) => {
      const bytes = await compressGzip(
        encodeSpriteChunk([
          {
            width: 32,
            height: 15,
            pixels: new Uint8Array(480).fill(color),
            opaque: new Uint8Array(480).fill(1),
          },
        ]),
      )
      files.set(path, Uint8Array.from(bytes))
      return [
        asset,
        {
          kind: 'tileset',
          path,
          bytes: bytes.length,
          mediaType: 'application/vnd.type-pal.rle',
          sha256: await sha256Bytes(bytes),
          origin: { kind: 'generated' },
        },
      ] as const
    }),
  )
  const catalog = validateAssetCatalog({ version: 1, assets: Object.fromEntries(records) })
  const tilesets = validateTilesets(
    inputs.map(({ id, asset }) => ({ id, asset, name: id, category: 'terrain' })),
    catalog,
  )
  const reads: string[] = []
  const source: FileSource = {
    async readText(path) {
      reads.push(path)
      if (path !== mapPath) throw new DOMException(path, 'NotFoundError')
      return JSON.stringify(map)
    },
    async readJson<T>(path: string) {
      return new Response(await this.readText(path)).json() as Promise<T>
    },
    async readBytes(path) {
      reads.push(path)
      const bytes = files.get(path)
      if (!bytes) throw new DOMException(path, 'NotFoundError')
      return bytes.slice().buffer
    },
    async urlFor(path) {
      return `https://project.test/${path}`
    },
  }
  const assetResolver = new AssetResolver('map-fixture', catalog, {}, source)
  return { base: { source, assetResolver }, tilesets, reads }
}

test('map placements select different decoded frames for the same tile index by stable tileset id', async () => {
  const { base, tilesets, reads } = await authorMapFixture(['inside', 'outside'])
  const result = await loadSceneMap(base, 'home', tilesets, mapIndex)
  expect(reads[0]).toBe(mapPath)
  expect(reads.slice(1).sort()).toEqual([
    'assets/generated/grass.rle',
    'assets/generated/stone.rle',
  ])
  expect(result.map.layers[0]?.sources).toEqual([[0], [1]])
  expect([...result.tilesets.keys()]).toEqual(['inside', 'outside'])
  const colors = ['inside', 'outside'].map((id) => result.tilesets.get(id)?.get(0)?.pixels[0])
  expect(colors).toEqual([7, 91])
})

test('unknown map id is rejected before any file is opened', async () => {
  const { base, tilesets, reads } = await authorMapFixture(['inside'])
  await expect(loadSceneMap(base, 'missing', tilesets, mapIndex)).rejects.toThrow(
    'mapId "missing" 不在 map index',
  )
  expect(reads).toEqual([])
})

test('an unregistered tileset is diagnosed after reading the valid map, before reading binary data', async () => {
  const { base, tilesets, reads } = await authorMapFixture(['missing'])
  await expect(loadSceneMap(base, 'home', tilesets, mapIndex)).rejects.toThrow(
    'tileset "missing" 不在注册表',
  )
  expect(reads).toEqual([mapPath])
})
