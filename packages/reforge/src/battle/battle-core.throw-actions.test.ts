import type { EnemyDef, ItemData } from '@type-pal/content'
import { calcMagicDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfIdleEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { type CreatePlayerInput, createBattleState, stepBattle } from './battle-core.js'

const rng0 = () => 0

describe('投掷与养蛊材料', () => {
  const THROW_ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    '144': {
      id: '144',
      name: '食妖虫',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '561' }] },
    },
  }
  const PARASITE: Record<number, import('@type-pal/content').PoisonDef> = {
    561: {
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: 0,
      // 施毒当下先跑 −1，同轮回合末再跑 −2；下一回合才到末段 −8 + 产物。
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
    },
  }
  test('投掷目标在出手前死亡时环扫改投下一名活敌', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 0 })],
      enemySlots: [wfEnemy('dead', { health: 10 }), wfIdleEnemy('alive', { health: 999 })],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 1 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    s.enemies[1]!.def.ai.resistanceToSorcery = 0
    stepBattle(s, () => 0.5)
    s.enemies[0]!.hp = 0
    s.enemies[1]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let guard = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.enemies[0]!.poisons).toHaveLength(0)
    expect(s.enemies[1]!.poisons.map((poison) => poison.poisonId)).toEqual([561])
    expect(s.inventory.find((entry) => entry.itemId === '144')?.count).toBe(0)
  })

  test('投掷食妖虫 → 敌中寄生毒(巫抗门)+ 消耗;到期产灵蛊入背包(养蛊闭环)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 0 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 2 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0 // 零巫抗必中
    stepBattle(s, () => 0.5)
    s.enemies[0]!.status.sleep = 99 // 隔离敌回合
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.poisons.map((p) => p.poisonId)).toEqual([561]) // 中寄生毒
    expect(s.inventory.find((x) => x.itemId === '144')?.count).toBe(1) // 投掷消耗 2→1
    // 再过一回合 → 寄生到期产灵蛊
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'defend' })
    g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.inventory.find((x) => x.itemId === '145')?.count).toBe(1) // 灵蛊入背包
  })

  test('巫抗满 → 投掷下毒不中(道具仍消耗)', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 999 })],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 1 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    stepBattle(s, () => 0.99)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.poisons).toHaveLength(0) // 巫抗挡,不中
    expect(s.inventory.find((x) => x.itemId === '144')?.count).toBe(0) // 仍消耗(count 0,写回时清)
  })

  test('无影毒按敌人当前生命的一半加一扣血，并封顶 1000', () => {
    const poison: ItemData = {
      id: '137',
      name: '无影毒',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'currentHpDamage',
            numerator: 1,
            denominator: 2,
            bonus: 1,
            cap: 1000,
          },
        ],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 3000, attackStrength: 0 })],
      items: { '137': poison },
      inventory: [{ itemId: '137', count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '137', targetEnemyIdx: 0 })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.enemies[0]!.hp).toBe(2000)
    expect(s.inventory[0]!.count).toBe(0)
    expect(s.log.some((line) => line.includes('受到 1000 伤害'))).toBe(true)
  })
})

describe('投掷效果与脚本顺序', () => {
  const runThrow = (
    thrown: NonNullable<ItemData['throw']>,
    options: {
      enemies?: EnemyDef[]
      player?: Partial<CreatePlayerInput>
      rng?: number[]
      targetEnemyIdx?: number
      poisonDefs?: Record<number, import('@type-pal/content').PoisonDef>
      prepare?: (state: ReturnType<typeof createBattleState>) => void
    } = {},
  ) => {
    let calls = 0
    const values = options.rng ?? []
    const rng = () => values[calls++] ?? 0
    const item: ItemData = {
      id: 'r13-throw',
      name: '投掷测试物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: thrown,
    }
    const s = createBattleState({
      players: [
        wfPlayer('li', {
          baseDexterity: 500,
          attackStrength: 40,
          ...options.player,
        }),
      ],
      enemySlots: options.enemies ?? [
        wfIdleEnemy('target', { health: 1000, defense: 0, dexterity: 0 }),
      ],
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 1 }],
      poisonDefs: options.poisonDefs,
    })
    stepBattle(s, rng)
    options.prepare?.(s)
    s.pendingActions.set(0, {
      kind: 'throw',
      itemId: item.id,
      ...(options.targetEnemyIdx === undefined ? {} : { targetEnemyIdx: options.targetEnemyIdx }),
    })
    stepBattle(s, rng)
    expect(s.actionQueue[0]?.isEnemy).toBe(false)
    stepBattle(s, rng)
    return { s, calls }
  }

  test('0x42/0x66 共用 SimulateMagic：baseDamage 参与，敌等级防御项生效', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: 198,
            element: 'none',
            strength: { kind: 'fixed', value: 110 },
          },
        ],
      },
      {
        enemies: [wfIdleEnemy('target', { health: 1000, level: 1, defense: 46, dexterity: 0 })],
        rng: [0, 0, 0],
        targetEnemyIdx: 0,
      },
    )
    expect(1000 - s.enemies[0]!.hp).toBe(223)
  })

  test('sentinel magic 允许 minDamage=0，不伪造保底伤害', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: -999,
            element: 'none',
            strength: { kind: 'fixed', value: 0 },
          },
        ],
      },
      { rng: [0, 0, 0], targetEnemyIdx: 0 },
    )
    expect(s.enemies[0]!.hp).toBe(1000)
    expect(s.lastAction?.throwHits).toEqual([{ idx: 0, value: 0 }])
  })

  test('0x66 全体投掷：力量按 effect/action 只掷一次，伤害浮动逐敌独立', () => {
    const enemies = [
      wfIdleEnemy('a', { health: 5000, level: 1, defense: 46, dexterity: 0 }),
      wfIdleEnemy('b', { health: 5000, level: 1, defense: 46, dexterity: 0 }),
    ]
    const { s, calls } = runThrow(
      {
        target: 'allEnemies',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: 198,
            element: 'none',
            strength: {
              kind: 'casterAttack',
              bonus: 10,
              multiplier: { kind: 'uniformInt', min: 0, max: 3 },
            },
          },
        ],
      },
      {
        enemies,
        // 建队列 3 掷；力量取 inclusive 3；两敌伤害浮动分别取 1.0 / 约 1.1。
        rng: [0, 0, 0, 0.999999, 0, 0.999999],
      },
    )
    const strength = 10 + 40 * 3
    const base = {
      magStr: strength,
      def: 74,
      magicData: { baseDamage: 198, elemental: 0 },
      elemRes: enemies[0]!.stats.elemResistance,
      poisonRes: 0,
      resistMult: 1,
      fieldEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    }
    expect(5000 - s.enemies[0]!.hp).toBe(calcMagicDamage({ ...base, rngFactor: 1 }))
    expect(5000 - s.enemies[1]!.hp).toBeCloseTo(
      calcMagicDamage({ ...base, rngFactor: 1 + 0.999999 * 0.1 }),
      8,
    )
    expect(s.enemies[1]!.hp).toBeLessThan(s.enemies[0]!.hp)
    expect(calls).toBe(6)
    expect(s.inventory[0]!.count).toBe(0)
  })

  test('applyStatus stopTarget：一个目标抵抗不截断其他目标，且每目标只掷一次', () => {
    const { s, calls } = runThrow(
      {
        target: 'allEnemies',
        effects: [
          { kind: 'applyStatus', status: 'sleep', turns: 3, onResist: 'stopTarget' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      {
        enemies: [
          wfIdleEnemy('resist', { health: 100, dexterity: 0 }),
          wfIdleEnemy('hit', { health: 100, dexterity: 0 }),
        ],
        // 建队列 3 掷；0.4 被巫抗 5 挡，0.5 命中。
        rng: [0, 0, 0, 0.4, 0.5],
      },
    )
    expect(s.enemies[0]!.status.sleep).toBe(0)
    expect(s.enemies[0]!.hp).toBe(100)
    expect(s.enemies[1]!.status.sleep).toBe(3)
    expect(s.enemies[1]!.hp).toBe(75)
    expect(s.lastAction?.failureFeedback).toBe('throwStatusIneffective')
    expect(calls).toBe(5)
  })

  test('全体多效果按 effect→targets 绑定 RNG，并保持魔伤、下毒、即时致死的目标顺序', () => {
    const { s, calls } = runThrow(
      {
        target: 'allEnemies',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: 10,
            element: 'none',
            strength: { kind: 'fixed', value: 10 },
          },
          { kind: 'applyPoison', poisonId: '552' },
          { kind: 'killIfHpAtMost', percent: 100 },
        ],
      },
      {
        enemies: [
          wfIdleEnemy('a', { health: 1000, dexterity: 0 }),
          wfIdleEnemy('b', { health: 1000, dexterity: 0 }),
        ],
        poisonDefs: {
          552: { id: 552, name: '尸毒', curability: 'common', color: 0 },
        },
        // 建队列 3 掷；随后依次是两目标魔伤浮动、两目标下毒判定。
        // a 的 0.4 被巫抗 5 挡，b 的 0.5 命中，明确区分旧 target→effects 绑定。
        rng: [0, 0, 0, 0, 0.9, 0.4, 0.5],
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 5
          s.enemies[1]!.def.ai.resistanceToSorcery = 5
        },
      },
    )

    expect(s.enemies[0]!.poisons).toEqual([])
    expect(s.enemies[1]!.poisons).toEqual([{ poisonId: 552, tickIndex: 0 }])
    expect(s.enemies.slice(0, 2).map((enemy) => enemy!.hp)).toEqual([0, 0])
    const effectLogs = s.log.filter(
      (line) =>
        line.includes('受到') ||
        line.includes('抵抗了') ||
        line.includes('中 尸毒') ||
        line.includes('魂飞魄散'),
    )
    expect(
      effectLogs.map((line) => line.match(/(?:,|^)(a|b)(?: | 受到| 抵抗| 中| 魂)/)?.[1]),
    ).toEqual(['a', 'b', 'a', 'b', 'a', 'b'])
    expect(calls).toBe(7)
  })

  test('applyStatus continue：抵抗后仍执行本目标后续效果', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          { kind: 'applyStatus', status: 'sleep', turns: 3, onResist: 'continue' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      { rng: [0, 0, 0.4], targetEnemyIdx: 0 },
    )
    expect(s.enemies[0]!.status.sleep).toBe(0)
    expect(s.enemies[0]!.hp).toBe(975)
  })

  test('applyPoison 被巫抗挡住仍继续固定伤害', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          { kind: 'applyPoison', poisonId: '556' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      {
        rng: [0, 0, 0.99],
        targetEnemyIdx: 0,
        poisonDefs: {
          556: { id: 556, name: '鹤顶红', curability: 'severe', color: 0 },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 10
        },
      },
    )
    expect(s.enemies[0]!.poisons).toEqual([])
    expect(s.enemies[0]!.hp).toBe(975)
  })

  test('applyPoison 成功新增毒时立即执行 enemy tick0 并保存推进后的游标', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '552' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          552: {
            id: 552,
            name: '尸毒',
            curability: 'common',
            color: 0,
            enemyTicks: [{ hpDelta: -50 }, { hpDelta: -60 }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
        },
      },
    )
    expect(s.enemies[0]!.hp).toBe(950)
    expect(s.enemies[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 1 }])
  })

  test('applyPoison 重复同毒不重跑首 tick；首 tick 自解与产物复用同一执行器', () => {
    const repeated = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '561' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          561: {
            id: 561,
            name: '食妖虫附',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ hpDelta: -1 }, { hpDelta: -8, grantItem: '145', selfCure: true }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
          s.enemies[0]!.poisons = [{ poisonId: 561, tickIndex: 1 }]
        },
      },
    ).s
    expect(repeated.enemies[0]!.hp).toBe(1000)
    expect(repeated.enemies[0]!.poisons).toEqual([{ poisonId: 561, tickIndex: 1 }])
    expect(repeated.inventory.some((entry) => entry.itemId === '145')).toBe(false)

    const selfCured = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '561' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          561: {
            id: 561,
            name: '食妖虫附',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ hpDelta: -8, grantItem: '145', selfCure: true }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
        },
      },
    ).s
    expect(selfCured.enemies[0]!.hp).toBe(992)
    expect(selfCured.enemies[0]!.poisons).toEqual([])
    expect(selfCured.inventory.find((entry) => entry.itemId === '145')?.count).toBe(1)
  })

  test('killIfHpAtMost 按逐敌满血判断，等号命中且不把失败扩散到全体', () => {
    const { s } = runThrow(
      {
        target: 'allEnemies',
        effects: [{ kind: 'killIfHpAtMost', percent: 25 }],
      },
      {
        enemies: [
          wfIdleEnemy('equal', { health: 100, dexterity: 0 }),
          wfIdleEnemy('above', { health: 100, dexterity: 0 }),
        ],
        prepare: (s) => {
          s.enemies[0]!.hp = 25
          s.enemies[1]!.hp = 26
        },
      },
    )
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.enemies[1]!.hp).toBe(26)
    expect(s.inventory[0]!.count).toBe(0)
    expect(s.lastAction?.notice).toBeUndefined()
    expect(s.lastAction?.failureFeedback).toBeUndefined()
  })

  test('群体阈值投掷全部未达标时只提示一次，仍消耗一份', () => {
    const { s } = runThrow(
      {
        target: 'allEnemies',
        effects: [{ kind: 'killIfHpAtMost', percent: 5 }],
      },
      {
        enemies: [
          wfIdleEnemy('first', { health: 420, dexterity: 0 }),
          wfIdleEnemy('second', { health: 420, dexterity: 0 }),
        ],
        prepare: (state) => {
          state.enemies[0]!.hp = 22
        },
      },
    )
    expect(s.enemies[0]?.hp).toBe(22)
    expect(s.enemies[1]?.hp).toBe(420)
    expect(s.inventory[0]!.count).toBe(0)
    expect(s.lastAction?.failureFeedback).toBe('throwIneffective')
    expect(s.lastAction?.notice).toBeUndefined()
    expect(s.log.filter((line) => line === '无任何效果')).toHaveLength(1)
  })

  test('damageAndHealCaster 正常结算并钳治疗上限', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
      },
      {
        enemies: [wfIdleEnemy('target', { health: 500, dexterity: 0 })],
        player: { hp: 10, maxHp: 100 },
        targetEnemyIdx: 0,
      },
    )
    expect(s.enemies[0]!.hp).toBe(320)
    expect(s.players[0]!.hp).toBe(100)
  })

  test('damageAndHealCaster 过杀也按源 heal 回复，不按实际伤害折算', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
      },
      {
        enemies: [wfIdleEnemy('target', { health: 50, dexterity: 0 })],
        player: { hp: 10, maxHp: 100 },
        targetEnemyIdx: 0,
      },
    )
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.players[0]!.hp).toBe(100)
  })

  test('没有活目标或运行时毒 id 非法时，均在扣库存前失败', () => {
    const noTarget = runThrow(
      {
        target: 'allEnemies',
        effects: [{ kind: 'fixedDamage', amount: 1 }],
      },
      {
        prepare: (s) => {
          s.enemies[0]!.hp = 0
        },
      },
    ).s
    expect(noTarget.inventory[0]!.count).toBe(1)
    expect(noTarget.log.some((line) => line.includes('没有有效目标'))).toBe(true)

    const invalidPoison = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: 'not-a-number' }],
      },
      { targetEnemyIdx: 0 },
    ).s
    expect(invalidPoison.inventory[0]!.count).toBe(1)
    expect(invalidPoison.log.some((line) => line.includes('期望正整数 id'))).toBe(true)
  })
})

describe('投掷中的毒组合', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    heding: {
      id: 'heding',
      name: '鹤顶红',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '556' }] },
    },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: {
      id: 556,
      name: '鹤顶红',
      curability: 'severe',
      color: 0,
      enemyTicks: [{ hpDelta: -100 }],
      lethalWith: 557,
      counters: 558,
    },
    557: {
      id: 557,
      name: '孔雀胆',
      curability: 'severe',
      color: 0,
      enemyTicks: [{ hpDelta: -100 }],
      lethalWith: 556,
      counters: 560,
    },
  }
  test('敌已中孔雀胆(557),投鹤顶红(556)→ 双毒相冲暴毙', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    s.enemies[0]!.poisons = [{ poisonId: 557, tickIndex: 0 }] // 已中孔雀胆
    stepBattle(s, () => 0.5)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBe(0) // 暴毙
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(true)
  })
  test('敌未中配对毒 → 只下毒不暴毙(对照)', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    stepBattle(s, () => 0.5)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0) // 未暴毙
    expect(s.enemies[0]!.poisons.some((p) => p.poisonId === 556)).toBe(true) // 只下了毒
  })
  test('巫抗满仅阻止新毒；已有配对毒仍触发投掷致死组合', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    s.enemies[0]!.poisons = [{ poisonId: 557, tickIndex: 0 }] // 即便已中配对毒
    stepBattle(s, () => 0.99)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(true)
    expect(s.enemies[0]!.poisons.map((p) => p.poisonId)).toEqual([557]) // 鹤顶红未上(巫抗挡)
  })
  test('巫抗满且没有配对毒时：新毒被挡，也不会暴毙', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10
    stepBattle(s, () => 0.99)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0)
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(false)
    expect(s.enemies[0]!.poisons).toEqual([])
  })
})

describe('毒投掷秒杀门', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    '278': {
      id: '278',
      name: '毒龙胆',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'dieIfNotPoisoned' }, { kind: 'curePoison', curesTier: 'severe' }],
      },
    },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    555: {
      id: 555,
      name: '三尸蛊',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
    },
  }
  const useOnSelf = (poisons: { poisonId: number; tickIndex: number }[]) => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 100 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: '278', count: 1 }],
      poisonDefs: P,
    })
    s.players[0]!.poisons = poisons
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: '278' })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    return s
  }
  test('没中毒用毒龙胆 → 反噬暴毙', () => {
    const s = useOnSelf([])
    expect(s.players[0]!.hp).toBe(0)
    expect(s.log.some((l) => l.includes('反噬暴毙'))).toBe(true)
  })
  test('中三尸蛊(severe)用毒龙胆 → 解毒不死', () => {
    const s = useOnSelf([{ poisonId: 555, tickIndex: 0 }])
    expect(s.players[0]!.hp).toBeGreaterThan(0) // 未暴毙
    expect(s.players[0]!.poisons).toHaveLength(0) // 三尸蛊(severe)被解
  })
})
