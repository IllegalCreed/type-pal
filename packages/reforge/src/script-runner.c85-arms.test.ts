// TEST-COVERAGE85-GLM-REFORGE-1 — script-runner.ts 残留分支臂合同测试。
// 全部用公开 ScriptRunner/evalCondition 入口 + 合成命令；宿主仅记录调用序(公开 ScriptHost 扩展点)。
import type { Command, ScriptStage } from '@type-pal/content'
import { emptyProjectedWorldScriptState } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { ScriptHost } from './script-runner.js'
import { evalCondition, ScriptRunner } from './script-runner.js'

type Call = readonly [name: string, args: readonly unknown[]]

/** 记录全部宿主能力的最小公开宿主;可选能力按测试逐个注入,其余保持未实现臂。 */
function recordingHost(log: Call[], overrides: Partial<ScriptHost> = {}): ScriptHost {
  const sync =
    (name: string) =>
    (...args: unknown[]): void => {
      log.push([name, args])
    }
  const asyncFn =
    (name: string) =>
    async (...args: unknown[]): Promise<void> => {
      log.push([name, args])
    }
  return {
    dialog: asyncFn('dialog'),
    clearDialog: sync('clearDialog'),
    fade: asyncFn('fade'),
    holdScreen: asyncFn('holdScreen'),
    revealScreen: asyncFn('revealScreen'),
    ditherScreen: asyncFn('ditherScreen'),
    wait: asyncFn('wait'),
    teleportParty: sync('teleportParty'),
    loadScene: asyncFn('loadScene'),
    setPartyFacing: sync('setPartyFacing'),
    setActorSprite: asyncFn('setActorSprite'),
    fleeBattle: sync('fleeBattle'),
    setEntityState: sync('setEntityState'),
    setEntityFacing: sync('setEntityFacing'),
    faceEntityToParty: sync('faceEntityToParty'),
    setEntityFrame: sync('setEntityFrame'),
    playEntityAction: asyncFn('playEntityAction'),
    stopEntityAction: sync('stopEntityAction'),
    giveItem: asyncFn('giveItem'),
    loseItem: sync('loseItem'),
    giveMoney: sync('giveMoney'),
    playSound: sync('playSound'),
    playMusic: sync('playMusic'),
    stopMusic: sync('stopMusic'),
    setAmbience: sync('setAmbience'),
    takeEntity: sync('takeEntity'),
    releaseEntity: sync('releaseEntity'),
    mountParty: sync('mountParty'),
    unmountParty: sync('unmountParty'),
    setParty: asyncFn('setParty'),
    applyActorCondition: asyncFn('applyActorCondition'),
    clearActorCondition: asyncFn('clearActorCondition'),
    setFollowers: asyncFn('setFollowers'),
    ride: asyncFn('ride'),
    moveEntity: asyncFn('moveEntity'),
    stepEntity: sync('stepEntity'),
    animEntity: sync('animEntity'),
    nudgeEntity: sync('nudgeEntity'),
    moveParty: asyncFn('moveParty'),
    nudgeParty: sync('nudgeParty'),
    startBattle: async (...args: unknown[]) => {
      log.push(['startBattle', args])
      return 'victory'
    },
    playVideo: asyncFn('playVideo'),
    playFrameAnimation: asyncFn('playFrameAnimation'),
    clearFrameAnimation: sync('clearFrameAnimation'),
    teleportOut: async () => {
      log.push(['teleportOut', []])
      return true
    },
    openShop: asyncFn('openShop'),
    confirm: async () => {
      log.push(['confirm', []])
      return true
    },
    cameraPan: asyncFn('cameraPan'),
    cameraSnap: sync('cameraSnap'),
    setEntityAuto: sync('setEntityAuto'),
    setEntityTrigger: sync('setEntityTrigger'),
    setEntityTriggerMode: sync('setEntityTriggerMode'),
    chaseStep: asyncFn('chaseStep'),
    vanishEntity: sync('vanishEntity'),
    loadLastSave: asyncFn('loadLastSave'),
    gameOver: asyncFn('gameOver'),
    report: sync('report'),
    shakeScreen: sync('shakeScreen'),
    toggleDayNight: sync('toggleDayNight'),
    increaseHpMp: sync('increaseHpMp'),
    revivePartyAll: sync('revivePartyAll'),
    learnSkill: sync('learnSkill'),
    unequipRole: sync('unequipRole'),
    setEntityPos: sync('setEntityPos'),
    setEntityPosRelParty: sync('setEntityPosRelParty'),
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      money: () => 50,
      inParty: () => false,
      allFullHp: () => false,
      itemEquipped: () => false,
      entityInScene: () => false,
      entitiesNear: () => false,
      facingEntity: () => false,
    },
    ...overrides,
  }
}

const newRunner = (host: ScriptHost, world = emptyProjectedWorldScriptState()) =>
  new ScriptRunner(host, world, new AbortController().signal)

test('演出缺省臂:fade 缺省 300ms、ditherScreen 缺省 720ms 原样落宿主', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  await r.run([{ kind: 'fade', dir: 'out' }, { kind: 'ditherScreen' }])
  expect(log).toEqual([
    ['fade', ['out', 300, undefined, expect.any(AbortSignal)]],
    ['ditherScreen', [720, expect.any(AbortSignal)]],
  ])
})

test('B8 缺省臂:无宿主实体的 chasePlayer 以空 self 派发缺省 range/speed/floating', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  r.selfId = undefined
  await r.run([{ kind: 'chasePlayer' }])
  expect(log).toEqual([['chaseStep', ['', 8, 4, false, expect.any(AbortSignal)]]])
})

test('B8 缺省臂:vanishEntity 无 entity 时回落触发者自身,seconds 缺省 2', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  r.selfId = 'npc-a'
  await r.run([{ kind: 'vanishEntity' }, { kind: 'vanishEntity', entity: 'npc-b', seconds: 5 }])
  expect(log).toEqual([
    ['vanishEntity', ['npc-a', 2]],
    ['vanishEntity', ['npc-b', 5]],
  ])
})

test('0x13 缺省臂:setEntityPos 的 height 缺省落 0 并持久写 world.entityPos', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  await r.run([
    { kind: 'setEntityPos', entity: 'e1', pos: { col: 3, row: 4, height: 0 } },
    { kind: 'setEntityPos', entity: 'e2', pos: { col: 5, row: 6, height: 2 } },
  ])
  expect(world.entityPos).toEqual({
    e1: { col: 3, row: 4, height: 0 },
    e2: { col: 5, row: 6, height: 2 },
  })
})

test('0x98 清空臂:setFollowers 空表把 world.followers 归 undefined', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  await r.run([
    { kind: 'setFollowers', sprites: ['a'] },
    { kind: 'setFollowers', sprites: [] },
  ])
  expect(world.followers).toBeUndefined()
})

test('循环动作后台失败臂:非 abort 错误按复合引用上报宿主,不中断后续命令', async () => {
  const log: Call[] = []
  const boom = new Error('帧序列损坏')
  const host = recordingHost(log, {
    playEntityAction: (entity) => {
      log.push(['playEntityAction', [entity]])
      return entity === 'npc-x' ? Promise.reject(boom) : Promise.resolve()
    },
  })
  const r = newRunner(host)
  await r.run([
    { kind: 'playEntityAction', entity: 'npc-x', sprite: 'walker', action: 'spin', loop: true },
    { kind: 'clearDialog' },
  ])
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(log).toContainEqual(['clearDialog', []])
  expect(log).toContainEqual([
    'report',
    ['playEntityAction(npc-x,walker,spin) 后台播放失败: 帧序列损坏'],
  ])
  expect(log.filter(([name]) => name === 'report')).toHaveLength(1)
})

test('循环动作后台失败臂:runner 已取消时不把 abort 上报为宿主错误', async () => {
  const log: Call[] = []
  const controller = new AbortController()
  let rejectAction: ((error: unknown) => void) | undefined
  const host = recordingHost(log, {
    playEntityAction: () =>
      new Promise<void>((_, reject) => {
        rejectAction = reject
      }),
  })
  const r = new ScriptRunner(host, emptyProjectedWorldScriptState(), controller.signal)
  await r.run([
    { kind: 'playEntityAction', entity: 'npc-y', sprite: 'walker', action: 'spin', loop: true },
    { kind: 'clearDialog' },
  ])
  controller.abort()
  rejectAction?.(new DOMException('script aborted', 'AbortError'))
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(log.filter(([name]) => name === 'report')).toEqual([])
})

test('0x2E/0x63/0x6E 缺省臂:loseItem count 缺省 1、mountParty 偏移缺省 0、addVar 缺省累加底数 0', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  await r.run([
    { kind: 'loseItem', itemId: '61' },
    { kind: 'mountParty', entity: 'boat' },
    { kind: 'addVar', var: 'v1', delta: 3 },
  ])
  expect(log).toEqual([
    ['loseItem', ['61', 1]],
    ['mountParty', ['boat', 0, 0]],
  ])
  expect(world.vars.v1).toBe(3)
})

test('setSceneMapOverride 持久臂:指定 scene 直接写 world,不触碰当前场景', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  await r.run([{ kind: 'setSceneMapOverride', scene: 's2', mapId: 'map-9' }])
  expect(world.mapOverride).toEqual({ s2: 'map-9' })
  expect(log).toEqual([])
})

test('setSceneMapOverride 当前场景臂:宿主无 reloadMap 时只落持久 override', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const host = recordingHost(log, {
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      money: () => 0,
      inParty: () => false,
      allFullHp: () => false,
      itemEquipped: () => false,
      entityInScene: () => false,
      entitiesNear: () => false,
      facingEntity: () => false,
      sceneId: () => 's1',
    },
  })
  const r = newRunner(host, world)
  await r.run([{ kind: 'setSceneMapOverride', mapId: 'map-7' }])
  expect(world.mapOverride).toEqual({ s1: 'map-7' })
  expect(log).toEqual([])
})

test('setSceneMapOverride 当前场景臂:无 sceneId 查询的宿主保持零写入', async () => {
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost([]), world)
  await r.run([{ kind: 'setSceneMapOverride', mapId: 'map-7' }])
  expect(world.mapOverride).toBeUndefined()
})

test('脚本绑定双臂:setEntityAuto/setEntityTrigger 分别以 script 引用与 stages 内联派发', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  const stages: ScriptStage[] = [{ body: [{ kind: 'clearDialog' }] }]
  await r.run([
    { kind: 'setEntityAuto', entity: 'e1', script: { chunk: 'shared/0', id: 'a' } },
    { kind: 'setEntityTrigger', entity: 'e2', stages },
    { kind: 'setEntityTriggerMode', entity: 'e2', on: 'touch', range: 3 },
  ])
  expect(log).toEqual([
    ['setEntityAuto', ['e1', { chunk: 'shared/0', id: 'a' }]],
    ['setEntityTrigger', ['e2', stages]],
    ['setEntityTriggerMode', ['e2', 'touch', 3]],
  ])
})

test('场景覆写残留臂:onTeleport/clearSceneScripts 对全新场景各自建立 override 槽', async () => {
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost([]), world)
  const ref = { chunk: 'scene/s1', id: 'scene/s1/teleport' }
  await r.run([
    { kind: 'setSceneOnTeleport', scene: 's-new', script: ref },
    { kind: 'clearSceneScripts', scene: 's-other' },
  ])
  expect(world.sceneScriptOverrides).toEqual({
    's-new': { onTeleport: ref },
    's-other': { onEnter: null, onTeleport: null },
  })
})

test('战斗配置臂:startBattle 透传 choreography 且按字段缺席裁剪', async () => {
  const log: Call[] = []
  const choreography = [{ at: 'battleStart' as const, body: [] }]
  const host = recordingHost(log, {
    startBattle: async (...args: unknown[]) => {
      log.push(['startBattle', args])
      return 'playerFled'
    },
  })
  const r = newRunner(host)
  await r.run([{ kind: 'startBattle', enemyTeamId: 't1', choreography }])
  expect(log).toEqual([
    [
      'startBattle',
      [
        't1',
        { auto: undefined, boss: undefined, fieldId: undefined, choreography },
        expect.any(AbortSignal),
      ],
    ],
  ])
})

test('节拍臂:paceMs>0 时每条命令后按拍等待宿主 wait', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  r.paceMs = 40
  await r.run([{ kind: 'clearDialog' }, { kind: 'stopMusic' }])
  expect(log).toEqual([
    ['clearDialog', []],
    ['wait', [40, expect.any(AbortSignal)]],
    ['stopMusic', []],
    ['wait', [40, expect.any(AbortSignal)]],
  ])
})

test('runStages 空段臂:空 stages 绑定安静收尾,不建阶段不抛错', async () => {
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost([]), world)
  await r.runStages('e-empty', [])
  expect(world.entityStage['e-empty']).toBeUndefined()
})

test('runStages 宿主臂:entry 段遇无 revealSceneEntry 宿主 fail-loud', async () => {
  const world = emptyProjectedWorldScriptState()
  const host = recordingHost([], { revealSceneEntry: undefined })
  const r = new ScriptRunner(host, world, new AbortController().signal, Math.random)
  const stages: ScriptStage[] = [
    {
      body: [],
      entry: {
        prepare: [],
        reveal: { kind: 'dither', ms: 700, source: 'previousPresentedFrame' },
      },
    },
  ]
  await expect(r.runStages('s:x', stages, { allowSceneEntry: true })).rejects.toThrow(
    '宿主未实现 revealSceneEntry',
  )
})

const condQuery: ScriptHost['query'] = {
  hasItem: () => false,
  ownsItem: (itemId, atLeast) => itemId === '267' && atLeast === 1,
  money: () => 50,
  inParty: (id) => id === 'hero',
  allFullHp: () => false,
  itemEquipped: () => false,
  entityInScene: (id) => id === 'e100',
  entitiesNear: () => false,
  facingEntity: () => false,
}

test('条件残留臂:缺席 flag 按 false 求值,ownsItem 缺省 atLeast=1', () => {
  const world = emptyProjectedWorldScriptState()
  world.flags['f-on'] = true
  expect(evalCondition({ kind: 'flag', flag: 'f-on', is: true }, world, condQuery)).toBe(true)
  expect(evalCondition({ kind: 'flag', flag: 'f-off', is: false }, world, condQuery)).toBe(true)
  expect(evalCondition({ kind: 'flag', flag: 'f-off', is: true }, world, condQuery)).toBe(false)
  expect(evalCondition({ kind: 'ownsItem', itemId: '267' }, world, condQuery)).toBe(true)
  expect(evalCondition({ kind: 'ownsItem', itemId: '267', atLeast: 2 }, world, condQuery)).toBe(
    false,
  )
})

test('条件残留臂:var 六比较算子按数值语义求值', () => {
  const world = emptyProjectedWorldScriptState()
  world.vars.v = 7
  const q = condQuery
  expect(evalCondition({ kind: 'var', var: 'v', op: '==', value: 7 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '==', value: 8 }, world, q)).toBe(false)
  expect(evalCondition({ kind: 'var', var: 'v', op: '!=', value: 8 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '!=', value: 7 }, world, q)).toBe(false)
  expect(evalCondition({ kind: 'var', var: 'v', op: '>=', value: 7 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '>=', value: 8 }, world, q)).toBe(false)
  expect(evalCondition({ kind: 'var', var: 'v', op: '<=', value: 7 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '<=', value: 6 }, world, q)).toBe(false)
  expect(evalCondition({ kind: 'var', var: 'v', op: '>', value: 6 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '>', value: 7 }, world, q)).toBe(false)
  expect(evalCondition({ kind: 'var', var: 'v', op: '<', value: 8 }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'var', var: 'v', op: '<', value: 7 }, world, q)).toBe(false)
})

test('条件残留臂:缺席 var 按默认 0 参与比较;not/all/any 组合臂齐走', () => {
  const world = emptyProjectedWorldScriptState()
  expect(evalCondition({ kind: 'var', var: 'absent', op: '==', value: 0 }, world, condQuery)).toBe(
    true,
  )
  expect(
    evalCondition({ kind: 'not', cond: { kind: 'inParty', actorId: 'hero' } }, world, condQuery),
  ).toBe(false)
  expect(
    evalCondition(
      { kind: 'all', of: [{ kind: 'hasMoney', atLeast: 50 }, { kind: 'allFullHp' }] },
      world,
      condQuery,
    ),
  ).toBe(false)
  expect(
    evalCondition(
      { kind: 'any', of: [{ kind: 'allFullHp' }, { kind: 'entityInScene', entity: 'e100' }] },
      world,
      condQuery,
    ),
  ).toBe(true)
})

test('条件残留臂:currentScene 缺当前场景查询时 fail-loud', () => {
  const world = emptyProjectedWorldScriptState()
  expect(() => evalCondition({ kind: 'currentScene', scene: 's1' }, world, condQuery)).toThrow(
    'currentScene 条件缺当前场景查询',
  )
  const q = { ...condQuery, sceneId: () => 's1' }
  expect(evalCondition({ kind: 'currentScene', scene: 's1' }, world, q)).toBe(true)
  expect(evalCondition({ kind: 'currentScene', scene: 's2' }, world, q)).toBe(false)
})

test('条件残留臂:entityState 用 NaN 哨兵拒绝缺席实体,facingEntity/items 走宿主查询', () => {
  const world = emptyProjectedWorldScriptState()
  world.entityState.e1 = 2
  expect(evalCondition({ kind: 'entityState', entity: 'e1', is: 2 }, world, condQuery)).toBe(true)
  expect(evalCondition({ kind: 'entityState', entity: 'e-absent', is: 0 }, world, condQuery)).toBe(
    false,
  )
  expect(
    evalCondition({ kind: 'facingEntity', entity: 'e100', range: 1 }, world, {
      ...condQuery,
      facingEntity: (entity, range) => entity === 'e100' && range === 1,
    }),
  ).toBe(true)
  expect(
    evalCondition({ kind: 'hasItem', itemId: '61', atLeast: 2 }, world, {
      ...condQuery,
      hasItem: (itemId, atLeast) => itemId === '61' && atLeast === 2,
    }),
  ).toBe(true)
  expect(
    evalCondition({ kind: 'itemEquipped', itemId: '249' }, world, {
      ...condQuery,
      itemEquipped: (itemId, atLeast) => itemId === '249' && atLeast === 1,
    }),
  ).toBe(true)
})

test('条件残留臂:entitiesNear 透传 range,chance 用注入 random 定率', () => {
  const world = emptyProjectedWorldScriptState()
  const near: boolean[] = []
  const q: ScriptHost['query'] = {
    ...condQuery,
    entitiesNear: (from, to, range) => {
      near.push(true)
      return from === 'a' && to === 'b' && range === 4
    },
  }
  expect(evalCondition({ kind: 'entitiesNear', from: 'a', to: 'b', range: 4 }, world, q)).toBe(true)
  expect(near.length).toBe(1)
  expect(evalCondition({ kind: 'chance', percent: 30 }, world, q, () => 0.299)).toBe(true)
  expect(evalCondition({ kind: 'chance', percent: 30 }, world, q, () => 0.3)).toBe(false)
})

test('命令残留臂:fleeBattle/holdScreen/revealScreen/shakeScreen 等直通宿主能力', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  await r.run([
    { kind: 'fleeBattle' },
    { kind: 'holdScreen', color: 'black', token: 't1' },
    { kind: 'revealScreen', token: 't1' },
    { kind: 'shakeScreen', frames: 12, level: 3 },
    { kind: 'setScreenWave', level: 5, progression: 2 },
    { kind: 'setEntityLayer', entity: 'e1', layer: 2 },
    { kind: 'increaseHpMp', delta: 10 },
    { kind: 'revivePartyAll', tenths: 5 },
    { kind: 'learnSkill', role: 1, skill: 'heal' },
    { kind: 'unequip', role: 2, slot: 'all' },
    { kind: 'toggleDayNight', ms: 800 },
    { kind: 'giveItem', itemId: '61' },
    { kind: 'giveMoney', delta: -20 },
    { kind: 'halveMoney' },
    { kind: 'playSound', asset: 'sfx-1' },
    { kind: 'setAmbience', ambience: 'night' },
    { kind: 'animEntity', entity: 'e1' },
    { kind: 'nudgeEntity', entity: 'e1', dx: 1, dy: -1 },
    { kind: 'stepEntity', entity: 'e1', dir: 'up' },
    { kind: 'nudgeParty', dx: 2, dy: 0, layer: 1 },
  ])
  const names = log.map(([name]) => name)
  expect(names).toEqual([
    'fleeBattle',
    'holdScreen',
    'revealScreen',
    'shakeScreen',
    'increaseHpMp',
    'revivePartyAll',
    'learnSkill',
    'unequipRole',
    'toggleDayNight',
    'giveItem',
    'giveMoney',
    'giveMoney',
    'playSound',
    'setAmbience',
    'animEntity',
    'nudgeEntity',
    'stepEntity',
    'nudgeParty',
  ])
  const world2 = world
  expect(world2.vars['sys:screenWave']).toBe(5)
  expect(world2.vars['sys:waveProgression']).toBe(2)
  expect(world2.entityLayer).toEqual({ e1: 2 })
  expect(log.find(([name]) => name === 'increaseHpMp')?.[1]).toEqual([10, 'both'])
  expect(log.find(([name]) => name === 'giveItem')?.[1]).toEqual(['61', 1, expect.any(AbortSignal)])
  expect(log.filter(([name]) => name === 'giveMoney').map(([, args]) => args)).toEqual([
    [-20],
    [-25],
  ])
})

test('宿主能力缺席臂:holdScreen/revealScreen 未实现时 fail-loud', async () => {
  const host = recordingHost([], { holdScreen: undefined, revealScreen: undefined })
  const r = newRunner(host)
  await expect(r.run([{ kind: 'holdScreen', color: 'black', token: 't' }])).rejects.toThrow(
    '宿主未实现 holdScreen',
  )
  await expect(r.run([{ kind: 'revealScreen', token: 't' }])).rejects.toThrow(
    '宿主未实现 revealScreen',
  )
})

test('call 重抛臂:callee 内非 returnScript 错误穿透 callScript 原样上抛', async () => {
  const host = recordingHost([], { holdScreen: undefined })
  const calleeBody: Command[] = [{ kind: 'holdScreen', color: 'black', token: 't' }]
  const resolver = {
    resolve: async () => ({
      ref: { chunk: 'shared/0', id: 'boom' },
      body: calleeBody,
      release: () => {},
    }),
  }
  const r = new ScriptRunner(
    host,
    emptyProjectedWorldScriptState(),
    new AbortController().signal,
    Math.random,
    resolver,
  )
  await expect(
    r.run([{ kind: 'callScript', ref: { chunk: 'shared/0', id: 'boom' } }]),
  ).rejects.toThrow('宿主未实现 holdScreen')
})

test('endBattle 拒绝臂:大世界 runner 拒绝战斗演出专属命令', async () => {
  const r = newRunner(recordingHost([]))
  await expect(r.run([{ kind: 'endBattle', result: 'terminate' }])).rejects.toThrow(
    'endBattle 只能用于战斗演出脚本',
  )
})

test('vanish 双回落臂:无 entity 且无 selfId 时以空实体 id 派发宿主', async () => {
  const log: Call[] = []
  const r = newRunner(recordingHost(log))
  r.selfId = undefined
  await r.run([{ kind: 'vanishEntity' }])
  expect(log).toEqual([['vanishEntity', ['', 2]]])
})

test('后台失败上报臂:非 Error 拒绝值按 String() 文本上报', async () => {
  const log: Call[] = []
  const host = recordingHost(log, {
    playEntityAction: () => Promise.reject('胶片断裂'),
  })
  const r = newRunner(host)
  await r.run([
    { kind: 'playEntityAction', entity: 'npc-z', sprite: 'walker', action: 'spin', loop: true },
  ])
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(log).toContainEqual([
    'report',
    ['playEntityAction(npc-z,walker,spin) 后台播放失败: 胶片断裂'],
  ])
})

test('脚本绑定 stages 臂:setEntityAuto 内联段与 onEnter 全新槽各自落位', async () => {
  const log: Call[] = []
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost(log), world)
  const stages: ScriptStage[] = [{ body: [{ kind: 'clearDialog' }] }]
  const enterStages: ScriptStage[] = [{ body: [{ kind: 'stopMusic' }] }]
  await r.run([
    { kind: 'setEntityAuto', entity: 'e9', stages },
    { kind: 'setSceneOnEnter', scene: 's-fresh', stages: enterStages },
  ])
  expect(log).toEqual([['setEntityAuto', ['e9', stages]]])
  expect(world.sceneScriptOverrides).toEqual({ 's-fresh': { onEnter: enterStages } })
})

test('后台失败静默臂:未取消 runner 收到 AbortError 型拒绝同样静默不上报', async () => {
  const log: Call[] = []
  const host = recordingHost(log, {
    playEntityAction: () => Promise.reject(new DOMException('外部中止', 'AbortError')),
  })
  const r = newRunner(host)
  await r.run([
    { kind: 'playEntityAction', entity: 'npc-a', sprite: 'walker', action: 'spin', loop: true },
  ])
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(log.filter(([name]) => name === 'report')).toEqual([])
})

test('场景覆写 stages 臂:setSceneOnTeleport 内联段落到全新场景槽', async () => {
  const world = emptyProjectedWorldScriptState()
  const r = newRunner(recordingHost([]), world)
  const stages: ScriptStage[] = [{ body: [{ kind: 'clearDialog' }] }]
  await r.run([{ kind: 'setSceneOnTeleport', scene: 's-fresh-tp', stages }])
  expect(world.sceneScriptOverrides).toEqual({ 's-fresh-tp': { onTeleport: stages } })
})
