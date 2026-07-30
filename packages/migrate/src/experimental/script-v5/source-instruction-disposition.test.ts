import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { SourceEntrySite } from '../../script-control-flow-audit.js'
import { buildR13SourceExecutionCensusFromGraph } from './source-execution-census.js'
import {
  assertR13SourceInstructionDisposition,
  assertR13SourceInstructionDispositionV3,
  digestR13ContentSnapshot,
  type R13DispositionEvidence,
  type R13SourceInstructionDispositionV1,
  sealR13SourceInstructionDisposition,
  sealR13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'

const DISPOSITIONS = [
  'translated',
  'structured',
  'folded',
  'asset-baked',
  'runtime-equivalent',
  'explicit-noop',
  'approved-lossy',
  'open-debt',
] as const

function reportWithOpenSite(): R13SourceInstructionDispositionV1 {
  const entry: SourceEntrySite = {
    kind: 'entity-trigger',
    sourceId: 'scenes/s001/e1/trigger',
    owner: 's001/e1',
    entry: 0,
    channel: 'trigger',
  }
  const census = buildR13SourceExecutionCensusFromGraph([{ op: 'end' }], [entry])
  const site = census.sites[0]!
  const context = census.contexts.find((candidate) => candidate.id === site.contextId)!
  const instruction = census.instructions[site.address]!
  const evidence: R13DispositionEvidence = {
    id: 'open-debt:test',
    addresses: [site.address],
    scope: 'open-debt',
    kind: 'open-debt',
    batch: 'R13-0',
    reason: 'test-open',
    sourceRootId: context.entrySiteId,
    siteId: site.id,
    contextId: site.contextId,
    sourceCommandSha256: instruction.sourceCommandSha256,
    appliesToLayers: ['raw', 'augmented', 'final'],
  }
  return sealR13SourceInstructionDisposition({
    kind: 'r13-source-instruction-disposition',
    version: 1,
    methodVersion: 'n3-p7-r13-source-instruction-disposition-v2',
    generator: {
      sourceDigest: census.generator.sourceDigest,
      rawDigest: '1'.repeat(64),
      augmentedDigest: '2'.repeat(64),
      finalDigest: '3'.repeat(64),
    },
    census,
    evidence: [evidence],
    dispositions: [
      {
        siteId: site.id,
        disposition: 'open-debt',
        evidenceIds: [evidence.id],
        candidateEvidenceIds: [],
        layers: {
          raw: { state: 'open', evidenceIds: [evidence.id] },
          augmented: { state: 'open', evidenceIds: [evidence.id] },
          final: { state: 'open', evidenceIds: [evidence.id] },
        },
      },
    ],
    observations: [],
    summary: {
      instructions: 1,
      reachableInstructions: 1,
      executionSites: 1,
      dispositionSites: 1,
      byDisposition: Object.fromEntries(
        DISPOSITIONS.map((disposition) => [disposition, disposition === 'open-debt' ? 1 : 0]),
      ) as R13SourceInstructionDispositionV1['summary']['byDisposition'],
      byLayer: {
        raw: { accounted: 0, open: 1 },
        augmented: { accounted: 0, open: 1 },
        final: { accounted: 0, open: 1 },
      },
      openDebtSites: 1,
      openDebtSourceAddresses: 1,
      observations: 0,
      openObservations: 0,
    },
  })
}

function reseal(report: R13SourceInstructionDispositionV1): void {
  const { digest: _digest, ...withoutDigest } = report
  report.digest = sealR13SourceInstructionDisposition(withoutDigest).digest
}

describe('R13 source instruction disposition', () => {
  test('normalizes managed tombstones while hashing actual layer content', () => {
    const withTombstone: MigrationSnapshot = {
      files: new Map([['content/a.json', { value: 1 }]]),
      managedFiles: new Set(['content/a.json', 'content/deleted.json']),
    }
    const reloaded: MigrationSnapshot = {
      files: new Map([['content/a.json', { value: 1 }]]),
      managedFiles: new Set(['content/a.json']),
    }
    const changed: MigrationSnapshot = {
      files: new Map([['content/a.json', { value: 2 }]]),
      managedFiles: new Set(['content/a.json']),
    }

    expect(digestR13ContentSnapshot(withTombstone)).toBe(digestR13ContentSnapshot(reloaded))
    expect(digestR13ContentSnapshot(changed)).not.toBe(digestR13ContentSnapshot(reloaded))
  })

  test('accepts a complete fail-closed open-site ledger', () => {
    assertR13SourceInstructionDisposition(reportWithOpenSite())
  })

  test('public assert always rejects an unsealed generator drift', () => {
    const report = reportWithOpenSite()
    report.generator.rawDigest = 'f'.repeat(64)

    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(/digest 漂移/)
  })

  test('rejects a v2 ledger relabeled and resealed as v3 without confirm closure', () => {
    const {
      digest: _digest,
      version: _version,
      methodVersion: _method,
      ...body
    } = reportWithOpenSite()
    const report = sealR13SourceInstructionDispositionV3({
      ...body,
      version: 3,
      methodVersion: 'n3-p7-r13-source-instruction-disposition-v3',
    })
    expect(() => assertR13SourceInstructionDispositionV3(report)).toThrow(/confirm v2\/v3 closure/)
  })

  test('never lets candidate evidence close an execution site', () => {
    const report = reportWithOpenSite()
    const site = report.census.sites[0]!
    const candidate: R13DispositionEvidence = {
      id: 'canonical-body:test',
      addresses: [site.address],
      scope: 'candidate',
      kind: 'canonical-body',
      bodyId: 'body:test',
      bodyCategory: 'scene-root',
      productDigest: '4'.repeat(64),
    }
    report.evidence.push(candidate)
    report.evidence.sort((left, right) => left.id.localeCompare(right.id))
    const disposition = report.dispositions[0]!
    disposition.disposition = 'structured'
    disposition.evidenceIds = [candidate.id]
    for (const layer of ['raw', 'augmented', 'final'] as const)
      disposition.layers[layer] = {
        state: 'accounted',
        evidenceIds: [candidate.id],
      }
    reseal(report)

    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(/scope 不能销 site/)
  })

  test('requires closure evidence to bind the exact source command and context', () => {
    const report = reportWithOpenSite()
    const site = report.census.sites[0]!
    const closure: R13DispositionEvidence = {
      id: 'runtime-equivalent:test',
      addresses: [site.address],
      scope: 'site-closure',
      kind: 'runtime-equivalent',
      siteId: site.id,
      contextId: site.contextId,
      sourceCommandSha256: 'f'.repeat(64),
      appliesToLayers: ['raw', 'augmented', 'final'],
      proves: 'runtime-equivalent',
      capabilityId: 'test-capability',
      verificationId: 'test-verification',
    }
    report.evidence = [closure]
    const disposition = report.dispositions[0]!
    disposition.disposition = 'runtime-equivalent'
    disposition.evidenceIds = [closure.id]
    for (const layer of ['raw', 'augmented', 'final'] as const)
      disposition.layers[layer] = {
        state: 'accounted',
        evidenceIds: [closure.id],
      }
    reseal(report)

    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(/非精确 site closure/)
  })

  test('never closes final when its exact canonical target differs from generated', () => {
    const report = reportWithOpenSite()
    const site = report.census.sites[0]!
    const instruction = report.census.instructions[site.address]!
    const targetSet: R13DispositionEvidence = {
      id: 'canonical-target-set:target-drift',
      addresses: [site.address],
      scope: 'candidate',
      kind: 'canonical-target-set',
      bodyIds: ['body:test'],
      appliesToLayers: ['raw', 'augmented', 'final'],
      layerTargets: {
        raw: {
          selectors: ['content/scripts/a.json#scripts/body:test'],
          digests: ['8'.repeat(64)],
        },
        augmented: {
          selectors: ['content/scenes/s001.json#entity/e1/flow'],
          digests: ['9'.repeat(64)],
        },
        final: {
          selectors: ['content/scenes/s001.json#entity/e1/flow'],
          digests: ['a'.repeat(64)],
        },
      },
    }
    const closure: R13DispositionEvidence = {
      id: 'canonical-site:target-drift',
      addresses: [site.address],
      scope: 'site-closure',
      kind: 'canonical-site',
      siteId: site.id,
      contextId: site.contextId,
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: ['raw', 'augmented', 'final'],
      proves: 'translated',
      translationOutcomeDigest: '4'.repeat(64),
      bodyAuditDigest: '5'.repeat(64),
      bodyIds: ['body:test'],
      p6LedgerDigest: '6'.repeat(64),
      p6EvidenceIds: ['p6:test'],
      p6TargetDigest: '7'.repeat(64),
      targetSetEvidenceId: targetSet.id,
    }
    report.evidence = [closure, targetSet]
    const disposition = report.dispositions[0]!
    disposition.disposition = 'translated'
    disposition.evidenceIds = [closure.id]
    for (const layer of ['raw', 'augmented', 'final'] as const)
      disposition.layers[layer] = {
        state: 'accounted',
        evidenceIds: [closure.id],
      }
    const closureRecord = closure as unknown as Record<string, unknown>
    closureRecord.unexpected = true
    reseal(report)
    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(/canonical-site 字段漂移/)

    delete closureRecord.unexpected
    reseal(report)
    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(
      /final target 未与纯生成结果精确相等/,
    )
  })

  test('allows an explicit no-op only with an exact verified site oracle', () => {
    const report = reportWithOpenSite()
    const site = report.census.sites[0]!
    const instruction = report.census.instructions[site.address]!
    const closure: R13DispositionEvidence = {
      id: 'verified-noop:test',
      addresses: [site.address],
      scope: 'site-closure',
      kind: 'verified-noop',
      siteId: site.id,
      contextId: site.contextId,
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: ['raw', 'augmented', 'final'],
      proves: 'explicit-noop',
      oracleId: 'sdlpal:test',
      verificationDigest: 'e'.repeat(64),
    }
    report.evidence = [closure]
    const disposition = report.dispositions[0]!
    disposition.disposition = 'explicit-noop'
    disposition.evidenceIds = [closure.id]
    for (const layer of ['raw', 'augmented', 'final'] as const)
      disposition.layers[layer] = {
        state: 'accounted',
        evidenceIds: [closure.id],
      }
    report.summary.byDisposition['open-debt'] = 0
    report.summary.byDisposition['explicit-noop'] = 1
    report.summary.byLayer = {
      raw: { accounted: 1, open: 0 },
      augmented: { accounted: 1, open: 0 },
      final: { accounted: 1, open: 0 },
    }
    report.summary.openDebtSites = 0
    report.summary.openDebtSourceAddresses = 0
    reseal(report)

    assertR13SourceInstructionDisposition(report)
  })

  test('rejects synthetic resolved observations', () => {
    const report = reportWithOpenSite()
    report.observations.push({
      id: 'resolved:test',
      domain: 'source-command',
      kind: 'test',
      objectId: '0',
      sourceAddresses: [0],
      sourceRootIds: ['scenes/s001/e1/trigger'],
      raw: 'open',
      augmented: 'open',
      final: 'open',
      evidenceIds: [report.evidence[0]!.id],
    })
    report.summary.observations = 1
    report.summary.openObservations = 1
    reseal(report)

    expect(() => assertR13SourceInstructionDisposition(report)).toThrow(/禁止 synthetic resolution/)
  })

  test('rejects omitted sites and orphan site evidence even after resealing', () => {
    const omitted = reportWithOpenSite()
    omitted.dispositions = []
    reseal(omitted)
    expect(() => assertR13SourceInstructionDisposition(omitted)).toThrow(/execution site 未处置/)

    const orphan = reportWithOpenSite()
    const existing = orphan.evidence[0]!
    orphan.evidence.push({
      ...existing,
      id: 'open-debt:unused',
    })
    orphan.evidence.sort((left, right) => left.id.localeCompare(right.id))
    reseal(orphan)
    expect(() => assertR13SourceInstructionDisposition(orphan)).toThrow(/orphan site evidence/)
  })
})
