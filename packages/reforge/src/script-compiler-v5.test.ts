import type { ScriptFlowV5, SharedScriptLibraryV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { compileScriptFlowV5, MemorySharedScriptResolverV5 } from './script-compiler-v5.js'

const digest = 'a'.repeat(64)

describe('script v5 compiler', () => {
  test('materializes auto compatibility boundaries for nested author commands', () => {
    const flow: ScriptFlowV5 = {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'go', is: true },
              then: [{ kind: 'clearDialog' }],
            },
          ],
        },
      ],
    }

    const auto = compileScriptFlowV5(flow, {
      canonicalContentDigest: digest,
      timing: 'auto',
    })
    const interactive = compileScriptFlowV5(flow, {
      canonicalContentDigest: digest,
      timing: 'interactive',
    })
    if (auto.flow.kind !== 'stages' || interactive.flow.kind !== 'stages')
      throw new Error('expected stages')
    const autoBranch = auto.flow.stages[0]!.body[0]!
    const interactiveBranch = interactive.flow.stages[0]!.body[0]!
    if (autoBranch.kind !== 'branch' || interactiveBranch.kind !== 'branch')
      throw new Error('expected branch')

    expect(autoBranch.after).toEqual([{ kind: 'wait', ms: 100 }])
    expect(autoBranch.then[0]!.after).toEqual([{ kind: 'wait', ms: 100 }])
    expect(interactiveBranch.after).toEqual([])
    expect(interactiveBranch.then[0]!.after).toEqual([])
  })

  test('binds compiled shared scripts to timing and canonical digest', () => {
    const library: SharedScriptLibraryV5 = {
      helper: {
        name: '帮助脚本',
        self: 'required',
        body: [{ kind: 'clearDialog' }],
      },
    }
    const resolver = new MemorySharedScriptResolverV5(library, digest)
    const auto = resolver.resolve('helper', 'auto')
    const interactive = resolver.resolve('helper', 'interactive')

    expect(auto.canonicalContentDigest).toBe(digest)
    expect(auto.timing).toBe('auto')
    expect(auto.body[0]!.after).toEqual([{ kind: 'wait', ms: 100 }])
    expect(interactive.body[0]!.after).toEqual([])
    expect(() => resolver.resolve('missing', 'auto')).toThrow(/不存在/)
  })

  test('rejects non-canonical flows before lowering', () => {
    expect(() =>
      compileScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '坏状态机',
            initial: 'initial',
            states: {
              initial: {
                label: '初始',
                body: [],
                next: { kind: 'continue', state: 'initial' },
              },
            },
          },
        },
        { canonicalContentDigest: digest, timing: 'interactive' },
      ),
    ).toThrow(/continue.*环/)
  })
})
