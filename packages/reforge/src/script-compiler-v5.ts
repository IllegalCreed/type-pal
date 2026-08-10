import {
  type AuthorCommandV5,
  type AuthorConditionV5,
  type AuthorSceneEntryPresentationV5,
  checkAuthorCommandsV5,
  checkScriptFlowV5,
  checkSharedScriptLibraryV5,
  type EntityAddress,
  type ScriptFlowV5,
  type SharedAuthorScriptV5,
  type SharedScriptLibraryV5,
  type StateTransitionV5,
} from '@type-pal/content'

export const SCRIPT_COMPILER_V5_VERSION = 2 as const

export type ScriptTimingV5 = 'auto' | 'interactive'
export type ScriptBoundaryPolicyV5 = 'perCommand' | 'transition'

export interface ExecutableCommandBoundaryV5 {
  kind: 'wait'
  ms: 100
}

type StartBattleCommandV5 = Extract<AuthorCommandV5, { kind: 'startBattle' }>
type RuntimeLeafCommandV5 = Exclude<
  AuthorCommandV5,
  | { kind: 'branch' }
  | { kind: 'callScript' }
  | { kind: 'confirm' }
  | { kind: 'loop' }
  | { kind: 'startBattle' }
  | { kind: 'stopScript' }
  | { kind: 'teleportOut' }
>

interface ExecutableCommandBaseV5 {
  after: readonly ExecutableCommandBoundaryV5[]
}

export type ExecutableCommandV5Like<RuntimeLeafCommand> =
  | (ExecutableCommandBaseV5 & {
      kind: 'leaf'
      command: RuntimeLeafCommand
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'stop'
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'branch'
      cond: AuthorConditionV5
      then: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
      else: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'loop'
      mode: 'while' | 'until'
      cond: AuthorConditionV5
      body: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
      maxIterations: number
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'confirm'
      id?: string
      onNo: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'startBattle'
      request: Omit<StartBattleCommandV5, 'kind' | 'onLose' | 'onFlee'>
      onLose?: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
      onFlee?: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'teleportOut'
      onFail?: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBaseV5 & {
      kind: 'callScript'
      script: string
      self?: EntityAddress
    })

export type ExecutableCommandV5 = ExecutableCommandV5Like<RuntimeLeafCommandV5>

export interface ExecutableSceneEntryV5Like<RuntimeLeafCommand> {
  prepare: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
  reveal: AuthorSceneEntryPresentationV5['reveal']
}

export type ExecutableSceneEntryV5 = ExecutableSceneEntryV5Like<RuntimeLeafCommandV5>

export interface ExecutableStageV5Like<RuntimeLeafCommand> {
  id: string
  entry?: ExecutableSceneEntryV5Like<RuntimeLeafCommand>
  body: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
  next?: string
}

export type ExecutableStageV5 = ExecutableStageV5Like<RuntimeLeafCommandV5>

export interface ExecutableStateV5Like<RuntimeLeafCommand> {
  label: string
  entry?: ExecutableSceneEntryV5Like<RuntimeLeafCommand>
  body: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
  next: StateTransitionV5
}

export type ExecutableStateV5 = ExecutableStateV5Like<RuntimeLeafCommandV5>

export type ExecutableScriptFlowBodyV5Like<RuntimeLeafCommand> =
  | {
      kind: 'stages'
      initial: string
      stages: readonly ExecutableStageV5Like<RuntimeLeafCommand>[]
    }
  | {
      kind: 'stateMachine'
      machine: {
        id: string
        label: string
        initial: string
        states: Readonly<Record<string, ExecutableStateV5Like<RuntimeLeafCommand>>>
      }
    }

export type ExecutableScriptFlowBodyV5 =
  ExecutableScriptFlowBodyV5Like<RuntimeLeafCommandV5>

export interface ExecutableScriptFlowV5Like<RuntimeLeafCommand> {
  compilerVersion: typeof SCRIPT_COMPILER_V5_VERSION
  canonicalContentDigest: string
  timing: ScriptTimingV5
  boundaryPolicy: ScriptBoundaryPolicyV5
  flow: ExecutableScriptFlowBodyV5Like<RuntimeLeafCommand>
}

export type ExecutableScriptFlowV5 = ExecutableScriptFlowV5Like<RuntimeLeafCommandV5>

export interface ExecutableSharedScriptV5Like<RuntimeLeafCommand> {
  compilerVersion: typeof SCRIPT_COMPILER_V5_VERSION
  canonicalContentDigest: string
  timing: ScriptTimingV5
  boundaryPolicy: ScriptBoundaryPolicyV5
  id: string
  name: string
  self: SharedAuthorScriptV5['self']
  body: readonly ExecutableCommandV5Like<RuntimeLeafCommand>[]
}

export type ExecutableSharedScriptV5 = ExecutableSharedScriptV5Like<RuntimeLeafCommandV5>

export interface CompileScriptFlowV5Options {
  canonicalContentDigest: string
  timing: ScriptTimingV5
  allowSceneEntry?: boolean
  forbidLoadScene?: boolean
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function checkDigest(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('canonicalContentDigest: 期望小写 SHA-256')
}

function boundaries(
  timing: ScriptTimingV5,
  boundaryPolicy: ScriptBoundaryPolicyV5,
): readonly ExecutableCommandBoundaryV5[] {
  return timing === 'auto' && boundaryPolicy === 'perCommand' ? [{ kind: 'wait', ms: 100 }] : []
}

function compileEntry(
  entry: AuthorSceneEntryPresentationV5,
  timing: ScriptTimingV5,
  boundaryPolicy: ScriptBoundaryPolicyV5,
): ExecutableSceneEntryV5 {
  return {
    prepare: compileAuthorCommandsV5UncheckedAfterValidation(entry.prepare, timing, boundaryPolicy),
    reveal: clone(entry.reveal),
  }
}

function compileAuthorCommandV5(
  command: AuthorCommandV5,
  timing: ScriptTimingV5,
  boundaryPolicy: ScriptBoundaryPolicyV5,
): ExecutableCommandV5 {
  const after = boundaries(timing, boundaryPolicy)
  switch (command.kind) {
    case 'stopScript':
      return { kind: 'stop', after }
    case 'branch':
      return {
        kind: 'branch',
        cond: clone(command.cond),
        then: compileAuthorCommandsV5UncheckedAfterValidation(command.then, timing, boundaryPolicy),
        else: compileAuthorCommandsV5UncheckedAfterValidation(command.else ?? [], timing, boundaryPolicy),
        after,
      }
    case 'loop':
      return {
        kind: 'loop',
        mode: command.mode,
        cond: clone(command.cond),
        body: compileAuthorCommandsV5UncheckedAfterValidation(command.body, timing, boundaryPolicy),
        maxIterations: command.maxIterations,
        after,
      }
    case 'confirm':
      return {
        kind: 'confirm',
        ...(command.id === undefined ? {} : { id: command.id }),
        onNo: compileAuthorCommandsV5UncheckedAfterValidation(command.onNo, timing, boundaryPolicy),
        after,
      }
    case 'startBattle': {
      const { kind: _kind, onLose, onFlee, ...request } = command
      return {
        kind: 'startBattle',
        request: clone(request),
        ...(onLose === undefined
          ? {}
          : { onLose: compileAuthorCommandsV5UncheckedAfterValidation(onLose, timing, boundaryPolicy) }),
        ...(onFlee === undefined
          ? {}
          : { onFlee: compileAuthorCommandsV5UncheckedAfterValidation(onFlee, timing, boundaryPolicy) }),
        after,
      }
    }
    case 'teleportOut':
      return {
        kind: 'teleportOut',
        ...(command.onFail === undefined
          ? {}
          : {
              onFail: compileAuthorCommandsV5UncheckedAfterValidation(command.onFail, timing, boundaryPolicy),
            }),
        after,
      }
    case 'callScript':
      return {
        kind: 'callScript',
        script: command.script,
        ...(command.self === undefined ? {} : { self: clone(command.self) }),
        after,
      }
    default:
      return { kind: 'leaf', command: clone(command), after }
  }
}

/**
 * 已由方言 validator 校验后的共享控制流内核。仅供 v5 本入口与 v13 compatibility adapter；
 * 调用方不得把未校验 JSON 送进这里。
 */
export function compileAuthorCommandsV5UncheckedAfterValidation(
  commands: readonly AuthorCommandV5[],
  timing: ScriptTimingV5,
  boundaryPolicy: ScriptBoundaryPolicyV5,
): readonly ExecutableCommandV5[] {
  return commands.map((command) => compileAuthorCommandV5(command, timing, boundaryPolicy))
}

export function compileAuthorCommandsV5(
  commands: readonly AuthorCommandV5[],
  timing: ScriptTimingV5,
  path = 'commands',
  boundaryPolicy: ScriptBoundaryPolicyV5 = 'perCommand',
): readonly ExecutableCommandV5[] {
  checkAuthorCommandsV5(commands, path)
  return compileAuthorCommandsV5UncheckedAfterValidation(commands, timing, boundaryPolicy)
}

export function compileScriptFlowV5(
  flow: ScriptFlowV5,
  options: CompileScriptFlowV5Options,
): ExecutableScriptFlowV5 {
  checkScriptFlowV5(flow, 'flow', {
    allowSceneEntry: options.allowSceneEntry,
    forbidLoadScene: options.forbidLoadScene,
  })
  return compileScriptFlowV5UncheckedAfterValidation(flow, options)
}

/** 与 author-command bridge 同纪律：schema 已由 v5/v13 方言入口校验后才可调用。 */
export function compileScriptFlowV5UncheckedAfterValidation(
  flow: ScriptFlowV5,
  options: CompileScriptFlowV5Options,
): ExecutableScriptFlowV5 {
  checkDigest(options.canonicalContentDigest)
  const boundaryPolicy: ScriptBoundaryPolicyV5 =
    flow.kind === 'stateMachine' && flow.machine.cadence === 'transition'
      ? 'transition'
      : 'perCommand'
  const executable: ExecutableScriptFlowBodyV5 =
    flow.kind === 'stages'
      ? {
          kind: 'stages',
          initial: flow.initial,
          stages: flow.stages.map((stage) => ({
            id: stage.id,
            ...(stage.entry === undefined
              ? {}
              : { entry: compileEntry(stage.entry, options.timing, boundaryPolicy) }),
            body: compileAuthorCommandsV5UncheckedAfterValidation(
              stage.body,
              options.timing,
              boundaryPolicy,
            ),
            ...(stage.next === undefined ? {} : { next: stage.next }),
          })),
        }
      : {
          kind: 'stateMachine',
          machine: {
            id: flow.machine.id,
            label: flow.machine.label,
            initial: flow.machine.initial,
            states: Object.fromEntries(
              Object.entries(flow.machine.states).map(([id, state]) => [
                id,
                {
                  label: state.label,
                  ...(state.entry === undefined
                    ? {}
                    : { entry: compileEntry(state.entry, options.timing, boundaryPolicy) }),
                  body: compileAuthorCommandsV5UncheckedAfterValidation(
                    state.body,
                    options.timing,
                    boundaryPolicy,
                  ),
                  next: clone(state.next),
                },
              ]),
            ),
          },
        }
  return {
    compilerVersion: SCRIPT_COMPILER_V5_VERSION,
    canonicalContentDigest: options.canonicalContentDigest,
    timing: options.timing,
    boundaryPolicy,
    flow: executable,
  }
}

export class MemorySharedScriptResolverV5 {
  private readonly cache = new Map<string, ExecutableSharedScriptV5>()

  constructor(
    private readonly library: SharedScriptLibraryV5,
    private readonly canonicalContentDigest: string,
  ) {
    checkDigest(canonicalContentDigest)
    checkSharedScriptLibraryV5(library)
  }

  resolve(
    id: string,
    timing: ScriptTimingV5,
    boundaryPolicy: ScriptBoundaryPolicyV5 = 'perCommand',
  ): ExecutableSharedScriptV5 {
    const key = `${timing}\u0000${boundaryPolicy}\u0000${id}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const script = this.library[id]
    if (!script) throw new Error(`shared script 不存在: ${id}`)
    const compiled: ExecutableSharedScriptV5 = {
      compilerVersion: SCRIPT_COMPILER_V5_VERSION,
      canonicalContentDigest: this.canonicalContentDigest,
      timing,
      boundaryPolicy,
      id,
      name: script.name,
      self: script.self,
      body: compileAuthorCommandsV5UncheckedAfterValidation(
        script.body,
        timing,
        boundaryPolicy,
      ),
    }
    this.cache.set(key, compiled)
    return compiled
  }
}

export type { RuntimeLeafCommandV5 }
