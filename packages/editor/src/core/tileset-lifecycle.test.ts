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
import { TilesetRemovalProof, TilesetReplacementProof } from './tileset-references.js'

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
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { maps: 'content/maps/index.json', tilesets: 'content/tilesets.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    maps: options.maps ?? {},
    sceneIndex: { version: 1, scenes: [] },
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
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地板', tiles: [[tileId], [null]], sources: [[0], [null]] }],
    collision: [[0], [0]],
  }
}

const currentBatch = (state: EditorState) => new EditSession(state).getMapReferenceBatch()

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
    const first = new RemoveTilesetCommand(
      'forest',
      TilesetRemovalProof.fromBatch(currentBatch(before), before, 'forest'),
      currentBatch,
    )
    const shared = first.apply(before)
    expect(shared.tilesets!.map(({ id }) => id)).toEqual(['forest-night'])
    expect(shared.assetCatalog.assets['tileset.shared']).toEqual(meta)
    expect(shared.assetBlobs[meta.path]).toBe(bytes)

    const last = new RemoveTilesetCommand(
      'forest-night',
      TilesetRemovalProof.fromBatch(currentBatch(shared), shared, 'forest-night'),
      currentBatch,
      bytes,
    )
    const removed = last.apply(shared)
    expect(removed.assetCatalog.assets['tileset.shared']).toBeUndefined()
    expect(removed.assetBlobs[meta.path]).toBeUndefined()
    expect(last.invert(removed).assetCatalog.assets['tileset.shared']).toEqual(meta)
  })

  test('删除许可绑定定义集合与资源身份，最后定义必须带可恢复 bytes', async () => {
    const bytes = new Uint8Array([1, 2]).buffer
    const meta = record('assets/authored/tilesets/forest.rle', bytes, await sha256Hex(bytes))
    const definition = {
      id: 'forest',
      name: '森林',
      category: 'outdoor',
      asset: 'tileset.forest',
    }
    const before = state({
      definitions: [definition],
      records: { 'tileset.forest': meta },
    })
    const proof = TilesetRemovalProof.fromBatch(currentBatch(before), before, 'forest')
    const command = (persistedBytes: ArrayBuffer | undefined) =>
      new RemoveTilesetCommand('forest', proof, currentBatch, persistedBytes)

    expect(() =>
      command(bytes).apply({
        ...before,
        tilesets: [{ ...definition, asset: 'tileset.other' }],
        assetCatalog: {
          version: 1,
          assets: { 'tileset.other': { ...meta, path: 'assets/other.rle' } },
        },
      }),
    ).toThrow(/定义或源资源已变化/)
    expect(() =>
      command(bytes).apply({
        ...before,
        assetCatalog: {
          version: 1,
          assets: { 'tileset.forest': { ...meta, sha256: 'f'.repeat(64) } },
        },
      }),
    ).toThrow(/定义或源资源已变化/)
    expect(() =>
      command(bytes).apply({
        ...before,
        tilesets: [definition, { ...definition, id: 'forest-night', name: '夜林' }],
      }),
    ).toThrow(/定义或源资源已变化/)

    const session = new EditSession(before)
    const sessionProof = TilesetRemovalProof.fromBatch(
      session.getMapReferenceBatch(),
      session.getState(),
      'forest',
    )
    expect(() =>
      session.dispatch(
        new RemoveTilesetCommand('forest', sessionProof, (current) =>
          session.getCurrentMapReferenceBatch(current),
        ),
      ),
    ).toThrow(/可恢复的源资源/)
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().tilesets).toEqual([definition])
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
    const batch = currentBatch(before)
    expect(() =>
      TilesetReplacementProof.fromBatch(batch, 'forest', 2, {
        asset: 'tileset.shared',
        previousRecord: oldRecord,
        definitions,
      }),
    ).toThrow(/地图“map-a” #2/)

    const proof = TilesetReplacementProof.fromBatch(batch, 'forest', 3, {
      asset: 'tileset.shared',
      previousRecord: oldRecord,
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
        currentBatch,
      ).apply(before),
    ).toThrow(/canonical gzip/)
    expect(() =>
      new ReplaceTilesetAssetCommand(
        'forest',
        'tileset.shared',
        nextRecord,
        nextBytes,
        oldBytes,
        proof,
        currentBatch,
      ).apply({
        ...before,
        assetCatalog: {
          ...before.assetCatalog,
          assets: {
            ...before.assetCatalog.assets,
            'tileset.shared': { ...oldRecord, label: '等待期间改名' },
          },
        },
      }),
    ).toThrow(/资源已变化/)
    const command = new ReplaceTilesetAssetCommand(
      'forest',
      'tileset.shared',
      nextRecord,
      nextBytes,
      oldBytes,
      proof,
      currentBatch,
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

  test('替换 undo 后 hydrate 出现越界瓦片时 redo fail-closed 并保留 future', async () => {
    const oldBytes = seedAssets.tilesetRle.slice(0)
    const nextBytes = seedAssets.spriteRle.slice(0)
    const oldRecord = record(
      'assets/authored/tilesets/old-redo.rle',
      oldBytes,
      await sha256Hex(oldBytes),
    )
    const nextRecord = record(
      'assets/authored/tilesets/next-redo.rle',
      nextBytes,
      await sha256Hex(nextBytes),
    )
    const definition = {
      id: 'forest',
      name: '森林',
      category: 'outdoor',
      asset: 'tileset.forest',
    }
    const mapIndex: MapIndexV1 = {
      version: 1,
      maps: [{ id: 'map-a', name: '地图 A', path: 'content/maps/a.json' }],
    }
    let diskMap = map('forest', 1)
    const session = new EditSession(
      state({
        definitions: [definition],
        records: { 'tileset.forest': oldRecord },
        blobs: { [oldRecord.path]: oldBytes },
        mapIndex,
      }),
      { loadMap: async () => diskMap },
    )
    const batch = await session.ensureMapReferencesIndexed()
    const proof = TilesetReplacementProof.fromBatch(batch, 'forest', 3, {
      asset: 'tileset.forest',
      previousRecord: oldRecord,
      definitions: [definition],
    })
    const command = new ReplaceTilesetAssetCommand(
      'forest',
      'tileset.forest',
      nextRecord,
      nextBytes,
      oldBytes,
      proof,
      (current) => session.getCurrentMapReferenceBatch(current),
    )

    session.dispatch(command)
    expect(session.undo()).toBe(true)
    diskMap = map('forest', 3)
    await session.ensureMapLoaded('map-a')
    expect(() => session.redo()).toThrow(/事实已变化|越界引用/)
    expect(session.canRedo()).toBe(true)
    expect(session.getState().assetCatalog.assets['tileset.forest']).toEqual(oldRecord)
  })
})
