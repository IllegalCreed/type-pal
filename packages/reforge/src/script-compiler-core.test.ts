import type { BaseScriptFlow, BaseScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { compileBaseScriptFlow, BaseSharedScriptResolver } from './script-compiler-core.js'

const digest = 'a'.repeat(64)

describe('canonical script compiler', () => {
  test('materializes auto compatibility boundaries for nested author commands', () => {
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
          ],
        },
      ],
    }

    const auto = compileBaseScriptFlow(flow, {
      canonicalContentDigest: digest,
      timing: 'auto',
    })
    const interactive = compileBaseScriptFlow(flow, {
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
    expect(auto.compilerVersion).toBe(2)
    expect(auto.boundaryPolicy).toBe('perCommand')
    expect(interactiveBranch.after).toEqual([])
    expect(interactiveBranch.then[0]!.after).toEqual([])
  })

  test('transition cadence removes compatibility boundaries recursively', () => {
    const compiled = compileBaseScriptFlow(
      {
        kind: 'stateMachine',
        machine: {
          id: 'source-machine',
          label: '源指令状态机',
          cadence: 'transition',
          initial: 'initial',
          states: {
            initial: {
              label: '源指令',
              body: [
                {
                  kind: 'branch',
                  cond: { kind: 'flag', flag: 'branch', is: true },
                  then: [{ kind: 'clearDialog' }],
                  else: [{ kind: 'clearDialog' }],
                },
                {
                  kind: 'loop',
                  mode: 'while',
                  cond: { kind: 'flag', flag: 'loop', is: true },
                  body: [{ kind: 'clearDialog' }],
                  yield: 'worldTick',
                  maxIterations: 1,
                },
                { kind: 'confirm', onNo: [{ kind: 'clearDialog' }] },
                {
                  kind: 'startBattle',
                  enemyTeamId: 'team-1',
                  onLose: [{ kind: 'clearDialog' }],
                  onFlee: [{ kind: 'clearDialog' }],
                },
                { kind: 'teleportOut', onFail: [{ kind: 'clearDialog' }] },
              ],
              next: { kind: 'stay' },
            },
          },
        },
      },
      { canonicalContentDigest: digest, timing: 'auto' },
    )
    if (compiled.flow.kind !== 'stateMachine') throw new Error('expected state machine')
    const body = compiled.flow.machine.states.initial!.body
    const [branch, loop, confirm, battle, teleport] = body
    if (
      branch?.kind !== 'branch' ||
      loop?.kind !== 'loop' ||
      confirm?.kind !== 'confirm' ||
      battle?.kind !== 'startBattle' ||
      teleport?.kind !== 'teleportOut'
    )
      throw new Error('expected recursive commands')

    expect(compiled.compilerVersion).toBe(2)
    expect(compiled.boundaryPolicy).toBe('transition')
    expect(body.map((command) => command.after)).toEqual([[], [], [], [], []])
    expect([
      branch.then[0]!.after,
      branch.else[0]!.after,
      loop.body[0]!.after,
      confirm.onNo[0]!.after,
      battle.onLose?.[0]!.after,
      battle.onFlee?.[0]!.after,
      teleport.onFail?.[0]!.after,
    ]).toEqual([[], [], [], [], [], [], []])
  })

  test('binds compiled shared scripts to timing and canonical digest', () => {
    const library: BaseScriptLibrary = {
      helper: {
        name: '帮助脚本',
        self: 'required',
        body: [{ kind: 'clearDialog' }],
      },
    }
    const resolver = new BaseSharedScriptResolver(library, digest)
    const auto = resolver.resolve('helper', 'auto')
    const interactive = resolver.resolve('helper', 'interactive')
    const transition = resolver.resolve('helper', 'auto', 'transition')

    expect(auto.canonicalContentDigest).toBe(digest)
    expect(auto.timing).toBe('auto')
    expect(auto.boundaryPolicy).toBe('perCommand')
    expect(auto.body[0]!.after).toEqual([{ kind: 'wait', ms: 100 }])
    expect(interactive.body[0]!.after).toEqual([])
    expect(transition.boundaryPolicy).toBe('transition')
    expect(transition.body[0]!.after).toEqual([])
    expect(resolver.resolve('helper', 'auto')).toBe(auto)
    expect(resolver.resolve('helper', 'auto', 'transition')).toBe(transition)
    expect(transition).not.toBe(auto)
    expect(() => resolver.resolve('missing', 'auto')).toThrow(/不存在/)
  })

  test('rejects non-canonical flows before lowering', () => {
    expect(() =>
      compileBaseScriptFlow(
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
