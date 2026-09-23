import { type ActorDef, validateActors } from '@type-pal/content'
import { ROLE_SLUGS, type SourceCmd } from '../../source-facts.js'

export type TextCommand = SourceCmd & { messageIndex?: number }
// Independent B11-1/P0 source-key witness; do not derive fixture input from the guard under test.
export const casualtyLocaleKeys = [
  13470, 13471, 13472, 13473, 13474, 13475, 13476, 13477, 13478, 13479, 13480, 13481, 13482, 13483,
  13484, 13485, 13486, 13487, 13488, 13489, 13490, 13491, 13499, 13500, 13501, 13502, 13503, 13504,
  13505, 13506, 13507, 13508, 13509, 13510, 13511, 13512,
].map((id) => `dlg.${id}`)
export function casualtyFixture() {
  const actors: ActorDef[] = ROLE_SLUGS.map((id) => ({
    id,
    name: `name.${id}`,
    spriteId: `sprite.${id}`,
    battler: {
      baseStats: {
        level: 1,
        hp: 100,
        maxHP: 100,
        mp: 50,
        maxMP: 50,
        attack: 10,
        magicAttack: 10,
        defense: 10,
        speed: 10,
        luck: 10,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: `battle.${id}`,
    },
  }))
  validateActors(actors)
  const commands: TextCommand[] = [{ op: 'end' }],
    entries: number[] = []
  for (let group = 0; group < 4; group++) {
    const start = commands.length
    entries.push(start)
    commands.push({ op: 'raw', opcode: 6, operands: [75, start + 2, 0] }, { op: 'end' })
    for (const key of casualtyLocaleKeys.slice(group * 9, group * 9 + 9))
      commands.push({
        op: 'showDialog',
        messageIndex: Number(key.slice(4)),
        text: `fixture:${key}`,
      })
    commands.push({ op: 'end' })
  }
  const objectPlayers = [
    { scriptOnFriendDeath: entries[0]!, scriptOnDying: 0 },
    { scriptOnFriendDeath: 0, scriptOnDying: entries[1]! },
    { scriptOnFriendDeath: entries[2]!, scriptOnDying: entries[3]! },
  ]
  return { actors, commands, objectPlayers }
}
