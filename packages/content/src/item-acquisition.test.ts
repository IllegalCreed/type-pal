import { expect, test } from 'vitest'
import {
  type AuthorAcquisitionFlow,
  type AuthorCommand,
  type AuthorGrantRewardCommand,
  type AuthorSceneDef,
  acquisitionPreviewStages,
  assertAuthorDialogueReferences,
  checkAuthorCommands,
  checkAuthorScriptFlow,
  checkRuntimeCommands,
  checkRuntimeScriptFlow,
  collectCanonicalActorTaggedReferences,
  collectCanonicalCommandAssetTaggedReferences,
  expandAcquisitionFlow,
  expandAuthorScriptTree,
  resolveAuthorDialogueTree,
  validateAuthorScenes,
} from './index.js'

const items = [{ id: 'herb', name: 'item.herb' }]
const self = { scene: 'island', entity: 'chest' }
const cue = { identity: { kind: 'narration' as const }, rows: [{ text: 'line.reward' }] }
const grant: AuthorGrantRewardCommand = {
  kind: 'grantReward',
  rewards: [
    { kind: 'item', itemId: 'herb', count: 3 },
    { kind: 'money', amount: 50 },
  ],
  notice: { kind: 'custom', timing: 'before', cue },
}
const chest: AuthorAcquisitionFlow = {
  kind: 'acquisition',
  recipe: 'builtin/item/chest',
  rewards: grant.rewards,
  notice: grant.notice,
  opening: { facing: 'down', frame: 1, sound: 'sound.open' },
  stages: {
    available: { id: 'unopened', label: '打开' },
    collected: { id: 'empty', label: '空箱' },
  },
  empty: { kind: 'custom', cue: { ...cue, rows: [{ text: 'line.empty' }] } },
}
function scene(flow: AuthorAcquisitionFlow): AuthorSceneDef {
  return {
    id: self.scene,
    mapId: 'map-island',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: self.entity,
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
        behaviors: { trigger: { collect: { label: 'Collect', order: 0, flow } } },
        pages: [{ id: 'active', label: 'Active', trigger: 'collect' }],
        initialPage: 'active',
      },
    ],
  }
}

test('real author-scene boundary accepts a trigger recipe without expanding its stored parameters', () => {
  const authored = scene(chest)
  const before = JSON.stringify(authored)
  expect(validateAuthorScenes([authored])).toEqual([authored])
  const detached = expandAcquisitionFlow(chest, self, items)
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
  expect(projected.entities[0]?.behaviors?.trigger?.collect?.flow).toEqual(
    resolveAuthorDialogueTree(detached, {}),
  )
  expect(() =>
    checkRuntimeScriptFlow(projected.entities[0]?.behaviors?.trigger?.collect?.flow, 'flow'),
  ).not.toThrow()
  detached.stages[0]!.label = 'changed'
  expect(JSON.stringify(authored)).toBe(before)
  expect(() => resolveAuthorDialogueTree(chest, {}, 'standalone', { items })).toThrow('缺所属实体')
})

test.each([
  'auto',
  'onEnter',
  'onTeleport',
] as const)('owned acquisition cannot be attached to %s', (owner) => {
  const authored = scene(chest)
  if (owner === 'auto') {
    const invalid = {
      ...authored,
      entities: [
        {
          ...authored.entities[0],
          behaviors: { auto: { collect: { label: 'Invalid', order: 0, flow: chest } } },
          pages: undefined,
          initialPage: undefined,
        },
      ],
    }
    expect(() => validateAuthorScenes([invalid])).toThrow('只能属于实体交互方案')
  } else {
    expect(() =>
      validateAuthorScenes([
        {
          ...authored,
          hooks: {
            [owner]: { variants: { collect: { label: 'Invalid', order: 0, flow: chest } } },
          },
        },
      ]),
    ).toThrow('只能属于实体交互方案')
  }
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
  expect(() => checkRuntimeCommands([grant], 'runtime')).toThrow('grantReward')
  expect(() => checkRuntimeScriptFlow(chest, 'runtime')).toThrow()
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

test.each([
  ['unknown recipe', { ...chest, recipe: 'constructor' }, '.recipe'],
  [
    'duplicate step',
    { ...chest, stages: { available: { id: 'same' }, collected: { id: 'same' } } },
    'ID 重复',
  ],
  ['zero count', { ...chest, rewards: [{ kind: 'item', itemId: 'herb', count: 0 }] }, '.count'],
  ['unexpected parameter', { ...chest, flag: 'claim' }, '.flag'],
  ['silent contains a prompt', { ...chest, notice: { kind: 'silent', cue } }, '.notice.cue'],
  [
    'disabled search carries empty reply',
    {
      kind: 'acquisition',
      recipe: 'builtin/item/search',
      afterCollect: 'disable',
      stages: chest.stages,
      rewards: grant.rewards,
      notice: grant.notice,
      empty: { kind: 'silent' },
    },
    '.empty',
  ],
])('recipe schema rejects %s', (_name, value, error) => {
  expect(() => checkAuthorScriptFlow(value, 'recipe')).toThrow(error)
})

test('raw recipe references locate actual presentation parameters, including repeat feedback actor expressions', () => {
  const flow: AuthorAcquisitionFlow = {
    ...chest,
    notice: {
      kind: 'custom',
      timing: 'before',
      cue: {
        identity: { kind: 'unbound', portrait: { asset: 'portrait.sign', side: 'left' } },
        rows: [{ text: 'line.reward' }],
      },
    },
    empty: {
      kind: 'custom',
      cue: {
        identity: {
          kind: 'actor',
          actor: 'spirit',
          portrait: { kind: 'expression', expression: 'sad', side: 'right' },
        },
        rows: [{ text: 'line.empty' }],
      },
    },
  }
  expect(collectCanonicalCommandAssetTaggedReferences(flow, 'flow')).toEqual([
    { asset: 'sound.open', expectedKind: 'sound', where: 'flow.opening.sound' },
    {
      asset: 'portrait.sign',
      expectedKind: 'portrait',
      where: 'flow.notice.cue.identity.portrait.asset',
    },
  ])
  expect(collectCanonicalActorTaggedReferences(flow, 'flow')).toEqual([
    { actorId: 'spirit', kind: 'dialogue-actor', where: 'flow.empty.cue.identity.actor' },
  ])
  expect(() => assertAuthorDialogueReferences(flow, {})).toThrow('未知 Actor "spirit"')
})
