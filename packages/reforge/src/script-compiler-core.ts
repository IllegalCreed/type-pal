import {
  type AuthorCondition,
  type BaseAuthorCommand,
  type BaseSceneEntryPresentation,
  type BaseScriptFlow,
  type BaseScriptLibrary,
  type BaseSharedScript,
  type BaseStateTransition,
  checkBaseAuthorCommands,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  type EntityAddress,
} from '@type-pal/content'

export const SCRIPT_COMPILER_VERSION = 2 as const

export type ScriptTiming = 'auto' | 'interactive'
export type ScriptBoundaryPolicy = 'perCommand' | 'transition'

export interface ExecutableCommandBoundary {
  kind: 'wait'
  ms: 100
}

type BaseStartBattleCommand = Extract<BaseAuthorCommand, { kind: 'startBattle' }>
type BaseRuntimeLeafCommand = Exclude<
  BaseAuthorCommand,
  | { kind: 'branch' }
  | { kind: 'callScript' }
  | { kind: 'confirm' }
  | { kind: 'loop' }
  | { kind: 'startBattle' }
  | { kind: 'stopScript' }
  | { kind: 'teleportOut' }
>

interface ExecutableCommandBase {
  after: readonly ExecutableCommandBoundary[]
}

export type ExecutableCommandLike<RuntimeLeafCommand> =
  | (ExecutableCommandBase & {
      kind: 'leaf'
      command: RuntimeLeafCommand
    })
  | (ExecutableCommandBase & {
      kind: 'stop'
    })
  | (ExecutableCommandBase & {
      kind: 'branch'
      cond: AuthorCondition
      then: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
      else: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBase & {
      kind: 'loop'
      mode: 'while' | 'until'
      cond: AuthorCondition
      body: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
      maxIterations: number
    })
  | (ExecutableCommandBase & {
      kind: 'confirm'
      id?: string
      onNo: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBase & {
      kind: 'startBattle'
      request: Omit<BaseStartBattleCommand, 'kind' | 'onLose' | 'onFlee'>
      onLose?: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
      onFlee?: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBase & {
      kind: 'teleportOut'
      onFail?: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
    })
  | (ExecutableCommandBase & {
      kind: 'callScript'
      script: string
      self?: EntityAddress
    })

export type ExecutableBaseCommand = ExecutableCommandLike<BaseRuntimeLeafCommand>

export interface ExecutableSceneEntryLike<RuntimeLeafCommand> {
  prepare: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
  reveal: BaseSceneEntryPresentation['reveal']
}

export type ExecutableBaseSceneEntry = ExecutableSceneEntryLike<BaseRuntimeLeafCommand>

export interface ExecutableStageLike<RuntimeLeafCommand> {
  id: string
  entry?: ExecutableSceneEntryLike<RuntimeLeafCommand>
  body: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
  next?: string
}

export type ExecutableBaseStage = ExecutableStageLike<BaseRuntimeLeafCommand>

export interface ExecutableStateLike<RuntimeLeafCommand> {
  label: string
  entry?: ExecutableSceneEntryLike<RuntimeLeafCommand>
  body: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
  next: BaseStateTransition
}

export type ExecutableBaseState = ExecutableStateLike<BaseRuntimeLeafCommand>

export type ExecutableScriptFlowBodyLike<RuntimeLeafCommand> =
  | {
      kind: 'stages'
      initial: string
      stages: readonly ExecutableStageLike<RuntimeLeafCommand>[]
    }
  | {
      kind: 'stateMachine'
      machine: {
        id: string
        label: string
        initial: string
        states: Readonly<Record<string, ExecutableStateLike<RuntimeLeafCommand>>>
      }
    }

export type ExecutableBaseScriptFlowBody = ExecutableScriptFlowBodyLike<BaseRuntimeLeafCommand>

export interface ExecutableBaseScriptFlowLike<RuntimeLeafCommand> {
  compilerVersion: typeof SCRIPT_COMPILER_VERSION
  canonicalContentDigest: string
  timing: ScriptTiming
  boundaryPolicy: ScriptBoundaryPolicy
  flow: ExecutableScriptFlowBodyLike<RuntimeLeafCommand>
}

export type ExecutableBaseScriptFlow = ExecutableBaseScriptFlowLike<BaseRuntimeLeafCommand>

export interface ExecutableSharedScriptLike<RuntimeLeafCommand> {
  compilerVersion: typeof SCRIPT_COMPILER_VERSION
  canonicalContentDigest: string
  timing: ScriptTiming
  boundaryPolicy: ScriptBoundaryPolicy
  id: string
  name: string
  self: BaseSharedScript['self']
  body: readonly ExecutableCommandLike<RuntimeLeafCommand>[]
}

export type ExecutableBaseSharedScript = ExecutableSharedScriptLike<BaseRuntimeLeafCommand>

export interface CompileBaseScriptFlowOptions {
  canonicalContentDigest: string
  timing: ScriptTiming
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
  timing: ScriptTiming,
  boundaryPolicy: ScriptBoundaryPolicy,
): readonly ExecutableCommandBoundary[] {
  return timing === 'auto' && boundaryPolicy === 'perCommand' ? [{ kind: 'wait', ms: 100 }] : []
}

function compileEntry(
  entry: BaseSceneEntryPresentation,
  timing: ScriptTiming,
  boundaryPolicy: ScriptBoundaryPolicy,
): ExecutableBaseSceneEntry {
  return {
    prepare: compileBaseCommandsUncheckedAfterValidation(entry.prepare, timing, boundaryPolicy),
    reveal: clone(entry.reveal),
  }
}

function compileBaseAuthorCommand(
  command: BaseAuthorCommand,
  timing: ScriptTiming,
  boundaryPolicy: ScriptBoundaryPolicy,
): ExecutableBaseCommand {
  const after = boundaries(timing, boundaryPolicy)
  switch (command.kind) {
    case 'stopScript':
      return { kind: 'stop', after }
    case 'branch':
      return {
        kind: 'branch',
        cond: clone(command.cond),
        then: compileBaseCommandsUncheckedAfterValidation(command.then, timing, boundaryPolicy),
        else: compileBaseCommandsUncheckedAfterValidation(
          command.else ?? [],
          timing,
          boundaryPolicy,
        ),
        after,
      }
    case 'loop':
      return {
        kind: 'loop',
        mode: command.mode,
        cond: clone(command.cond),
        body: compileBaseCommandsUncheckedAfterValidation(command.body, timing, boundaryPolicy),
        maxIterations: command.maxIterations,
        after,
      }
    case 'confirm':
      return {
        kind: 'confirm',
        ...(command.id === undefined ? {} : { id: command.id }),
        onNo: compileBaseCommandsUncheckedAfterValidation(command.onNo, timing, boundaryPolicy),
        after,
      }
    case 'startBattle': {
      const { kind: _kind, onLose, onFlee, ...request } = command
      return {
        kind: 'startBattle',
        request: clone(request),
        ...(onLose === undefined
          ? {}
          : {
              onLose: compileBaseCommandsUncheckedAfterValidation(onLose, timing, boundaryPolicy),
            }),
        ...(onFlee === undefined
          ? {}
          : {
              onFlee: compileBaseCommandsUncheckedAfterValidation(onFlee, timing, boundaryPolicy),
            }),
        after,
      }
    }
    case 'teleportOut':
      return {
        kind: 'teleportOut',
        ...(command.onFail === undefined
          ? {}
          : {
              onFail: compileBaseCommandsUncheckedAfterValidation(
                command.onFail,
                timing,
                boundaryPolicy,
              ),
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
 * 已由方言 validator 校验后的共享控制流内核。供基础方言与当前运行时方言复用；
 * 调用方不得把未校验 JSON 送进这里。
 */
export function compileBaseCommandsUncheckedAfterValidation(
  commands: readonly BaseAuthorCommand[],
  timing: ScriptTiming,
  boundaryPolicy: ScriptBoundaryPolicy,
): readonly ExecutableBaseCommand[] {
  return commands.map((command) => compileBaseAuthorCommand(command, timing, boundaryPolicy))
}

export function compileBaseCommands(
  commands: readonly BaseAuthorCommand[],
  timing: ScriptTiming,
  path = 'commands',
  boundaryPolicy: ScriptBoundaryPolicy = 'perCommand',
): readonly ExecutableBaseCommand[] {
  checkBaseAuthorCommands(commands, path)
  return compileBaseCommandsUncheckedAfterValidation(commands, timing, boundaryPolicy)
}

export function compileBaseScriptFlow(
  flow: BaseScriptFlow,
  options: CompileBaseScriptFlowOptions,
): ExecutableBaseScriptFlow {
  checkBaseScriptFlow(flow, 'flow', {
    allowSceneEntry: options.allowSceneEntry,
    forbidLoadScene: options.forbidLoadScene,
  })
  return compileBaseScriptFlowUncheckedAfterValidation(flow, options)
}

/** 与 author-command bridge 同纪律：schema 已由调用方言入口校验后才可调用。 */
export function compileBaseScriptFlowUncheckedAfterValidation(
  flow: BaseScriptFlow,
  options: CompileBaseScriptFlowOptions,
): ExecutableBaseScriptFlow {
  checkDigest(options.canonicalContentDigest)
  const boundaryPolicy: ScriptBoundaryPolicy =
    flow.kind === 'stateMachine' && flow.machine.cadence === 'transition'
      ? 'transition'
      : 'perCommand'
  const executable: ExecutableBaseScriptFlowBody =
    flow.kind === 'stages'
      ? {
          kind: 'stages',
          initial: flow.initial,
          stages: flow.stages.map((stage) => ({
            id: stage.id,
            ...(stage.entry === undefined
              ? {}
              : { entry: compileEntry(stage.entry, options.timing, boundaryPolicy) }),
            body: compileBaseCommandsUncheckedAfterValidation(
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
                  body: compileBaseCommandsUncheckedAfterValidation(
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
    compilerVersion: SCRIPT_COMPILER_VERSION,
    canonicalContentDigest: options.canonicalContentDigest,
    timing: options.timing,
    boundaryPolicy,
    flow: executable,
  }
}

export class BaseSharedScriptResolver {
  private readonly cache = new Map<string, ExecutableBaseSharedScript>()

  constructor(
    private readonly library: BaseScriptLibrary,
    private readonly canonicalContentDigest: string,
  ) {
    checkDigest(canonicalContentDigest)
    checkBaseScriptLibrary(library)
  }

  resolve(
    id: string,
    timing: ScriptTiming,
    boundaryPolicy: ScriptBoundaryPolicy = 'perCommand',
  ): ExecutableBaseSharedScript {
    const key = `${timing}\u0000${boundaryPolicy}\u0000${id}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const script = this.library[id]
    if (!script) throw new Error(`shared script 不存在: ${id}`)
    const compiled: ExecutableBaseSharedScript = {
      compilerVersion: SCRIPT_COMPILER_VERSION,
      canonicalContentDigest: this.canonicalContentDigest,
      timing,
      boundaryPolicy,
      id,
      name: script.name,
      self: script.self,
      body: compileBaseCommandsUncheckedAfterValidation(script.body, timing, boundaryPolicy),
    }
    this.cache.set(key, compiled)
    return compiled
  }
}

export type { BaseRuntimeLeafCommand }
