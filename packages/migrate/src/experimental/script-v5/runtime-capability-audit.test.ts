import type { SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  assertHistoricalR13ConfirmRuntimeCapabilityAudit,
  assertR13RuntimeCapabilityAudit,
  auditHistoricalR13ConfirmRuntimeCapabilities,
  auditR13RuntimeCapabilities,
  buildR13RuntimeCapabilityMatrix,
  R13_COMMAND_CONTEXTS,
  R13_SKILL_CONTEXTS,
  type R13RuntimeCapabilityAuditV2,
} from './runtime-capability-audit.js'
import { stableJsonSha256 } from './stable-json.js'

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
    (overrides.scene ?? { id: 's001', entities: [] }) as MigrationJson,
  )
  files.set('content/items.json', (overrides.items ?? []) as MigrationJson)
  files.set('content/shared-scripts.json', (overrides.shared ?? {}) as MigrationJson)
  files.set('content/enemies.json', (overrides.enemies ?? []) as MigrationJson)
  files.set('content/skills.json', (overrides.skills ?? skillFile()) as MigrationJson)
  return { files, managedFiles: new Set(files.keys()) }
}

function reseal(report: R13RuntimeCapabilityAuditV2): void {
  const { digest: _digest, ...withoutDigest } = report
  report.digest = stableJsonSha256(withoutDigest)
}

function skill(id: string, effects: SkillData['effects'] = []): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'self',
    effects,
    animation: { effectSprite: 0 },
  }
}

function skillFile(...skills: SkillData[]) {
  return { skills, levelUp: {} }
}

function entityWithBody(body: unknown[], channel: 'trigger' | 'auto' = 'trigger') {
  return {
    id: 's001',
    entities: [
      {
        id: 'e1',
        sprite: 'sprite.test',
        pos: { col: 0, row: 0, height: 0 },
        behaviors: {
          [channel]: {
            default: {
              label: 'default',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'initial',
                stages: [{ id: 'initial', body }],
              },
            },
          },
        },
      },
    ],
  }
}

describe('R13 runtime capability audit', () => {
  test('has an explicit cell for every declared command and skill context', () => {
    const matrix = buildR13RuntimeCapabilityMatrix()

    expect(matrix.commandCells).toHaveLength(
      matrix.commandKinds.length * R13_COMMAND_CONTEXTS.length,
    )
    expect(matrix.skillCells).toHaveLength(matrix.skillKinds.length * R13_SKILL_CONTEXTS.length)
  })

  test('published R13-confirm matrix keeps historical wait refusal isolated from current', () => {
    const value = snapshot()
    const current = auditR13RuntimeCapabilities(value)
    const historical = auditHistoricalR13ConfirmRuntimeCapabilities(value)
    const currentWait = current.matrix.commandCells.find(
      (cell) => cell.context === 'scene-entry-prepare' && cell.kind === 'wait',
    )
    const historicalWait = historical.matrix.commandCells.find(
      (cell) => cell.context === 'scene-entry-prepare' && cell.kind === 'wait',
    )

    expect(currentWait?.status).toBe('executed')
    expect(historicalWait?.status).toBe('refused')
    expect(stableJsonSha256(current.matrix)).toBe(
      '91abf7787b9eb8994e97df0ab4e0ad4a57e8268ae83c860d36d02830ab78e5fa',
    )
    expect(stableJsonSha256(historical.matrix)).toBe(
      'd25ee2a7940082e20948730c2bd467f659ff3e0b4de19047050b84fe4e42e7a9',
    )
    expect(historical.matrix.commandKinds).not.toContain('holdScreen')
    expect(historical.matrix.commandKinds).not.toContain('revealScreen')
    expect(historical.matrix.skillKinds).not.toContain('resourceDelta')
    expect(historical.digest).not.toBe(current.digest)
    expect(() => assertR13RuntimeCapabilityAudit(historical, value)).toThrow('matrix 漂移')
    expect(() => assertHistoricalR13ConfirmRuntimeCapabilityAudit(current, value)).toThrow(
      'matrix 漂移',
    )
    expect(() => assertHistoricalR13ConfirmRuntimeCapabilityAudit(historical, value)).not.toThrow()
  })

  test('registers real confirm execution without an R13-4 debt', () => {
    const value = snapshot({
      scene: entityWithBody([{ kind: 'confirm', id: 'choice', onNo: [] }]),
    })
    const report = auditR13RuntimeCapabilities(value)

    assertR13RuntimeCapabilityAudit(report, value)
    expect(report.issues).toEqual([])
    expect(report.debts).toEqual([])
    expect(report.uses).toContainEqual(
      expect.objectContaining({
        context: 'world-interactive',
        kind: 'confirm',
        status: 'executed',
        evidenceId: 'reforge:v5-script-confirm-modal',
      }),
    )
    expect(report.summary.openDebts).toBe(0)
  })

  test('propagates auto context through shared calls and fails on refused commands', () => {
    const value = snapshot({
      scene: entityWithBody([{ kind: 'callScript', script: 'shared.exit' }], 'auto'),
      shared: {
        'shared.exit': {
          name: 'exit',
          self: 'none',
          body: [{ kind: 'loadScene', scene: 's002', pos: { col: 0, row: 0, height: 0 } }],
        },
      },
    })
    const report = auditR13RuntimeCapabilities(value)

    expect(report.issues).toEqual([
      expect.stringContaining('unregistered-refused-command:world-auto:loadScene'),
    ])
    expect(() => assertR13RuntimeCapabilityAudit(report, value)).toThrow(
      /unregistered-refused-command/,
    )
  })

  test('audits effects of skills actually referenced by enemy cast rules', () => {
    const report = auditR13RuntimeCapabilities(
      snapshot({
        enemies: [
          {
            id: 'enemy-1',
            ai: {
              rules: [{ at: 'act', do: { kind: 'cast', skillId: 'skill-1' } }],
            },
          },
        ],
        skills: skillFile(
          skill('skill-1', [
            {
              kind: 'buffStat',
              stat: 'attack',
              percent: 10,
              duration: 'battle',
            },
          ]),
        ),
      }),
    )

    expect(report.issues).toEqual([
      expect.stringContaining('unregistered-refused-skill-effect:skill-enemy-battle:buffStat'),
    ])
  })

  test('clears inherited self at a self=none shared boundary', () => {
    const report = auditR13RuntimeCapabilities(
      snapshot({
        scene: entityWithBody([{ kind: 'callScript', script: 'shared.none' }]),
        shared: {
          'shared.none': {
            name: 'none',
            self: 'none',
            body: [{ kind: 'callScript', script: 'shared.required' }],
          },
          'shared.required': {
            name: 'required',
            self: 'required',
            body: [],
          },
        },
      }),
    )

    expect(report.issues).toEqual([
      expect.stringContaining('shared-script-needs-self:shared.required'),
    ])
  })

  test('rejects an explicit self passed to a self=none shared script', () => {
    const report = auditR13RuntimeCapabilities(
      snapshot({
        scene: entityWithBody([
          {
            kind: 'callScript',
            script: 'shared.none',
            self: { scene: 's001', entity: 'e1' },
          },
        ]),
        shared: {
          'shared.none': {
            name: 'none',
            self: 'none',
            body: [],
          },
        },
      }),
    )

    expect(report.issues).toEqual([
      expect.stringContaining('shared-script-rejects-explicit-self:shared.none'),
    ])
  })

  test('typed throw effects are independent from item script capability audit', () => {
    const value = snapshot()
    value.files.set('content/items.json', [
      {
        id: '1',
        throw: {
          target: 'oneEnemy',
          effects: [{ kind: 'fixedDamage', amount: 10 }],
        },
      },
    ] as MigrationJson)

    const report = auditR13RuntimeCapabilities(value)

    expect(report.issues).toEqual([])
  })

  test('executes confirm deterministically across all three world contexts', () => {
    const flow = (body: unknown[]) => ({
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body }],
    })
    const value = snapshot({
      scene: {
        id: 's001',
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
                  flow: flow([{ kind: 'confirm', id: 'trigger', onNo: [] }]),
                },
              },
              auto: {
                default: {
                  label: 'default',
                  order: 0,
                  flow: flow([{ kind: 'confirm', id: 'auto', onNo: [] }]),
                },
              },
            },
          },
        ],
      },
      items: [
        {
          id: '1',
          use: {
            effects: [
              {
                kind: 'itemPrivateScript',
                name: 'confirm',
                script: {
                  body: [{ kind: 'confirm', id: 'item', onNo: [] }],
                },
              },
            ],
          },
        },
      ],
    })
    const report = auditR13RuntimeCapabilities(value)

    assertR13RuntimeCapabilityAudit(report, value)
    expect(report.debts).toEqual([])
    expect(
      report.uses
        .filter((use) => use.domain === 'command' && use.kind === 'confirm')
        .map(({ context, status, evidenceId }) => ({ context, status, evidenceId })),
    ).toEqual([
      {
        context: 'item-private-world',
        status: 'executed',
        evidenceId: 'reforge:v5-script-confirm-modal',
      },
      {
        context: 'world-auto',
        status: 'executed',
        evidenceId: 'reforge:v5-script-confirm-modal',
      },
      {
        context: 'world-interactive',
        status: 'executed',
        evidenceId: 'reforge:v5-script-confirm-modal',
      },
    ])
    expect(report.summary.openDebts).toBe(0)
  })

  test('keeps opaque skill ids distinct and records zero-effect cast sites', () => {
    const value = snapshot({
      enemies: [
        {
          id: 'enemy-1',
          ai: {
            rules: [
              { at: 'act', do: { kind: 'cast', skillId: '0296' } },
              { at: 'act', do: { kind: 'cast', skillId: '0296' } },
              { at: 'act', do: { kind: 'cast', skillId: '296' } },
            ],
          },
        },
      ],
      skills: skillFile(skill('0296'), skill('296', [{ kind: 'healHp', amount: 1 }])),
    })
    const report = auditR13RuntimeCapabilities(value)

    assertR13RuntimeCapabilityAudit(report, value)
    expect(
      report.enemyCasts.map(({ skillId, effectKinds }) => ({
        skillId,
        effectKinds,
      })),
    ).toEqual([
      { skillId: '0296', effectKinds: [] },
      { skillId: '0296', effectKinds: [] },
      { skillId: '296', effectKinds: ['healHp'] },
    ])
    expect(report.summary).toEqual(
      expect.objectContaining({
        enemyCastRules: 3,
        enemyDistinctSkillIds: 2,
        enemyEffectUses: 1,
      }),
    )
  })

  test('rejects a resealed debt or summary drift', () => {
    const value = snapshot({
      scene: entityWithBody([{ kind: 'confirm', id: 'choice', onNo: [] }]),
    })
    const summaryDrift = structuredClone(auditR13RuntimeCapabilities(value))
    summaryDrift.summary.openDebts = 1
    reseal(summaryDrift)
    expect(() => assertR13RuntimeCapabilityAudit(summaryDrift, value)).toThrow(/summary 漂移/)

    const debtDrift = structuredClone(auditR13RuntimeCapabilities(value))
    debtDrift.debts.push({
      id: 'r13-runtime:world-interactive:confirm',
      batch: 'R13-4',
      behavior: 'constant-result',
      context: 'world-interactive',
      kind: 'confirm',
      sites: ['scene(s001)/entity(e1)/trigger/default/stage(initial)/body/0:confirm'],
    })
    debtDrift.summary.openDebts = 1
    reseal(debtDrift)
    expect(() => assertR13RuntimeCapabilityAudit(debtDrift, value)).toThrow(
      /debts\/confirm uses 漂移/,
    )
  })

  test('source-backed validation rejects a resealed non-refused issue deletion', () => {
    const value = snapshot({
      items: [
        {
          id: '1',
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                name: 'illegal',
                script: { body: [{ kind: 'vanishEntity' }] },
              },
            ],
          },
        },
      ],
    })
    const report = auditR13RuntimeCapabilities(value)
    expect(report.uses).toContainEqual(
      expect.objectContaining({
        domain: 'command',
        context: 'item-private-world',
        kind: 'vanishEntity',
        status: 'executed',
      }),
    )
    expect(report.issues).toEqual([expect.stringContaining('command-needs-self')])
    report.issues = []
    reseal(report)

    expect(() => assertR13RuntimeCapabilityAudit(report, value)).toThrow(
      /snapshot-backed rebuild 漂移/,
    )
  })

  test('rejects an unknown use domain before treating it as a skill effect', () => {
    const value = snapshot({
      skills: skillFile(skill('skill-1', [{ kind: 'healHp', amount: 1 }])),
    })
    const report = auditR13RuntimeCapabilities(value)
    ;(report.uses[0] as unknown as { domain: string }).domain = 'unknown'
    reseal(report)

    expect(() => assertR13RuntimeCapabilityAudit(report, value)).toThrow(/use domain 无效/)
  })

  test('rejects resealed enemy cast provenance or counters', () => {
    const value = snapshot({
      enemies: [
        {
          id: 'enemy-1',
          ai: {
            rules: [{ at: 'act', do: { kind: 'cast', skillId: 'skill-1' } }],
          },
        },
      ],
      skills: skillFile(skill('skill-1', [{ kind: 'healHp', amount: 1 }])),
    })
    const counterDrift = structuredClone(auditR13RuntimeCapabilities(value))
    counterDrift.summary.enemyCastRules = 2
    reseal(counterDrift)
    expect(() => assertR13RuntimeCapabilityAudit(counterDrift, value)).toThrow(/summary 漂移/)

    const provenanceDrift = structuredClone(auditR13RuntimeCapabilities(value))
    provenanceDrift.enemyCasts[0]!.effectKinds = []
    provenanceDrift.summary.enemyEffectUses = 0
    reseal(provenanceDrift)
    expect(() => assertR13RuntimeCapabilityAudit(provenanceDrift, value)).toThrow(
      /enemy casts\/effect uses 漂移/,
    )
  })
})
