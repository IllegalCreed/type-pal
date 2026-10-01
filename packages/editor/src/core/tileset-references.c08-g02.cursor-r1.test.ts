/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G02：tileset-references 证明与引用边（不抢 MapMode）。
 * 排重：tileset-references.test ED-3 异步扫描九例已证 batch 生命周期；本文件补 proof 构造、
 * assert*Allowed 失配文案与 stamp/tileset 边过滤的新轴。
 */
import type { MapIndexV1, ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import type { MapReferenceEdgeBatch } from './map-reference-facts.js'
import {
  assertStampDeletionAllowed,
  assertTilesetRemovalAllowed,
  assertTilesetReplacementAllowed,
  StampDeletionProof,
  stampPlacementReferences,
  TilesetRemovalProof,
  TilesetReplacementProof,
  tilesetUsageReferences,
} from './tileset-references.js'

function stampTemplate(tilesetId: string): StampTemplate {
  return {
    id: 'c08-tree',
    name: '树',
    origin: 'authored',
    width: 1,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地面', tiles: [[0], [null]], sources: [[0], [null]] }],
    collision: [[null], [null]],
  }
}

function editorState(maps: Record<string, ProjectMap>, stamps: StampTemplate[] = []): EditorState {
  const mapIndex: MapIndexV1 = {
    version: 1,
    maps: Object.keys(maps).map((id) => ({
      id,
      name: id,
      path: `content/maps/${id}.json`,
    })),
  }
  return {
    manifest: {
      id: 'c08-ref',
      name: 'c08',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { maps: 'content/maps.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps,
    mapIndex,
    tilesets: [{ id: 'tiles-a', name: 'A', category: 'test', asset: 'tileset.a' }],
    tilesetBlobs: {},
    stamps,
    assetCatalog: {
      version: 1,
      assets: {
        'tileset.a': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/a.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 2,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: { 'assets/authored/tilesets/a.rle': new Uint8Array([1, 2]).buffer },
    scriptChunks: {},
  } as unknown as EditorState
}

async function indexedBatch(maps: Record<string, ProjectMap>, stamps: StampTemplate[] = []) {
  const byId: Record<string, ProjectMap> = maps
  const session = new EditSession(editorState(byId, stamps), {
    loadMap: async (id: string) => byId[id]!,
  })
  return session.ensureMapReferencesIndexed()
}

describe('C08-G02 tileset-references 边与证明门', () => {
  test('C08-G02-01 tilesetUsageReferences 只保留 tileset-use 关系', async () => {
    const maps = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-a'),
      'map-b': buildBlankProjectMap(1, 1, 'tiles-b'),
    }
    const batch = await indexedBatch(maps, [stampTemplate('tiles-a')])
    const edges = tilesetUsageReferences(batch, 'tiles-a')
    expect(edges.every((edge) => edge.relation.kind === 'tileset-use')).toBe(true)
    expect(edges.map((edge) => edge.source.owner.kind).sort()).toEqual(['map', 'stamp'])
  })

  test('C08-G02-02 stampPlacementReferences 只保留 stamp-placement-source', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    maps['map-a'].layers[0]!.tiles[0]![0] = 0
    maps['map-a'].layers[0]!.sources[0]![0] = 0
    const batch = await indexedBatch(maps, [stampTemplate('tiles-a')])
    const edges = stampPlacementReferences(batch, 'c08-tree')
    expect(edges.every((edge) => edge.relation.kind === 'stamp-placement-source')).toBe(true)
  })

  test('C08-G02-03 TilesetRemovalProof 有引用时构造期拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId), { loadMap: async (id: string) => byId[id]! })
    const batch = await session.ensureMapReferencesIndexed()
    expect(() => TilesetRemovalProof.fromBatch(batch, session.getState(), 'tiles-a')).toThrow(
      /不能移除/,
    )
  })

  test('C08-G02-04 TilesetReplacementProof frameCount 非正整数拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId), { loadMap: async (id: string) => byId[id]! })
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets['tileset.a']!
    expect(() =>
      TilesetReplacementProof.fromBatch(batch, 'tiles-a', 0, {
        asset: 'tileset.a',
        previousRecord: record,
        definitions: [{ id: 'tiles-a', asset: 'tileset.a' }],
      }),
    ).toThrow('替换瓦片集必须含帧')
  })

  test('C08-G02-05 TilesetReplacementProof 共享定义列表缺当前 id 拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId), { loadMap: async (id: string) => byId[id]! })
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets['tileset.a']!
    expect(() =>
      TilesetReplacementProof.fromBatch(batch, 'tiles-a', 4, {
        asset: 'tileset.a',
        previousRecord: record,
        definitions: [{ id: 'other', asset: 'tileset.a' }],
      }),
    ).toThrow('共享瓦片集影响范围不含当前定义')
  })

  test('C08-G02-06 assertTilesetRemovalAllowed 缺 proof 实例拒绝', () => {
    const state = editorState({})
    expect(() =>
      assertTilesetRemovalAllowed(state, 'tiles-a', undefined, () => ({}) as MapReferenceEdgeBatch),
    ).toThrow('移除瓦片集前必须完成全项目引用扫描')
  })

  test('C08-G02-07 assertTilesetReplacementAllowed tilesetId 与 proof 不一致拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId), { loadMap: async (id: string) => byId[id]! })
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets['tileset.a']!
    const proof = TilesetReplacementProof.fromBatch(batch, 'tiles-a', 4, {
      asset: 'tileset.a',
      previousRecord: record,
      definitions: [{ id: 'tiles-a', asset: 'tileset.a' }],
    })
    expect(() =>
      assertTilesetReplacementAllowed(
        session.getState(),
        'other-id',
        'tileset.a',
        proof,
        (current) => session.getCurrentMapReferenceBatch(current),
      ),
    ).toThrow('替换瓦片集前必须完成全项目引用扫描')
  })

  test('C08-G02-08 StampDeletionProof 无 placement 时 referenceCount 为 0', async () => {
    const maps: Record<string, ProjectMap> = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-b'),
    }
    const batch = await indexedBatch(maps, [stampTemplate('tiles-a')])
    const proof = StampDeletionProof.fromBatch(batch, 'c08-tree')
    expect(proof.referenceCount).toBe(0)
    expect(stampPlacementReferences(batch, 'c08-tree')).toEqual([])
  })

  test('C08-G02-09 assertStampDeletionAllowed proof.stampId 不一致拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-a') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId, [stampTemplate('tiles-a')]), {
      loadMap: async (id: string) => byId[id]!,
    })
    const batch = await session.ensureMapReferencesIndexed()
    const proof = StampDeletionProof.fromBatch(batch, 'c08-tree')
    expect(() =>
      assertStampDeletionAllowed(session.getState(), 'other-stamp', proof, (current) =>
        session.getCurrentMapReferenceBatch(current),
      ),
    ).toThrow('删除组合前必须完成全项目引用扫描。')
  })

  test('C08-G02-10 TilesetRemovalProof 零引用时构造成功且 generation 对齐 batch', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, 'tiles-b') }
    const byId: Record<string, ProjectMap> = maps
    const session = new EditSession(editorState(byId), { loadMap: async (id: string) => byId[id]! })
    const batch = await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(batch, session.getState(), 'tiles-a')
    expect(proof.generation).toBe(batch.generation)
    expect(proof.tilesetId).toBe('tiles-a')
    expect(proof.definitionIds).toEqual(['tiles-a'])
  })
})
