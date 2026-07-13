import type { Command, ScriptStage } from '@type-pal/content'
import { emptyWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ScriptHost } from './script-runner.js'
import { ScriptRunner } from './script-runner.js'
import type { ScriptResolver } from './script-chunk-store.js'
import { buildPayload } from './save/ops.js'
import { makeTestWorld } from './test-fixtures.js'

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
    ditherScreen: alog('ditherScreen'),
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
    setAmbience: log('setAmbience'),
    takeEntity: log('takeEntity'),
    releaseEntity: log('releaseEntity'),
    mountParty: log('mountParty'),
    setParty: log('setParty'),
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
    playVideo: alog('playVideo'),
    playRng: alog('playRng'),
    teleportOut: async () => {
      calls.push('teleportOut()')
      return false
    },
    openShop: alog('openShop'),
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
      allFullHp: () => true,
      itemEquipped: () => false,
      entityInScene: (id: string) => id === 'e100',
    },
    report: log('report'),
    chaseStep: alog('chaseStep'),
    vanishEntity: log('vanishEntity'),
    loadLastSave: alog('loadLastSave'),
    gameOver: alog('gameOver'),
    shakeScreen: log('shakeScreen'),
    toggleDayNight: log('toggleDayNight'),
    increaseHpMp: log('increaseHpMp'),
    revivePartyAll: log('revivePartyAll'),
    learnSkill: log('learnSkill'),
    setEntityPos: log('setEntityPos'),
    // 0x6F 源状态:e103 隐(0)、其余可见(1)—— 双臂用例
    getEntityState: (id: string) => (id === 'e103' ? 0 : 1),
    unequipRole: log('unequipRole'),
  }
}

test('legacy op 兼容层:静默 0x00/0x08,直映射 0x85/0x93/0x35/0x36+0x37/0x80/0x77,未覆盖仍上报', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  const un = (opcode: number, operands: number[]): Command => ({
    kind: 'unmigrated',
    opcode,
    operands,
  })
  await r.run(
    [
      un(0x00, [19309, 0, 0]), // NOP 占位 → 静默
      un(0x08, [0, 0, 0]), // 触发入口推进 → stage 体系已承担,静默
      un(0x85, [30, 0, 0]), // 延时 30×80ms
      un(0x93, [8, 0, 0]), // SceneFade step 8 → ceil(64/8)×100 = 800ms 渐入
      un(0x93, [0xffff, 0, 0]), // step −1 → 6400ms 渐出
      un(0x35, [999, 4, 0]), // 震屏 999 帧 level4
      un(0x35, [0, 0, 0]), // 关震屏(level 缺省补 4)
      un(0x36, [5, 0, 0]), // 设 RNG 序列 5
      un(0x37, [0, 0, 7]), // 播 RNG:chunk=5(0x36 设的),end≤0 → 缺省,speed 7
      un(0x80, [0, 0, 0]), // 昼夜切换,更新场景模式 → 3200ms 渐变
      un(0x77, [0, 0, 0]), // 停乐
      un(0x1d, [1, 9999, 0]), // 全队增血蓝(HP/MP 同加 op1;op2 忽略 = sdlpal/一阶段裁决)
      un(0x1d, [1, 0xfc19, 0]), // 负增量(int16 −999;温泉陷阱两用)
      un(0x22, [1, 10, 0]), // 全队复活 10/10 = 满血
      un(0x55, [301, 2, 0]), // 学仙术:magic 301 → 角色 2−1=1(赵灵儿)
      un(0x6d, [115, 17192, 0]), // 场景脚本入口重设(迁移器批,地址依赖)→ 仍上报
    ],
    [],
  )
  expect(calls).toEqual([
    'wait(2400)',
    'fade("in",800)',
    'fade("out",6400)',
    'shakeScreen(999,4)',
    'shakeScreen(0,4)',
    'playRng(5,{"startFrame":0,"speed":7})',
    'toggleDayNight(3200)',
    'playMusic(0)',
    'increaseHpMp(9999)',
    'increaseHpMp(-999)',
    'revivePartyAll(10)',
    'learnSkill(1,"301")',
    'report("unmigrated op 0x6d ")',
  ])
})

test('legacy 对象族:0x9A 批量状态/0x13 定位/0x6F 条件同步/0x23 卸装/0x8F 减半/0xA3 音轨', async () => {
  const calls: string[] = []
  const world = emptyWorldScriptState()
  const r = new ScriptRunner(fakeHost(calls), world, new AbortController().signal)
  r.selfId = 'e50' // 触发者(0x6F 同步目标 / 0x13 自指)
  const un = (opcode: number, operands: number[]): Command => ({
    kind: 'unmigrated',
    opcode,
    operands,
  })
  await r.run(
    [
      un(0x9a, [5, 7, 2]), // 全局对象 5..7 → e4/e5/e6 设 2(挡路)
      un(0x13, [10, 64, 32]), // 对象 10 = e9 定位:pixelToGrid(64,32) = (4,0)
      un(0x13, [0xffff, 32, 16]), // 自指 → e50:(2,0)
      un(0x6f, [104, 0, 0]), // 源 e103 状态 0 == 0 → 触发者 e50 同设 0
      un(0x6f, [105, 0, 0]), // 源 e104 状态 1 ≠ 0 → 不同步
      un(0x23, [2, 0, 0]), // 角色 2(林月如)卸全部
      un(0x23, [1, 6, 0]), // 角色 1(赵灵儿)卸槽 6−1=5(佩饰)
      un(0x8f, [0, 0, 0]), // 金钱减半:query.money()=50 → −25
      un(0xa3, [4, 67, 0]), // CD 音轨 → 回退 RIX 曲 67
      un(0x71, [255, 0xfffc, 0]), // 屏波:幅 255 + 推进 −4(渐弱)→ vars
      un(0x7e, [60, 3, 0]), // 实体图层:e59 → 层 3
      un(0x7e, [0xffff, 0xffdf, 0]), // 自指 e50 → 层 int16(−33)
      un(0x98, [82, 83, 0]), // 编外跟随者:精灵 chunk 82/83 直用(s102 书生)
      un(0x99, [231, 164, 0]), // 换底图:场景 231(1-based)→ s230 override mapNum 164
      un(0x98, [0, 0, 0]), // 清跟随者
    ],
    [],
  )
  expect(world.entityState).toEqual({ e4: 2, e5: 2, e6: 2, e50: 0 })
  expect(world.vars['sys:screenWave']).toBe(255)
  expect(world.vars['sys:waveProgression']).toBe(-4)
  expect(world.entityLayer).toEqual({ e59: 3, e50: -33 })
  expect(world.followers).toBeUndefined() // 设 82/83 后被清
  expect(world.mapOverride).toEqual({ s230: 164 })
  expect(calls).toEqual([
    'setEntityState("e4",2)', // 0x9A 宿主重放通知(main 侧整场 applyWorldToScene)
    'setEntityPos("e9",{"col":4,"row":0})',
    'setEntityPos("e50",{"col":2,"row":0})',
    'setEntityState("e50",0)', // 0x6F 命中臂
    'unequipRole(2,"all")',
    'unequipRole(1,5)',
    'giveMoney(-25)',
    'playMusic(67)',
  ])
})

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

test('过场编排:playVideo 命令 → host.playVideo(videoId)(阻塞式,一指令播一段过场)', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.run([{ kind: 'playVideo', videoId: 1 }])
  expect(calls).toEqual(['playVideo(1)'])
})

test('过场编排:playRng 命令 → host.playRng(chunkIdx, {段/速})(无调色盘参数)', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
  await r.run([{ kind: 'playRng', chunkIdx: 6, speed: 25 }])
  expect(calls).toEqual(['playRng(6,{"speed":25})']) // 正确调色盘引擎内定,不传参
})

test('setAmbience(W6 昼夜)→ host 分发氛围 id', async () => {
  const calls: string[] = []
  const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal, () => 0)
  await r.run([
    { kind: 'setAmbience', ambience: 'night' },
    { kind: 'setAmbience', ambience: 'day' },
  ])
  expect(calls).toEqual(['setAmbience("night")', 'setAmbience("day")'])
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
  test('branch:allFullHp/itemEquipped 走 query(0x74 洪大夫治伤门 / 0x86 玉佛珠门禁)', async () => {
    // fakeHost:allFullHp→true(满血)、itemEquipped→false(未装备)
    const calls: string[] = []
    const r = new ScriptRunner(fakeHost(calls), emptyWorldScriptState(), new AbortController().signal)
    await r.run([
      // 0x74 洪大夫:非满血才治疗。满血 → not(allFullHp)=false → 不治疗
      { kind: 'branch', cond: { kind: 'not', cond: { kind: 'allFullHp' } }, then: [{ kind: 'playSound', soundId: 1 }] },
      { kind: 'branch', cond: { kind: 'allFullHp' }, then: [{ kind: 'playSound', soundId: 2 }] }, // 满血 ✓
      // 0x86 玉佛珠:未装备才拦。未装备 → not(itemEquipped)=true → 拦截
      { kind: 'branch', cond: { kind: 'not', cond: { kind: 'itemEquipped', itemId: '274', atLeast: 1 } }, then: [{ kind: 'playSound', soundId: 3 }] },
      { kind: 'branch', cond: { kind: 'itemEquipped', itemId: '274' }, then: [{ kind: 'playSound', soundId: 4 }] }, // 未装备 → 不走
    ])
    expect(calls).toEqual(['playSound(2)', 'playSound(3)'])
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
  test('startBattle 透传一次性 fieldId/musicId(特殊战场绑本战;override 已退役)', async () => {
    const calls: string[] = []
    const host = fakeHost(calls)
    host.startBattle = async (team, opts) => {
      calls.push(`battle(${team},f=${opts?.fieldId},m=${opts?.musicId})`)
      return 'win'
    }
    const r = new ScriptRunner(host, emptyWorldScriptState(), new AbortController().signal)
    await r.run([{ kind: 'startBattle', team: 27, fieldId: 22, musicId: 44 }])
    expect(calls).toEqual(['battle(27,f=22,m=44)'])
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

test('ditherScreen 阻塞后续命令，host 收口 Promise 后 abort 不会落穿', async () => {
  const calls: string[] = []
  const host = fakeHost(calls)
  let finishDither: (() => void) | undefined
  host.ditherScreen = (ms) =>
    new Promise((resolve) => {
      calls.push(`ditherScreen(${ms})`)
      finishDither = resolve
    })
  const ac = new AbortController()
  const runner = new ScriptRunner(host, emptyWorldScriptState(), ac.signal)
  const running = runner.run([
    { kind: 'ditherScreen', ms: 2160 },
    { kind: 'playSound', soundId: 1 },
  ])
  await Promise.resolve()
  expect(calls).toEqual(['ditherScreen(2160)'])

  ac.abort()
  finishDither?.()
  await expect(running).rejects.toMatchObject({ name: 'AbortError' })
  expect(calls).toEqual(['ditherScreen(2160)'])
})

describe('分片脚本 call/jump', () => {
  function resolverOf(
    bodies: Record<string, Command[]>,
    leases?: { active: number; peak: number },
  ): ScriptResolver {
    return {
      async resolve(ref) {
        const body = bodies[ref.id]
        if (!body) throw new Error(`missing ${ref.id}`)
        if (leases) {
          leases.active++
          leases.peak = Math.max(leases.peak, leases.active)
        }
        let released = false
        return {
          body,
          ref,
          release: () => {
            if (released) return
            released = true
            if (leases) leases.active--
          },
        }
      },
    }
  }

  test('call 返回调用点；callee 内 jump 尾转移后仍返回 caller', async () => {
    const calls: string[] = []
    const ref = (id: string) => ({ chunk: 'shared/c00', id })
    const resolver = resolverOf({
      'shared/a': [
        { kind: 'playSound', soundId: 1 },
        { kind: 'jumpScript', ref: ref('shared/b') },
        { kind: 'playSound', soundId: 99 },
      ],
      'shared/b': [{ kind: 'playSound', soundId: 2 }],
    })
    const runner = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      Math.random,
      resolver,
    )
    await runner.run([
      { kind: 'callScript', ref: ref('shared/a') },
      { kind: 'playSound', soundId: 3 },
    ])
    expect(calls).toEqual(['playSound(1)', 'playSound(2)', 'playSound(3)'])
  })

  test('嵌套 branch 内 jump 穿透父体，父体后续不落穿', async () => {
    const calls: string[] = []
    const target = { chunk: 'scene/s001', id: 'scene/s001/target' }
    const runner = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      () => 0,
      resolverOf({ [target.id]: [{ kind: 'playSound', soundId: 7 }] }),
    )
    await runner.run([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 100 },
        then: [{ kind: 'jumpScript', ref: target }],
      },
      { kind: 'playSound', soundId: 99 },
    ])
    expect(calls).toEqual(['playSound(7)'])
  })

  test('深 call 链的 lease 覆盖全部活动调用帧', async () => {
    const calls: string[] = []
    const leases = { active: 0, peak: 0 }
    const ref = (id: string) => ({ chunk: 'shared/c00', id })
    const resolver = resolverOf({
      'shared/a': [{ kind: 'callScript', ref: ref('shared/b') }],
      'shared/b': [{ kind: 'callScript', ref: ref('shared/c') }],
      'shared/c': [{ kind: 'playSound', soundId: 3 }],
    }, leases)
    const runner = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      Math.random,
      resolver,
    )
    await runner.run([{ kind: 'callScript', ref: ref('shared/a') }])
    expect(leases.peak).toBe(3)
    expect(leases.active).toBe(0)
    expect(calls).toEqual(['playSound(3)'])
  })

  test('作者 shared/user 脚本复用同一受控调用栈并继承 self', async () => {
    const calls: string[] = []
    const id = 'shared/user/chase-a1b2c3d4'
    const target = { chunk: 'shared/c00', id }
    const runner = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      Math.random,
      resolverOf({ [id]: [{ kind: 'chasePlayer' }] }),
    )
    runner.selfId = 'e7'
    await runner.run([{ kind: 'callScript', ref: target }])
    expect(calls).toEqual(['chaseStep("e7",8,4,false)'])
    expect(runner.selfId).toBe('e7')
  })

  test('call/jump 的 self 跨引用生效并在返回后恢复', async () => {
    const calls: string[] = []
    const target = { chunk: 'shared/c00', id: 'shared/chase' }
    const runner = new ScriptRunner(
      fakeHost(calls),
      emptyWorldScriptState(),
      new AbortController().signal,
      Math.random,
      resolverOf({ [target.id]: [{ kind: 'chasePlayer' }] }),
    )
    runner.selfId = 'caller'
    await runner.run([{ kind: 'callScript', ref: target, self: 'callee' }])
    expect(calls).toEqual(['chaseStep("callee",8,4,false)'])
    expect(runner.selfId).toBe('caller')
  })

  test('连续访问 100 个跨场景脚本后，存档不携带已加载脚本体', async () => {
    const script = emptyWorldScriptState()
    const world = makeTestWorld()
    world.script = script
    const visited: string[] = []
    const resolver: ScriptResolver = {
      async resolve(ref) {
        visited.push(`${ref.chunk}:${ref.id}`)
        return {
          body: [{ kind: 'playSound', soundId: 1 }],
          ref,
          release() {},
        }
      },
    }
    const runner = new ScriptRunner(
      fakeHost([]),
      script,
      new AbortController().signal,
      Math.random,
      resolver,
    )
    const saveJson = (): string => JSON.stringify(buildPayload(
      world,
      { sceneId: 's001', pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      'pal',
      1,
    ))
    const baselineBytes = new TextEncoder().encode(saveJson()).byteLength

    for (let i = 0; i < 100; i++) {
      const scene = `s${String(i).padStart(3, '0')}`
      await runner.run([{
        kind: 'callScript',
        ref: { chunk: `scene/${scene}`, id: `scene/${scene}/probe` },
      }])
    }

    const serialized = saveJson()
    expect(visited).toHaveLength(100)
    expect(new TextEncoder().encode(serialized).byteLength).toBe(baselineBytes)
    expect(serialized).not.toContain('callScript')
    expect(serialized).not.toContain('playSound')
  })

  test('真实 call 递归超过受控深度时给出目标诊断', async () => {
    const target = { chunk: 'shared/c00', id: 'shared/recursive-call' }
    const resolver = resolverOf({
      [target.id]: [{ kind: 'callScript', ref: target }],
    })
    const runner = new ScriptRunner(
      fakeHost([]),
      emptyWorldScriptState(),
      new AbortController().signal,
      Math.random,
      resolver,
    )

    await expect(runner.run([{ kind: 'callScript', ref: target }])).rejects.toThrow(
      /调用深度超过 128.*shared\/c00:shared\/recursive-call/,
    )
  })

  test('缺 resolver 明确报错；纯 jump 自环可 abort 且不会同步占死', async () => {
    const target = { chunk: 'shared/c00', id: 'shared/loop' }
    const noResolver = new ScriptRunner(
      fakeHost([]),
      emptyWorldScriptState(),
      new AbortController().signal,
    )
    await expect(noResolver.run([{ kind: 'callScript', ref: target }])).rejects.toThrow(/无 resolver/)

    const ac = new AbortController()
    let resolves = 0
    const resolver: ScriptResolver = {
      async resolve(ref) {
        resolves++
        return { body: [{ kind: 'jumpScript', ref }], ref, release() {} }
      },
    }
    const loop = new ScriptRunner(fakeHost([]), emptyWorldScriptState(), ac.signal, Math.random, resolver)
      .run([{ kind: 'jumpScript', ref: target }])
    setTimeout(() => ac.abort(), 10)
    await expect(loop).rejects.toMatchObject({ name: 'AbortError' })
    expect(resolves).toBeGreaterThan(0)
  })
})
