/**
 * TEST-GLM-STATE-COMMANDS-1 C04：tileset-commands 残差。
 * 去重：tileset-commands.residual.test.ts 五例（重复 id/记录不同/共享资产 createdAsset=false/
 * name 空白/category 空串）、tileset-lifecycle.test.ts 七例（原子入库 undo/二进制长度与路径
 * 碰撞/改名不改 catalog label/共享删除保留 blob/删除许可绑定/缩帧替换/redo 越界 fail-closed）、
 * tileset-references.test.ts 九例——本文件只补冻结池内：AddTileset 缺 AssetId 与缺席表追加、
 * RemoveTileset 缺席 id/缺席表/共享分支后 invert/persistedBytes 缺省、UpdateTilesetMetadata
 * 缺席 id/缺席表/未 apply invert、ReplaceTilesetAsset 缺席 asset 原引用与 kind/路径/定义不一致
 * 恰抛、换路径成功替换的 blob 精确差值与 invert 恢复（previousBytes 有/无）。
 * bytes/sha 取真实 seed-assets 编码产物；proof 走 TilesetRemoval/ReplacementProof.fromBatch。
 */

import type { TilesetDef } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  expectExactError,
  expectInputsUnchanged,
  tilesetRecord,
  tilesetState,
} from './__tests__/glm-state-commands-c.js'
import { sha256Hex } from './binary-signature.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { buildSeedAssets } from './seed-assets.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from './tileset-commands.js'
import { TilesetRemovalProof, TilesetReplacementProof } from './tileset-references.js'

const currentBatch = (state: EditorState) => new EditSession(state).getMapReferenceBatch()

const forest = (id = 'forest', asset = 'tileset.forest'): TilesetDef => ({
  id,
  name: '森林',
  category: 'outdoor',
  asset,
})

describe('C04 tileset-commands 残差', () => {
  test('AddTileset：缺 AssetId 恰抛；tilesets 缺席 → 追加成功 + invert 清空', async () => {
    const seedAssets = await buildSeedAssets()
    const bytes = seedAssets.tilesetRle.slice(0)
    const meta = tilesetRecord('assets/authored/tilesets/forest.rle', bytes, await sha256Hex(bytes))
    expectExactError(
      () => new AddTilesetCommand({ ...forest(), asset: '' }, meta, bytes).apply(tilesetState()),
      '瓦片集定义缺 AssetId',
    )
    const bare = tilesetState()
    delete (bare as { tilesets?: unknown }).tilesets
    const cmd = new AddTilesetCommand(forest(), meta, bytes)
    const next = cmd.apply(bare)
    expect(next.tilesets).toEqual([forest()])
    expect(next.assetCatalog.assets['tileset.forest']).toEqual(meta)
    const undone = cmd.invert(next)
    expect(undone.tilesets).toEqual([])
    expect(undone.assetCatalog.assets['tileset.forest']).toBeUndefined()
    expectInputsUnchanged(() => cmd.apply(bare), [bare, meta])
  })

  test('RemoveTileset：缺席 id 与缺席表 apply 原引用（守卫前短路，无需触达 proof）', () => {
    const empty = tilesetState()
    const bare = tilesetState()
    delete (bare as { tilesets?: unknown }).tilesets
    const missing = new RemoveTilesetCommand('gone', undefined as never, currentBatch, undefined)
    expect(missing.apply(empty)).toBe(empty)
    expect(missing.apply(bare)).toBe(bare)
  })

  test('RemoveTileset：共享分支后 invert 保 catalog/blob（persistedBytes 缺省不覆盖）', async () => {
    const seedAssets = await buildSeedAssets()
    const bytes = seedAssets.tilesetRle.slice(0)
    const meta = tilesetRecord('assets/authored/tilesets/shared.rle', bytes, await sha256Hex(bytes))
    const before = tilesetState({
      definitions: [forest('forest', 'tileset.shared'), forest('forest-night', 'tileset.shared')],
      records: { 'tileset.shared': meta },
      blobs: { [meta.path]: bytes },
    })
    const proof = TilesetRemovalProof.fromBatch(currentBatch(before), before, 'forest')
    const cmd = new RemoveTilesetCommand('forest', proof, currentBatch)
    const removed = cmd.apply(before)
    expect(removed.tilesets!.map(({ id }) => id)).toEqual(['forest-night'])
    expect(removed.assetCatalog.assets['tileset.shared']).toEqual(meta)
    expect(removed.assetBlobs[meta.path]).toBe(bytes)
    const undone = cmd.invert(removed)
    expect(undone.tilesets!.map(({ id }) => id)).toEqual(['forest', 'forest-night'])
    expect(undone.assetCatalog.assets['tileset.shared']).toEqual(meta)
    expect(new Uint8Array(undone.assetBlobs[meta.path]!)).toEqual(new Uint8Array(bytes))
  })

  test('UpdateTilesetMetadata：缺席 id/缺席表 apply 原引用；未 apply invert 原引用；旁 tileset 同引用', async () => {
    const seedAssets = await buildSeedAssets()
    const bytes = seedAssets.tilesetRle.slice(0)
    const before = tilesetState({
      definitions: [forest('forest'), forest('plains')],
      records: {
        'tileset.forest': tilesetRecord('a/f.rle', bytes, await sha256Hex(bytes)),
        'tileset.plains': tilesetRecord('a/p.rle', bytes, await sha256Hex(bytes)),
      },
    })
    const missing = new UpdateTilesetMetadataCommand('gone', { name: 'x' })
    expect(missing.apply(before)).toBe(before)
    expect(missing.invert(before)).toBe(before)
    const bare = tilesetState()
    delete (bare as { tilesets?: unknown }).tilesets
    expect(new UpdateTilesetMetadataCommand('forest', { name: 'x' }).apply(bare)).toBe(bare)
    const cmd = new UpdateTilesetMetadataCommand('forest', { name: '夜林' })
    const next = cmd.apply(before)
    expect(next.tilesets!.find(({ id }) => id === 'forest')!.name).toBe('夜林')
    const plains = next.tilesets!.find(({ id }) => id === 'plains')
    expect(plains).toBe(before.tilesets!.find(({ id }) => id === 'plains'))
    expect(cmd.invert(next).tilesets!.find(({ id }) => id === 'forest')!.name).toBe('森林')
  })

  test('ReplaceTilesetAsset：asset 不在 catalog → 原引用', async () => {
    const seedAssets = await buildSeedAssets()
    const bytes = seedAssets.tilesetRle.slice(0)
    const before = tilesetState({
      definitions: [forest()],
      records: {
        'tileset.forest': tilesetRecord('a/f.rle', bytes, await sha256Hex(bytes)),
      },
    })
    const nextRecord = tilesetRecord('a/g.rle', bytes, 'a'.repeat(64))
    const proof = TilesetReplacementProof.fromBatch(currentBatch(before), 'forest', 1, {
      asset: 'tileset.gone',
      previousRecord: nextRecord,
      definitions: [{ id: 'forest', asset: 'tileset.gone' }],
    })
    const cmd = new ReplaceTilesetAssetCommand(
      'forest',
      'tileset.gone',
      nextRecord,
      bytes,
      bytes,
      proof,
      currentBatch,
    )
    expect(cmd.apply(before)).toBe(before)
  })

  test('ReplaceTilesetAsset：kind 错误/路径被占/定义不一致 各自整串恰抛', async () => {
    const seedAssets = await buildSeedAssets()
    const bytes = seedAssets.tilesetRle.slice(0)
    const forestMeta = tilesetRecord('a/f.rle', bytes, await sha256Hex(bytes))
    const before = tilesetState({
      definitions: [forest()],
      records: {
        'tileset.forest': forestMeta,
        'sprite.lone': {
          ...tilesetRecord('a/lone.rle', bytes, await sha256Hex(bytes)),
          kind: 'sprite',
        },
      },
    })
    const nextRecord = tilesetRecord('a/g.rle', bytes, 'a'.repeat(64))
    const makeProof = () =>
      TilesetReplacementProof.fromBatch(currentBatch(before), 'forest', 1, {
        asset: 'tileset.forest',
        previousRecord: forestMeta,
        definitions: [{ id: 'forest', asset: 'tileset.forest' }],
      })
    const wrongKind = tilesetState({
      definitions: [forest()],
      records: { 'tileset.forest': { ...forestMeta, kind: 'sprite' } },
    })
    expectExactError(
      () =>
        new ReplaceTilesetAssetCommand(
          'forest',
          'tileset.forest',
          nextRecord,
          bytes,
          bytes,
          makeProof(),
          currentBatch,
        ).apply(wrongKind),
      '瓦片集替换只能更新 kind=tileset 的资源',
    )
    const pathOwner = tilesetState({
      definitions: [forest()],
      records: {
        'tileset.forest': forestMeta,
        'tileset.other': tilesetRecord('a/g.rle', bytes, await sha256Hex(bytes)),
      },
    })
    expectExactError(
      () =>
        new ReplaceTilesetAssetCommand(
          'forest',
          'tileset.forest',
          nextRecord,
          bytes,
          bytes,
          makeProof(),
          currentBatch,
        ).apply(pathOwner),
      '瓦片集替换路径已由 tileset.other 登记',
    )
    expectExactError(
      () =>
        new ReplaceTilesetAssetCommand(
          'missing-def',
          'tileset.forest',
          nextRecord,
          bytes,
          bytes,
          makeProof(),
          currentBatch,
        ).apply(before),
      '瓦片集定义与待替换 AssetId 不一致',
    )
  })

  test('ReplaceTilesetAsset：换新路径成功 → 旧 blob 删新 blob 写；invert 完整恢复（真实字节）', async () => {
    const seedAssets = await buildSeedAssets()
    const oldBytes = seedAssets.tilesetRle.slice(0)
    const nextBytes = seedAssets.spriteRle.slice(0)
    const forestMeta = tilesetRecord('a/f.rle', oldBytes, await sha256Hex(oldBytes))
    const before = tilesetState({
      definitions: [forest()],
      records: { 'tileset.forest': forestMeta },
      blobs: { 'a/f.rle': oldBytes },
    })
    const nextRecord = tilesetRecord('a/g.rle', nextBytes, await sha256Hex(nextBytes))
    const proof = TilesetReplacementProof.fromBatch(currentBatch(before), 'forest', 1, {
      asset: 'tileset.forest',
      previousRecord: forestMeta,
      definitions: [{ id: 'forest', asset: 'tileset.forest' }],
    })
    const snap = deepSnapshot([before, forestMeta])
    const cmd = new ReplaceTilesetAssetCommand(
      'forest',
      'tileset.forest',
      nextRecord,
      nextBytes,
      oldBytes.slice(0),
      proof,
      currentBatch,
    )
    const next = cmd.apply(before)
    expect(next.assetCatalog.assets['tileset.forest']).toEqual(nextRecord)
    expect(new Uint8Array(next.assetBlobs['a/g.rle']!)).toEqual(new Uint8Array(nextBytes))
    expect(next.assetBlobs['a/f.rle']).toBeUndefined()
    const undone = cmd.invert(next)
    expect(undone.assetCatalog).toBe(before.assetCatalog)
    expect(new Uint8Array(undone.assetBlobs['a/f.rle']!)).toEqual(new Uint8Array(oldBytes))
    expect(undone.assetBlobs['a/g.rle']).toBeUndefined()
    expect([before, forestMeta]).toEqual(snap)
  })
})
