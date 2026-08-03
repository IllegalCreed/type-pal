import type { EnemyDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  assertHistoricalR13_5RuntimeCapabilityAuditReportV3,
  assertHistoricalR13_5RuntimeCapabilityAuditV3,
  assertR13RuntimeCapabilityAuditReportV3,
  assertR13RuntimeCapabilityAuditV3,
  auditR13RuntimeCapabilitiesV3,
  buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3,
  buildAndAssertR13RuntimeCapabilityAuditV3,
  buildR13RuntimeCapabilityMatrixV3,
  type R13RuntimeCapabilityAuditV3,
} from './runtime-capability-audit-v3.js'
import { stableJsonSha256 } from './stable-json.js'

function skill(id: string, effects: SkillData['effects']): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects,
    animation: { effectSprite: 0 },
  }
}

function enemy(overrides: Partial<EnemyDef> = {}): EnemyDef {
  return {
    id: 'enemy-1',
    name: 'name.enemy-1',
    battleSprite: 'battle-sprite.enemy-1',
    yPosOffset: 0,
    stats: {
      health: 100,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: 10,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
    ...overrides,
  }
}

function snapshot(
  overrides: {
    scene?: unknown
    items?: unknown
    shared?: unknown
    enemies?: unknown
    skills?: unknown
  } = {},
): MigrationSnapshot {
  const files = new Map<string, MigrationJson>()
  files.set('content/scenes/index.json', ['s001'])
  files.set(
    'content/scenes/s001.json',
    (overrides.scene ?? {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    }) as MigrationJson,
  )
  files.set('content/items.json', (overrides.items ?? []) as MigrationJson)
  files.set('content/shared-scripts.json', (overrides.shared ?? {}) as MigrationJson)
  files.set('content/enemies.json', (overrides.enemies ?? []) as MigrationJson)
  files.set(
    'content/skills.json',
    (overrides.skills ?? { skills: [], levelUp: {} }) as MigrationJson,
  )
  return { files, managedFiles: new Set(files.keys()) }
}

function reseal(report: R13RuntimeCapabilityAuditV3): void {
  const { digest: _digest, ...withoutDigest } = report
  report.digest = stableJsonSha256(withoutDigest)
}

describe('R13 runtime capability audit v3', () => {
  test('每个 domain/context/kind 恰有一个显式 cell', () => {
    const matrix = buildR13RuntimeCapabilityMatrixV3()
    expect(matrix.cells).toHaveLength(
      matrix.domains.reduce(
        (total, domain) => total + domain.contexts.length * domain.kinds.length,
        0,
      ),
    )
    expect(
      new Set(matrix.cells.map((cell) => `${cell.domain}\0${cell.context}\0${cell.kind}`)).size,
    ).toBe(matrix.cells.length)
  })

  test('R13-5 historical 与 current matrix 通过具名入口隔离，错 profile 必须失败', () => {
    const value = snapshot()
    const current = buildAndAssertR13RuntimeCapabilityAuditV3(value)
    const historical = buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3(value)

    expect(historical.digest).not.toBe(current.digest)
    expect(
      historical.matrix.domains.find((entry) => entry.domain === 'world-command')?.kinds,
    ).not.toContain('holdScreen')
    expect(
      historical.matrix.domains.find((entry) => entry.domain === 'world-command')?.kinds,
    ).not.toContain('revealScreen')
    expect(
      historical.matrix.domains.find((entry) => entry.domain === 'skill-effect')?.kinds,
    ).not.toContain('resourceDelta')
    expect(() => assertR13RuntimeCapabilityAuditReportV3(current)).not.toThrow()
    expect(() => assertHistoricalR13_5RuntimeCapabilityAuditReportV3(historical)).not.toThrow()
    expect(() => assertR13RuntimeCapabilityAuditReportV3(historical)).toThrow('matrix 漂移')
    expect(() => assertHistoricalR13_5RuntimeCapabilityAuditReportV3(current)).toThrow(
      'matrix 漂移',
    )
    expect(() => assertHistoricalR13_5RuntimeCapabilityAuditV3(historical, value)).not.toThrow()
  })

  test('分别审计 hook、transition、battle action、fallback 与 onDefeated', () => {
    const magic = skill('skill-1', [{ kind: 'damage', power: 10, elemental: 0 }])
    const target = enemy({
      ai: {
        resistanceToSorcery: 0,
        rules: [{ at: 'act', do: { kind: 'cast', skillId: magic.id } }],
        fallback: {
          action: { kind: 'cast', skillId: magic.id },
          chancePercent: 100,
        },
        hooks: {
          ready: {
            initial: 'initial',
            states: {
              initial: {
                body: [
                  {
                    kind: 'setFallback',
                    fallback: {
                      action: { kind: 'cast', skillId: magic.id },
                      chancePercent: 100,
                    },
                  },
                  {
                    kind: 'effect',
                    id: 'summon-1',
                    effect: { kind: 'summon', enemyId: 'enemy-1', count: 1 },
                  },
                  { kind: 'playSound', asset: 'sound.test' },
                ],
                next: {
                  kind: 'commandOutcome',
                  commandId: 'summon-1',
                  outcome: 'succeeded',
                  then: { kind: 'stay' },
                  else: { kind: 'restart' },
                },
              },
            },
          },
        },
      },
      choreography: [
        {
          at: 'battleStart',
          body: [
            {
              kind: 'applyActorGrowth',
              actor: 'zhao-linger',
              delta: {
                level: 1,
                maxHP: 2,
                maxMP: 3,
                attack: 4,
                magicAttack: 5,
                defense: 6,
                speed: 7,
                luck: 8,
              },
            },
          ],
        },
      ],
      onDefeated: [
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'won', is: true },
          then: [{ kind: 'giveItem', itemId: 'reward' }],
          else: [{ kind: 'stopScript' }],
        },
      ],
    })
    const value = snapshot({
      enemies: [target],
      skills: { skills: [magic], levelUp: {} },
    })
    const report = buildAndAssertR13RuntimeCapabilityAuditV3(value)

    assertR13RuntimeCapabilityAuditV3(report, value)
    expect(report.issues).toEqual([])
    expect(report.summary.refusedUses).toBe(0)
    expect(report.enemySkillReferences).toHaveLength(3)
    for (const [domain, context, kind] of [
      ['enemy-hook-command', 'enemy-hook', 'effect'],
      ['enemy-hook-transition', 'enemy-hook', 'commandOutcome'],
      ['battle-action', 'enemy-hook-action', 'playSound'],
      ['battle-action', 'battle-choreography', 'applyActorGrowth'],
      ['enemy-ai-action', 'enemy-hook-effect', 'summon'],
      ['enemy-on-defeated', 'enemy-on-defeated', 'branch'],
    ])
      expect(report.uses).toContainEqual(
        expect.objectContaining({ domain, context, kind, status: 'executed' }),
      )
  })

  test('turnStart AiRule 没有 runtime executor，必须作为 refused use 失败', () => {
    const value = snapshot({
      enemies: [
        enemy({
          ai: {
            resistanceToSorcery: 0,
            rules: [{ at: 'turnStart', do: { kind: 'attack' } }],
          },
        }),
      ],
    })
    const report = auditR13RuntimeCapabilitiesV3(value)

    expect(report.uses).toContainEqual(
      expect.objectContaining({
        domain: 'enemy-ai-action',
        context: 'enemy-rule-turn-start',
        kind: 'attack',
        status: 'refused',
      }),
    )
    expect(report.issues).toEqual([
      expect.stringContaining('refused-use:enemy-ai-action:enemy-rule-turn-start:attack'),
    ])
    expect(() => assertR13RuntimeCapabilityAuditV3(report, value)).toThrow(
      'runtime capability v3 audit failed',
    )
    expect(() => buildAndAssertR13RuntimeCapabilityAuditV3(value)).toThrow(
      'runtime capability v3 audit failed',
    )
  })

  test('initial/hook fallback 的敌法术效果也进入真实 enemy skill matrix', () => {
    const unsupported = skill('unsupported', [
      { kind: 'buffStat', stat: 'attack', percent: 10, duration: 'battle' },
    ])
    const value = snapshot({
      enemies: [
        enemy({
          ai: {
            resistanceToSorcery: 0,
            fallback: {
              action: { kind: 'cast', skillId: unsupported.id },
              chancePercent: 100,
            },
            hooks: {
              ready: {
                initial: 'initial',
                states: {
                  initial: {
                    body: [
                      {
                        kind: 'setFallback',
                        fallback: {
                          action: { kind: 'cast', skillId: unsupported.id },
                          chancePercent: 100,
                        },
                      },
                    ],
                    next: { kind: 'stay' },
                  },
                },
              },
            },
          },
        }),
      ],
      skills: { skills: [unsupported], levelUp: {} },
    })
    const report = auditR13RuntimeCapabilitiesV3(value)

    expect(report.enemySkillReferences).toHaveLength(2)
    expect(report.issues).toHaveLength(2)
    expect(
      report.issues.every((issue) =>
        issue.includes('refused-use:skill-effect:skill-enemy-battle:buffStat'),
      ),
    ).toBe(true)
  })

  test.each([
    {
      owner: 'scene',
      overrides: {
        scene: {
          id: 's001',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'e1',
              sprite: 'sprite.test',
              pos: { col: 0, row: 0, height: 0 },
              behaviors: {
                trigger: {
                  default: {
                    label: 'default',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'initial',
                      stages: [
                        {
                          id: 'initial',
                          body: [
                            {
                              kind: 'startBattle',
                              team: 1,
                              choreography: [
                                {
                                  at: 'battleStart',
                                  body: [{ kind: 'wait', ms: -1 }],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      owner: 'shared',
      overrides: {
        shared: {
          'shared/test': {
            name: 'test',
            description: '',
            self: 'none',
            body: [
              {
                kind: 'startBattle',
                team: 1,
                choreography: [
                  {
                    at: 'battleStart',
                    body: [{ kind: 'wait', ms: -1 }],
                  },
                ],
              },
            ],
          },
        },
      },
    },
    {
      owner: 'item-private',
      overrides: {
        items: [
          {
            id: '1',
            use: {
              effects: [
                {
                  kind: 'itemPrivateScript',
                  name: 'test',
                  script: {
                    body: [
                      {
                        kind: 'startBattle',
                        team: 1,
                        choreography: [
                          {
                            at: 'battleStart',
                            body: [{ kind: 'wait', ms: -1 }],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ])('$owner 内嵌 battle choreography 的已知 kind 非法 payload 也 fail-closed', ({ overrides }) => {
    expect(() => auditR13RuntimeCapabilitiesV3(snapshot(overrides))).toThrow(
      /choreography.*ms: 期望非负有限数/,
    )
  })

  test('unknown battle action 先由 content10 validator 拒绝，不能靠 cast 偷渡', () => {
    const invalid = enemy({
      choreography: [
        {
          at: 'battleStart',
          body: [{ kind: '__future_action__' } as never],
        },
      ],
    })
    expect(() => auditR13RuntimeCapabilitiesV3(snapshot({ enemies: [invalid] }))).toThrow(
      /battle context 不支持动作/,
    )
  })

  test('matrix/use/digest 篡改均 fail-closed', () => {
    const value = snapshot()
    const report = auditR13RuntimeCapabilitiesV3(value)
    const matrixDrift = structuredClone(report)
    matrixDrift.matrix.cells[0]!.status = 'refused'
    reseal(matrixDrift)
    expect(() => assertR13RuntimeCapabilityAuditV3(matrixDrift, value)).toThrow('matrix 漂移')

    const digestDrift = structuredClone(report)
    digestDrift.summary.uses += 1
    expect(() => assertR13RuntimeCapabilityAuditV3(digestDrift, value)).toThrow(
      /summary 漂移|digest 漂移/,
    )
  })
})
