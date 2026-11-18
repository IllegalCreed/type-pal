import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'
import { rewriteExplicitSceneReferences } from './command-target-reference.js'

test('scene copy rewrites explicit local targets and retains external and implicit targets', () => {
  const body: AuthorCommand[] = [
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'currentScene', scene: 'source' },
          { kind: 'currentScene', scene: 'external' },
        ],
      },
      then: [
        { kind: 'loadScene', scene: 'source', entryId: 'door' },
        {
          kind: 'selectSceneHooks',
          scene: 'source',
          selection: { onEnter: { kind: 'use', value: 'arrival' } },
        },
        {
          kind: 'moveEntity',
          target: { scene: 'source', entity: 'npc' },
          to: { col: 2, row: 3, height: 0 },
          speed: 'normal',
        },
        {
          kind: 'moveEntity',
          target: { scene: 'external', entity: 'guard' },
          to: { col: 1, row: 4, height: 0 },
          speed: 'fast',
        },
        { kind: 'setSceneMapOverride', scene: 'source', mapId: 'map-a' },
        { kind: 'setSceneMapOverride', mapId: 'map-current' },
      ],
    },
  ]
  checkAuthorCommands(body, 'body')
  const before = deepSnapshot(body)
  expect(rewriteExplicitSceneReferences(body, 'source', 'copy')).toEqual([
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'currentScene', scene: 'copy' },
          { kind: 'currentScene', scene: 'external' },
        ],
      },
      then: [
        { kind: 'loadScene', scene: 'copy', entryId: 'door' },
        {
          kind: 'selectSceneHooks',
          scene: 'copy',
          selection: { onEnter: { kind: 'use', value: 'arrival' } },
        },
        {
          kind: 'moveEntity',
          target: { scene: 'copy', entity: 'npc' },
          to: { col: 2, row: 3, height: 0 },
          speed: 'normal',
        },
        {
          kind: 'moveEntity',
          target: { scene: 'external', entity: 'guard' },
          to: { col: 1, row: 4, height: 0 },
          speed: 'fast',
        },
        { kind: 'setSceneMapOverride', scene: 'copy', mapId: 'map-a' },
        { kind: 'setSceneMapOverride', mapId: 'map-current' },
      ],
    },
  ])
  expect(body).toEqual(before)
})

test.each([
  ['', 'copy'],
  ['source', ''],
])('scene copy rejects empty identity (%j -> %j) before modifying input', (source, target) => {
  const body: AuthorCommand[] = [{ kind: 'loadScene', scene: 'source' }]
  checkAuthorCommands(body, 'body')
  const before = deepSnapshot(body)
  expect(() => rewriteExplicitSceneReferences(body, source, target)).toThrow(
    'source/target SceneId 必须非空',
  )
  expect(body).toEqual(before)
})

test('changing a copied dialogue row object does not change the source scene', () => {
  const body = [
    {
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'source' }] },
    },
  ] satisfies AuthorCommand[]
  checkAuthorCommands(body, 'body')
  const before = deepSnapshot(body)
  const copied = rewriteExplicitSceneReferences(body, 'source', 'copy')
  expect(copied).toEqual(before)

  const copiedRow = copied[0]?.cue.rows[0]
  if (!copiedRow) throw new Error('copy lost the dialogue row')
  copiedRow.text = 'changed copy'
  expect(body).toEqual(before)
})
