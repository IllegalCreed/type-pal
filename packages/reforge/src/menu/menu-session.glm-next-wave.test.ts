/**
 * TEST-GLM-NEW-G-1 G06：menu-session 残差。
 * 旧证（menu-session.test.ts 15 题）已证 status 遍历/magic 单体链/system/存档浏览器/
 * 物品执行主链；本文件只补旧题未覆盖的公开臂：
 *   1) 装备面板会话接线：list→pick-role→equipApply→ports.replaceWorld 真实换装
 *      （menu-session.ts:281-292；旧题零覆盖）；
 *   2) magic pick-caster Escape 关面板回 hub（:234-238）；
 *   3) allAllies 技能的 pick-spell 直放 branch 经会话写回全队（:269-273）；
 *   4) status 底部越界关面板与 Escape 关面板（:354-358）；
 *   5) 覆盖确认中 refreshSaveBrowser 重建浏览态、丢确认（:154-156）；
 *   6) open() 活动中重入：重置回 hub 导航（:147-149）。
 * 全部走 menuFixture 真实 MenuSession/ItemUseSession/ports；不 mock 被测核心。
 */

import type { SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { menuFixture } from '../__tests__/menu-session-fixture.js'

describe('G06 menu-session 残差', () => {
  test('装备面板会话接线：确认换装恰一次 replaceWorld，装备入槽、库存移除', () => {
    const h = menuFixture()
    h.openPanel('equip') // down×2 + 两次 Enter：item 子级 → 打开装备列表
    expect(h.menus.view.equipMenu.phase).toBe('list')
    expect(h.ports.replaceWorld).not.toHaveBeenCalled()
    h.press('Enter') // list 确认 sword → pick-role
    expect(h.menus.view.equipMenu.phase).toBe('pick-role')
    h.press('Enter') // equipApply → ports.replaceWorld(r.world)
    expect(h.ports.replaceWorld).toHaveBeenCalledTimes(1)
    const next = h.world
    expect(next.party[0]?.equipment.weapon).toBe('sword')
    expect(next.inventory.some((entry) => entry.itemId === 'sword')).toBe(false)
    // 空槽换装后回 list（equipApply 的回 list 臂），Esc 关面板回 hub。
    expect(h.menus.view.equipMenu.phase).toBe('list')
    h.press('Escape')
    expect(h.menus.view.equipMenu.active).toBe(false)
    expect(h.menus.view.menu.openPanel).toBeUndefined()
  })

  test('magic pick-caster Escape 关面板回 hub（不施放不扣 MP）', () => {
    const h = menuFixture()
    h.openPanel('magic')
    expect(h.menus.view.magicMenu.active).toBe(true)
    expect(h.menus.view.magicMenu.phase).toBe('pick-caster')
    h.press('Escape')
    expect(h.menus.view.magicMenu.active).toBe(false)
    expect(h.menus.view.menu.openPanel).toBeUndefined()
    expect(h.world.party[0]?.mp).toBe(20)
  })

  test('allAllies 技能经会话直放：全队回复、施法人恰扣一次 MP、留 pick-spell 连放', () => {
    const h = menuFixture()
    const allHeal: SkillData = {
      id: 'all-heal',
      name: '全体回复',
      desc: '',
      cost: { mp: 5 },
      usableOutsideBattle: true,
      target: 'allAllies',
      effects: [{ kind: 'healHp', amount: 10 }],
      animation: { effectSprite: 65535 },
    }
    h.skills['all-heal'] = allHeal // 单点增补合法技能表
    const learned = h.world.learnedSkills.a
    if (!learned) throw new Error('fixture learnedSkills missing')
    learned.push('all-heal') // 单点扩充电学习得（合法世界输入）
    h.openPanel('magic')
    h.press('Enter') // 确认施法人 a → pick-spell，spells = [heal, all-heal]
    expect(h.menus.view.magicMenu.phase).toBe('pick-spell')
    h.press('ArrowRight') // 网格 → all-heal
    expect(h.menus.view.magicMenu.cursor).toBe(1)
    h.press('Enter') // castAll 直放臂（:269-273）
    expect(h.world.party.map((member) => member.hp)).toEqual([70, 70]) // 60 + 10 两人
    expect(h.world.party[0]?.mp).toBe(15) // 恰扣一次（20 - 5）
    expect(h.menus.view.magicMenu.phase).toBe('pick-spell') // 留面板可连放
  })

  test('status 底部越界与 Escape 都关面板回 hub', () => {
    const h = menuFixture()
    h.openPanel('status')
    expect(h.menus.view.statusIdx).toBe(0)
    h.press('ArrowDown')
    expect(h.menus.view.statusIdx).toBe(1)
    h.press('ArrowDown') // 越过队尾 → back
    expect(h.menus.view.menu.openPanel).toBeUndefined()
    h.openPanel('status')
    h.press('Escape')
    expect(h.menus.view.menu.openPanel).toBeUndefined()
  })

  test('覆盖确认中 refreshSaveBrowser 重建浏览态：确认被替换、mode/cursor 按实参保留', () => {
    const h = menuFixture()
    h.openPanel('system')
    h.press('Enter') // 打开存档浏览器
    expect(h.menus.view.saveBrowser.active).toBe(true)
    h.press('Enter') // 进入覆盖确认
    expect(h.menus.view.saveBrowser.confirmOverwrite).toBe(true)
    h.menus.refreshSaveBrowser('save', h.context.metas, 5)
    expect(h.menus.view.saveBrowser.active).toBe(true)
    expect(h.menus.view.saveBrowser.confirmOverwrite).toBe(false) // 确认态被重建丢弃
    expect(h.menus.view.saveBrowser.mode).toBe('save')
    expect(h.menus.view.saveBrowser.cursor).toBe(5)
    expect(h.ports.writeSlot).not.toHaveBeenCalled()
  })

  test('open() 活动中重入：菜单重置回 hub 导航层', () => {
    const h = menuFixture()
    h.openPanel('magic')
    expect(h.menus.active).toBe(true)
    expect(h.menus.view.menu.openPanel).toBe('magic')
    h.menus.open() // 未 close 的重入
    expect(h.menus.active).toBe(true)
    expect(h.menus.view.menu.openPanel).toBeUndefined() // 面板被丢弃、回到主导航
  })
})
