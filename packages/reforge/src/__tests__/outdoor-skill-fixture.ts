import {
  type ActorDef,
  buildWorld,
  type SkillData,
  validateActors,
  validateSkills,
} from '@type-pal/content'

export function outdoorSkill(id: string, overrides: Partial<SkillData> = {}): SkillData {
  const skill: SkillData = {
    id,
    name: id,
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 65535 },
    ...overrides,
  }
  validateSkills({ skills: [skill], levelUp: {} })
  return skill
}

export function outdoorParty(known: readonly string[], members = ['caster', 'recipient']) {
  const actors: ActorDef[] = members.map((id) => ({
    id,
    name: id,
    spriteId: 'walker',
    battler: {
      baseStats: {
        level: 1,
        hp: 60,
        maxHP: 99,
        mp: 30,
        maxMP: 100,
        attack: 10,
        defense: 10,
        magicAttack: 10,
        speed: 10,
        luck: 10,
      },
      initialEquipment: {},
      initialMagic: id === members[0] ? [...known] : [],
      battleSprite: 'fighter',
    },
  }))
  validateActors(actors)
  return buildWorld(
    { party: members, money: 0, inventory: [] },
    Object.fromEntries(actors.map((actor) => [actor.id, actor])),
  )
}
