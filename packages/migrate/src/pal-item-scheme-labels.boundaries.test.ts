import { validateAuthorItems, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  scheme,
  schemeItem,
  schemeScene,
  selectBehavior,
  selectHook,
} from './__tests__/item-scheme-fixtures.js'
import { inspectPalItemSchemeRoots } from './pal-item-scheme-labels.js'

function firstScene() {
  return schemeScene(
    's001',
    { auto: { search: scheme('信物剧情方案', 10) } },
    {
      onEnter: { variants: { entry: scheme('信物剧情方案 2', 20, [selectBehavior('search')]) } },
    },
  )
}

function firstItem() {
  return schemeItem('292', '信物', [selectHook('entry')])
}

test('reports independent expected counts for schemes and root items', () => {
  const args = {
    items: validateAuthorItems([firstItem()]),
    scenes: validateAuthorScenes([firstScene()]),
    expectedSchemes: 2,
    expectedItemRoots: 1,
  }
  expect(() => inspectPalItemSchemeRoots({ ...args, expectedSchemes: 3 })).toThrow(
    'PAL 物品剧情方案数量漂移: 2 != 3',
  )
  expect(() => inspectPalItemSchemeRoots({ ...args, expectedItemRoots: 2 })).toThrow(
    'PAL 物品剧情方案 item root 数漂移: 1 != 2',
  )
})

test('same scheme ID names remain independent across both scenes and behavior channels', () => {
  const next = schemeScene(
    's002',
    {
      auto: { search: scheme('饰物剧情方案 2', 10) },
      trigger: { search: scheme('饰物剧情方案', 5) },
    },
    {
      onEnter: {
        variants: {
          entry: scheme('饰物剧情方案 3', 20, [
            selectBehavior('search', 's002'),
            selectBehavior('search', 's002', 'trigger'),
          ]),
        },
      },
    },
  )
  const input = {
    items: validateAuthorItems([
      firstItem(),
      schemeItem('293', '饰物', [selectHook('entry', 's002')]),
    ]),
    scenes: validateAuthorScenes([firstScene(), next]),
    expectedSchemes: 5,
    expectedItemRoots: 2,
  }
  const before = structuredClone(input)
  const report = inspectPalItemSchemeRoots(input)
  expect(report.labels).toEqual([
    {
      id: 'search',
      itemId: '292',
      path: 'scenes.s001.entities.e1.behaviors.auto.search',
      label: '信物剧情方案',
    },
    {
      id: 'entry',
      itemId: '292',
      path: 'scenes.s001.hooks.onEnter.variants.entry',
      label: '信物剧情方案 2',
    },
    {
      id: 'search',
      itemId: '293',
      path: 'scenes.s002.entities.e1.behaviors.trigger.search',
      label: '饰物剧情方案',
    },
    {
      id: 'search',
      itemId: '293',
      path: 'scenes.s002.entities.e1.behaviors.auto.search',
      label: '饰物剧情方案 2',
    },
    {
      id: 'entry',
      itemId: '293',
      path: 'scenes.s002.hooks.onEnter.variants.entry',
      label: '饰物剧情方案 3',
    },
  ])
  expect(input).toEqual(before)
})

test('two paths from one item count the shared destination once without a cycle', () => {
  const result = inspectPalItemSchemeRoots({
    items: validateAuthorItems([
      schemeItem('292', '信物', [selectHook('entry'), selectBehavior('search')]),
    ]),
    scenes: validateAuthorScenes([firstScene()]),
    expectedSchemes: 2,
    expectedItemRoots: 1,
  })
  expect(result.labels.map(({ id, itemId }) => [id, itemId])).toEqual([
    ['search', '292'],
    ['entry', '292'],
  ])
})
