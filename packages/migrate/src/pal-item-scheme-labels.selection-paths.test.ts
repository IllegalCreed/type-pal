import { type AuthorCommand, validateAuthorItems, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  scheme,
  schemeItem,
  schemeScene,
  selectBehavior,
  selectHook,
} from './__tests__/item-scheme-fixtures.js'
import { inspectPalItemSchemeRoots } from './pal-item-scheme-labels.js'

test('visits each distinct destination in nested author command arms', () => {
  const body: AuthorCommand[] = [
    {
      kind: 'branch',
      cond: { kind: 'inParty', actorId: 'li-xiaoyao' },
      then: [selectBehavior('present')],
      else: [selectBehavior('absent')],
    },
    { kind: 'branch', cond: { kind: 'inParty', actorId: 'anu' }, then: [] },
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'inParty', actorId: 'anu' },
      body: [selectBehavior('duringLoop'), { kind: 'breakLoop' }],
    },
    {
      kind: 'startBattle',
      enemyTeamId: 'team-1',
      onLose: [selectBehavior('battleLost')],
      onFlee: [selectBehavior('battleFled')],
    },
    { kind: 'startBattle', enemyTeamId: 'team-2' },
    { kind: 'teleportOut', onFail: [selectBehavior('teleportFailed')] },
    { kind: 'teleportOut' },
    { kind: 'wait', ms: 100 },
  ]
  const result = inspectPalItemSchemeRoots({
    items: validateAuthorItems([schemeItem('292', '信物', body)]),
    scenes: validateAuthorScenes([
      schemeScene('s001', {
        auto: {
          present: scheme('同行', 0),
          absent: scheme('等候', 1),
          duringLoop: scheme('巡查', 2),
          battleLost: scheme('败退', 3),
          battleFled: scheme('撤离', 4),
          teleportFailed: scheme('返回受阻', 5),
        },
      }),
    ]),
    expectedSchemes: 6,
    expectedItemRoots: 1,
  })
  expect(result.labels.map(({ id }) => id)).toEqual([
    'present',
    'absent',
    'duringLoop',
    'battleLost',
    'battleFled',
    'teleportFailed',
  ])
})

test('follows explicit scene and entity choices inside flows and ignores inherit or disabled selections', () => {
  const scene = schemeScene(
    's001',
    {
      auto: {
        first: scheme('初次查看', 0, [
          {
            kind: 'selectEntityBehavior',
            target: { scene: 's001', entity: 'e1' },
            channel: 'auto',
            selection: { kind: 'inherit' },
          },
          { kind: 'selectSceneHooks', scene: 's001', selection: { onEnter: { kind: 'disabled' } } },
          selectBehavior('second'),
          {
            kind: 'selectSceneHooks',
            scene: 's001',
            selection: { onTeleport: { kind: 'use', value: 'leaving' } },
          },
        ]),
        second: scheme('再次查看', 2),
      },
    },
    {
      onEnter: { variants: { arriving: scheme('入场提示', 1) } },
      onTeleport: { variants: { leaving: scheme('离开提示', 3) } },
    },
  )
  const result = inspectPalItemSchemeRoots({
    items: validateAuthorItems([
      schemeItem('292', '信物', [selectBehavior('first'), selectHook('arriving')]),
    ]),
    scenes: validateAuthorScenes([scene]),
    expectedSchemes: 4,
  })
  expect(result.labels.map(({ id }) => id)).toEqual(['first', 'arriving', 'second', 'leaving'])
})

test('rejects a duplicate address even when the source scene itself is valid', () => {
  const source = schemeScene('s001', { auto: { search: scheme('信物剧情方案', 0) } })
  const scenes = validateAuthorScenes([source])
  expect(() =>
    inspectPalItemSchemeRoots({
      items: validateAuthorItems([schemeItem('292', '信物', [selectBehavior('search')])]),
      scenes: [...scenes, ...scenes],
      expectedSchemes: 1,
    }),
  ).toThrow('PAL 物品剧情方案节点重复: scenes.s001.entities.e1.behaviors.auto.search')
})

test('rejects a tied order and ID across two otherwise valid destinations of one item', () => {
  const scene = schemeScene(
    's001',
    { auto: { search: scheme('查看道具', 5) } },
    {
      onEnter: { variants: { search: scheme('到场提示', 5) } },
    },
  )
  const input = {
    items: validateAuthorItems([
      schemeItem('292', '信物', [selectBehavior('search'), selectHook('search')]),
    ]),
    scenes: validateAuthorScenes([scene]),
    expectedSchemes: 2,
  }
  expect(() => inspectPalItemSchemeRoots(input)).toThrow(
    'PAL 物品剧情方案 order + id 不唯一: scenes.s001.entities.e1.behaviors.auto.search / scenes.s001.hooks.onEnter.variants.search',
  )
})
