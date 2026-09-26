import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import * as oldEntry from './commands.js'
import type { EditorState } from './edit-session.js'
import {
  AddEnemyCommand,
  DeleteEnemyCommand,
  type EnemyPatch,
  UpdateEnemyCommand,
} from './enemy-commands.js'

const enemy = (id: string): EnemyDef => ({
  id,
  name: `name.${id}`,
  battleSprite: 'bs',
  yPosOffset: 0,
  stats: {
    health: 10,
    level: 1,
    exp: 1,
    cash: 1,
    attackStrength: 5,
    magicStrength: 0,
    defense: 0,
    dexterity: 5,
    fleeRate: 0,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  ai: { resistanceToSorcery: 5 },
  sounds: {},
})

describe('C02 enemy command family', () => {
  test('keeps enemy constructors on the old commands barrel and patches on first apply', () => {
    expect(oldEntry.AddEnemyCommand).toBe(AddEnemyCommand)
    expect(oldEntry.UpdateEnemyCommand).toBe(UpdateEnemyCommand)
    expect(oldEntry.DeleteEnemyCommand).toBe(DeleteEnemyCommand)
    const command = new UpdateEnemyCommand('enemy-1', { yPosOffset: 5 })
    expect(command.label).toBe('修改敌人')
    const state = { enemies: [enemy('enemy-1')] } as unknown as EditorState
    const next = command.apply(state)
    expect(next.enemies?.[0]?.yPosOffset).toBe(5)
    expect(state.enemies?.[0]?.yPosOffset).toBe(0)
    expect(command.invert(next).enemies?.[0]?.yPosOffset).toBe(0)
    const add = new AddEnemyCommand(enemy('enemy-9'))
    expect(add.apply(state).enemies?.map((entry) => entry.id)).toEqual(['enemy-1', 'enemy-9'])
    const _patch: EnemyPatch = { yPosOffset: 1 }
    expect(_patch).toBeDefined()
  })
})
