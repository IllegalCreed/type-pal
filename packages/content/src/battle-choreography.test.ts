import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { BattleChoreographyAction } from './battle-choreography.js'
import {
  checkBattleChoreography,
  checkBattleChoreographyAction,
  checkBattleChoreographyBody,
} from './battle-choreography.js'
import type { AiCond } from './enemy-ai.js'
import type { DialogueCue } from './index.js'
import type { LevelGrowthDelta } from './rewards.js'

function waitAction(ms: number): BattleChoreographyAction {
  return { kind: 'wait', ms }
}

function stopMusicAction(fadeMs?: number): BattleChoreographyAction {
  return fadeMs === undefined ? { kind: 'stopMusic' } : { kind: 'stopMusic', fadeMs }
}

function revivePartyAllAction(tenths: number): BattleChoreographyAction {
  return { kind: 'revivePartyAll', tenths }
}

function increaseHpMpAction(delta: number, pools?: 'hp' | 'mp' | 'both'): BattleChoreographyAction {
  return pools === undefined
    ? { kind: 'increaseHpMp', delta }
    : { kind: 'increaseHpMp', delta, pools }
}

function growthDelta(over: Partial<LevelGrowthDelta> = {}): LevelGrowthDelta {
  return {
    level: 1,
    maxHP: 10,
    maxMP: 10,
    attack: 2,
    magicAttack: 2,
    defense: 2,
    speed: 2,
    luck: 1,
    ...over,
  }
}

function growthAction(
  actor = 'actor.li',
  delta: LevelGrowthDelta = growthDelta(),
): BattleChoreographyAction {
  return { kind: 'applyActorGrowth', actor, delta }
}

function castEffectAction(actor = 'actor.li'): BattleChoreographyAction {
  return { kind: 'playActorCastEffect', actor, effect: 'pre-magic-white-flash' }
}

/** 返回具体 dialog 成员而非整个联合，测试才能读取 cue 字段做身份断言。 */
function dialogAction(cue: DialogueCue = { rows: [{ text: 'text.line' }] }): {
  kind: 'dialog'
  cue: DialogueCue
} {
  return { kind: 'dialog', cue }
}

const growthFields = [
  'level',
  'maxHP',
  'maxMP',
  'attack',
  'magicAttack',
  'defense',
  'speed',
  'luck',
] as const

/** 同 kind 合法动作数组逐个正控并对实际输入做保真比较。 */
function acceptsActions(actions: BattleChoreographyAction[]): void {
  for (const action of actions) {
    expectAcceptsUnchanged(() => checkBattleChoreographyAction(action, 'a'), action)
  }
}

describe('battle actions', () => {
  test('playMusic/playSound/fleeBattle/endBattle 三种 result 合法正控', () => {
    acceptsActions([
      { kind: 'playMusic', asset: 'music.boss' },
      { kind: 'playSound', asset: 'sound.hit' },
      { kind: 'fleeBattle' },
      { kind: 'endBattle', result: 'terminate' },
      { kind: 'endBattle', result: 'won' },
      { kind: 'endBattle', result: 'lost' },
    ])
  })

  test('战斗对白可以清屏，参数守卫拒绝给清屏附加延时', () => {
    acceptsActions([{ kind: 'clearDialog' }])
    expectExactError(
      () => checkBattleChoreographyAction({ kind: 'clearDialog', ms: 50 }, 'a'),
      'a.ms: 未知字段',
    )
  })

  test('endBattle 未知 result 拒绝且实际输入不变', () => {
    acceptsActions([{ kind: 'endBattle', result: 'won' }])
    const bad = { kind: 'endBattle', result: 'draw' }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkBattleChoreographyAction(bad, 'a'),
      'a.result: 期望 terminate|won|lost',
    )
    expect(bad).toEqual(before)
  })

  test('wait 显式0/分数ms 与 stopMusic 缺席/显式0 fadeMs 合法', () => {
    acceptsActions([waitAction(0), waitAction(33.5), stopMusicAction(), stopMusicAction(0)])
  })

  test.each([
    ['wait 负数', { kind: 'wait', ms: -1 }, 'a.ms: 期望非负有限数'],
    ['wait 缺ms', { kind: 'wait' }, 'a.ms: 期望有限数'],
    ['wait Infinity', { kind: 'wait', ms: Number.POSITIVE_INFINITY }, 'a.ms: 期望有限数'],
  ] as const)('%s拒绝且只破一轴（同kind wait 正控）', (_label, bad, error) => {
    acceptsActions([waitAction(0)])
    const before = deepSnapshot(bad)
    expectExactError(() => checkBattleChoreographyAction(bad, 'a'), error)
    expect(bad).toEqual(before)
  })

  test.each([
    ['stopMusic 负fade', { kind: 'stopMusic', fadeMs: -1 }, 'a.fadeMs: 期望非负有限数'],
    ['stopMusic NaN', { kind: 'stopMusic', fadeMs: Number.NaN }, 'a.fadeMs: 期望有限数'],
    ['stopMusic 多余键', { kind: 'stopMusic', fadeMs: 0, extra: 1 }, 'a.extra: 未知字段'],
  ] as const)('%s拒绝且只破一轴（同kind stopMusic 正控）', (_label, bad, error) => {
    acceptsActions([stopMusicAction(0)])
    const before = deepSnapshot(bad)
    expectExactError(() => checkBattleChoreographyAction(bad, 'a'), error)
    expect(bad).toEqual(before)
  })

  test('revivePartyAll 0/5/10 合法', () => {
    acceptsActions([revivePartyAllAction(0), revivePartyAllAction(5), revivePartyAllAction(10)])
  })

  test.each([
    ['负数', -1],
    ['越上界', 11],
    ['小数', 7.5],
    ['字符串', '5'],
  ] as const)('revivePartyAll tenths %s拒绝且输入不变', (_label, brokenTenths) => {
    acceptsActions([revivePartyAllAction(10)])
    const bad = { kind: 'revivePartyAll', tenths: brokenTenths }
    const before = deepSnapshot(bad)
    expectExactError(() => checkBattleChoreographyAction(bad, 'a'), 'a.tenths: 期望 0..10 整数')
    expect(bad).toEqual(before)
  })

  test('increaseHpMp 负delta/0/三种池及缺省合法', () => {
    acceptsActions([
      increaseHpMpAction(-30),
      increaseHpMpAction(0, 'hp'),
      increaseHpMpAction(99, 'mp'),
      increaseHpMpAction(-1, 'both'),
    ])
  })

  test('increaseHpMp 非有限 delta 与未知池拒绝且输入不变', () => {
    acceptsActions([increaseHpMpAction(-30, 'hp')])
    const badDelta = { kind: 'increaseHpMp', delta: Number.NaN, pools: 'hp' }
    const deltaBefore = deepSnapshot(badDelta)
    expectExactError(() => checkBattleChoreographyAction(badDelta, 'a'), 'a.delta: 期望有限数')
    expect(badDelta).toEqual(deltaBefore)
    acceptsActions([increaseHpMpAction(-1, 'both')])
    const badPools = { kind: 'increaseHpMp', delta: -1, pools: 'all' }
    const poolsBefore = deepSnapshot(badPools)
    expectExactError(() => checkBattleChoreographyAction(badPools, 'a'), 'a.pools: 期望 hp|mp|both')
    expect(badPools).toEqual(poolsBefore)
  })

  test('growth 八字段全负整数合法（固定成长量符号自由）', () => {
    acceptsActions([
      growthAction(
        'actor.li',
        growthDelta({
          level: -1,
          maxHP: -10,
          maxMP: -10,
          attack: -2,
          magicAttack: -2,
          defense: -2,
          speed: -2,
          luck: -1,
        }),
      ),
    ])
  })

  test.each(growthFields)('growth.%s 非整数单字段拒绝且路径精确、输入不变', (field) => {
    acceptsActions([growthAction()])
    const bad = {
      kind: 'applyActorGrowth',
      actor: 'actor.li',
      delta: { ...growthDelta(), [field]: 5.5 },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkBattleChoreographyAction(bad, 'a'),
      `a.delta.${field}: 期望整数固定成长量`,
    )
    expect(bad).toEqual(before)
  })

  test('growth 多余字段与非对象 delta 拒绝', () => {
    acceptsActions([growthAction()])
    const extra = {
      kind: 'applyActorGrowth',
      actor: 'actor.li',
      delta: { ...growthDelta(), bonus: 1 },
    }
    const extraBefore = deepSnapshot(extra)
    expectExactError(() => checkBattleChoreographyAction(extra, 'a'), 'a.delta.bonus: 未知字段')
    expect(extra).toEqual(extraBefore)
    const nonObject = { kind: 'applyActorGrowth', actor: 'actor.li', delta: 5 }
    const nonObjectBefore = deepSnapshot(nonObject)
    expectExactError(() => checkBattleChoreographyAction(nonObject, 'a'), 'a.delta: 期望对象')
    expect(nonObject).toEqual(nonObjectBefore)
  })

  test('cast effect 错误效果与 actor 首尾空格拒绝且输入不变', () => {
    acceptsActions([castEffectAction()])
    const badEffect = {
      kind: 'playActorCastEffect',
      actor: 'actor.li',
      effect: 'white-flash',
    }
    const before = deepSnapshot(badEffect)
    expectExactError(
      () => checkBattleChoreographyAction(badEffect, 'a'),
      'a.effect: 期望 pre-magic-white-flash',
    )
    expect(badEffect).toEqual(before)
    const badActor = {
      kind: 'playActorCastEffect',
      actor: ' actor ',
      effect: 'pre-magic-white-flash',
    }
    const actorBefore = deepSnapshot(badActor)
    expectExactError(
      () => checkBattleChoreographyAction(badActor, 'a'),
      'a.actor: 期望非空且无首尾空格的 string',
    )
    expect(badActor).toEqual(actorBefore)
  })

  test('playSound 首尾空格 asset 拒绝（同kind playSound 正控先过）', () => {
    acceptsActions([{ kind: 'playSound', asset: 'sound.hit' }])
    const bad = { kind: 'playSound', asset: ' x ' }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkBattleChoreographyAction(bad, 'a'),
      'a.asset: 期望非空且无首尾空格的 string',
    )
    expect(bad).toEqual(before)
  })
})

describe('dialogue validation', () => {
  test('无 callback 走 runtime 分支：合法 cue.rows 通过、真删 rows 经生产路径拒绝', () => {
    acceptsActions([dialogAction()])
    const broken = dialogAction()
    Reflect.deleteProperty(broken.cue, 'rows')
    const before = deepSnapshot(broken)
    expectExactError(
      () => checkBattleChoreographyAction(broken, 'a'),
      'a[0]: dialog 缺非空 cue.rows',
    )
    expect(broken).toEqual(before)
  })

  test('选中 callback 收到原 cue 对象与精确路径，正常返回即接受且 cue 不被改写', () => {
    const action = dialogAction({ rows: [{ text: 'text.boss' }], slot: 'top' })
    const cueBefore = deepSnapshot(action.cue)
    const actionBefore = deepSnapshot(action)
    const seen: { cue: unknown; path: string }[] = []
    checkBattleChoreographyAction(action, 'a', {
      checkDialogueCue(cue, path) {
        seen.push({ cue, path })
      },
    })
    expect(seen).toEqual([{ cue: action.cue, path: 'a.cue' }])
    expect(seen[0]?.cue).toBe(action.cue)
    expect(action.cue).toEqual(cueBefore)
    expect(action).toEqual(actionBefore)
  })

  test('propagates the original error from the dialogue validator', () => {
    const action = dialogAction()
    const before = deepSnapshot(action)
    const sentinel = new Error('cue gate')
    let caught: unknown
    try {
      checkBattleChoreographyAction(action, 'a', {
        checkDialogueCue() {
          throw sentinel
        },
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(sentinel)
    expect(action).toEqual(before)
  })
})

describe('choreography hooks', () => {
  interface Hook {
    at: 'battleStart' | 'turnStart'
    once?: boolean
    when?: AiCond
    body: BattleChoreographyAction[]
  }
  /** 三个合法 hook：覆盖 at 两值、once 显式两态、when 有无、body 多动作；中间 hook 的 body[0] 是同型可单轴破坏的合法 wait(0)。 */
  const fullInput = (): Hook[] => [
    {
      at: 'battleStart',
      once: false,
      when: { kind: 'chance', percent: 50 },
      body: [waitAction(0), dialogAction()],
    },
    { at: 'turnStart', once: true, body: [waitAction(0)] },
    { at: 'battleStart', body: [{ kind: 'fleeBattle' }] },
  ]

  test('多 hook 非空正控通过且完整输入保真', () => {
    const input = fullInput()
    expectAcceptsUnchanged(() => checkBattleChoreography(input, '演出'), input)
  })

  test('多 hook 只破中间 hook 单轴：先过真实容器，再仅改 ms 一轴', () => {
    const control = fullInput()
    expectAcceptsUnchanged(() => checkBattleChoreography(control, '演出'), control)
    const broken = control.map((hook, index) =>
      index === 1 ? { ...hook, body: [waitAction(-1)] } : hook,
    )
    const before = deepSnapshot(broken)
    expectExactError(
      () => checkBattleChoreography(broken, '演出'),
      '演出[1].body[0].ms: 期望非负有限数',
    )
    expect(broken).toEqual(before)
  })

  test('整体与 hook 层形状拒绝（非数组/非对象 hook/未知字段）', () => {
    const control = fullInput()
    expectAcceptsUnchanged(() => checkBattleChoreography(control, '演出'), control)
    expectExactError(() => checkBattleChoreography('x', '演出'), '演出: 期望 BattleChoreography[]')
    const strWrapped = ['x']
    const strBefore = deepSnapshot(strWrapped)
    expectExactError(() => checkBattleChoreography(strWrapped, '演出'), '演出[0]: 期望对象')
    expect(strWrapped).toEqual(strBefore)
    const nullWrapped = [null]
    const nullBefore = deepSnapshot(nullWrapped)
    expectExactError(() => checkBattleChoreography(nullWrapped, '演出'), '演出[0]: 期望对象')
    expect(nullWrapped).toEqual(nullBefore)
    const extraHook = [{ at: 'battleStart', body: [waitAction(0)], extra: 1 }]
    const extraBefore = deepSnapshot(extraHook)
    expectExactError(() => checkBattleChoreography(extraHook, '演出'), '演出[0].extra: 未知字段')
    expect(extraHook).toEqual(extraBefore)
  })

  test.each([
    {
      label: 'at 非法值',
      good: { at: 'battleStart', body: [waitAction(0)] },
      bad: { at: 'midturn', body: [waitAction(0)] },
      error: '演出[0].at: 期望 battleStart|turnStart',
    },
    {
      label: 'at 缺席',
      good: { at: 'battleStart', body: [waitAction(0)] },
      bad: { body: [waitAction(0)] },
      error: '演出[0].at: 期望 battleStart|turnStart',
    },
    {
      label: 'once 非布尔',
      good: { at: 'battleStart', once: false, body: [waitAction(0)] },
      bad: { at: 'battleStart', once: 'yes', body: [waitAction(0)] },
      error: '演出[0].once: 期望 boolean',
    },
    {
      label: 'when 非法条件（同入口合法turn仅改op）',
      good: {
        at: 'battleStart',
        when: { kind: 'turn', op: '>=', value: 1 },
        body: [waitAction(0)],
      },
      bad: {
        at: 'battleStart',
        when: { kind: 'turn', op: '<', value: 1 },
        body: [waitAction(0)],
      },
      error: '演出[0].when.op: 期望 ==|>=',
    },
    {
      label: 'body 非数组',
      good: { at: 'battleStart', body: [waitAction(0)] },
      bad: { at: 'battleStart', body: 'x' },
      error: '演出[0].body: 期望 BattleChoreographyAction[]',
    },
    {
      label: 'body 缺席',
      good: { at: 'battleStart', body: [waitAction(0)] },
      bad: { at: 'battleStart' },
      error: '演出[0].body: 期望 BattleChoreographyAction[]',
    },
  ] as const)('$label拒绝且完整输入保真（每行同形状good先过同容器）', ({ good, bad, error }) => {
    const control = [good]
    expectAcceptsUnchanged((value) => checkBattleChoreography(value, '演出'), control)
    const input = [bad]
    const before = deepSnapshot(input)
    expectExactError(() => checkBattleChoreography(input, '演出'), error)
    expect(input).toEqual(before)
  })

  test('body 直入口：合法数组通过、非数组精确路径拒绝', () => {
    expectAcceptsUnchanged((value) => checkBattleChoreographyBody(value, 'body'), [waitAction(0)])
    expectExactError(
      () => checkBattleChoreographyBody('x', 'body'),
      'body: 期望 BattleChoreographyAction[]',
    )
  })
})
