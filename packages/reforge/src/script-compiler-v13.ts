import type {
  AuthorCommandV5,
  AuthorCommandV13,
  ScriptFlowV5,
  ScriptFlowV13,
  SharedScriptLibraryV13,
} from '@type-pal/content'
import {
  checkAuthorCommandsV13,
  checkScriptFlowV13,
  checkSharedScriptLibraryV13,
} from '@type-pal/content'
import {
  type CompileScriptFlowV5Options,
  type ExecutableCommandV5Like,
  type ExecutableScriptFlowV5Like,
  type ExecutableSharedScriptV5Like,
  compileAuthorCommandsV5UncheckedAfterValidation,
  compileScriptFlowV5UncheckedAfterValidation,
  SCRIPT_COMPILER_V5_VERSION,
  type ScriptBoundaryPolicyV5,
  type ScriptTimingV5,
} from './script-compiler-v5.js'

export const SCRIPT_COMPILER_V13_VERSION = SCRIPT_COMPILER_V5_VERSION

export type RuntimeLeafCommandV13 = Exclude<
  AuthorCommandV13,
  | { kind: 'branch' }
  | { kind: 'callScript' }
  | { kind: 'confirm' }
  | { kind: 'loop' }
  | { kind: 'startBattle' }
  | { kind: 'stopScript' }
  | { kind: 'teleportOut' }
>

export type ExecutableCommandV13 = ExecutableCommandV5Like<RuntimeLeafCommandV13>
export type ExecutableScriptFlowV13 = ExecutableScriptFlowV5Like<RuntimeLeafCommandV13>
export type ExecutableSharedScriptV13 = ExecutableSharedScriptV5Like<RuntimeLeafCommandV13>
export type CompileScriptFlowV13Options = CompileScriptFlowV5Options

/**
 * v13 validator 已经递归验证 retained v5 形状并单独验证四个 lifecycle leaf；这里仅把同一
 * JSON 控制流交给共享编译内核。转换结果不会暴露成 v5 author/runtime 类型。
 */
function validatedCommandsAsV5(commands: readonly AuthorCommandV13[]): readonly AuthorCommandV5[] {
  return commands as unknown as readonly AuthorCommandV5[]
}

function validatedFlowAsV5(flow: ScriptFlowV13): ScriptFlowV5 {
  return flow as unknown as ScriptFlowV5
}

export function compileAuthorCommandsV13(
  commands: readonly AuthorCommandV13[],
  timing: ScriptTimingV5,
  path = 'commands',
  boundaryPolicy: ScriptBoundaryPolicyV5 = 'perCommand',
): readonly ExecutableCommandV13[] {
  checkAuthorCommandsV13(commands, path)
  return compileAuthorCommandsV5UncheckedAfterValidation(
    validatedCommandsAsV5(commands),
    timing,
    boundaryPolicy,
  ) as unknown as readonly ExecutableCommandV13[]
}

export function compileScriptFlowV13(
  flow: ScriptFlowV13,
  options: CompileScriptFlowV13Options,
): ExecutableScriptFlowV13 {
  checkScriptFlowV13(flow, 'flow', {
    allowSceneEntry: options.allowSceneEntry,
    forbidLoadScene: options.forbidLoadScene,
  })
  return compileScriptFlowV5UncheckedAfterValidation(
    validatedFlowAsV5(flow),
    options,
  ) as unknown as ExecutableScriptFlowV13
}

export class MemorySharedScriptResolverV13 {
  private readonly cache = new Map<string, ExecutableSharedScriptV13>()

  constructor(
    private readonly library: SharedScriptLibraryV13,
    private readonly canonicalContentDigest: string,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('canonicalContentDigest: 期望小写 SHA-256')
    checkSharedScriptLibraryV13(library)
  }

  resolve(
    id: string,
    timing: ScriptTimingV5,
    boundaryPolicy: ScriptBoundaryPolicyV5 = 'perCommand',
  ): ExecutableSharedScriptV13 {
    const key = `${timing}\u0000${boundaryPolicy}\u0000${id}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const script = this.library[id]
    if (!script) throw new Error(`shared script 不存在: ${id}`)
    const compiled: ExecutableSharedScriptV13 = {
      compilerVersion: SCRIPT_COMPILER_V13_VERSION,
      canonicalContentDigest: this.canonicalContentDigest,
      timing,
      boundaryPolicy,
      id,
      name: script.name,
      self: script.self,
      body: compileAuthorCommandsV5UncheckedAfterValidation(
        validatedCommandsAsV5(script.body),
        timing,
        boundaryPolicy,
      ) as unknown as readonly ExecutableCommandV13[],
    }
    this.cache.set(key, compiled)
    return compiled
  }
}
