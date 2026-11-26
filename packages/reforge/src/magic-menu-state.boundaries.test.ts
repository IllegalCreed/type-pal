import { buildWorld, CONTENT_VERSION, validateActors } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { outdoorParty, outdoorSkill } from './__tests__/outdoor-skill-fixture.js'
import { combatActor } from './__tests__/runtime-shell/scenarios.js'
import { expectDefined } from './defined.js'
import {
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
} from './magic-menu-state.js'
import { assertCurrentSaveStructure } from './save/current-structure.js'
import { SAVE_VERSION } from './save/types.js'
import { makeTestSkills } from './test-fixtures.js'

test('恢复的队员缺少技能表行时可打开空仙术面板', () => {
  const actor = { ...combatActor(), id: 'constructor' }
  validateActors([actor])
  const party = buildWorld({ party: [actor.id], money: 0, inventory: [] }, { constructor: actor })
  const saved = {
    version: SAVE_VERSION,
    projectId: 'test',
    contentVersion: CONTENT_VERSION,
    sceneRuntime: {},
    position: { sceneId: 'entry', pos: { col: 0, row: 0, height: 0 }, facing: 'left' },
    world: { ...party, learnedSkills: {} },
  }
  assertCurrentSaveStructure(saved)
  const table = makeTestSkills()
  let menu: MagicMenuState | undefined
  expect(() => {
    menu = openMagicMenu(saved.world, table)
  }).not.toThrow()
  expect(menu).toMatchObject({ phase: 'pick-spell', spells: [] })

  const withLearnedSpell = { ...saved.world, learnedSkills: { constructor: ['296'] } }
  expect(openMagicMenu(withLearnedSpell, table).spells.map(({ id }) => id)).toEqual(['296'])
})

const heal = outdoorSkill('heal')
const purify = outdoorSkill('purify', { effects: [{ kind: 'curePoison' }] })
const group = outdoorSkill('group', { target: 'allAllies', cost: { mp: 30 } })
const battle = outdoorSkill('battle', { usableOutsideBattle: false })

describe('仙术面板输入与确认', () => {
  test('按学习顺序列出大世界技能，跳过缺失定义和战斗专用技能', () => {
    const world = outdoorParty(['purify', 'missing', 'battle', 'heal'])
    const table = { heal, battle, purify }
    const before = structuredClone({ world, table })
    const menu = magicConfirmCaster(openMagicMenu(world, table), world, table)
    expect(menu.spells.map(({ id }) => id)).toEqual(['purify', 'heal'])
    expect({ world, table }).toEqual(before)
  })

  test('选人、技能、目标阶段各自独占相应的光标', () => {
    const world = outdoorParty(['heal'])
    const table = { heal }
    const pickCaster = openMagicMenu(world, table)
    expect(magicMoveCursor(pickCaster, 'down')).toBe(pickCaster)
    expect(magicMoveTarget(pickCaster, world, 'down')).toBe(pickCaster)
    const spells = magicConfirmCaster(pickCaster, world, table)
    expect(magicMoveCaster(spells, world, 'down')).toBe(spells)
    const selection = magicConfirmSpell(spells, world)
    if (selection?.kind !== 'toTarget') throw new Error('单体技能应进入选目标')
    expect(magicMoveCursor(selection.state, 'down')).toBe(selection.state)
    expect(magicMoveTarget(selection.state, world, 'down').targetIdx).toBe(1)
  })

  test('倒地的多队员不能确认为施法者', () => {
    const world = outdoorParty(['heal'])
    const table = { heal }
    const menu = openMagicMenu(world, table)
    expect(magicConfirmCaster(menu, world, table).spells.map(({ id }) => id)).toEqual(['heal'])
    expectDefined(world.party[0]).hp = 0
    expect(magicConfirmCaster(menu, world, table)).toBe(menu)
  })

  test('全体法术真气差一点不能确认，足额时发出请求但不结算', () => {
    const world = outdoorParty(['group'], ['caster'])
    const member = expectDefined(world.party[0])
    const menu = openMagicMenu(world, { group })
    member.mp = 29
    const beforePoor = structuredClone(world)
    expect(magicConfirmSpell(menu, world)).toBeNull()
    expect(world).toEqual(beforePoor)
    member.mp = 30
    const beforeExact = structuredClone(world)
    expect(magicConfirmSpell(menu, world)).toEqual({ kind: 'castAll', skill: group })
    expect(menu.phase).toBe('pick-spell')
    expect(world).toEqual(beforeExact)
  })

  test('每次重新确认单体法术时目标回到队首', () => {
    const world = outdoorParty(['heal'])
    const table = { heal }
    const spells = magicConfirmCaster(openMagicMenu(world, table), world, table)
    const selection = magicConfirmSpell(spells, world)
    if (selection?.kind !== 'toTarget') throw new Error('单体技能应进入选目标')
    const secondTarget = magicMoveTarget(selection.state, world, 'down')
    expect(secondTarget.targetIdx).toBe(1)
    const again = magicBackFromTarget(secondTarget)
    const before = structuredClone(world)
    expect(magicConfirmSpell(again, world)).toMatchObject({
      kind: 'toTarget',
      state: { phase: 'pick-target', targetIdx: 0 },
    })
    expect(again).toMatchObject({ phase: 'pick-spell', targetIdx: 1 })
    expect(world).toEqual(before)
  })
})
