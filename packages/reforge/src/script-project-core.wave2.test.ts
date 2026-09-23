/**
 * TEST-NONVISUAL-COVERAGE-2 W2-A A03/A05：script-project-core 命令落地与 moveEntity
 * 提交控制（wave2）。直接实例化真实 BaseProjectScriptRuntimeHost；世界真值全走产品写入，
 * executeEffect/worldChanged 只做观察。A03 钉多 target 全量写入后命令级恰一次通知；
 * A05 钉 moveEntity 提交前/后取消与会话漂移（v5 收窄后仍未证的真实缺口）。
 * 命令经 fixture 的 run 包装走真实宿主派发入口。
 */
import type { RuntimeCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  wave2CoreCommands,
  wave2ProjectHarness,
} from './__tests__/coverage-wave2/a-project-host.js'
import type { MoveEntityCommitControl } from './script-project-core.js'

async function applyEach(
  harness: ReturnType<typeof wave2ProjectHarness>,
  commands: RuntimeCommand[],
  signal: AbortSignal,
) {
  for (const command of commands) await harness.run(command, signal)
}

describe('W2-A A03 core 命令落地', () => {
  test('setVar/addVar/setScreenWave/setEntityState/setEntityPos 写入真值且逐命令恰一次通知', async () => {
    const h = wave2ProjectHarness()
    const commands = wave2CoreCommands()
    const signal = new AbortController().signal
    await applyEach(h, commands, signal)
    expect(h.world.vars).toEqual({
      gold: 42,
      kills: 3,
      fresh: 7,
      'sys:screenWave': 2,
      'sys:waveProgression': 9,
    })
    expect(h.world.entityState).toEqual({ s1: { e1: 5, a: 6, b: 6 } })
    expect(h.world.entityPos).toEqual({
      s1: { e1: { col: 2, row: 3, height: 0 }, e2: { col: 4, row: 7, height: 0 } },
    })
    expect(h.worldChangedCommands).toHaveLength(commands.length)
    expect(h.notifications[0]!.snapshot.vars.gold).toBe(42)
  })

  test('setMultiEntityState 逐 target 全量写入后命令级一次通知', async () => {
    const h = wave2ProjectHarness()
    const signal = new AbortController().signal
    await h.run(
      {
        kind: 'setMultiEntityState',
        targets: [
          { scene: 's1', entity: 'z1' },
          { scene: 's1', entity: 'z2' },
        ],
        state: 8,
      },
      signal,
    )
    expect(h.world.entityState.s1).toEqual({ z1: 8, z2: 8 })
    expect(h.worldChangedCommands).toHaveLength(1)
    expect(h.notifications[0]!.snapshot.entityState.s1).toEqual({ z1: 8, z2: 8 })
  })

  test('addVar 在已有值上累加；setVar 覆写同变量', async () => {
    const h = wave2ProjectHarness()
    h.world.vars.gold = 10
    const signal = new AbortController().signal
    await applyEach(
      h,
      [
        { kind: 'addVar', var: 'gold', delta: 5 },
        { kind: 'setVar', var: 'gold', value: 1 },
      ],
      signal,
    )
    expect(h.world.vars.gold).toBe(1)
  })
})

describe('W2-A A05 moveEntity 提交控制（未证缺口补测）', () => {
  test('宿主未提交时 effect 结束后自动提交端点并通知一次', async () => {
    const h = wave2ProjectHarness()
    const signal = new AbortController().signal
    await h.run(
      {
        kind: 'moveEntity',
        target: { scene: 's1', entity: 'm1' },
        to: { col: 6, row: 7, height: 0 },
        speed: 'normal',
      },
      signal,
    )
    expect(h.world.entityPos).toEqual({ s1: { m1: { col: 6, row: 7, height: 0 } } })
    expect(h.worldChangedCommands).toHaveLength(1)
  })

  test('宿主提交后 committed 幂等：二次 commit 不再写也不重复通知', async () => {
    let control: MoveEntityCommitControl | undefined
    const harness = wave2ProjectHarness({
      executeEffect: (_command, _context, _signal, commitControl) => {
        if (commitControl?.kind !== 'moveEntity') throw new Error('expected move control')
        control = commitControl
        control!.commitMoveEntityEndpoint()
      },
    })
    const signal = new AbortController().signal
    await harness.run(
      {
        kind: 'moveEntity',
        target: { scene: 's1', entity: 'm1' },
        to: { col: 1, row: 1, height: 0 },
        speed: 'normal',
      },
      signal,
    )
    expect(control).toBeDefined()
    control!.commitMoveEntityEndpoint()
    expect(harness.worldChangedCommands).toHaveLength(1)
    expect(harness.world.entityPos!.s1!.m1).toEqual({ col: 1, row: 1, height: 0 })
  })

  test('提交前 abort：端点零写入零通知', async () => {
    const controller = new AbortController()
    const harness = wave2ProjectHarness({
      executeEffect: () => {
        controller.abort()
      },
    })
    await expect(
      harness.run(
        {
          kind: 'moveEntity',
          target: { scene: 's1', entity: 'm1' },
          to: { col: 2, row: 2, height: 0 },
          speed: 'normal',
        },
        controller.signal,
      ),
    ).rejects.toThrow()
    expect(harness.world.entityPos).toBeUndefined()
    expect(harness.worldChangedCommands).toEqual([])
  })

  test('提交时场景漂移（scene 变化）：AbortError、端点零写入', async () => {
    const harness = wave2ProjectHarness({
      executeEffect: (_c, _x, _sig, commitControl) => {
        harness.setScene('other')
        if (commitControl?.kind !== 'moveEntity') throw new Error('expected move control')
        commitControl.commitMoveEntityEndpoint()
      },
    })
    const signal = new AbortController().signal
    const outcome = await harness
      .run(
        {
          kind: 'moveEntity',
          target: { scene: 's1', entity: 'm1' },
          to: { col: 3, row: 3, height: 0 },
          speed: 'normal',
        },
        signal,
      )
      .then(
        () => ({ status: 'resolved' }),
        (error) => ({ status: 'rejected', name: error.name, message: error.message }),
      )
    expect(outcome).toEqual({
      status: 'rejected',
      name: 'AbortError',
      message: 'moveEntity scene session changed',
    })
    expect(harness.world.entityPos).toBeUndefined()
    expect(harness.worldChangedCommands).toEqual([])
  })

  test('提交时会话漂移（session 变化、scene 不变）：AbortError、端点零写入', async () => {
    const harness = wave2ProjectHarness({
      executeEffect: (_c, _x, _sig, commitControl) => {
        harness.setSession('session-2')
        if (commitControl?.kind !== 'moveEntity') throw new Error('expected move control')
        commitControl.commitMoveEntityEndpoint()
      },
    })
    const signal = new AbortController().signal
    const outcome = await harness
      .run(
        {
          kind: 'moveEntity',
          target: { scene: 's1', entity: 'm1' },
          to: { col: 4, row: 4, height: 0 },
          speed: 'normal',
        },
        signal,
      )
      .then(
        () => ({ status: 'resolved' }),
        (error) => ({ status: 'rejected', name: error.name, message: error.message }),
      )
    expect(outcome).toEqual({
      status: 'rejected',
      name: 'AbortError',
      message: 'moveEntity scene session changed',
    })
    expect(harness.world.entityPos).toBeUndefined()
    expect(harness.worldChangedCommands).toEqual([])
  })

  test('提交后 abort：端点保留不回滚、通知已发、后续命令停止', async () => {
    const controller = new AbortController()
    const harness = wave2ProjectHarness({
      executeEffect: (_c, _x, _sig, commitControl) => {
        if (commitControl?.kind !== 'moveEntity') throw new Error('expected move control')
        commitControl.commitMoveEntityEndpoint()
        controller.abort()
      },
    })
    await expect(
      harness.runAll(
        [
          {
            kind: 'moveEntity',
            target: { scene: 's1', entity: 'm1' },
            to: { col: 5, row: 5, height: 0 },
            speed: 'normal',
          },
          { kind: 'setVar', var: 'must-not-run', value: 1 },
        ],
        controller.signal,
      ),
    ).rejects.toThrow()
    expect(harness.world.entityPos!.s1!.m1).toEqual({ col: 5, row: 5, height: 0 })
    expect(harness.world.vars).toEqual({})
    expect(harness.worldChangedCommands).toHaveLength(1)
  })
})

describe('W2-A A05 宿主等待方法', () => {
  test('wait 纯委托：ms 与 signal 状态原样到达宿主选项（abort 语义属宿主实现）', async () => {
    const h = wave2ProjectHarness()
    const signal = new AbortController().signal
    await h.host.wait(120, signal)
    const controller = new AbortController()
    controller.abort()
    await h.host.wait(90, controller.signal)
    await h.host.waitWorldTick(signal)
    await h.host.yieldMacroTask(signal)
    expect(h.waitCalls).toEqual([
      { ms: 120, aborted: false },
      { ms: 90, aborted: true }, // signal 状态透传，core 不吞不改
    ])
  })

  test('evalCondition 委托 script-world 条件求值（flag/var 算子）', () => {
    const h = wave2ProjectHarness()
    h.world.flags.done = true
    h.world.vars.count = 5
    expect(h.host.evalCondition({ kind: 'flag', flag: 'done', is: true }, {})).toBe(true)
    expect(h.host.evalCondition({ kind: 'flag', flag: 'done', is: false }, {})).toBe(false)
    expect(h.host.evalCondition({ kind: 'var', var: 'count', op: '>=', value: 5 }, {})).toBe(true)
    expect(h.host.evalCondition({ kind: 'var', var: 'count', op: '<', value: 5 }, {})).toBe(false)
  })
})
