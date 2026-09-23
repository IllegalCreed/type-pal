/**
 * TEST-BATTLE-WORKFLOWS-1 W1：选择/回退连续流程。
 * 法术菜单经真实方向键（ArrowLeft 选择法术图标）+确认进入——S 键不在现行输入域；
 * 施法/用品/投掷以完整业务结果断言（MP/HP/库存实际变化经公开 writeBack* 读出），
 * 不以 log 非空/存活代替。守卫门在驱动器会话入口（session-driver），本文件只证其非装饰。
 * 行动者归经行首前缀判定：我方行 `p1 ` 开头，敌行 `e1 ` 开头（C2 反证：子串匹配会混淆行动者）。
 */
import { describe, expect, test } from 'vitest'
import {
  assertWfCatalogPassesProductionGuards,
  wfCoopSkill,
  wfEnemy,
  wfHealItem,
  wfPlayer,
  wfSkill,
  wfThrowItem,
} from '../__tests__/battle-workflows/catalog.js'
import {
  assertWfDriverFixtureLegal,
  makeWfSession,
} from '../__tests__/battle-workflows/session-driver.js'
import type { BattleTurnReadinessSnapshot } from './battle-session.js'

describe('W1 选择/回退连续流程', () => {
  test('守卫门非装饰：驱动器拒绝未过生产 guard 的敌定义与技能定义', () => {
    expect(() => assertWfCatalogPassesProductionGuards()).not.toThrow()
    expect(() => assertWfDriverFixtureLegal()).not.toThrow()
    const badEnemy = wfEnemy('bad-e1')
    delete (badEnemy as { battleSprite?: unknown }).battleSprite
    expect(() => makeWfSession({ players: [wfPlayer('p1')], enemies: [badEnemy] })).toThrowError(
      /battleSprite|敌/,
    )
    const badSkill = wfSkill('bad-skill', 10)
    delete (badSkill as { cost?: unknown }).cost
    expect(() =>
      makeWfSession({
        players: [wfPlayer('p1', { skills: ['bad-skill'] })],
        enemies: [wfEnemy('e1')],
        extraOpts: { skills: { 'bad-skill': badSkill } },
      }),
    ).toThrowError(/cost|技能/)
  })

  test('默认攻击：空格确认后离开菜单，我方行动与敌反击真实发生（行动者按行首区分）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(16)
    expect(h.session.debugReadiness().phase).not.toBe('menu') // 菜单输入真实提交
    for (let i = 0; i < 20; i += 1) h.idle(500) // 跑完我方攻击+敌方反击时间线
    const log = h.session.debugLog()
    expect(log.some((line) => line.startsWith('p1 ') && line.includes('攻击'))).toBe(true) // 我方行动
    expect(log.some((line) => line.startsWith('e1 ') && line.includes('攻击'))).toBe(true) // 敌方反击
    const party = h.readParty()
    expect(party[0]!.hp).toBeLessThan(100) // 反击真实落在我方
  })

  test('ArrowLeft 选择法术图标→确认进入 skill→选目标→施法：MP 真实 40→20', () => {
    const skill = wfSkill('wf-strike', 20)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-strike': skill } },
    })
    h.press(['ArrowLeft']) // 选法术图标（现行输入域：方向键）
    h.press([' ']) // 确认进入法术列表
    expect(h.session.debugReadiness().phase).toBe('skill')
    h.press([' ']) // 选中技能 → 目标选择
    h.press([' ']) // 确认目标 → 提交 cast
    for (let i = 0; i < 20; i += 1) h.idle(500)
    const party = h.readParty()
    expect(party[0]!.mp).toBe(20) // 真实施法扣 20 MP（恰一次）
    expect(
      h.session.debugLog().some((line) => line.startsWith('p1 ') && line.includes('施展')),
    ).toBe(true)
  })

  test('投掷：W 直开投掷列表→选目标→提交，敌真实受伤害且库存恰耗一件', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1 })],
      enemies: [wfEnemy('e1', { health: 500, defense: 0, attackStrength: 1 })],
      extraOpts: {
        items: { 'wf-dart': wfThrowItem('wf-dart') },
        inventory: [{ itemId: 'wf-dart', count: 2 }],
      },
    })
    h.press(['w', 'W']) // 投掷快捷键（uibattle.c:1230）
    expect(h.session.debugReadiness().phase).toBe('throwItem')
    h.press([' ']) // 选中投掷品 → 单体进敌方目标选择
    h.press([' ']) // 确认目标 → 提交 throw
    for (let i = 0; i < 20; i += 1) h.idle(500)
    // 投掷真实执行：p1 行首投掷行 + 敌受伤害
    expect(
      h.session.debugLog().some((line) => line.startsWith('p1 投掷') && line.includes('受到')),
    ).toBe(true)
    const inv = [{ itemId: 'wf-dart', count: 2 }]
    h.session.writeBackInventory(inv)
    expect(inv[0]!.count).toBe(1) // 恰耗一件（一次代价）
  })

  test('无可投掷品时 W 不打开列表且零提交（会话层无效投掷选择）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { attackStrength: 1 })],
      extraOpts: {
        // 只有使用品、没有 throw 规格 → 投掷列表为空
        items: { 'wf-tonic': wfHealItem('wf-tonic', 30) },
        inventory: [{ itemId: 'wf-tonic', count: 2 }],
      },
    })
    expect(() => {
      h.press(['w', 'W'])
      h.idle()
    }).not.toThrow()
    expect(h.session.debugReadiness().phase).toBe('menu') // 留在菜单
    expect(h.readParty()[0]!.mp).toBe(40) // 零提交（core 层"扣库存前拒绝"之外的会话层无效选择）
  })

  test('合击有效选择会话闭环：直接提交→真实执行→两贡献者各付一次 HP 代价（91 精确）→队友普攻被消费', async () => {
    const flush = async (): Promise<void> => {
      for (let i = 0; i < 6; i += 1) await Promise.resolve()
    }
    const h = makeWfSession({
      players: [
        wfPlayer('p1', {
          cooperativeMagicSkillId: 'wf-coop',
          attackStrength: 40,
          magicStrength: 20,
        }),
        wfPlayer('p2', {
          cooperativeMagicSkillId: 'wf-coop',
          attackStrength: 40,
          magicStrength: 20,
        }),
      ],
      enemies: [wfEnemy('coop-target', { health: 20, defense: 0, attackStrength: 0 })],
      extraOpts: { skills: { 'wf-coop': wfCoopSkill('wf-coop', 9) } },
    })
    h.press(['ArrowRight']) // 合击图标（全队 2 healthy + 合体技 → 有效）
    h.press([' ']) // allEnemies 合体技直接提交，其余队员被消费 → 全员交招
    h.idle(500)
    await flush()
    for (let i = 0; i < 100 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    for (let screen = 0; screen < 6; screen += 1) {
      h.idle(350)
      h.press([' '])
      await flush()
    }
    await expect(h.session.done).resolves.toBe('victory') // 合击一击致胜（真实执行）
    const log = h.session.debugLog()
    expect(log.filter((line) => line.startsWith('合体技 ')).length).toBe(1) // 恰一次合击
    expect(log.some((line) => line.startsWith('p1 ') && line.includes('攻击'))).toBe(false) // 队友普攻被合击消费
    // 一次代价：两贡献者各扣 cost.mp 作 HP（100−9=91 精确；敌 attackStrength 0 无反击）
    const party = h.readParty()
    expect(party.map((member) => member.hp)).toEqual([91, 91])
  })

  test('合击无效选择会话闭环：单人无队友时合击图标不可选，确认落回普攻且零 HP 代价', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { cooperativeMagicSkillId: 'wf-coop', attackStrength: 30 })],
      enemies: [wfEnemy('e1', { health: 500, defense: 0, attackStrength: 0 })],
      extraOpts: { skills: { 'wf-coop': wfCoopSkill('wf-coop', 9) } },
    })
    h.press(['ArrowRight']) // healthyPlayerCount=1 → valid[2]=false：图标不可选
    h.press([' ']) // 确认 → menuIdx 仍 0 → 默认攻击
    h.press([' ']) // 确认第一敌 → 提交 attack
    for (let i = 0; i < 20; i += 1) h.idle(500)
    const log = h.session.debugLog()
    expect(log.filter((line) => line.startsWith('合体技 ')).length).toBe(0) // 合击从未发生
    expect(log.some((line) => line.startsWith('p1 ') && line.includes('攻击'))).toBe(true) // 落回普攻
    // 零合击代价：HP 恰 = 100 − Σ(敌反击伤害行)；合击 HP 代价（9 的倍数）从未被扣
    const counter = log
      .filter((line) => line.startsWith('e1 ') && line.includes('攻击') && line.includes('造成'))
      .map((line) => Number.parseInt(line.slice(line.lastIndexOf('造成') + 2).trim(), 10))
      .reduce((sum, n) => sum + n, 0)
    expect(h.readParty()[0]!.hp).toBe(100 - counter) // 非合击路径不扣 cost
  })

  test('战斗用品：E 打开使用列表→确认使用 healHp 物品→HP 真实回复', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 50, maxHp: 100 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { 'wf-tonic': wfHealItem('wf-tonic', 30) },
        inventory: [{ itemId: 'wf-tonic', count: 2 }],
      },
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 20; i += 1) h.idle(500)
    const afterRound1 = h.readParty()[0]!.hp
    expect(afterRound1).toBeLessThan(100) // 敌真实反击使 HP 下降
    h.press(['e', 'E']) // 第二轮 E 直开使用列表（battle 域过滤）
    h.press([' ']) // 选中物品
    h.press([' ']) // 确认使用
    for (let i = 0; i < 20; i += 1) h.idle(500)
    const afterRound2 = h.readParty()[0]!.hp
    expect(afterRound2).toBeGreaterThan(afterRound1) // healHp 真实回复（净增）
  })

  test('无可用品时 E 不打开列表且不崩溃', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1')] })
    expect(() => {
      h.press(['e', 'E'])
      h.idle()
    }).not.toThrow()
    expect(h.session.debugReadiness().phase).toBe('menu') // 无 battle 域物品 → 留在菜单
  })

  test('无技能时 ArrowLeft+确认给出空法术提示且不提交', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: [], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { attackStrength: 1 })],
    })
    h.press(['ArrowLeft'])
    h.press([' '])
    expect(h.readParty()[0]!.mp).toBe(40) // 未提交任何 cast
  })

  test('选目标→Esc 取消→换默认攻击：MP 不扣（未提交 cast）、最终提交的是攻击', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 }), wfEnemy('e2')],
      extraOpts: { skills: { 'wf-strike': wfSkill('wf-strike', 20) } },
    })
    h.press(['ArrowLeft'])
    h.press([' ']) // 进入法术列表
    h.press([' ']) // 选技能 → 目标选择
    h.press(['Escape']) // 取消回菜单
    expect(h.readParty()[0]!.mp).toBe(40) // 取消零提交
    h.press(['ArrowUp']) // 光标回攻击图标（Up→menuIdx 0）
    h.press([' ']) // 重新默认攻击
    h.press([' ']) // 确认第一敌
    for (let i = 0; i < 20; i += 1) h.idle(500)
    const party = h.readParty()
    expect(party[0]!.mp).toBe(40) // 最终提交的是 attack（cast 从未发生）
    expect(
      h.session.debugLog().some((line) => line.startsWith('p1 ') && line.includes('攻击')),
    ).toBe(true)
  })

  test('Esc 回退上一队员重选：p1 已交 cast 被撤回，重选 attack 后快照无 cast 且零法术代价', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const flush = async (): Promise<void> => {
      for (let i = 0; i < 6; i += 1) await Promise.resolve()
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 }), wfPlayer('p2')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: { 'wf-strike': wfSkill('wf-strike', 20) },
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
        },
      },
    })
    h.press(['ArrowLeft'])
    h.press([' ']) // p1 法术列表
    h.press([' ']) // 选技能 → 目标
    h.press([' ']) // 提交 cast（p1 完成，p2 菜单出现）
    h.press(['Escape']) // p2 菜单态 Esc：回退撤回 p1 的 cast
    h.press([' ']) // p1 重新出现：默认攻击
    h.press([' ']) // 确认第一敌
    h.press([' ']) // p2 默认攻击
    h.press([' ']) // 确认第一敌 → 全员交招
    h.idle(500)
    await flush()
    expect(snapshots.length).toBeGreaterThanOrEqual(1)
    const actions = [...(snapshots[0]?.actions.entries() ?? [])]
    expect(actions).toContainEqual([0, { kind: 'attack', targetEnemyIdx: 0 }]) // cast 已被撤回
    expect(actions).toContainEqual([1, { kind: 'attack', targetEnemyIdx: 0 }])
    for (const [, act] of actions) expect(act.kind).not.toBe('cast') // 撤回后无 cast
    expect(h.readParty()[0]!.mp).toBe(40) // 一次代价都没有：cast 撤回在执行前
  })

  test('两队员接力：两人各自提交后同轮执行，敌承受两次我方行动（行首区分行动者）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 30 }), wfPlayer('p2', { attackStrength: 30 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' ']) // p1 提交
    h.press([' '])
    h.press([' ']) // p2 提交 → 全员交招
    for (let i = 0; i < 30; i += 1) h.idle(500)
    const log = h.session.debugLog()
    expect(log.some((line) => line.startsWith('p1 ') && line.includes('攻击'))).toBe(true)
    expect(log.some((line) => line.startsWith('p2 ') && line.includes('攻击'))).toBe(true)
  })
})
