import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type RuntimeScriptFlow,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import scene231 from '../../../projects/pal/content/scenes/s231.json' with { type: 'json' }
import scene249 from '../../../projects/pal/content/scenes/s249.json' with { type: 'json' }
import scene250 from '../../../projects/pal/content/scenes/s250.json' with { type: 'json' }
import scene257 from '../../../projects/pal/content/scenes/s257.json' with { type: 'json' }
import scene277 from '../../../projects/pal/content/scenes/s277.json' with { type: 'json' }
import scene285 from '../../../projects/pal/content/scenes/s285.json' with { type: 'json' }
import oracle from './__tests__/pal-interactive-governance-oracle.json' with { type: 'json' }
import {
  interactiveGovernanceTrace,
  normalizeInteractiveWaits,
} from './__tests__/pal-interactive-governance-trace.js'
import { sha256Bytes } from './hash.js'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from './runtime-script-project.js'

const cases = [
  {
    scene: 's231',
    entity: undefined,
    parts: [14, 2, 2, 2, 2, 2, 2, 2, 77, 2, 2, 2, 2, 2, 2, 2, 2],
    hash: 'd026bffea1c6cb63433d56120315e2f10dc23688f605c85942c2a8498da372d2',
  },
  {
    scene: 's249',
    entity: 'e4394',
    parts: [3, 2, 2, 2, 1],
    hash: '33b131a864f3fed67ed8cb8445403d5d233671383c6a637f2ccca2e7040189eb',
  },
  {
    scene: 's250',
    entity: 'e4411',
    parts: [13, 2, 2, 29],
    hash: '3293c7a12c357e433f64524347d4bafd4cc904e123ef488300dd541e0b48ef42',
  },
  {
    scene: 's257',
    entity: 'e4550',
    parts: [4, 2, 2, 1],
    hash: 'a797b899c9bba777d0f5bb507a1b93c125f51b57b5e654d3f3d55ac22e681360',
  },
  {
    scene: 's277',
    entity: 'e4736',
    parts: [4, 2, 2, 1],
    hash: 'b7aa968dba6da87730de3aaa627161d2917ba7b4c123d8839f69df59087c21d9',
  },
  {
    scene: 's285',
    entity: 'e4807',
    parts: [3, 2, 2, 2, 1],
    hash: '5a71dea04d8644b04f2aac72401232e3529ecafc16aa53408a48ca054a65c163',
  },
] as const

const scenes = validateAuthorScenes([scene231, scene249, scene250, scene257, scene277, scene285])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const digest = 'b'.repeat(64)

test('wait trace projection sums only adjacent waits, preserving action and decision boundaries', () => {
  const command = (kind: string, ms?: number) => [
    'command',
    { kind, ...(ms === undefined ? {} : { ms }) },
  ]
  expect(
    normalizeInteractiveWaits([
      command('wait', 40),
      command('wait', 320),
      command('giveMoney'),
      command('wait', 100),
      ['condition', { kind: 'chance', percent: 10 }],
      command('wait', 200),
    ]),
  ).toEqual([
    command('wait', 360),
    command('giveMoney'),
    command('wait', 100),
    ['condition', { kind: 'chance', percent: 10 }],
    command('wait', 200),
  ])
})

function currentFlow(candidate: (typeof cases)[number]) {
  const scene = scenes.find((value) => value.id === candidate.scene)
  const flow = candidate.entity
    ? scene?.entities.find((entity) => entity.id === candidate.entity)?.behaviors?.trigger?.default
        ?.flow
    : scene?.hooks?.onEnter?.variants.default?.flow
  if (!flow || flow.kind !== 'stages') throw new Error(`${candidate.scene}: expected normal steps`)
  expect(flow.initial).toBe('initial')
  expect(flow.stages).toHaveLength(1)
  const stage = flow.stages[0]!
  expect(stage.id).toBe('initial')
  expect(stage.next).toBeUndefined()
  expect(stage.entry).toBeUndefined()
  expect(stage.body.length).toBeGreaterThan(0)
  return flow
}

test.each(
  cases,
)('$scene preserves four activations of every original leaf, decision, modal and next step', async (candidate) => {
  const current = resolveAuthorDialogueTree(currentFlow(candidate), actors)
  const key = `${candidate.scene}/${candidate.entity ?? ''}/default`
  const expected = Object.entries(oracle.cases).find(([value]) => value === key)?.[1]
  expect(expected).toBeDefined()
  const hashes: string[] = []
  for (const answer of [false, true])
    for (let mask = 0; mask < 8; mask++) {
      const trace = await interactiveGovernanceTrace(current, answer, mask)
      hashes.push(await sha256Bytes(new TextEncoder().encode(JSON.stringify(trace))))
    }
  expect(hashes).toEqual(expected)
})

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

const target = { scene: 'governance', entity: 'actor' }

function projectFixture(flow: RuntimeScriptFlow, override: Partial<ProjectScriptHostOptions> = {}) {
  const scene: RuntimeSceneDef = {
    id: target.scene,
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: target.entity,
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
        pages: [{ id: 'default', label: 'default', trigger: 'default' }],
        initialPage: 'default',
        behaviors: {
          trigger: {
            default: { label: 'default', order: 0, flow },
            alternate: {
              label: 'alternate',
              order: 1,
              flow: {
                kind: 'stages',
                initial: 'after',
                stages: [
                  { id: 'after', body: [{ kind: 'setFlag', flag: 'alternate-ran', value: true }] },
                ],
              },
            },
          },
        },
      },
    ],
  }
  const world: WorldState = {
    party: [],
    money: 0,
    inventory: [],
    learnedSkills: {},
    script: emptyWorldScriptState(),
  }
  const effects: RuntimeCommand[] = []
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    scene: () => scene,
    currentSceneId: () => scene.id,
    executeEffect: (command) => {
      effects.push(command)
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => world.money,
      inParty: () => false,
      entityInScene: () => true,
      facingEntity: () => true,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...override,
  })
  const activate = (signal = new AbortController().signal) =>
    runtime.runEntityBehavior(scene, target.entity, 'trigger', { signal })
  return { scene, world, effects, runtime, activate }
}

function oneStep(body: RuntimeCommand[]): RuntimeScriptFlow {
  return { kind: 'stages', initial: 'initial', stages: [{ id: 'initial', body }] }
}

test('ProjectRuntime stops a cancelled source at loadScene without late tail or cursor commit', async () => {
  const source = resolveAuthorDialogueTree(currentFlow(cases[1]), actors)
  const body: RuntimeCommand[] = [
    ...source.stages[0]!.body,
    { kind: 'setFlag', flag: 'illegal-late-tail', value: true },
  ]
  const controller = new AbortController()
  const observed: string[] = []
  const flow = oneStep(body)
  const fixture = projectFixture(flow, {
    executeEffect(command) {
      observed.push(command.kind)
      if (command.kind === 'loadScene') controller.abort()
    },
  })
  await expect(fixture.activate(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(observed.filter((kind) => kind === 'nudgeParty')).toHaveLength(4)
  expect(observed.at(-1)).toBe('loadScene')
  expect(fixture.world.script?.flags).toEqual({})
  expect(
    fixture.world.script?.behaviors.entities?.governance?.actor?.trigger?.cursor,
  ).toBeUndefined()
  expect(fixture.runtime.isEntityTriggerActive(target)).toBe(false)
})

test('ProjectRuntime interruption preserves prior effects and never commits the rest', async () => {
  const controller = new AbortController()
  const entered = deferred()
  const release = deferred()
  const body: RuntimeCommand[] = [
    { kind: 'setFlag', flag: 'committed', value: true },
    { kind: 'wait', ms: 100 },
    { kind: 'setFlag', flag: 'late', value: true },
  ]
  const fixture = projectFixture(oneStep(body), {
    async executeEffect(command) {
      if (command.kind !== 'wait') return
      entered.resolve()
      await release.promise
    },
  })
  const running = fixture.activate(controller.signal)
  await entered.promise
  expect(fixture.world.script?.flags).toEqual({ committed: true })
  expect(
    fixture.world.script?.behaviors.entities?.governance?.actor?.trigger?.cursor,
  ).toBeUndefined()
  controller.abort()
  release.resolve()
  await expect(running).rejects.toMatchObject({ name: 'AbortError' })
  expect(fixture.world.script?.flags).toEqual({ committed: true })
  expect(fixture.runtime.isEntityTriggerActive(target)).toBe(false)
})

test('ProjectRuntime cannot overwrite a self-selected replacement with the old completion cursor', async () => {
  const body: RuntimeCommand[] = [
    { kind: 'setFlag', flag: 'before-switch', value: true },
    {
      kind: 'selectEntityBehavior',
      target,
      channel: 'trigger',
      selection: { kind: 'use', value: 'alternate' },
    },
    { kind: 'setFlag', flag: 'same-activation-tail', value: true },
  ]
  const fixture = projectFixture(oneStep(body))
  await fixture.activate()
  expect(fixture.world.script?.flags).toEqual({
    'before-switch': true,
    'same-activation-tail': true,
  })
  expect(fixture.world.script?.behaviors.entities?.governance?.actor?.trigger).toEqual({
    selection: { kind: 'use', value: 'alternate' },
  })
  await fixture.activate()
  expect(fixture.world.script?.flags['alternate-ran']).toBe(true)
  expect(fixture.world.script?.behaviors.entities?.governance?.actor?.trigger?.cursor).toEqual({
    behavior: 'alternate',
    at: { kind: 'stage', stage: 'after' },
  })
})
