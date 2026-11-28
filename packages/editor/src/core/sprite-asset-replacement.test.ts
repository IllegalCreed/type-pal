import { expect, test } from 'vitest'
import {
  actionFromFrames,
  COMMAND_SPRITE_ASSET,
  COMMAND_SPRITE_ID,
  loadSpriteCommandFixture,
  makeSpriteAssetRevision,
} from '../__tests__/world-sprite-command-fixture.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { sha256Hex } from './binary-signature.js'
import { EditSession } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { ReplaceSpriteAssetCommand, type SpriteReplacementProof } from './sprite-asset-commands.js'

type Fixture = Awaited<ReturnType<typeof loadSpriteCommandFixture>>
type Revision = Awaited<ReturnType<typeof makeSpriteAssetRevision>>

async function replacementInputs(fixture: Fixture, frameCount: number) {
  const asset = COMMAND_SPRITE_ASSET
  const next = await makeSpriteAssetRevision(asset, frameCount, 2)
  const previous = await fixture.reader.readBytes(asset, 'sprite')
  const proof: SpriteReplacementProof = {
    asset,
    previousSha256: fixture.proof.sha256,
    previousFrameCount: fixture.proof.actualFrameCount,
    nextFrameCount: next.frameCount,
    consumerIds: fixture.session
      .getState()
      .sprites.filter((definition) => definition.asset === asset)
      .map((definition) => definition.id),
  }
  expect(next.record.sha256).not.toBe(proof.previousSha256)
  return { next, previous, proof }
}

function replace(
  next: Revision,
  previous: ArrayBuffer,
  proof: SpriteReplacementProof,
  id = COMMAND_SPRITE_ID,
) {
  return new ReplaceSpriteAssetCommand(
    id,
    COMMAND_SPRITE_ASSET,
    next.record,
    next.bytes,
    previous,
    proof,
  )
}

test.each([6, 8])('替换为 %i 帧后保留语义用途，版本与可读字节一起撤销和重做', async (count) => {
  const fixture = await loadSpriteCommandFixture('sprite-assets-replace-compatible')
  const { session, reader, record } = fixture
  const { next, previous, proof } = await replacementInputs(fixture, count)
  const before = session.getState()
  const command = replace(next, previous, proof)
  expect(command.label).toBe('替换精灵资源')
  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().sprites).toBe(before.sprites)
  expect(session.getState().assetBlobs[record.path]).toBeUndefined()
  expect(session.getState().assetCatalog.assets[COMMAND_SPRITE_ASSET]).toEqual(next.record)
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    next.record.sha256,
  )
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog).toBe(before.assetCatalog)
  expect(session.getState().assetBlobs[next.record.path]).toBeUndefined()
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    record.sha256,
  )
  expect(session.redo()).toBe(true)
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    next.record.sha256,
  )
})

test('共享源帧缩短时，同一事务更新所有受影响的布局、动作和资产', async () => {
  const secondId = 'other-usage'
  const fixture = await loadSpriteCommandFixture('sprite-assets-shared-shrink', {
    frameCount: 8,
    layout: { kind: 'directional', framesPerDir: 2 },
    poses: { walk: actionFromFrames('走', [5, 7], { loopFrom: 0 }) },
    secondDefinition: {
      id: secondId,
      label: '第二用途',
      layout: { kind: 'static' },
      poses: { idle: actionFromFrames('待机', [6]) },
    },
  })
  const { session, reader, record } = fixture
  const { next, previous, proof } = await replacementInputs(fixture, 4)
  const before = session.getState()
  const snapshots = Object.fromEntries(
    before.sprites
      .filter((entry) => entry.asset === COMMAND_SPRITE_ASSET)
      .map(({ id, layout, poses }) => [id, { layout, poses }]),
  )
  const repairs = {
    [COMMAND_SPRITE_ID]: {
      layout: { kind: 'directional', framesPerDir: 1 } as const,
      poses: { walk: actionFromFrames('走', [1, 3], { loopFrom: 0 }) },
    },
    [secondId]: {
      layout: { kind: 'static' } as const,
      poses: { idle: actionFromFrames('待机', [2]) },
    },
  }
  const command = new ReplaceSpriteAssetCommand(
    COMMAND_SPRITE_ID,
    COMMAND_SPRITE_ASSET,
    next.record,
    next.bytes,
    previous,
    { ...proof, repairs, consumerSnapshots: snapshots },
    '缩帧修复',
  )
  expect(command.label).toBe('缩帧修复')
  expect(session.dispatch(command)).toBe(true)
  expect(
    session
      .getState()
      .sprites.filter((entry) => entry.asset === COMMAND_SPRITE_ASSET)
      .map(({ layout, poses }) => ({ layout, poses })),
  ).toEqual(Object.values(repairs))
  expect(session.getState().sprites[0]).toBe(before.sprites[0])
  expect(session.getHistoryVersion()).toBe(1)
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    next.record.sha256,
  )
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState().sprites).toBe(before.sprites)
  expect(await sha256Hex(await reader.readBytes(COMMAND_SPRITE_ASSET, 'sprite'))).toBe(
    record.sha256,
  )
})

test('任何不完整、过期或非法的缩帧修复都会保留原资源和所有用途', async () => {
  const second = {
    id: 'other-usage',
    label: '第二用途',
    layout: { kind: 'static' } as const,
    poses: { show: actionFromFrames('显示', [5]) },
  }
  const fixture = await loadSpriteCommandFixture('sprite-assets-invalid-shrink', {
    secondDefinition: second,
  })
  const { session } = fixture
  const { next, previous, proof } = await replacementInputs(fixture, 4)
  const before = session.getState()
  const repairs = {
    [COMMAND_SPRITE_ID]: { layout: { kind: 'static' } as const },
    [second.id]: { layout: second.layout, poses: { show: actionFromFrames('显示', [2]) } },
  }
  const snapshots = {
    [COMMAND_SPRITE_ID]: repairs[COMMAND_SPRITE_ID],
    [second.id]: { layout: second.layout, poses: second.poses },
  }
  const broken: Array<[Partial<SpriteReplacementProof>, string]> = [
    [{}, '不得减少有效帧'],
    [{ repairs }, '不得减少有效帧'],
    [{ consumerSnapshots: snapshots }, '不得减少有效帧'],
    [
      {
        repairs: { [COMMAND_SPRITE_ID]: repairs[COMMAND_SPRITE_ID] },
        consumerSnapshots: snapshots,
      },
      '必须显式修复全部',
    ],
    [
      { repairs, consumerSnapshots: { ...snapshots, [second.id]: { layout: second.layout } } },
      '布局或姿势已变化',
    ],
    [
      {
        repairs: { ...repairs, [second.id]: { layout: { kind: 'loop', frameCount: 2 } } },
        consumerSnapshots: snapshots,
      },
      '布局非法',
    ],
    [
      {
        repairs: {
          ...repairs,
          [second.id]: { layout: second.layout, poses: { show: actionFromFrames('显示', [4]) } },
        },
        consumerSnapshots: snapshots,
      },
      '仍需 5 帧，资源只有 4 帧',
    ],
  ]
  for (const [input, message] of broken) {
    expect(() => session.dispatch(replace(next, previous, { ...proof, ...input }))).toThrow(message)
    expect(session.getState()).toBe(before)
    expect(session.getHistoryVersion()).toBe(0)
  }
})

test('替换要求当前修订、实际帧数、消费者与路径都匹配', async () => {
  const fixture = await loadSpriteCommandFixture('sprite-assets-replace-proof')
  const { session } = fixture
  const { next, previous, proof } = await replacementInputs(fixture, 6)
  const before = session.getState()
  const source = before.sprites.find((item) => item.id === 'hero')!
  const sourcePath = before.assetCatalog.assets[source.asset]!.path
  const unregistered = 'sprite.authored.unregistered'
  const candidates = [
    [replace(next, previous, proof, source.id), '精灵定义与待替换 AssetId 不一致'],
    [
      new ReplaceSpriteAssetCommand(undefined, unregistered, next.record, next.bytes, previous, {
        ...proof,
        asset: unregistered,
        consumerIds: [],
      }),
      '不在 catalog',
    ],
    [replace(next, previous, { ...proof, previousSha256: next.record.sha256 }), '替换证明已过期'],
    [replace(next, previous, { ...proof, previousFrameCount: 0 }), '替换证明的帧数非法'],
    [replace(next, previous, { ...proof, nextFrameCount: 0 }), '替换证明的帧数非法'],
    [replace(next, previous, { ...proof, consumerIds: [] }), '共享精灵消费者已变化'],
    [
      new ReplaceSpriteAssetCommand(
        undefined,
        COMMAND_SPRITE_ASSET,
        next.record,
        next.bytes,
        previous,
        { ...proof, consumerIds: [] },
      ),
      '已有语义消费者',
    ],
    [
      replace({ ...next, record: { ...next.record, path: sourcePath } }, previous, proof),
      '替换路径已由',
    ],
  ] as const
  for (const [candidate, message] of candidates) {
    expect(() => session.dispatch(candidate)).toThrow(message)
    expect(session.getState()).toBe(before)
  }
  expect(session.getHistoryVersion()).toBe(0)
})

test('没有语义用途的源帧可以独立替换并撤销，保留作者指定命令名称', async () => {
  const asset = 'sprite.authored.no-consumer'
  const project = await loadWorldSpriteProject('sprite-assets-replace-no-consumer', [
    { asset, label: '独立源文件', frameCount: 3, definitions: [] },
  ])
  const before = project.state
  const session = new EditSession(before)
  const previous = before.assetCatalog.assets[asset]!
  const next = await makeSpriteAssetRevision(asset, 3, 4)
  const command = new ReplaceSpriteAssetCommand(
    undefined,
    asset,
    next.record,
    next.bytes,
    await project.source.readBytes(previous.path),
    {
      asset,
      previousSha256: previous.sha256,
      previousFrameCount: 3,
      nextFrameCount: 3,
      consumerIds: [],
    },
    '替换未配置源文件',
  )
  expect(command.label).toBe('替换未配置源文件')
  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().sprites).toBe(before.sprites)
  expect(session.getState().assetCatalog.assets[asset]).toEqual(next.record)
  expect(await sha256Hex(session.getState().assetBlobs[next.record.path]!)).toBe(next.record.sha256)
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog).toBe(before.assetCatalog)
  expect(await sha256Hex(session.getState().assetBlobs[previous.path]!)).toBe(previous.sha256)
  assertProjectSaveValid(session.getState())
})
