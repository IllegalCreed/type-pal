import type { BaseScriptFlow, BaseScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { BaseSharedScriptResolver, compileBaseScriptFlow } from './script-compiler-core.js'

const digest = 'a'.repeat(64)

describe('canonical script compiler', () => {
  test('auto and interactive lower the same explicit structured commands without hidden timing', () => {
    const flow: BaseScriptFlow = {
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
            {
              kind: 'loop',
              mode: 'forever',
              body: [{ kind: 'wait', ms: 100 }, { kind: 'breakLoop' }],
            },
            { kind: 'repeat', count: 3, body: [{ kind: 'clearDialog' }] },
            { kind: 'confirm', onYes: [{ kind: 'clearDialog' }], onNo: [{ kind: 'clearDialog' }] },
            {
              kind: 'startBattle',
              enemyTeamId: 'team',
              onLose: [{ kind: 'clearDialog' }],
              onFlee: [{ kind: 'clearDialog' }],
            },
            { kind: 'teleportOut', onFail: [{ kind: 'clearDialog' }] },
            { kind: 'finishStep', next: { kind: 'complete' } },
          ],
        },
      ],
    }
    const auto = compileBaseScriptFlow(flow, { canonicalContentDigest: digest, timing: 'auto' })
    const interactive = compileBaseScriptFlow(flow, {
      canonicalContentDigest: digest,
      timing: 'interactive',
    })
    expect(auto.compilerVersion).toBe(3)
    expect(auto.flow).toEqual(interactive.flow)
    expect(auto.flow.stages[0]!.body).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'go', is: true },
        then: [{ kind: 'leaf', command: { kind: 'clearDialog' } }],
        else: [],
      },
      {
        kind: 'loop',
        mode: 'forever',
        body: [{ kind: 'leaf', command: { kind: 'wait', ms: 100 } }, { kind: 'breakLoop' }],
      },
      { kind: 'repeat', count: 3, body: [{ kind: 'leaf', command: { kind: 'clearDialog' } }] },
      {
        kind: 'confirm',
        onYes: [{ kind: 'leaf', command: { kind: 'clearDialog' } }],
        onNo: [{ kind: 'leaf', command: { kind: 'clearDialog' } }],
      },
      {
        kind: 'startBattle',
        request: { enemyTeamId: 'team' },
        onLose: [{ kind: 'leaf', command: { kind: 'clearDialog' } }],
        onFlee: [{ kind: 'leaf', command: { kind: 'clearDialog' } }],
      },
      { kind: 'teleportOut', onFail: [{ kind: 'leaf', command: { kind: 'clearDialog' } }] },
      { kind: 'finishStep', next: { kind: 'complete' } },
    ])
  })

  test('binds compiled shared scripts to timing and canonical digest without boundary variants', () => {
    const library: BaseScriptLibrary = {
      helper: { name: '帮助脚本', self: 'required', body: [{ kind: 'clearDialog' }] },
    }
    const resolver = new BaseSharedScriptResolver(library, digest)
    const auto = resolver.resolve('helper', 'auto')
    const interactive = resolver.resolve('helper', 'interactive')
    expect(auto.canonicalContentDigest).toBe(digest)
    expect(auto.timing).toBe('auto')
    expect(interactive.timing).toBe('interactive')
    expect(auto.body).toEqual([{ kind: 'leaf', command: { kind: 'clearDialog' } }])
    expect(interactive.body).toEqual(auto.body)
    expect(auto).not.toBe(interactive)
    expect(resolver.resolve('helper', 'auto')).toBe(auto)
    expect(() => resolver.resolve('missing', 'auto')).toThrow(/不存在/)
  })

  test('rejects dangling explicit step exits before lowering', () => {
    expect(() =>
      compileBaseScriptFlow(
        {
          kind: 'stages',
          initial: 'first',
          stages: [
            {
              id: 'first',
              body: [{ kind: 'finishStep', next: { kind: 'stage', stage: 'missing' } }],
            },
          ],
        },
        { canonicalContentDigest: digest, timing: 'interactive' },
      ),
    ).toThrow(/未命中/)
  })
})
