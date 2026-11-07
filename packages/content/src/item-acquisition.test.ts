import { expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import {
  type AuthorAcquisitionFlow,
  type AuthorCommand,
  type AuthorGrantRewardCommand,
  type AuthorSceneDef,
  acquisitionPreviewStages,
  assertAuthorDialogueReferences,
  type ContentBundle,
  checkAcquisitionFlow,
  checkAuthorCommands,
  checkAuthorDialogueCue,
  checkAuthorEntityBehaviors,
  checkAuthorEntityPages,
  checkAuthorSceneHooks,
  checkAuthorScriptFlow,
  checkGrantRewardCommand,
  checkRuntimeCommands,
  checkRuntimeScriptFlow,
  collectCanonicalActorTaggedReferences,
  collectCanonicalCommandAssetTaggedReferences,
  expandAcquisitionFlow,
  expandAuthorScriptTree,
  renameDialoguePortraitExpression,
  resolveAuthorDialogueTree,
  validateAuthorScenes,
  validateReferences,
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
function scene<Flow>(flow: Flow) {
  return {
    id: self.scene,
    mapId: 'map-island',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
    entities: [
      {
        id: self.entity,
        zone: true as const,
        pos: { col: 1, row: 1, height: 0 },
        behaviors: { trigger: { collect: { label: 'Collect', order: 0, flow } } },
        pages: [{ id: 'active', label: 'Active', trigger: 'collect' }],
        initialPage: 'active',
      },
    ],
  }
}

test('real author-scene boundary accepts a trigger recipe without expanding its stored parameters', () => {
  const authored: AuthorSceneDef = scene(chest)
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
          pages: [{ id: 'active', label: 'Active', auto: 'collect' }],
        },
      ],
    }
    expectExactError(
      () => validateAuthorScenes([invalid]),
      'scenes[0].entities[0].behaviors.auto.collect.flow: 取物流程只能属于实体交互方案',
    )
  } else {
    expectExactError(
      () =>
        validateAuthorScenes([
          {
            ...authored,
            hooks: {
              [owner]: { variants: { collect: { label: 'Invalid', order: 0, flow: chest } } },
            },
          },
        ]),
      `scenes[0].hooks.${owner}.variants.collect.flow: 取物流程只能属于实体交互方案`,
    )
  }
})

test('public behavior guard enables trigger recipes while keeping them out of auto behaviors', () => {
  const { behaviors } = scene(chest).entities[0]!
  expectAcceptsUnchanged((value) => checkAuthorEntityBehaviors(value, 'entity'), behaviors)
  expectExactError(
    () => checkAuthorEntityBehaviors({ auto: behaviors.trigger }, 'entity'),
    'entity.behaviors.auto.collect.flow: 取物流程只能属于实体交互方案',
  )
})

test('public page guard validates recipe-backed trigger pages and their behavior references', () => {
  const entity = scene(chest).entities[0]!
  expectAcceptsUnchanged(
    (pages) => checkAuthorEntityPages(pages, entity.behaviors, entity.initialPage, 'entity'),
    entity.pages,
  )
  expectExactError(
    () =>
      checkAuthorEntityPages(
        [{ ...entity.pages[0], trigger: 'missing' }],
        entity.behaviors,
        entity.initialPage,
        'entity',
      ),
    'entity.pages[0].trigger: 未命中 behavior missing',
  )
})

test.each([
  'onEnter',
  'onTeleport',
] as const)('public hook guard rejects recipes owned by %s', (slot) => {
  expectExactError(
    () =>
      checkAuthorSceneHooks(
        { [slot]: { variants: { collect: { label: 'Collect', order: 0, flow: chest } } } },
        'hooks',
      ),
    `hooks.${slot}.variants.collect.flow: 取物流程只能属于实体交互方案`,
  )
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

test('public grant assertion rejects a complete reward shape with a different command kind', () => {
  expectExactError(
    () => checkGrantRewardCommand({ ...grant, kind: 'giveItem' }, 'grant'),
    'grant.kind: 期望 grantReward',
  )
})

test('public acquisition assertion rejects a complete recipe shape with a different flow kind', () => {
  expectExactError(
    () => checkAcquisitionFlow({ ...chest, kind: 'stages' }, 'recipe'),
    'recipe.kind: 期望 acquisition',
  )
})

test.each([
  ['non-array rewards', null, 'rewards: 期望非空奖励数组'],
  ['empty rewards', [], 'rewards: 期望非空奖励数组'],
  ['non-object reward', [null], 'rewards[0]: 期望对象'],
  ['unknown reward kind', [{ kind: 'equipment' }], 'rewards[0].kind: 期望 item|money'],
  [
    'blank item identity',
    [{ kind: 'item', itemId: ' ', count: 1 }],
    'rewards[0].itemId: 期望非空字符串',
  ],
  [
    'zero item count',
    [{ kind: 'item', itemId: 'herb', count: 0 }],
    'rewards[0].count: 期望正安全整数',
  ],
  [
    'unsafe item count',
    [{ kind: 'item', itemId: 'herb', count: Number.MAX_SAFE_INTEGER + 1 }],
    'rewards[0].count: 期望正安全整数',
  ],
  ['negative money', [{ kind: 'money', amount: -1 }], 'rewards[0].amount: 期望正安全整数'],
  ['fractional money', [{ kind: 'money', amount: 1.5 }], 'rewards[0].amount: 期望正安全整数'],
  ['string money', [{ kind: 'money', amount: '50' }], 'rewards[0].amount: 期望正安全整数'],
  [
    'item with money parameter',
    [{ kind: 'item', itemId: 'herb', count: 1, amount: 50 }],
    'rewards[0].amount: 未知字段',
  ],
  [
    'money with item parameter',
    [{ kind: 'money', amount: 50, itemId: 'herb' }],
    'rewards[0].itemId: 未知字段',
  ],
])('author grant JSON rejects %s', (_name, rewards, error) => {
  expectExactError(
    () => checkAuthorCommands([{ ...grant, rewards }], 'commands'),
    `commands[0].${error}`,
  )
})

test.each([
  ['non-object notice', null, 'notice: 期望对象'],
  ['unknown notice', { kind: 'automatic' }, 'notice.kind: 期望 silent|standard|custom'],
  ['silent prompt', { kind: 'silent', cue }, 'notice.cue: 未知字段'],
  ['standard prompt', { kind: 'standard', timing: 'after', cue }, 'notice.cue: 未知字段'],
  ['standard without timing', { kind: 'standard' }, 'notice.timing: 期望 before|after'],
  [
    'custom during reward',
    { kind: 'custom', timing: 'during', cue },
    'notice.timing: 期望 before|after',
  ],
  ['custom without cue', { kind: 'custom', timing: 'before' }, 'notice.cue: 期望对象'],
])('author grant JSON rejects %s', (_name, notice, error) => {
  expectExactError(
    () => checkAuthorCommands([{ ...grant, notice }], 'commands'),
    `commands[0].${error}`,
  )
})

test.each([
  { kind: 'silent' },
  { kind: 'standard', timing: 'before' },
  { kind: 'custom', timing: 'after', cue },
] satisfies AuthorGrantRewardCommand['notice'][])('author grant boundary accepts $kind notice with positive safe reward limits', (notice) => {
  const commands: AuthorCommand[] = [
    {
      kind: 'grantReward',
      rewards: [
        { kind: 'item', itemId: 'herb', count: 1 },
        { kind: 'money', amount: Number.MAX_SAFE_INTEGER },
      ],
      notice,
    },
  ]
  expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), commands)
})

const search: AuthorAcquisitionFlow = {
  kind: 'acquisition',
  recipe: 'builtin/item/search',
  afterCollect: 'repeat',
  stages: chest.stages,
  rewards: grant.rewards,
  notice: grant.notice,
  empty: { kind: 'silent' },
}
const disabledSearch: AuthorAcquisitionFlow = {
  kind: 'acquisition',
  recipe: 'builtin/item/search',
  afterCollect: 'disable',
  stages: chest.stages,
  rewards: grant.rewards,
  notice: grant.notice,
}

test.each([
  ['unknown recipe', { ...chest, recipe: 'constructor' }, 'recipe: 未知内置取物流程'],
  [
    'duplicate step',
    { ...chest, stages: { available: { id: 'same' }, collected: { id: 'same' } } },
    'stages.collected.id: 步骤 ID 重复',
  ],
  [
    'missing collected step',
    { ...chest, stages: { available: { id: 'found' } } },
    'stages.collected: 期望对象',
  ],
  [
    'blank step identity',
    { ...chest, stages: { ...chest.stages, available: { id: ' ' } } },
    'stages.available.id: 期望非空字符串',
  ],
  [
    'blank step label',
    { ...chest, stages: { ...chest.stages, collected: { id: 'empty', label: ' ' } } },
    'stages.collected.label: 期望非空字符串',
  ],
  [
    'authored stage body',
    { ...chest, stages: { ...chest.stages, available: { id: 'found', body: [] } } },
    'stages.available.body: 未知字段',
  ],
  ['unexpected parameter', { ...chest, flag: 'claim' }, 'flag: 未知字段'],
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
    'empty: 未知字段',
  ],
  [
    'repeat search without empty reply',
    { ...disabledSearch, afterCollect: 'repeat' },
    'empty: 期望对象',
  ],
  [
    'standard empty reply',
    { ...search, empty: { kind: 'standard' } },
    'empty.kind: 期望 silent|custom',
  ],
  [
    'timed empty reply',
    { ...search, empty: { kind: 'custom', cue, timing: 'after' } },
    'empty.timing: 未知字段',
  ],
  [
    'invalid opening direction',
    { ...chest, opening: { facing: 'north', frame: 0 } },
    'opening.facing: 期望 up|down|left|right',
  ],
  [
    'negative opening frame',
    { ...chest, opening: { facing: 'down', frame: -1 } },
    'opening.frame: 期望非负安全整数',
  ],
  [
    'fractional opening frame',
    { ...chest, opening: { facing: 'down', frame: 0.5 } },
    'opening.frame: 期望非负安全整数',
  ],
  [
    'unsafe opening frame',
    { ...chest, opening: { facing: 'down', frame: Number.MAX_SAFE_INTEGER + 1 } },
    'opening.frame: 期望非负安全整数',
  ],
  [
    'blank opening sound',
    { ...chest, opening: { facing: 'down', frame: 0, sound: ' ' } },
    'opening.sound: 期望非空字符串',
  ],
  ['non-string search sound', { ...search, sound: 7 }, 'sound: 期望非空字符串'],
])('author trigger JSON rejects %s at its editable parameter', (_name, value, error) => {
  expectExactError(
    () => validateAuthorScenes([scene(value)]),
    `scenes[0].entities[0].behaviors.trigger.collect.flow.${error}`,
  )
})

test('standalone flow guard rejects an unknown search after-collect policy', () => {
  expectExactError(
    () => checkAuthorScriptFlow({ ...disabledSearch, afterCollect: 'hide' }, 'recipe'),
    'recipe.afterCollect: 期望 repeat|disable',
  )
})

test.each([
  {
    name: 'chest with zero frame and optional sound',
    flow: { ...chest, opening: { facing: 'down', frame: 0 }, empty: { kind: 'silent' } },
  },
  { name: 'search with disabled repeat interaction', flow: disabledSearch },
  {
    name: 'pickup with one stable stage and sound',
    flow: {
      kind: 'acquisition',
      recipe: 'builtin/item/pickup',
      rewards: grant.rewards,
      notice: { kind: 'silent' },
      sound: 'sound.find',
      stages: { available: { id: 'found' } },
    },
  },
] satisfies Array<{
  name: string
  flow: AuthorAcquisitionFlow
}>)('author flow and scene boundaries accept $name', ({ flow }) => {
  expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'recipe'), flow)
  expectAcceptsUnchanged((value) => validateAuthorScenes(value), [scene(flow)])
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
  expect(collectCanonicalCommandAssetTaggedReferences(flow, 'pickup')).toEqual([
    { asset: 'sound.find', expectedKind: 'sound', where: 'pickup.sound' },
  ])
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

test('repeat search retains a silent collected stage and only references a sound when authored', () => {
  const flow: AuthorAcquisitionFlow = { ...search, notice: { kind: 'silent' } }
  expect(collectCanonicalCommandAssetTaggedReferences(flow, 'search')).toEqual([])
  expect(
    collectCanonicalCommandAssetTaggedReferences({ ...flow, sound: 'sound.find' }, 'search'),
  ).toEqual([{ asset: 'sound.find', expectedKind: 'sound', where: 'search.sound' }])
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
      ...scene(chest),
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

test('recipe expression rename reaches both raw notice fields and preserves other actor expressions', () => {
  const actorCue = (actor: string, expression = 'sad') => ({
    ...cue,
    identity: {
      kind: 'actor' as const,
      actor,
      portrait: { kind: 'expression' as const, expression, side: 'right' as const },
    },
  })
  const flow: AuthorAcquisitionFlow = {
    ...chest,
    notice: { kind: 'custom', timing: 'before', cue: actorCue('spirit') },
    empty: { kind: 'custom', cue: actorCue('spirit') },
  }
  const input = [
    flow,
    {
      ...grant,
      notice: { kind: 'custom' as const, timing: 'after' as const, cue: actorCue('other') },
    },
  ]
  expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'recipe'), flow)
  expect(renameDialoguePortraitExpression(input, 'spirit', 'sad', 'calm')).toEqual({
    rewritten: 2,
    value: [
      {
        ...flow,
        notice: {
          kind: 'custom',
          timing: 'before',
          cue: actorCue('spirit', 'calm'),
        },
        empty: {
          kind: 'custom',
          cue: actorCue('spirit', 'calm'),
        },
      },
      {
        ...grant,
        notice: { kind: 'custom', timing: 'after', cue: actorCue('other') },
      },
    ],
  })
  expect(flow.notice).toEqual({ kind: 'custom', timing: 'before', cue: actorCue('spirit') })
  expect(flow.empty).toEqual({ kind: 'custom', cue: actorCue('spirit') })
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

function sharedCommandBundle(body: AuthorCommand[]): ContentBundle {
  return {
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    entryPoints: [],
    mapIndex: { version: 1, maps: [] },
    sharedScripts: {
      grant: {
        name: 'Grant',
        self: 'none',
        body,
      },
    },
  }
}

test('semantic item and reward-name references retain raw editable parameter paths', () => {
  const bundle = sharedCommandBundle([
    {
      kind: 'grantReward',
      rewards: [{ kind: 'item', itemId: 'missing', count: 1 }],
      notice: { kind: 'silent' },
    },
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'narration' },
        rows: [{ reward: { kind: 'item', itemName: 'item.missing', count: 2 } }],
      },
    },
  ])
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[0].rewards[0].itemId',
      message: '奖励物品 "missing" 不在 items',
    },
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[1].cue.rows[0].reward.itemName',
      message: '奖励物品名 "item.missing" 不在 locale',
    },
  ])
  bundle.items = [
    { id: 'missing', name: 'item.missing', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  ]
  bundle.locale['item.missing'] = 'Known item'
  expect(validateReferences(bundle)).toEqual([])
})

test('mixed custom reward rows diagnose item-name references at the raw notice path only', () => {
  const commands: AuthorCommand[] = [
    {
      ...grant,
      notice: {
        kind: 'custom',
        timing: 'after',
        cue: {
          identity: { kind: 'narration' },
          rows: [
            { reward: { kind: 'money', amount: 50 } },
            { reward: { kind: 'item', itemName: 'item.missing', count: 3 } },
            { text: 'line.reward' },
          ],
        },
      },
    },
  ]
  checkAuthorCommands(commands, 'commands')
  const bundle = sharedCommandBundle(commands)
  bundle.items = [
    { id: 'herb', name: 'item.herb', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  ]
  bundle.locale = { 'item.herb': '止血草', 'line.reward': '找到草药。' }
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[0].notice.cue.rows[1].reward.itemName',
      message: '奖励物品名 "item.missing" 不在 locale',
    },
  ])
  bundle.locale['item.missing'] = '止血草'
  expect(validateReferences(bundle)).toEqual([])
})

test('detached explicit reward rows reject mixed text and non-integral amounts at the author boundary', () => {
  expect(() =>
    checkAuthorDialogueCue(
      {
        identity: { kind: 'narration' },
        rows: [{ text: 'line', reward: { kind: 'money', amount: 5 } }],
      },
      'cue',
    ),
  ).toThrow('cue.rows[0].reward: 未知字段')
  expect(() =>
    checkAuthorDialogueCue(
      { identity: { kind: 'narration' }, rows: [{ reward: { kind: 'money', amount: 1.5 } }] },
      'cue',
    ),
  ).toThrow('cue.rows[0].reward.amount: 期望正安全整数')
})
