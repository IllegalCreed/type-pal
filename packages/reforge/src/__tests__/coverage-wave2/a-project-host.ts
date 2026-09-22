/** Current compiler + current host; the shared core is reached through its real consumer. */
import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  validateRuntimeScenes,
  type WorldState,
} from '@type-pal/content'
import type { RuntimeLeafCommand } from '../../runtime-script-compiler.js'
import { compileRuntimeScriptFlow } from '../../runtime-script-compiler.js'
import {
  type ProjectScriptHostOptions,
  ProjectScriptRuntimeHost,
} from '../../runtime-script-project.js'
import { RuntimeScriptRunner } from '../../runtime-script-runner.js'
import { FlowRuntimeCoordinator } from '../../script-world.js'

export function wave2ProjectHarness(
  args: { executeEffect?: ProjectScriptHostOptions['executeEffect'] } = {},
) {
  const world = emptyWorldScriptState()
  const state: WorldState = { script: world, party: [], money: 0, inventory: [], learnedSkills: {} }
  const effects: RuntimeLeafCommand[] = []
  const worldChangedCommands: RuntimeLeafCommand[] = []
  const notifications: { command: RuntimeLeafCommand; snapshot: typeof world }[] = []
  let sceneId = 's1'
  let sessionId: string | number = 'session-1'
  const scene: RuntimeSceneDef = {
    id: 's1',
    mapId: 'map.root',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: ['e1', 'e2', 'a', 'b', 'z1', 'z2', 'm1'].map((id) => ({
      id,
      zone: true,
      pos: { col: 0, row: 0, height: 0 },
    })),
  }
  validateRuntimeScenes([scene])
  const waitCalls: { ms: number; aborted: boolean }[] = []
  const options: ProjectScriptHostOptions = {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    executeEffect:
      args.executeEffect ??
      ((command) => {
        effects.push(command)
      }),
    worldChanged: (command) => {
      worldChangedCommands.push(command)
      notifications.push({ command, snapshot: structuredClone(world) })
    },
    scene: () => scene,
    currentSceneId: () => sceneId,
    currentSceneSessionId: () => sessionId,
    entityPosRelativeToParty: (_target, dcol, drow) => ({
      col: 5 + dcol,
      row: 5 + drow,
      height: 0,
    }),
    query: {
      money: () => 100,
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      inParty: () => false,
      entityInScene: () => true,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async (ms, signal) => {
      waitCalls.push({ ms, aborted: signal.aborted })
    },
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
  const host = new ProjectScriptRuntimeHost(state, new FlowRuntimeCoordinator(), options)
  const runAll = async (commands: RuntimeCommand[], signal: AbortSignal) => {
    const compiled = compileRuntimeScriptFlow(
      { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: commands }] },
      { timing: 'interactive', canonicalContentDigest: 'a'.repeat(64) },
    )
    await new RuntimeScriptRunner(host, signal).runFlow(compiled, {
      cursor: { kind: 'stage', stage: 'start' },
      cursorController: { reachSafePoint: () => 'continue' },
    })
  }
  return {
    host,
    world,
    state,
    waitCalls,
    effects,
    worldChangedCommands,
    notifications,
    setScene: (next: string) => {
      sceneId = next
    },
    setSession: (next: string | number) => {
      sessionId = next
    },
    run: (command: RuntimeCommand, signal: AbortSignal) => runAll([command], signal),
    runAll,
  }
}
export type Wave2ProjectHarness = ReturnType<typeof wave2ProjectHarness>
export const wave2CoreCommands = (): RuntimeCommand[] => [
  { kind: 'setVar', var: 'gold', value: 42 },
  { kind: 'addVar', var: 'kills', delta: 3 },
  { kind: 'addVar', var: 'fresh', delta: 7 },
  { kind: 'setScreenWave', level: 2, progression: 9 },
  { kind: 'setEntityState', target: { scene: 's1', entity: 'e1' }, state: 5 },
  {
    kind: 'setMultiEntityState',
    targets: [
      { scene: 's1', entity: 'a' },
      { scene: 's1', entity: 'b' },
    ],
    state: 6,
  },
  {
    kind: 'setEntityPos',
    target: { scene: 's1', entity: 'e1' },
    pos: { col: 2, row: 3, height: 0 },
  },
  { kind: 'setEntityPosRelParty', target: { scene: 's1', entity: 'e2' }, dcol: -1, drow: 2 },
]
