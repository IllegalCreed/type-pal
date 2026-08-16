import { describe, expect, test } from 'vitest'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import {
  buildC1NpcCandidateReport,
  type C1NpcCandidateCensus,
  type C1NpcCandidateReportV1,
} from './pal-c1-npc-candidate-report.js'
import {
  assertC1NpcDecisionLedger,
  attachC1NpcDecisionApproval,
  buildC1NpcDecisionLedgerDraft,
  prepareC1NpcDecisionAuthority,
  projectPreparedC1NpcCuration,
  type C1NpcActorDecisionV1,
} from './pal-c1-npc-curation-ledger.js'
import {
  buildC1NpcSourceEvidence,
  prepareC1NpcSourceEvidence,
  type PreparedC1NpcSourceEvidence,
} from './pal-c1-npc-source-evidence.js'
import type { MigrationJson } from './pal-migration.js'

const C1_DIGEST = 'c'.repeat(64)

function syntheticScene(): MigrationJson {
  const identity = {
    kind: 'unbound',
    speaker: 'spk.npc',
    portrait: { asset: 'portrait.npc', side: 'left' },
  }
  return {
    id: 's000',
    mapId: 'map.test',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'sprite.npc',
      },
    ],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '默认',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [
                {
                  id: 'initial',
                  body: [
                    {
                      kind: 'dialog',
                      cue: { identity: structuredClone(identity), rows: [{ text: 'dlg.7' }] },
                    },
                    {
                      kind: 'dialog',
                      cue: { identity: structuredClone(identity), rows: [{ text: 'dlg.7' }] },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  } as MigrationJson
}

function setFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  snapshot.files.set(path, value)
  snapshot.managedFiles.add(path)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
}

function syntheticSnapshot(): MigrationSnapshot {
  const snapshot: MigrationSnapshot = {
    files: new Map(),
    managedFiles: new Set(),
    hashes: new Map(),
    baselineMetadata: {
      generatorEpoch: 'synthetic-c1-3',
      transitions: { 'c1-dialogue-identity-v1': C1_DIGEST },
    },
  }
  setFile(snapshot, 'content/scenes/index.json', ['s000'])
  setFile(snapshot, 'content/scenes/s000.json', syntheticScene())
  setFile(snapshot, 'content/actors.json', [])
  setFile(snapshot, 'content/locale.json', {
    'spk.npc': '甲',
    'dlg.7': '同一句',
  })
  setFile(snapshot, 'content/items.json', [])
  setFile(snapshot, 'content/shared-scripts.json', {})
  setFile(snapshot, 'content/enemies.json', [])
  return snapshot
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function expectedCensus(): C1NpcCandidateCensus {
  return {
    entities: { total: 1, actor: 0, sprite: 1, zone: 0 },
    cues: { total: 2, narration: 0, unbound: 2, actor: 0 },
    sources: { scenes: 2, items: 0, sharedScripts: 0, enemies: 0 },
    partitions: {
      'scene-entry': 0,
      'scene-hooks-onEnter': 2,
      'scene-hooks-onTeleport': 0,
      'scene-entity-pages': 0,
      'scene-entity-trigger': 0,
      'scene-entity-auto': 0,
      'scene-entity-hostile': 0,
      'item-private': 0,
      'shared-body': 0,
      'enemy-ai-hooks': 0,
      'enemy-onDefeated': 0,
      'enemy-choreography': 0,
    },
  }
}

function report(snapshot = syntheticSnapshot()): C1NpcCandidateReportV1 {
  return buildC1NpcCandidateReport({
    snapshot,
    c1SealDigest: C1_DIGEST,
    expectedCensus: expectedCensus(),
  })
}

function sourceEvidence(candidateReport: C1NpcCandidateReportV1): PreparedC1NpcSourceEvidence {
  const evidence = buildC1NpcSourceEvidence({
    report: candidateReport,
    sourceCommands: [
      { op: 'showDialog', messageIndex: 7, text: '同一句' } as never,
    ],
    locale: { 'dlg.7': '同一句' },
    sourceFileSha256: 'b'.repeat(64),
    expectedDialogueCandidates: 2,
  })
  return prepareC1NpcSourceEvidence({ report: candidateReport, evidence })
}

function actorDecision(
  candidateReport: C1NpcCandidateReportV1,
  sourceAuthority = sourceEvidence(candidateReport),
): C1NpcActorDecisionV1 {
  const entity = candidateReport.sites.find((site) => site.kind === 'entity')
  const dialogues = candidateReport.sites.filter((site) => site.kind === 'dialogue')
  if (!entity || dialogues.length !== 2) throw new Error('synthetic candidate report 漂移')
  return {
    mode: 'entity-and-dialogue-sites',
    actor: {
      id: 'npc-a',
      name: 'name.npc-a',
      spriteId: 'sprite.npc',
      portraits: { default: 'portrait.npc' },
    },
    locale: [{ key: 'name.npc-a', parent: null, successor: '甲' }],
    entitySites: [
      {
        candidateId: entity.id,
        source: { sceneId: 's000', eventObjectId: 1 },
      },
    ],
    dialogueSites: dialogues.map((site) => ({
      candidateId: site.id,
      source: structuredClone(
        sourceAuthority.evidence.entries.find((entry) => entry.candidateId === site.id)!.source,
      ),
      successorIdentity: {
        kind: 'actor',
        actor: 'npc-a',
        portrait: { kind: 'default', side: 'left' },
      },
    })),
  }
}

function approvedBundle(
  candidateReport: C1NpcCandidateReportV1,
  mutate?: (decision: C1NpcActorDecisionV1) => void,
) {
  const sourceAuthority = sourceEvidence(candidateReport)
  const decision = actorDecision(candidateReport, sourceAuthority)
  mutate?.(decision)
  const draft = buildC1NpcDecisionLedgerDraft({
    report: candidateReport,
    sourceEvidence: sourceAuthority,
    batchId: 'synthetic-batch-001',
    actors: [decision],
  })
  return {
    sourceAuthority,
    ledger: attachC1NpcDecisionApproval({
      draft,
      approvedLedgerDigest: draft.contentDigest,
      approvedAt: '2026-08-14T00:00:00.000Z',
    }),
  }
}

describe('C1-3 candidate report authority boundary', () => {
  test('keeps identical dialogue leaves as distinct canonical occurrences', () => {
    const value = report()
    const dialogues = value.sites.filter((site) => site.kind === 'dialogue')
    expect(value.authority).toBe('read-only-candidate-evidence')
    expect(value.summary.candidates).toEqual({ entities: 1, dialogues: 2, total: 3 })
    expect(dialogues.map((site) => site.leafSha256)).toEqual([
      dialogues[0]!.leafSha256,
      dialogues[0]!.leafSha256,
    ])
    expect(new Set(dialogues.map((site) => site.id)).size).toBe(2)
    expect(new Set(dialogues.map((site) => site.pointer)).size).toBe(2)
    expect(value.groups).toHaveLength(2)
  })

  test('fails when any declared source/partition census is omitted', () => {
    const expected = expectedCensus()
    expected.sources.items = 1
    expected.partitions['item-private'] = 1
    expected.cues.total = 3
    expected.cues.unbound = 3
    expect(() =>
      buildC1NpcCandidateReport({
        snapshot: syntheticSnapshot(),
        c1SealDigest: C1_DIGEST,
        expectedCensus: expected,
      }),
    ).toThrow(/census 漂移/)
  })
})

describe('C1-3 strict decision ledger and synthetic projector', () => {
  test('projects only exact approved sites, preserves display semantics, and never mutates parent', () => {
    const parent = syntheticSnapshot()
    const before = structuredClone(parent.files.get('content/scenes/s000.json'))
    const candidateReport = report(parent)
    const { ledger, sourceAuthority } = approvedBundle(candidateReport)
    const prepared = prepareC1NpcDecisionAuthority({
      report: candidateReport,
      sourceEvidence: sourceAuthority,
      ledger,
      parent,
    })
    const result = projectPreparedC1NpcCuration(parent, prepared)

    expect(parent.files.get('content/scenes/s000.json')).toEqual(before)
    expect(result.changedFiles).toEqual([
      'content/actors.json',
      'content/locale.json',
      'content/scenes/s000.json',
    ])
    expect(result.authorityDigest).toBe(ledger.digest)
    const scene = result.snapshot.files.get('content/scenes/s000.json') as Record<string, unknown>
    const entity = (scene.entities as Array<Record<string, unknown>>)[0]!
    expect(entity.actor).toBe('npc-a')
    expect(entity.sprite).toBeUndefined()
    const hooks = scene.hooks as Record<string, unknown>
    const onEnter = hooks.onEnter as Record<string, unknown>
    const variants = onEnter.variants as Record<string, unknown>
    const defaultVariant = variants.default as Record<string, unknown>
    const flow = defaultVariant.flow as Record<string, unknown>
    const body = ((flow.stages as Array<Record<string, unknown>>)[0]!.body ?? []) as Array<
      Record<string, unknown>
    >
    expect(body.map((command) => (command.cue as Record<string, unknown>).identity)).toEqual([
      {
        kind: 'actor',
        actor: 'npc-a',
        portrait: { kind: 'default', side: 'left' },
      },
      {
        kind: 'actor',
        actor: 'npc-a',
        portrait: { kind: 'default', side: 'left' },
      },
    ])
    expect(ledger.candidateClosure).toEqual({
      total: 3,
      accepted: { count: 3, digest: expect.any(String) },
      rejected: { count: 0, digest: stableJsonSha256([]) },
      deferred: { count: 0, digest: stableJsonSha256([]) },
    })
  })

  test('rejects approval digest A after any ledger content changes to B', () => {
    const candidateReport = report()
    const sourceAuthority = sourceEvidence(candidateReport)
    const original = buildC1NpcDecisionLedgerDraft({
      report: candidateReport,
      sourceEvidence: sourceAuthority,
      batchId: 'synthetic-batch-001',
      actors: [actorDecision(candidateReport, sourceAuthority)],
    })
    const changedDecision = actorDecision(candidateReport, sourceAuthority)
    changedDecision.locale[0]!.successor = '另一个名字'
    const changed = buildC1NpcDecisionLedgerDraft({
      report: candidateReport,
      sourceEvidence: sourceAuthority,
      batchId: 'synthetic-batch-001',
      actors: [changedDecision],
    })
    expect(changed.contentDigest).not.toBe(original.contentDigest)
    expect(() =>
      attachC1NpcDecisionApproval({
        draft: changed,
        approvedLedgerDigest: original.contentDigest,
        approvedAt: '2026-08-14T00:00:00.000Z',
      }),
    ).toThrow(/批准的是其他 ledger digest/)
  })

  test('rejects unknown ledger fields and resolved speaker/portrait/side drift', () => {
    const parent = syntheticSnapshot()
    const candidateReport = report(parent)
    const { ledger: valid } = approvedBundle(candidateReport)
    expect(() =>
      assertC1NpcDecisionLedger({ ...valid, wildcardSpeaker: 'spk.npc' } as never),
    ).toThrow(/未知字段/)

    const { ledger: mismatchLedger, sourceAuthority } = approvedBundle(
      candidateReport,
      (decision) => {
        decision.actor.portraits = { default: 'portrait.other' }
      },
    )
    expect(() =>
      prepareC1NpcDecisionAuthority({
        report: candidateReport,
        sourceEvidence: sourceAuthority,
        ledger: mismatchLedger,
        parent,
      }),
    ).toThrow(/resolved speaker\/portrait\/side 漂移/)
  })

  test('rejects a decision whose approved source row no longer matches prepared evidence', () => {
    const parent = syntheticSnapshot()
    const candidateReport = report(parent)
    const sourceAuthority = sourceEvidence(candidateReport)
    const decision = actorDecision(candidateReport, sourceAuthority)
    decision.dialogueSites[0]!.source.rows[0]!.sourceAddress += 1
    decision.dialogueSites[0]!.source.rowsDigest = stableJsonSha256(
      decision.dialogueSites[0]!.source.rows,
    )
    const draft = buildC1NpcDecisionLedgerDraft({
      report: candidateReport,
      sourceEvidence: sourceAuthority,
      batchId: 'synthetic-source-drift',
      actors: [decision],
    })
    const ledger = attachC1NpcDecisionApproval({
      draft,
      approvedLedgerDigest: draft.contentDigest,
      approvedAt: '2026-08-14T00:00:00.000Z',
    })
    expect(() =>
      prepareC1NpcDecisionAuthority({
        report: candidateReport,
        sourceEvidence: sourceAuthority,
        ledger,
        parent,
      }),
    ).toThrow(/dialogue source evidence 漂移/)
  })

  test('rejects stale canonical leaf before writing any clone result', () => {
    const parent = syntheticSnapshot()
    const candidateReport = report(parent)
    const { ledger, sourceAuthority } = approvedBundle(candidateReport)
    const prepared = prepareC1NpcDecisionAuthority({
      report: candidateReport,
      sourceEvidence: sourceAuthority,
      ledger,
      parent,
    })
    const stale = cloneSnapshot(parent)
    const scene = stale.files.get('content/scenes/s000.json') as Record<string, unknown>
    const hooks = scene.hooks as Record<string, unknown>
    const onEnter = hooks.onEnter as Record<string, unknown>
    const variants = onEnter.variants as Record<string, unknown>
    const variant = variants.default as Record<string, unknown>
    const flow = variant.flow as Record<string, unknown>
    const stage = (flow.stages as Array<Record<string, unknown>>)[0]!
    const first = (stage.body as Array<Record<string, unknown>>)[0]!
    ;((first.cue as Record<string, unknown>).identity as Record<string, unknown>).speaker = 'spk.changed'
    setFile(stale, 'content/scenes/s000.json', scene as MigrationJson)
    expect(() => projectPreparedC1NpcCuration(stale, prepared)).toThrow(/canonical leaf 漂移/)
    expect(parent.files.get('content/scenes/s000.json')).not.toEqual(
      stale.files.get('content/scenes/s000.json'),
    )
  })
})
