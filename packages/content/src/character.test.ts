import { describe, expect, test } from 'vitest'
import { buildWorld, type CharacterTemplate, instantiate, type StartWorld } from './character.js'

// 内联模板 fixture(不再依赖已删的 LI_XIAOYAO 数据 const —— 测逻辑不需要真数据)
const tpl: CharacterTemplate = {
  id: 'test-hero',
  name: 'name.test-hero',
  baseStats: {
    level: 1,
    hp: 150,
    maxHP: 150,
    mp: 100,
    maxMP: 100,
    attack: 33,
    defense: 32,
    magicAttack: 20,
    speed: 28,
    luck: 32,
  },
  initialEquipment: { weapon: '166', accessory: '249' },
  initialMagic: ['296'],
}

describe('角色 schema', () => {
  test('instantiate 模板 → 实例(初始值拷贝;exp=0,tags 空)', () => {
    const inst = instantiate(tpl)
    expect(inst.id).toBe('test-hero')
    expect(inst.template).toBe('test-hero')
    expect(inst.level).toBe(1)
    expect(inst.hp).toBe(150)
    expect(inst.maxHP).toBe(150)
    expect(inst.mp).toBe(100)
    expect(inst.attack).toBe(33)
    expect(inst.exp).toBe(0)
    expect(inst.equipment).toEqual({ weapon: '166', accessory: '249' })
    expect(inst.tags).toEqual([])
  })
  test('instantiate 每次独立(不共享引用)', () => {
    const a = instantiate(tpl)
    const b = instantiate(tpl)
    a.hp = 1
    expect(b.hp).toBe(150) // 不串
    a.equipment.weapon = '999'
    expect(b.equipment.weapon).toBe('166') // equipment 深拷贝
  })
})

describe('buildWorld(manifest.startWorld 数据化)', () => {
  test('组装:party instantiate + seedStats 覆盖 hp/mp + money/learnedSkills/inventory 直取', () => {
    const sw: StartWorld = {
      party: ['test-hero'],
      money: 50,
      learnedSkills: { 'test-hero': ['296', '298'] },
      inventory: [{ itemId: '267', count: 1 }],
      seedStats: { 'test-hero': { hp: 100, mp: 30 } },
    }
    const w = buildWorld(sw, { 'test-hero': tpl })
    expect(w.money).toBe(50)
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('test-hero')
    expect(w.party[0]?.hp).toBe(100) // seedStats 覆盖(模板 150 → 100)
    expect(w.party[0]?.mp).toBe(30) // seedStats 覆盖(模板 100 → 30)
    expect(w.party[0]?.maxHP).toBe(150) // maxHP 不被 seedStats 动
    expect(w.learnedSkills['test-hero']).toEqual(['296', '298'])
    expect(w.inventory).toEqual([{ itemId: '267', count: 1 }])
  })
  test('无 seedStats → 用模板 baseStats.hp/mp', () => {
    const sw: StartWorld = { party: ['test-hero'], money: 0, learnedSkills: {}, inventory: [] }
    const w = buildWorld(sw, { 'test-hero': tpl })
    expect(w.party[0]?.hp).toBe(150)
    expect(w.party[0]?.mp).toBe(100)
  })
  test('缺模板 → throw', () => {
    const sw: StartWorld = { party: ['nobody'], money: 0, learnedSkills: {}, inventory: [] }
    expect(() => buildWorld(sw, {})).toThrow('不在 characters')
  })
})
