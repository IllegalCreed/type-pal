import { emptyWorldScriptState, validateAuthorItemCore } from '@type-pal/content'
import { expect, test } from 'vitest'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'
import { expectDefined } from './defined.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import {
  isRuntimeItemPrivateScriptRef,
  isRuntimeScriptRef,
  projectItemsView,
  runtimeProjectView,
} from './runtime-project-view.js'

test('the item view binds stable shared and private owners and detaches effect data', () => {
  const base = { name: 'Item', desc: ['Description'], buyPrice: 0, sellPrice: 0, sellable: false }
  const items = validateAuthorItemCore([
    {
      ...base,
      id: 'shared',
      use: {
        target: 'scene',
        consuming: false,
        effects: [{ kind: 'runScript', script: 'shared/greet' }],
      },
      throw: { target: 'oneEnemy', effects: [{ kind: 'fixedDamage', amount: 5 }] },
    },
    {
      ...base,
      id: 'private',
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'itemPrivateScript',
            script: { id: 'use', body: [{ kind: 'giveMoney', delta: 3 }] },
          },
        ],
      },
    },
    { ...base, id: 'plain' },
  ])
  const before = structuredClone(items)
  const view = projectItemsView(Object.fromEntries(items.map((item) => [item.id, item])))
  const shared = expectDefined(view.shared)
  const privateUse = expectDefined(view.private?.use)
  const sharedEffect = expectDefined(shared.use?.effects[0])
  const privateEffect = expectDefined(privateUse.effects[0])
  expect(sharedEffect).toEqual({
    kind: 'runScript',
    script: { chunk: '__author-script-runtime', id: 'shared/greet' },
  })
  expect(privateEffect).toEqual({
    kind: 'runScript',
    script: { chunk: '__author-item-private-runtime', id: 'private' },
  })
  if (sharedEffect.kind !== 'runScript' || privateEffect.kind !== 'runScript')
    throw new Error('missing runtime script refs')
  expect(isRuntimeScriptRef(sharedEffect.script)).toBe(true)
  expect(isRuntimeScriptRef(privateEffect.script)).toBe(false)
  expect(isRuntimeItemPrivateScriptRef(privateEffect.script)).toBe(true)
  expect(view.plain).toEqual({ ...base, id: 'plain' })
  const throwSpec = expectDefined(shared.throw)
  expect(throwSpec).toEqual({ target: 'oneEnemy', effects: [{ kind: 'fixedDamage', amount: 5 }] })

  throwSpec.effects.push({ kind: 'fixedDamage', amount: 9 })
  privateUse.effects.splice(0, 1)
  shared.desc.push('local presentation note')
  expect(items).toEqual(before)
})

test('boot uses the selected manifest entry and projects items while retaining project services', async () => {
  const fixture = await scenarioProject({
    items: [
      {
        id: 'scroll',
        name: 'Scroll',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'runScript', script: 'shared/greet' }],
        },
      },
    ],
    sharedScripts: {
      'shared/greet': { name: 'Greet', self: 'none', body: [{ kind: 'giveMoney', delta: 2 }] },
    },
  })
  const manifest = structuredClone(fixture.project.manifest)
  manifest.defaultEntryId = 'second'
  fixture.files['manifest.json'] = manifest
  const project = await loadCurrentProjectFrom(fixture.source)
  const before = structuredClone(project.manifest)

  const view = runtimeProjectView(project, emptyWorldScriptState())

  expect(view.entryScene.id).toBe('b')
  expect(view.entryScene).not.toBe(project.entryScene)
  expect(view.items.scroll?.use?.effects).toEqual([
    { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'shared/greet' } },
  ])
  expect(view.scriptStore).toBeUndefined()
  expect(Object.hasOwn(view, 'scriptStore')).toBe(true)
  expect(view.sceneIndex).toBe(project.sceneIndex)
  expect(view.actorsById).toBe(project.actorsById)
  expect(view.assetResolver).toBe(project.assetResolver)
  expect(project.manifest).toEqual(before)
  expect(Object.hasOwn(project.manifest, 'entryScene')).toBe(false)
  expect(Object.hasOwn(project.manifest, 'startWorld')).toBe(false)
})
