import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import {
  ScriptRunnerCore,
  type ScriptRuntimeHostLike,
  type SharedScriptResolverLike,
} from './script-runner-core.js'

/** Current runtime 只替换 author/runtime leaf 方言；控制流、safe-point、battle result 复用同一 runner。 */
export type ScriptRuntimeHost = ScriptRuntimeHostLike<RuntimeLeafCommand>
export type SharedScriptResolver = SharedScriptResolverLike<RuntimeLeafCommand>

export class RuntimeScriptRunner extends ScriptRunnerCore<RuntimeLeafCommand> {}
