import { describe, expect, test } from 'vitest'
import { initialWorld, instantiate, LI_XIAOYAO } from './character.js'
import { DEMO_ITEMS, effectiveStat } from './item.js'
import { DEMO_SKILLS } from './skill.js'

describe('角色 schema', () => {
  test('instantiate 模板 → 实例(初始值拷贝)', () => {
    const inst = instantiate(LI_XIAOYAO)
    expect(inst.id).toBe('li-xiaoyao')
    expect(inst.level).toBe(1)
    expect(inst.hp).toBe(150)
    expect(inst.maxHP).toBe(150)
    expect(inst.mp).toBe(100)
    expect(inst.attack).toBe(33)
    expect(inst.defense).toBe(32)
    expect(inst.magicAttack).toBe(20)
    expect(inst.speed).toBe(28)
    expect(inst.luck).toBe(32)
    expect(inst.exp).toBe(0)
    expect(inst.equipment).toEqual({
      weapon: '166',
      head: '196',
      body: '208',
      cloak: '225',
      feet: '235',
      accessory: '249',
    })
    expect(inst.tags).toEqual([])
  })
  test('initialWorld = 单人队伍(李逍遥实例)+ 习得仙术关系表', () => {
    const w = initialWorld()
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('li-xiaoyao')
    // learnedSkills:独立关系表(charInstanceId → skillId[]),取代内嵌 magic
    expect(w.learnedSkills['li-xiaoyao']).toEqual(['296', '298', '299'])
    // demo 习得的都在 DEMO_SKILLS 且 outdoor(大世界菜单可显)
    for (const id of w.learnedSkills['li-xiaoyao'] ?? []) {
      expect(DEMO_SKILLS[id]?.usableOutsideBattle).toBe(true)
    }
    expect(w.inventory).toContainEqual({ itemId: '267', count: 1 }) // 土灵珠在背包
    expect(w.party[0]?.equipment.weapon).toBe('166') // 起手穿木剑
    // 穿戴生效:有效防御 = base + 9
    expect(effectiveStat(w.party[0]!, 'defense', DEMO_ITEMS)).toBe(w.party[0]!.defense + 9)
  })
  test('initialWorld 含金钱字段(demo=0)', () => {
    expect(initialWorld().money).toBe(0)
  })
  test('instantiate 每次独立(不共享引用)', () => {
    const a = instantiate(LI_XIAOYAO)
    const b = instantiate(LI_XIAOYAO)
    a.hp = 1
    expect(b.hp).toBe(150) // 不串
  })
})
