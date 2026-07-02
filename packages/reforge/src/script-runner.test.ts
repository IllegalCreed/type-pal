import type { Command, ScriptStage } from '@type-pal/content'
import { emptyWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ScriptHost } from './script-runner.js'
import { ScriptRunner } from './script-runner.js'

/** 记录调用序的 fake host;异步项立即 resolve(顺序性由调用序断言)。 */
function fakeHost(calls: string[]): ScriptHost {
  const log =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(',')})`)
    }
  const alog =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(',')})`)
    }
  return {
    dialog: alog('dialog'),
    clearDialog: log('clearDialog'),
    fade: alog('fade'),
    wait: alog('wait'),
    teleportParty: log('teleportParty'),
    loadScene: alog('loadScene'),
    setPartyFacing: log('setPartyFacing'),
    setEntityState: log('setEntityState'),
    setEntityFacing: log('setEntityFacing'),
    setEntityFrame: log('setEntityFrame'),
    giveItem: log('giveItem'),
    loseItem: log('loseItem'),
    giveMoney: log('giveMoney'),
    playSound: log('playSound'),
    playMusic: log('playMusic'),
    setBattleMusic: log('setBattleMusic'),
    setBattleField: log('setBattleField'),
    report: log('report'),
  }
}

test('顺序执行 + 世界状态写入(flags/vars/entityState 双写)', async () => {
  const calls: string[] = []
  const world = emptyWorldScriptState()
  const r = new ScriptRunner(fakeHost(calls), world, new AbortController().signal)
  const body: Command[] = [
    { kind: 'dialog', line: { text: 'dlg.1' } },
    { kind: 'setFlag', flag: 'met', value: true },
    { kind: 'setVar', var: 'n', value: 2 },
    { kind: 'addVar', var: 'n', delta: 3 },
    { kind: 'setEntityState', entity: 'e9', state: 0 },
    { kind: 'giveItem', itemId: '166' },
    { kind: 'loadScene', scene: 's001', pos: { col: 1, row: 2, height: 0 } },
  ]
  await r.run(body)
  expect(calls).toEqual([
    'dialog({"text":"dlg.1"})',
    'setEntityState("e9",0)',
    'giveItem("166",1)',
    'loadScene("s001",{"col":1,"row":2,"height":0},)', // JSON.stringify(undefined) → 空段

  ])
  expect(world.flags.met).toBe(true)
  expect(world.vars.n).toBe(5)
  expect(world.entityState.e9).toBe(0)
})

describe('stages 阶段机', () => {
  const stages: ScriptStage[] = [
    { body: [{ kind: 'setVar', var: 'ran', value: 0 }], next: 'advance' },
    { body: [{ kind: 'setVar', var: 'ran', value: 1 }], next: 0 },
    { body: [{ kind: 'setVar', var: 'ran', value: 2 }] }, // 不可达(1 段 reset 回 0)
  ]
  test('advance 推进 → reset 回跳 → stay 缺省', async () => {
    const world = emptyWorldScriptState()
    const r = new ScriptRunner(fakeHost([]), world, new AbortController().signal)
    await r.runStages('e1', stages)
    expect(world.vars.ran).toBe(0)
    expect(world.entityStage.e1).toBe(1) // advance
    await r.runStages('e1', stages)
    expect(world.vars.ran).toBe(1)
    expect(world.entityStage.e1).toBe(0) // reset 到 0
    await r.runStages('e1', stages)
    expect(world.vars.ran).toBe(0)
  })
  test('stage 越界钳到末段', async () => {
    const world = emptyWorldScriptState()
    world.entityStage.e1 = 99
    const r = new ScriptRunner(fakeHost([]), world, new AbortController().signal)
    await r.runStages('e1', stages)
    expect(world.vars.ran).toBe(2)
  })
})

test('abort:await 间隙取消,后续命令不再执行', async () => {
  const calls: string[] = []
  const ac = new AbortController()
  const host = fakeHost(calls)
  host.dialog = async () => {
    calls.push('dialog')
    ac.abort() // 对话中途取消(模拟切场景/读档)
  }
  const r = new ScriptRunner(host, emptyWorldScriptState(), ac.signal)
  await expect(
    r.run([
      { kind: 'dialog', line: { text: 'x' } },
      { kind: 'giveItem', itemId: '1' },
    ]),
  ).rejects.toThrow(/aborted/)
  expect(calls).toEqual(['dialog']) // giveItem 未执行
})

test('unmigrated 上报不中断;branch 上报走 then 臂(M3b 前保守)', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.run([
    { kind: 'unmigrated', opcode: 0x24, operands: [1, 2, 0], note: 'setAutoScript' },
    { kind: 'branch', cond: { kind: 'chance', percent: 50 }, then: [{ kind: 'giveMoney', delta: 5 }] },
  ])
  expect(calls.some((c) => c.startsWith('report') && c.includes('24'))).toBe(true)
  expect(calls.some((c) => c.startsWith('giveMoney(5'))).toBe(true)
})
