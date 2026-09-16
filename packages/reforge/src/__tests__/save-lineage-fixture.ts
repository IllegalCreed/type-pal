import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type RuntimeScriptFlow,
  type WorldState,
} from '@type-pal/content'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from '../runtime-script-project.js'

export function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

export const flag = (name: string): Extract<RuntimeCommand, { kind: 'setFlag' }> => ({
  kind: 'setFlag',
  flag: name,
  value: true,
})
export const confirm = { kind: 'confirm', onNo: [] } satisfies RuntimeCommand
export const stage = (body: RuntimeCommand[]): RuntimeScriptFlow => ({
  kind: 'stages',
  initial: 'first',
  stages: [{ id: 'first', body }],
})
export const machine = (body: RuntimeCommand[] = []): RuntimeScriptFlow => ({
  kind: 'stateMachine',
  machine: {
    id: 'exit',
    label: '出口',
    initial: 'first',
    states: {
      first: {
        label: 'first',
        body: [...body, flag('first')],
        next: { kind: 'to', state: 'last', yield: 'macroTask' },
      },
      last: { label: 'last', body: [flag('childEnd')], next: { kind: 'stay' } },
    },
  },
})

export function fixture(overrides: Partial<ProjectScriptHostOptions> = {}) {
  const world: WorldState = {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: emptyWorldScriptState(),
  }
  const scene: RuntimeSceneDef = {
    id: 's',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e',
        zone: true,
        pos: { col: 0, row: 0, height: 0 },
        initialPage: 'p',
        pages: [
          { id: 'p', label: 'p', trigger: 'b', triggerActivation: { on: 'interact', range: 1 } },
        ],
        behaviors: { trigger: { b: { label: 'b', order: 0, flow: stage([]) } } },
      },
    ],
    hooks: {
      onTeleport: {
        initial: 'exit',
        variants: { exit: { label: 'exit', order: 0, flow: machine() } },
      },
    },
  }
  const controller = new AbortController()
  const options: ProjectScriptHostOptions = {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    scene: () => scene,
    currentSceneId: () => scene.id,
    currentSceneSessionId: () => 1,
    executeEffect() {},
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
    teleportOut: (signal) => runtime.runSceneHook(scene, 'onTeleport', { signal }),
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...overrides,
  }
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'c'.repeat(64), options)
  return { world, scene, controller, signal: controller.signal, options, runtime }
}
