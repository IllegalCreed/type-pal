import type { AssetRecordV1, SpriteDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  COMMAND_SPRITE_ASSET,
  COMMAND_SPRITE_ID,
  loadSpriteCommandFixture,
  makeSpriteAssetRevision,
} from '../__tests__/world-sprite-command-fixture.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { UpsertAssetCommand } from './asset-commands.js'
import { sha256Hex } from './binary-signature.js'
import { EditSession } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { AddSpriteCommand, DeleteUnusedSpriteAssetCommand } from './sprite-asset-commands.js'
import { RemoveSpriteDefinitionCommand } from './sprite-commands.js'

function sprite(id: string, asset: string): SpriteDef {
  return { id, asset, label: id, layout: { kind: 'static' } }
}

test('新精灵登记定义、版本和待写字节并一起撤销；追加共享用途保持原资产', async () => {
  const { session, record, reader } = await loadSpriteCommandFixture('sprite-assets-import')
  const baseline = session.getState()
  const originalBytes = await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite')
  const newAsset = 'sprite.authored.new-object'
  const fresh = await makeSpriteAssetRevision(newAsset, 4, 2)
  const command = new AddSpriteCommand(sprite('new-object', newAsset), fresh.record, fresh.bytes)
  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().sprites).toEqual([...baseline.sprites, sprite('new-object', newAsset)])
  expect(session.getState().assetCatalog.assets[newAsset]).toEqual(fresh.record)
  expect(await sha256Hex(await reader.readBytes(newAsset, 'sprite'))).toBe(fresh.record.sha256)
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState()).toEqual(baseline)
  expect(session.redo()).toBe(true)
  expect(await sha256Hex(await reader.readBytes(newAsset, 'sprite'))).toBe(fresh.record.sha256)

  const staged = session.getState()
  const second = new AddSpriteCommand(
    sprite('second-usage', COMMAND_SPRITE_ASSET),
    record,
    originalBytes,
  )
  expect(session.dispatch(second)).toBe(true)
  expect(session.getState().assetCatalog).toBe(staged.assetCatalog)
  expect(session.getState().assetBlobs).toBe(staged.assetBlobs)
  expect(session.undo()).toBe(true)
  expect(session.getState()).toEqual(staged)
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    record.sha256,
  )
})

test('导入拒绝冲突的用途、资源与路径，并按真实记录检查输入', async () => {
  const { session, record, reader } = await loadSpriteCommandFixture(
    'sprite-assets-import-rejection',
  )
  const before = session.getState()
  const bytes = await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite')
  const make = (definition: SpriteDef, next = record, binary = bytes) =>
    new AddSpriteCommand(definition, next, binary)
  const intended = sprite('new-usage', 'sprite.authored.new-source')
  const invalid = [
    [make(sprite(COMMAND_SPRITE_ID, COMMAND_SPRITE_ASSET)), '精灵定义 id 已存在'],
    [make(sprite('new-usage', '')), '精灵定义缺 AssetId'],
    [
      make(sprite('new-usage', COMMAND_SPRITE_ASSET), { ...record, label: '冲突记录' }),
      '精灵 AssetId 已存在且记录不同',
    ],
    [make(intended), '精灵资源路径已由'],
    [make(intended, { ...record, kind: 'tileset' }), 'kind 必须是 sprite'],
    [make(intended, { ...record, mediaType: 'image/png' }), 'mediaType 必须是'],
    [make(intended, { ...record, bytes: record.bytes + 1 }), 'bytes 与二进制长度不一致'],
    [make(intended, { ...record, sha256: 'G'.repeat(64) }), 'sha256 非法'],
    [make(intended, record, new ArrayBuffer(bytes.byteLength)), '必须是 canonical gzip'],
  ] as const
  for (const [candidate, message] of invalid) {
    expect(() => session.dispatch(candidate)).toThrow(message)
    expect(session.getState()).toBe(before)
  }
  expect(session.getHistoryVersion()).toBe(0)
})

test('删除未使用资源对缺失、已有用途、种类错误分别按合同处理', async () => {
  const { session, reader } = await loadSpriteCommandFixture('sprite-assets-delete-guards')
  const remove = (asset: string) =>
    new DeleteUnusedSpriteAssetCommand(asset, collectCurrentProjectReferenceIndex)
  const current = session.getState()
  const orphan = remove('sprite.unregistered')
  expect(orphan.invert(current)).toBe(current)
  expect(session.dispatch(orphan)).toBe(false)
  expect(() => session.dispatch(remove(COMMAND_SPRITE_ASSET))).toThrow('仍被定义引用')
  expect(session.getHistoryVersion()).toBe(0)

  const tileset = current.tilesets?.find((entry) => entry.id === 'starter')?.asset
  if (!tileset) throw new Error('空白工程缺少起始地形资源')
  const actualRecord = reader.record(tileset, 'tileset')
  const bytes = await reader.readBytes(tileset, 'tileset')
  const asset = 'tileset.authored.not-a-sprite'
  const record: AssetRecordV1 = {
    ...actualRecord,
    path: 'assets/authored/tilesets/not-a-sprite.rle',
    origin: { kind: 'authored' },
  }
  expect(session.dispatch(new UpsertAssetCommand(asset, record, bytes))).toBe(true)
  const withTileset = session.getState()
  assertProjectSaveValid(withTileset)
  expect(() => session.dispatch(remove(asset))).toThrow('不是 sprite')
  expect(session.getState()).toBe(withTileset)
  expect(session.getHistoryVersion()).toBe(1)
})

test('磁盘和待写的未使用资源均可删除、撤销和重做，恢复的字节与记录匹配', async () => {
  const diskAsset = 'sprite.authored.on-disk'
  const project = await loadWorldSpriteProject('sprite-assets-delete-disk', [
    { asset: diskAsset, label: '未定义帧源', frameCount: 3, definitions: [] },
  ])
  const session = new EditSession(project.state)
  const record = project.state.assetCatalog.assets[diskAsset]!
  const bytes = await project.source.readBytes(record.path)
  const deletion = new DeleteUnusedSpriteAssetCommand(
    diskAsset,
    collectCurrentProjectReferenceIndex,
    bytes,
  )
  expect(session.dispatch(deletion)).toBe(true)
  expect(session.getState().assetCatalog.assets[diskAsset]).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog.assets[diskAsset]).toEqual(record)
  const restored = session.getState().assetBlobs[record.path]!
  expect(restored).not.toBe(bytes)
  expect(await sha256Hex(restored)).toBe(record.sha256)
  expect(session.redo()).toBe(true)
  expect(session.getState().assetBlobs[record.path]).toBeUndefined()

  const pendingAsset = 'sprite.authored.pending-delete'
  const fresh = await makeSpriteAssetRevision(pendingAsset, 2, 1)
  expect(
    session.dispatch(
      new AddSpriteCommand(sprite('temporary', pendingAsset), fresh.record, fresh.bytes),
    ),
  ).toBe(true)
  expect(
    session.dispatch(
      new RemoveSpriteDefinitionCommand('temporary', collectCurrentProjectReferenceIndex),
    ),
  ).toBe(true)
  const pending = session.getState()
  expect(
    session.dispatch(
      new DeleteUnusedSpriteAssetCommand(pendingAsset, collectCurrentProjectReferenceIndex),
    ),
  ).toBe(true)
  expect(session.getState().assetBlobs[fresh.record.path]).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog).toBe(pending.assetCatalog)
  expect(session.getState().assetBlobs[fresh.record.path]).toBe(
    pending.assetBlobs[fresh.record.path],
  )
  expect(await sha256Hex(session.getState().assetBlobs[fresh.record.path]!)).toBe(
    fresh.record.sha256,
  )
  assertProjectSaveValid(session.getState())
})
