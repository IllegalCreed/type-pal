import type { ActorDef } from '../actor.js'

export function actorWithPortraitsAndBattler(id: string, name: string): ActorDef {
  return {
    id,
    name,
    spriteId: `sprite.${id}`,
    portraits: {
      default: `portrait.${id}.default`,
      expressions: { angry: `portrait.${id}.angry` },
    },
    battler: {
      battleSprite: `${id}-battle-sprite`,
      baseStats: {
        level: 1,
        hp: 120,
        maxHP: 120,
        mp: 40,
        maxMP: 40,
        attack: 20,
        defense: 16,
        magicAttack: 14,
        speed: 18,
        luck: 12,
      },
      initialEquipment: {},
      initialMagic: [`skill.${id}`],
    },
  }
}
