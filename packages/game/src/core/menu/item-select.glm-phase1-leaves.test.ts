/** Direct flag contracts; equip/usable integration remains in the real equip/inventory suites. */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { matchesFilter } from './item-select.js'

function mkItem(id: number, name: string | undefined, flags: Partial<Item['flags']>): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price: 100,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...flags,
    },
  }
}

describe('L01 matchesFilter 直接真值表（菜单级未覆盖的分支）', () => {
  // IDs are in the production range; flags are synthetic predicate fixtures, not raw item data.
  const cases = {
    plain: mkItem(105, '白板', {}),
    equipOnly: mkItem(106, '木剑', { equipable: true }),
    usableOnly: mkItem(107, '观音符', { usable: true }),
    usableEquip: mkItem(108, '风灵珠', { usable: true, equipable: true }),
    throwableOnly: mkItem(109, '梅花镖', { throwable: true }),
    usableConsuming: mkItem(110, '草药', { usable: true, consuming: true }),
    throwableConsuming: mkItem(111, '飞镖', { throwable: true, consuming: true }),
    importantStory: mkItem(112, '剧情玉', { sellable: false }),
    sellableEquip: mkItem(113, '卖价装备', { equipable: true, sellable: true }),
  } satisfies Record<string, Item>

  it('potion = usable 且非装备非投掷：装备位/投掷位各自否决', () => {
    expect(matchesFilter(cases.usableOnly, 'potion')).toBe(true)
    expect(matchesFilter(cases.usableEquip, 'potion')).toBe(false) // equipable 否决
    expect(matchesFilter(cases.usableConsuming, 'potion')).toBe(true)
    expect(matchesFilter(cases.throwableOnly, 'potion')).toBe(false) // throwable+非usable 双因否决
    // C5 更正(2026-10-15)：usable=true 且 throwable=true —— 隔离"投掷位单独否决"
    // （原 throwableOnly 同时非 usable，否决被 !usable 遮蔽，投掷守卫未被独立证明）。
    expect(
      matchesFilter(mkItem(115, ' usable镖', { usable: true, throwable: true }), 'potion'),
    ).toBe(false)
  })

  it('battle = throwable 或 (usable 且 consuming)：三分支各一', () => {
    expect(matchesFilter(cases.throwableOnly, 'battle')).toBe(true) // throwable 单独命中
    expect(matchesFilter(cases.throwableConsuming, 'battle')).toBe(true)
    expect(matchesFilter(cases.usableConsuming, 'battle')).toBe(true) // usable+consuming 命中
    expect(matchesFilter(cases.usableOnly, 'battle')).toBe(false) // 只 usable 不算战斗道具
    expect(matchesFilter(cases.equipOnly, 'battle')).toBe(false)
  })

  it('important 两守卫各自独立否决', () => {
    expect(matchesFilter(cases.importantStory, 'important')).toBe(true)
    expect(matchesFilter(cases.plain, 'important')).toBe(true) // 白板：非卖非装备（fixture 默认双 false）
    // C5 更正(2026-10-15)：原 sellableEquip 双真无法区分是哪个守卫否决；
    // 补两个单真用例分别隔离 equipable 守卫与 sellable 守卫。
    expect(matchesFilter(cases.equipOnly, 'important')).toBe(false) // equipable=true、sellable=false → 仅装备守卫否决
    expect(
      matchesFilter(mkItem(116, '可卖药', { usable: true, sellable: true }), 'important'),
    ).toBe(false) // sellable=true、非装备 → 仅卖出守卫否决
    expect(matchesFilter(cases.usableConsuming, 'important')).toBe(true) // 可用草药非卖 → 本判定也归 important
  })

  it('sellable 直接按标志', () => {
    expect(matchesFilter(cases.sellableEquip, 'sellable')).toBe(true)
    expect(matchesFilter(cases.importantStory, 'sellable')).toBe(false)
  })

  it('all 不依赖分类标志', () => {
    expect(matchesFilter(cases.plain, 'all')).toBe(true) // all 与 flags 无关
  })
})
