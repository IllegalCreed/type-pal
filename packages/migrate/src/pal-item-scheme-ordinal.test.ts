import { validateAuthorItems, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  scheme,
  schemeItem,
  schemeScene,
  selectBehavior,
} from './__tests__/item-scheme-fixtures.js'
import { inspectPalItemSchemeRoots } from './pal-item-scheme-labels.js'

function args(orphanLabel: string) {
  return {
    items: validateAuthorItems([schemeItem('292', '凤纹手绢', [selectBehavior('owned')])]),
    scenes: validateAuthorScenes([
      schemeScene('s001', {
        auto: {
          owned: scheme('凤纹手绢剧情方案', 1),
          orphan: scheme(orphanLabel, 2),
        },
      }),
    ]),
    expectedSchemes: 1,
    expectedItemRoots: 1,
  }
}

test('unrelated author label is outside the PAL item scheme root contract', () => {
  expect(inspectPalItemSchemeRoots(args('翻看左侧木匣')).labels).toEqual([
    {
      id: 'owned',
      itemId: '292',
      path: 'scenes.s001.entities.e1.behaviors.auto.owned',
      label: '凤纹手绢剧情方案',
    },
  ])
})

test('single-digit numbered item scheme with no root is rejected with its actual path', () => {
  expect(() => inspectPalItemSchemeRoots(args('凤纹手绢剧情方案 9'))).toThrow(
    'PAL 物品剧情方案零 item root: scenes.s001.entities.e1.behaviors.auto.orphan',
  )
})

test('two-digit numbered item scheme beginning with 1 also requires a root', () => {
  expect(() => inspectPalItemSchemeRoots(args('凤纹手绢剧情方案 10'))).toThrow(
    'PAL 物品剧情方案零 item root: scenes.s001.entities.e1.behaviors.auto.orphan',
  )
})
