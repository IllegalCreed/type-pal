import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeMagicMenu,
  type MagicMenuState,
  magicMoveCursor,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'

describe('resolveOutdoorSkills', () => {
  test('李逍遥 demo:learnedSkills → DEMO_SKILLS,全 outdoor', () => {
    const world = initialWorld()
    const spells = resolveOutdoorSkills(world, 'li-xiaoyao')
    expect(spells.map((s) => s.id)).toEqual(['296', '298', '299'])
    expect(spells.every((s) => s.usableOutsideBattle)).toBe(true)
  })
  test('未知角色 → 空', () => {
    expect(resolveOutdoorSkills(initialWorld(), 'nobody')).toEqual([])
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
