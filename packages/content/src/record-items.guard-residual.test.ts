/**
 * TEST-GLM-CONTENT-GUARDS-3 G8：validateItems / validateAuthorItemCore / checkThrowSpec 残差。
 * 去重：validate.test.ts（C8 用途契约：合法世界/战斗/剧情用途、gate 缺省、傀儡携带、
 * 15 条非法用途 each、投掷空效果、8 条安全整数 each、私有脚本组合、配方/资源池、
 * 自材料消耗、装备 battleSprite 映射）、validate-author-items.boundaries（私有槽唯一/
 * battleOnly 上下文）、validate-author.test.ts（作者物品脚本 4 条）——本文件只补冻结池内：
 * use 效果 kind 域与 extraPoisonRes/applyStatus/removeStatus/applyPoison/curePoison/
 * permanentStatBoost/gate/runSceneHook/craftRecipe/drawFromResourcePool/
 * modifyHostileAwareness/scaleCurrentHp/levelUp/placeEntityInFront/dieIfNotPoisoned 各臂、
 * checkThrowSpec 的元素/强度/casterAttack 全分支/applyPoison/currentHpDamage/
 * applyStatus/killIfHpAtMost/damageAndHealCaster/target/presentation、
 * 顶层 id/battleOnly/menuAfterUse/上下文组合/装备叶，及作者物品核的 kind/label/上下文叶。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkThrowSpec, validateAuthorItemCore, validateItems } from './validate.js'

const item = (use: unknown) => ({
  id: 'item',
  name: '测试物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use,
})

const useEffects = (effects: unknown[]) => item({ target: 'oneAlly', consuming: true, effects })

describe('G8 validateItems use 效果残差', () => {
  test('效果 kind 域与各 switch 臂正控', () => {
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [
        useEffects([
          { kind: 'extraPoisonRes', amount: 30 },
          { kind: 'applyStatus', status: 'sleep', turns: 1 },
          { kind: 'removeStatus', statuses: ['sleep'] },
          { kind: 'applyPoison', poisonId: 'poison.551' },
          { kind: 'curePoison', curesTier: 'common' },
          { kind: 'permanentStatBoost', stat: 'luck', delta: 2 },
          { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
          { kind: 'levelUp', levels: 1 },
          { kind: 'dieIfNotPoisoned' },
        ]),
      ],
    )
  })

  test.each([
    ['kind 非字符串', 42, 'items[0].use.effects[0].kind: 期望 string'],
    ['kind 未知', 'nope', 'items[0].use.effects[0].kind: 未知物品效果 nope'],
  ] as const)('use 效果 %s拒绝', (_label, kind, error) => {
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [useEffects([{ kind: 'healHp', amount: 1 }])],
    )
    const bad = [useEffects([{ kind }])]
    const before = deepSnapshot(bad)
    expectExactError(() => validateItems(bad), error)
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'extraPoisonRes amount',
      { kind: 'extraPoisonRes', amount: 0 },
      'items[0].use.effects[0].amount: 期望正数',
    ],
    [
      'applyStatus 未知状态',
      { kind: 'applyStatus', status: 'bogus', turns: 1 },
      'items[0].use.effects[0].status: 未知状态 bogus',
    ],
    [
      'applyStatus turns 上界',
      { kind: 'applyStatus', status: 'sleep', turns: 1000 },
      'items[0].use.effects[0].turns: 不得大于 999',
    ],
    [
      'removeStatus 重复',
      { kind: 'removeStatus', statuses: ['sleep', 'sleep'] },
      'items[0].use.effects[0].statuses[1]: 状态 sleep 重复',
    ],
    [
      'applyPoison 空毒 id',
      { kind: 'applyPoison', poisonId: '' },
      'items[0].use.effects[0].poisonId: 期望非空稳定 id',
    ],
    [
      'curePoison 档位',
      { kind: 'curePoison', curesTier: 'all' },
      'items[0].use.effects[0].curesTier: 期望 common/severe/incurable',
    ],
    [
      'permanentStatBoost 未知属性',
      { kind: 'permanentStatBoost', stat: 'hp', delta: 2 },
      'items[0].use.effects[0].stat: 未知永久属性 hp',
    ],
    [
      'permanentStatBoost delta 0',
      { kind: 'permanentStatBoost', stat: 'luck', delta: 0 },
      'items[0].use.effects[0].delta: 不得为 0',
    ],
    [
      'gate chance 上界',
      { kind: 'gate', chance: 101 },
      'items[0].use.effects[0].chance: 不得大于 100',
    ],
    [
      'runSceneHook hook 域',
      { kind: 'runSceneHook', hook: 'onUse' },
      'items[0].use.effects[0].hook: 当前只支持 onTeleport',
    ],
    [
      'runSceneHook 空消息',
      { kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '' },
      'items[0].use.effects[0].unavailableMessage: 期望非空 string',
    ],
    [
      'craftRecipe 空配方',
      { kind: 'craftRecipe', recipes: [] },
      'items[0].use.effects[0].recipes: 至少需要一条配方',
    ],
    [
      'modifyHostileAwareness 倍率',
      { kind: 'modifyHostileAwareness', rangeMultiplier: 1, durationMs: 1 },
      'items[0].use.effects[0].rangeMultiplier: 期望 0 或 3',
    ],
    [
      'scaleCurrentHp 分子',
      { kind: 'scaleCurrentHp', numerator: 0, denominator: 2 },
      'items[0].use.effects[0].numerator: 期望正数',
    ],
  ] as const)('%s拒绝且实际输入不变', (_label, badEffect, error) => {
    const control: Record<string, unknown> = { kind: 'extraPoisonRes', amount: 30 }
    expectAcceptsUnchanged((value) => validateItems(value), [useEffects([control])])
    const bad = [useEffects([badEffect])]
    const before = deepSnapshot(bad)
    expectExactError(() => validateItems(bad), error)
    expect(bad).toEqual(before)
  })

  test('craftRecipe 配方材料叶与上下文组合拒绝', () => {
    const legalRecipe = [
      item({
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'item.y', count: 2 }],
                products: [{ itemId: 'item.x', count: 1 }],
              },
            ],
          },
        ],
      }),
    ]
    expectAcceptsUnchanged((value) => validateItems(value), legalRecipe)
    const badIngredient = [
      item({
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: '', count: 2 }],
                products: [{ itemId: 'item.x', count: 1 }],
              },
            ],
          },
        ],
      }),
    ]
    const before = deepSnapshot(badIngredient)
    expectExactError(
      () => validateItems(badIngredient),
      'items[0].use.effects[0].recipes[0].ingredients[0].itemId: 期望非空 string',
    )
    expect(badIngredient).toEqual(before)
    const badContext = [
      useEffects([
        {
          kind: 'craftRecipe',
          recipes: [
            {
              ingredients: [{ itemId: 'item.y', count: 2 }],
              products: [{ itemId: 'item.x', count: 1 }],
            },
          ],
        },
        { kind: 'hideParty', turns: 1 },
      ]),
    ]
    expectExactError(
      () => validateItems(badContext),
      'items[0].use.effects: 效果组合不存在可执行的世界/战斗上下文',
    )
  })

  test('drawFromResourcePool 资源叶拒绝', () => {
    const control = [
      item({
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'pool.x',
            maxRoll: 1,
            rewards: [{ itemId: 'item.y', count: 1 }],
          },
        ],
      }),
    ]
    expectAcceptsUnchanged((value) => validateItems(value), control)
    const badTrim = [
      item({
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: ' pool.x',
            maxRoll: 1,
            rewards: [{ itemId: 'item.y', count: 1 }],
          },
        ],
      }),
    ]
    const before = deepSnapshot(badTrim)
    expectExactError(
      () => validateItems(badTrim),
      'items[0].use.effects[0].resource: 稳定 id 不得包含首尾空白',
    )
    expect(badTrim).toEqual(before)
  })

  test('placeEntityInFront 唯一效果正控', () => {
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [
        item({
          target: 'scene',
          consuming: false,
          effects: [
            { kind: 'placeEntityInFront', target: { scene: 'scene.a', entity: 'ent.1' }, state: 0 },
          ],
        }),
      ],
    )
  })
})

describe('G8 checkThrowSpec 残差', () => {
  test('投掷效果全分支正控', () => {
    expectAcceptsUnchanged((value) => checkThrowSpec(value), {
      target: 'oneEnemy',
      effects: [
        { kind: 'fixedDamage', amount: 5 },
        {
          kind: 'magicDamage',
          baseDamage: 1,
          element: 'none',
          strength: { kind: 'fixed', value: 1 },
        },
        {
          kind: 'magicDamage',
          baseDamage: 1,
          element: 'fire',
          strength: {
            kind: 'casterAttack',
            bonus: 1,
            multiplier: { kind: 'uniformInt', min: 0, max: 3 },
          },
        },
        { kind: 'applyPoison', poisonId: 'poison.551' },
        { kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 0, cap: 9 },
        { kind: 'applyStatus', status: 'sleep', turns: 1, onResist: 'continue' },
        { kind: 'killIfHpAtMost', percent: 30 },
        { kind: 'damageAndHealCaster', damage: 1, heal: 1 },
      ],
    })
  })

  test.each([
    ['kind 非字符串', 42, 'throw.effects[0].kind: 期望 string'],
    [
      '未知元素',
      { kind: 'magicDamage', baseDamage: 1, element: 'metal' },
      'throw.effects[0].element: 未知投掷元素 metal',
    ],
    [
      '强度 kind',
      { kind: 'magicDamage', baseDamage: 1, element: 'none', strength: { kind: 'gauss' } },
      'throw.effects[0].strength.kind: 期望 fixed/casterAttack',
    ],
    [
      '强度 multiplier kind',
      {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'casterAttack', bonus: 0, multiplier: { kind: 'gauss' } },
      },
      'throw.effects[0].strength.multiplier.kind: 期望 uniformInt',
    ],
    [
      '强度 min 负',
      {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: 0,
          multiplier: { kind: 'uniformInt', min: -1, max: 3 },
        },
      },
      'throw.effects[0].strength.multiplier: min/max 不得小于 0',
    ],
    [
      '强度 min>max',
      {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: 0,
          multiplier: { kind: 'uniformInt', min: 3, max: 1 },
        },
      },
      'throw.effects[0].strength.multiplier: min 不得大于 max',
    ],
    [
      '强度 bonus 负',
      {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'casterAttack', bonus: -1 },
      },
      'throw.effects[0].strength.bonus: 不得小于 0',
    ],
    ['fixedDamage 零', { kind: 'fixedDamage', amount: 0 }, 'throw.effects[0].amount: 期望正数'],
    [
      'applyPoison 空毒 id',
      { kind: 'applyPoison', poisonId: '' },
      'throw.effects[0].poisonId: 期望非空稳定 id',
    ],
    [
      'currentHpDamage 分子',
      { kind: 'currentHpDamage', numerator: 0, denominator: 2 },
      'throw.effects[0].numerator: 期望正数',
    ],
    [
      'applyStatus 未知状态',
      { kind: 'applyStatus', status: 'bogus', turns: 1 },
      'throw.effects[0].status: 未知状态 bogus',
    ],
    [
      'applyStatus onResist',
      { kind: 'applyStatus', status: 'sleep', turns: 1, onResist: 'x' },
      'throw.effects[0].onResist: 期望 continue/stopTarget',
    ],
    [
      'killIfHpAtMost 上界',
      { kind: 'killIfHpAtMost', percent: 101 },
      'throw.effects[0].percent: 不得大于 100',
    ],
    [
      'damageAndHealCaster 零伤害',
      { kind: 'damageAndHealCaster', damage: 0, heal: 1 },
      'throw.effects[0].damage: 期望正数',
    ],
  ] as const)('%s拒绝且实际输入不变', (_label, badEffect, error) => {
    expectAcceptsUnchanged((value) => checkThrowSpec(value), {
      target: 'oneEnemy',
      effects: [{ kind: 'fixedDamage', amount: 5 }],
    })
    const bad = { target: 'oneEnemy', effects: [badEffect] }
    const before = deepSnapshot(bad)
    expectExactError(() => checkThrowSpec(bad), error)
    expect(bad).toEqual(before)
  })

  test('target 域与 presentation 正负控', () => {
    const legalPresentation = {
      target: 'oneEnemy',
      presentation: { kind: 'magic', animation: { effectSprite: 1 } },
      effects: [{ kind: 'fixedDamage', amount: 5 }],
    }
    expectAcceptsUnchanged((value) => checkThrowSpec(value), legalPresentation)
    const badTarget = { target: 'random', effects: [{ kind: 'fixedDamage', amount: 5 }] }
    const targetBefore = deepSnapshot(badTarget)
    expectExactError(() => checkThrowSpec(badTarget), 'throw.target: 期望 oneEnemy/allEnemies')
    expect(badTarget).toEqual(targetBefore)
    const badPresentation = {
      target: 'oneEnemy',
      presentation: { kind: 'firework' },
      effects: [{ kind: 'fixedDamage', amount: 5 }],
    }
    expectExactError(() => checkThrowSpec(badPresentation), 'throw.presentation.kind: 期望 magic')
  })
})

describe('G8 validateItems 顶层/装备与作者物品核残差', () => {
  test('顶层 id/battleOnly/menuAfterUse 叶拒绝', () => {
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [item({ target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] })],
    )
    const badId = [{ id: 42, name: 'x', desc: [], buyPrice: 0, sellPrice: 0, sellable: false }]
    const idBefore = deepSnapshot(badId)
    expectExactError(() => validateItems(badId), 'items[0]: id 非string')
    expect(badId).toEqual(idBefore)
    const badBattleOnly = [
      item({
        target: 'oneAlly',
        consuming: true,
        battleOnly: 'yes',
        effects: [{ kind: 'healHp', amount: 1 }],
      }),
    ]
    expectExactError(() => validateItems(badBattleOnly), 'items[0].use.battleOnly: 期望 boolean')
    const badMenu = [
      item({
        target: 'oneAlly',
        consuming: true,
        menuAfterUse: 'bogus',
        effects: [{ kind: 'healHp', amount: 1 }],
      }),
    ]
    expectExactError(() => validateItems(badMenu), 'items[0].use.menuAfterUse: 期望 keep/close')
  })

  test('消耗配方不含自身为正控；装备叶正负控', () => {
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [
        item({
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: 'item.y', count: 2 }],
                  products: [{ itemId: 'item.x', count: 1 }],
                },
              ],
            },
          ],
        }),
      ],
    )
    const badEquipable = [
      {
        id: 'weapon',
        name: '测试武器',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: { slot: 'weapon', equipableBy: [42], effects: [{ kind: 'statBoost', attack: 1 }] },
      },
    ]
    const equipBefore = deepSnapshot(badEquipable)
    expectExactError(
      () => validateItems(badEquipable),
      'items[0].equip.equipableBy[0]: 期望非空 ActorDef.id',
    )
    expect(badEquipable).toEqual(equipBefore)
    const legalEquip = [
      {
        id: 'weapon',
        name: '测试武器',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: {
          slot: 'weapon',
          equipableBy: ['hero'],
          effects: [{ kind: 'statBoost', attack: 1 }],
        },
      },
    ]
    expectAcceptsUnchanged((value) => validateItems(value), legalEquip)
  })

  test('validateAuthorItemCore kind/label/上下文叶拒绝与正控', () => {
    const control = [
      {
        id: 'item-1',
        name: '物品1',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] },
      },
    ]
    expectAcceptsUnchanged((value) => validateAuthorItemCore(value), control)
    const badKind = [
      {
        id: 'item-1',
        name: '物品1',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'nope' }] },
      },
    ]
    const kindBefore = deepSnapshot(badKind)
    expectExactError(
      () => validateAuthorItemCore(badKind),
      'items[0].use.effects[0].kind: 未知作者物品效果 nope',
    )
    expect(badKind).toEqual(kindBefore)
    const badLabel = [
      {
        id: 'item-1',
        name: '物品1',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'itemPrivateScript', script: { id: 'use', label: 42, body: [] } }],
        },
      },
    ]
    expectExactError(
      () => validateAuthorItemCore(badLabel),
      'items[0].use.effects[0].script.label: 期望 string',
    )
    const badContext = [
      {
        id: 'item-1',
        name: '物品1',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [
            { kind: 'itemPrivateScript', script: { id: 'use', label: 'x', body: [] } },
            { kind: 'hideParty', turns: 1 },
          ],
        },
      },
    ]
    expectExactError(
      () => validateAuthorItemCore(badContext),
      'items[0].use.effects: 效果组合不存在可执行的世界/战斗上下文',
    )
  })
})
