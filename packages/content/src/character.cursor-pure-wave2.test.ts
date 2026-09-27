/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C2：世界态引用收集器。
 * instantiate/buildWorld/applySetParty 已由 character.test.ts 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import {
  applySetParty,
  buildWorld,
  collectWorldActorReferences,
  collectWorldBattleDataReferences,
} from './character.js'

const hero = wave2Actor('hero.li', 'name.li')
const mate = wave2Actor('hero.zhao', 'name.zhao')
const extra = wave2Actor('hero.lin', 'name.lin')
const actors = { [hero.id]: hero, [mate.id]: mate, [extra.id]: extra }

describe('C2 character 剩余合同', () => {
  test('合法 buildWorld/setParty 后收集 reserve 模板与毒/技能叶', () => {
    const start = {
      party: [hero.id],
      money: 0,
      inventory: [] as { itemId: string; count: number }[],
    }
    const startSnap = inputSnap(start)
    const world = buildWorld(start, actors)
    expect(start).toEqual(startSnap)
    applySetParty(world, [hero.id, mate.id], actors)
    applySetParty(world, [hero.id], actors)
    world.reserve![0]!.poisons = [{ poisonId: 551, tickIndex: 0 }]
    world.skillUseCounts = { [hero.id]: { 'skill.hero.li': 2 } }

    const worlds = [world]
    const worldsSnap = inputSnap(worlds)
    expect(collectWorldActorReferences(worlds)).toEqual([
      {
        actorId: hero.id,
        kind: 'world-party-template',
        where: 'worlds[0].party[0].template',
      },
      {
        actorId: mate.id,
        kind: 'world-reserve-template',
        where: 'worlds[0].reserve[0].template',
      },
    ])
    expect(collectWorldBattleDataReferences(worlds)).toEqual([
      {
        target: 'skill',
        id: 'skill.hero.li',
        kind: 'world-learned-skill',
        where: `worlds[0].learnedSkills[${JSON.stringify(hero.id)}][0]`,
      },
      {
        target: 'skill',
        id: 'skill.hero.zhao',
        kind: 'world-learned-skill',
        where: `worlds[0].learnedSkills[${JSON.stringify(mate.id)}][0]`,
      },
      {
        target: 'skill',
        id: 'skill.hero.li',
        kind: 'world-skill-use-count',
        where: `worlds[0].skillUseCounts[${JSON.stringify(hero.id)}][${JSON.stringify('skill.hero.li')}]`,
      },
      {
        target: 'poison',
        id: '551',
        kind: 'world-active-poison',
        where: 'worlds[0].reserve[0].poisons[0].poisonId',
      },
    ])
    expect(worlds).toEqual(worldsSnap)
    expect(worlds[0]).toBe(world)
    expect(world.party[0]?.template).toBe(hero.id)
    expect(world.reserve?.[0]?.template).toBe(mate.id)
  })

  test('setParty 再召回两人时未点名第三人仍留 reserve', () => {
    const world = buildWorld({ party: [hero.id], money: 0, inventory: [] }, actors)
    applySetParty(world, [hero.id, mate.id, extra.id], actors)
    applySetParty(world, [hero.id], actors)
    const parked = world.reserve?.find((member) => member.template === extra.id)
    expect(parked).toBeDefined()
    parked!.hp = 17
    applySetParty(world, [hero.id, mate.id], actors)
    expect(world.party.map((member) => member.template)).toEqual([hero.id, mate.id])
    expect(world.reserve).toHaveLength(1)
    expect(world.reserve?.[0]).toBe(parked)
    expect(world.reserve?.[0]?.hp).toBe(17)
  })
})
