/** F01: existing table contracts decoupled from PAL files; new full-output/source-preservation assertions. */
import { validateEnemies } from '@type-pal/content'
import { expect, test } from 'vitest'
import { sourceEnemy, sourceObject } from './__tests__/coverage-wave2/f-enemies-source.js'
import { mapEnemies, mapEnemyTeams } from './migrate-enemies.js'
import { emptyTranslateReport } from './translate-events.js'

test('real enemy translator maps every stat, optional item and signed sound without changing extracted input', () => {
  const source = [sourceEnemy()],
    objects = [sourceObject()],
    before = structuredClone({ source, objects })
  const output = mapEnemies(source, objects, {
    labelAt: new Map(),
    locale: {},
    report: emptyTranslateReport(),
  })
  validateEnemies(output.enemies)
  expect(output).toEqual({
    enemies: [
      {
        id: 'enemy-398',
        name: 'name.enemy-398',
        battleSprite: 'enemy-battle-1',
        yPosOffset: 2,
        stats: {
          health: 20,
          level: 2,
          exp: 7,
          cash: 8,
          attackStrength: 10,
          magicStrength: 11,
          defense: 12,
          dexterity: 13,
          fleeRate: 14,
          physicalResistance: 2,
          poisonResistance: 15,
          elemResistance: { wind: 1, thunder: 2, water: 3, fire: 4, earth: 5 },
          dualMove: true,
          collectValue: 4,
        },
        ai: {
          resistanceToSorcery: 3,
          fallback: { action: { kind: 'cast', skillId: '9' }, chancePercent: 50 },
        },
        sounds: {
          attack: 'sound.pal.001',
          action: 'sound.pal.002',
          magic: 'sound.pal.003',
          death: 'sound.pal.004',
          call: 'sound.pal.005',
          suppressMagicEffectSound: true,
        },
        steal: { itemId: '13', count: 1 },
        attackEquivItem: { itemId: '12', rate: 3 },
      },
    ],
    localeNames: { 'name.enemy-398': 'Object name' },
    report: { total: 1, withScript: 0, danglingEnemyId: [], pendingScripts: [], hookSources: [] },
  })
  output.enemies[0]!.stats.elemResistance.wind = 99
  expect({ source, objects }).toEqual(before)
})
test.each([
  {
    label: 'pass and clamp',
    magic: 65535,
    magicRate: 11,
    fallback: { action: { kind: 'pass' }, chancePercent: 100 },
  },
  { label: 'zero magic', magic: 0, magicRate: 5, fallback: undefined },
  {
    label: 'zero rate retains explicit zero chance',
    magic: 9,
    magicRate: 0,
    fallback: { action: { kind: 'cast', skillId: '9' }, chancePercent: 0 },
  },
])('enemy fallback $label keeps all zero optionals absent on the default translator path', ({
  magic,
  magicRate,
  fallback,
}) => {
  const result = mapEnemies(
    [
      sourceEnemy({
        magic,
        magicRate,
        dualMove: 0,
        attackSound: 0,
        actionSound: 0,
        magicSound: 0,
        deathSound: 0,
        callSound: 0,
        stealItem: 0,
        attackEquivItem: 0,
      }),
    ],
    [sourceObject()],
  )
  validateEnemies(result.enemies)
  const enemy = result.enemies[0]!
  expect(enemy.ai).toEqual({ resistanceToSorcery: 3, ...(fallback ? { fallback } : {}) })
  expect(enemy.sounds).toEqual({})
  expect(enemy).not.toHaveProperty('steal')
  expect(enemy).not.toHaveProperty('attackEquivItem')
  expect(enemy.stats.dualMove).toBe(false)
})
test('dangling source stats are reported without fabricating an enemy, while display-name priority is stable', () => {
  const source = [sourceEnemy(), sourceEnemy({ id: 2, _name: undefined })]
  const objects = [
    sourceObject({ _name: undefined }),
    sourceObject({ objectIndex: 399, enemyId: 2, _name: undefined }),
    sourceObject({ objectIndex: 400, enemyId: 99 }),
  ]
  const before = structuredClone({ source, objects }),
    result = mapEnemies(source, objects)
  expect(result.enemies.map((enemy) => enemy.id)).toEqual(['enemy-398', 'enemy-399'])
  expect(result.localeNames).toEqual({
    'name.enemy-398': 'Source name',
    'name.enemy-399': '敌人 399',
  })
  expect(result.report).toEqual({
    total: 2,
    withScript: 0,
    danglingEnemyId: ['enemy-400'],
    pendingScripts: [],
    hookSources: [],
  })
  expect({ source, objects }).toEqual(before)
})
test('enemy team semantic holes and source ordering remain intact; dangling ids fail loudly without mutation', () => {
  const source = [{ id: 7, enemyObjectIndexes: [65535, 0, 398, 65535, 0] }],
    before = structuredClone(source)
  expect(mapEnemyTeams(source, new Set(['enemy-398']))).toEqual({
    teams: [{ id: 'team-7', slots: [null, 'enemy-398', null] }],
    report: { total: 1, danglingMember: [] },
  })
  expect(() => mapEnemyTeams(source, new Set())).toThrow('enemy team team-7: 未知敌人槽 enemy-398')
  expect(source).toEqual(before)
})
