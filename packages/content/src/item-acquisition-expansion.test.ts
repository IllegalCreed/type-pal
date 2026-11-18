import { expect, test } from 'vitest'
import {
  acquisitionScene,
  chest,
  cue,
  grant,
  items,
  search,
  self,
} from './__tests__/item-acquisition-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AuthorAcquisitionFlow,
  type AuthorCommand,
  type AuthorGrantRewardCommand,
  type AuthorSceneDef,
  acquisitionPreviewStages,
  checkAuthorCommands,
  checkRuntimeCommands,
  checkRuntimeScriptFlow,
  expandAcquisitionFlow,
  expandAuthorScriptTree,
  resolveAuthorDialogueTree,
  validateAuthorScenes,
} from './index.js'

test('real author-scene boundary accepts a trigger recipe without expanding its stored parameters', () => {
  const definition = deepSnapshot(chest)
  const authored: AuthorSceneDef = acquisitionScene(definition)
  const before = deepSnapshot(authored)
  expect(validateAuthorScenes([authored])).toEqual([authored])
  const detached = expandAcquisitionFlow(definition, self, items)
  expect(acquisitionPreviewStages(chest)).toEqual([
    { id: 'unopened', label: '打开' },
    { id: 'empty', label: '空箱' },
  ])
  expect(detached.stages[0]).toEqual({
    id: 'unopened',
    label: '打开',
    next: 'empty',
    body: [
      { kind: 'setEntityFacing', target: self, facing: 'down' },
      { kind: 'setEntityFrame', target: self, frame: 1 },
      { kind: 'clearDialog' },
      { kind: 'playSound', asset: 'sound.open' },
      { kind: 'dialog', cue },
      { kind: 'giveItem', itemId: 'herb', count: 3 },
      { kind: 'giveMoney', delta: 50 },
    ],
  })
  const projected = resolveAuthorDialogueTree(authored, {}, 'scene', { items })
  expect(projected.entities[0]?.behaviors?.trigger?.collect?.flow).toEqual({
    kind: 'stages',
    initial: 'unopened',
    stages: [
      {
        id: 'unopened',
        label: '打开',
        next: 'empty',
        body: [
          { kind: 'setEntityFacing', target: self, facing: 'down' },
          { kind: 'setEntityFrame', target: self, frame: 1 },
          { kind: 'clearDialog' },
          { kind: 'playSound', asset: 'sound.open' },
          { kind: 'dialog', cue: { rows: [{ text: 'line.reward' }] } },
          { kind: 'giveItem', itemId: 'herb', count: 3 },
          { kind: 'giveMoney', delta: 50 },
        ],
      },
      {
        id: 'empty',
        label: '空箱',
        body: [{ kind: 'dialog', cue: { rows: [{ text: 'line.empty' }] } }],
      },
    ],
  })
  expect(() =>
    checkRuntimeScriptFlow(projected.entities[0]?.behaviors?.trigger?.collect?.flow, 'flow'),
  ).not.toThrow()
  detached.stages[0]!.label = 'changed'
  const reply = detached.stages[1]?.body[0]
  if (reply?.kind !== 'dialog') throw new Error('missing detached empty reply')
  reply.cue.rows.splice(0, 1)
  expect(authored).toEqual(before)
  expect(() => resolveAuthorDialogueTree(chest, {}, 'standalone', { items })).toThrow('缺所属实体')
})

test('grant lowering recursively preserves source identities and before/after ordering while runtime vocabulary stays closed', () => {
  const commands: AuthorCommand[] = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'ready', is: true },
      then: [{ kind: 'repeat', count: 2, body: [grant] }],
    },
  ]
  checkAuthorCommands(commands, 'commands')
  const expanded = expandAuthorScriptTree(commands, 'commands', { items })
  expect(expanded).toEqual([
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'ready', is: true },
      then: [
        {
          kind: 'repeat',
          count: 2,
          body: [
            { kind: 'dialog', cue },
            { kind: 'giveItem', itemId: 'herb', count: 3 },
            { kind: 'giveMoney', delta: 50 },
          ],
        },
      ],
    },
  ])
  const standard = resolveAuthorDialogueTree(
    [{ ...grant, notice: { kind: 'standard', timing: 'after' } }],
    {},
    'commands',
    { items },
  )
  expect(standard).toEqual([
    { kind: 'giveItem', itemId: 'herb', count: 3 },
    { kind: 'giveMoney', delta: 50 },
    {
      kind: 'dialog',
      cue: {
        slot: 'narration',
        rows: [{ reward: { kind: 'item', itemName: 'item.herb', count: 3 } }],
      },
    },
    {
      kind: 'dialog',
      cue: { slot: 'narration', rows: [{ reward: { kind: 'money', amount: 50 } }] },
    },
  ])
  expectExactError(
    () => checkRuntimeCommands([grant], 'runtime'),
    'runtime[0].kind: 未知或已退役的 current 命令 grantReward',
  )
  expectExactError(() => checkRuntimeScriptFlow(chest, 'runtime'), 'runtime.recipe: 未知字段')
  expect(() =>
    resolveAuthorDialogueTree([{ ...grant, notice: { kind: 'silent' } }], {}, 'commands', {
      items: [],
    }),
  ).toThrow('奖励物品不存在: herb')
})

test('pickup hides before presentation, hidden search after presentation, and repeatable search retains its empty reply', () => {
  const pickup: AuthorAcquisitionFlow = {
    kind: 'acquisition',
    recipe: 'builtin/item/pickup',
    stages: { available: { id: 'found' } },
    rewards: grant.rewards,
    notice: grant.notice,
  }
  const hidden: AuthorAcquisitionFlow = {
    kind: 'acquisition',
    recipe: 'builtin/item/search',
    afterCollect: 'disable',
    sound: 'sound.find',
    stages: chest.stages,
    rewards: grant.rewards,
    notice: grant.notice,
  }
  const repeat: AuthorAcquisitionFlow = {
    ...hidden,
    afterCollect: 'repeat',
    empty: { kind: 'custom', cue: { ...cue, rows: [{ text: 'line.empty' }] } },
  }
  expect(acquisitionPreviewStages(pickup)).toEqual([{ id: 'found' }])
  expect(expandAcquisitionFlow(pickup, self, items).stages[0]).toEqual({
    id: 'found',
    next: { kind: 'complete' },
    body: [
      { kind: 'setEntityState', target: self, state: 0 },
      { kind: 'clearDialog' },
      { kind: 'dialog', cue },
      { kind: 'giveItem', itemId: 'herb', count: 3 },
      { kind: 'giveMoney', delta: 50 },
    ],
  })
  expect(expandAcquisitionFlow(hidden, self, items).stages.map((stage) => stage.body)).toEqual([
    [
      { kind: 'playSound', asset: 'sound.find' },
      { kind: 'dialog', cue },
      { kind: 'giveItem', itemId: 'herb', count: 3 },
      { kind: 'giveMoney', delta: 50 },
      { kind: 'setEntityState', target: self, state: 0 },
    ],
    [],
  ])
  expect(expandAcquisitionFlow(repeat, self, items).stages[1]?.body).toEqual([
    { kind: 'dialog', cue: { ...cue, rows: [{ text: 'line.empty' }] } },
  ])
})

test('silent pickup projects its authored sound and rewards after hiding the owner', () => {
  const flow: AuthorAcquisitionFlow = {
    kind: 'acquisition',
    recipe: 'builtin/item/pickup',
    rewards: grant.rewards,
    notice: { kind: 'silent' },
    sound: 'sound.find',
    stages: { available: { id: 'found' } },
  }
  expect(resolveAuthorDialogueTree(flow, {}, 'pickup', { items, self })).toEqual({
    kind: 'stages',
    initial: 'found',
    stages: [
      {
        id: 'found',
        next: { kind: 'complete' },
        body: [
          { kind: 'setEntityState', target: self, state: 0 },
          { kind: 'clearDialog' },
          { kind: 'playSound', asset: 'sound.find' },
          { kind: 'giveItem', itemId: 'herb', count: 3 },
          { kind: 'giveMoney', delta: 50 },
        ],
      },
    ],
  })
})

test('repeat search retains a silent collected stage', () => {
  const flow: AuthorAcquisitionFlow = { ...search, notice: { kind: 'silent' } }
  expect(resolveAuthorDialogueTree(flow, {}, 'search', { items, self })).toEqual({
    kind: 'stages',
    initial: 'unopened',
    stages: [
      {
        id: 'unopened',
        label: '打开',
        next: 'empty',
        body: [
          { kind: 'giveItem', itemId: 'herb', count: 3 },
          { kind: 'giveMoney', delta: 50 },
        ],
      },
      { id: 'empty', label: '空箱', body: [] },
    ],
  })
})

test('scene-entry preparation accepts silent grants and rejects reward presentation before reveal', () => {
  const command: AuthorGrantRewardCommand = {
    kind: 'grantReward',
    rewards: [{ kind: 'money', amount: 50 }],
    notice: { kind: 'silent' },
  }
  function arrival(reward: AuthorGrantRewardCommand): AuthorSceneDef {
    return {
      ...acquisitionScene(chest),
      entities: [],
      hooks: {
        onEnter: {
          variants: {
            arrival: {
              label: 'Arrival',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'arrive',
                stages: [
                  {
                    id: 'arrive',
                    entry: { prepare: [reward], reveal: { kind: 'cut' } },
                    body: [],
                  },
                ],
              },
            },
          },
        },
      },
    }
  }
  const authored = arrival(command)
  expectAcceptsUnchanged((value) => validateAuthorScenes(value), [authored])
  const runtime = resolveAuthorDialogueTree(authored, {})
  expect(runtime.hooks?.onEnter?.variants.arrival?.flow.stages[0]?.entry?.prepare).toEqual([
    { kind: 'giveMoney', delta: 50 },
  ])
  expectExactError(
    () =>
      validateAuthorScenes([
        arrival({ ...command, notice: { kind: 'standard', timing: 'before' } }),
      ]),
    'scenes[0].hooks.onEnter.variants.arrival.flow.stages[0].entry.prepare[0]: 入场准备只允许静默发放奖励',
  )
})
