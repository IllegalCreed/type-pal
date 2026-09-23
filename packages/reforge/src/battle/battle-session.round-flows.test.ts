/**
 * TEST-BATTLE-WORKFLOWS-1 W2：跨轮策略（A 持续自动/F 本轮/R 重复与 Esc 退出）。
 * 一切经公开输入驱动：第一轮真实施法（ArrowLeft→确认→目标→确认），后续轮用 A/F/R；
 * 断言以完整业务结果为准——轮次推进次数、MP 精确阶梯、R 降级为 attack 的日志语义。
 * 不凭空预置 lastActs。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { makeWfSession, type WfHarness } from '../__tests__/battle-workflows/session-driver.js'

/** 提交后先空一帧让回合真正开始（单人提交当帧回菜单、次帧才进准备），
 * 再空跑至回到菜单。直接在 menu 相位短路会漏掉整个回合执行。 */
const runRound = (h: WfHarness, maxFrames = 200): boolean => {
  h.idle(500) // 触发 nextSelecting → beginTurnPreparation
  for (let i = 0; i < maxFrames; i += 1) {
    if (h.session.debugReadiness().phase === 'menu') return true
    h.idle(500)
  }
  return h.session.debugReadiness().phase === 'menu'
}

/** 首轮真实施法：ArrowLeft 选法术→确认→选目标→确认，并跑完行动回菜单。 */
const castFirstRound = (h: WfHarness): void => {
  h.press(['ArrowLeft'])
  h.press([' ']) // 进入法术列表
  h.press([' ']) // 选中技能 → 目标选择
  h.press([' ']) // 确认目标 → 提交 cast
  expect(runRound(h)).toBe(true)
}

describe('W2 跨轮策略', () => {
  test('A 持续自动：开启后零菜单按键连续多轮自动攻击到终态', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press(['a', 'A']) // 开启持续自动（菜单内直接提交本轮并持续）
    h.idle(500) // 让第一轮真正开始
    // 之后完全不按菜单键：自动逐轮攻击直至 victory
    for (let i = 0; i < 400 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('over')
    const attacks = h.session
      .debugLog()
      .filter((line) => line.includes('p1') && line.includes('攻击'))
    expect(attacks.length).toBeGreaterThanOrEqual(2) // 多轮真实自动攻击
  })

  test('Esc 退出 A 自动：退出后不再自动提交（无按键时轮次停滞在菜单）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press(['a', 'A'])
    h.idle(500)
    // 每帧带 Escape：当自动轮结束回到 selecting tick 时，Escape 先于自动提交被处理
    for (let i = 0; i < 60; i += 1) h.press(['Escape'], 500)
    expect(h.session.debugReadiness().phase).toBe('menu')
    // 无菜单按键 → 停在菜单（不自动提交；区别于 A 开启时的自动推进）
    expect(h.session.debugReadiness().phase).toBe('menu')
    const attacksBefore = h.session
      .debugLog()
      .filter((line) => line.includes('p1') && line.includes('攻击')).length
    for (let i = 0; i < 50; i += 1) h.idle(500)
    const attacksAfter = h.session
      .debugLog()
      .filter((line) => line.includes('p1') && line.includes('攻击')).length
    expect(attacksAfter).toBe(attacksBefore) // 退出后零新增自动攻击
  })

  test('F 本轮攻击：当前轮以普通攻击执行；下一轮菜单回归手动（sticky 轮末清）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-strike': wfSkill('wf-strike', 20) } },
    })
    h.press(['f', 'F']) // 本轮强制攻击
    expect(runRound(h)).toBe(true)
    expect(h.readParty()[0]!.mp).toBe(40) // F 是 attack 不是 cast：MP 不扣
    // 下一轮：菜单手动等待（不自动提交）
    for (let i = 0; i < 50; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('menu')
    expect(h.readParty()[0]!.mp).toBe(40) // 无自动 cast 残留
  })

  test('R 重复上轮 cast：次轮真实重提同一法术（MP 40→20→0 精确阶梯）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-strike': wfSkill('wf-strike', 20) } },
    })
    castFirstRound(h)
    expect(h.readParty()[0]!.mp).toBe(20) // 第一轮真实施法
    h.press(['r', 'R']) // R 重复 → 重提同一 cast
    expect(runRound(h)).toBe(true)
    expect(h.readParty()[0]!.mp).toBe(0) // 第二轮重复施法
    const casts = h.session.debugLog().filter((line) => line.includes('施展'))
    expect(casts.length).toBe(2) // 两轮各一次真实施法
  })

  test('R 在 MP 耗尽后降级为普通攻击（第三轮不施法、MP 保持 0）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-strike': wfSkill('wf-strike', 20) } },
    })
    castFirstRound(h) // 40→20
    h.press(['r', 'R']) // 20→0
    expect(runRound(h)).toBe(true)
    h.press(['r', 'R']) // MP=0 → cast 不可用 → 降级 attack
    expect(runRound(h)).toBe(true)
    expect(h.readParty()[0]!.mp).toBe(0) // 降级不产生施法扣费
    const casts = h.session.debugLog().filter((line) => line.includes('施展'))
    expect(casts.length).toBe(2) // 只有前两轮施法
    const attacks = h.session
      .debugLog()
      .filter((line) => line.includes('p1') && line.includes('攻击'))
    expect(attacks.length).toBeGreaterThanOrEqual(1) // 第三轮真实降级为攻击
  })

  test('R 目标消失降级：上轮目标死后重复动作换当前存活敌继续攻击', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [
        wfEnemy('dead-first', { health: 1, defense: 0 }),
        wfEnemy('survivor', { health: 500, attackStrength: 1 }),
      ],
    })
    h.press([' ']) // 默认攻击第一敌
    h.press([' '])
    expect(runRound(h)).toBe(true) // 第一敌死亡
    h.press(['r', 'R']) // 重复 attack → 指向存活敌
    expect(runRound(h)).toBe(true)
    const survivorHits = h.session.debugLog().filter((line) => line.includes('survivor'))
    expect(survivorHits.length).toBeGreaterThanOrEqual(1) // 存活敌真实受击
    expect(h.readParty()[0]!.hp).toBeLessThan(100) // 战斗继续（存活敌反击）
  })
})
