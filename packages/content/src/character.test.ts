import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import {
  applySetParty,
  buildWorld,
  instantiate,
  type StartWorld,
  type WorldState,
} from './character.js'

// 内联角色 fixture(C0:CharacterTemplate → ActorDef,battler 包住战斗数据)
const hero: ActorDef = {
  id: 'test-hero',
  name: 'name.test-hero',
  spriteId: 'hero-sprite',
  battler: {
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
  },
}

/** 无 battler 的普通 NPC(不可入队)。 */
const villager: ActorDef = { id: 'villager', name: 'name.villager', spriteId: 'ghost' }

describe('角色 schema(ActorDef)', () => {
  test('instantiate 角色 → 实例(读 battler;初始值拷贝;exp=0,tags 空)', () => {
    const inst = instantiate(hero)
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
    const a = instantiate(hero)
    const b = instantiate(hero)
    a.hp = 1
    expect(b.hp).toBe(150) // 不串
    a.equipment.weapon = '999'
    expect(b.equipment.weapon).toBe('166') // equipment 深拷贝
  })
  test('无 battler 的 actor → instantiate throw(含 id)', () => {
    expect(() => instantiate(villager)).toThrow(/villager.*battler/)
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
    const w = buildWorld(sw, { 'test-hero': hero })
    expect(w.money).toBe(50)
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('test-hero')
    expect(w.party[0]?.hp).toBe(100) // seedStats 覆盖(模板 150 → 100)
    expect(w.party[0]?.mp).toBe(30) // seedStats 覆盖(模板 100 → 30)
    expect(w.party[0]?.maxHP).toBe(150) // maxHP 不被 seedStats 动
    expect(w.learnedSkills['test-hero']).toEqual(['296', '298'])
    expect(w.inventory).toEqual([{ itemId: '267', count: 1 }])
  })
  test('无 seedStats → 用 battler.baseStats 的 hp/mp', () => {
    const sw: StartWorld = { party: ['test-hero'], money: 0, learnedSkills: {}, inventory: [] }
    const w = buildWorld(sw, { 'test-hero': hero })
    expect(w.party[0]?.hp).toBe(150)
    expect(w.party[0]?.mp).toBe(100)
  })
  test('缺角色 → throw', () => {
    const sw: StartWorld = { party: ['nobody'], money: 0, learnedSkills: {}, inventory: [] }
    expect(() => buildWorld(sw, {})).toThrow('不在 actors')
  })
  test('party 引无 battler 的 actor → throw(经 instantiate)', () => {
    const sw: StartWorld = { party: ['villager'], money: 0, learnedSkills: {}, inventory: [] }
    expect(() => buildWorld(sw, { villager })).toThrow(/battler/)
  })
})

describe('applySetParty —— C7 队伍变更(D22 reserve 暂存区)', () => {
  const actors = {
    'test-hero': {
      id: 'test-hero',
      name: 't.hero',
      spriteId: 's1',
      battler: {
        baseStats: {
          level: 1,
          hp: 150,
          maxHP: 150,
          mp: 100,
          maxMP: 100,
          attack: 10,
          defense: 10,
          magicAttack: 10,
          speed: 10,
          luck: 10,
        },
        initialEquipment: {},
      },
    },
    'test-mate': {
      id: 'test-mate',
      name: 't.mate',
      spriteId: 's2',
      battler: {
        baseStats: {
          level: 1,
          hp: 90,
          maxHP: 90,
          mp: 50,
          maxMP: 50,
          attack: 8,
          defense: 8,
          magicAttack: 8,
          speed: 8,
          luck: 8,
        },
        initialEquipment: {},
      },
    },
  } as unknown as Record<string, import('./actor.js').ActorDef>

  function world(): WorldState {
    const w = buildWorld(
      { party: ['test-hero'], money: 0, learnedSkills: {}, inventory: [] },
      actors,
    )
    return w
  }

  test('新成员首次入队:从模板实例化', () => {
    const w = world()
    applySetParty(w, ['test-hero', 'test-mate'], actors)
    expect(w.party.map((c) => c.template)).toEqual(['test-hero', 'test-mate'])
    expect(w.party[1]?.hp).toBe(90)
  })

  test('离队进 reserve,状态不丢;再入队原样搬回', () => {
    const w = world()
    applySetParty(w, ['test-hero', 'test-mate'], actors)
    w.party[1]!.hp = 7 // 打残
    applySetParty(w, ['test-hero'], actors) // mate 离队
    expect(w.party.map((c) => c.template)).toEqual(['test-hero'])
    expect(w.reserve?.map((c) => c.template)).toEqual(['test-mate'])
    expect(w.reserve?.[0]?.hp).toBe(7) // 不清数据
    applySetParty(w, ['test-hero', 'test-mate'], actors) // 回归
    expect(w.party[1]?.hp).toBe(7) // 原实例
    expect(w.reserve).toEqual([])
  })

  test('members 顺序 = 站位序(队长在前)', () => {
    const w = world()
    applySetParty(w, ['test-mate', 'test-hero'], actors)
    expect(w.party.map((c) => c.template)).toEqual(['test-mate', 'test-hero'])
  })

  test('在队成员保留原实例(引用不变)', () => {
    const w = world()
    const hero = w.party[0]!
    hero.hp = 42
    applySetParty(w, ['test-hero', 'test-mate'], actors)
    expect(w.party[0]).toBe(hero)
    expect(w.party[0]?.hp).toBe(42)
  })

  test('未知角色 id 抛错', () => {
    const w = world()
    expect(() => applySetParty(w, ['nobody'], actors)).toThrow(/不在 actors 表/)
  })
})
