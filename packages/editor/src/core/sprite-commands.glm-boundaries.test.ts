/**
 * TEST-GLM-STATE-COMMANDS-1 C02：sprite-commands 残差。
 * 去重：sprite-commands.residual.test.ts 五例（非法动作/零帧证明/poses 删除无索引/
 * 未用资产被引用/缺 AssetId）、commands.test.ts「UpdateSprite layout/poses」「AddSprite 原子加入」、
 * sprite-reference-commands.test.ts、WorldSpriteLibrary/SpriteActionEditorDialog UI 例——
 * 本文件只补冻结池内：UpdateSprite 三向缺席 no-op 与仅 label 补丁、证明 sha 过期、
 * AddSprite 重复 id/路径被占/共享物理资产第二语义、AddSpriteDefinition 真实帧数证明与越界、
 * RemoveSpriteDefinition/ReplaceSpriteAsset 三向 no-op 与守卫、未用资产 kind 错误恰抛。
 * 字节/记录一律取空白项目真实编码产物；实际帧数来自 decodeWorldSpriteAssetBytes 解码。
 */

import { spriteDefinitionFrameDemand } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  deepSnapshot,
  expectExactError,
  expectInputsUnchanged,
  spriteRecord,
  tilesetRecord,
  tilesetState,
} from './__tests__/glm-state-commands-c.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { buildSeedAssets } from './seed-assets.js'
import {
  AddSpriteCommand,
  AddSpriteDefinitionCommand,
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  ReplaceSpriteAssetCommand,
  UpdateSpriteCommand,
} from './sprite-commands.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

describe('C02 sprite-commands 残差', () => {
  test('UpdateSprite：缺席 id/未 apply invert/undo 时缺席 三向原引用', async () => {
    const { state } = await loadBoundaryProject('sprite-glm-update-noop')
    const cmd = new UpdateSpriteCommand('gone', { label: 'x' })
    expect(cmd.apply(state)).toBe(state)
    expect(cmd.invert(state)).toBe(state)
    const applied = new UpdateSpriteCommand('hero', { label: 'x' }).apply(state)
    const vanished: typeof state = { ...applied, sprites: [] }
    expect(new UpdateSpriteCommand('hero', { label: 'x' }).invert(vanished)).toBe(vanished)
    expectInputsUnchanged(() => cmd.apply(state), [state])
  })

  test('UpdateSprite：仅 label 补丁无需解码证明，undo 精确还原', async () => {
    const { state } = await loadBoundaryProject('sprite-glm-label')
    const cmd = new UpdateSpriteCommand('hero', { label: '新标签' })
    const next = cmd.apply(state)
    expect(next.sprites[0]!.label).toBe('新标签')
    expect(cmd.invert(next).sprites[0]!.label).toBe('占位主角')
  })

  test('UpdateSprite：layout 补丁证明 sha 过期恰抛；合法 static 布局经真实帧数放行', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-proof')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
    expectExactError(
      () =>
        new UpdateSpriteCommand(
          'hero',
          { layout: { kind: 'static' } },
          { asset: hero.asset, sha256: 'b'.repeat(64), actualFrameCount: decoded.frames.length },
        ).apply(state),
      '精灵布局证明缺失或已过期，请等待帧资源重新载入',
    )
    const legal = new UpdateSpriteCommand(
      'hero',
      { layout: { kind: 'static' } },
      { asset: hero.asset, sha256: record.sha256, actualFrameCount: decoded.frames.length },
    )
    const next = legal.apply(state)
    expect(next.sprites[0]!.layout).toEqual({ kind: 'static' })
    const restored = legal.invert(next)
    expect(restored.sprites[0]!.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
  })

  test('AddSprite：重复 id 与路径被占各自整串恰抛', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-add-guards')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = structuredClone(state.assetCatalog.assets[hero.asset]!)
    const bytes = await source.readBytes(record.path)
    expectExactError(
      () =>
        new AddSpriteCommand({ ...structuredClone(hero), id: 'hero' }, record, bytes).apply(state),
      '精灵定义 id 已存在: hero',
    )
    expectExactError(
      () =>
        new AddSpriteCommand(
          { id: 'other', asset: hero.asset, label: 'other', layout: { kind: 'static' } },
          { ...structuredClone(record), label: '不同记录' },
          bytes,
        ).apply(state),
      `精灵 AssetId 已存在且记录不同: ${hero.asset}`,
    )
    expectExactError(
      () =>
        new AddSpriteCommand(
          { id: 'other', asset: 'sprite.other', label: 'other', layout: { kind: 'static' } },
          structuredClone(record),
          bytes,
        ).apply(state),
      `精灵资源路径已由 ${hero.asset} 登记`,
    )
  })

  test('AddSprite：共享物理资产第二语义 → createdAsset=false，undo 保留 catalog/blob', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-share')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = structuredClone(state.assetCatalog.assets[hero.asset]!)
    const bytes = await source.readBytes(record.path)
    const catalogBefore = state.assetCatalog
    const blobsBefore = state.assetBlobs
    const cmd = new AddSpriteCommand(
      { id: 'hero-alias', asset: hero.asset, label: 'hero-alias', layout: { kind: 'static' } },
      record,
      bytes,
    )
    const next = cmd.apply(state)
    expect(next.sprites.some((sprite) => sprite.id === 'hero-alias')).toBe(true)
    expect(next.assetCatalog).toBe(catalogBefore)
    expect(next.assetBlobs).toBe(blobsBefore)
    const undone = cmd.invert(next)
    expect(undone.sprites.some((sprite) => sprite.id === 'hero-alias')).toBe(false)
    expect(undone.assetCatalog.assets[hero.asset]).toEqual(catalogBefore.assets[hero.asset])
    expectInputsUnchanged(() => cmd.apply(state), [state, record])
  })

  test('AddSpriteDefinition：真实帧数证明内新用途成功且不触 catalog/blob；越界与过期恰抛', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-definition')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
    const catalogBefore = state.assetCatalog
    const blobsBefore = state.assetBlobs
    const mini = new AddSpriteDefinitionCommand(
      { id: 'hero-mini', asset: hero.asset, label: 'mini', layout: { kind: 'static' } },
      { asset: hero.asset, sha256: record.sha256, actualFrameCount: decoded.frames.length },
    )
    const next = mini.apply(state)
    expect(next.sprites.some((sprite) => sprite.id === 'hero-mini')).toBe(true)
    expect(next.assetCatalog).toBe(catalogBefore)
    expect(next.assetBlobs).toBe(blobsBefore)
    expect(mini.invert(next).sprites.some((sprite) => sprite.id === 'hero-mini')).toBe(false)
    const bigLayout = { kind: 'directional', framesPerDir: decoded.frames.length } as const
    expectExactError(
      () =>
        new AddSpriteDefinitionCommand(
          { id: 'hero-big', asset: hero.asset, label: 'big', layout: bigLayout },
          { asset: hero.asset, sha256: record.sha256, actualFrameCount: decoded.frames.length },
        ).apply(state),
      `精灵用途 hero-big 需要 ${spriteDefinitionFrameDemand({ layout: bigLayout })} 帧，资源实际只有 ${decoded.frames.length} 帧`,
    )
    expectExactError(
      () =>
        new AddSpriteDefinitionCommand(
          { id: 'hero-mini', asset: hero.asset, label: 'mini', layout: { kind: 'static' } },
          { asset: hero.asset, sha256: 'c'.repeat(64), actualFrameCount: decoded.frames.length },
        ).apply(state),
      '精灵布局证明缺失或已过期，请等待帧资源重新载入',
    )
  })

  test('RemoveSpriteDefinition：缺席 id/未 apply invert 原引用；删除+undo 原索引（真实索引）', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-remove')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = structuredClone(state.assetCatalog.assets[hero.asset]!)
    const bytes = await source.readBytes(record.path)
    const withAlias = new AddSpriteCommand(
      { id: 'hero-alias', asset: hero.asset, label: 'hero-alias', layout: { kind: 'static' } },
      record,
      bytes,
    ).apply(state)
    expect(new RemoveSpriteDefinitionCommand('gone', realRefs).apply(withAlias)).toBe(withAlias)
    expect(new RemoveSpriteDefinitionCommand('gone', realRefs).invert(withAlias)).toBe(withAlias)
    const cmd = new RemoveSpriteDefinitionCommand('hero-alias', realRefs)
    const removed = cmd.apply(withAlias)
    expect(removed.sprites.map((sprite) => sprite.id)).toEqual(['hero'])
    expect(cmd.invert(removed).sprites.map((sprite) => sprite.id)).toEqual(['hero', 'hero-alias'])
  })

  test('DeleteUnusedSpriteAsset：缺席 asset/未 apply invert 原引用；kind 非 sprite 恰抛', async () => {
    const { state } = await loadBoundaryProject('sprite-glm-unused')
    expect(new DeleteUnusedSpriteAssetCommand('sprite.gone', realRefs).apply(state)).toBe(state)
    expect(new DeleteUnusedSpriteAssetCommand('sprite.gone', realRefs).invert(state)).toBe(state)
    const seedAssets = await buildSeedAssets()
    const wrongKind = tilesetState({
      records: {
        'tileset.lone': tilesetRecord(
          'assets/authored/tilesets/lone.rle',
          seedAssets.tilesetRle,
          'd'.repeat(64),
        ),
      },
      blobs: { 'assets/authored/tilesets/lone.rle': seedAssets.tilesetRle.slice(0) },
    })
    expectExactError(
      () => new DeleteUnusedSpriteAssetCommand('tileset.lone', realRefs).apply(wrongKind),
      'AssetId tileset.lone 不是 sprite',
    )
  })

  test('ReplaceSpriteAsset：定义/资产不一致、缺席 catalog、证明过期、帧数非法 各自恰抛', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-replace-guards')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand(
          'other-sprite',
          hero.asset,
          structuredClone(record),
          bytes,
          bytes,
          {
            asset: hero.asset,
            previousSha256: record.sha256,
            previousFrameCount: 12,
            nextFrameCount: 12,
            consumerIds: ['hero'],
          },
        ).apply(state),
      '精灵定义与待替换 AssetId 不一致',
    )
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand(
          undefined,
          'sprite.gone',
          structuredClone(record),
          bytes,
          bytes,
          {
            asset: 'sprite.gone',
            previousSha256: record.sha256,
            previousFrameCount: 12,
            nextFrameCount: 12,
            consumerIds: [],
          },
        ).apply(state),
      '待替换精灵资源不在 catalog',
    )
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand('hero', hero.asset, structuredClone(record), bytes, bytes, {
          asset: hero.asset,
          previousSha256: 'e'.repeat(64),
          previousFrameCount: 12,
          nextFrameCount: 12,
          consumerIds: ['hero'],
        }).apply(state),
      '精灵替换证明已过期，请重新载入资源',
    )
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand('hero', hero.asset, structuredClone(record), bytes, bytes, {
          asset: hero.asset,
          previousSha256: record.sha256,
          previousFrameCount: 0,
          nextFrameCount: 12,
          consumerIds: ['hero'],
        }).apply(state),
      '精灵替换证明的帧数非法',
    )
  })

  test('ReplaceSpriteAsset：消费者漂移与无确认消费者各自恰抛；同帧数合法替换可完整 undo', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-replace')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand(
          undefined,
          hero.asset,
          structuredClone(record),
          bytes,
          bytes,
          {
            asset: hero.asset,
            previousSha256: record.sha256,
            previousFrameCount: 12,
            nextFrameCount: 12,
            consumerIds: [],
          },
        ).apply(state),
      '待替换精灵资源已有语义消费者，请重新确认影响范围',
    )
    expectExactError(
      () =>
        new ReplaceSpriteAssetCommand('hero', hero.asset, structuredClone(record), bytes, bytes, {
          asset: hero.asset,
          previousSha256: record.sha256,
          previousFrameCount: 12,
          nextFrameCount: 12,
          consumerIds: [],
        }).apply(state),
      '共享精灵消费者已变化，请重新确认影响范围',
    )
    const seedAssets = await buildSeedAssets()
    const nextBytes = seedAssets.tilesetRle.slice(0)
    const nextRecord = spriteRecord(
      'assets/authored/sprites/hero-next.rle',
      nextBytes,
      'f'.repeat(64),
    )
    const snap = deepSnapshot([state, record])
    const cmd = new ReplaceSpriteAssetCommand(
      'hero',
      hero.asset,
      nextRecord,
      nextBytes,
      bytes.slice(0),
      {
        asset: hero.asset,
        previousSha256: record.sha256,
        previousFrameCount: 12,
        nextFrameCount: 12,
        consumerIds: ['hero'],
      },
    )
    const next = cmd.apply(state)
    expect(next.assetCatalog.assets[hero.asset]).toEqual(nextRecord)
    expect(new Uint8Array(next.assetBlobs[nextRecord.path]!)).toEqual(new Uint8Array(nextBytes))
    expect(next.assetBlobs[record.path]).toBeUndefined()
    const undone = cmd.invert(next)
    expect(undone.assetCatalog).toBe(state.assetCatalog)
    expect(new Uint8Array(undone.assetBlobs[record.path]!)).toEqual(new Uint8Array(bytes))
    expect(undone.assetBlobs[nextRecord.path]).toBeUndefined()
    expect([state, record]).toEqual(snap)
  })
})
