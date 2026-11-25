import type { SkillData } from '@type-pal/content'
import { calcPhysicalAttackDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  wfEnemy,
  wfHealItem,
  wfIdleEnemy,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { type CreatePlayerInput, createBattleState, stepBattle } from './battle-core.js'

const rng0 = () => 0

describe('玩家施法与代价', () => {
  const bolt2: import('@type-pal/content').SkillData = {
    id: '300',
    name: '御剑术',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 30, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296',
    name: '气疗术',
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  }
  test('对敌施法:扣 MP + calcMagicDamage 用敌方真实元素抗;奶自己回血;MP 不足空过', () => {
    const s = createBattleState({
      players: [
        wfPlayer('li', { hp: 20, maxHp: 200, mp: 30, magicStrength: 50, skills: ['300', '296'] }),
      ],
      enemySlots: [wfEnemy('e', { health: 500, defense: 0, attackStrength: 1 })],
      skills: { '300': bolt2, '296': heal },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.mp).toBe(25) // 30-5
    expect(s.log.some((l) => l.includes('施展 御剑术'))).toBe(true)
    expect(s.enemies[0]!.hp).toBeLessThan(500)

    s.pendingActions.set(0, { kind: 'cast', skillId: '296' }) // 奶自己(oneAlly 无敌目标)
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 2) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.mp).toBe(19)
    expect(s.players[0]!.hp).toBeGreaterThan(20)

    // MP 耗尽 + 攻击系:降级普攻(fight.c:3316 降级链;曾空过)
    s.players[0]!.mp = 2
    const eHpBefore = s.enemies[0]!.hp
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 3) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('降级普攻'))).toBe(true)
    expect(s.players[0]!.mp).toBe(2) // 未扣
    expect(s.enemies[0]!.hp).toBeLessThan(eHpBefore) // 物攻真落敌
  })

  test('全体仙术先按 FIRE 帧抽取吹飞步长，保留伤害前的敌槽', () => {
    const spell: SkillData = {
      id: 'wind',
      name: '横风',
      desc: '',
      usableOutsideBattle: false,
      cost: { mp: 7 },
      target: 'allEnemies',
      effects: [{ kind: 'damage', power: 30, elemental: 1 }],
      animation: {
        effectSprite: 44,
        placement: 'attackField',
        fireDelay: 1,
        effectTimes: 1,
        shake: 1,
        blow: -2,
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { baseDexterity: 900, skills: [spell.id] })],
      enemySlots: [wfEnemy('a', { health: 1 }), null, wfEnemy('b', { health: 1 })],
      skills: { [spell.id]: spell },
      fireFrameCounts: { 44: 3 },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: spell.id })
    stepBattle(s, rng0)
    const samples = [0, 0.5, 0.9, 0.1, 0.6, 0.92, 0.08, 0.2, 0.75]
    let consumed = 0
    stepBattle(s, () => expectDefined(samples[consumed++]))
    expect(s.lastAction).toMatchObject({
      kind: 'cast',
      blow: { targetSlots: [0, 2], steps: [-2, -1, 0, -2, -1, 0] },
    })
    expect(s.phase).toBe('won')
    expect(consumed).toBe(samples.length)
    expect(s.players[0]?.hiddenCounts.maxMP).toBe(3)
  })

  test('SkillCost.items:先扣 MP 再原子扣物品，成功后结算 effects 与隐藏成长', () => {
    const guSkill: SkillData = {
      ...bolt2,
      id: '352',
      name: '三尸咒',
      cost: {
        mp: 5,
        // 重复行按同一来源聚合，不能逐条扣出半成功。
        items: [
          { itemId: '148', amount: 1 },
          { itemId: '148', amount: 2 },
        ],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { magicStrength: 50, skills: [guSkill.id] })],
      enemySlots: [wfIdleEnemy('e', { health: 500, defense: 0 })],
      skills: { [guSkill.id]: guSkill },
      inventory: [{ itemId: '148', count: 3 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'cast', skillId: guSkill.id, targetEnemyIdx: 0 })
    stepBattle(s, rng0) // build queue
    stepBattle(s, rng0) // 玩家先手

    expect(s.players[0]!.mp).toBe(25)
    expect(s.inventory).toEqual([{ itemId: '148', count: 0 }])
    expect(s.enemies[0]!.hp).toBeLessThan(500)
    expect(s.players[0]!.hiddenCounts.maxMP).toBe(2)
    expect(s.players[0]!.hiddenCounts.magicAttack).toBe(1)
    expect(s.lastAction?.fizzled).not.toBe(true)
  })

  test('SkillCost.items 不足:MP 仍扣，库存不部分消耗，跳过 effects 后累计成长', () => {
    const guSkill: SkillData = {
      ...bolt2,
      id: '372',
      name: '万蛊蚀天',
      cost: {
        mp: 5,
        items: [
          { itemId: '148', amount: 1 },
          { itemId: '148', amount: 2 },
        ],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { magicStrength: 50, skills: [guSkill.id] })],
      enemySlots: [wfIdleEnemy('e', { health: 500, defense: 0 })],
      skills: { [guSkill.id]: guSkill },
      inventory: [{ itemId: '148', count: 2 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'cast', skillId: guSkill.id, targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    stepBattle(s, rng0)

    expect(s.players[0]!.mp).toBe(25)
    expect(s.inventory).toEqual([{ itemId: '148', count: 2 }])
    expect(s.enemies[0]!.hp).toBe(500)
    expect(s.players[0]!.hiddenCounts.maxMP).toBe(2)
    expect(s.players[0]!.hiddenCounts.magicAttack).toBe(1)
    expect(s.lastAction).toMatchObject({
      kind: 'cast',
      skillId: guSkill.id,
      fizzled: true,
      failureFeedback: 'missingSpellItem',
    })
    expect(s.log.some((line) => line.includes('物品不足,万蛊蚀天 施放失败'))).toBe(true)
  })

  test('SkillCost.items 非法数量 fail-closed：仍遵守 MP 已扣、无物品/effect mutation', () => {
    const invalid: SkillData = {
      ...bolt2,
      id: 'invalid-item-cost',
      cost: { mp: 5, items: [{ itemId: '148', amount: 0 }] },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { skills: [invalid.id] })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      skills: { [invalid.id]: invalid },
      inventory: [{ itemId: '148', count: 9 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'cast', skillId: invalid.id, targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    stepBattle(s, rng0)

    expect(s.players[0]!.mp).toBe(25)
    expect(s.inventory).toEqual([{ itemId: '148', count: 9 }])
    expect(s.enemies[0]!.hp).toBe(500)
    expect(s.lastAction?.fizzled).toBe(true)
  })

  test('两名玩家同轮争最后一个蛊：先手成功，后手到执行时仍扣 MP 后熄火', () => {
    const guSkill: SkillData = {
      ...bolt2,
      id: '373',
      name: '毒吞天下',
      cost: { mp: 5, items: [{ itemId: '148', amount: 1 }] },
    }
    const s = createBattleState({
      players: [
        wfPlayer('first', { baseDexterity: 80, skills: [guSkill.id] }),
        wfPlayer('second', { baseDexterity: 70, skills: [guSkill.id] }),
      ],
      enemySlots: [wfIdleEnemy('e', { health: 9999 })],
      skills: { [guSkill.id]: guSkill },
      inventory: [{ itemId: '148', count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'cast', skillId: guSkill.id, targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'cast', skillId: guSkill.id, targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    stepBattle(s, rng0)
    stepBattle(s, rng0)

    expect(s.players.map((entry) => entry.mp)).toEqual([25, 25])
    expect(s.inventory).toEqual([{ itemId: '148', count: 0 }])
    expect(s.players.map((entry) => entry.hiddenCounts.magicAttack)).toEqual([1, 1])
    expect(s.lastAction).toMatchObject({
      side: 'player',
      idx: 1,
      kind: 'cast',
      fizzled: true,
    })
    expect(s.log.filter((line) => line.includes('物品不足')).length).toBe(1)
  })

  test('敌方施放带玩家物品门的技能不消费玩家背包', () => {
    const guSkill: SkillData = {
      ...bolt2,
      id: 'enemy-gu',
      cost: { mp: 5, items: [{ itemId: '148', amount: 1 }] },
    }
    const enemy = wfEnemy('gu-caster', { dexterity: 999, magicStrength: 50 })
    enemy.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'cast', skillId: guSkill.id } }],
    }
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [enemy],
      skills: { [guSkill.id]: guSkill },
      inventory: [{ itemId: '148', count: 1 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    stepBattle(s, rng0)
    stepBattle(s, rng0)

    expect(s.lastAction).toMatchObject({ side: 'enemy', kind: 'cast', skillId: guSkill.id })
    expect(s.inventory).toEqual([{ itemId: '148', count: 1 }])
  })
})

describe('出手时重新检查命令', () => {
  const bolt: import('@type-pal/content').SkillData = {
    id: '300',
    name: '御剑术',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 30, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296',
    name: '气疗术',
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  }

  test('封咒 + 攻击系 → 降普攻:MP 不扣,伤害走物攻全链(暴击/隐藏池)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 40, skills: ['300'] })],
      enemySlots: [wfIdleEnemy('slime', { health: 999, defense: 10 })],
      skills: { '300': bolt },
    })
    stepBattle(s, rng0)
    s.players[0]!.status.silence = 2 // 选招后被封咒(先手敌施封的 headless 等价)
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('被封咒,御剑术 降级普攻'))).toBe(true)
    expect(s.players[0]!.mp).toBe(30) // MP 未扣
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(999 - s.enemies[0]!.hp).toBe((base + 1) * 3) // rng0 → +1 → 暴击 ×3(真普攻分支)
    expect(s.players[0]!.hiddenCounts.attack).toBe(1) // 隐藏池走物攻记账,非施法记账
  })

  test('MP 不足 + 辅助系 → 降防御:出手时置位可见,没奶没扣,defense 池 +2', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 50, maxHp: 200, mp: 2, skills: ['296'] })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      skills: { '296': heal },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: '296' }) // mp 2 < 6
    stepBattle(s, rng0) // build queue → performAction(未消费)
    stepBattle(s, rng0) // 玩家先手(dex 50 > 敌 31):降级防御执行
    expect(s.log.some((l) => l.includes('MP 不足,气疗术 降级防御'))).toBe(true)
    expect(s.players[0]!.defending).toBe(true) // 出手时置位(fight.c:4115)
    expect(s.players[0]!.hp).toBe(50) // 没奶
    expect(s.players[0]!.mp).toBe(2) // 没扣
    expect(s.players[0]!.hiddenCounts.defense).toBe(2) // 走真防御分支(B7c 记账)
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.defending).toBe(false) // 回合末全清
  })

  test('死目标改选:出手前目标已死 → 环扫下一活敌(fight.c:3500 通用尾)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 40 })],
      enemySlots: [wfEnemy('a', { health: 30 }), wfIdleEnemy('b', { health: 999, defense: 10 })],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng0) // build queue
    s.enemies[0]!.hp = 0 // 出手前 a 已死(多队员抢死/毒杀场景的 headless 等价)
    stepBattle(s, rng0) // 玩家先手:环扫改选 → b
    expect(s.lastAction).toMatchObject({ kind: 'attack', targetEnemyIdx: 1 })
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(999 - s.enemies[1]!.hp).toBe((base + 1) * 3)
  })

  test('入队身法装配(fight.c:1497-1565):动作系数改写先后手;濒死÷2;×[0.9,1.1) 抖动', () => {
    const heal: import('@type-pal/content').SkillData = {
      id: '296',
      name: '气疗术',
      desc: '',
      cost: { mp: 6 },
      usableOutsideBattle: true,
      target: 'oneAlly',
      effects: [{ kind: 'healHp', amount: 75 }],
      animation: { effectSprite: 27 },
    }
    const build = (
      act: import('./battle-core.js').BattleAction,
      o: { hp?: number; enemyDex?: number } = {},
    ) => {
      const s = createBattleState({
        players: [wfPlayer('li', { hp: o.hp ?? 400, maxHp: 400 })],
        enemySlots: [wfIdleEnemy('e', { level: 1, dexterity: o.enemyDex ?? 10, health: 500 })],
        skills: { '296': heal },
      })
      stepBattle(s, rng0)
      s.pendingActions.set(0, act)
      stepBattle(s, rng0) // build queue
      return s
    }
    // 敌 base (1+6)*3+52=73(×0.9=65) > 玩家普攻 50×0.9=45 → 敌先
    expect(
      build({ kind: 'attack', targetEnemyIdx: 0 }, { enemyDex: 52 }).actionQueue[0]!.isEnemy,
    ).toBe(true)
    // 防御×5 → 225 → 玩家反超(×5 排序提前与"出手时才置位"成对 = 原版"防得住"的机制)
    expect(build({ kind: 'defend' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(false)
    // 辅助法术×3 → 135 → 玩家先;物品×3 同
    expect(build({ kind: 'cast', skillId: '296' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(
      false,
    )
    expect(build({ kind: 'item', itemId: 'x' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(
      false,
    )
    // 逃跑÷2 → 22 < 敌 dex10(31×0.9=27) → 敌反超
    expect(build({ kind: 'flee' }).actionQueue[0]!.isEnemy).toBe(true)
    // 濒死÷2(fight.c:1557 队列口,区别于非 classic 的 stat 级):hp 60<min(100,80) → 普攻 22 < 27
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }, { hp: 60 }).actionQueue[0]!.isEnemy).toBe(
      true,
    )
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }).actionQueue[0]!.isEnemy).toBe(false) // 满血对照 45>27
  })

  test('眠者不选招:强制普攻 dex 0 排尾;轮到仍睡跳过;同轮恢复真出手(fight.c:1504-1516)', () => {
    const mkS = () => {
      const s = createBattleState({
        players: [wfPlayer('li', { attackStrength: 40 })],
        enemySlots: [wfIdleEnemy('e', { health: 500, defense: 10 })],
      })
      stepBattle(s, rng0)
      s.players[0]!.status.sleep = 2
      stepBattle(s, rng0) // 无手选也 build(强制普攻入队)
      expect(s.phase).toBe('performAction')
      expect(s.pendingActions.get(0)).toEqual({ kind: 'attack', targetEnemyIdx: -1 })
      expect(s.actionQueue.find((q) => !q.isEnemy)?.dex).toBe(0) // 排尾
      stepBattle(s, rng0) // 敌先手(玩家 dex 0)
      return s
    }
    // 未恢复:轮到时仍睡 → 跳过
    const s1 = mkS()
    stepBattle(s1, rng0)
    expect(s1.log.some((l) => l.includes('无法行动'))).toBe(true)
    expect(s1.enemies[0]!.hp).toBe(500)
    // 同轮恢复(被唤醒/解定的等价):强制普攻真出手,目标 -1 环扫落敌
    const s2 = mkS()
    s2.players[0]!.status.sleep = 0
    stepBattle(s2, rng0)
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(500 - s2.enemies[0]!.hp).toBe((base + 1) * 3) // rng0 → 暴击 ×3
  })

  test('物品已耗尽 → 降防御(fight.c:3433 UseItem 数 0)', () => {
    const potion = wfHealItem('tonic', 50)
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 10, maxHp: 100 })],
      enemySlots: [wfIdleEnemy('e', { health: 500 })],
      items: { [potion.id]: potion },
      inventory: [{ itemId: potion.id, count: 1 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'item', itemId: potion.id })
    stepBattle(s, rng0) // build queue
    s.inventory[0]!.count = 0 // 出手前已被抢用(多队员场景等价)
    stepBattle(s, rng0)
    expect(s.log.some((l) => l.includes('已耗尽,降级防御'))).toBe(true)
    expect(s.players[0]!.defending).toBe(true)
    expect(s.players[0]!.hp).toBe(10) // 没吃到药
  })
})

describe('队伍合体技', () => {
  type SkillData = import('@type-pal/content').SkillData
  const coopSkill: SkillData = {
    id: 'c386',
    name: '合体气功',
    desc: '',
    cost: { mp: 9 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 90, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const coopPlayer = (id: string): CreatePlayerInput =>
    wfPlayer(id, { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c386' })
  // 跑完当前回合到下一次 selectAction(或终局)
  const runTurn = (s: ReturnType<typeof createBattleState>): void => {
    let guard = 0
    const startTurn = s.turn
    while (
      !(s.phase === 'selectAction' && s.turn > startTurn) &&
      s.phase !== 'won' &&
      s.phase !== 'lost'
    ) {
      stepBattle(s, rng0)
      if (++guard > 80) break
    }
  }

  test('合击:全 healthy 贡献 HP(各扣合体技 cost 作 HP)+ 结算走 calcMagicDamage 路径', () => {
    // 弱敌(合击一击必杀)→ 敌死无反击,贡献 HP 净扣可精确断言
    const s = createBattleState({
      players: [coopPlayer('li'), coopPlayer('zhao')],
      enemySlots: [wfEnemy('slime', { health: 40, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0) // preBattle → selectAction(turn 1)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
    runTurn(s)
    expect(s.phase).toBe('won') // 合击(magStr=Σ(atk+mag)/4=30)一击秒杀弱敌
    expect(s.players[0]!.hp).toBe(100 - 9) // 两贡献者各扣 9 HP 代价(cost.mp 作 HP)
    expect(s.players[1]!.hp).toBe(100 - 9)
    expect(s.log.some((l) => l.includes('合体技 合体气功 对 slime'))).toBe(true)
  })

  test('合击消耗:队友本回合出手作废(coopThisTurn),敌只挨合击一击', () => {
    const s = createBattleState({
      players: [coopPlayer('li'), coopPlayer('zhao')],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 }) // 队友普攻:应被合击消耗
    // coopThisTurn 在选招→出手时置位、回合末自清;其效果 = 队友被消耗(下方日志断言),故不在 runTurn 后查该标志
    runTurn(s)
    // 合击伤害 1 次;队友普攻被消耗 → 无玩家物攻打到 slime(敌反击是「slime 攻击 li」,非「攻击 slime」)
    expect(s.log.filter((l) => l.includes('合体技 合体气功')).length).toBe(1)
    expect(s.log.some((l) => l.includes('攻击 slime'))).toBe(false)
  })

  test.each([
    { target: 'oneAlly', chosen: 1, expectedHp: [1, 47, 1] },
    { target: 'self', chosen: 0, expectedHp: [38, 10, 1] },
    { target: 'allAllies', chosen: undefined, expectedHp: [38, 47, 38] },
  ] as const)('治疗合击按 $target 施放，在扣贡献者 HP 后执行术效', ({
    target,
    chosen,
    expectedHp,
  }) => {
    const skill: SkillData = {
      ...coopSkill,
      name: '协力调息',
      cost: { mp: 120 },
      target,
      effects: [{ kind: 'healHp', amount: 9 }],
      execution: { player: { effects: [{ kind: 'healHp', amount: 37 }] } },
    }
    const s = createBattleState({
      players: [
        { ...coopPlayer('li'), hp: 90, maxHp: 150, mp: 4 },
        { ...coopPlayer('zhao'), hp: 130, maxHp: 240, mp: 3 },
        { ...coopPlayer('lin'), hp: 1, maxHp: 250, mp: 5 },
      ],
      enemySlots: [wfEnemy('slime')],
      skills: { c386: skill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, {
      kind: 'coop',
      ...(target === 'oneAlly' ? { targetAllyIdx: chosen } : {}),
    })
    s.pendingActions.set(1, { kind: 'defend' })
    s.pendingActions.set(2, { kind: 'defend' })
    stepBattle(s, rng0)
    stepBattle(s, rng0)

    expect(s.players.map(({ hp }) => hp)).toEqual(expectedHp)
    expect(s.players.map(({ mp, hiddenCounts }) => ({ mp, hiddenCounts }))).toEqual([
      { mp: 4, hiddenCounts: {} },
      { mp: 3, hiddenCounts: {} },
      { mp: 5, hiddenCounts: {} },
    ])
    expect(s.enemies[0]?.hp).toBe(30)
    expect(s.lastAction).toMatchObject({
      kind: 'coop',
      skillId: skill.id,
      coopContributors: [0, 1],
      ...(chosen !== undefined ? { targetAllyIdx: chosen } : {}),
    })
    expect(s.lastAction).not.toHaveProperty('targetEnemyIdx')
  })

  test('全体合击技(allEnemies)打全场', () => {
    const tnsh: SkillData = {
      ...coopSkill,
      id: 'c355',
      name: '天女散花',
      target: 'allEnemies',
      effects: [{ kind: 'damage', power: 109, elemental: 0 }],
    }
    const s = createBattleState({
      players: [
        wfPlayer('li', { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c355' }),
        wfPlayer('zhao', {
          attackStrength: 40,
          magicStrength: 20,
          cooperativeMagicSkillId: 'c355',
        }),
      ],
      enemySlots: [
        wfEnemy('a', { health: 9999, defense: 0, attackStrength: 0 }),
        wfEnemy('b', { health: 9999, defense: 0, attackStrength: 0 }),
      ],
      skills: { c355: tnsh },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop' }) // 无目标 = 全体技自动全场
    s.pendingActions.set(1, { kind: 'defend' })
    const a0 = s.enemies[0]!.hp,
      b0 = s.enemies[1]!.hp
    runTurn(s)
    expect(s.enemies[0]!.hp).toBeLessThan(a0)
    expect(s.enemies[1]!.hp).toBeLessThan(b0) // 全体都掉血
  })

  test('healthy≤1 → 退化普攻(不扣合击 HP 代价)', () => {
    const s = createBattleState({
      players: [coopPlayer('li')],
      enemySlots: [wfEnemy('slime', { health: 40, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    runTurn(s)
    expect(s.phase).toBe('won') // 退化普攻(会心)秒杀弱敌
    expect(s.players[0]!.hp).toBe(100) // 无合击 HP 代价(退化路径不扣)
    expect(s.log.some((l) => l.includes('人手不足'))).toBe(true)
  })

  test('先轮到已提交防御的逍遥时先防御，再由低身法队友发起合击', () => {
    const s = createBattleState({
      players: [
        wfPlayer('li', { baseDexterity: 66, attackStrength: 40, magicStrength: 20 }),
        wfPlayer('lin', {
          baseDexterity: 21,
          attackStrength: 40,
          magicStrength: 20,
          cooperativeMagicSkillId: 'c386',
        }),
      ],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    s.pendingActions.set(1, { kind: 'coop', targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    stepBattle(s, rng0)
    expect(s.lastAction).toMatchObject({ side: 'player', idx: 0, kind: 'defend' })
    expect(s.players[0]?.defending).toBe(true)
    stepBattle(s, rng0)
    expect(s.lastAction).toMatchObject({ side: 'player', idx: 1, kind: 'coop' })
  })
})
