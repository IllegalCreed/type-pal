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
    setActorSprite: alog('setActorSprite'),
    fleeBattle: log('fleeBattle'),
    setEntityState: log('setEntityState'),
    setEntityFacing: log('setEntityFacing'),
    setEntityFrame: log('setEntityFrame'),
    giveItem: log('giveItem'),
    loseItem: log('loseItem'),
    giveMoney: log('giveMoney'),
    playSound: log('playSound'),
    playMusic: log('playMusic'),
    overrideSceneBattle: log('overrideSceneBattle'),
    takeEntity: log('takeEntity'),
    releaseEntity: log('releaseEntity'),
    mountParty: log('mountParty'),
    unmountParty: log('unmountParty'),
    ride: alog('ride'),
    moveEntity: alog('moveEntity'),
    stepEntity: log('stepEntity'),
    animEntity: log('animEntity'),
    nudgeEntity: log('nudgeEntity'),
    moveParty: alog('moveParty'),
    nudgeParty: log('nudgeParty'),
    startBattle: async (team: number) => {
      calls.push(`startBattle(${team})`)
      return 'win' as const
    },
    teleportOut: async () => {
      calls.push('teleportOut()')
      return false
    },
    openShop: log('openShop'),
    confirm: async () => {
      calls.push('confirm()')
      return true
    },
    cameraPan: alog('cameraPan'),
    cameraSnap: log('cameraSnap'),
    setEntityAuto: (id: string, st: ScriptStage[]) =>
      calls.push(`setEntityAuto(${id},${st.length})`),
    setEntityTrigger: (id: string, st: ScriptStage[]) =>
      calls.push(`setEntityTrigger(${id},${st.length})`),
    setEntityTriggerMode: log('setEntityTriggerMode'),
    query: {
      hasItem: () => false,
      money: () => 50,
      inParty: (id: string) => id === 'li-xiaoyao',
    },
    report: log('report'),
    chaseStep: alog('chaseStep'),
    vanishEntity: log('vanishEntity'),
    loadLastSave: alog('loadLastSave'),
    gameOver: alog('gameOver'),
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

describe('演出预览钩子(编辑器):onStep 路径上报 + 单步门', () => {
  test('onStep 逐命令上报嵌套路径(branch then 臂 / confirm onNo 臂)', async () => {
    const calls: string[] = []
    const paths: string[] = []
    const host = fakeHost(calls)
    host.confirm = async () => false // 走 onNo 臂
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal, () => 0)
    r.onStep = (ev) => paths.push(ev.path.join('/'))
    await r.runStages('k', [
      {
        body: [
          { kind: 'clearDialog' },
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 100 },
            then: [{ kind: 'playSound', soundId: 1 }],
          },
          { kind: 'confirm', onNo: [{ kind: 'giveMoney', delta: 5 }] },
        ],
      },
    ])
    expect(paths).toEqual(['0/0', '0/1', '0/1/then/0', '0/2', '0/2/onNo/0'])
  })

  test('单步门:每条命令执行前 await gate(嵌套臂内同样过门)', async () => {
    const calls: string[] = []
    let gated = 0
    const r = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      () => 0,
    )
    r.gate = async () => {
      gated++
    }
    await r.runStages('k', [
      {
        body: [
          { kind: 'clearDialog' },
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 100 },
            then: [{ kind: 'playSound', soundId: 1 }],
          },
        ],
      },
    ])
    expect(gated).toBe(3) // clearDialog + branch + then 臂内 playSound
  })
})

test('0x15/0x65 演出命令分发:姿势帧透传 gesture/member,换装走 setActorSprite', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.run([
    { kind: 'setPartyFacing', facing: 'down', gesture: 9 },
    { kind: 'setPartyFacing', facing: 'right' }, // 无 gesture = 清姿势(host 侧语义)
    { kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'npc-627' },
  ])
  expect(calls).toEqual([
    'setPartyFacing("down",9,)',
    'setPartyFacing("right",,)',
    'setActorSprite("li-xiaoyao","npc-627")',
  ])
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

describe('stopScript 跳转臂终止(原版跳转命中链到 END 不落穿)', () => {
  test('嵌套臂内 stop 穿透终止全脚本:臂后命令不跑、阶段不转移', async () => {
    const calls: string[] = []
    const world = emptyWorldScriptState()
    const r = new ScriptRunner(fakeHost(calls), world, new AbortController().signal, () => 0)
    await r.runStages('e1', [
      {
        body: [
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 79 }, // rnd 0 → 命中
            then: [{ kind: 'playSound', soundId: 7 }, { kind: 'stopScript' }],
          },
          { kind: 'giveItem', itemId: '99' }, // 命中臂后必须不落穿(曾 21% 掉落变 100%)
        ],
        next: 'advance',
      },
    ])
    expect(calls).toEqual(['playSound(7)'])
    expect(world.entityStage.e1 ?? 0).toBe(0) // stop → 阶段不转移(下次触发重掷)
  })
  test('不命中走落穿路径,自然收尾照常转移阶段', async () => {
    const calls: string[] = []
    const world = emptyWorldScriptState()
    const r = new ScriptRunner(fakeHost(calls), world, new AbortController().signal, () => 0.99)
    await r.runStages('e1', [
      {
        body: [
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 79 }, // rnd 0.99 → 不中
            then: [{ kind: 'stopScript' }],
          },
          { kind: 'giveItem', itemId: '99' },
        ],
        next: 'advance',
      },
    ])
    expect(calls).toEqual(['giveItem("99",1)'])
    expect(world.entityStage.e1).toBe(1) // 自然结束 → advance
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

test('unmigrated 上报不中断', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.run([{ kind: 'unmigrated', opcode: 0x24, operands: [1, 2, 0], note: 'setAutoScript' }])
  expect(calls.some((c) => c.startsWith('report') && c.includes('24'))).toBe(true)
})

describe('M3b 分支 / 条件 / 战斗 / 确认', () => {
  test('branch:chance 注入 random 定率;then/else 二选一', async () => {
    const calls: string[] = []
    const world = emptyWorldScriptState()
    const mk = (rnd: number) =>
      new ScriptRunner(fakeHost(calls), world, new AbortController().signal, () => rnd)
    const body: Command[] = [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 30 },
        then: [{ kind: 'giveMoney', delta: 1 }],
        else: [{ kind: 'giveMoney', delta: -1 }],
      },
    ]
    await mk(0.1).run(body) // 10 < 30 → then
    await mk(0.9).run(body) // 90 ≥ 30 → else
    expect(calls).toEqual(['giveMoney(1)', 'giveMoney(-1)'])
  })
  test('branch:hasMoney/inParty/entityState/not 组合走 query/world', async () => {
    const calls: string[] = []
    const world = emptyWorldScriptState()
    world.entityState.e7 = 2
    const r = new ScriptRunner(fakeHost(calls), world, new AbortController().signal)
    await r.run([
      {
        kind: 'branch',
        cond: { kind: 'hasMoney', atLeast: 40 },
        then: [{ kind: 'playSound', soundId: 1 }],
      }, // 50≥40 ✓
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'hasMoney', atLeast: 60 } },
        then: [{ kind: 'playSound', soundId: 2 }],
      },
      {
        kind: 'branch',
        cond: { kind: 'inParty', actorId: 'li-xiaoyao' },
        then: [{ kind: 'playSound', soundId: 3 }],
      },
      {
        kind: 'branch',
        cond: { kind: 'entityState', entity: 'e7', is: 2 },
        then: [{ kind: 'playSound', soundId: 4 }],
      },
      {
        kind: 'branch',
        cond: { kind: 'hasItem', itemId: '1' },
        then: [{ kind: 'playSound', soundId: 9 }],
      }, // false
    ])
    expect(calls).toEqual(['playSound(1)', 'playSound(2)', 'playSound(3)', 'playSound(4)'])
  })
  test('startBattle:win 直走;lose 走 onLose 臂', async () => {
    const calls: string[] = []
    const host = fakeHost(calls)
    let result: 'win' | 'lose' | 'flee' = 'lose'
    host.startBattle = async () => result
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal)
    const body: Command[] = [
      { kind: 'startBattle', team: 5, onLose: [{ kind: 'playSound', soundId: 99 }] },
      { kind: 'playSound', soundId: 1 },
    ]
    await r.run(body)
    expect(calls).toEqual(['playSound(99)', 'playSound(1)']) // 败臂后仍续走(臂内自终结才会停)
    calls.length = 0
    result = 'win'
    await r.run(body)
    expect(calls).toEqual(['playSound(1)'])
  })
  test('startBattle 透传 fieldId/musicId;overrideSceneBattle 派发三参', async () => {
    const calls: string[] = []
    const host = fakeHost(calls)
    host.startBattle = async (team, opts) => {
      calls.push(`battle(${team},f=${opts?.fieldId},m=${opts?.musicId})`)
      return 'win'
    }
    host.overrideSceneBattle = (sc, f, m) => {
      calls.push(`override(${sc ?? 'cur'},f=${f},m=${m})`)
    }
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal)
    await r.run([
      { kind: 'startBattle', team: 27, fieldId: 22, musicId: 44 },
      { kind: 'overrideSceneBattle', fieldId: 53, musicId: 39 },
      { kind: 'overrideSceneBattle', scene: 's099', musicId: 40 },
    ])
    expect(calls).toEqual([
      'battle(27,f=22,m=44)',
      'override(cur,f=53,m=39)',
      'override(s099,f=undefined,m=40)',
    ])
  })
  test('teleportOut:成功(有出口)直走;失败(无出口)走 onFail 臂', async () => {
    const calls: string[] = []
    const host = fakeHost(calls)
    let ok = false
    host.teleportOut = async () => {
      calls.push(`teleportOut→${ok}`)
      return ok
    }
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal)
    const body: Command[] = [
      { kind: 'teleportOut', onFail: [{ kind: 'playSound', soundId: 42 }] },
      { kind: 'playSound', soundId: 1 },
    ]
    await r.run(body)
    expect(calls).toEqual(['teleportOut→false', 'playSound(42)', 'playSound(1)']) // 不灵 → onFail 后续走
    calls.length = 0
    ok = true
    await r.run(body)
    expect(calls).toEqual(['teleportOut→true', 'playSound(1)']) // 传走成功,不跑 onFail
  })
  test('confirm:是 → 直走;否 → onNo 臂', async () => {
    const calls: string[] = []
    const host = fakeHost(calls)
    let yes = false
    host.confirm = async () => yes
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal)
    const body: Command[] = [
      { kind: 'confirm', onNo: [{ kind: 'playSound', soundId: 7 }] },
      { kind: 'playSound', soundId: 1 },
    ]
    await r.run(body)
    expect(calls).toEqual(['playSound(7)', 'playSound(1)'])
    calls.length = 0
    yes = true
    await r.run(body)
    expect(calls).toEqual(['playSound(1)'])
  })
})

test('E6b takeEntity/releaseEntity 派发到 host', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.runStages('t', [
    {
      body: [
        { kind: 'takeEntity', entity: 'e1' },
        { kind: 'releaseEntity', entity: 'e1' },
        { kind: 'releaseEntity' },
      ],
    },
  ])
  expect(calls).toContain('takeEntity("e1")')
  expect(calls).toContain('releaseEntity("e1")')
  expect(calls).toContain('releaseEntity()')
})
