import type { AssetRecordV1, MapIndexV1, ProjectMap, TilesetDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { sha256Hex } from './binary-signature.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { buildSeedAssets } from './seed-assets.js'
import {
  scanTilesetReferences,
  TilesetRemovalProof,
  TilesetReplacementProof,
} from './tileset-references.js'

const EMPTY_INDEX: MapIndexV1 = { version: 1, maps: [] }
const seedAssets = await buildSeedAssets()

function record(path: string, bytes: ArrayBuffer, sha256: string): AssetRecordV1 {
  return {
    kind: 'tileset',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256,
    origin: { kind: 'authored' },
  }
}

function state(
  options: {
    definitions?: TilesetDef[]
    records?: Record<string, AssetRecordV1>
    blobs?: Record<string, ArrayBuffer>
    mapIndex?: MapIndexV1
    maps?: Record<string, ProjectMap>
  } = {},
): EditorState {
  return {
    manifest: {
      id: 'tileset-test',
      name: 'Tileset Test',
      contentVersion: 3,
      entryScene: 's',
      content: { maps: 'content/maps/index.json', tilesets: 'content/tilesets.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: options.maps ?? {},
    mapIndex: options.mapIndex ?? EMPTY_INDEX,
    tilesets: options.definitions ?? [],
    tilesetBlobs: {},
    stamps: [],
    assetCatalog: { version: 1, assets: options.records ?? {} },
    assetBlobs: options.blobs ?? {},
    scriptChunks: {},
  } as unknown as EditorState
}

function map(tilesetId: string, tileId: number): ProjectMap {
  return {
    version: 2,
    width: 1,
    height: 1,
    tilesetId,
    layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles: [[tileId]] }],
    collision: [[0]],
  }
}

describe('A7-3T 瓦片集命令事务', () => {
  test('导入定义/record/pending bytes 原子入库，EditSession undo/redo 完整恢复', async () => {
    const bytes = seedAssets.tilesetRle.slice(0)
    const def = { id: 'forest', name: '森林', category: 'outdoor', asset: 'tileset.forest' }
    const meta = record('assets/authored/tilesets/forest.rle', bytes, await sha256Hex(bytes))
    const session = new EditSession(state())

    expect(session.dispatch(new AddTilesetCommand(def, meta, bytes))).toBe(true)
    expect(session.getState().tilesets).toEqual([def])
    expect(session.getState().assetCatalog.assets[def.asset]).toEqual(meta)
    expect(new Uint8Array(session.getState().assetBlobs[meta.path]!)).toEqual(new Uint8Array(bytes))
    expect(session.undo()).toBe(true)
    expect(session.getState().tilesets).toEqual([])
    expect(session.getState().assetCatalog.assets[def.asset]).toBeUndefined()
    expect(session.getState().assetBlobs[meta.path]).toBeUndefined()
    expect(session.redo()).toBe(true)
    expect(session.getState().tilesets).toEqual([def])
  })

  test('导入拒绝二进制长度不符与其它 AssetId 的路径碰撞', async () => {
    const bytes = seedAssets.tilesetRle.slice(0)
    const def = { id: 'forest', name: '森林', category: 'outdoor', asset: 'tileset.forest' }
    const meta = record('assets/authored/tilesets/shared.rle', bytes, await sha256Hex(bytes))
    expect(() => new AddTilesetCommand(def, { ...meta, bytes: 3 }, bytes).apply(state())).toThrow(
      /bytes/,
    )
    const bare = new Uint8Array([1, 2]).buffer
    const bareHash = await sha256Hex(bare)
    expect(() =>
      new AddTilesetCommand(def, record(meta.path, bare, bareHash), bare).apply(state()),
    ).toThrow(/canonical gzip/)
    expect(() =>
      new AddTilesetCommand(def, meta, bytes).apply(
        state({
          records: {
            'tileset.other': { ...meta, sha256: 'b'.repeat(64) },
          },
        }),
      ),
    ).toThrow(/路径已由 tileset\.other/)
  })

  test('改名/分类只修改领域定义，catalog label 不形成第二名称真值', async () => {
    const bytes = new Uint8Array([1]).buffer
    const def = { id: 'forest', name: '森林', category: 'outdoor', asset: 'tileset.forest' }
    const meta = {
      ...record('assets/authored/tilesets/forest.rle', bytes, await sha256Hex(bytes)),
      label: '诊断标签',
    }
    const command = new UpdateTilesetMetadataCommand(def.id, {
      name: '深林',
      category: 'dungeon',
    })
    const next = command.apply(state({ definitions: [def], records: { [def.asset]: meta } }))
    expect(next.tilesets![0]).toMatchObject({ name: '深林', category: 'dungeon' })
    expect(next.assetCatalog.assets[def.asset]?.label).toBe('诊断标签')
    expect(command.invert(next).tilesets![0]).toEqual(def)
  })

  test('删除共享定义不误删 record/blob；删最后定义才连带删除且可撤销', async () => {
    const bytes = new Uint8Array([1, 2]).buffer
    const meta = record('assets/authored/tilesets/shared.rle', bytes, await sha256Hex(bytes))
    const definitions = [
      { id: 'forest', name: '森林', category: 'outdoor', asset: 'tileset.shared' },
      { id: 'forest-night', name: '夜林', category: 'outdoor', asset: 'tileset.shared' },
    ]
    const before = state({
      definitions,
      records: { 'tileset.shared': meta },
      blobs: { [meta.path]: bytes },
    })
    const scan = await scanTilesetReferences({
      tilesetId: 'forest',
      mapIndex: EMPTY_INDEX,
      stamps: [],
      loadMap: async () => {
        throw new Error('无地图')
      },
    })
    const first = new RemoveTilesetCommand(
      'forest',
      TilesetRemovalProof.fromScan(scan, EMPTY_INDEX),
    )
    const shared = first.apply(before)
    expect(shared.tilesets!.map(({ id }) => id)).toEqual(['forest-night'])
    expect(shared.assetCatalog.assets['tileset.shared']).toEqual(meta)
    expect(shared.assetBlobs[meta.path]).toBe(bytes)

    const scanLast = await scanTilesetReferences({
      tilesetId: 'forest-night',
      mapIndex: EMPTY_INDEX,
      stamps: [],
      loadMap: async () => {
        throw new Error('无地图')
      },
    })
    const last = new RemoveTilesetCommand(
      'forest-night',
      TilesetRemovalProof.fromScan(scanLast, EMPTY_INDEX),
      bytes,
    )
    const removed = last.apply(shared)
    expect(removed.assetCatalog.assets['tileset.shared']).toBeUndefined()
    expect(removed.assetBlobs[meta.path]).toBeUndefined()
    expect(last.invert(removed).assetCatalog.assets['tileset.shared']).toEqual(meta)
  })

  test('共享资产缩帧先列出完整范围并阻断越界；合法替换保持两层稳定 id', async () => {
    const oldBytes = seedAssets.tilesetRle.slice(0)
    const nextBytes = seedAssets.spriteRle.slice(0)
    const oldRecord = record(
      'assets/authored/tilesets/old.rle',
      oldBytes,
      await sha256Hex(oldBytes),
    )
    const nextRecord = record(
      'assets/authored/tilesets/next.rle',
      nextBytes,
      await sha256Hex(nextBytes),
    )
    const definitions = [
      { id: 'forest', name: '森林', category: 'outdoor', asset: 'tileset.shared' },
      { id: 'forest-night', name: '夜林', category: 'outdoor', asset: 'tileset.shared' },
    ]
    const mapIndex: MapIndexV1 = {
      version: 1,
      maps: [{ id: 'map-a', name: '地图 A', path: 'content/maps/a.json' }],
    }
    const projectMap = map('forest-night', 2)
    const before = state({
      definitions,
      records: { 'tileset.shared': oldRecord },
      blobs: { [oldRecord.path]: oldBytes },
      mapIndex,
      maps: { 'map-a': projectMap },
    })
    const scan = await scanTilesetReferences({
      tilesetId: 'forest',
      tilesetIds: definitions.map(({ id }) => id),
      mapIndex,
      stamps: [],
      loadMap: async () => projectMap,
    })
    expect(() =>
      TilesetReplacementProof.fromScan(scan, mapIndex, 2, {
        asset: 'tileset.shared',
        previousSha256: oldRecord.sha256,
        definitions,
      }),
    ).toThrow(/地图“地图 A” #2/)

    const proof = TilesetReplacementProof.fromScan(scan, mapIndex, 3, {
      asset: 'tileset.shared',
      previousSha256: oldRecord.sha256,
      definitions,
    })
    const bare = new Uint8Array([4, 5, 6]).buffer
    const bareHash = await sha256Hex(bare)
    expect(() =>
      new ReplaceTilesetAssetCommand(
        'forest',
        'tileset.shared',
        record('assets/authored/tilesets/bare.rle', bare, bareHash),
        bare,
        oldBytes,
        proof,
      ).apply(before),
    ).toThrow(/canonical gzip/)
    const command = new ReplaceTilesetAssetCommand(
      'forest',
      'tileset.shared',
      nextRecord,
      nextBytes,
      oldBytes,
      proof,
    )
    const replaced = command.apply(before)
    expect(replaced.tilesets).toEqual(definitions)
    expect(replaced.assetCatalog.assets['tileset.shared']).toEqual(nextRecord)
    expect(replaced.assetBlobs[oldRecord.path]).toBeUndefined()
    expect(new Uint8Array(replaced.assetBlobs[nextRecord.path]!)).toEqual(new Uint8Array(nextBytes))
    const restored = command.invert(replaced)
    expect(restored.assetCatalog.assets['tileset.shared']).toEqual(oldRecord)
    expect(new Uint8Array(restored.assetBlobs[oldRecord.path]!)).toEqual(new Uint8Array(oldBytes))
    expect(() =>
      command.apply({
        ...before,
        assetCatalog: {
          version: 1,
          assets: { 'tileset.shared': { ...oldRecord, sha256: 'f'.repeat(64) } },
        },
      }),
    ).toThrow(/已变化/)
  })
})
