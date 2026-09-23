/** D04: the current diagnostic caller uses FromVisits; old ScriptIndex/Chunk scanners are not revived. */
import { checkAuthorScriptLibrary } from '@type-pal/content'
import { expect, test } from 'vitest'
import { collectCanonicalScriptCommandVisits, type ScriptEditorState } from './script-editor.js'
import {
  buildCanonicalSceneEntryReferenceIndexFromVisits,
  sceneEntryReferenceKey,
} from './script-references.js'

test('canonical named-entry references group by scene and entry identity and retain exact command locators', () => {
  const state: ScriptEditorState = {
    scenes: [],
    items: [],
    sharedScripts: {
      first: {
        name: 'First',
        self: 'none',
        body: [
          { kind: 'loadScene', scene: 'a', entryId: 'door' },
          { kind: 'wait', ms: 1 },
          { kind: 'loadScene', scene: 'a' },
        ],
      },
      second: {
        name: 'Second',
        self: 'none',
        body: [
          { kind: 'loadScene', scene: 'a', entryId: 'door' },
          { kind: 'loadScene', scene: 'b', entryId: 'door' },
        ],
      },
    },
  }
  checkAuthorScriptLibrary(state.sharedScripts)
  const before = structuredClone(state),
    visits = collectCanonicalScriptCommandVisits(state)
  const index = buildCanonicalSceneEntryReferenceIndexFromVisits(state, visits)
  expect([...index.keys()].sort()).toEqual(['["a","door"]', '["b","door"]'])
  expect(
    index.get(sceneEntryReferenceKey('a', 'door'))?.map((entry) => ({
      target: entry.targetSceneId,
      entry: entry.entryId,
      path: entry.path,
      canonical: entry.canonical,
    })),
  ).toEqual(
    [0, 3].map((i) => ({
      target: 'a',
      entry: 'door',
      path: visits[i]!.path,
      canonical: { kind: 'command', path: visits[i]!.path, locator: visits[i]!.locator },
    })),
  )
  expect(index.get(sceneEntryReferenceKey('b', 'door'))?.map((entry) => entry.path)).toEqual([
    'sharedScripts.second.body[1]',
  ])
  expect(index.get(sceneEntryReferenceKey('missing', 'door'))).toBeUndefined()
  expect(state).toEqual(before)
})
test('scene-entry tuple keys never merge delimiter-bearing scene and entry identities', () => {
  expect(sceneEntryReferenceKey('a/b', 'c')).not.toBe(sceneEntryReferenceKey('a', 'b/c'))
  expect(sceneEntryReferenceKey('a', 'door')).not.toBe(sceneEntryReferenceKey('b', 'door'))
})
