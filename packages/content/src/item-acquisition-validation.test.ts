import { expect, test } from 'vitest'
import {
  acquisitionScene,
  chest,
  cue,
  disabledSearch,
  grant,
  search,
} from './__tests__/item-acquisition-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import {
  type AuthorAcquisitionFlow,
  type AuthorCommand,
  type AuthorGrantRewardCommand,
  checkAcquisitionFlow,
  checkAuthorCommands,
  checkAuthorDialogueCue,
  checkAuthorEntityBehaviors,
  checkAuthorEntityPages,
  checkAuthorSceneHooks,
  checkAuthorScriptFlow,
  checkGrantRewardCommand,
  validateAuthorScenes,
} from './index.js'

test.each([
  'auto',
  'onEnter',
  'onTeleport',
] as const)('owned acquisition cannot be attached to %s', (owner) => {
  const authored = acquisitionScene(chest)
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
  const { behaviors } = acquisitionScene(chest).entities[0]!
  expectAcceptsUnchanged((value) => checkAuthorEntityBehaviors(value, 'entity'), behaviors)
  expectExactError(
    () => checkAuthorEntityBehaviors({ auto: behaviors.trigger }, 'entity'),
    'entity.behaviors.auto.collect.flow: 取物流程只能属于实体交互方案',
  )
})

test('public page guard validates recipe-backed trigger pages and their behavior references', () => {
  const entity = acquisitionScene(chest).entities[0]!
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
    'array opening direction',
    { ...chest, opening: { ...chest.opening, facing: ['down'] } },
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
    () => validateAuthorScenes([acquisitionScene(value)]),
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
  expectAcceptsUnchanged((value) => validateAuthorScenes(value), [acquisitionScene(flow)])
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
