import {
  type AuthorItemCore,
  buildEntityLifecycleReferenceIndex,
  buildWorld,
  type RuntimeSceneDef,
  validateAuthorItems,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { executeWorldItemUse, runWorldItemScript } from './item-use-executor.js'
import { projectItemsView } from './runtime-project-view.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'

function item(
  id: string,
  effect: NonNullable<AuthorItemCore['use']>['effects'][number],
): AuthorItemCore {
  return {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: { target: 'scene', consuming: true, effects: [effect] },
  }
}
describe('current item script identity', () => {
  test('private owner and legal same-text shared ID never become the same runtime reference', () => {
    const rows = [
      item('owned', {
        kind: 'itemPrivateScript',
        script: { id: 'use', body: [{ kind: 'wait', ms: 1 }] },
      }),
      item('shared-caller', { kind: 'runScript', script: 'item:owned:use' }),
    ]
    validateAuthorItems(rows)
    const before = structuredClone(rows)
    const view = projectItemsView(Object.fromEntries(rows.map((row) => [row.id, row])))
    expect(view.owned!.use!.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-item-private-runtime', id: 'owned' } },
    ])
    expect(view['shared-caller']!.use!.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'item:owned:use' } },
    ])
    expect(rows).toEqual(before)
  })
  test('private ItemId is preserved byte-for-byte, including colon and non-ASCII characters', () => {
    const row = item('道具:自定义:use', {
      kind: 'itemPrivateScript',
      script: { id: 'use', body: [] },
    })
    validateAuthorItems([row])
    expect(projectItemsView({ [row.id]: row })[row.id]!.use!.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-item-private-runtime', id: row.id } },
    ])
  })
})

test.each([
  [{ chunk: '__author-item-private-runtime', id: 'other:owner' }, 'owner不符'],
  [{ chunk: 'unknown', id: 'owner' }, '非 current item script ref'],
] as const)('invalid runtime identity %o is rejected before any script runs', async (ref, message) => {
  let calls = 0
  const runtime = {
    async runSharedScript() {
      calls++
    },
    async runItemPrivateScript() {
      calls++
    },
  }
  await expect(
    runWorldItemScript(runtime, {}, 'owner', ref, { signal: new AbortController().signal }),
  ).rejects.toThrow(message)
  expect(calls).toBe(0)
})

test('real item executor and script runtime distinguish shared/private flags and commit item consumption', async () => {
  const privateId = '道具:owned:use'
  const sharedId = `item:${privateId}:use`
  const rows = [
    item(privateId, {
      kind: 'itemPrivateScript',
      script: { id: 'use', body: [{ kind: 'setFlag', flag: 'private-hit', value: true }] },
    }),
    item('shared-caller', { kind: 'runScript', script: sharedId }),
  ]
  validateAuthorItems(rows)
  const definitions = Object.fromEntries(rows.map((row) => [row.id, row]))
  const before = structuredClone(definitions)
  const projected = projectItemsView(definitions)
  const scene: RuntimeSceneDef = {
    id: 'test-scene',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
  for (const [itemId, flag] of [
    [privateId, 'private-hit'],
    ['shared-caller', 'shared-hit'],
  ]) {
    const world = buildWorld(
      { party: [], money: 0, inventory: [{ itemId: itemId!, count: 1 }] },
      {},
    )
    const runtime = new ScriptProjectRuntime(
      {
        sharedScripts: {
          [sharedId]: {
            name: 'shared',
            self: 'none',
            body: [{ kind: 'setFlag', flag: 'shared-hit', value: true }],
          },
        },
      },
      world,
      'a'.repeat(64),
      {
        lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
        scene: () => scene,
        currentSceneId: () => scene.id,
        executeEffect: (command) => {
          // The core mutates script state before notifying its host. Do not implement the effect here.
          expect(command.kind).toBe('setFlag')
          expect(world.script?.flags[flag!]).toBe(true)
        },
        query: {
          hasItem: () => false,
          ownsItem: () => false,
          itemEquipped: () => false,
          allFullHp: () => true,
          money: () => 0,
          inParty: () => false,
          entityInScene: () => false,
          facingEntity: () => false,
        },
        confirm: async () => true,
        startBattle: async () => 'victory',
        teleportOut: async () => true,
        wait: async () => {},
        waitWorldTick: async () => {},
        yieldMacroTask: async () => {},
      },
    )
    const controller = new AbortController()
    const execution = executeWorldItemUse({
      world,
      targetCharId: '',
      itemId: itemId!,
      items: projected,
      signal: controller.signal,
      host: {
        currentWorld: () => world,
        runScript: (ref, signal) =>
          runWorldItemScript(runtime, definitions, itemId!, ref, { signal: signal! }),
        runSceneHook: async () => {
          throw new Error('unexpected scene hook')
        },
        placeEntityInFront: async () => {
          throw new Error('unexpected placement')
        },
      },
    })
    const finished = await execution.then(
      (outcome) => ({ outcome }),
      (error) => ({ error }),
    )
    expect(finished).toHaveProperty('outcome')
    if (!('outcome' in finished)) throw new Error('unreachable after outcome assertion')
    const outcome = finished.outcome
    expect(outcome.status).toBe('success')
    expect(outcome.world.inventory).toEqual([])
    expect(outcome.world.script?.flags[flag!]).toBe(true)
    expect(
      outcome.world.script?.flags[flag === 'private-hit' ? 'shared-hit' : 'private-hit'],
    ).toBeUndefined()
    expect(definitions).toEqual(before)
  }
})
