/**
 * TEST-GLM-CONTENT-GUARDS-2 G4/G5/G6：battle-choreography 三入口直接叶/容器边界。
 * 去重：validate-enemy-crosscalls G06-06/07 已证 dialog/playSound 正控与未知 kind
 * （default 分支）经 validateEnemies 的行为，enemy-script.test.ts 已证 giveItem
 * 宽泛命令拒绝；author-battle-dialogue-boundary.test.ts 13 项已证作者身份矩阵、
 * cue 转发与 runtime 分支经 checkAuthorCommands/checkRuntimeCommands 的合同——
 * 本文件不复制这些，只补各动作叶从未直测的数值/缺席/池/成长轴、选中 callback
 * 的原 Error 身份、容器 at/once/when 三层形状与多 hook 单轴破坏；不写战斗求值器。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  castEffectAction,
  dialogAction,
  growthAction,
  growthDelta,
  increaseHpMpAction,
  revivePartyAllAction,
  stopMusicAction,
  waitAction,
} from './__tests__/guard-leaf-fixtures.js'
import type { BattleChoreographyAction } from './battle-choreography.js'
import {
  checkBattleChoreography,
  checkBattleChoreographyAction,
  checkBattleChoreographyBody,
} from './battle-choreography.js'
import type { AiCond } from './enemy-ai.js'

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

describe('G4 动作叶', () => {
  test('playMusic/fleeBattle/endBattle 三种 result 合法正控', () => {
    const controls: BattleChoreographyAction[] = [
      { kind: 'playMusic', asset: 'music.boss' },
      { kind: 'playSound', asset: 'sound.hit' },
      { kind: 'fleeBattle' },
      { kind: 'endBattle', result: 'terminate' },
      { kind: 'endBattle', result: 'won' },
      { kind: 'endBattle', result: 'lost' },
    ]
    for (const action of controls) {
      expect(() => checkBattleChoreographyAction(action, 'a')).not.toThrow()
    }
  })

  test('endBattle 未知 result 拒绝且实际输入不变', () => {
    checkBattleChoreographyAction({ kind: 'endBattle', result: 'won' }, 'a')
    const bad = { kind: 'endBattle', result: 'draw' }
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow(
      'a.result: 期望 terminate|won|lost',
    )
    expect(bad).toEqual(before)
  })

  test('wait 显式0/分数ms 与 stopMusic 缺席/显式0 fadeMs 合法', () => {
    const controls: BattleChoreographyAction[] = [
      waitAction(0),
      waitAction(33.5),
      stopMusicAction(),
      stopMusicAction(0),
    ]
    for (const action of controls) {
      expect(() => checkBattleChoreographyAction(action, 'a')).not.toThrow()
    }
  })

  test.each([
    ['wait 负数', { kind: 'wait', ms: -1 }, 'a.ms: 期望非负有限数'],
    ['wait 缺ms', { kind: 'wait' }, 'a.ms: 期望有限数'],
    ['wait Infinity', { kind: 'wait', ms: Number.POSITIVE_INFINITY }, 'a.ms: 期望有限数'],
    ['stopMusic 负fade', { kind: 'stopMusic', fadeMs: -1 }, 'a.fadeMs: 期望非负有限数'],
    ['stopMusic NaN', { kind: 'stopMusic', fadeMs: Number.NaN }, 'a.fadeMs: 期望有限数'],
    ['stopMusic 多余键', { kind: 'stopMusic', fadeMs: 0, extra: 1 }, 'a.extra: 未知字段'],
  ] as const)('%s拒绝且只破一轴', (_label, bad, error) => {
    const control = 'ms' in bad ? waitAction(0) : stopMusicAction(0)
    checkBattleChoreographyAction(control, 'a')
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow(error)
    expect(bad).toEqual(before)
  })

  test('revivePartyAll 0/5/10 合法', () => {
    for (const tenths of [0, 5, 10]) {
      expect(() => checkBattleChoreographyAction(revivePartyAllAction(tenths), 'a')).not.toThrow()
    }
  })

  test.each([
    ['负数', -1],
    ['越上界', 11],
    ['小数', 7.5],
    ['字符串', '5'],
  ] as const)('revivePartyAll tenths %s拒绝且输入不变', (_label, brokenTenths) => {
    checkBattleChoreographyAction(revivePartyAllAction(10), 'a')
    const bad = { kind: 'revivePartyAll', tenths: brokenTenths }
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow('a.tenths: 期望 0..10 整数')
    expect(bad).toEqual(before)
  })

  test('increaseHpMp 负delta/0/三种池及缺省合法', () => {
    const controls: BattleChoreographyAction[] = [
      increaseHpMpAction(-30),
      increaseHpMpAction(0, 'hp'),
      increaseHpMpAction(99, 'mp'),
      increaseHpMpAction(-1, 'both'),
    ]
    for (const action of controls) {
      expect(() => checkBattleChoreographyAction(action, 'a')).not.toThrow()
    }
  })

  test('increaseHpMp 非有限 delta 与未知池拒绝且输入不变', () => {
    checkBattleChoreographyAction(increaseHpMpAction(-30, 'hp'), 'a')
    const badDelta = { kind: 'increaseHpMp', delta: Number.NaN, pools: 'hp' }
    const deltaBefore = deepSnapshot(badDelta)
    expect(() => checkBattleChoreographyAction(badDelta, 'a')).toThrow('a.delta: 期望有限数')
    expect(badDelta).toEqual(deltaBefore)
    const badPools = { kind: 'increaseHpMp', delta: -1, pools: 'all' }
    expect(() => checkBattleChoreographyAction(badPools, 'a')).toThrow('a.pools: 期望 hp|mp|both')
  })

  test('growth 八字段全负整数合法（固定成长量符号自由）', () => {
    const action = growthAction(
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
    )
    expect(() => checkBattleChoreographyAction(action, 'a')).not.toThrow()
  })

  test.each(growthFields)('growth.%s 非整数单字段拒绝且路径精确、输入不变', (field) => {
    checkBattleChoreographyAction(growthAction(), 'a')
    const bad = {
      kind: 'applyActorGrowth',
      actor: 'actor.li',
      delta: { ...growthDelta(), [field]: 5.5 },
    }
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow(
      `a.delta.${field}: 期望整数固定成长量`,
    )
    expect(bad).toEqual(before)
  })

  test('growth 多余字段与非对象 delta 拒绝', () => {
    checkBattleChoreographyAction(growthAction(), 'a')
    const extra = {
      kind: 'applyActorGrowth',
      actor: 'actor.li',
      delta: { ...growthDelta(), bonus: 1 },
    }
    expect(() => checkBattleChoreographyAction(extra, 'a')).toThrow('a.delta.bonus: 未知字段')
    expect(() =>
      checkBattleChoreographyAction({ kind: 'applyActorGrowth', actor: 'actor.li', delta: 5 }, 'a'),
    ).toThrow('a.delta: 期望对象')
  })

  test('cast effect 错误效果与 actor 首尾空格拒绝且输入不变', () => {
    checkBattleChoreographyAction(castEffectAction(), 'a')
    const badEffect = {
      kind: 'playActorCastEffect',
      actor: 'actor.li',
      effect: 'white-flash',
    }
    const before = deepSnapshot(badEffect)
    expect(() => checkBattleChoreographyAction(badEffect, 'a')).toThrow(
      'a.effect: 期望 pre-magic-white-flash',
    )
    expect(badEffect).toEqual(before)
    expect(() =>
      checkBattleChoreographyAction(
        { kind: 'playActorCastEffect', actor: ' actor ', effect: 'pre-magic-white-flash' },
        'a',
      ),
    ).toThrow('a.actor: 期望非空且无首尾空格的 string')
  })

  test('playSound 首尾空格 asset 拒绝（正控经 G06-06 已证，此处补拒绝轴）', () => {
    checkBattleChoreographyAction({ kind: 'playMusic', asset: 'music.boss' }, 'a')
    const bad = { kind: 'playSound', asset: ' x ' }
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow(
      'a.asset: 期望非空且无首尾空格的 string',
    )
    expect(bad).toEqual(before)
  })
})

describe('G5 dialog 委派', () => {
  test('无 callback 走 runtime 分支：合法 cue.rows 通过、缺 rows 经生产路径拒绝', () => {
    expect(() => checkBattleChoreographyAction(dialogAction(), 'a')).not.toThrow()
    const bad = { kind: 'dialog' }
    const before = deepSnapshot(bad)
    expect(() => checkBattleChoreographyAction(bad, 'a')).toThrow('a[0]: dialog 缺非空 cue.rows')
    expect(bad).toEqual(before)
  })

  test('选中 callback 收到原 cue 对象与精确路径，正常返回即接受', () => {
    const action = dialogAction({ rows: [{ text: 'text.boss' }], slot: 'top' })
    const seen: { cue: unknown; path: string }[] = []
    checkBattleChoreographyAction(action, 'a', {
      checkDialogueCue(cue, path) {
        seen.push({ cue, path })
      },
    })
    expect(seen).toEqual([{ cue: action.cue, path: 'a.cue' }])
    expect(seen[0]?.cue).toBe(action.cue)
  })

  test('callback 抛出的原 Error 身份原样传播（比既有 message 匹配更强）', () => {
    const sentinel = new Error('cue gate')
    let caught: unknown
    try {
      checkBattleChoreographyAction(dialogAction(), 'a', {
        checkDialogueCue() {
          throw sentinel
        },
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(sentinel)
  })
})

describe('G6 容器三层', () => {
  interface Hook {
    at: 'battleStart' | 'turnStart'
    once?: boolean
    when?: AiCond
    body: BattleChoreographyAction[]
  }
  /** 三个合法 hook：覆盖 at 两值、once 显式两态、when 有无、body 多动作。 */
  const fullInput = (): Hook[] => [
    {
      at: 'battleStart',
      once: false,
      when: { kind: 'chance', percent: 50 },
      body: [waitAction(0), dialogAction()],
    },
    { at: 'turnStart', once: true, body: [{ kind: 'playMusic', asset: 'music.loop' }] },
    { at: 'battleStart', body: [{ kind: 'fleeBattle' }] },
  ]

  test('多 hook 非空正控通过且完整输入保真', () => {
    const input = fullInput()
    const before = deepSnapshot(input)
    expect(() => checkBattleChoreography(input, '演出')).not.toThrow()
    expect(input).toEqual(before)
  })

  test('多 hook 只破中间 hook 单轴：叶错误定位、其余 hook 与完整输入保真', () => {
    const broken = fullInput()
    broken[1] = { at: 'turnStart', once: true, body: [{ kind: 'wait', ms: -1 }] }
    const before = deepSnapshot(broken)
    expect(() => checkBattleChoreography(broken, '演出')).toThrow(
      '演出[1].body[0].ms: 期望非负有限数',
    )
    expect(broken).toEqual(before)
  })

  test('整体与 hook 层形状拒绝（非数组/非对象 hook/未知字段）', () => {
    checkBattleChoreography(fullInput(), '演出')
    expect(() => checkBattleChoreography('x', '演出')).toThrow('演出: 期望 BattleChoreography[]')
    expect(() => checkBattleChoreography(['x'], '演出')).toThrow('演出[0]: 期望对象')
    expect(() => checkBattleChoreography([null], '演出')).toThrow('演出[0]: 期望对象')
    expect(() =>
      checkBattleChoreography([{ at: 'battleStart', body: [waitAction(0)], extra: 1 }], '演出'),
    ).toThrow('演出[0].extra: 未知字段')
  })

  test.each([
    [
      'at 非法值',
      { at: 'midturn', body: [waitAction(0)] },
      '演出[0].at: 期望 battleStart|turnStart',
    ],
    ['at 缺席', { body: [waitAction(0)] }, '演出[0].at: 期望 battleStart|turnStart'],
    [
      'once 非布尔',
      { at: 'battleStart', once: 'yes', body: [waitAction(0)] },
      '演出[0].once: 期望 boolean',
    ],
    [
      'when 非法条件',
      { at: 'battleStart', when: { kind: 'turn', op: '<' }, body: [waitAction(0)] },
      '演出[0].when.op: 期望 ==|>=',
    ],
    [
      'body 非数组',
      { at: 'battleStart', body: 'x' },
      '演出[0].body: 期望 BattleChoreographyAction[]',
    ],
    ['body 缺席', { at: 'battleStart' }, '演出[0].body: 期望 BattleChoreographyAction[]'],
  ] as const)('%s拒绝且完整输入保真', (_label, badHook, error) => {
    checkBattleChoreography(fullInput(), '演出')
    const input = [badHook]
    const before = deepSnapshot(input)
    expect(() => checkBattleChoreography(input, '演出')).toThrow(error)
    expect(input).toEqual(before)
  })

  test('body 直入口：合法数组通过、非数组精确路径拒绝', () => {
    expect(() => checkBattleChoreographyBody([waitAction(0)], 'body')).not.toThrow()
    expect(() => checkBattleChoreographyBody('x', 'body')).toThrow(
      'body: 期望 BattleChoreographyAction[]',
    )
  })
})
