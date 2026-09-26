import { validateEnemies, validateSkills } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { sourceEnemy, sourceObject } from './__tests__/coverage-wave2/f-enemies-source.js'
import { assemble, chain, sources } from './__tests__/migration-assembly-fixtures.js'
import { magic, raw, spell } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly enemies', () => {
  it('fallback and hook casts close over missing skills once in numeric order through real enemy translation', () => {
    const input = sources({
      enemies: [sourceEnemy({ magic: 403 }), sourceEnemy({ id: 2, magic: 401 })],
      enemyObjects: [
        sourceObject({ scriptOnReady: 1 }),
        sourceObject({ objectIndex: 399, enemyId: 2 }),
      ],
      spells: [
        spell({ id: 404, scriptOnUse: 99 }),
        spell({ id: 403, scriptOnUse: 99 }),
        spell({ id: 401, scriptOnUse: 99 }),
      ],
      magic: [magic()],
      commands: chain(raw(0x67, [401, 10]), raw(0x67, [404, 5])),
    })
    const output = assemble(input)
    expect(output.skills.skills.map((entry) => entry.id)).toEqual(['401', '403', '404'])
    expect(output.skills.skills.map((entry) => entry.effects)).toEqual([
      [{ kind: 'damage', power: 12, elemental: 0 }],
      [{ kind: 'damage', power: 12, elemental: 0 }],
      [{ kind: 'damage', power: 12, elemental: 0 }],
    ])
    expect(output.enemies[0]?.ai.fallback).toEqual({
      action: { kind: 'cast', skillId: '403' },
      chancePercent: 50,
    })
    expect(
      Object.values(output.enemies[0]!.ai.hooks!.ready!.states).flatMap((state) => state.body),
    ).toEqual([
      {
        kind: 'setFallback',
        fallback: { action: { kind: 'cast', skillId: '401' }, chancePercent: 100 },
      },
      {
        kind: 'setFallback',
        fallback: { action: { kind: 'cast', skillId: '404' }, chancePercent: 50 },
      },
    ])
    expect(output.enemyReport?.withScript).toBe(1)
    expect(output.enemyReport?.pendingScripts).toEqual([])
    validateEnemies(output.enemies)
    validateSkills(output.skills)
  })

  it('skills already emitted by the player path are not duplicated or replaced by enemy fallback', () => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 400 })],
        enemyObjects: [sourceObject()],
        spells: [spell({ scriptOnSuccess: 1 })],
        magic: [magic()],
        commands: chain(raw(0x1b, [0, 17])),
      }),
    )
    expect(output.skills.skills).toHaveLength(1)
    expect(output.skills.skills[0]?.effects).toEqual([{ kind: 'healHp', amount: 17 }])
    expect(output.report.pendingSkills).toEqual([])
    expect(output.report.lossySkills).toEqual([])
    validateSkills(output.skills)
  })

  it('clear and pass hook fallbacks do not invent skill zero or 65535', () => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 65535 })],
        enemyObjects: [sourceObject({ scriptOnTurnStart: 1 })],
        commands: chain(raw(0x67, [0]), raw(0x67, [65535, 10])),
      }),
    )
    expect(output.skills.skills).toEqual([])
    expect(output.report.pendingSkills).toEqual([])
    expect(output.enemies[0]?.ai.fallback?.action).toEqual({ kind: 'pass' })
    validateEnemies(output.enemies)
  })

  it('missing spell and missing magic are separately attributed without fabricated skill records', () => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 400 }), sourceEnemy({ id: 2, magic: 401 })],
        enemyObjects: [sourceObject(), sourceObject({ objectIndex: 399, enemyId: 2 })],
        spells: [spell({ id: 401, _name: '有名但无表', magicNumber: 80 })],
      }),
    )
    expect(output.skills.skills).toEqual([])
    expect(output.report.pendingSkills).toEqual([
      { id: 401, name: '有名但无表', reason: 'magicNumber 80 不在 magic.json' },
      { id: 400, name: '敌法术 400', reason: '敌用法术不在 spells/magic 提取' },
      { id: 401, name: '有名但无表', reason: '敌用法术不在 spells/magic 提取' },
    ])
  })

  it('enemy success script replaces damage fallback and script sound overrides table sound', () => {
    const calls: number[] = []
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 400 })],
        enemyObjects: [sourceObject()],
        spells: [spell({ scriptOnUse: 99, scriptOnSuccess: 1, scriptDesc: 4 })],
        magic: [magic({ type: 'trance', sound: 2 })],
        commands: [
          { op: 'end' },
          raw(0x1b, [0, 22]),
          raw(0x47, [3]),
          { op: 'end' },
          { op: 'showDialog', text: '补翻描述' },
          { op: 'end' },
        ],
        soundAssetForNum: (id) => {
          calls.push(id)
          return `sound.actual-${id}`
        },
      }),
    )
    const skill = output.skills.skills[0]!
    expect(skill.effects).toEqual([{ kind: 'healHp', amount: 22 }])
    expect(skill.target).toBe('self')
    expect(skill.desc).toBe('补翻描述')
    expect(skill.cost).toEqual({ mp: 3 })
    expect(skill.usableOutsideBattle).toBe(false)
    expect(skill.animation?.sound).toBe('sound.actual-3')
    expect(calls).toContain(2)
    expect(calls).toContain(3)
    expect(output.report.lossySkills).toEqual([])
    validateSkills(output.skills)
  })

  it.each([
    'empty',
    'unsupported',
  ] as const)('untranslatable enemy success %s has explicit damage fallback and lossy evidence', (kind) => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 400 })],
        enemyObjects: [sourceObject()],
        spells: [spell({ scriptOnUse: 99, scriptOnSuccess: 1 })],
        magic: [magic()],
        commands: kind === 'empty' ? chain() : chain(raw(0x99)),
      }),
    )
    expect(output.skills.skills[0]?.effects).toEqual([{ kind: 'damage', power: 12, elemental: 0 }])
    expect(output.report.lossySkills).toHaveLength(1)
    expect(output.report.lossySkills[0]?.id).toBe(400)
    expect(output.report.lossySkills[0]?.notes[0]).toContain(kind === 'empty' ? '空链' : '0x99')
    expect(output.report.lossySkills[0]?.notes[0]).toContain('落 damage fallback')
    validateSkills(output.skills)
  })

  it('unknown player target mapping remains diagnosed but enemy closure explicitly defaults to oneEnemy', () => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 400 })],
        enemyObjects: [sourceObject()],
        spells: [spell()],
        magic: [magic({ type: 'source-special' })],
      }),
    )
    expect(output.skills.skills[0]?.target).toBe('oneEnemy')
    expect(output.report.pendingSkills).toEqual([
      { id: 400, name: '测试法术', reason: 'type=source-special 无 target 映射' },
    ])
    validateSkills(output.skills)
  })

  it('real hook dialogue joins locale with enemy names instead of losing translated cue text', () => {
    const output = assemble(
      sources({
        enemies: [sourceEnemy({ magic: 0 })],
        enemyObjects: [sourceObject({ scriptOnReady: 1 })],
        commands: chain({ op: 'showDialog', text: '站住！', messageIndex: 17 }),
      }),
    )
    expect(output.localeNames).toMatchObject({
      'name.enemy-398': 'Object name',
      'dlg.17': '站住！',
    })
    expect(
      Object.values(output.enemies[0]!.ai.hooks!.ready!.states).flatMap((state) => state.body),
    ).toEqual([{ kind: 'dialog', cue: { rows: [{ text: 'dlg.17' }] } }])
    validateEnemies(output.enemies)
  })

  it('team assembly joins only translated enemy IDs and preserves empty semantic slots', () => {
    const input = sources({
      enemies: [sourceEnemy({ magic: 0 })],
      enemyObjects: [sourceObject()],
      enemyTeams: [{ id: 3, enemyObjectIndexes: [65535, 398, 0, 398, 65535] }],
    })
    const output = assemble(input)
    expect(output.enemyTeams).toEqual([{ id: 'team-3', slots: ['enemy-398', null, 'enemy-398'] }])
    expect(output.enemyTeamReport).toEqual({ total: 1, danglingMember: [] })
    input.enemyTeams![0]!.enemyObjectIndexes[1] = 999
    expect(() => assemble(input)).toThrow('enemy team team-3: 未知敌人槽 enemy-999')
  })

  it('incomplete enemy source pair suppresses assembly, while dangling source objects are reported', () => {
    const noPair = sources({
      enemies: [sourceEnemy()],
      enemyTeams: [{ id: 3, enemyObjectIndexes: [999] }],
    })
    expect(assemble(noPair).enemyTeams).toEqual([])
    expect(assemble(noPair).enemyReport).toBeUndefined()
    noPair.enemyObjects = [sourceObject({ enemyId: 999 })]
    noPair.enemyTeams = []
    const output = assemble(noPair)
    expect(output.enemies).toEqual([])
    expect(output.enemyReport?.danglingEnemyId).toEqual(['enemy-398'])
    expect(output.enemyTeamReport).toEqual({ total: 0, danglingMember: [] })
  })
})
