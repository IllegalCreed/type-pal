import type { WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { withWorldPreset } from './dev-preset.js'

function makeWorld(): WorldState {
  return {
    party: [
      {
        id: 'hero',
        template: 'hero',
        level: 5,
        exp: 0,
        hp: 50,
        maxHP: 120,
        mp: 20,
        maxMP: 40,
        attack: 10,
        defense: 8,
        magicAttack: 6,
        speed: 9,
        luck: 5,
        equipment: { weapon: 'wood-sword' },
        tags: [],
      },
    ],
    money: 100,
    learnedSkills: { hero: ['basic'] },
    inventory: [{ itemId: 'herb', count: 2 }],
  }
}

function makePresetParty(): WorldState['party'] {
  return [
    {
      id: 'ninja',
      template: 'ninja',
      level: 99,
      exp: 0,
      hp: 999,
      maxHP: 999,
      mp: 999,
      maxMP: 999,
      attack: 99,
      defense: 99,
      magicAttack: 99,
      speed: 99,
      luck: 99,
      equipment: { weapon: 'god-blade' },
      tags: [],
      extraStatuses: [{ status: 'protect', turns: 7 }],
    },
  ]
}

describe('withWorldPreset (D13-1 K2)', () => {
  test('战斗期间所有写入 world 后,结束恢复战前深等状态', async () => {
    const world = makeWorld()
    const before = structuredClone(world)
    await withWorldPreset(world, { party: makePresetParty() }, async () => {
      // 模拟战斗写回:HP/金钱/技能/物品/状态全部落 world 副本。
      world.party[0]!.hp = 1
      world.party[0]!.level = 1
      world.money += 500
      world.learnedSkills.hero = [...(world.learnedSkills.hero ?? []), 'fire']
      world.inventory.push({ itemId: 'elixir', count: 1 })
      ;(world as unknown as Record<string, unknown>).debugBattleResidue = { leaked: true }
    })
    expect(world).toEqual(before)
    expect(Object.hasOwn(world, 'debugBattleResidue')).toBe(false)
  })

  test('预设队伍/inventory 在战斗期间生效', async () => {
    const world = makeWorld()
    let seen: WorldState['party'] | undefined
    await withWorldPreset(
      world,
      {
        party: makePresetParty(),
        learnedSkills: { ninja: ['shadow-step'] },
        inventory: [{ itemId: 'elixir', count: 9 }],
      },
      async () => {
        seen = structuredClone(world.party)
        expect(world.learnedSkills).toEqual({ ninja: ['shadow-step'] })
        expect(world.inventory).toEqual([{ itemId: 'elixir', count: 9 }])
      },
    )
    expect(seen?.[0]?.id).toBe('ninja')
    expect(world.party[0]?.id).toBe('hero')
  })

  test('fn 抛错/取消路径同样恢复战前世界', async () => {
    const world = makeWorld()
    const before = structuredClone(world)
    await expect(
      withWorldPreset(world, { party: makePresetParty() }, async () => {
        world.money = -1
        throw new Error('cancel')
      }),
    ).rejects.toThrow('cancel')
    expect(world).toEqual(before)
  })
})
