/**
 * TEST-NONVISUAL-COVERAGE-2 W2-A A01：script-host-adapter 未测派发臂（wave2）。
 * current-dispatch 既有文件覆盖首批命令/挂起/错误传播/保真；本文件只补冻结定位中的
 * 未测 leaf（fade/chase/loadLastSave/gameOver/teleport/setActor 系列与 setEntity 系列、
 * shake/toggleDayNight/setFollowers/halveMoney 等）与显式默认值、activeEntity 场景过滤。
 * vanishEntity 属 current 禁用域（UNREACH），不测。命令全部经 compileRuntimeCommands 守卫编译。
 */
import { describe, expect, test } from 'vitest'
import {
  assertWave2AdapterHostFixtureLegal,
  wave2DispatchCommands,
  wave2RecorderHost,
  wave2RecorderHostWithAsync,
} from './__tests__/coverage-wave2/a-adapter-host.js'
import { deepSnapshot, deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { compileRuntimeCommands } from './runtime-script-compiler.js'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

const context = { self: { scene: 's1', entity: 'chaser' } } as Readonly<ScriptRuntimeContext>
const options = { currentSceneId: () => 's1' }

async function runLeaves(host: ScriptHost, commands: unknown[], signal: AbortSignal) {
  const compiled = compileRuntimeCommands(commands as never[], 'interactive', 'test')
  for (const item of compiled) {
    const like = item as { kind?: string; command?: unknown }
    const leaf = like.kind === 'leaf' && 'command' in like ? like.command : item
    await executeScriptHostEffect(host, leaf as never, context, signal, options)
  }
}

describe('W2-A A01 wave2 派发臂', () => {
  test('fixture 合法门：wave2 记录宿主成员与接口一致', () => {
    expect(() => assertWave2AdapterHostFixtureLegal()).not.toThrow()
  })

  test('wave2 未测 leaf 全参数派发：显式值与缺省值逐参核对', async () => {
    const { host, calls } = wave2RecorderHost()
    const commands = wave2DispatchCommands()
    const snapshot = deepSnapshot(commands)
    const signal = new AbortController().signal
    await runLeaves(host, commands, signal)
    expect(calls).toEqual([
      { method: 'fade', args: ['in', 250, undefined, signal] },
      { method: 'fade', args: ['out', 300, undefined, signal] }, // ms 缺省 300
      { method: 'chaseStep', args: ['chaser', 6, 2, false, signal] },
      { method: 'loadLastSave', args: [signal] },
      { method: 'gameOver', args: [signal] },
      { method: 'teleportParty', args: [{ col: 3, row: 4 }, 'down'] },
      { method: 'setPartyFacing', args: ['left', undefined, undefined] },
      { method: 'setActorSprite', args: ['a1', 'spr.x', signal] },
      {
        method: 'setActorAppearance',
        args: ['a1', { spriteId: 'spr.y', portrait: 'pic.z', battleSprite: 'bs.w' }, signal],
      },
      { method: 'fleeBattle', args: [] },
      { method: 'setEntityState', args: ['e1', 7] },
      { method: 'setEntityState', args: ['e1', 3] }, // setMultiEntityState：首个在场 target
      { method: 'setEntityPos', args: ['e1', { col: 1, row: 2 }] },
      { method: 'setEntityPosRelParty', args: ['e1', -1, 2] },
      { method: 'shakeScreen', args: [12, 3] },
      { method: 'toggleDayNight', args: [undefined] },
      { method: 'setFollowers', args: [['f1', 'f2'], signal] },
      { method: 'giveMoney', args: [-256] }, // halveMoney：512→扣除一半
      { method: 'setEntityFacing', args: ['e1', 'up'] },
      { method: 'setEntityFrame', args: ['e1', 5] },
      {
        method: 'playEntityAction',
        args: [
          'e1',
          { sprite: 'spr.npc', action: 'talk', loop: true, startAtMs: undefined },
          signal,
        ],
      },
      { method: 'stopEntityAction', args: ['e1', true] },
      { method: 'takeEntity', args: ['e1'] },
      { method: 'releaseEntity', args: [] },
      { method: 'mountParty', args: ['horse', 1, 0] }, // dy 缺省 0
      { method: 'unmountParty', args: [] },
      { method: 'ride', args: ['boat', { col: 9, row: 8 }, 3, signal] },
      { method: 'setParty', args: [['a1', 'a2'], signal] },
      {
        method: 'applyActorCondition',
        args: ['a1', { kind: 'status', status: 'protect', turns: 7 }, signal],
      },
      {
        method: 'clearActorCondition',
        args: ['a1', { kind: 'status', status: 'protect' }, signal],
      },
      { method: 'moveEntity', args: ['e1', { col: 2, row: 3 }, 4, signal] },
      { method: 'stepEntity', args: ['e1', 'down'] },
      { method: 'animEntity', args: ['e1'] },
      { method: 'nudgeEntity', args: ['e1', 1, -1] },
      { method: 'moveParty', args: [{ col: 5, row: 5 }, 2, signal] },
      { method: 'nudgeParty', args: [0, 1, 0] }, // layer 缺省 0
    ])
    expect(deepSnapshot(commands)).toEqual(snapshot) // 派发前后命令对象保真
  })

  test('跨场景 target 被 activeEntity 过滤：宿主零调用且不抛', async () => {
    const { host, calls } = wave2RecorderHost()
    const signal = new AbortController().signal
    await runLeaves(
      host,
      [
        { kind: 'setEntityState', target: { scene: 'other', entity: 'e1' }, state: 2 },
        {
          kind: 'moveEntity',
          target: { scene: 'other', entity: 'e1' },
          to: { col: 0, row: 0 },
          speed: 1,
        },
        { kind: 'setMultiEntityState', targets: [{ scene: 'other', entity: 'a' }], state: 1 },
      ],
      signal,
    )
    expect(calls).toEqual([]) // 全部跨场景 → activeEntity undefined → 静默跳过
  })

  test('setMultiEntityState 跨场景在前、在场在后：find 选中首个在场 target 单次派发', async () => {
    const { host, calls } = wave2RecorderHost()
    const signal = new AbortController().signal
    await runLeaves(
      host,
      [
        {
          kind: 'setMultiEntityState',
          targets: [
            { scene: 'other', entity: 'skip' },
            { scene: 's1', entity: 'hit' },
          ],
          state: 9,
        },
      ],
      signal,
    )
    expect(calls).toEqual([{ method: 'setEntityState', args: ['hit', 9] }])
  })

  test('可选宿主成员缺席：setEntityPos/shakeScreen 可选链跳过、零调用不抛', async () => {
    const absent = wave2RecorderHost(['setEntityPos', 'shakeScreen'])
    const signal = new AbortController().signal
    await expect(
      runLeaves(
        absent.host,
        [
          {
            kind: 'setEntityPos',
            target: { scene: 's1', entity: 'e1' },
            pos: { col: 1, row: 1 },
          },
          { kind: 'shakeScreen', frames: 3, level: 1 },
        ],
        signal,
      ),
    ).resolves.toBeUndefined()
    expect(absent.calls).toEqual([]) // 缺席 → 可选链跳过，零调用
  })

  test('playEntityAction wait 模式后台失败原样经 await 传播（不吞不改写）', async () => {
    const gate = deferred<void>()
    const { host } = wave2RecorderHostWithAsync('playEntityAction', () =>
      gate.promise.then(() => {
        throw new Error('action sprite missing')
      }),
    )
    const signal = new AbortController().signal
    const pending = runLeaves(
      host,
      [
        {
          kind: 'playEntityAction',
          target: { scene: 's1', entity: 'e1' },
          sprite: 'spr.x',
          action: 'a',
          loop: true,
          wait: true,
        },
      ],
      signal,
    )
    gate.resolve()
    await expect(pending).rejects.toThrow('action sprite missing') // wait 模式传播原始错误
  })

  test('playEntityAction 后台模式失败只经 host.report 观测、不抛且不误吞', async () => {
    const reports: string[] = []
    const gate = deferred<void>()
    const calls: { method: string; args: unknown[] }[] = []
    const host = {
      playEntityAction: (...args: unknown[]) => {
        calls.push({ method: 'playEntityAction', args })
        return gate.promise.then(() => {
          throw new Error('boom')
        })
      },
      report: (message: string) => reports.push(message),
    } as unknown as ScriptHost
    const signal = new AbortController().signal
    await runLeaves(
      host,
      [
        {
          kind: 'playEntityAction',
          target: { scene: 's1', entity: 'e9' },
          sprite: 'spr.b',
          action: 'walk',
          loop: true,
          wait: false,
        },
      ],
      signal,
    )
    expect(calls).toHaveLength(1)
    expect(reports).toEqual([]) // gate 未释放：后台失败尚未发生
    gate.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(reports).toEqual(['playEntityAction(e9,spr.b,walk) 后台播放失败: boom'])
  })
})
