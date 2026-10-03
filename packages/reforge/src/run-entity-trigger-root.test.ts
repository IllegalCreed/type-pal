import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { ScriptProjectRuntime } from './runtime-script-project.js'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function fixture(bodies: Record<string, RuntimeCommand[]>) {
  let session = 'original'
  const entered = new Map(Object.keys(bodies).map((id) => [id, deferred()]))
  const released = new Map(Object.keys(bodies).map((id) => [id, deferred()]))
  const scene: RuntimeSceneDef = {
    id: 'room',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: Object.entries(bodies).map(([id, body]) => ({
      id,
      zone: true,
      pos: { col: 1, row: 1, height: 0 },
      pages: [{ id: 'normal', label: 'normal', trigger: 'talk' }],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          talk: {
            label: 'talk',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body, next: { kind: 'complete' } }],
            },
          },
        },
      },
    })),
  }
  const world: WorldState = {
    party: [],
    inventory: [],
    learnedSkills: {},
    money: 0,
    script: emptyWorldScriptState(),
  }
  let sceneEffects = 0
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'd'.repeat(64), {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    currentSceneId: () => 'room',
    currentSceneSessionId: () => session,
    scene: () => scene,
    executeEffect: async (command, context) => {
      if (command.kind === 'loadScene') sceneEffects++
      if (command.kind !== 'wait') return
      const id = context.self?.entity
      if (!id || !entered.has(id) || !released.has(id)) throw new Error('missing child owner')
      entered.get(id)!.resolve()
      await released.get(id)!.promise
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => true,
    },
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  return {
    scene,
    world,
    runtime,
    entered,
    released,
    replaceSession: () => {
      session = 'replacement'
    },
    sceneEffects: () => sceneEffects,
  }
}

test('Root counter: replacing session during the last child effect must not commit completed cursor', async () => {
  const f = fixture({ b: [{ kind: 'wait', ms: 1 }] })
  const signal = new AbortController().signal
  const running = f.runtime.runCommands(
    [
      { kind: 'runEntityTrigger', target: { scene: 'room', entity: 'b' } },
      { kind: 'setFlag', flag: 'parent-tail', value: true },
    ],
    { signal },
  )
  await f.entered.get('b')!.promise
  f.replaceSession()
  f.released.get('b')!.resolve()
  await expect(running).rejects.toMatchObject({ name: 'AbortError' })
  expect(f.world.script!.flags).toEqual({})
  expect(f.world.script!.behaviors.entities?.room?.b?.trigger?.cursor).toBeUndefined()
})

test('Root counter: an earlier overlapping call cannot release its still-active sibling scope', async () => {
  const f = fixture({
    b: [{ kind: 'wait', ms: 1 }],
    c: [
      { kind: 'wait', ms: 1 },
      { kind: 'loadScene', scene: 'other' },
    ],
  })
  const signal = new AbortController().signal
  const first = f.runtime.runCommands(
    [{ kind: 'runEntityTrigger', target: { scene: 'room', entity: 'b' } }],
    { signal },
  )
  await f.entered.get('b')!.promise
  const second = f.runtime.runCommands(
    [{ kind: 'runEntityTrigger', target: { scene: 'room', entity: 'c' } }],
    { signal },
  )
  await f.entered.get('c')!.promise
  f.released.get('b')!.resolve()
  await first
  f.released.get('c')!.resolve()
  await expect(second).rejects.toThrow(/loadScene/)
  expect(f.sceneEffects()).toBe(0)
  await f.runtime.runCommands([{ kind: 'loadScene', scene: 'other' }], { signal })
  expect(f.sceneEffects()).toBe(1)
})
