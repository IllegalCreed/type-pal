import type {
  BaseAuthorCommand,
  BaseScriptFlow,
  RuntimeCommand,
  RuntimeScriptFlow,
  RuntimeScriptLibrary,
} from '@type-pal/content'
import {
  checkRuntimeCommands,
  checkRuntimeScriptFlow,
  checkRuntimeScriptLibrary,
} from '@type-pal/content'
import {
  SCRIPT_COMPILER_VERSION as CORE_SCRIPT_COMPILER_VERSION,
  type CompileBaseScriptFlowOptions,
  compileBaseCommandsUncheckedAfterValidation,
  compileBaseScriptFlowUncheckedAfterValidation,
  type ExecutableBaseScriptFlowLike,
  type ExecutableCommandLike,
  type ExecutableSharedScriptLike,
  type ScriptTiming,
} from './script-compiler-core.js'

export type RuntimeLeafCommand = Exclude<
  RuntimeCommand,
  | { kind: 'branch' }
  | { kind: 'callScript' }
  | { kind: 'confirm' }
  | { kind: 'loop' }
  | { kind: 'startBattle' }
  | { kind: 'returnScript' | 'finishStep' | 'breakLoop' | 'continueLoop' | 'repeat' }
  | { kind: 'teleportOut' }
>

export type ExecutableRuntimeCommand = ExecutableCommandLike<RuntimeLeafCommand>
export type ExecutableRuntimeScriptFlow = ExecutableBaseScriptFlowLike<RuntimeLeafCommand>
export type ExecutableRuntimeSharedScript = ExecutableSharedScriptLike<RuntimeLeafCommand>
export type CompileRuntimeScriptFlowOptions = CompileBaseScriptFlowOptions

/**
 * 当前 validator 已递归验证基础控制流和 lifecycle leaf；这里仅把同一 JSON 控制流
 * 交给共享编译内核。转换结果不会暴露基础 author/runtime 类型。
 */
function validatedBaseCommands(commands: readonly RuntimeCommand[]): readonly BaseAuthorCommand[] {
  return commands as unknown as readonly BaseAuthorCommand[]
}

function validatedBaseFlow(flow: RuntimeScriptFlow): BaseScriptFlow {
  return flow as unknown as BaseScriptFlow
}

export function compileRuntimeCommands(
  commands: readonly RuntimeCommand[],
  timing: ScriptTiming,
  path = 'commands',
): readonly ExecutableRuntimeCommand[] {
  checkRuntimeCommands(commands, path)
  return compileBaseCommandsUncheckedAfterValidation(
    validatedBaseCommands(commands),
    timing,
  ) as unknown as readonly ExecutableRuntimeCommand[]
}

export function compileRuntimeScriptFlow(
  flow: RuntimeScriptFlow,
  options: CompileRuntimeScriptFlowOptions,
): ExecutableRuntimeScriptFlow {
  checkRuntimeScriptFlow(flow, 'flow', {
    allowSceneEntry: options.allowSceneEntry,
    forbidLoadScene: options.forbidLoadScene,
  })
  return compileBaseScriptFlowUncheckedAfterValidation(
    validatedBaseFlow(flow),
    options,
  ) as unknown as ExecutableRuntimeScriptFlow
}

/** An unowned command root is not an owner flow even though the executable uses one list. */
export function compileRuntimeCommandRoot(
  commands: readonly RuntimeCommand[],
  options: CompileRuntimeScriptFlowOptions,
): ExecutableRuntimeScriptFlow {
  checkRuntimeCommands(commands, 'commands', { rootScope: 'script', loopDepth: 0 })
  return compileBaseScriptFlowUncheckedAfterValidation(
    validatedBaseFlow({
      kind: 'stages',
      initial: '__script',
      stages: [{ id: '__script', body: [...commands] }],
    }),
    options,
    'script',
  ) as unknown as ExecutableRuntimeScriptFlow
}

export class RuntimeSharedScriptResolver {
  private readonly cache = new Map<string, ExecutableRuntimeSharedScript>()

  constructor(
    private readonly library: RuntimeScriptLibrary,
    private readonly canonicalContentDigest: string,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('canonicalContentDigest: 期望小写 SHA-256')
    checkRuntimeScriptLibrary(library)
  }

  resolve(id: string, timing: ScriptTiming): ExecutableRuntimeSharedScript {
    const key = `${timing}\u0000${id}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const script = this.library[id]
    if (!script) throw new Error(`shared script 不存在: ${id}`)
    const compiled: ExecutableRuntimeSharedScript = {
      compilerVersion: CORE_SCRIPT_COMPILER_VERSION,
      canonicalContentDigest: this.canonicalContentDigest,
      timing,
      id,
      name: script.name,
      self: script.self,
      body: compileBaseCommandsUncheckedAfterValidation(
        validatedBaseCommands(script.body),
        timing,
      ) as unknown as readonly ExecutableRuntimeCommand[],
    }
    this.cache.set(key, compiled)
    return compiled
  }
}
