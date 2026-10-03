/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G03：资源替换/入库/用途/清理命令新轴（合法 blank + 真实 gzip+RLE 字节）。
 * 排重：glm-boundaries 已证 Replace 的“定义/资产不一致、缺 catalog、证明过期、帧数非法、消费者漂移、
 * 无确认消费者、同帧数合法替换+undo”、AddSprite 重复 id/路径占用/共享资产第二语义、
 * AddSpriteDefinition 基础成功/越界/过期、Remove/DeleteUnused 缺席与 kind 错；
 * next-wave 证入参篡改隔离；residual 证 DeleteUnused 仍被引用与缺 AssetId。本文件只补：
 * 增帧替换与 blob 迁移/撤销写回、缩帧修复事务的成功路径与五类失败文案、路径被他资产占用、
 * 无用途资源的 spriteId=undefined 替换与自定义 label、AddSprite 的 record/blob 完整性守卫、
 * AddSpriteDefinition 的 validateSprites 守卫与帧需求边界、RemoveSpriteDefinition 的引用文案 20 条截断、
 * DeleteUnused 清理 pending blob 与 persistedBytes 撤销写回。
 */
import type { SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  actionOf,
  buildC05SpriteResource,
  C05_ASSET,
  C05_SPRITE,
  type C05CoreOpen,
  openC05Core,
} from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import { loadCursorSpriteProject } from '../__tests__/cursor-asset-r1/sprite-fixtures.js'
import { AddEntityCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddSpriteCommand,
  AddSpriteDefinitionCommand,
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  ReplaceSpriteAssetCommand,
  SpriteInUseError,
  type SpriteReplacementProof,
} from './sprite-commands.js'

const refs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

function thrown(run: () => unknown): Error {
  try {
    run()
  } catch (reason) {
    if (reason instanceof Error) return reason
    throw new Error(`非 Error 抛出：${String(reason)}`)
  }
  throw new Error('期望抛出但未抛出')
}

function heroOf(state: EditorState): SpriteDef {
  const found = state.sprites.find((sprite) => sprite.id === C05_SPRITE)
  if (!found) throw new Error('缺 hero')
  return found
}

async function previousBytes(open: C05CoreOpen): Promise<ArrayBuffer> {
  return open.reader.readBytes(C05_ASSET, 'sprite')
}

function replacementProof(
  open: C05CoreOpen,
  nextFrameCount: number,
  extra: Partial<SpriteReplacementProof> = {},
): SpriteReplacementProof {
  return {
    asset: C05_ASSET,
    previousSha256: open.proof.sha256,
    previousFrameCount: open.frameCount,
    nextFrameCount,
    consumerIds: [C05_SPRITE],
    ...extra,
  }
}

describe('C05-G03 精灵资产生命周期命令', () => {
  test('C05-G03-01 增帧替换：catalog 与 blob 切到新路径，旧路径 blob 不残留；invert 写回旧字节与旧 catalog', async () => {
    const open = await openC05Core('c05-g03-01', { frameCount: 4 })
    const state = open.session.getState()
    const old = await previousBytes(open)
    const next = await buildC05SpriteResource(C05_ASSET, 7, 3)
    const command = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 7),
    )
    expect(command.label).toBe('替换精灵资源')
    const applied = command.apply(state)
    expect(applied.assetCatalog.assets[C05_ASSET]).toEqual(next.record)
    expect(applied.assetBlobs[next.record.path]).toEqual(next.bytes)
    expect(applied.sprites).toBe(state.sprites)
    const oldPath = state.assetCatalog.assets[C05_ASSET]!.path
    expect(oldPath in applied.assetBlobs).toBe(false)

    const undone = command.invert(applied)
    expect(undone.assetCatalog).toBe(state.assetCatalog)
    expect(undone.assetBlobs[oldPath]).toEqual(old)
    expect(undone.sprites).toBe(state.sprites)
  })

  test('C05-G03-02 缩帧修复事务成功：全部消费者按显式 repairs 重写，资产与布局同一事务；invert 还原消费者', async () => {
    const open = await openC05Core('c05-g03-02', {
      frameCount: 8,
      poses: { run: actionOf('跑', [5, 6, 7], { order: 0, loopFrom: 0 }) },
    })
    const state = open.session.getState()
    const hero = heroOf(state)
    const next = await buildC05SpriteResource(C05_ASSET, 4, 1)
    const repaired = {
      layout: { kind: 'static' } as const,
      poses: { run: actionOf('跑', [1, 2, 3], { order: 0, loopFrom: 0 }) },
    }
    const command = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      await previousBytes(open),
      replacementProof(open, 4, {
        repairs: { [C05_SPRITE]: repaired },
        consumerSnapshots: { [C05_SPRITE]: { layout: hero.layout, poses: hero.poses } },
      }),
      '缩帧替换',
    )
    expect(command.label).toBe('缩帧替换')
    const applied = command.apply(state)
    expect(heroOf(applied).poses).toEqual(repaired.poses)
    expect(heroOf(applied).layout).toEqual({ kind: 'static' })
    expect(applied.assetCatalog.assets[C05_ASSET]?.sha256).toBe(next.record.sha256)
    const undone = command.invert(applied)
    expect(heroOf(undone)).toEqual(hero)
    expect(undone.assetCatalog.assets[C05_ASSET]?.sha256).toBe(open.proof.sha256)
  })

  test('C05-G03-03 缩帧缺 repairs 或缺 snapshots 任一都以“不得减少有效帧”拒绝，状态不被触碰', async () => {
    const open = await openC05Core('c05-g03-03', { frameCount: 6 })
    const state = open.session.getState()
    const hero = heroOf(state)
    const next = await buildC05SpriteResource(C05_ASSET, 3, 2)
    const old = await previousBytes(open)
    const message = '精灵替换不得减少有效帧；缩帧需使用显式布局修复事务'
    const bare = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 3),
    )
    expect(thrown(() => bare.apply(state)).message).toBe(message)
    const onlyRepairs = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 3, { repairs: { [C05_SPRITE]: { layout: hero.layout } } }),
    )
    expect(thrown(() => onlyRepairs.apply(state)).message).toBe(message)
    const onlySnapshots = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 3, { consumerSnapshots: { [C05_SPRITE]: { layout: hero.layout } } }),
    )
    expect(thrown(() => onlySnapshots.apply(state)).message).toBe(message)
    expect(state.assetCatalog.assets[C05_ASSET]?.sha256).toBe(open.proof.sha256)
  })

  test('C05-G03-04 缩帧时共享资源的第二个消费者未被修复：整笔拒绝，且未修复者保持原布局', async () => {
    const open = await openC05Core('c05-g03-04', {
      frameCount: 6,
      secondDefinition: { id: 'c05-twin', label: '孪生', layout: { kind: 'static' } },
    })
    const state = open.session.getState()
    const next = await buildC05SpriteResource(C05_ASSET, 3, 4)
    const command = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      await previousBytes(open),
      replacementProof(open, 3, {
        consumerIds: [C05_SPRITE, 'c05-twin'],
        repairs: { [C05_SPRITE]: { layout: { kind: 'static' } } },
        consumerSnapshots: {
          [C05_SPRITE]: { layout: { kind: 'static' } },
          'c05-twin': { layout: { kind: 'static' } },
        },
      }),
    )
    expect(thrown(() => command.apply(state)).message).toBe(
      '缩帧事务必须显式修复全部共享精灵消费者',
    )
    expect(state.sprites.map((sprite) => sprite.id).filter((id) => id.startsWith('c05-'))).toEqual([
      C05_SPRITE,
      'c05-twin',
    ])
  })

  test('C05-G03-05 缩帧快照与当前消费者布局/姿势不一致：指名漂移消费者并要求重新确认', async () => {
    const open = await openC05Core('c05-g03-05', {
      frameCount: 6,
      poses: { a: actionOf('甲', [0], { order: 0 }) },
    })
    const state = open.session.getState()
    const next = await buildC05SpriteResource(C05_ASSET, 3, 5)
    const command = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      await previousBytes(open),
      replacementProof(open, 3, {
        repairs: { [C05_SPRITE]: { layout: { kind: 'static' } } },
        // 快照里没有 poses：与当前含动作 a 的消费者不同。
        consumerSnapshots: { [C05_SPRITE]: { layout: { kind: 'static' } } },
      }),
    )
    expect(thrown(() => command.apply(state)).message).toBe(
      `缩帧消费者 ${C05_SPRITE} 的布局或姿势已变化，请重新确认`,
    )
  })

  test('C05-G03-06 缩帧修复后仍超出新帧数，或修复本身是非法布局：各自以确切文案拒绝', async () => {
    const open = await openC05Core('c05-g03-06', {
      frameCount: 6,
      poses: { a: actionOf('甲', [5], { order: 0 }) },
    })
    const state = open.session.getState()
    const hero = heroOf(state)
    const next = await buildC05SpriteResource(C05_ASSET, 4, 6)
    const old = await previousBytes(open)
    const snapshots = { [C05_SPRITE]: { layout: hero.layout, poses: hero.poses } }
    const stillDemands = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 4, {
        repairs: {
          [C05_SPRITE]: { layout: hero.layout, poses: { a: actionOf('甲', [4], { order: 0 }) } },
        },
        consumerSnapshots: snapshots,
      }),
    )
    expect(thrown(() => stillDemands.apply(state)).message).toBe(
      `缩帧后 ${C05_SPRITE} 的布局/姿势仍需 5 帧，资源只有 4 帧`,
    )
    const illegal = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      next.record,
      next.bytes,
      old,
      replacementProof(open, 4, {
        repairs: { [C05_SPRITE]: { layout: { kind: 'loop', frameCount: 2 } } },
        consumerSnapshots: snapshots,
      }),
    )
    expect(thrown(() => illegal.apply(state)).message).toBe(
      `精灵 ${C05_SPRITE} 的布局非法；自动循环请创建预制动作`,
    )
  })

  test('C05-G03-07 替换记录的路径已被其它资产占用：指名占用者并拒绝', async () => {
    const open = await openC05Core('c05-g03-07', { frameCount: 4 })
    const state = open.session.getState()
    const starter = state.sprites.find((sprite) => sprite.id === 'hero')
    expect(starter).toBeDefined()
    const ownerPath = state.assetCatalog.assets[starter!.asset]!.path
    const next = await buildC05SpriteResource(C05_ASSET, 4, 7)
    const command = new ReplaceSpriteAssetCommand(
      C05_SPRITE,
      C05_ASSET,
      { ...next.record, path: ownerPath },
      next.bytes,
      await previousBytes(open),
      replacementProof(open, 4),
    )
    expect(thrown(() => command.apply(state)).message).toBe(
      `精灵替换路径已由 ${starter!.asset} 登记`,
    )
  })

  test('C05-G03-08 无用途资源可用 spriteId=undefined 替换（消费者仍须为空）；自定义 label 原样暴露', async () => {
    const project = await loadCursorSpriteProject('c05-g03-08', [
      { asset: 'sprite.authored.c05loose', label: '游离', frameCount: 3, definitions: [] },
    ])
    const state = project.state
    const loose = 'sprite.authored.c05loose'
    const next = await buildC05SpriteResource(loose, 3, 8, '游离新')
    const oldRecord = state.assetCatalog.assets[loose]!
    const command = new ReplaceSpriteAssetCommand(
      undefined,
      loose,
      next.record,
      next.bytes,
      await project.source.readBytes(oldRecord.path),
      {
        asset: loose,
        previousSha256: oldRecord.sha256,
        previousFrameCount: 3,
        nextFrameCount: 3,
        consumerIds: [],
      },
      '游离替换',
    )
    expect(command.label).toBe('游离替换')
    const applied = command.apply(state)
    expect(applied.assetCatalog.assets[loose]?.label).toBe('游离新')
    expect(applied.assetCatalog.assets[loose]?.sha256).toBe(next.record.sha256)
    expect(applied.sprites).toBe(state.sprites)
  })

  test('C05-G03-09 AddSprite 的 record/blob 完整性守卫：kind、mediaType、bytes 长度、sha256、gzip 魔数各有确切文案', async () => {
    const open = await openC05Core('c05-g03-09', { frameCount: 3 })
    const state = open.session.getState()
    const fresh = await buildC05SpriteResource('sprite.authored.c05new', 3, 9)
    const def = (): SpriteDef => ({
      id: 'c05-new',
      asset: 'sprite.authored.c05new',
      label: '新',
      layout: { kind: 'static' },
    })
    const run = (record = fresh.record, bytes = fresh.bytes) =>
      thrown(() => new AddSpriteCommand(def(), record, bytes).apply(state)).message
    expect(run({ ...fresh.record, kind: 'tileset' })).toBe('大世界精灵资源 kind 必须是 sprite')
    expect(run({ ...fresh.record, mediaType: 'image/png' })).toBe(
      '大世界精灵资源 mediaType 必须是 application/vnd.type-pal.rle',
    )
    expect(run({ ...fresh.record, bytes: fresh.record.bytes + 1 })).toBe(
      '大世界精灵资源 bytes 与二进制长度不一致',
    )
    expect(run({ ...fresh.record, sha256: 'G'.repeat(64) })).toBe('大世界精灵资源 sha256 非法')
    const plain = new Uint8Array(fresh.bytes.byteLength)
    expect(run({ ...fresh.record }, plain.buffer)).toBe('大世界精灵资源必须是 canonical gzip')
    expect(state.sprites.some((sprite) => sprite.id === 'c05-new')).toBe(false)
  })

  test('C05-G03-10 AddSpriteDefinition：帧需求恰等于实际帧数放行，姿势帧越界与 loop 布局分别被拒', async () => {
    const open = await openC05Core('c05-g03-10', { frameCount: 5 })
    const state = open.session.getState()
    const make = (definition: SpriteDef) => new AddSpriteDefinitionCommand(definition, open.proof)
    const exact = make({
      id: 'c05-exact',
      asset: C05_ASSET,
      label: '恰好',
      layout: { kind: 'static' },
      poses: { last: actionOf('末', [4], { order: 0 }) },
    }).apply(state)
    expect(exact.sprites.at(-1)?.id).toBe('c05-exact')
    expect(exact.sprites).toHaveLength(state.sprites.length + 1)
    const over = make({
      id: 'c05-over',
      asset: C05_ASSET,
      label: '越界',
      layout: { kind: 'static' },
      poses: { late: actionOf('晚', [5], { order: 0 }) },
    })
    expect(thrown(() => over.apply(state)).message).toBe(
      '精灵用途 c05-over 需要 6 帧，资源实际只有 5 帧',
    )
    const loop = make({
      id: 'c05-loop',
      asset: C05_ASSET,
      label: '循环',
      layout: { kind: 'loop', frameCount: 2 },
    })
    expect(thrown(() => loop.apply(state)).message).toBe('sprites[0].layout: kind 非法("loop")')
    // 失败的命令从未入库：invert 对原状态是 no-op。
    expect(over.invert(state)).toBe(state)
    expect(loop.invert(state)).toBe(state)
  })

  test('C05-G03-11 AddSpriteDefinition 拒绝 proof 帧数为 0 与 proof 指向别的资产', async () => {
    const open = await openC05Core('c05-g03-11', { frameCount: 5 })
    const state = open.session.getState()
    const definition: SpriteDef = {
      id: 'c05-extra',
      asset: C05_ASSET,
      label: '额外',
      layout: { kind: 'static' },
    }
    expect(
      thrown(() =>
        new AddSpriteDefinitionCommand(definition, { ...open.proof, actualFrameCount: 0 }).apply(
          state,
        ),
      ).message,
    ).toBe('精灵布局证明的实际帧数非法')
    expect(
      thrown(() =>
        new AddSpriteDefinitionCommand(definition, {
          ...open.proof,
          asset: 'sprite.authored.other',
        }).apply(state),
      ).message,
    ).toBe('精灵布局证明缺失或已过期，请等待帧资源重新载入')
  })

  test('C05-G03-12 RemoveSpriteDefinition：21 个实体引用时文案头部报 21 处而正文只列前 20 行；资产保持不动', async () => {
    const open = await openC05Core('c05-g03-12', { frameCount: 3 })
    for (let index = 0; index < 21; index += 1)
      expect(
        open.session.dispatch(
          new AddEntityCommand('start', {
            id: `c05-prop-${index}`,
            pos: { col: index % 7, row: Math.floor(index / 7), height: 0 },
            sprite: C05_SPRITE,
          }),
        ),
      ).toBe(true)
    const state = open.session.getState()
    const command = new RemoveSpriteDefinitionCommand(C05_SPRITE, refs)
    const error = thrown(() => command.apply(state))
    expect(error).toBeInstanceOf(SpriteInUseError)
    const inUse = error as SpriteInUseError
    expect(inUse.targetLabel).toBe(`精灵定义 ${C05_SPRITE}`)
    expect(inUse.references).toHaveLength(21)
    const [header, ...lines] = error.message.split('\n')
    expect(header).toBe(`精灵定义 ${C05_SPRITE} 仍被 21 处引用：`)
    expect(lines).toHaveLength(20)
    expect(state.assetCatalog.assets[C05_ASSET]).toBeDefined()
    expect(command.invert(state)).toBe(state)
  })

  test('C05-G03-13 DeleteUnusedSpriteAsset：invert 还原 apply 前的 blob 表；磁盘已持久资产仅在给出 persistedBytes 时写回字节副本', async () => {
    const open = await openC05Core('c05-g03-13', { frameCount: 3 })
    const fresh = await buildC05SpriteResource('sprite.authored.c05tmp', 2, 2, '临时')
    const added = new AddSpriteCommand(
      {
        id: 'c05-tmp',
        asset: 'sprite.authored.c05tmp',
        label: '临时',
        layout: { kind: 'static' },
      },
      fresh.record,
      fresh.bytes,
    ).apply(open.session.getState())
    const pendingBytes = added.assetBlobs[fresh.record.path]
    expect(pendingBytes).toEqual(fresh.bytes)
    const unused = new RemoveSpriteDefinitionCommand('c05-tmp', refs).apply(added)
    expect(unused.assetCatalog.assets['sprite.authored.c05tmp']).toBeDefined()

    // pending blob：apply 清掉 blob 与 catalog；invert 恢复 apply 前捕获的同一 blob 引用。
    const pending = new DeleteUnusedSpriteAssetCommand('sprite.authored.c05tmp', refs)
    const removedPending = pending.apply(unused)
    expect(removedPending.assetCatalog.assets['sprite.authored.c05tmp']).toBeUndefined()
    expect(fresh.record.path in removedPending.assetBlobs).toBe(false)
    const restoredPending = pending.invert(removedPending)
    expect(restoredPending.assetCatalog).toBe(unused.assetCatalog)
    expect(restoredPending.assetBlobs[fresh.record.path]).toBe(pendingBytes)

    // 磁盘已持久资产（无 pending blob）：不给 persistedBytes 则撤销后仍无 blob。
    const project = await loadCursorSpriteProject('c05-g03-13b', [
      { asset: 'sprite.authored.c05disk', label: '磁盘', frameCount: 2, definitions: [] },
    ])
    const diskRecord = project.state.assetCatalog.assets['sprite.authored.c05disk']!
    const diskBytes = await project.source.readBytes(diskRecord.path)
    const bare = new DeleteUnusedSpriteAssetCommand('sprite.authored.c05disk', refs)
    const bareRemoved = bare.apply(project.state)
    expect(diskRecord.path in bare.invert(bareRemoved).assetBlobs).toBe(false)
    const persisted = new DeleteUnusedSpriteAssetCommand('sprite.authored.c05disk', refs, diskBytes)
    const restored = persisted.invert(persisted.apply(project.state))
    expect(restored.assetBlobs[diskRecord.path]).toEqual(diskBytes)
    expect(restored.assetBlobs[diskRecord.path]).not.toBe(diskBytes)
  })
})
