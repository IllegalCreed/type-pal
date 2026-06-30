import { describe, expect, test } from 'vitest'
import {
  closeMagicMenu,
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmSpell,
  magicMoveCursor,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'
import { makeTestSkills, makeTestWorld } from './test-fixtures.js'

describe('resolveOutdoorSkills', () => {
  test('李逍遥 demo:learnedSkills → DEMO_SKILLS,全 outdoor', () => {
    const world = makeTestWorld()
    const spells = resolveOutdoorSkills(world, 'li-xiaoyao', makeTestSkills())
    expect(spells.map((s) => s.id)).toEqual(['296', '298', '299'])
    expect(spells.every((s) => s.usableOutsideBattle)).toBe(true)
  })
  test('未知角色 → 空', () => {
    expect(resolveOutdoorSkills(makeTestWorld(), 'nobody', makeTestSkills())).toEqual([])
  })
})

describe('仙术网格导航', () => {
  const mk = (n: number): MagicMenuState =>
    openMagicMenu(Array.from({ length: n }, (_, i) => ({ id: String(i) }) as never))

  test('openMagicMenu:active + cursor 0', () => {
    const s = openMagicMenu([])
    expect(s.active).toBe(true)
    expect(s.cursor).toBe(0)
  })
  test('↓ = +3(列数),↑ 边界 clamp 不动', () => {
    expect(magicMoveCursor(mk(6), 'down').cursor).toBe(3)
    expect(magicMoveCursor(mk(6), 'up').cursor).toBe(0) // cursor0 上越界 → 不动
  })
  test('→ = +1,← 边界 clamp;下越界不动', () => {
    expect(magicMoveCursor(mk(6), 'right').cursor).toBe(1)
    expect(magicMoveCursor({ ...mk(6), cursor: 5 }, 'down').cursor).toBe(5) // 5+3 越界 → 不动
    expect(magicMoveCursor({ ...mk(6), cursor: 0 }, 'left').cursor).toBe(0)
  })
  test('空列表导航不崩', () => {
    expect(magicMoveCursor(mk(0), 'down').cursor).toBe(0)
  })
  test('closeMagicMenu:active false', () => {
    expect(closeMagicMenu().active).toBe(false)
  })
})

describe('仙术阶段(pick-spell ↔ pick-target;红箭头随阶段)', () => {
  const mk = (n: number): MagicMenuState =>
    openMagicMenu(Array.from({ length: n }, (_, i) => ({ id: String(i) }) as never))

  test('开菜单默认 pick-spell', () => {
    expect(openMagicMenu([]).phase).toBe('pick-spell')
  })
  test('选中技能 → pick-target;空列表不进', () => {
    expect(magicConfirmSpell(mk(3)).phase).toBe('pick-target')
    expect(magicConfirmSpell(mk(0)).phase).toBe('pick-spell')
  })
  test('选目标返回 → pick-spell', () => {
    expect(magicBackFromTarget(magicConfirmSpell(mk(3))).phase).toBe('pick-spell')
  })
  test('pick-target 阶段网格不动', () => {
    expect(magicMoveCursor(magicConfirmSpell(mk(6)), 'down').cursor).toBe(0)
  })
})
