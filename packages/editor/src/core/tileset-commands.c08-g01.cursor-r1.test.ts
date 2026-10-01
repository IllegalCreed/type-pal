/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G01：tileset-commands 会话轴（合法 blank + 真实字节）。
 * 排重：residual / glm-boundaries / tileset-lifecycle / tileset-references 已证 Add 重复 id、
 * 共享资产 invert、Replace 路径/kind、Update 空白名、Remove 缺席 id 等 matcher 不重领。
 */
import type { TilesetDef } from '@type-pal/content'
import { quantizeToRleFrame } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  appendAuthoredTileset,
  C08_TILESET,
  C08_TILESET_ASSET,
  openC08Legal,
  openC08Session,
  solidRgba,
  tilesetRecordFromFrames,
} from '../__tests__/cursor-asset-r1/c08-fixtures.js'
import type { EditSession } from './edit-session.js'
import { buildSeedAssets } from './seed-assets.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from './tileset-commands.js'
import { TilesetRemovalProof, TilesetReplacementProof } from './tileset-references.js'

function starter(state: ReturnType<EditSession['getState']>) {
  const def = state.tilesets?.find((entry) => entry.id === C08_TILESET)
  if (!def) throw new Error('缺 starter')
  return def
}

describe('C08-G01 tileset-commands 会话补丁与资源身份', () => {
  test('C08-G01-01 UpdateTilesetMetadata 只改分类：name 与 asset 不变', async () => {
    const { session } = await openC08Session('c08-g01-01')
    const before = starter(session.getState())
    session.dispatch(new UpdateTilesetMetadataCommand(C08_TILESET, { category: 'interior' }))
    const after = starter(session.getState())
    expect(after).toEqual({ ...before, category: 'interior' })
    expect(after.asset).toBe(C08_TILESET_ASSET)
  })

  test('C08-G01-02 UpdateTilesetMetadata 只改名称：category 保留', async () => {
    const { session } = await openC08Session('c08-g01-02')
    const category = starter(session.getState()).category
    session.dispatch(new UpdateTilesetMetadataCommand(C08_TILESET, { name: '重命名地形' }))
    expect(starter(session.getState()).name).toBe('重命名地形')
    expect(starter(session.getState()).category).toBe(category)
  })

  test('C08-G01-03 UpdateTilesetMetadata undo 精确还原 name+category', async () => {
    const { session } = await openC08Session('c08-g01-03')
    const snapshot = structuredClone(starter(session.getState()))
    session.dispatch(new UpdateTilesetMetadataCommand(C08_TILESET, { name: 'A', category: 'z' }))
    expect(session.undo()).toBe(true)
    expect(starter(session.getState())).toEqual(snapshot)
  })

  test('C08-G01-04 AddTileset 新路径入库后 catalog 与 assetBlobs 同步登记', async () => {
    const { session } = await openC08Session('c08-g01-04')
    const def: TilesetDef = {
      id: 'c08-forest',
      name: '森林',
      category: 'outdoor',
      asset: 'tileset.authored.c08forest',
    }
    const packed = await appendAuthoredTileset(session, def, 2)
    const state = session.getState()
    expect(state.tilesets?.some((entry) => entry.id === 'c08-forest')).toBe(true)
    expect(state.assetCatalog.assets[def.asset]?.path).toBe(packed.path)
    expect(state.assetBlobs[packed.path]?.byteLength).toBe(packed.bytes.byteLength)
    expect(new Uint8Array(state.assetBlobs[packed.path]!)).toEqual(new Uint8Array(packed.bytes))
  })

  test('C08-G01-05 AddTileset 路径已被其它 AssetId 占用时整串拒绝', async () => {
    const legal = await openC08Legal('c08-g01-05')
    const state = legal.state
    const starterDef = state.tilesets?.[0]!
    const record = structuredClone(state.assetCatalog.assets[starterDef.asset]!)
    const bytes = await legal.source.readBytes(record.path)
    const def: TilesetDef = {
      id: 'c08-dup-path',
      name: '路径冲突',
      category: 'outdoor',
      asset: 'tileset.authored.c08dup',
    }
    expect(() => new AddTilesetCommand(def, record, bytes).apply(state)).toThrow(/资源路径已由/)
  })

  test('C08-G01-06 AddTileset 缺 AssetId 字段精确报错', async () => {
    const legal = await openC08Legal('c08-g01-06')
    const packed = await tilesetRecordFromFrames('assets/authored/tilesets/x.rle', [])
    const def = {
      id: 'c08-no-asset',
      name: '无资产',
      category: 'outdoor',
      asset: '',
    } as TilesetDef
    expect(() =>
      new AddTilesetCommand(def, packed.record, packed.bytes).apply(legal.state),
    ).toThrow('瓦片集定义缺 AssetId')
  })

  test('C08-G01-07 共享 AssetId 追加定义后 Remove 单定义：catalog 仍保留共享资源', async () => {
    const { session, legal } = await openC08Session('c08-g01-07')
    const starterDef = starter(session.getState())
    const alias: TilesetDef = {
      id: 'c08-alias',
      name: '别名',
      category: starterDef.category,
      asset: starterDef.asset,
    }
    session.dispatch(
      new AddTilesetCommand(
        alias,
        structuredClone(session.getState().assetCatalog.assets[starterDef.asset]!),
        (await legal.source.readBytes(
          session.getState().assetCatalog.assets[starterDef.asset]!.path,
        )) as ArrayBuffer,
      ),
    )
    await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(
      session.getMapReferenceBatch(),
      session.getState(),
      'c08-alias',
    )
    session.dispatch(
      new RemoveTilesetCommand('c08-alias', proof, (current) =>
        session.getCurrentMapReferenceBatch(current),
      ),
    )
    const after = session.getState()
    expect(after.tilesets?.some((entry) => entry.id === 'c08-alias')).toBe(false)
    expect(after.assetCatalog.assets[starterDef.asset]).toBeDefined()
  })

  test('C08-G01-08 ReplaceTilesetAsset 追加独立 tileset 后替换 bytes：undo 恢复 sha', async () => {
    const { session } = await openC08Session('c08-g01-08')
    const extra: TilesetDef = {
      id: 'c08-replace-me',
      name: '可替换',
      category: 'outdoor',
      asset: 'tileset.authored.c08replace',
    }
    const packed = await appendAuthoredTileset(session, extra, 4)
    const oldRecord = structuredClone(session.getState().assetCatalog.assets[extra.asset]!)
    const oldBytes = session.getState().assetBlobs[packed.path]!.slice(0)
    const seedAssets = await buildSeedAssets()
    const frames = [
      quantizeToRleFrame(solidRgba(32, 16, [200, 20, 20, 255]), 32, 16, seedAssets.palette),
    ]
    const nextPacked = await tilesetRecordFromFrames(packed.path, frames)
    await session.ensureMapReferencesIndexed()
    const proof = TilesetReplacementProof.fromBatch(
      session.getMapReferenceBatch(),
      'c08-replace-me',
      1,
      {
        asset: extra.asset,
        previousRecord: oldRecord,
        definitions: [{ id: 'c08-replace-me', asset: extra.asset }],
      },
    )
    session.dispatch(
      new ReplaceTilesetAssetCommand(
        'c08-replace-me',
        extra.asset,
        nextPacked.record,
        nextPacked.bytes,
        oldBytes,
        proof,
        (current) => session.getCurrentMapReferenceBatch(current),
      ),
    )
    expect(session.getState().assetCatalog.assets[extra.asset]?.sha256).toBe(nextPacked.sha256)
    session.undo()
    expect(session.getState().assetCatalog.assets[extra.asset]?.sha256).toBe(oldRecord.sha256)
  })

  test('C08-G01-09 UpdateTilesetMetadata 连续 dispatch：undo 逐步还原', async () => {
    const { session } = await openC08Session('c08-g01-09')
    const snapshot = structuredClone(starter(session.getState()))
    session.dispatch(new UpdateTilesetMetadataCommand(C08_TILESET, { name: '第一次' }))
    session.dispatch(new UpdateTilesetMetadataCommand(C08_TILESET, { name: '第二次' }))
    expect(starter(session.getState()).name).toBe('第二次')
    expect(session.undo()).toBe(true)
    expect(starter(session.getState()).name).toBe('第一次')
    expect(session.undo()).toBe(true)
    expect(starter(session.getState())).toEqual(snapshot)
  })

  test('C08-G01-10 RemoveTileset 缺席 id apply 为同一引用', async () => {
    const { session } = await openC08Session('c08-g01-10')
    await appendAuthoredTileset(session, {
      id: 'c08-unused',
      name: '未引用',
      category: 'outdoor',
      asset: 'tileset.authored.c08unused',
    })
    const before = session.getState()
    await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(
      session.getMapReferenceBatch(),
      before,
      'c08-unused',
    )
    const next = new RemoveTilesetCommand('missing-tileset', proof, (current) =>
      session.getCurrentMapReferenceBatch(current),
    ).apply(before)
    expect(next).toBe(before)
  })
})
