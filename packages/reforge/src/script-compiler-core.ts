import {
  type AuthorCondition,
  type BaseAuthorCommand,
  type BaseSceneEntryPresentation,
  type BaseScriptFlow,
  type BaseScriptLibrary,
  type BaseSharedScript,
  checkBaseAuthorCommands,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  type EntityAddress,
  type StageNext,
  type StepExit,
} from '@type-pal/content'

export const SCRIPT_COMPILER_VERSION = 3 as const
export type ScriptTiming = 'auto' | 'interactive'
export type ScriptRootScope = 'flow' | 'script'

type BaseStartBattleCommand = Extract<BaseAuthorCommand, { kind: 'startBattle' }>
export type BaseRuntimeLeafCommand = Exclude<
  BaseAuthorCommand,
  {
    kind:
      | 'branch'
      | 'callScript'
      | 'confirm'
      | 'loop'
      | 'repeat'
      | 'startBattle'
      | 'returnScript'
      | 'finishStep'
      | 'breakLoop'
      | 'continueLoop'
      | 'teleportOut'
  }
>

export type ExecutableCommandLike<T> =
  | { kind: 'leaf'; command: T }
  | { kind: 'returnScript' }
  | { kind: 'finishStep'; next: StepExit }
  | { kind: 'breakLoop' }
  | { kind: 'continueLoop'; loop?: string }
  | {
      kind: 'branch'
      cond: AuthorCondition
      then: readonly ExecutableCommandLike<T>[]
      else: readonly ExecutableCommandLike<T>[]
    }
  | {
      kind: 'loop'
      id?: string
      mode: 'while' | 'until'
      cond: AuthorCondition
      body: readonly ExecutableCommandLike<T>[]
    }
  | { kind: 'loop'; id?: string; mode: 'forever'; body: readonly ExecutableCommandLike<T>[] }
  | { kind: 'repeat'; id?: string; count: number; body: readonly ExecutableCommandLike<T>[] }
  | {
      kind: 'confirm'
      onYes: readonly ExecutableCommandLike<T>[]
      onNo: readonly ExecutableCommandLike<T>[]
    }
  | {
      kind: 'startBattle'
      request: Omit<BaseStartBattleCommand, 'kind' | 'onLose' | 'onFlee'>
      onLose?: readonly ExecutableCommandLike<T>[]
      onFlee?: readonly ExecutableCommandLike<T>[]
    }
  | { kind: 'teleportOut'; onFail?: readonly ExecutableCommandLike<T>[] }
  | { kind: 'callScript'; script: string; self?: EntityAddress }

export type ExecutableBaseCommand = ExecutableCommandLike<BaseRuntimeLeafCommand>
export interface ExecutableSceneEntryLike<T> {
  prepare: readonly ExecutableCommandLike<T>[]
  reveal: BaseSceneEntryPresentation['reveal']
}
export type ExecutableBaseSceneEntry = ExecutableSceneEntryLike<BaseRuntimeLeafCommand>
export interface ExecutableStageLike<T> {
  id: string
  entry?: ExecutableSceneEntryLike<T>
  body: readonly ExecutableCommandLike<T>[]
  next?: StageNext
}
export type ExecutableBaseStage = ExecutableStageLike<BaseRuntimeLeafCommand>
export interface ExecutableScriptFlowBodyLike<T> {
  kind: 'stages'
  initial: string
  stages: readonly ExecutableStageLike<T>[]
}
export type ExecutableBaseScriptFlowBody = ExecutableScriptFlowBodyLike<BaseRuntimeLeafCommand>
export interface ExecutableBaseScriptFlowLike<T> {
  compilerVersion: typeof SCRIPT_COMPILER_VERSION
  canonicalContentDigest: string
  timing: ScriptTiming
  rootScope: ScriptRootScope
  flow: ExecutableScriptFlowBodyLike<T>
}
export type ExecutableBaseScriptFlow = ExecutableBaseScriptFlowLike<BaseRuntimeLeafCommand>
export interface ExecutableSharedScriptLike<T> {
  compilerVersion: typeof SCRIPT_COMPILER_VERSION
  canonicalContentDigest: string
  timing: ScriptTiming
  id: string
  name: string
  self: BaseSharedScript['self']
  body: readonly ExecutableCommandLike<T>[]
}
export type ExecutableBaseSharedScript = ExecutableSharedScriptLike<BaseRuntimeLeafCommand>
export interface CompileBaseScriptFlowOptions {
  canonicalContentDigest: string
  timing: ScriptTiming
  allowSceneEntry?: boolean
  forbidLoadScene?: boolean
}
function checkDigest(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('canonicalContentDigest: 期望小写 SHA-256')
}
function compileCommand(command: BaseAuthorCommand, timing: ScriptTiming): ExecutableBaseCommand {
  const body = (commands: readonly BaseAuthorCommand[]) =>
    compileBaseCommandsUncheckedAfterValidation(commands, timing)
  switch (command.kind) {
    case 'runEntityTrigger':
      if (timing !== 'interactive') throw new Error('runEntityTrigger 仅允许 interactive 编译时序')
      return { kind: 'leaf', command: structuredClone(command) }
    case 'returnScript':
      return { kind: 'returnScript' }
    case 'breakLoop':
      return { kind: 'breakLoop' }
    case 'continueLoop':
      return { kind: 'continueLoop', ...(command.loop ? { loop: command.loop } : {}) }
    case 'finishStep':
      return { kind: 'finishStep', next: structuredClone(command.next) }
    case 'branch':
      return {
        kind: 'branch',
        cond: structuredClone(command.cond),
        then: body(command.then),
        else: body(command.else ?? []),
      }
    case 'loop':
      return command.mode === 'forever'
        ? {
            kind: 'loop',
            ...(command.id ? { id: command.id } : {}),
            mode: 'forever',
            body: body(command.body),
          }
        : {
            kind: 'loop',
            ...(command.id ? { id: command.id } : {}),
            mode: command.mode,
            cond: structuredClone(command.cond),
            body: body(command.body),
          }
    case 'repeat':
      return {
        kind: 'repeat',
        ...(command.id ? { id: command.id } : {}),
        count: command.count,
        body: body(command.body),
      }
    case 'confirm':
      return { kind: 'confirm', onYes: body(command.onYes), onNo: body(command.onNo) }
    case 'startBattle': {
      const { kind: _kind, onLose, onFlee, ...request } = command
      return {
        kind: 'startBattle',
        request: structuredClone(request),
        ...(onLose === undefined ? {} : { onLose: body(onLose) }),
        ...(onFlee === undefined ? {} : { onFlee: body(onFlee) }),
      }
    }
    case 'teleportOut':
      return {
        kind: 'teleportOut',
        ...(command.onFail === undefined ? {} : { onFail: body(command.onFail) }),
      }
    case 'callScript':
      return {
        kind: 'callScript',
        script: command.script,
        ...(command.self ? { self: structuredClone(command.self) } : {}),
      }
    default:
      return { kind: 'leaf', command: structuredClone(command) }
  }
}
/** Already validated by the owning author/runtime dialect. No implicit scheduling boundaries. */
export function compileBaseCommandsUncheckedAfterValidation(
  commands: readonly BaseAuthorCommand[],
  timing: ScriptTiming,
): readonly ExecutableBaseCommand[] {
  return commands.map((command) => compileCommand(command, timing))
}
export function compileBaseCommands(
  commands: readonly BaseAuthorCommand[],
  timing: ScriptTiming,
  path = 'commands',
): readonly ExecutableBaseCommand[] {
  checkBaseAuthorCommands(commands, path, { rootScope: 'script', loopDepth: 0 })
  return compileBaseCommandsUncheckedAfterValidation(commands, timing)
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
export function compileBaseScriptFlowUncheckedAfterValidation(
  flow: BaseScriptFlow,
  options: CompileBaseScriptFlowOptions,
  rootScope: ScriptRootScope = 'flow',
): ExecutableBaseScriptFlow {
  checkDigest(options.canonicalContentDigest)
  const commands = (body: readonly BaseAuthorCommand[]) =>
    compileBaseCommandsUncheckedAfterValidation(body, options.timing)
  return {
    compilerVersion: SCRIPT_COMPILER_VERSION,
    canonicalContentDigest: options.canonicalContentDigest,
    timing: options.timing,
    rootScope,
    flow: {
      kind: 'stages',
      initial: flow.initial,
      stages: flow.stages.map((stage) => ({
        id: stage.id,
        body: commands(stage.body),
        ...(stage.next === undefined ? {} : { next: structuredClone(stage.next) }),
        ...(stage.entry
          ? {
              entry: {
                prepare: commands(stage.entry.prepare),
                reveal: structuredClone(stage.entry.reveal),
              },
            }
          : {}),
      })),
    },
  }
}
export function compileBaseCommandRoot(
  commands: readonly BaseAuthorCommand[],
  options: CompileBaseScriptFlowOptions,
): ExecutableBaseScriptFlow {
  checkBaseAuthorCommands(commands, 'commands', { rootScope: 'script', loopDepth: 0 })
  return compileBaseScriptFlowUncheckedAfterValidation(
    { kind: 'stages', initial: '__script', stages: [{ id: '__script', body: [...commands] }] },
    options,
    'script',
  )
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
  resolve(id: string, timing: ScriptTiming): ExecutableBaseSharedScript {
    const key = `${timing}\u0000${id}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const script = this.library[id]
    if (!script) throw new Error(`shared script 不存在: ${id}`)
    const compiled: ExecutableBaseSharedScript = {
      compilerVersion: SCRIPT_COMPILER_VERSION,
      canonicalContentDigest: this.canonicalContentDigest,
      timing,
      id,
      name: script.name,
      self: script.self,
      body: compileBaseCommandsUncheckedAfterValidation(script.body, timing),
    }
    this.cache.set(key, compiled)
    return compiled
  }
}
