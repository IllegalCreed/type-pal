import type { ActorDef, CasualtyScript, EnemyDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type CreatePlayerInput, createBattleState, stepBattle } from './battle-core.js'

const rng0 = () => 0
const rngGate1 = () => 0.75 // roll 76 ≥ 75 → 门1
const rngGate2 = () => 0.68 // roll 69 ≥ 66 → 门2

function enemy(id: string, over: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: id,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 999,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: 10,
      magicStrength: 50,
      defense: 0,
      dexterity: 0,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...over,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

function player(over: Partial<CreatePlayerInput> = {}): CreatePlayerInput {
  return {
    roleId: 'hero',
    actorTemplateId: 'hero',
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attackStrength: 30,
    defense: 0,
    magicStrength: 30,
    baseDexterity: 50,
    skills: [],
    fleeRate: 20,
    ...over,
  }
}

function skill(id: string, effects: SkillData['effects']): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects,
    animation: { effectSprite: 0 },
  }
}

function actor(id: string, casualty?: NonNullable<ActorDef['battler']>['casualty']): ActorDef {
  return {
    id,
    name: id,
    spriteId: id,
    ...(casualty
      ? {
          battler: {
            baseStats: {
              level: 1,
              hp: 100,
              maxHP: 100,
              mp: 50,
              maxMP: 50,
              attack: 30,
              defense: 0,
              magicAttack: 30,
              speed: 50,
              luck: 20,
            },
            initialEquipment: {},
            initialMagic: [],
            battleSprite: `battle-sprite.${id}`,
            casualty,
          },
        }
      : {}),
  }
}

const FRIEND_DEATH: CasualtyScript = {
  gates: [
    {
      chance: 75,
      branch: {
        lines: [{ text: 'dlg.g1', style: 'bottom' }],
        effects: [
          { kind: 'heal', resource: 'mp' },
          { kind: 'tempStatBuff', stat: 'magic', percent: 10 },
        ],
      },
    },
    {
      chance: 66,
      branch: {
        lines: [{ text: 'dlg.g2', style: 'bottom' }],
        effects: [
          { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
          { kind: 'tempStatBuff', stat: 'magic', percent: 25 },
        ],
      },
    },
    {
      chance: 50,
      branch: {
        lines: [{ text: 'dlg.g3', style: 'bottom' }],
        effects: [
          { kind: 'tempStatBuff', stat: 'speed', percent: 90 },
          { kind: 'tempStatBuff', stat: 'luck', percent: 90 },
        ],
      },
    },
  ],
  fallback: {
    lines: [{ text: 'dlg.fallback', style: 'bottom' }],
    effects: [
      { kind: 'heal', resource: 'hp' },
      { kind: 'tempStatBuff', stat: 'attack', percent: 5 },
    ],
  },
}

const DYING: CasualtyScript = {
  gates: [
    {
      chance: 75,
      branch: { lines: [{ text: 'dlg.d1', style: 'top' }], effects: [] },
    },
    {
      chance: 66,
      branch: { lines: [{ text: 'dlg.d2', style: 'top' }], effects: [] },
    },
    {
      chance: 50,
      branch: { lines: [{ text: 'dlg.d3', style: 'top' }], effects: [] },
    },
  ],
  fallback: { lines: [{ text: 'dlg.dying', style: 'top' }], effects: [] },
}

function runBattle(
  players: CreatePlayerInput[],
  options: { rng?: () => number; auto?: boolean; delta?: number; actorsById?: Record<string, ActorDef> } = {},
): ReturnType<typeof createBattleState> {
  const rng = options.rng ?? rng0
  const attacker = enemy('caster', { dexterity: 999 })
  attacker.ai = {
    resistanceToSorcery: 0,
    // lowestHp 定标:不消费 RNG,保证命中测试想杀/想打濒死的队员。
    rules: [{ at: 'act', do: { kind: 'cast', skillId: 'hit', target: 'lowestHp' } }],
  }
  const state = createBattleState({
    players,
    enemies: [attacker],
    skills: {
      hit: skill('hit', [
        { kind: 'resourceDelta', resource: 'hp', delta: options.delta ?? -150 },
      ]),
    },
    actorsById: options.actorsById ?? {
      yue: actor('yue', { friendDeath: FRIEND_DEATH }),
      zhao: actor('zhao', { dying: DYING }),
      li: actor('li'),
      hero: actor('hero'),
    },
    auto: options.auto ?? false,
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  if (players.length > 1) state.pendingActions.set(1, { kind: 'defend' })
  let guard = 0
  do {
    stepBattle(state, rng)
  } while (state.phase === 'performAction' && ++guard < 60)
  return state
}

describe('B11-1 战斗伤亡 sweep', () => {
  test('队友阵亡:健康援护者跑 friendDeath 兜底(HP 满 + attack+5%)', () => {
    const state = runBattle([
      player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
      player({
        roleId: 'yue',
        actorTemplateId: 'yue',
        hp: 20,
        maxHp: 100,
        attackStrength: 100,
      }),
    ])
    const yue = state.players[1]!
    expect(state.players[0]!.hp).toBe(0)
    expect(yue.hp).toBe(100)
    expect(yue.attackStrength).toBe(105)
    expect(state.casualtyDialogue).toEqual({
      speakerRoleId: 'yue',
      lines: [{ text: 'dlg.fallback', style: 'bottom' }],
    })
    expect(yue.prevHp).toBe(100)
  })

  test('概率门按序掷:r≥75 命中门1(MP 满 + magic+10%)', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          mp: 10,
          maxMp: 100,
          magicStrength: 100,
        }),
      ],
      { rng: rngGate1 },
    )
    const yue = state.players[1]!
    expect(yue.mp).toBe(100)
    expect(yue.magicStrength).toBe(110)
    expect(state.casualtyDialogue?.lines[0]?.text).toBe('dlg.g1')
  })

  test('门2:r≥66 命中(attack+25% + magic+25%)', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          attackStrength: 100,
          magicStrength: 100,
        }),
      ],
      { rng: rngGate2 },
    )
    const yue = state.players[1]!
    expect(yue.attackStrength).toBe(125)
    expect(yue.magicStrength).toBe(125)
  })

  test('自己濒死:守护者在队且健康时跑 dying(纯对白)', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
        }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    const zhao = state.players[0]!
    expect(zhao.hp).toBe(95)
    expect(state.casualtyDialogue?.speakerRoleId).toBe('zhao')
    expect(state.casualtyDialogue?.lines).toEqual([{ text: 'dlg.dying', style: 'top' }])
    expect(zhao.maxHp).toBe(500)
    expect(zhao.prevHp).toBe(95)
  })

  test('P1:dying 目标被麻痹仍触发(只排 sleep/confused)', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
          grantedStatuses: ['paralyzed'],
        }),
        player({ roleId: 'li', actorTemplateId: 'li', hp: 200, maxHp: 200 }),
      ],
      { delta: -10 },
    )
    expect(state.casualtyDialogue?.speakerRoleId).toBe('zhao')
  })

  test('守护者失能被睡:濒死不触发', () => {
    const state = runBattle(
      [
        player({
          roleId: 'zhao',
          actorTemplateId: 'zhao',
          hp: 105,
          maxHp: 500,
          coveredBy: 'li',
        }),
        player({
          roleId: 'li',
          actorTemplateId: 'li',
          hp: 200,
          maxHp: 200,
          grantedStatuses: ['sleep'],
        }),
      ],
      { delta: -10 },
    )
    expect(state.casualtyDialogue).toBeUndefined()
  })

  test('自动战斗不触发伤亡脚本', () => {
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 20,
          maxHp: 100,
          attackStrength: 100,
        }),
      ],
      { auto: true },
    )
    expect(state.players[0]!.hp).toBe(0)
    expect(state.players[1]!.hp).toBe(20)
    expect(state.casualtyDialogue).toBeUndefined()
  })

  test('P3:同一 stat 连续 buff 以未 buff 基数为准(100 → 150,不叠加)', () => {
    const doubleAttack: CasualtyScript = {
      gates: [
        {
          chance: 75,
          branch: {
            lines: [{ text: 'dlg.x', style: 'bottom' }],
            effects: [
              { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
              { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
            ],
          },
        },
      ],
      fallback: { lines: [], effects: [] },
    }
    const state = runBattle(
      [
        player({ roleId: 'hero', actorTemplateId: 'li', hp: 10, maxHp: 100, coveredBy: 'yue' }),
        player({
          roleId: 'yue',
          actorTemplateId: 'yue',
          hp: 50,
          maxHp: 100,
          attackStrength: 100,
        }),
      ],
      {
        rng: rngGate1,
        actorsById: {
          yue: actor('yue', { friendDeath: doubleAttack }),
          li: actor('li'),
          hero: actor('hero'),
          zhao: actor('zhao'),
        },
      },
    )
    expect(state.players[1]!.attackStrength).toBe(150)
  })
})

describe('敌方巫术下毒(结构化毒模型)', () => {
  const poison = (id: number, over: Partial<import('@type-pal/content').PoisonDef> = {}) => ({
    id,
    name: `毒${id}`,
    curability: 'severe' as const,
    color: 0,
    playerTicks: [{ hpDelta: -1 }],
    enemyTicks: [{ hpDelta: -1 }],
    ...over,
  })

  function enemyCastPoison(
    playerOver: Partial<CreatePlayerInput> & { poisons?: { poisonId: number; tickIndex: number }[] },
    poisonId = '555',
  ) {
    const attacker = enemy('caster', { dexterity: 999 })
    attacker.ai = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'cast', skillId: 'gu', target: 'lowestHp' } }],
    }
    const state = createBattleState({
      players: [player({ hp: 100, maxHp: 100, ...playerOver })],
      enemies: [attacker],
      skills: {
        gu: {
          id: 'gu',
          name: '蛊术',
          desc: '',
          cost: {},
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [{ kind: 'applyPoison', poisonId }],
          animation: { effectSprite: 0 },
          execution: {
            enemy: { effects: [{ kind: 'applyPoison', poisonId }] },
          },
        },
      },
      poisonDefs: {
        555: poison(555, { counters: 557, lethalWith: 558 }),
        557: poison(557),
        558: poison(558),
      },
    })
    stepBattle(state, rng0)
    state.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    do {
      stepBattle(state, rng0)
    } while (state.phase === 'performAction' && ++guard < 60)
    return state
  }

  test('巫术下毒是普通 0x29:不触发 lethalWith 双毒暴毙', () => {
    const state = enemyCastPoison({ poisons: [{ poisonId: 558, tickIndex: 0 }] })
    // 无双毒暴毙(回合末 558 毒 tick 扣了 2 点,但远没到 0);新毒 555 叠上。
    expect(state.players[0]!.hp).toBeGreaterThan(0)
    expect(state.players[0]!.poisons.map((p) => p.poisonId)).toContain(555)
  })

  test('巫术下毒不触发 counters 相克解,直接叠新毒', () => {
    const state = enemyCastPoison({ poisons: [{ poisonId: 557, tickIndex: 0 }] })
    expect(state.players[0]!.poisons.map((p) => p.poisonId).sort()).toEqual([555, 557])
  })

  test('毒抗门:毒抗 ≥ R(1,100) 抵抗,不加毒', () => {
    const state = enemyCastPoison({ poisonRes: 100 })
    expect(state.players[0]!.poisons).toEqual([])
  })
})
