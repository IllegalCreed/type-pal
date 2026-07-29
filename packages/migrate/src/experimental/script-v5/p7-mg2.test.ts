import { SCRIPT_V4_V5_SIDECAR_PATH, SCRIPT_V4_V5_TRANSITION_ID } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { createP7V5MigrationPlan, P7_FULL_LEDGER_PATH } from './p7-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

function signed<T extends Record<string, unknown>>(value: T): T & { digest: string } {
  return { ...value, digest: stableJsonSha256(value) }
}

function controls() {
  const sourceAuditDigest = 'a'.repeat(64)
  const compatibility = signed({
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
  })
  const ledger = signed({
    kind: 'script-identity-transition',
    version: 1,
    projectId: 'pal',
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    sourceAudit: { digest: sourceAuditDigest },
    compatibility,
  })
  const sidecar = signed({
    version: 1,
    projectId: 'pal',
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    fromContentVersion: 4,
    toContentVersion: 5,
    sourceAuditDigest,
    provenance: { kind: 'pal-baseline', fullLedgerDigest: ledger.digest },
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
  })
  return { ledger, sidecar }
}

function scene(start: string, done = ''): MigrationJson {
  return {
    id: 's001',
    entities: [
      {
        id: 'e1',
        initialPage: 'default',
        pages: [{ id: 'default', label: '默认' }],
        behaviors: {
          trigger: {
            talk: {
              label: '对话',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [
                  { id: 'start', body: [{ kind: 'say', text: start }], next: 'done' },
                  { id: 'done', body: [], label: done },
                ],
              },
            },
          },
        },
      },
    ],
  }
}

function snapshots() {
  const { ledger, sidecar } = controls()
  const common = new Set([
    'content/scenes/index.json',
    'content/scenes/s001.json',
    'content/shared-scripts.json',
    SCRIPT_V4_V5_SIDECAR_PATH,
  ])
  const base: MigrationSnapshot = {
    files: new Map([
      ['content/scenes/index.json', ['s001']],
      ['content/scenes/s001.json', scene('旧')],
      ['content/shared-scripts.json', {}],
      [SCRIPT_V4_V5_SIDECAR_PATH, sidecar as unknown as MigrationJson],
      [P7_FULL_LEDGER_PATH, ledger as unknown as MigrationJson],
    ]),
    managedFiles: new Set([...common, P7_FULL_LEDGER_PATH]),
    baselineMetadata: {
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { [SCRIPT_V4_V5_TRANSITION_ID]: ledger.digest },
    },
  }
  const ours: MigrationSnapshot = {
    files: new Map([
      ['content/scenes/index.json', ['s001']],
      ['content/scenes/s001.json', scene('作者')],
      ['content/shared-scripts.json', {}],
      [SCRIPT_V4_V5_SIDECAR_PATH, sidecar as unknown as MigrationJson],
    ]),
    managedFiles: common,
  }
  const generated: MigrationSnapshot = {
    files: new Map([
      ['content/scenes/index.json', ['s001']],
      ['content/scenes/s001.json', scene('旧', '上游标签')],
      ['content/shared-scripts.json', {}],
    ]),
    managedFiles: new Set([
      'content/scenes/index.json',
      'content/scenes/s001.json',
      'content/shared-scripts.json',
    ]),
  }
  return { base, ours, generated, sidecar }
}

describe('P7 canonical v5 MG2', () => {
  test('merges author and upstream edits by canonical StageId and retains immutable controls', () => {
    const { base, ours, generated, sidecar } = snapshots()
    const result = createP7V5MigrationPlan({ base, ours, generated })
    expect(result.plan.conflicts).toEqual([])
    expect(result.plan.writes.has('content/scenes/s001.json')).toBe(true)
    expect(result.target.files.get('content/scenes/s001.json')).toMatchObject({
      entities: [
        {
          behaviors: {
            trigger: {
              talk: {
                flow: {
                  stages: [
                    { id: 'start', body: [{ kind: 'say', text: '作者' }] },
                    { id: 'done', label: '上游标签' },
                  ],
                },
              },
            },
          },
        },
      ],
    })
    expect(result.target.files.has(P7_FULL_LEDGER_PATH)).toBe(false)
    expect(result.nextBaseline.files.get(SCRIPT_V4_V5_SIDECAR_PATH)).toEqual(sidecar)
    expect(result.nextBaseline.files.has(P7_FULL_LEDGER_PATH)).toBe(true)
    expect(result.nextBaseline.baselineMetadata).toEqual(base.baselineMetadata)

    const baselineScene = result.nextBaseline.files.get('content/scenes/s001.json') as {
      entities: Array<{
        behaviors: {
          trigger: {
            talk: {
              flow: { stages: Array<{ body: Array<{ text?: string }> }> }
            }
          }
        }
      }>
    }
    baselineScene.entities[0]!.behaviors.trigger.talk.flow.stages[0]!.body[0]!.text = '改写返回值'
    expect(generated.files.get('content/scenes/s001.json')).toEqual(scene('旧', '上游标签'))
  })

  test('same canonical stage conflict keeps writes and deletes at zero', () => {
    const { base, ours, generated } = snapshots()
    generated.files.set('content/scenes/s001.json', scene('上游'))
    const result = createP7V5MigrationPlan({ base, ours, generated })
    expect(result.plan.conflicts).toMatchObject([
      { path: expect.stringContaining('/stages/@string:start/body'), type: 'value' },
    ])
    expect(result.plan.writes.size).toBe(0)
    expect(result.plan.deletes).toEqual([])
  })

  test('rejects sidecar mutation instead of recursively merging control bytes', () => {
    const { base, ours, generated } = snapshots()
    const sidecar = ours.files.get(SCRIPT_V4_V5_SIDECAR_PATH) as Record<string, MigrationJson>
    ours.files.set(SCRIPT_V4_V5_SIDECAR_PATH, { ...sidecar, sourceAuditDigest: 'b'.repeat(64) })
    expect(() => createP7V5MigrationPlan({ base, ours, generated })).toThrow(/sidecar 被修改或缺失/)
  })

  test('rejects project full-ledger pollution and a baseline/project sidecar re-sign', () => {
    const polluted = snapshots()
    polluted.ours.files.set(
      P7_FULL_LEDGER_PATH,
      structuredClone(polluted.base.files.get(P7_FULL_LEDGER_PATH)!),
    )
    polluted.ours.managedFiles.add(P7_FULL_LEDGER_PATH)
    expect(() =>
      createP7V5MigrationPlan({
        base: polluted.base,
        ours: polluted.ours,
        generated: polluted.generated,
      }),
    ).toThrow(/project 不得携带/)

    const resigned = snapshots()
    const previous = resigned.sidecar as unknown as Record<string, MigrationJson>
    const { digest: _digest, ...body } = previous
    const changed = signed({ ...body, sourceAuditDigest: 'b'.repeat(64) })
    resigned.base.files.set(SCRIPT_V4_V5_SIDECAR_PATH, changed as unknown as MigrationJson)
    resigned.ours.files.set(
      SCRIPT_V4_V5_SIDECAR_PATH,
      structuredClone(changed) as unknown as MigrationJson,
    )
    expect(() =>
      createP7V5MigrationPlan({
        base: resigned.base,
        ours: resigned.ours,
        generated: resigned.generated,
      }),
    ).toThrow(/source audit/)
  })
})
