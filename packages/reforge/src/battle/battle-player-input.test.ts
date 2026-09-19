import {
  type ActorDef,
  buildWorld,
  type ItemData,
  validateActors,
  validateItems,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { createBattlePlayers } from './battle-player-input.js'

function fixture() {
  const actor: ActorDef = {
    id: 'hero',
    name: 'hero',
    spriteId: 'walk',
    battler: {
      baseStats: {
        level: 1,
        hp: 80,
        maxHP: 100,
        mp: 10,
        maxMP: 20,
        attack: 30,
        defense: 20,
        magicAttack: 15,
        speed: 12,
        luck: 9,
      },
      initialEquipment: { weapon: 'blade' },
      initialMagic: ['base'],
      battleSprite: 'hero-battle',
      cooperativeMagicSkillId: 'coop',
      coveredBy: 'friend',
    },
  }
  const friend = { ...structuredClone(actor), id: 'friend' }
  friend.battler!.initialEquipment = {}
  const blade: ItemData = {
    id: 'blade',
    name: 'blade',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'weapon',
      equipableBy: ['hero'],
      effects: [
        { kind: 'statBonus', stat: 'attack', delta: 7 },
        { kind: 'grantSkill', skillId: 'extra' },
        { kind: 'grantStatus', status: 'dualAttack' },
        { kind: 'attackAll' },
        { kind: 'regenHp', amount: 3 },
        { kind: 'resistance', element: 'fire', percent: 25 },
      ],
    },
  }
  validateActors([actor, friend])
  validateItems([blade])
  const project = { actorsById: { hero: actor, friend }, items: { blade } }
  const world = buildWorld(
    { party: ['hero', 'friend'], money: 0, inventory: [] },
    project.actorsById,
  )
  return { project, world }
}
test('shared battle input derives equipment, skills and relationships without mutating the actual world', () => {
  const { world, project } = fixture()
  const before = structuredClone({ world, project })
  const [hero, friend] = createBattlePlayers(world, project)
  expect(hero).toEqual({
    roleId: world.party[0]!.id,
    actorTemplateId: 'hero',
    hp: 80,
    maxHp: 100,
    mp: 10,
    maxMp: 20,
    attackStrength: 37,
    defense: 20,
    magicStrength: 15,
    baseDexterity: 12,
    skills: ['base', 'extra'],
    cooperativeMagicSkillId: 'coop',
    coveredBy: world.party[1]!.id,
    fleeRate: 9,
    elemRes: { wind: 0, thunder: 0, water: 0, fire: 25, earth: 0 },
    poisonRes: 0,
    attackAll: true,
    regenHp: 3,
    regenMp: 0,
    grantedStatuses: ['dualAttack'],
    persistentProgress: {
      level: 1,
      exp: 0,
      maxHP: 100,
      maxMP: 20,
      attack: 30,
      magicAttack: 15,
      defense: 20,
      speed: 12,
      luck: 9,
    },
  })
  expect(friend!.attackStrength).toBe(30)
  expect(friend!.skills).toEqual(['base'])
  expect({ world, project }).toEqual(before)
  hero!.skills.push('later')
  hero!.persistentProgress!.attack = 200
  expect({ world, project }).toEqual(before)
})
test('explicit debug flags are local and carried condition arrays are detached', () => {
  const { world, project } = fixture()
  world.party[0]!.extraPoisonRes = 12
  world.party[0]!.extraStatuses = [{ status: 'protect', turns: 2 }]
  const before = structuredClone(world)
  const inputs = createBattlePlayers(world, project, {
    allLeader: world.party[1]!.id,
    dualLeader: world.party[1]!.id,
  })
  expect(inputs[1]!.attackAll).toBe(true)
  expect(inputs[1]!.grantedStatuses).toEqual(['dualAttack'])
  expect(inputs[0]!.poisonRes).toBe(12)
  expect(inputs[0]!.carriedStatuses).toEqual(before.party[0]!.extraStatuses)
  inputs[0]!.carriedStatuses![0]!.turns = 99
  expect(world).toEqual(before)
  expect(createBattlePlayers(world, project)[1]!.attackAll).toBe(false)
})
