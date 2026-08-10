import type { RuntimeLeafCommandV13 } from './script-compiler-v13.js'
import {
  ScriptRunnerV5,
  type ScriptRuntimeHostV5Like,
  type SharedScriptResolverV5Like,
} from './script-runner-v5.js'

/** v13 只替换 author/runtime leaf 方言；控制流、safe-point、battle result 继续复用同一 runner。 */
export type ScriptRuntimeHostV13 = ScriptRuntimeHostV5Like<RuntimeLeafCommandV13>
export type SharedScriptResolverV13 = SharedScriptResolverV5Like<RuntimeLeafCommandV13>

export class ScriptRunnerV13 extends ScriptRunnerV5<RuntimeLeafCommandV13> {}
