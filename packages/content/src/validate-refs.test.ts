import { describe, expect, test } from 'vitest'
import { validateReferences, type ContentBundle } from './validate-refs.js'

// 深拷贝(content 是纯逻辑包,tsconfig 无 DOM lib → 不用 structuredClone;JSON 法对这些纯数据 fixture 足够)。
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const base: ContentBundle = {
  scenes: [
    {
      id: 's',
      map: { reuseOriginalMap: 1, room: { col: 0, row: 0, cols: 1, rows: 1 } },
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, sprite: 'ghost' }],
    },
  ],
  actors: [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      battler: { baseStats: {} as never, initialEquipment: {}, initialMagic: [] },
    },
  ],
  skills: [{ id: '1' } as never],
  levelUp: {},
  items: [{ id: 'i1' } as never],
  locale: { 'dlg.talk.0': '…', 'name.hero': '主角' },
  sprites: [
    { id: 'ghost', spriteNum: 16, label: 'g', layout: { kind: 'directional', framesPerDir: 3 } },
    { id: 'hero-sprite', spriteNum: 2, label: 'h', layout: { kind: 'directional', framesPerDir: 3 } },
  ],
  startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
}

test('干净 bundle → 无 issue', () => {
  expect(validateReferences(base)).toEqual([])
})
test('levelUp.skillId 不在 skills → 报 warn(demo 已知未迁全)', () => {
  const b = clone(base)
  b.levelUp = { hero: [{ level: 7, skillId: '349' }] }
  expect(validateReferences(b).some((i) => /349/.test(i.where + i.message))).toBe(true)
})
test('prop 实体 sprite 不在 sprites 注册表 → 报 error', () => {
  const b = clone(base)
  ;(b.scenes[0]!.entities[0] as { sprite?: string }).sprite = 'unknown'
  expect(
    validateReferences(b).some((i) => i.severity === 'error' && /unknown/.test(i.where + i.message)),
  ).toBe(true)
})
test('actor 实体指向不存在角色 → 报 error(C0)', () => {
  const b = clone(base)
  const e = b.scenes[0]!.entities[0] as unknown as Record<string, unknown>
  delete e.sprite
  e.actor = 'nobody'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /actor/.test(i.where) && /nobody/.test(i.message),
    ),
  ).toBe(true)
})
test('actor.spriteId 不在 sprites 注册表 → 报 error(C0)', () => {
  const b = clone(base)
  b.actors[0]!.spriteId = 'no-sheet'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /spriteId/.test(i.where) && /no-sheet/.test(i.message),
    ),
  ).toBe(true)
})
test('actor.battler.initialEquipment 指向不存在物品 → 报 warn', () => {
  const b = clone(base)
  b.actors[0]!.battler!.initialEquipment = { weapon: 'no-item' }
  expect(validateReferences(b).some((i) => /no-item/.test(i.where + i.message))).toBe(true)
})
test('startWorld.party 指向不存在角色 → 报 error', () => {
  const b = clone(base)
  b.startWorld.party = ['nobody']
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /nobody/.test(i.where + i.message),
    ),
  ).toBe(true)
})
test('startWorld.party 引无 battler 的 actor → 报 error(C0:入队必须可战斗)', () => {
  const b = clone(base)
  b.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'ghost' })
  b.startWorld.party = ['villager']
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /villager.*battler|battler.*villager/.test(i.where + i.message),
    ),
  ).toBe(true)
})
test('startWorld.learnedSkills 指向不存在技能 → 报 warn', () => {
  const b = clone(base)
  b.startWorld.learnedSkills = { hero: ['999'] }
  expect(validateReferences(b).some((i) => /999/.test(i.where + i.message))).toBe(true)
})
test('EquipSpec.equipableBy 指向不存在角色 → 报 warn', () => {
  const b = clone(base)
  ;(b.items[0] as { equip?: unknown }).equip = {
    slot: 'weapon',
    equipableBy: ['ghost-man'],
    effects: [],
  }
  expect(validateReferences(b).some((i) => /ghost-man/.test(i.where + i.message))).toBe(true)
})
test('EquipEffect.grantSkill.skillId 不在 skills → 报 warn', () => {
  const b = clone(base)
  ;(b.items[0] as { equip?: unknown }).equip = {
    slot: 'accessory',
    equipableBy: ['hero'],
    effects: [{ kind: 'grantSkill', skillId: '336' }],
  }
  expect(validateReferences(b).some((i) => /336/.test(i.where + i.message))).toBe(true)
})
test('SkillCost.items[].itemId 不在 items → 报 warn', () => {
  const b = clone(base)
  ;(b.skills[0] as { cost?: unknown }).cost = { items: [{ itemId: 'no-wine', amount: 1 }] }
  expect(validateReferences(b).some((i) => /no-wine/.test(i.where + i.message))).toBe(true)
})
