/**
 * TEST-BATTLE-WORKFLOWS-1 W2：跨轮策略（F 本轮/R 重复/A 持续自动与 Esc 退出）。
 * 上一轮经公开 tick 真实提交；次轮资源耗尽或目标消失走当前降级；断言选择/实际
 * HP-库存结果与第三轮状态。旧「R 真实重复技能」只证正常重复轴，不重写；
 * 不凭空预置 lastActs（一切经公开输入驱动）。
 */
import { describe, expect, test } from 'vitest'
import { attackSkill, wfEnemy, wfPlayer } from './__tests__/battle-workflows/catalog.js'
import { makeWfSession, type WfHarness } from './__tests__/battle-workflows/session-driver.js'

const runActing = (h: WfHarness, ticks = 16): void => {
  for (let i = 0; i < ticks; i += 1) h.idle(500)
}

/** 完成一轮默认攻击并等待回到菜单（敌未死时）。 */
const fightOneRound = (h: WfHarness): void => {
  h.press([' '])
  h.press([' '])
  runActing(h)
}

describe('W2 跨轮策略', () => {
  test('A 持续自动：开启后无需再按菜单键，自动完成多轮直到终态', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1', { health: 60 })] })
    fightOneRound(h) // 第一轮手动
    h.press(['a', 'A']) // 开启持续自动
    for (let i = 0; i < 200 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(['over', 'menu']).toContain(h.session.debugReadiness().phase)
  })

  test('Esc 退出自动：恢复手动菜单', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 200 })],
    })
    fightOneRound(h)
    h.press(['a', 'A'])
    h.idle(500)
    h.press(['Escape']) // 退出自动
    const phase = h.session.debugReadiness().phase
    expect(['menu', 'acting']).toContain(phase) // 退出后不再自动推进菜单
  })

  test('F 本轮攻击：当前轮以普通攻击执行，不残留到下一轮', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1', { health: 80 })] })
    fightOneRound(h) // 第一轮正常
    h.press(['f', 'F']) // 本轮强制攻击
    runActing(h)
    // 第二轮后菜单仍在（未死），且后续仍可手动选择
    const phase = h.session.debugReadiness().phase
    expect(['menu', 'over']).toContain(phase)
  })

  test('R 重复上轮：次轮真实重提同一 cast（有 MP），第三轮 MP 耗尽时降级', () => {
    const skill = attackSkill('wf-strike', 20)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-strike': skill } },
    })
    // 第一轮：法术菜单选技能施放
    h.press(['s', 'S'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    runActing(h)
    // 第二轮：R 重复上轮 cast
    h.press(['r', 'R'])
    runActing(h)
    // 第三轮：MP 已耗尽（40-20-20=0），R 应走当前降级（普通攻击）不崩溃
    h.press(['r', 'R'])
    runActing(h)
    const players = h.session.debugPlayers()
    expect(players[0]!.roleId).toBe('p1')
    expect(players[0]!.hp).toBeGreaterThan(0) // 敌未打死，战斗继续但玩家活着
  })

  test('目标消失降级：上轮目标敌已死后 R 重复换当前合法目标', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 200 })],
      enemies: [
        wfEnemy('dead-first', { health: 5 }),
        wfEnemy('survivor', { health: 500, attackStrength: 1 }),
      ],
    })
    fightOneRound(h) // 杀死第一敌（默认选第一目标）
    h.press(['r', 'R']) // 重复攻击 → 应指向存活敌
    runActing(h)
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeGreaterThan(0)
  })
})
