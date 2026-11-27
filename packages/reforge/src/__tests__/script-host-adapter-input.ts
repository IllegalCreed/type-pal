import type { RuntimeCommand } from '@type-pal/content'
import { expectDefined } from '../defined.js'
import { compileRuntimeCommandRoot } from '../runtime-script-compiler.js'
import type { BaseRuntimeLeafCommand } from '../script-compiler-core.js'

/** Compile with the actual root guard before isolating the adapter's supported leaves. */
export function compileAdapterLeaves(
  commands: readonly RuntimeCommand[],
): BaseRuntimeLeafCommand[] {
  const root = compileRuntimeCommandRoot(commands, {
    canonicalContentDigest: 'a'.repeat(64),
    timing: 'interactive',
  })
  return expectDefined(root.flow.stages[0]).body.map((node) => {
    if (node.kind !== 'leaf') throw new Error('adapter input requires leaf commands')
    const command = node.command
    if (
      command.kind === 'suspendEntity' ||
      command.kind === 'hideEntity' ||
      command.kind === 'restoreEntity' ||
      command.kind === 'removeEntity'
    )
      throw new Error('adapter input must be handled by the base leaf interface')
    return command
  })
}
