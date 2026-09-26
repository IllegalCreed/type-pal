/**
 * TEST-GLM-CONTENT-GUARDS-3 G8：validateItems / validateAuthorItemCore / checkThrowSpec 残差。
 * 去重：validate.test.ts（C8 用途契约：合法三用途/gate 缺省/傀儡/15 条非法 each/投掷空效果/
 * 8 条安全整数 each/私有脚本/配方资源池/自消耗/装备映射）、validate-author-items.boundaries、
 * validate-author.test.ts——本文件只补冻结池内：use 效果 kind 域与各 switch 臂、
 * checkThrowSpec 全分支、顶层/装备/作者物品核叶。
 * R1：角色效果行以同型角色效果为正控；场景效果（runSceneHook/craftRecipe/
 * drawFromResourcePool/modifyHostileAwareness）行以 target:'scene' 的同型场景效果为正控，
 * 坏输入从同型合法基线只改所测字段；投掷行以完整合法 magicDamage 为正控，
 * 坏输入只改 element/strength 单字段。R2：每个对象拒绝调用经 expectRejectUnchanged
 * 逐次取实际入参独立快照并立即比较（含同一测试的后续调用）。
 */
import { describe, test } from 'vitest'
import { expectRejectUnchanged } from './__tests__/glm-guard-residual-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
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

/** 角色效果载体（同型正控/负例共用）。 */
const useEffects = (effects: readonly unknown[]) =>
  item({ target: 'oneAlly', consuming: true, effects })

/** 场景效果载体（runSceneHook/craftRecipe/drawFromResourcePool/modifyHostileAwareness 必须唯一场景效果）。 */
const sceneItem = (effects: readonly unknown[]) =>
  item({ target: 'scene', consuming: false, effects })

describe('G8 validateItems use 效果残差', () => {
  test('角色与场景两类同型合法正控通过且输入保真', () => {
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
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [sceneItem([{ kind: 'runSceneHook', hook: 'onTeleport' }])],
    )
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [
        sceneItem([
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'item.y', count: 2 }],
                products: [{ itemId: 'item.x', count: 1 }],
              },
            ],
          },
        ]),
      ],
    )
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [
        sceneItem([
          {
            kind: 'drawFromResourcePool',
            resource: 'pool.x',
            maxRoll: 1,
            rewards: [{ itemId: 'item.y', count: 1 }],
          },
        ]),
      ],
    )
    expectAcceptsUnchanged(
      (value) => validateItems(value),
      [sceneItem([{ kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 1 }])],
    )
  })

  test.each([
    ['kind 非字符串', 42, 'items[0].use.effects[0].kind: 期望 string'],
    ['kind 未知', 'nope', 'items[0].use.effects[0].kind: 未知物品效果 nope'],
  ] as const)('use 效果 %s拒绝', (_label, kind, error) => {
    const control = { kind: 'healHp', amount: 1 }
    expectAcceptsUnchanged((value) => validateItems(value), [useEffects([control])])
    const bad = [useEffects([{ kind }])]
    expectRejectUnchanged((value) => validateItems(value), bad, error)
  })

  test.each([
    {
      label: 'extraPoisonRes amount',
      control: { kind: 'extraPoisonRes', amount: 30 },
      bad: { kind: 'extraPoisonRes', amount: 0 },
      error: 'items[0].use.effects[0].amount: 期望正数',
    },
    {
      label: 'applyStatus 未知状态',
      control: { kind: 'applyStatus', status: 'sleep', turns: 1 },
      bad: { kind: 'applyStatus', status: 'bogus', turns: 1 },
      error: 'items[0].use.effects[0].status: 未知状态 bogus',
    },
    {
      label: 'applyStatus turns 上界',
      control: { kind: 'applyStatus', status: 'sleep', turns: 1 },
      bad: { kind: 'applyStatus', status: 'sleep', turns: 1000 },
      error: 'items[0].use.effects[0].turns: 不得大于 999',
    },
    {
      label: 'removeStatus 重复',
      control: { kind: 'removeStatus', statuses: ['sleep'] },
      bad: { kind: 'removeStatus', statuses: ['sleep', 'sleep'] },
      error: 'items[0].use.effects[0].statuses[1]: 状态 sleep 重复',
    },
    {
      label: 'applyPoison 空毒 id',
      control: { kind: 'applyPoison', poisonId: 'poison.551' },
      bad: { kind: 'applyPoison', poisonId: '' },
      error: 'items[0].use.effects[0].poisonId: 期望非空稳定 id',
    },
    {
      label: 'curePoison 档位',
      control: { kind: 'curePoison', curesTier: 'common' },
      bad: { kind: 'curePoison', curesTier: 'all' },
      error: 'items[0].use.effects[0].curesTier: 期望 common/severe/incurable',
    },
    {
      label: 'permanentStatBoost 未知属性',
      control: { kind: 'permanentStatBoost', stat: 'luck', delta: 2 },
      bad: { kind: 'permanentStatBoost', stat: 'hp', delta: 2 },
      error: 'items[0].use.effects[0].stat: 未知永久属性 hp',
    },
    {
      label: 'permanentStatBoost delta 0',
      control: { kind: 'permanentStatBoost', stat: 'luck', delta: 2 },
      bad: { kind: 'permanentStatBoost', stat: 'luck', delta: 0 },
      error: 'items[0].use.effects[0].delta: 不得为 0',
    },
    {
      label: 'gate chance 上界',
      control: { kind: 'gate', chance: 100 },
      bad: { kind: 'gate', chance: 101 },
      error: 'items[0].use.effects[0].chance: 不得大于 100',
    },
    {
      label: 'scaleCurrentHp 分子',
      control: { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
      bad: { kind: 'scaleCurrentHp', numerator: 0, denominator: 2 },
      error: 'items[0].use.effects[0].numerator: 期望正数',
    },
  ] as const)('$label拒绝（同kind合法基线先过真实守卫、仅改所测字段）', ({
    control,
    bad,
    error,
  }) => {
    expectAcceptsUnchanged((value) => validateItems(value), [useEffects([control])])
    expectRejectUnchanged((value) => validateItems(value), [useEffects([bad])], error)
  })

  test.each([
    {
      label: 'runSceneHook hook 域',
      control: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
      bad: [{ kind: 'runSceneHook', hook: 'onUse' }],
      error: 'items[0].use.effects[0].hook: 当前只支持 onTeleport',
    },
    {
      label: 'runSceneHook 空消息',
      control: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
      bad: [{ kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '' }],
      error: 'items[0].use.effects[0].unavailableMessage: 期望非空 string',
    },
    {
      label: 'craftRecipe 空配方',
      control: [
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
      bad: [{ kind: 'craftRecipe', recipes: [] }],
      error: 'items[0].use.effects[0].recipes: 至少需要一条配方',
    },
    {
      label: 'drawFromResourcePool 资源首尾空白',
      control: [
        {
          kind: 'drawFromResourcePool',
          resource: 'pool.x',
          maxRoll: 1,
          rewards: [{ itemId: 'item.y', count: 1 }],
        },
      ],
      bad: [
        {
          kind: 'drawFromResourcePool',
          resource: ' pool.x',
          maxRoll: 1,
          rewards: [{ itemId: 'item.y', count: 1 }],
        },
      ],
      error: 'items[0].use.effects[0].resource: 稳定 id 不得包含首尾空白',
    },
    {
      label: 'modifyHostileAwareness 倍率',
      control: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 1 }],
      bad: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 1, durationMs: 1 }],
      error: 'items[0].use.effects[0].rangeMultiplier: 期望 0 或 3',
    },
  ] as const)('$label拒绝（target:scene 同kind场景效果基线先过真实守卫、仅改所测字段）', ({
    control,
    bad,
    error,
  }) => {
    expectAcceptsUnchanged((value) => validateItems(value), [sceneItem(control)])
    expectRejectUnchanged((value) => validateItems(value), [sceneItem(bad)], error)
  })

  test('craftRecipe 配方材料叶拒绝（scene 载体、完整配方正控）', () => {
    const control = [
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
    expectAcceptsUnchanged((value) => validateItems(value), control)
    const bad = [
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
    expectRejectUnchanged(
      (value) => validateItems(value),
      bad,
      'items[0].use.effects[0].recipes[0].ingredients[0].itemId: 期望非空 string',
    )
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
  const legalMagic = () => ({
    kind: 'magicDamage',
    baseDamage: 1,
    element: 'none',
    strength: { kind: 'fixed', value: 1 },
  })

  const casterAttackMagic = () => ({
    kind: 'magicDamage',
    baseDamage: 1,
    element: 'none',
    strength: {
      kind: 'casterAttack',
      bonus: 0,
      multiplier: { kind: 'uniformInt', min: 0, max: 3 },
    },
  })

  test('投掷效果全分支正控（含完整 magicDamage/casterAttack 强度）', () => {
    expectAcceptsUnchanged((value) => checkThrowSpec(value), {
      target: 'oneEnemy',
      effects: [
        { kind: 'fixedDamage', amount: 5 },
        legalMagic(),
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
    {
      label: 'kind 非字符串',
      control: { kind: 'fixedDamage', amount: 5 },
      bad: 42,
      error: 'throw.effects[0].kind: 期望 string',
    },
    {
      label: '未知元素',
      control: legalMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'metal',
        strength: { kind: 'fixed', value: 1 },
      },
      error: 'throw.effects[0].element: 未知投掷元素 metal',
    },
    {
      label: '强度 kind',
      control: casterAttackMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'gauss', value: 1 },
      },
      error: 'throw.effects[0].strength.kind: 期望 fixed/casterAttack',
    },
    {
      label: '强度 multiplier kind',
      control: casterAttackMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'casterAttack', bonus: 0, multiplier: { kind: 'gauss', min: 0, max: 3 } },
      },
      error: 'throw.effects[0].strength.multiplier.kind: 期望 uniformInt',
    },
    {
      label: '强度 min 负',
      control: casterAttackMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: 0,
          multiplier: { kind: 'uniformInt', min: -1, max: 3 },
        },
      },
      error: 'throw.effects[0].strength.multiplier: min/max 不得小于 0',
    },
    {
      label: '强度 min>max',
      control: casterAttackMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: 0,
          multiplier: { kind: 'uniformInt', min: 3, max: 1 },
        },
      },
      error: 'throw.effects[0].strength.multiplier: min 不得大于 max',
    },
    {
      label: '强度 bonus 负',
      control: casterAttackMagic(),
      bad: {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: -1,
          multiplier: { kind: 'uniformInt', min: 0, max: 3 },
        },
      },
      error: 'throw.effects[0].strength.bonus: 不得小于 0',
    },
    {
      label: 'fixedDamage 零',
      control: { kind: 'fixedDamage', amount: 5 },
      bad: { kind: 'fixedDamage', amount: 0 },
      error: 'throw.effects[0].amount: 期望正数',
    },
    {
      label: 'applyPoison 空毒 id',
      control: { kind: 'applyPoison', poisonId: 'poison.551' },
      bad: { kind: 'applyPoison', poisonId: '' },
      error: 'throw.effects[0].poisonId: 期望非空稳定 id',
    },
    {
      label: 'currentHpDamage 分子',
      control: { kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 0, cap: 9 },
      bad: { kind: 'currentHpDamage', numerator: 0, denominator: 2 },
      error: 'throw.effects[0].numerator: 期望正数',
    },
    {
      label: 'applyStatus 未知状态',
      control: { kind: 'applyStatus', status: 'sleep', turns: 1, onResist: 'continue' },
      bad: { kind: 'applyStatus', status: 'bogus', turns: 1 },
      error: 'throw.effects[0].status: 未知状态 bogus',
    },
    {
      label: 'applyStatus onResist',
      control: { kind: 'applyStatus', status: 'sleep', turns: 1, onResist: 'continue' },
      bad: { kind: 'applyStatus', status: 'sleep', turns: 1, onResist: 'x' },
      error: 'throw.effects[0].onResist: 期望 continue/stopTarget',
    },
    {
      label: 'killIfHpAtMost 上界',
      control: { kind: 'killIfHpAtMost', percent: 30 },
      bad: { kind: 'killIfHpAtMost', percent: 101 },
      error: 'throw.effects[0].percent: 不得大于 100',
    },
    {
      label: 'damageAndHealCaster 零伤害',
      control: { kind: 'damageAndHealCaster', damage: 1, heal: 1 },
      bad: { kind: 'damageAndHealCaster', damage: 0, heal: 1 },
      error: 'throw.effects[0].damage: 期望正数',
    },
  ] as const)('$label拒绝（同kind合法投掷基线先过真实守卫、仅改所测字段）', ({
    control,
    bad,
    error,
  }) => {
    expectAcceptsUnchanged((value) => checkThrowSpec(value), {
      target: 'oneEnemy',
      effects: [control],
    })
    expectRejectUnchanged(
      (value) => checkThrowSpec(value),
      { target: 'oneEnemy', effects: [bad] },
      error,
    )
  })

  test('target 域与 presentation 正负控', () => {
    const legalPresentation = {
      target: 'oneEnemy',
      presentation: { kind: 'magic', animation: { effectSprite: 1 } },
      effects: [{ kind: 'fixedDamage', amount: 5 }],
    }
    expectAcceptsUnchanged((value) => checkThrowSpec(value), legalPresentation)
    const badTarget = { target: 'random', effects: [{ kind: 'fixedDamage', amount: 5 }] }
    expectRejectUnchanged(
      (value) => checkThrowSpec(value),
      badTarget,
      'throw.target: 期望 oneEnemy/allEnemies',
    )
    const badPresentation = {
      target: 'oneEnemy',
      presentation: { kind: 'firework' },
      effects: [{ kind: 'fixedDamage', amount: 5 }],
    }
    expectRejectUnchanged(
      (value) => checkThrowSpec(value),
      badPresentation,
      'throw.presentation.kind: 期望 magic',
    )
  })
})

describe('G8 validateItems 顶层/装备与作者物品核残差', () => {
  const legalUseItem = () =>
    item({ target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] })

  test('顶层 id/battleOnly/menuAfterUse 叶拒绝', () => {
    expectAcceptsUnchanged((value) => validateItems(value), [legalUseItem()])
    const badId = [{ id: 42, name: 'x', desc: [], buyPrice: 0, sellPrice: 0, sellable: false }]
    expectRejectUnchanged((value) => validateItems(value), badId, 'items[0]: id 非string')
    const badBattleOnly = [
      item({
        target: 'oneAlly',
        consuming: true,
        battleOnly: 'yes',
        effects: [{ kind: 'healHp', amount: 1 }],
      }),
    ]
    expectRejectUnchanged(
      (value) => validateItems(value),
      badBattleOnly,
      'items[0].use.battleOnly: 期望 boolean',
    )
    const badMenu = [
      item({
        target: 'oneAlly',
        consuming: true,
        menuAfterUse: 'bogus',
        effects: [{ kind: 'healHp', amount: 1 }],
      }),
    ]
    expectRejectUnchanged(
      (value) => validateItems(value),
      badMenu,
      'items[0].use.menuAfterUse: 期望 keep/close',
    )
  })

  test('场景配方非消耗为正控；装备叶正负控', () => {
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
    expectRejectUnchanged(
      (value) => validateItems(value),
      badEquipable,
      'items[0].equip.equipableBy[0]: 期望非空 ActorDef.id',
    )
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
    const authorItem = (use: unknown) => ({
      id: 'item-1',
      name: '物品1',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use,
    })
    const control = authorItem({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 1 }],
    })
    expectAcceptsUnchanged((value) => validateAuthorItemCore(value), [control])
    const badKind = authorItem({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'nope' }],
    })
    expectRejectUnchanged(
      (value) => validateAuthorItemCore(value),
      [badKind],
      'items[0].use.effects[0].kind: 未知作者物品效果 nope',
    )
    const badLabel = authorItem({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', label: 42, body: [] } }],
    })
    expectRejectUnchanged(
      (value) => validateAuthorItemCore(value),
      [badLabel],
      'items[0].use.effects[0].script.label: 期望 string',
    )
    const badContext = authorItem({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'itemPrivateScript', script: { id: 'use', label: 'x', body: [] } },
        { kind: 'hideParty', turns: 1 },
      ],
    })
    expectRejectUnchanged(
      (value) => validateAuthorItemCore(value),
      [badContext],
      'items[0].use.effects: 效果组合不存在可执行的世界/战斗上下文',
    )
  })
})
