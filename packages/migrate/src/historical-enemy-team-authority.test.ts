import { createScriptIndex, normalizeScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  projectHistoricalEnemyTeamFiles,
  projectHistoricalSceneForCurrentValidation,
} from './historical-enemy-team-authority.js'
import type { MigrationJson } from './pal-migration.js'

function library(command: Record<string, unknown>) {
  return normalizeScriptLibrary(createScriptIndex(), {
    shared: {
      version: 1,
      id: 'shared',
      scripts: { 'shared/test': [command as never] },
    },
  })
}

describe('historical enemy-team authority', () => {
  test('isolated copy projects stable ids and recomputes script metadata', () => {
    const current = library({ kind: 'startBattle', enemyTeamId: 'team-17' })
    const currentMeta = current.index.chunks.shared!
    const files = new Map<string, MigrationJson>([
      ['content/scripts/index.json', structuredClone(current.index) as never],
      [`content/scripts/${currentMeta.path}`, structuredClone(current.chunks.shared!) as never],
      ['content/scenes/s001.json', { hostile: { enemyTeamId: 'team-3' } }],
    ])

    const projected = projectHistoricalEnemyTeamFiles(files)
    const expected = library({ kind: 'startBattle', team: 17 })
    expect(projected.get('content/scripts/index.json')).toEqual(expected.index)
    expect(projected.get(`content/scripts/${currentMeta.path}`)).toEqual(expected.chunks.shared)
    expect(projected.get('content/scenes/s001.json')).toEqual({ hostile: { team: 3 } })
    expect(files.get('content/scenes/s001.json')).toEqual({
      hostile: { enemyTeamId: 'team-3' },
    })
  })

  test('rejects non-PAL ids and dual fields', () => {
    expect(() =>
      projectHistoricalEnemyTeamFiles(
        new Map([['content/example.json', { kind: 'startBattle', enemyTeamId: 'boss-final' }]]),
      ),
    ).toThrow(/PAL team-N/)
    expect(() =>
      projectHistoricalEnemyTeamFiles(
        new Map([
          ['content/example.json', { kind: 'startBattle', enemyTeamId: 'team-1', team: 1 }],
        ]),
      ),
    ).toThrow(/双字段/)
  })

  test('current validator view upgrades commands and hostile behavior without mutating history', () => {
    const historical = {
      hook: [{ kind: 'startBattle', team: 17 }],
      entity: { hostile: { team: 3, chase: { range: 8 } } },
    }
    expect(projectHistoricalSceneForCurrentValidation(historical)).toEqual({
      hook: [{ kind: 'startBattle', enemyTeamId: 'team-17' }],
      entity: { hostile: { enemyTeamId: 'team-3', chase: { range: 8 } } },
    })
    expect(historical.hook[0]).toEqual({ kind: 'startBattle', team: 17 })
  })
})
