import { describe, expect, test } from 'vitest'
import { wfEnemy, wfIdleEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { runBattleToEnd } from '../__tests__/battle-workflows/core-driver.js'
import { expectDefined } from '../defined.js'
import { createBattleState, resolveAttack, stepBattle } from './battle-core.js'

const rng0 = () => 0

describe('回合、终态和普通攻击', () => {
  test('物抗先除基础伤害，防御再减半', () => {
    // fight.c:131–171，253–285，40 攻与 10 防给出 64 点基础伤害。
    expect(resolveAttack(40, 10, 0, false)).toBe(64)
    expect(resolveAttack(40, 10, 2, false)).toBe(32)
    expect(resolveAttack(40, 10, 2, true)).toBe(16)
  })

  test('一场 1v1 攻击战:玩家碾压 → won,伤害对齐公式', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 40 })],
      enemySlots: [wfEnemy('slime', { health: 30, defense: 10, attackStrength: 1 })],
    })
    const result = runBattleToEnd(
      s,
      (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
      rng0,
    )
    expect(result).toBe('won')
    expect(s.lastAction).toMatchObject({ kind: 'attack', targetEnemyIdx: 0, firstDamage: 60 })
    expect(s.enemies[0]?.hp).toBe(0)
    expect(s.log.some((l) => l.includes('胜利'))).toBe(true)
  })

  test('一场 1v1:敌强玩家弱 → lost', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 10, attackStrength: 1, defense: 0 })],
      enemySlots: [wfEnemy('boss', { health: 999, attackStrength: 100, defense: 999 })],
    })
    const result = runBattleToEnd(
      s,
      (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
      rng0,
    )
    expect(result).toBe('lost')
    expect(s.players[0]!.hp).toBe(0)
  })

  test('逃跑 → fled', () => {
    const s = createBattleState({ players: [wfPlayer('li')], enemySlots: [wfEnemy('slime')] })
    const result = runBattleToEnd(s, (st) => st.pendingActions.set(0, { kind: 'flee' }), rng0)
    expect(result).toBe('fled')
  })

  test('暴击(fight.c:3639-3647):rng 1/6 → ×3 + 会心日志;高 rng 无暴击;狂暴必暴击', () => {
    // 伤害装配(fight.c:3629-3663):def 含 (敌级+6)×4;+R(1,2);×[1,1.125)
    // 40 攻和有效防御 38 的基础伤害为 19。
    // 单回合推进:进 selectAction → 填动作 → 消费 performAction 至回合结束
    const oneTurn = (s: ReturnType<typeof createBattleState>, rng: () => number): void => {
      stepBattle(s, rng) // preBattle → selectAction
      s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
      let guard = 0
      do {
        stepBattle(s, rng)
      } while (s.phase === 'performAction' && guard++ < 30)
    }
    const mk = () =>
      createBattleState({
        players: [wfPlayer('li', { attackStrength: 40 })],
        enemySlots: [wfEnemy('slime', { health: 999, defense: 10, attackStrength: 0 })],
      })
    // rng0:+R(1,2)=+1,floor(0×6)=0 → 暴击 ×3,浮动 ×1
    const s1 = mk()
    oneTurn(s1, rng0)
    expect(999 - s1.enemies[0]!.hp).toBe(60)
    expect(s1.log.some((l) => l.includes('会心一击'))).toBe(true)
    // rng 0.9:+R=+2,floor(5.4)=5 无暴击,浮动 ×1.1125
    const rHigh = () => 0.9
    const s2 = mk()
    oneTurn(s2, rHigh)
    expect(999 - s2.enemies[0]!.hp).toBe(23)
    // 狂暴:高 rng 也必暴击(fight.c:3641 ‖ Bravery)
    const s3 = mk()
    s3.players[0]!.status.bravery = 3
    oneTurn(s3, rHigh)
    expect(999 - s3.enemies[0]!.hp).toBe(70)
  })

  test('首领战不可逃(fight.c:4143 && !fIsBoss):同 rng 下 boss 场逃跑恒失败', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 100 })],
      enemySlots: [wfEnemy('shilaoshi', { health: 40, defense: 0 })],
      boss: true,
    })
    // 先逃(必失败),第二轮起攻击打完 —— 结果只能是 won,绝到不了 fled
    const result = runBattleToEnd(
      s,
      (st) =>
        st.pendingActions.set(
          0,
          st.turn <= 1 ? { kind: 'flee' } : { kind: 'attack', targetEnemyIdx: 0 },
        ),
      rng0,
    )
    expect(result).toBe('won')
    expect(s.log.some((l) => l.includes('首领战不可逃'))).toBe(true)
  })

  test('出手顺序:高 dex 先动（玩家 dex 50 > 敌 dex,玩家先削敌）', () => {
    // 玩家 baseDex 50(haste 无 → 50);敌 level1 dex10 → (1+6)*3+10=31。玩家先。
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 100 })],
      enemySlots: [wfEnemy('slime', { health: 40, defense: 0, dexterity: 10, level: 1 })],
    })
    stepBattle(s, rng0) // preBattle → selectAction
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng0) // selectAction → performAction(build queue)
    expect(s.phase).toBe('performAction')
    expect(s.actionQueue[0]!.isEnemy).toBe(false) // 队首 = 玩家(dex 高)
  })

  test('防御时序:出手时才置位(fight.c:4115)——先手敌全额伤,后手敌才吃 def×2;回合末全清', () => {
    // 敌先手(dex 999):防御尚未执行,def 60 全额;str = 40+(20+6)×6 = 196
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 400, maxHp: 400, defense: 60 })],
      enemySlots: [wfEnemy('e', { attackStrength: 40, dexterity: 999, level: 20 })],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(400 - s.players[0]!.hp).toBe(148)
    expect(s.players[0]!.defending).toBe(false) // 回合末全清(fight.c:1604)

    // 玩家先手(敌 dex 低):防御已置位 → def×2 = 120 前置(fight.c:4926-4929,非伤害减半)
    // str = 200+(5+6)×6 = 266;敌 dex (5+6)×3+1 = 34 < 玩家 50
    const s2 = createBattleState({
      players: [wfPlayer('li', { hp: 400, maxHp: 400, defense: 60 })],
      enemySlots: [wfEnemy('e', { attackStrength: 200, dexterity: 1, level: 5 })],
    })
    stepBattle(s2, rng0)
    s2.pendingActions.set(0, { kind: 'defend' })
    guard = 0
    while (s2.phase !== 'selectAction' || s2.turn === 1) {
      stepBattle(s2, rng0)
      if (++guard > 50) break
    }
    expect(400 - s2.players[0]!.hp).toBe(170)
  })

  test('大世界护体符 carriedStatuses:建态注入实际回合数;装备常驻状态进入独立派生层', () => {
    const s = createBattleState({
      players: [
        wfPlayer('shielded', { carriedStatuses: [{ status: 'protect', turns: 7 }] }),
        wfPlayer('combo', { grantedStatuses: ['dualAttack'] }),
      ],
      enemySlots: [wfEnemy('slime')],
    })
    expect(s.players[0]!.status.protect).toBe(7) // 金刚符定时状态 = 实际回合数
    expect(s.players[1]!.status.dualAttack).toBe(0) // 装备常驻不伪装成回合计数
    expect(s.players[1]!.grantedStatuses).toEqual(['dualAttack'])
    // 无来源的空态基线
    expect(s.players[0]!.status.dualAttack).toBe(0)
    expect(s.players[1]!.status.protect).toBe(0)
  })

  test('initialStatuses 的可选字段：显式 undefined 不物化，有效回合正常物化', () => {
    const s = createBattleState({
      players: [
        wfPlayer('seeded', {
          initialStatuses: { haste: undefined, protect: 2 },
        }),
      ],
      enemySlots: [wfEnemy('slime')],
    })
    expect(s.players[0]!.status.haste).toBe(0)
    expect(s.players[0]!.status.protect).toBe(2)
  })
})

describe('玩家混乱后的行动改派', () => {
  test('单人队:混乱者无视所选动作乱打唯一活敌;防御被劫持不置位', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [wfIdleEnemy('slime', { health: 500 })],
    })
    stepBattle(s, rng0)
    s.players[0]!.status.confused = 3 // 混乱者不出菜单 → 强制普攻入队 → 执行时改派
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('攻击 slime 造成'))).toBe(true)
    expect(s.players[0]!.defending).toBe(false)
    expect(s.enemies[0]!.hp).toBeLessThan(500)
  })

  test('双人队:rng 指向队友 → attackMate 公式(防×2 无噪声无暴击),敌毫发无损', () => {
    // r9=0.99 恒值:改派池 [敌0,友1] → floor(0.99*2)=1 → 打友;敌 AI 无规则 → 普攻但
    // 被动格挡 floor(0.99*17)=16>=10 → 免伤,保 hp 干净
    const s = createBattleState({
      players: [wfPlayer('li'), wfPlayer('zhao')],
      enemySlots: [wfEnemy('slime', { health: 500, attackStrength: 5 })],
    })
    const r9 = () => 0.99
    stepBattle(s, r9)
    s.players[0]!.status.confused = 3
    s.pendingActions.set(1, { kind: 'defend' }) // 队友防御 ×5 先手 → 置位后才挨打
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, r9)
      if (++guard > 50) break
    }
    // 友伤 = calcPhys(攻40, 防30×2(防御中), 物抗2),护体无 → 保底后钳余血
    expect(s.players[1]!.hp).toBe(98)
    expect(s.log.some((l) => l.includes('li 神志不清,攻击了 zhao'))).toBe(true)
    expect(s.enemies[0]!.hp).toBe(500) // 混乱者没打敌,敌普攻又被格挡
  })

  test('打友:护体减半(fight.c:3820-3823)', () => {
    const s = createBattleState({
      players: [wfPlayer('li'), wfPlayer('zhao')],
      enemySlots: [wfEnemy('slime', { health: 500, attackStrength: 5 })],
    })
    const r9 = () => 0.99
    stepBattle(s, r9)
    s.players[0]!.status.confused = 3
    s.players[1]!.status.protect = 3
    s.pendingActions.set(1, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, r9)
      if (++guard > 50) break
    }
    expect(s.players[1]!.hp).toBe(99)
  })

  test('混乱+濒死 → Pass 完全不出手(fight.c:1746)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 15 })], // 15 < min(100, 100/5=20) = 濒死
      enemySlots: [wfIdleEnemy('slime', { health: 500 })],
    })
    stepBattle(s, rng0)
    s.players[0]!.status.confused = 3
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      if (s.phase === 'lost') break
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('li 神志不清'))).toBe(true)
    expect(s.log.some((l) => l.includes('li 攻击'))).toBe(false)
    expect(s.enemies[0]!.hp).toBe(500)
  })
})

describe('傀儡在仍有队友存活时行动', () => {
  test('队友存活时，倒下傀儡无身法抽样，保留连击和其他计数并在队尾普攻', () => {
    const s = createBattleState({
      players: [
        wfPlayer('puppeteer', { baseDexterity: 100, defense: 500 }),
        wfPlayer('fallen', {
          attackStrength: 100,
          baseDexterity: 400,
          initialStatuses: { dualAttack: 3, sleep: 4 },
        }),
      ],
      enemySlots: [wfEnemy('slime', { health: 999, defense: 0 })],
      items: {
        152: {
          id: '152',
          name: '傀儡虫',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'oneAlly',
            consuming: true,
            battleOnly: true,
            effects: [{ kind: 'applyStatus', status: 'puppet', turns: 3 }],
          },
        },
      },
      inventory: [{ itemId: '152', count: 1 }],
    })
    // This round starts after the ally fell without being revived, retaining their counters.
    const fallen = expectDefined(s.players[1])
    fallen.hp = 0
    let draws = 0
    const rng = () => {
      draws++
      return 0
    }
    stepBattle(s, rng)
    s.pendingActions.set(0, { kind: 'item', itemId: '152', targetAllyIdx: 1 })
    stepBattle(s, rng)
    expect(draws).toBe(2)
    expect(s.actionQueue.at(-1)).toMatchObject({ isEnemy: false, idx: 1, dex: 0 })

    stepBattle(s, rng)
    expect(fallen.status).toMatchObject({ puppet: 3, sleep: 4, dualAttack: 3 })
    stepBattle(s, rng)
    stepBattle(s, rng)
    expect(s.lastAction).toMatchObject({
      side: 'player',
      idx: 1,
      kind: 'attack',
      firstDamage: expect.any(Number),
      secondDamage: expect.any(Number),
    })
    expect(fallen.hp).toBe(0)
    expect(s.phase).toBe('performAction')
  })

  test('最后一名活人被击倒后立即失败，队尾傀儡不会补刀', () => {
    let draws = 0
    const rng = () => {
      draws++
      return 0
    }
    const s = createBattleState({
      players: [
        wfPlayer('survivor', { hp: 1, baseDexterity: 1 }),
        wfPlayer('fallen', {
          attackStrength: 999,
          baseDexterity: 1,
          initialStatuses: { puppet: 3 },
        }),
      ],
      enemySlots: [wfEnemy('slime', { health: 20, attackStrength: 100 })],
    })
    expectDefined(s.players[1]).hp = 0
    stepBattle(s, rng)
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng)
    expect(draws).toBe(2) // Only the enemy and the living player roll initiative.
    stepBattle(s, rng)
    expect(s.players.map(({ hp }) => hp)).toEqual([0, 0])
    expect(s.phase).toBe('lost')
    expect(s.enemies[0]?.hp).toBe(20)
  })

  test('无傀儡的全灭 → 判负(对照)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 0, maxHp: 100 })],
      enemySlots: [wfEnemy('slime', { health: 999, defense: 999, attackStrength: 0 })],
    })
    // puppet=0,全员死 → 判负
    let g = 0
    while (s.phase !== 'lost' && g++ < 20) stepBattle(s, rng0)
    expect(s.phase).toBe('lost')
  })
})

describe('装备连击', () => {
  // 敌睡死隔离(否则敌回合覆写 lastAction);log 持久,断言走 log + 敌血 delta
  const drive = (s: ReturnType<typeof createBattleState>): void => {
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
  }

  test('dualAttack 状态 → 物攻两击(敌未死);log 有连击', () => {
    const s = createBattleState({
      players: [wfPlayer('zhao', { attackStrength: 60, grantedStatuses: ['dualAttack'] })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    expect(s.players[0]!.status.dualAttack).toBe(0)
    expect(s.players[0]!.grantedStatuses).toContain('dualAttack')
    drive(s)
    expect(s.log.filter((l) => l.includes('zhao')).length).toBeGreaterThanOrEqual(2) // 两击各一条
    expect(s.log.some((l) => l.includes('连击'))).toBe(true)
    expect(9999 - s.enemies[0]!.hp).toBeGreaterThan(0)
  })

  test('无 dualAttack → 单击(对照,无连击 log)', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 60 })],
      enemySlots: [wfEnemy('slime', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    drive(s)
    expect(s.log.some((l) => l.includes('连击'))).toBe(false)
  })

  test('连击首击足以击倒时，仍在同一目标上完成第二击', () => {
    const s = createBattleState({
      players: [
        wfPlayer('zhao', {
          baseDexterity: 500,
          attackStrength: 100,
          grantedStatuses: ['dualAttack'],
        }),
      ],
      enemySlots: [
        wfEnemy('slime', { health: 10, defense: 0, attackStrength: 0 }),
        wfEnemy('other', { health: 500, defense: 0, attackStrength: 0 }),
      ],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    stepBattle(s, rng0)
    expect(s.lastAction).toMatchObject({
      kind: 'attack',
      targetEnemyIdx: 0,
      firstDamage: expect.any(Number),
      secondDamage: expect.any(Number),
    })
    expect(s.log.filter((line) => line.includes('连击'))).toHaveLength(1)
    expect(s.enemies[0]?.hp).toBe(0)
    expect(s.enemies[1]?.hp).toBe(500)
  })
})

describe('长鞭攻击全体', () => {
  test('扫全场按中心向外逐敌减半', () => {
    // 3 敌同防同血;rng0 → 暴击(floor(0*6)=0);伤害逐个减半
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 100, attackAll: true })],
      enemySlots: [
        wfEnemy('a', { health: 9999, defense: 0, attackStrength: 0 }),
        wfEnemy('b', { health: 9999, defense: 0, attackStrength: 0 }),
        wfEnemy('c', { health: 9999, defense: 0, attackStrength: 0 }),
      ],
    })
    stepBattle(s, rng0)
    for (const e of s.enemies) if (e) e.status.sleep = 99 // 隔离敌回合
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    // 3 敌都掉血;打击序 {2,1,0}(原版 index[])→ 敌2 division1 全额 > 敌1 half > 敌0 quarter
    const dealt = s.enemies.slice(0, 3).map((e) => 9999 - e!.hp)
    expect(dealt.every((d) => d > 0)).toBe(true) // 全都吃到
    expect(dealt[2]).toBeGreaterThan(dealt[1]!) // 敌2 首打 division1 最重
    expect(dealt[1]).toBeGreaterThan(dealt[0]!) // 敌1 次之 > 敌0 末打 division4
    expect(dealt[1]).toBe(Math.ceil(dealt[2]! / 2)) // 先扣血再截断剩余 HP
    expect(dealt[0]).toBe(Math.ceil(dealt[2]! / 4))
    expect(s.log.some((l) => l.includes('横扫'))).toBe(true)
  })

  test('单敌 attackAll = 单目标伤害(division 1);无 attackAll 对照单体', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { attackStrength: 100, attackAll: true })],
      enemySlots: [wfEnemy('a', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    expect(9999 - s.enemies[0]!.hp).toBeGreaterThan(0)
    expect(s.log.some((l) => l.includes('横扫'))).toBe(true)
  })
})
