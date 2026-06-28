import { describe, expect, test } from 'vitest'
import { initialWorld, instantiate, LI_XIAOYAO } from './character.js'

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
    expect(inst.equipment).toEqual({})
    expect(inst.magic).toEqual([])
    expect(inst.tags).toEqual([])
  })
  test('initialWorld = 单人队伍(李逍遥实例)', () => {
    const w = initialWorld()
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('li-xiaoyao')
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
