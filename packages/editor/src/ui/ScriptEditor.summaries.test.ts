import type { AuthorCommand, AuthorCondition, AuthorSceneDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { type CanonicalScriptEditorContext, describeCanonicalCommand } from './ScriptEditor.js'

const scene: AuthorSceneDef = {
  id: 's003',
  mapId: 'inn',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e56',
      sprite: 'aunt',
      pos: { col: 2, row: 3, height: 0 },
      pages: [{ id: 'default', label: '厨房阶段' }],
      initialPage: 'default',
      behaviors: {
        trigger: {
          'go-to-kitchen': {
            label: '让逍遥去厨房',
            order: 0,
            flow: { kind: 'stages', initial: 'talk', stages: [{ id: 'talk', body: [] }] },
          },
        },
      },
    },
  ],
}
const assetReader: EditorAssetReader = {
  projectId: 'test',
  record: () => {
    throw new Error('summary must not read assets')
  },
  readBytes: async () => {
    throw new Error('summary must not read assets')
  },
  readRoleBytes: async () => {
    throw new Error('summary must not read assets')
  },
  urlFor: async () => {
    throw new Error('summary must not read assets')
  },
}
const context: CanonicalScriptEditorContext = {
  state: {
    scenes: [scene],
    items: [],
    sharedScripts: {
      'beggar-first-talk': { name: '醉道士首次交谈', self: 'none', body: [] },
    },
  },
  currentSceneId: 's003',
  shellScenes: [],
  locale: { greeting: '吃饭啦' },
  assetCatalog: { version: 1, assets: {} },
  assetReader,
  audioResolver: assetReader,
  references: { choices: () => [], has: () => false, label: (_kind, id) => id },
  battleSprites: [],
}
const target = { scene: 's003', entity: 'e56' }

test('explicit entity invocation shows a named stable target and its waiting/current-scene contract', () => {
  const summary = describeCanonicalCommand({ kind: 'runEntityTrigger', target }, conditionContext)
  expect(summary.label).toBe('大厅李大娘 · e56 执行交互方案')
  expect(summary.detail).toContain('等执行完成后继续')
  expect(summary.detail).toContain('切场、战斗在调用返回后编排')
})

const conditionContext: CanonicalScriptEditorContext = {
  ...context,
  shellScenes: [
    {
      ...scene,
      entities: [
        { id: 'e56', label: '大厅李大娘', sprite: 'aunt', pos: { col: 1, row: 2, height: 0 } },
      ],
    },
    {
      ...scene,
      id: 's001',
      entities: [
        { id: 'e56', label: '厨房李大娘', sprite: 'aunt', pos: { col: 1, row: 2, height: 0 } },
      ],
    },
  ],
  references: {
    ...context.references,
    label: (kind, id) =>
      kind === 'item' && id === 'wine'
        ? '酒葫芦'
        : kind === 'actor' && id === 'hero'
          ? '李逍遥'
          : id,
  },
}

test.each([
  { condition: { kind: 'hasItem', itemId: 'wine', atLeast: 2 }, expected: '持有物品 酒葫芦≥2' },
  {
    condition: { kind: 'ownsItem', itemId: 'wine', atLeast: 3 },
    expected: '拥有物品 酒葫芦≥3（背包与装备合计）',
  },
  {
    condition: { kind: 'itemEquipped', itemId: 'wine', atLeast: 2 },
    expected: '装备物品 酒葫芦≥2',
  },
  { condition: { kind: 'inParty', actorId: 'hero' }, expected: '队伍含 李逍遥' },
  {
    condition: { kind: 'facingEntity', target, range: 3 },
    expected: '面向实体 大厅李大娘 · e56（3 格内）',
  },
] satisfies Array<{
  condition: AuthorCondition
  expected: string
}>)('branch and loop preserve readable condition requirements: $condition.kind', ({
  condition,
  expected,
}) => {
  expect(
    describeCanonicalCommand({ kind: 'branch', cond: condition, then: [] }, conditionContext).label,
  ).toBe(`如果 ${expected}`)
  expect(
    describeCanonicalCommand(
      {
        kind: 'loop',
        mode: 'while',
        cond: condition,
        yield: 'worldTick',
        maxIterations: 2,
        body: [],
      },
      conditionContext,
    ).label,
  ).toBe(`当 ${expected}`)
})

test('mixed nested conditions keep named references, thresholds and full entity addresses together', () => {
  const command: AuthorCommand = {
    kind: 'branch',
    cond: {
      kind: 'all',
      of: [
        { kind: 'hasItem', itemId: 'wine', atLeast: 2 },
        {
          kind: 'any',
          of: [
            { kind: 'inParty', actorId: 'hero' },
            {
              kind: 'not',
              cond: { kind: 'facingEntity', target: { scene: 's001', entity: 'e56' }, range: 4 },
            },
          ],
        },
        { kind: 'facingEntity', target, range: 1 },
      ],
    },
    then: [],
  }
  const label = describeCanonicalCommand(command, conditionContext).label
  expect(label).toContain('持有物品 酒葫芦≥2')
  expect(label).toContain('队伍含 李逍遥')
  expect(label).toContain('s001 / 厨房李大娘 · e56（4 格内）')
  expect(label).toContain('大厅李大娘 · e56（1 格内）')
})

test('canonical movement summary reads unsaved instance labels from the property session', () => {
  const namedContext = {
    ...context,
    shellScenes: [
      {
        ...scene,
        entities: [
          {
            id: 'e56',
            sprite: 'aunt',
            label: '大厅李大娘',
            pos: { col: 2, row: 3, height: 0 },
          },
        ],
      },
    ],
  }
  const command = {
    kind: 'moveEntity' as const,
    target,
    to: { col: 9, row: 8, height: 0 },
    speed: 'fast' as const,
  }
  expect(describeCanonicalCommand(command, namedContext).label).toContain('大厅李大娘')
  expect(describeCanonicalCommand(command, namedContext).label).toContain('e56')
  expect(describeCanonicalCommand(command, context).label).not.toContain('大厅李大娘')
})

test.each([
  { kind: 'setEntityState', target, state: 0 },
  { kind: 'setEntityFacing', target, facing: 'up' },
  { kind: 'setEntityFrame', target, frame: 1 },
  { kind: 'setEntityPos', target, pos: { col: 1, row: 2, height: 0 } },
  { kind: 'setEntityLayer', target, layer: 1 },
  { kind: 'takeEntity', target },
  { kind: 'releaseEntity', target },
  { kind: 'hideEntity', target, ticks: 2 },
  { kind: 'restoreEntity', target },
  { kind: 'removeEntity', target },
] satisfies AuthorCommand[])('all entity command paths show the current instance name: $kind', (command) => {
  const namedContext = {
    ...context,
    shellScenes: [
      {
        ...scene,
        entities: [
          {
            id: 'e56',
            sprite: 'aunt',
            label: '大厅李大娘',
            pos: { col: 2, row: 3, height: 0 },
          },
        ],
      },
    ],
  }
  expect(describeCanonicalCommand(command, namedContext).label).toContain('大厅李大娘 · e56')
})

test('cross-scene equal IDs and nested conditions resolve their full address', () => {
  const nextContext = {
    ...context,
    shellScenes: [
      {
        ...scene,
        entities: [
          { id: 'e56', sprite: 'aunt', label: '大厅李大娘', pos: { col: 1, row: 2, height: 0 } },
        ],
      },
      {
        ...scene,
        id: 's001',
        entities: [
          { id: 'e56', sprite: 'aunt', label: '厨房李大娘', pos: { col: 1, row: 2, height: 0 } },
        ],
      },
    ],
  }
  expect(
    describeCanonicalCommand(
      { kind: 'setEntityState', target: { scene: 's001', entity: 'e56' }, state: 2 },
      nextContext,
    ).label,
  ).toContain('s001 / 厨房李大娘 · e56')
  const described = describeCanonicalCommand(
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'entityInScene', target },
          {
            kind: 'not',
            cond: { kind: 'entityState', target: { scene: 's001', entity: 'e56' }, is: 0 },
          },
        ],
      },
      then: [],
    },
    nextContext,
  )
  expect(described.label).toContain('大厅李大娘 · e56')
  expect(described.label).toContain('s001 / 厨房李大娘 · e56')
})

test('behavior, page and shared-call summaries resolve semantic names', () => {
  expect(
    describeCanonicalCommand(
      {
        kind: 'selectEntityBehavior',
        target,
        channel: 'trigger',
        selection: { kind: 'use', value: 'go-to-kitchen' },
      },
      context,
    ).detail,
  ).toBe('让逍遥去厨房')
  expect(
    describeCanonicalCommand(
      { kind: 'selectEntityPage', target, selection: { kind: 'use', value: 'default' } },
      context,
    ).detail,
  ).toBe('厨房阶段')
  expect(
    describeCanonicalCommand({ kind: 'callScript', script: 'beggar-first-talk' }, context).detail,
  ).toBe('醉道士首次交谈')
  expect(
    describeCanonicalCommand(
      {
        kind: 'selectEntityBehavior',
        target,
        channel: 'trigger',
        selection: { kind: 'use', value: 'missing' },
      },
      context,
    ).detail,
  ).toContain('未解析')
})

test('trigger and movement summaries show actionable distance and speed', () => {
  expect(
    describeCanonicalCommand(
      {
        kind: 'setEntityTriggerActivation',
        target,
        selection: { kind: 'use', value: { on: 'interact', range: 0 } },
      },
      context,
    ).detail,
  ).toBe('主动交互 · 1 格内')
  expect(
    describeCanonicalCommand(
      {
        kind: 'setEntityTriggerActivation',
        target,
        selection: { kind: 'use', value: { on: 'touch' } },
      },
      context,
    ).detail,
  ).toBe('靠近触发 · 0 格内')
  expect(
    describeCanonicalCommand(
      {
        kind: 'setEntityTriggerActivation',
        target,
        selection: { kind: 'use', value: { on: 'interact', range: 2 } },
      },
      context,
    ).detail,
  ).toBe('主动交互 · 2 格内')
  expect(
    describeCanonicalCommand(
      {
        kind: 'setEntityTriggerActivation',
        target,
        selection: { kind: 'use', value: { on: 'touch', range: 3 } },
      },
      context,
    ).detail,
  ).toBe('靠近触发 · 3 格内')
  expect(
    describeCanonicalCommand(
      { kind: 'moveEntity', target, to: { col: 9, row: 8, height: 2 }, speed: 'fast' },
      context,
    ).detail,
  ).toBe('(9, 8) · 快走 · 高度 2')
})

test('dialogue keeps content and presentation flags, not the long asset identifier', () => {
  const result = describeCanonicalCommand(
    {
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'unbound',
          portrait: { asset: 'portrait.pal.original.055', side: 'left' },
        },
        rows: [{ text: 'greeting' }],
        slot: 'top',
      },
    },
    context,
  )
  expect(result.label).toBe('吃饭啦')
  expect(result.detail).toBe('顶部 · 显示立绘')
  expect(JSON.stringify(result)).not.toContain('portrait.pal')
})
