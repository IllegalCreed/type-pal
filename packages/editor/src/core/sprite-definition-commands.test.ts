import type { AuthorSceneDef, SpriteActionDef, SpriteDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  actionFromFrames,
  COMMAND_SPRITE_ASSET,
  COMMAND_SPRITE_ID,
  COMMAND_SPRITE_LABEL,
  loadSpriteCommandFixture,
  makeSpriteAssetRevision,
} from '../__tests__/world-sprite-command-fixture.js'
import { AddEntityCommand } from './commands.js'
import type { EditorState, EditSession } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddSpriteDefinitionCommand,
  RemoveSpriteDefinitionCommand,
  SpriteInUseError,
  UpdateSpriteCommand,
} from './sprite-commands.js'

function definition(state: EditorState, id = COMMAND_SPRITE_ID): SpriteDef {
  const sprite = state.sprites.find((entry) => entry.id === id)
  if (!sprite) throw new Error(`Missing sprite definition ${id}`)
  return sprite
}

function draft(label: string, frame = 0): SpriteActionDef {
  return { label, steps: [{ frame, durationMs: 150 }] }
}

function addSceneReference(session: EditSession, id: string, action: string) {
  const entity = {
    id,
    pos: { col: 3, row: 2, height: 0 },
    sprite: COMMAND_SPRITE_ID,
    initialPage: 'default',
    pages: [
      {
        id: 'default',
        label: '默认',
        animation: { sprite: COMMAND_SPRITE_ID, action, loop: true },
      },
    ],
  } satisfies AuthorSceneDef['entities'][number]
  expect(session.dispatch(new AddEntityCommand('start', entity))).toBe(true)
  assertProjectSaveValid(session.getState())
}

test('布局、名称和动作在一条命令中保存，构造后更改入参不会改变提交或重做', async () => {
  const idle = actionFromFrames('待机', [0])
  const fixture = await loadSpriteCommandFixture('sprite-definition-joint-update', {
    poses: { idle },
  })
  const { session, proof } = fixture
  const before = session.getState()
  const label = '独立角色'
  const layout = { kind: 'directional' as const, framesPerDir: 1 }
  const pose = actionFromFrames('奔跑', [1, 3], { order: 0, loopFrom: 1 })
  const patch = { label, layout, poses: { run: pose } }
  const command = new UpdateSpriteCommand(
    COMMAND_SPRITE_ID,
    patch,
    proof,
    collectCurrentProjectReferenceIndex,
  )
  patch.label = '调用方后改名'
  layout.framesPerDir = 99
  pose.steps[0]!.durationMs = 5
  expect(session.dispatch(command)).toBe(true)
  const expected = {
    ...definition(before),
    label,
    layout: { kind: 'directional', framesPerDir: 1 },
    poses: {
      run: {
        label: '奔跑',
        order: 0,
        loopFrom: 1,
        steps: [
          { frame: 1, durationMs: 250 },
          { frame: 3, durationMs: 250 },
        ],
      },
    },
  }
  expect(definition(session.getState())).toEqual(expected)
  expect(session.getState().actors).toBe(before.actors)
  expect(session.getState().assetCatalog).toBe(before.assetCatalog)
  expect(session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(definition(session.getState())).toEqual(definition(before))
  expect(session.redo()).toBe(true)
  expect(definition(session.getState())).toEqual(expected)
})

test('仅改标签不依赖帧证明；缺失定义不提交、不提前消耗读取端口', async () => {
  const { session, proof } = await loadSpriteCommandFixture('sprite-definition-name')
  const before = session.getState()
  const stale = { ...proof, actualFrameCount: 0 }
  const unexpectedReferenceRead = () => {
    throw new Error('名称操作不应扫描引用')
  }
  const absent = new UpdateSpriteCommand(
    'missing',
    { label: '不存在' },
    stale,
    unexpectedReferenceRead,
  )
  expect(absent.invert(before)).toBe(before)
  expect(session.dispatch(absent)).toBe(false)
  expect(session.getHistoryVersion()).toBe(0)
  const rename = new UpdateSpriteCommand(
    COMMAND_SPRITE_ID,
    { label: '新标签' },
    stale,
    unexpectedReferenceRead,
  )
  expect(session.dispatch(rename)).toBe(true)
  expect(definition(session.getState())).toEqual({ ...definition(before), label: '新标签' })
  expect(session.undo()).toBe(true)
  expect(definition(session.getState()).label).toBe(COMMAND_SPRITE_LABEL)
})

test('作者布局按实际帧数放行，精确列出新超界的帧', async () => {
  const exact = await loadSpriteCommandFixture('sprite-definition-layout-boundary', {
    frameCount: 8,
  })
  const layout = { kind: 'directional' as const, framesPerDir: 2 }
  const command = new UpdateSpriteCommand(COMMAND_SPRITE_ID, { layout }, exact.proof)
  expect(exact.session.dispatch(command)).toBe(true)
  expect(definition(exact.session.getState()).layout).toEqual(layout)
  expect(exact.session.undo()).toBe(true)
  expect(definition(exact.session.getState()).layout).toEqual({ kind: 'static' })
  const small = await loadSpriteCommandFixture('sprite-definition-layout-overflow', {
    frameCount: 6,
  })
  expect(() =>
    small.session.dispatch(new UpdateSpriteCommand(COMMAND_SPRITE_ID, { layout }, small.proof)),
  ).toThrow('布局会新增越界帧 6, 7，资源实际只有 6 帧')
  expect(definition(small.session.getState()).layout).toEqual({ kind: 'static' })
  expect(small.session.getHistoryVersion()).toBe(0)
})

test('缺失、零帧、当前目录的其它资源及旧版本证明均拒绝修改', async () => {
  const fixture = await loadSpriteCommandFixture('sprite-definition-current-proof')
  const { session, proof } = fixture
  const state = session.getState()
  const elsewhere = state.sprites.find((sprite) => sprite.id === 'hero')!.asset
  const revision = await makeSpriteAssetRevision(COMMAND_SPRITE_ASSET, proof.actualFrameCount, 2)
  expect(revision.record.sha256).not.toBe(proof.sha256)
  const layout = { kind: 'directional' as const, framesPerDir: 1 }
  const wrong = [
    [undefined, '证明缺失或已过期'],
    [{ ...proof, actualFrameCount: 0 }, '实际帧数非法'],
    [{ ...proof, asset: elsewhere }, '证明缺失或已过期'],
    [{ ...proof, sha256: revision.record.sha256 }, '证明缺失或已过期'],
  ] as const
  for (const [candidate, message] of wrong) {
    expect(() =>
      session.dispatch(new UpdateSpriteCommand(COMMAND_SPRITE_ID, { layout }, candidate)),
    ).toThrow(message)
    expect(session.getState()).toBe(state)
  }
  expect(session.getHistoryVersion()).toBe(0)
})

test('非法布局、动作和时间线字段在作者状态上不产生写入', async () => {
  const { session, proof } = await loadSpriteCommandFixture('sprite-definition-shape')
  const layouts: SpriteDef['layout'][] = [
    { kind: 'loop', frameCount: 2 },
    ...[0, -1, 1.5, Number.NaN].map((framesPerDir) => ({
      kind: 'directional' as const,
      framesPerDir,
    })),
  ]
  const state = session.getState()
  for (const layout of layouts) {
    expect(() =>
      session.dispatch(new UpdateSpriteCommand(COMMAND_SPRITE_ID, { layout }, proof)),
    ).toThrow('布局非法')
  }

  const authored = draft('合格动作')
  const invalid: SpriteActionDef[] = [
    { ...authored, label: ' ' },
    { ...authored, steps: [] },
    ...[-1, 0.5, Number.NaN].map((frame) => draft('帧号', frame)),
    ...[0, -40, 12.5, Number.NaN].map((durationMs) => ({
      label: '时长',
      steps: [{ frame: 0, durationMs }],
    })),
    ...[-1, 0.5].map((order) => ({ ...authored, order })),
    ...[-1, 1, 0.5].map((loopFrom) => ({ ...authored, loopFrom })),
    { label: '音效', steps: [{ frame: 0, durationMs: 150, cues: [{ kind: 'sound', asset: '' }] }] },
  ]
  for (const bad of invalid) {
    expect(() =>
      session.dispatch(new UpdateSpriteCommand(COMMAND_SPRITE_ID, { poses: { bad } }, proof)),
    ).toThrow('预制动作 bad 非法')
    expect(session.getState()).toBe(state)
  }
  expect(session.getHistoryVersion()).toBe(0)
  const onBoundary = { ...draft('合法尾帧', 5), order: 0, loopFrom: 0 }
  expect(
    session.dispatch(
      new UpdateSpriteCommand(COMMAND_SPRITE_ID, { poses: { valid: onBoundary } }, proof),
    ),
  ).toBe(true)
  expect(definition(session.getState()).poses?.valid).toEqual(onBoundary)
  const beyond = { valid: onBoundary, late: draft('超界帧', 6) }
  expect(() =>
    session.dispatch(
      new UpdateSpriteCommand(
        COMMAND_SPRITE_ID,
        { poses: beyond },
        proof,
        collectCurrentProjectReferenceIndex,
      ),
    ),
  ).toThrow('布局会新增越界帧 6，资源实际只有 6 帧')
  expect(definition(session.getState()).poses).toEqual({ valid: onBoundary })
  expect(session.getHistoryVersion()).toBe(1)
})

test('新用途绑定已解码的资源，独立撤销，拒绝过期证明与超出上一帧的动作', async () => {
  const { session, proof } = await loadSpriteCommandFixture('sprite-definition-second-use', {
    frameCount: 5,
  })
  const before = session.getState()
  const second: SpriteDef = {
    id: 'second-usage',
    label: '第二用途',
    asset: COMMAND_SPRITE_ASSET,
    layout: { kind: 'static' },
    poses: { last: draft('最后一帧', 4) },
  }
  const add = new AddSpriteDefinitionCommand(second, proof)
  const missing = new AddSpriteDefinitionCommand(
    { ...second, poses: { late: draft('无此帧', 5) } },
    proof,
  )
  expect(() => session.dispatch(missing)).toThrow('需要 6 帧，资源实际只有 5 帧')
  expect(missing.invert(before)).toBe(before)
  expect(() =>
    session.dispatch(
      new AddSpriteDefinitionCommand({ ...second, layout: { kind: 'loop', frameCount: 2 } }, proof),
    ),
  ).toThrow('kind 非法')
  expect(() =>
    session.dispatch(new AddSpriteDefinitionCommand(second, { ...proof, actualFrameCount: 0 })),
  ).toThrow('实际帧数非法')
  expect(() =>
    session.dispatch(new AddSpriteDefinitionCommand(second, { ...proof, sha256: 'b'.repeat(64) })),
  ).toThrow('证明缺失或已过期')
  expect(() =>
    session.dispatch(
      new AddSpriteDefinitionCommand(second, { ...proof, asset: definition(before, 'hero').asset }),
    ),
  ).toThrow('证明缺失或已过期')
  expect(session.getState()).toBe(before)
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.dispatch(add)).toBe(true)
  expect(definition(session.getState(), 'second-usage').poses?.last).toEqual(draft('最后一帧', 4))
  expect(session.getState().assetCatalog).toBe(before.assetCatalog)
  expect(session.getState().assetBlobs).toBe(before.assetBlobs)
  second.label = '改写调用方对象'
  expect(session.undo()).toBe(true)
  expect(session.getState().sprites).toEqual(before.sprites)
  expect(session.redo()).toBe(true)
  expect(definition(session.getState(), 'second-usage').label).toBe('第二用途')
})

test('引用服务只在删除动作时介入，并指出全部拟删除 ID 和真实阻断数', async () => {
  const idle = draft('待机')
  const { session, proof } = await loadSpriteCommandFixture(
    'sprite-definition-reference-deletion',
    {
      poses: { idle, wave: draft('挥手', 1), step: draft('走一步', 2) },
    },
  )
  addSceneReference(session, 'actor-with-wave', 'wave')
  const noReferenceService = () => {
    throw new Error('实时引用服务不可用')
  }
  const renamed = { ...definition(session.getState()).poses, idle: draft('准备') }
  expect(
    session.dispatch(
      new UpdateSpriteCommand(COMMAND_SPRITE_ID, { poses: renamed }, proof, noReferenceService),
    ),
  ).toBe(true)
  expect(definition(session.getState()).poses?.idle?.label).toBe('准备')
  const keep = { idle }
  const version = session.getHistoryVersion()
  const before = session.getState()
  expect(() =>
    session.dispatch(new UpdateSpriteCommand(COMMAND_SPRITE_ID, { poses: keep }, proof)),
  ).toThrow('删除预制动作前无法读取 current-author 引用索引')
  expect(() =>
    session.dispatch(
      new UpdateSpriteCommand(
        COMMAND_SPRITE_ID,
        { poses: keep },
        proof,
        collectCurrentProjectReferenceIndex,
      ),
    ),
  ).toThrow('动作 wave、step 仍被 1 处引用')
  expect(session.getState()).toBe(before)
  expect(session.getHistoryVersion()).toBe(version)
})

test('移除无引用用途保留共享源帧和原顺序，引用错误只展示前 20 条', async () => {
  const { session, record } = await loadSpriteCommandFixture('sprite-definition-removal', {
    secondDefinition: { id: 'unused-usage', label: '未引用用途', layout: { kind: 'static' } },
    poses: { idle: draft('待机') },
  })
  const known = session.getState()
  const absent = new RemoveSpriteDefinitionCommand('missing', collectCurrentProjectReferenceIndex)
  expect(absent.invert(known)).toBe(known)
  expect(session.dispatch(absent)).toBe(false)
  expect(
    session.dispatch(
      new RemoveSpriteDefinitionCommand('unused-usage', collectCurrentProjectReferenceIndex),
    ),
  ).toBe(true)
  expect(session.getState().assetCatalog.assets[COMMAND_SPRITE_ASSET]).toEqual(record)
  expect(session.undo()).toBe(true)
  expect(session.getState().sprites).toEqual(known.sprites)

  for (let i = 0; i < 21; i++) {
    const id = `direct-usage-${i}`
    expect(
      session.dispatch(
        new AddEntityCommand('start', {
          id,
          pos: { col: i % 6, row: Math.floor(i / 6), height: 0 },
          sprite: COMMAND_SPRITE_ID,
        }),
      ),
    ).toBe(true)
  }
  const before = session.getState()
  assertProjectSaveValid(before)
  const version = session.getHistoryVersion()
  let caught: unknown
  try {
    session.dispatch(
      new RemoveSpriteDefinitionCommand(COMMAND_SPRITE_ID, collectCurrentProjectReferenceIndex),
    )
  } catch (error) {
    caught = error
  }
  if (!(caught instanceof SpriteInUseError))
    throw new Error('预期真实场景引用阻断删除', { cause: caught })
  const [header, ...details] = caught.message.split('\n')
  expect(header).toBe(`精灵定义 ${COMMAND_SPRITE_ID} 仍被 21 处引用：`)
  expect(details).toHaveLength(20)
  expect(caught.references).toHaveLength(21)
  expect(session.getState()).toBe(before)
  expect(session.getHistoryVersion()).toBe(version)
})
