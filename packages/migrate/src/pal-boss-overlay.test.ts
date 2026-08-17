import type { EnemyDef, EnemyTeamDef, ScriptChunkV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyPalBossEncounterOverlay } from './pal-boss-overlay.js'

const choreography = (text: string): NonNullable<EnemyDef['choreography']> => [
  { at: 'turnStart', once: true, body: [{ kind: 'dialog', cue: { rows: [{ text }] } }] },
]

describe('PAL boss encounter 纯 overlay', () => {
  test('只挂领衔/显式 boss 场，不污染杂兵场且不覆盖已有编排', () => {
    const enemies = [
      { id: 'enemy-435', choreography: choreography('lead') },
      { id: 'enemy-485', choreography: choreography('explicit') },
      { id: 'enemy-999', choreography: choreography('ordinary') },
    ] as unknown as EnemyDef[]
    const teams = [
      { id: 'team-7', slots: ['enemy-435'] },
      { id: 'team-19', slots: ['enemy-999', 'enemy-485'] },
      { id: 'team-20', slots: ['enemy-485'] },
    ] as EnemyTeamDef[]
    const chunks = {
      test: {
        version: 1,
        id: 'test',
        scripts: {
          root: [
            { kind: 'startBattle', enemyTeamId: 'team-7' },
            { kind: 'startBattle', enemyTeamId: 'team-19' },
            { kind: 'startBattle', enemyTeamId: 'team-20' },
            {
              kind: 'startBattle',
              enemyTeamId: 'team-7',
              choreography: choreography('preexisting'),
            },
          ],
        },
      },
    } as Record<string, ScriptChunkV1>

    const result = applyPalBossEncounterOverlay(enemies, teams, chunks)
    const battles = result.chunks.test!.scripts.root!.filter(
      (command) => command.kind === 'startBattle',
    )
    expect(result.attached).toBe(2)
    expect(battles[0]).toMatchObject({
      enemyTeamId: 'team-7',
      choreography: choreography('lead'),
    })
    expect(battles[1]).toMatchObject({
      enemyTeamId: 'team-19',
      choreography: choreography('explicit'),
    })
    expect(battles[2]).toEqual({ kind: 'startBattle', enemyTeamId: 'team-20' })
    expect(battles[3]).toMatchObject({ choreography: choreography('preexisting') })
    expect(result.clearedEnemies).toEqual(['enemy-435', 'enemy-485'])
    expect(result.enemies.find((enemy) => enemy.id === 'enemy-999')?.choreography).toBeDefined()
    expect(enemies[0]?.choreography).toBeDefined()

    const twice = applyPalBossEncounterOverlay(result.enemies, teams, result.chunks)
    expect(twice.enemies).toEqual(result.enemies)
    expect(twice.chunks).toEqual(result.chunks)
    expect(twice.attached).toBe(0)
  })
})
