import type { AuthorSceneDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { type CanonicalScriptEditorContext, describeCanonicalCommand } from './ScriptEditor.js'

const scene: AuthorSceneDef = {
  id: 's003',
  mapId: 'inn',
  entry: { pos: { col: 0, row: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e56',
      sprite: 'aunt',
      pos: { col: 2, row: 3 },
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
