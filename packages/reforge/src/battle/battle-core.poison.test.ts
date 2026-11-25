import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import {
  applyEnemyEquivItem,
  applyPoisonToEnemy,
  applyPoisonToPlayer,
  createBattleState,
  curePoisons,
  stepBattle,
} from './battle-core.js'

const rng0 = () => 0

describe('毒发与回合衰减', () => {
  const POISONS: Record<number, import('@type-pal/content').PoisonDef> = {
    551: {
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: 16,
      playerTicks: [{ hpDelta: -7 }],
      enemyTicks: [{ hpDelta: -7 }],
    },
    555: {
      id: 555,
      name: '三尸蛊毒',
      curability: 'severe',
      color: 128,
      playerTicks: [
        { hpDelta: 0 },
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -200, selfCure: true },
      ],
      enemyTicks: [{ hpDelta: -111 }, { hpDelta: -222 }, { hpDelta: -333, selfCure: true }],
    },
    137: {
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: 0,
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    },
    561: {
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: 0,
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
    },
  }
  // 单回合推进器(填动作 → 消费到回合末毒 tick)
  const oneTurn = (s: ReturnType<typeof createBattleState>, act: () => void): void => {
    if (s.phase === 'preBattle') stepBattle(s, rng0)
    act()
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
  }

  // 敌人睡死隔离毒 DoT(否则敌每回合物攻干扰血量;sleep 大回合数撑过测试)
  const sleepEnemy = (s: ReturnType<typeof createBattleState>): void => {
    s.enemies[0]!.status.sleep = 99
  }

  test('赤毒:玩家每回合 −7 循环(指针停末项)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 100, attackStrength: 0 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.players[0]!.poisons = [{ poisonId: 551, tickIndex: 0 }]
    oneTurn(s, () => {
      sleepEnemy(s)
      s.pendingActions.set(0, { kind: 'defend' })
    })
    expect(s.players[0]!.hp).toBe(93)
    oneTurn(s, () => {
      sleepEnemy(s)
      s.pendingActions.set(0, { kind: 'defend' })
    })
    expect(s.players[0]!.hp).toBe(86) // 循环 −7
  })

  test('三尸蛊:递增序列 0→−1→−2→−3→−200 末回合自解', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 300, attackStrength: 0 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.players[0]!.poisons = [{ poisonId: 555, tickIndex: 0 }]
    const hp = () => s.players[0]!.hp
    const turn = () =>
      oneTurn(s, () => {
        sleepEnemy(s)
        s.pendingActions.set(0, { kind: 'defend' })
      })
    turn()
    expect(hp()).toBe(300) // tick0: 0
    turn()
    expect(hp()).toBe(299) // tick1: −1
    turn()
    expect(hp()).toBe(297) // tick2: −2
    turn()
    expect(hp()).toBe(294) // tick3: −3
    turn()
    expect(hp()).toBe(94) // tick4: −200 + selfCure
    expect(s.players[0]!.poisons).toHaveLength(0) // 自解移除
  })

  test('上毒命中门 = 巫抗(不是毒抗):巫抗满 boss 不中毒', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfEnemy('boss', { health: 999 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    const hit = applyPoisonToEnemy(s.enemies[0]!, 555, () => 0.99) // floor(0.99*10)=9 < 10 → 挡
    expect(hit).toBe(false)
    expect(s.enemies[0]!.poisons).toHaveLength(0)
    // 零巫抗必中
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    expect(applyPoisonToEnemy(s.enemies[0]!, 555, () => 0.5)).toBe(true)
    expect(s.enemies[0]!.poisons[0]!.poisonId).toBe(555)
  })

  test('按可解度解毒:common 解常规留六大毒;severe 解六大毒;incurable(无影/寄生)谁都不解', () => {
    const host = {
      hp: 100,
      poisons: [
        { poisonId: 551, tickIndex: 0 },
        { poisonId: 555, tickIndex: 0 },
        { poisonId: 137, tickIndex: 0 },
      ],
    }
    curePoisons(host, POISONS, 'common') // 灵血咒/九节菖蒲
    expect(host.poisons.map((p) => p.poisonId)).toEqual([555, 137]) // 赤毒(common)解,三尸蛊(severe)/无影(incurable)留
    curePoisons(host, POISONS, 'severe') // 复活类
    expect(host.poisons.map((p) => p.poisonId)).toEqual([137]) // 三尸蛊(severe)解,无影毒(incurable)留
  })

  test('养蛊:寄生毒递进伤害(−1/−2/−8)+ 到期产道具入背包(食妖虫附→灵蛊145)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 0 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.poisons = [{ poisonId: 561, tickIndex: 0 }]
    const hp0 = s.enemies[0]!.hp
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(1) // tick0: −1(递进首)
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(3) // tick1: −2(累计 −3)
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(11) // tick2: −8 + 到期
    expect(s.enemies[0]!.poisons).toHaveLength(0) // selfCure
    expect(s.inventory.find((x) => x.itemId === '145')?.count).toBe(1) // 灵蛊入背包
  })

  test('无影毒对敌:一次性半血上限1000 + 自解', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 0 })],
      enemySlots: [wfEnemy('slime', { health: 500, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.poisons = [{ poisonId: 137, tickIndex: 0 }]
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(s.enemies[0]!.hp).toBe(249) // 500 − min(1000, 250+1) = 500−251
    expect(s.enemies[0]!.poisons).toHaveLength(0) // selfCure
  })
})

describe('敌方普攻附毒', () => {
  const poisonItem: ItemData = {
    id: '116',
    name: '尸腐肉',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
    },
  }
  const defs = { 552: { id: 552, name: '尸毒', curability: 'common' as const, color: 0 } }
  const mkState = (poisonRes: number) =>
    createBattleState({
      players: [wfPlayer('li', { poisonRes })],
      enemySlots: [{ ...wfEnemy('snake'), attackEquivItem: { itemId: '116', rate: 2 } }],
      items: { '116': poisonItem },
      poisonDefs: defs,
    })
  test('毒抗 0:rate 门过(rate 2 ≥ R(1,10)=1)+ 毒抗门过(0 < R(1,100)=1)→ 玩家中尸毒', () => {
    const s = mkState(0)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0) // rng0:两门都过
    expect(s.players[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 0 }])
  })
  test('毒抗 50:毒抗门挡(50 ≥ R(1,100)=1)→ 不中毒(大蒜临时毒抗即缩此门)', () => {
    const s = mkState(50)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0)
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
  test('rate 门不过(rate 2 < R(1,10)=10)→ 不触发(即便毒抗 0)', () => {
    const s = mkState(0)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0.99) // rng≈1:R(1,10)=10 > rate2
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
  test('无 attackEquivItem 的敌 → 不附毒(安全)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { poisonRes: 0 })],
      enemySlots: [wfEnemy('slime')],
      items: { '116': poisonItem },
      poisonDefs: defs,
    })
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0)
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
})

describe('以毒攻毒的使用效果', () => {
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: {
      id: 556,
      name: '鹤顶红',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 558,
      lethalWith: 557,
    },
    558: {
      id: 558,
      name: '血海棠',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 559,
      lethalWith: 555,
    },
    557: {
      id: 557,
      name: '孔雀胆',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 560,
      lethalWith: 556,
    },
  }
  const playerWithPoisons = (poisonIds: readonly number[]) => {
    const state = createBattleState({
      players: [
        wfPlayer('hero', { poisons: poisonIds.map((poisonId) => ({ poisonId, tickIndex: 0 })) }),
      ],
      enemySlots: [wfEnemy('target')],
      poisonDefs: P,
    })
    return expectDefined(state.players[0])
  }

  test('身中血海棠(558),用鹤顶红(556)→ 以毒攻毒解掉558,不下556', () => {
    const affected = playerWithPoisons([558])
    expect(applyPoisonToPlayer(affected, 556, P)).toBe('cured')
    expect(affected.poisons).toEqual([])
  })
  test('身中孔雀胆(557),用鹤顶红(556)→ 致死配对暴毙', () => {
    const affected = playerWithPoisons([557])
    expect(applyPoisonToPlayer(affected, 556, P)).toBe('lethal')
    expect(affected.hp).toBe(0)
  })
  test('身上无相关毒 → 下本毒(自毒)', () => {
    const affected = playerWithPoisons([])
    expect(applyPoisonToPlayer(affected, 556, P)).toBe('applied')
    expect(affected.poisons).toEqual([{ poisonId: 556, tickIndex: 0 }])
  })
})
