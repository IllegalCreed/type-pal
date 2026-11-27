import {
  buildEntityLifecycleReferenceIndex,
  buildWorld,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type RuntimeScriptFlow,
  validateRuntimeScenes,
} from '@type-pal/content'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from '../runtime-script-project.js'
import { hero } from './script-world-fixture.js'

export const flag = (name: string): Extract<RuntimeCommand, { kind: 'setFlag' }> => ({
  kind: 'setFlag',
  flag: name,
  value: true,
})
export const confirm = { kind: 'confirm', onYes: [], onNo: [] } satisfies RuntimeCommand
export const stage = (body: RuntimeCommand[]): RuntimeScriptFlow => ({
  kind: 'stages',
  initial: 'first',
  stages: [{ id: 'first', body }],
})
export const firstAndRepeat = (body: RuntimeCommand[] = []): RuntimeScriptFlow => ({
  kind: 'stages',
  initial: 'first',
  stages: [
    {
      id: 'first',
      body: [...body, flag('first'), { kind: 'wait', ms: 1 }, flag('childEnd')],
      next: 'last',
    },
    { id: 'last', body: [flag('childEnd')] },
  ],
})

export function fixture(overrides: Partial<ProjectScriptHostOptions> = {}) {
  const world = buildWorld({ party: ['hero'], money: 0, inventory: [] }, { hero })
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
        variants: { exit: { label: 'exit', order: 0, flow: firstAndRepeat() } },
      },
    },
  }
  validateRuntimeScenes([scene])
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
      entitiesNear: () => false,
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
