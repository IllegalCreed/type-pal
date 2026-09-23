import { checkAuthorScriptLibrary } from '@type-pal/content'
import { expect, test } from 'vitest'
import { referenceProject } from '../__tests__/coverage-wave2/d-reference-project.js'
import {
  collectCurrentProjectDeletionImpact,
  createCurrentProjectReferenceIndexProvider,
} from './project-reference-adapters.js'

test('current provider observes canonical-session replacement on the same shell without retaining old variable edges', async () => {
  const { state, canonical } = await referenceProject()
  let current = {
    ...canonical,
    sharedScripts: {
      main: {
        name: 'Main',
        self: 'none' as const,
        body: [{ kind: 'setFlag' as const, flag: 'flag.first', value: true }],
      },
    },
  }
  checkAuthorScriptLibrary(current.sharedScripts)
  const provider = createCurrentProjectReferenceIndexProvider(() => current)
  const before = structuredClone({ state, current })
  const first = provider(state).referencesTo({ kind: 'world-variable', id: 'flag.first' })
  expect(first.map(({ target, relation, where }) => ({ target, relation, where }))).toEqual([
    {
      target: { kind: 'world-variable', id: 'flag.first' },
      relation: { kind: 'world-variable', variableKind: 'flag', access: 'write' },
      where: 'sharedScripts.main.body[0].flag',
    },
  ])
  expect({ state, current }).toEqual(before)
  current = {
    ...current,
    sharedScripts: {
      main: {
        name: 'Main',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'flag.second', value: true }],
      },
    },
  }
  checkAuthorScriptLibrary(current.sharedScripts)
  const nextBefore = structuredClone(current)
  const next = provider(state)
  expect(next.referencesTo({ kind: 'world-variable', id: 'flag.first' })).toEqual([])
  expect(
    next.referencesTo({ kind: 'world-variable', id: 'flag.second' }).map((edge) => edge.where),
  ).toEqual(['sharedScripts.main.body[0].flag'])
  expect(first[0]!.target).toEqual({ kind: 'world-variable', id: 'flag.first' })
  expect(current).toEqual(nextBefore)
  expect(state).toEqual(before.state)
})
test('co-deleting the actual shared-script owner removes its blocker while another source remains', async () => {
  const { state, canonical } = await referenceProject()
  canonical.sharedScripts = {
    first: {
      name: 'Same label',
      self: 'none',
      body: [{ kind: 'setFlag', flag: 'used', value: true }],
    },
    second: {
      name: 'Same label',
      self: 'none',
      body: [{ kind: 'setFlag', flag: 'used', value: false }],
    },
  }
  checkAuthorScriptLibrary(canonical.sharedScripts)
  const provider = createCurrentProjectReferenceIndexProvider(() => canonical),
    before = structuredClone({ state, canonical })
  const target = { kind: 'world-variable', id: 'used' } as const
  const all = collectCurrentProjectDeletionImpact(provider, state, target)
  expect(all.blockers.map((edge) => edge.where).sort()).toEqual([
    'sharedScripts.first.body[0].flag',
    'sharedScripts.second.body[0].flag',
  ])
  const partial = collectCurrentProjectDeletionImpact(provider, state, target, [
    target,
    { kind: 'shared-script', id: 'first' },
  ])
  expect(partial.blockers.map((edge) => edge.where)).toEqual(['sharedScripts.second.body[0].flag'])
  expect(partial.warnings).toEqual([])
  expect(
    collectCurrentProjectDeletionImpact(provider, state, target, [
      target,
      { kind: 'shared-script', id: 'first' },
      { kind: 'shared-script', id: 'second' },
    ]),
  ).toEqual({ references: [], blockers: [], warnings: [] })
  expect({ state, canonical }).toEqual(before)
})
