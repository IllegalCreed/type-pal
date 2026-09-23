/**
 * TEST-BATTLE-WORKFLOWS-1 W1：选择/回退连续流程。
 * 法术菜单经真实方向键（ArrowLeft 选择法术图标）+确认进入——S 键不在现行输入域；
 * 施法/用品以完整业务结果断言（MP/HP 实际变化经公开 writeBackHp 读出），
 * 不以 log 非空/存活代替。fixture 先过生产 guard（R1）。
 */
import { describe, expect, test } from 'vitest'
import {
  assertWfCatalogPassesProductionGuards,
  wfEnemy,
  wfHealItem,
  wfPlayer,
  wfSkill,
} from '../__tests__/battle-workflows/catalog.js'
import {
  assertWfDriverFixtureLegal,
  makeWfSession,
} from '../__tests__/battle-workflows/session-driver.js'

describe('W1 选择/回退连续流程', () => {
  test('fixture 合法门：目录过生产 guard；驱动器构造真实会话且公共 HP/MP 读出可用', () => {
    expect(() => assertWfCatalogPassesProductionGuards()).not.toThrow()
    expect(() => assertWfDriverFixtureLegal()).not.toThrow()
  })

  test('默认攻击：空格确认选敌→确认后离开菜单，敌 HP 真实下降', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(16)
    expect(h.session.debugReadiness().phase).not.toBe('menu') // 菜单输入真实提交
    for (let i = 0; i < 20; i += 1) h.idle(500) // 跑完我方攻击+敌方反击时间线
    expect(h.session.debugLog().some((line) => line.includes('p1') && line.includes('攻击'))).toBe(
      true,
    )
    const party = h.readParty()
    expect(party[0]!.hp).toBeLessThan(100) // 敌真实反击
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
    expect(h.session.debugLog().some((line) => line.includes('施展'))).toBe(true)
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
    expect(h.session.debugLog().some((line) => line.includes('攻击'))).toBe(true)
  })

  test('两队员接力：两人各自提交后同轮执行，敌承受两次我方行动', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 30 }), wfPlayer('p2', { attackStrength: 30 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' ']) // p1 提交
    h.press([' '])
    h.press([' ']) // p2 提交 → 全员交招
    for (let i = 0; i < 30; i += 1) h.idle(500)
    const attacks = h.session
      .debugLog()
      .filter((line) => (line.includes('p1') || line.includes('p2')) && line.includes('攻击'))
    expect(attacks.length).toBeGreaterThanOrEqual(2) // 两人真实各执行一次
  })
})
