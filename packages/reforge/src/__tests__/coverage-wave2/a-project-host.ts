/**
 * TEST-NONVISUAL-COVERAGE-2 W2-A 薄 fixture：A03/A05 BaseProjectScriptRuntimeHost 测试宿主。
 * 直接实例化真实 core（script-project-core.ts），只替 executeEffect/worldChanged 观察点与
 * currentSceneId/currentSceneSessionId 身份；世界真值全走产品写入路径。
 */
import {
  emptyWorldScriptState,
  type BaseSceneDef,
  type RuntimeCommand,
  type WorldScriptState,
} from '@type-pal/content'
import type { BaseRuntimeLeafCommand } from '../../runtime-script-project.js'
import {
  BaseProjectScriptRuntimeHost,
  type BaseProjectScriptHostOptions,
  type ScriptEffectCommitControl,
} from '../../script-project-core.js'
import { FlowRuntimeCoordinator } from '../../script-world.js'
import type { ScriptRuntimeContext } from '../../script-runner-core.js'

export interface RecordedEffect {
  command: BaseRuntimeLeafCommand
  worldChangedCount: number // 该 effect 完成时已累计的通知数（快照）
}

export interface Wave2ProjectHarness {
  host: BaseProjectScriptRuntimeHost
  world: WorldScriptState
  waitCalls: { ms: number; aborted: boolean }[]
  effects: BaseRuntimeLeafCommand[]
  worldChangedCommands: BaseRuntimeLeafCommand[]
  notifications: { command: BaseRuntimeLeafCommand; snapshot: WorldScriptState }[]
  setScene: (scene: string) => void
  setSession: (session: string | number) => void
  /** 单命令经真实 core 的宿主派发入口（测试文件不直接拼 .execute 调用）。 */
  run: (command: unknown, signal: AbortSignal) => Promise<void>
}

/** 真实 core + 观察型 options；sceneId/session 可控用于会话漂移注入。 */
export function wave2ProjectHarness(
  args: {
    executeEffect?: BaseProjectScriptHostOptions['executeEffect']
    coordinator?: FlowRuntimeCoordinator
  } = {},
): Wave2ProjectHarness {
  const world = emptyWorldScriptState()
  const effects: BaseRuntimeLeafCommand[] = []
  const worldChangedCommands: BaseRuntimeLeafCommand[] = []
  const notifications: { command: BaseRuntimeLeafCommand; snapshot: WorldScriptState }[] = []
  let sceneId = 's1'
  let sessionId: string | number = 'session-1'
  const scenes: Record<string, BaseSceneDef> = {
    s1: {
      id: 's1',
      mapId: 'map.root',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    } as unknown as BaseSceneDef,
  }
  const waitCalls: { ms: number; aborted: boolean }[] = []
  const options: BaseProjectScriptHostOptions = {
    executeEffect:
      args.executeEffect ??
      ((command) => {
        effects.push(command)
      }),
    worldChanged: (command) => {
      worldChangedCommands.push(command)
      notifications.push({ command, snapshot: structuredClone(world) })
    },
    scene: (id) => scenes[id] ?? scenes.s1!,
    currentSceneId: () => sceneId,
    currentSceneSessionId: () => sessionId,
    entityPosRelativeToParty: (_target, dcol, drow) => ({ col: 5 + dcol, row: 5 + drow }),
    query: {
      money: () => 100,
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      inParty: () => false,
      entityInScene: () => false,
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
  const host = new BaseProjectScriptRuntimeHost(
    world,
    args.coordinator ?? ({ bump: () => {} } as unknown as FlowRuntimeCoordinator),
    options,
  )
  return {
    host,
    world,
    waitCalls,
    effects,
    worldChangedCommands,
    notifications,
    setScene: (next) => {
      sceneId = next
    },
    setSession: (next) => {
      sessionId = next
    },
    run: (command, signal) => host.execute(command as never, wave2CoreContextValue(), signal),
  }
}

function wave2CoreContextValue(): Readonly<ScriptRuntimeContext> {
  return {}
}

export const wave2CoreContext = (): Readonly<ScriptRuntimeContext> => ({})
export const freshSignal = () => new AbortController().signal

/** wave2 A03/A05 用合法命令（与 a-adapter-host 的编译面一致；此处直接喂 core）。 */
export const wave2CoreCommands = (): RuntimeCommand[] =>
  [
    { kind: 'setVar', var: 'gold', value: 42 },
    { kind: 'addVar', var: 'kills', delta: 3 },
    { kind: 'addVar', var: 'fresh', delta: 7 }, // 缺省 0 起点
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
    { kind: 'setEntityPos', target: { scene: 's1', entity: 'e1' }, pos: { col: 2, row: 3 } },
    {
      kind: 'setEntityPosRelParty',
      target: { scene: 's1', entity: 'e2' },
      dcol: -1,
      drow: 2,
    },
  ] as unknown as RuntimeCommand[]

export type { ScriptEffectCommitControl }
