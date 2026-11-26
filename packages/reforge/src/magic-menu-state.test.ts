import { describe, expect, test } from 'vitest'
import { outdoorParty, outdoorSkill } from './__tests__/outdoor-skill-fixture.js'
import { expectDefined } from './defined.js'
import {
  closeMagicMenu,
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
} from './magic-menu-state.js'

const heal = outdoorSkill('heal')
const groupHeal = outdoorSkill('group-heal', { cost: { mp: 30 }, target: 'allAllies' })

function spellGrid() {
  const spells = ['first', 'second', 'third', 'fourth', 'fifth'].map((id) => outdoorSkill(id))
  const world = outdoorParty(
    spells.map(({ id }) => id),
    ['caster'],
  )
  const table = Object.fromEntries(spells.map((spell) => [spell.id, spell]))
  return openMagicMenu(world, table)
}

describe('仙术菜单开关与施法者选择', () => {
  test('单人队打开仙术直接列出学会的大世界法术', () => {
    const menu = openMagicMenu(outdoorParty(['heal'], ['caster']), { heal })
    expect(menu.phase).toBe('pick-spell')
    expect(menu.spells.map(({ id }) => id)).toEqual(['heal'])
  })

  test('多人队从记住的位置选施法者，旧位置超界后回队首', () => {
    const world = outdoorParty(['heal'])
    expect(openMagicMenu(world, { heal }, 1)).toMatchObject({ phase: 'pick-caster', casterIdx: 1 })
    expect(openMagicMenu(world, { heal }, 9).casterIdx).toBe(0)
  })

  test('施法者菜单在首尾之间轮转', () => {
    const world = outdoorParty(['heal'], ['caster', 'recipient', 'friend'])
    const menu = openMagicMenu(world, { heal })
    expect(magicMoveCaster(menu, world, 'up').casterIdx).toBe(2)
    expect(magicMoveCaster(menu, world, 'down').casterIdx).toBe(1)
  })

  test('活着的成员没有大世界仙术时仍打开空列表', () => {
    const world = outdoorParty(['heal'])
    const menu = magicConfirmCaster(openMagicMenu(world, { heal }, 1), world, { heal })
    expect(menu).toMatchObject({ phase: 'pick-spell', casterIdx: 1, spells: [] })
    expect(magicMoveCursor(menu, 'down')).toBe(menu)
    expect(magicConfirmSpell(menu, world)).toBeNull()
  })

  test('关菜单后丢弃施法者、技能和目标选项', () => {
    expect(closeMagicMenu()).toEqual({
      active: false,
      phase: 'pick-spell',
      casterIdx: 0,
      spells: [],
      cursor: 0,
      targetIdx: 0,
    })
  })
})

describe('法术和目标的光标', () => {
  test('三列技能网格移动到下一行，贴近最后一个技能而不越界', () => {
    const first = spellGrid()
    expect(magicMoveCursor(first, 'up').cursor).toBe(0)
    expect(magicMoveCursor(first, 'left').cursor).toBe(0)
    expect(magicMoveCursor(first, 'right').cursor).toBe(1)
    const nextRow = magicMoveCursor(first, 'down')
    expect(nextRow.spells[nextRow.cursor]?.id).toBe('fourth')
    const atEnd = magicMoveCursor(nextRow, 'down')
    expect(atEnd.spells[atEnd.cursor]?.id).toBe('fifth')
  })

  test('单体目标在队列端点停住，返回保留当前技能', () => {
    const world = outdoorParty(['heal', 'group-heal'])
    const table = { heal, 'group-heal': groupHeal }
    const spells = magicConfirmCaster(openMagicMenu(world, table), world, table)
    const selection = magicConfirmSpell(spells, world)
    if (selection?.kind !== 'toTarget') throw new Error('单体技能应进入选目标')
    expect(spells.phase).toBe('pick-spell')
    expect(magicMoveTarget(selection.state, world, 'up')).toBe(selection.state)
    const last = magicMoveTarget(selection.state, world, 'down')
    expect(last.targetIdx).toBe(1)
    expect(magicMoveTarget(last, world, 'down')).toBe(last)
    const returned = magicBackFromTarget(last)
    expect(returned.phase).toBe('pick-spell')
    expect(returned.spells[returned.cursor]?.id).toBe('heal')
  })

  test('零真气可确认无需真气的技能', () => {
    const world = outdoorParty(['free'], ['caster'])
    expectDefined(world.party[0]).mp = 0
    const free = outdoorSkill('free', { cost: {} })
    expect(magicConfirmSpell(openMagicMenu(world, { free }), world)?.kind).toBe('toTarget')
  })
})
