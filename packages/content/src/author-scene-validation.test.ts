import { expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { AuthorSceneDef } from './author-scene.js'
import { validateAuthorScenes } from './validate-author.js'

function sceneWithDialogue() {
  const { scene, entity } = createReferenceProject()
  const actor = {
    ...entity,
    initialPage: 'default',
    pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
    behaviors: {
      trigger: {
        talk: {
          label: '对话',
          order: 0,
          flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: [] }] },
        },
      },
    },
  } satisfies AuthorSceneDef['entities'][number]
  return { scene, actor }
}

test('preserves entity IDs when display labels match or are absent', () => {
  const { scene, actor } = sceneWithDialogue()
  const input = [
    {
      ...scene,
      entities: [
        { ...actor, id: 'guard', label: '苗人' },
        { ...actor, id: 'chief', label: '苗人' },
        { ...actor, id: 'merchant' },
      ],
    },
  ]
  const before = deepSnapshot(input)
  expect(validateAuthorScenes(input)).toEqual(before)
  expect(input).toEqual(before)
  expect(input[0]?.entities.map((entity) => entity.id)).toEqual(['guard', 'chief', 'merchant'])
})

test.each([
  { label: 'empty', value: '' },
  { label: 'whitespace', value: '   ' },
  { label: 'null', value: null },
  { label: 'number', value: 42 },
  { label: 'object', value: {} },
  { label: 'array', value: [] },
])('rejects an explicit $label entity label', ({ value }) => {
  const { scene, actor } = sceneWithDialogue()
  const input = [{ ...scene, entities: [{ ...actor, label: value }] }]
  expect(() => validateAuthorScenes(input)).toThrow(
    new Error('scenes[0].entities[0].label: 期望非空字符串'),
  )
})

test('keeps a named page behavior and a named teleport hook through validation', () => {
  const { scene, actor } = sceneWithDialogue()
  const input = [
    {
      ...scene,
      entities: [actor],
      hooks: {
        onTeleport: {
          initial: 'leave',
          variants: { leave: { ...actor.behaviors.trigger.talk, label: '离场' } },
        },
      },
    },
  ] satisfies AuthorSceneDef[]
  const before = deepSnapshot(input)
  expect(validateAuthorScenes(input)).toEqual(before)
  expect(input).toEqual(before)
})

test('rejects a scene hook outside hooks and an inline page trigger', () => {
  const { scene, actor } = sceneWithDialogue()
  expect(() => validateAuthorScenes([{ ...scene, onEnter: [] }])).toThrow(
    new Error('scenes[0].onEnter: current 作者态脚本必须位于 hooks.onEnter'),
  )
  const invalidPage = { ...actor.pages[0], trigger: { on: 'interact', stages: [{ body: [] }] } }
  expect(() =>
    validateAuthorScenes([{ ...scene, entities: [{ ...actor, pages: [invalidPage] }] }]),
  ).toThrow(new Error('scenes[0].entities[0].pages[0].trigger: 期望非空字符串'))
})

test('allows a behavior registry without pages and rejects an orphaned initial page', () => {
  const { scene, actor } = sceneWithDialogue()
  const { initialPage, pages: _pages, ...withoutPages } = actor
  const control = [{ ...scene, entities: [withoutPages] }]
  const before = deepSnapshot(control)
  expect(validateAuthorScenes(control)).toEqual(before)
  expect(() =>
    validateAuthorScenes([{ ...scene, entities: [{ ...withoutPages, initialPage }] }]),
  ).toThrow(new Error('scenes[0].entities[0].initialPage: 必须与非空 pages 一起声明'))
})
