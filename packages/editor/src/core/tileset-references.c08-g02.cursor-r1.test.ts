/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G02：tileset-references 证明与引用边（不抢 MapMode）。
 * 排重：tileset-references.test ED-3 异步扫描九例已证 batch 生命周期；本文件补 proof 构造、
 * assert*Allowed 失配文案与 stamp/tileset 边过滤的新轴。
 */
import type { ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
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

const TILESET_A = 'tiles-a'
const TILESET_ASSET = 'tileset.a'
const TILESET_PATH = 'assets/authored/tilesets/a.rle'

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

/** 合法 blank 工程态上叠加本例地图/瓦片集/组合，完整 typed，无双桥。 */
async function openC08RefSession(
  maps: Record<string, ProjectMap>,
  stamps: StampTemplate[] = [],
): Promise<{ session: EditSession; state: EditorState }> {
  const legal = await loadLegalProject(`c08-g02-${Object.keys(maps).sort().join('-') || 'empty'}`)
  const state: EditorState = {
    ...legal.state,
    maps,
    mapIndex: {
      version: 1,
      maps: Object.keys(maps).map((id) => ({
        id,
        name: id,
        path: `content/maps/${id}.json`,
      })),
    },
    tilesets: [
      ...(legal.state.tilesets ?? []).filter((entry) => entry.id !== TILESET_A),
      { id: TILESET_A, name: 'A', category: 'test', asset: TILESET_ASSET },
    ],
    stamps,
    assetCatalog: {
      ...legal.state.assetCatalog,
      assets: {
        ...legal.state.assetCatalog.assets,
        [TILESET_ASSET]: {
          kind: 'tileset',
          path: TILESET_PATH,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 2,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: {
      ...legal.state.assetBlobs,
      [TILESET_PATH]: new Uint8Array([1, 2]).buffer,
    },
  }
  const byId = maps
  const session = new EditSession(state, {
    loadMap: async (id: string) => {
      const map = byId[id]
      if (!map) throw new Error(`map missing: ${id}`)
      return map
    },
  })
  return { session, state: session.getState() }
}

async function indexedBatch(maps: Record<string, ProjectMap>, stamps: StampTemplate[] = []) {
  const { session } = await openC08RefSession(maps, stamps)
  return session.ensureMapReferencesIndexed()
}

/** 缺 proof 时 assert* 不得调用 currentBatch；触及即失败。 */
function unreachableBatch(): never {
  throw new Error('currentBatch must not be called when proof is missing')
}

describe('C08-G02 tileset-references 边与证明门', () => {
  test('C08-G02-01 tilesetUsageReferences 只保留 tileset-use 关系', async () => {
    const maps = {
      'map-a': buildBlankProjectMap(1, 1, TILESET_A),
      'map-b': buildBlankProjectMap(1, 1, 'tiles-b'),
    }
    const batch = await indexedBatch(maps, [stampTemplate(TILESET_A)])
    const edges = tilesetUsageReferences(batch, TILESET_A)
    expect(edges.every((edge) => edge.relation.kind === 'tileset-use')).toBe(true)
    expect(edges.map((edge) => edge.source.owner.kind).sort()).toEqual(['map', 'stamp'])
  })

  test('C08-G02-02 stampPlacementReferences 只保留 stamp-placement-source', async () => {
    const base = buildBlankProjectMap(1, 1, TILESET_A)
    const maps = {
      'map-a': {
        ...base,
        version: 4 as const,
        authoring: {
          version: 1 as const,
          stampPlacements: [
            {
              id: 'place-tree',
              sourceStampId: 'c08-tree',
              anchor: { row: 0, col: 0 },
              visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
              gridPoints: [],
            },
          ],
        },
      },
    }
    const batch = await indexedBatch(maps, [stampTemplate(TILESET_A)])
    const edges = stampPlacementReferences(batch, 'c08-tree')
    // 精确关系轴先于非空长度：旧 tileset-references.test:387 仅 toHaveLength(1)。
    expect(edges.map((edge) => edge.relation.kind)).toEqual(['stamp-placement-source'])
    expect(edges.map((edge) => edge.target)).toEqual([{ kind: 'stamp', id: 'c08-tree' }])
    expect(edges.length).toBe(1)
    expect(edges.every((edge) => edge.relation.kind === 'stamp-placement-source')).toBe(true)
    expect(stampPlacementReferences(batch, 'missing-stamp')).toEqual([])
  })

  test('C08-G02-03 TilesetRemovalProof 有引用时构造期拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, TILESET_A) }
    const { session } = await openC08RefSession(maps)
    const batch = await session.ensureMapReferencesIndexed()
    expect(() => TilesetRemovalProof.fromBatch(batch, session.getState(), TILESET_A)).toThrow(
      /不能移除/,
    )
  })

  test('C08-G02-04 TilesetReplacementProof frameCount 非正整数拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, TILESET_A) }
    const { session } = await openC08RefSession(maps)
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets[TILESET_ASSET]!
    expect(() =>
      TilesetReplacementProof.fromBatch(batch, TILESET_A, 0, {
        asset: TILESET_ASSET,
        previousRecord: record,
        definitions: [{ id: TILESET_A, asset: TILESET_ASSET }],
      }),
    ).toThrow('替换瓦片集必须含帧')
  })

  test('C08-G02-05 TilesetReplacementProof 共享定义列表缺当前 id 拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, TILESET_A) }
    const { session } = await openC08RefSession(maps)
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets[TILESET_ASSET]!
    expect(() =>
      TilesetReplacementProof.fromBatch(batch, TILESET_A, 4, {
        asset: TILESET_ASSET,
        previousRecord: record,
        definitions: [{ id: 'other', asset: TILESET_ASSET }],
      }),
    ).toThrow('共享瓦片集影响范围不含当前定义')
  })

  test('C08-G02-06 assertTilesetRemovalAllowed 缺 proof 实例拒绝', async () => {
    const { state } = await openC08RefSession({})
    expect(() =>
      assertTilesetRemovalAllowed(state, TILESET_A, undefined, unreachableBatch),
    ).toThrow('移除瓦片集前必须完成全项目引用扫描')
  })

  test('C08-G02-07 assertTilesetReplacementAllowed tilesetId 与 proof 不一致拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, TILESET_A) }
    const { session } = await openC08RefSession(maps)
    const batch = await session.ensureMapReferencesIndexed()
    const record = session.getState().assetCatalog.assets[TILESET_ASSET]!
    const proof = TilesetReplacementProof.fromBatch(batch, TILESET_A, 4, {
      asset: TILESET_ASSET,
      previousRecord: record,
      definitions: [{ id: TILESET_A, asset: TILESET_ASSET }],
    })
    expect(() =>
      assertTilesetReplacementAllowed(
        session.getState(),
        'other-id',
        TILESET_ASSET,
        proof,
        (current) => session.getCurrentMapReferenceBatch(current),
      ),
    ).toThrow('替换瓦片集前必须完成全项目引用扫描')
  })

  test('C08-G02-08 StampDeletionProof 无 placement 时 referenceCount 为 0', async () => {
    const maps: Record<string, ProjectMap> = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-b'),
    }
    const batch = await indexedBatch(maps, [stampTemplate(TILESET_A)])
    const proof = StampDeletionProof.fromBatch(batch, 'c08-tree')
    expect(proof.referenceCount).toBe(0)
    expect(stampPlacementReferences(batch, 'c08-tree')).toEqual([])
  })

  test('C08-G02-09 assertStampDeletionAllowed proof.stampId 不一致拒绝', async () => {
    const maps = { 'map-a': buildBlankProjectMap(1, 1, TILESET_A) }
    const { session } = await openC08RefSession(maps, [stampTemplate(TILESET_A)])
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
    const { session } = await openC08RefSession(maps)
    const batch = await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(batch, session.getState(), TILESET_A)
    expect(proof.generation).toBe(batch.generation)
    expect(proof.tilesetId).toBe(TILESET_A)
    expect(proof.definitionIds).toEqual([TILESET_A])
  })
})
