// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { fixtureSource } from '../core/__tests__/battle-trial-project.js'
import { serializeProjectWithMapCopies, toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import {
  checkbox,
  choose,
  click,
  commandForm,
  input,
  row,
} from './__tests__/command-form-current-fixture.js'

const transition = {
  kind: 'source',
  outMs: 80,
  inMs: 120,
  color: 'black',
  evidenceId: 'fixture.transition',
} as const

const stepScope = {
  kind: 'flow',
  currentStep: 'arrival',
  steps: [{ id: 'arrival', label: '到达' }],
} as const

test('the foreground timeline exposes the camera and actor actions and preserves them when renamed', async () => {
  const command: Extract<AuthorCommand, { kind: 'sceneTimeline' }> = {
    kind: 'sceneTimeline',
    label: '进门',
    tracks: [
      {
        id: 'camera',
        label: '镜头',
        cues: [
          {
            atMs: 0,
            body: [{ kind: 'cameraPan', dx: 4, dy: 2, frames: 3, startImmediately: true }],
          },
        ],
      },
      {
        id: 'fade',
        label: '幕布',
        cues: [{ atMs: 0, body: [{ kind: 'fade', dir: 'in', ms: 300 }] }],
      },
      {
        id: 'actor',
        label: '守卫',
        target: { scene: 'start', entity: 'npc' },
        cues: [
          {
            atMs: 0,
            body: [
              { kind: 'setEntityFacing', facing: 'left' },
              { kind: 'setEntityFrame', frame: 2 },
            ],
          },
          {
            atMs: 100,
            repeat: { count: 2, intervalMs: 100 },
            body: [{ kind: 'nudgeEntity', dx: -4, dy: 2 }, { kind: 'animEntity' }],
          },
          { atMs: 300, body: [{ kind: 'releaseEntity' }] },
        ],
      },
    ],
  }
  const form = await commandForm(command, {
    includeEntity: true,
    commandScope: stepScope,
    requireLeafFormRow: false,
  })
  const text = document.querySelector('[role="dialog"]')?.textContent
  expect(text).toContain('镜头平移 4, 2，共 3 拍')
  expect(text).toContain('淡入 300 毫秒')
  expect(text).toContain('转向 left、定姿 2')
  expect(text).toContain('移动 -4, 2、推进步态')
  expect(text).toContain('每 100 毫秒一次，共 2 次')
  expect(text).toContain('归还实体控制')
  await input('演出名称', '城门入场')
  await form.finish({ ...command, label: '城门入场' })
})

test.each([
  { previous: {}, value: 100, saved: { intervalMs: 100 } },
  { previous: { intervalMs: 100 }, value: '', saved: {} },
])('the foreground repeat interval round-trips as $value without changing the body', async ({
  previous,
  value,
  saved,
}) => {
  const repeat: Extract<AuthorCommand, { kind: 'repeat' }> = {
    kind: 'repeat',
    count: 3,
    body: [{ kind: 'nudgeParty', dx: 2, dy: 1, layer: 0 }],
  }
  const form = await commandForm(
    { ...repeat, ...previous },
    {
      commandScope: stepScope,
      requireLeafFormRow: false,
    },
  )
  await input('前景重复间隔（毫秒，可留空）', value)
  await form.finish({ ...repeat, ...saved })
})

test('teleport arrival formation can be authored without changing the failure branch', async () => {
  const command: Extract<AuthorCommand, { kind: 'teleportOut' }> = {
    kind: 'teleportOut',
    onFail: [
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: '这里无法传送' }] },
      },
    ],
  }
  const form = await commandForm(command)
  expect(row('落地队形').textContent).toContain('场景默认')
  await choose('落地队形', '聚拢到队首')
  await form.finish({ ...command, gatherParty: true })
})

test('the camera can begin on the authored scene beat while retaining its motion budget', async () => {
  const command: Extract<AuthorCommand, { kind: 'cameraPan' }> = {
    kind: 'cameraPan',
    dx: 4,
    dy: 2,
    frames: 3,
  }
  const form = await commandForm(command)
  expect(row('镜头起步').textContent).toContain('下一运行帧')
  await choose('镜头起步', '与场景动作同帧')
  await form.finish({ ...command, startImmediately: true })
})

test('the world-beat chase control keeps its authored speed and range', async () => {
  const command: Extract<AuthorCommand, { kind: 'chasePlayer' }> = {
    kind: 'chasePlayer',
    speed: 2,
    range: 3,
  }
  const form = await commandForm(command, {
    includeEntity: true,
    commandScope: stepScope,
    requireLeafFormRow: false,
  })
  await checkbox('按世界拍直接追逐')
  await form.finish({ ...command, worldStep: true })
})

describe('Current scene destination aggregate', () => {
  test.each([
    { name: 'default', target: {} },
    { name: 'named', target: { entryId: 'door' } },
    { name: 'temporary', target: { pos: { col: 2, row: 3, height: 4 } } },
    { name: 'current', target: { pos: 'current' } },
  ] as const)('$name destination clears explicit facing through submission and canonical reopening', async ({
    target,
  }) => {
    const expected: AuthorCommand = { kind: 'loadScene', scene: 'start', ...target, transition }
    const f = await commandForm({ ...expected, facing: 'left' })
    await choose('朝向', '(保持)')
    await f.finish(expected)

    const source = fixtureSource(await buildBlankProject('scene-facing-roundtrip'))
    const project = await loadCurrentProjectFrom(source)
    const scenes = await loadAllAuthorScenes(project)
    const scene = scenes[0]!
    scene.entries = structuredClone(f.context.state.scenes[0]!.entries)
    scene.hooks = {
      onEnter: {
        variants: {
          arrival: {
            label: '切场景',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [{ id: 'start', body: f.onChange.mock.calls[0]![0] }],
            },
          },
        },
      },
    }
    const files = await serializeProjectWithMapCopies(
      toEditorState(project, scenes, {}, {}, []),
      source,
    )
    const reopened = await loadCurrentProjectFrom(fixtureSource(files))
    const saved = (await loadAllAuthorScenes(reopened))[0]!.hooks!.onEnter!.variants.arrival!.flow
    if (saved.kind !== 'stages') throw new Error('expected saved arrival stages')
    const command = saved.stages[0]!.body[0]!
    expect(command).toEqual(expected)
    expect(command).not.toHaveProperty('facing')
    const reopenedForm = await commandForm(command)
    expect(row('朝向').textContent).toContain('(保持)')
    await choose('朝向', 'right')
    await reopenedForm.finish({ ...expected, facing: 'right' })
  })
  test('retargeting through the dialog clears old entry and preserves facing and source timing', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'back',
      facing: 'up',
      transition,
    })
    await choose('目标场景', 'other')
    await f.finish({ kind: 'loadScene', scene: 'other', facing: 'up', transition })
  })
  test('named mode chooses the first actual entry then permits another named destination', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 2, row: 4, height: 0 },
      transition,
    })
    await choose('落点', '命名落点')
    expect(row('命名落点').textContent).toContain('正门')
    await choose('命名落点', '后门')
    await f.finish({ kind: 'loadScene', scene: 'start', entryId: 'back', transition })
  })
  test('reselecting named mode retains the valid selected entry instead of replacing it with the first', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'start', entryId: 'back' })
    await choose('落点', '命名落点')
    expect(row('命名落点').textContent).toContain('后门')
    await choose('朝向', 'left')
    await f.finish({ kind: 'loadScene', scene: 'start', entryId: 'back', facing: 'left' })
  })
  test('temporary coordinates start at the target default including its height', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'start', entryId: 'door' })
    await choose('落点', '临时坐标')
    await f.finish({ kind: 'loadScene', scene: 'start', pos: { col: 4, row: 3, height: 2 } })
  })
  test.each([
    'col',
    'row',
    'height',
  ] as const)('temporary %s edits preserve both siblings and transition', async (key) => {
    const command: Extract<AuthorCommand, { kind: 'loadScene' }> = {
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 2, row: 3, height: 4 },
      facing: 'right',
      transition,
    }
    const f = await commandForm(command)
    await input('col / row / h', 8, ['col', 'row', 'height'].indexOf(key))
    await f.finish({ ...command, pos: { col: 2, row: 3, height: 4, [key]: 8 } })
  })
  test('default mode removes a temporary location without dropping direction or timing', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 3, row: 2, height: 0 },
      facing: 'left',
      transition,
    })
    await choose('落点', '默认落点')
    await f.finish({ kind: 'loadScene', scene: 'start', facing: 'left', transition })
  })
  test('switching to modern timing changes only transition', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'door',
      facing: 'right',
      transition,
    })
    await click('改用现代过渡')
    expect(row('画面过渡').textContent).toContain('现代过渡')
    await f.finish({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'door',
      facing: 'right',
      transition: undefined,
    })
  })
  test('a target with no named entries disables named mode and seeds its actual zero-height default', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'other' })
    await click('落点模式')
    const named = [...document.querySelectorAll('[role="option"]')].find(
      (option) => option.textContent === '命名落点',
    )
    expect(named?.getAttribute('aria-disabled')).toBe('true')
    await choose('落点', '临时坐标')
    expect(row('col / row / h').querySelectorAll('input')[2]?.value).toBe('0')
    await f.finish({ kind: 'loadScene', scene: 'other', pos: { col: 9, row: 6, height: 0 } })
  })
})
