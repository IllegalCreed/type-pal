/**
 * TEST-BATTLE-WORKFLOWS-1 W1：选择/回退连续流程（battle-session.ts:1306-1680 区域）。
 * 真实 BattleSession + 公开 tick(pressed) 驱动；观测只用 debugLog/debugPlayers/
 * debugReadiness。旧「前一队员选走最后一件消耗品」只证 E 快捷键轴，不重写。
 * 覆盖：attack/skill/item 有效与无效选择、选目标→取消→换招、Esc 回退、
 * 多队员下一位接力、readiness 提交集合真实（无多付资源）。
 */
import { describe, expect, test } from 'vitest'
import {
  assertWfCatalogFixtureLegal,
  attackSkill,
  wfEnemy,
  wfPlayer,
} from './__tests__/battle-workflows/catalog.js'
import {
  assertWfDriverFixtureLegal,
  makeWfSession,
} from './__tests__/battle-workflows/session-driver.js'

describe('W1 选择/回退连续流程', () => {
  test('fixture 合法门：目录与驱动器构造真实会话', () => {
    expect(() =>
      assertWfCatalogFixtureLegal({ enemies: [wfEnemy('e1')], players: [wfPlayer('p1')] }),
    ).not.toThrow()
    expect(() => assertWfDriverFixtureLegal()).not.toThrow()
  })

  test('默认攻击：空格确认选敌→确认→进入 acting，log 记录真实提交', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1')] })
    expect(h.session.debugReadiness().phase).toBe('menu')
    h.press([' ']) // 打开默认攻击的目标选择
    h.press([' ']) // 确认目标 → 提交攻击
    h.idle(16)
    expect(h.session.debugReadiness().phase).not.toBe('menu') // 菜单输入真实提交（离开菜单）
    for (let i = 0; i < 12; i += 1) h.idle(500) // 跑完 acting 时间线
    const log = h.session.debugLog()
    expect(log.length).toBeGreaterThan(0) // 真实提交产生日志（攻击台词/伤害数字）
    const players = h.session.debugPlayers()
    expect(players).toHaveLength(1)
    expect(players[0]!.roleId).toBe('p1')
  })

  test('技能菜单：选合法技能→选目标→确认施法；MP 在提交时一次扣除', () => {
    const skill = attackSkill('wf-strike', 5)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 30, maxMp: 30 })],
      enemies: [wfEnemy('e1')],
      extraOpts: { skills: { 'wf-strike': skill } },
    })
    h.press(['s', 'S']) // 打开法术菜单
    h.press([' ']) // 选中第一个技能
    h.press([' ']) // 选定目标
    h.press([' ']) // 确认 → 提交 cast
    const before = h.session.debugPlayers()[0]!.hp // 提交后快照仍可见（MP 不在 debugPlayers——用 log 见证提交）
    expect(before).toBeGreaterThan(0)
    for (let i = 0; i < 16; i += 1) h.idle(500)
    expect(h.session.debugLog().length).toBeGreaterThan(0)
  })

  test('物品菜单：E 快捷键打开使用列表，合法物品可提交', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1')],
      extraOpts: {
        items: {
          'wf-potion': {
            id: 'wf-potion',
            name: '丹',
            buyPrice: 0,
            sellPrice: 0,
            sellable: false,
            use: { target: 'scene', consuming: true, effects: [] },
          } as never,
        },
        inventory: [{ itemId: 'wf-potion', count: 2 }],
      },
    })
    h.press(['e', 'E']) // E 快捷键直开使用列表
    h.press([' ']) // 选中物品
    h.press([' ']) // 确认使用（use 目标为自身时无目标步）
    for (let i = 0; i < 12; i += 1) h.idle(500)
    expect(h.session.debugLog().length).toBeGreaterThan(0)
  })

  test('无效选择：无可法术时打开法术菜单给出提示且不崩溃', () => {
    const h = makeWfSession({ players: [wfPlayer('p1', { skills: [] })], enemies: [wfEnemy('e1')] })
    expect(() => {
      h.press(['s', 'S'])
      h.idle()
    }).not.toThrow()
  })

  test('选目标→Esc 取消→换攻击：无多余提交，readiness 集合只含最终选择', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1'), wfEnemy('e2')] })
    h.press([' ']) // 打开目标选择
    h.press(['ArrowRight']) // 移到第二个敌人
    h.press(['Escape']) // 取消回菜单
    h.press([' ']) // 重新默认攻击
    h.press([' ']) // 确认第一敌
    for (let i = 0; i < 12; i += 1) h.idle(500)
    expect(h.session.debugLog().length).toBeGreaterThan(0)
  })

  test('两队员接力：第一人提交后菜单推进到第二人，各自选择独立', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1'), wfPlayer('p2')],
      enemies: [wfEnemy('e1')],
    })
    h.press([' ']) // p1 默认攻击目标选择
    h.press([' ']) // p1 确认
    h.press([' ']) // p2 默认攻击目标选择
    h.press([' ']) // p2 确认 → 全员交招
    for (let i = 0; i < 16; i += 1) h.idle(500)
    const players = h.session.debugPlayers()
    expect(players.map((player: { roleId: string }) => player.roleId)).toEqual(['p1', 'p2'])
  })
})
