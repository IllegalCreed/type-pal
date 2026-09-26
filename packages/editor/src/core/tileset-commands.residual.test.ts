/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：瓦片集命令残项。
 */
import type { AssetRecordV1, TilesetDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { AddTilesetCommand, UpdateTilesetMetadataCommand } from './tileset-commands.js'

function expectRejected(
  command: { apply(state: EditorState): EditorState },
  input: EditorState,
  pattern: RegExp,
): void {
  const snapshot = structuredClone(input)
  expect(() => command.apply(input)).toThrow(pattern)
  expect(input).toEqual(snapshot)
}

function dummyRecord(): AssetRecordV1 {
  return {
    kind: 'tileset',
    path: 'assets/generated/tilesets/dummy.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: 0,
    sha256: 'a'.repeat(64),
    origin: { kind: 'generated' },
  }
}

describe('瓦片集命令残项', () => {
  test('AddTileset 重复定义 id starter → 瓦片集定义 id 已存在', async () => {
    const { state } = await loadBoundaryProject('tileset-residual-dup')
    const def: TilesetDef = { id: 'starter', name: '重复', category: 'outdoor', asset: 'tileset.x' }
    expectRejected(
      new AddTilesetCommand(def, dummyRecord(), new ArrayBuffer(0)),
      state,
      /瓦片集定义 id 已存在/,
    )
  })

  test('AddTileset 同 AssetId 但记录不同 → 瓦片集 AssetId 已存在且记录不同', async () => {
    const { source, state } = await loadBoundaryProject('tileset-residual-record')
    const starter = state.tilesets!.find((tileset) => tileset.id === 'starter')!
    const record = structuredClone(state.assetCatalog.assets[starter.asset]!)
    const bytes = await source.readBytes(record.path)
    record.path = 'assets/generated/tilesets/other.rle'
    record.label = '不同记录'
    const def: TilesetDef = {
      id: 'forest',
      name: '森林',
      category: 'outdoor',
      asset: starter.asset,
    }
    expectRejected(
      new AddTilesetCommand(def, record, bytes),
      state,
      /瓦片集 AssetId 已存在且记录不同/,
    )
  })

  test('AddTileset 新定义共享 starter 资产：createdAsset=false，撤销不删共享资源', async () => {
    const { source, state: loaded } = await loadBoundaryProject('tileset-residual-share')
    const starter = loaded.tilesets!.find((tileset) => tileset.id === 'starter')!
    const record = structuredClone(loaded.assetCatalog.assets[starter.asset]!)
    const sharedPath = record.path
    const diskBytes = await source.readBytes(sharedPath)
    expect(diskBytes.byteLength).toBeGreaterThan(0)
    const pendingBytes = diskBytes.slice(0)
    const state: EditorState = {
      ...loaded,
      assetBlobs: { ...loaded.assetBlobs, [sharedPath]: pendingBytes },
    }
    const expectedStarter = structuredClone(starter)
    const expectedRecord = structuredClone(record)
    const expectedBlob = pendingBytes.slice(0)
    const expectedCatalog = structuredClone(state.assetCatalog)
    const expectedBlobs = Object.fromEntries(
      Object.entries(state.assetBlobs).map(([path, blob]) => [path, blob.slice(0)]),
    )
    const session = new EditSession(state)
    const neighborActor = state.actors[0]
    const def: TilesetDef = {
      id: 'starter-alias',
      name: '起始地形别名',
      category: 'outdoor',
      asset: starter.asset,
    }
    const expectedAlias = structuredClone(def)
    const command = new AddTilesetCommand(def, record, pendingBytes)
    def.name = 'mutated-after-construct'
    record.path = 'assets/generated/tilesets/mutated.rle'
    expect(session.dispatch(command)).toBe(true)
    const after = session.getState()
    expect(after.tilesets?.find((tileset) => tileset.id === 'starter')).toEqual(expectedStarter)
    expect(after.tilesets?.find((tileset) => tileset.id === 'starter-alias')).toEqual(expectedAlias)
    expect(after.tilesets?.find((tileset) => tileset.id === 'starter-alias')?.asset).toBe(
      starter.asset,
    )
    expect(after.assetCatalog).toEqual(expectedCatalog)
    expect(after.assetCatalog.assets[starter.asset]).toEqual(expectedRecord)
    expect(after.assetBlobs[sharedPath]).toEqual(expectedBlob)
    expect(after.actors[0]).toBe(neighborActor)

    expect(session.undo()).toBe(true)
    const undone = session.getState()
    expect(undone.tilesets?.some((tileset) => tileset.id === 'starter-alias')).toBe(false)
    expect(undone.tilesets?.find((tileset) => tileset.id === 'starter')).toEqual(expectedStarter)
    expect(undone.assetCatalog).toEqual(expectedCatalog)
    expect(undone.assetCatalog.assets[starter.asset]).toEqual(expectedRecord)
    expect(undone.assetBlobs[sharedPath]).toEqual(expectedBlob)
    expect(undone.assetBlobs).toEqual(expectedBlobs)
    expect(session.redo()).toBe(true)
    const redone = session.getState()
    expect(redone.tilesets?.find((tileset) => tileset.id === 'starter-alias')).toEqual(
      expectedAlias,
    )
    expect(redone.assetCatalog).toEqual(expectedCatalog)
    expect(redone.assetCatalog.assets[starter.asset]).toEqual(expectedRecord)
    expect(redone.assetBlobs[sharedPath]).toEqual(expectedBlob)
  })

  test('UpdateTilesetMetadata name 空白 → 瓦片集名称不能为空', async () => {
    const { state } = await loadBoundaryProject('tileset-residual-name')
    expectRejected(
      new UpdateTilesetMetadataCommand('starter', { name: '   ' }),
      state,
      /瓦片集名称不能为空/,
    )
  })

  test('UpdateTilesetMetadata category 空串 → 瓦片集分类不能为空', async () => {
    const { state } = await loadBoundaryProject('tileset-residual-category')
    expectRejected(
      new UpdateTilesetMetadataCommand('starter', { category: '' }),
      state,
      /瓦片集分类不能为空/,
    )
  })
})
