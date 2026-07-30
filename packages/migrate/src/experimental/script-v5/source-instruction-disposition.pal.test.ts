import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPreparedSourceExecutionCensus,
  PAL_TEST_FAST_GATE,
} from './pal-test-fixture.js'
import {
  assertR13SourceInstructionDispositionV3,
  buildR13SourceInstructionDispositionV3,
  R13_EXPLICIT_CALL_OWNER_ORACLE,
  sealR13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

function cloneSnapshot(snapshot: MigrationSnapshot): MigrationSnapshot {
  const files = new Map(snapshot.files)
  for (const path of ['content/scenes/s001.json', 'content/scenes/s048.json']) {
    const value = files.get(path)
    if (value === undefined)
      throw new Error(`R13 source disposition test: clone target 缺失 ${path}`)
    files.set(path, structuredClone(value))
  }
  return {
    // The test mutates only the two explicitly cloned scene records above.
    files,
    managedFiles: new Set(snapshot.managedFiles),
  }
}

function removeFirstCommand(value: unknown, kind: string): boolean {
  if (Array.isArray(value)) {
    const index = value.findIndex(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        (entry as { kind?: unknown }).kind === kind,
    )
    if (index >= 0) {
      value.splice(index, 1)
      return true
    }
    return value.some((entry) => removeFirstCommand(entry, kind))
  }
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some((entry) => removeFirstCommand(entry, kind))
}

describe.skipIf(!existsSync(extracted))('R13 source disposition PAL exact final targets', () => {
  test('deleting one final owner command opens every affected site instead of self-sealing', () => {
    const { sources, migration, currentAudit, generated } = getPalTestGeneratedFixture()
    const final = cloneSnapshot(generated.snapshot)
    const scene = final.files.get('content/scenes/s001.json') as {
      entities?: Array<{
        id?: string
        behaviors?: {
          trigger?: Record<string, { label?: string; flow?: unknown }>
        }
      }>
    }
    const entity = scene.entities?.find((candidate) => candidate.id === 'e1')
    const removed = Object.values(entity?.behaviors?.trigger ?? {}).some((behavior) =>
      removeFirstCommand(behavior.flow, 'setPartyFacing'),
    )
    expect(removed).toBe(true)
    const c8Behavior = scene.entities?.find((candidate) => candidate.id === 'e19')?.behaviors
      ?.trigger?.['c8-74bc98f07f8e']
    expect(c8Behavior).toBeDefined()
    if (!c8Behavior) throw new Error('PAL C8 behavior fixture 缺失')
    c8Behavior.label = `${c8Behavior.label ?? ''} final-drift`

    const s048 = final.files.get('content/scenes/s048.json') as {
      hooks?: {
        onEnter?: {
          initial?: string
          variants: Record<
            string,
            {
              flow?: {
                kind?: string
                stages?: Array<{ body?: unknown[] }>
              }
            }
          >
        }
      }
    }
    const onEnter = s048.hooks?.onEnter
    const onEnterVariant = onEnter?.initial ? onEnter.variants[onEnter.initial] : undefined
    const onEnterBody = onEnterVariant?.flow?.stages?.[0]?.body
    expect(onEnterBody).toBeDefined()
    onEnterBody?.push({ kind: 'wait', ms: 1 })

    const args = {
      sources,
      migration,
      audit: currentAudit,
      generated,
      final,
      ...(PAL_TEST_FAST_GATE
        ? {
            preparedSourceCensus: getPalTestPreparedSourceExecutionCensus(),
          }
        : {}),
    }
    const report = buildR13SourceInstructionDispositionV3(args)
    assertR13SourceInstructionDispositionV3(report, args)
    const evidenceById = new Map(report.evidence.map((evidence) => [evidence.id, evidence]))
    const dispositionBySite = new Map(
      report.dispositions.map((disposition) => [disposition.siteId, disposition]),
    )
    const explicitOwnerAddresses = new Set<number>(
      R13_EXPLICIT_CALL_OWNER_ORACLE.map(({ address }) => address),
    )
    const sitesById = new Map(report.census.sites.map((site) => [site.id, site]))
    const explicitOwnerDispositions = report.dispositions.filter((disposition) => {
      const site = sitesById.get(disposition.siteId)
      return site !== undefined && explicitOwnerAddresses.has(site.address)
    })
    expect(explicitOwnerDispositions).toHaveLength(28)
    expect(
      explicitOwnerDispositions.every(
        (disposition) =>
          disposition.disposition !== 'open-debt' &&
          disposition.evidenceIds.some(
            (id) => evidenceById.get(id)?.kind === 'explicit-call-owner',
          ),
      ),
    ).toBe(true)
    const splitAddressOutcomes = migration.report.scripts.instructionOutcomes.filter(
      (outcome) => outcome.sourceAddress === 14_461 && outcome.owner === 'scene',
    )
    expect(splitAddressOutcomes).toHaveLength(2)
    const rootOutcome = splitAddressOutcomes.find(
      (outcome) => outcome.bodyId === 'scene/s081/root/on-enter/stage-0',
    )
    const targetOutcome = splitAddressOutcomes.find(
      (outcome) => outcome.bodyId === 'scene/s081/L-14461/none/d-be8b7be0',
    )
    expect(rootOutcome).toEqual(
      expect.objectContaining({
        path: 'L_14343@scene',
        sourceOp: 'raw:0x5',
        sourceOpcode: 0x05,
        outcome: 'emitted',
        emittedKinds: ['clearDialog'],
      }),
    )
    expect(targetOutcome).toEqual(
      expect.objectContaining({
        sourceOp: 'raw:0x5',
        sourceOpcode: 0x05,
        outcome: 'emitted',
        emittedKinds: ['clearDialog'],
      }),
    )
    expect(rootOutcome?.emittedDigest).not.toBe(targetOutcome?.emittedDigest)
    const splitAddressProof = report.evidence.find(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'canonical-site' }> =>
        evidence.kind === 'canonical-site' &&
        evidence.bodyIds.length === 1 &&
        evidence.bodyIds[0] === 'scene/s081/root/on-enter/stage-0' &&
        evidence.addresses[0] === 14_461,
    )
    expect(splitAddressProof).toBeDefined()
    expect(splitAddressProof?.translationOutcomeDigest).toBe(stableJsonSha256([rootOutcome]))
    const aliasBody = currentAudit.product.bodies.find(
      (body) => body.id === 'shared/user/pal-item-use/265',
    )
    expect(aliasBody).toEqual(
      expect.objectContaining({
        derivation: {
          kind: 'legacy-alias',
          sources: ['L_39793'],
        },
        source: expect.objectContaining({
          entryAddress: 39_793,
          addresses: [],
        }),
      }),
    )
    const aliasAddressOutcomes = migration.report.scripts.instructionOutcomes.filter(
      (outcome) => outcome.sourceAddress === 39_793,
    )
    expect(aliasAddressOutcomes.length).toBeGreaterThan(0)
    expect(
      aliasAddressOutcomes.every(
        (outcome) => outcome.bodyId === 'shared/scc-L-39793/L-39793/global/items/d-0a386828',
      ),
    ).toBe(true)
    const aliasAddressProofs = report.evidence.filter(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'canonical-site' }> =>
        evidence.kind === 'canonical-site' && evidence.addresses[0] === 39_793,
    )
    expect(aliasAddressProofs.length).toBeGreaterThan(0)
    expect(
      aliasAddressProofs.every(
        (evidence) => !evidence.bodyIds.includes('shared/user/pal-item-use/265'),
      ),
    ).toBe(true)
    expect(
      aliasAddressProofs.every(
        (evidence) => dispositionBySite.get(evidence.siteId)?.layers.final.state === 'accounted',
      ),
    ).toBe(true)
    expect(report.census.summary).toEqual(
      expect.objectContaining({
        instructions: 43_503,
        reachableInstructions: 41_945,
        executionSites: 81_674,
      }),
    )
    expect(report.summary.byLayer.raw.accounted + report.summary.byLayer.raw.open).toBe(
      report.summary.executionSites,
    )
    expect(report.summary.byLayer.augmented.accounted + report.summary.byLayer.augmented.open).toBe(
      report.summary.executionSites,
    )
    expect(report.summary.byLayer.final.accounted + report.summary.byLayer.final.open).toBe(
      report.summary.executionSites,
    )
    expect(report.summary.byDisposition.folded).toBeGreaterThan(0)
    const crossProofs = report.evidence.filter(
      (evidence) => evidence.kind === 'r13-cross-activation-site',
    )
    expect(crossProofs).toHaveLength(78)
    expect(
      crossProofs.every(
        (proof) => dispositionBySite.get(proof.siteId)?.layers.final.state === 'accounted',
      ),
    ).toBe(true)
    expect(
      report.dispositions.filter(
        (disposition) =>
          disposition.layers.final.state === 'open' &&
          disposition.evidenceIds.some((id) => {
            const evidence = evidenceById.get(id)
            return evidence?.kind === 'open-debt' && evidence.batch === 'R13-2'
          }),
      ),
    ).toHaveLength(0)
    const confirmProofs = report.evidence.filter((evidence) => evidence.kind === 'r13-confirm-site')
    expect(confirmProofs).toHaveLength(28)
    expect(
      confirmProofs.every(
        (proof) => dispositionBySite.get(proof.siteId)?.layers.final.state === 'accounted',
      ),
    ).toBe(true)
    expect(
      report.dispositions.filter(
        (disposition) =>
          disposition.layers.final.state === 'open' &&
          disposition.evidenceIds.some((id) => {
            const evidence = evidenceById.get(id)
            return evidence?.kind === 'open-debt' && evidence.batch === 'R13-4'
          }),
      ),
    ).toHaveLength(0)

    const pendingUse = report.observations.filter(
      (observation) => observation.domain === 'item' && observation.kind === 'pending-use',
    )
    expect(pendingUse).toHaveLength(15)
    expect(
      pendingUse.every(
        (observation) =>
          observation.raw === 'open' &&
          observation.augmented === 'accounted' &&
          observation.final === 'accounted',
      ),
    ).toBe(true)
    const pendingSkills = report.observations.filter(
      (observation) => observation.domain === 'skill' && observation.kind === 'pending',
    )
    expect(pendingSkills).toHaveLength(14)
    expect(
      pendingSkills
        .filter((observation) => observation.augmented === 'accounted')
        .map((observation) => observation.objectId)
        .sort(),
    ).toEqual(['314', '344', '392', '394'])
    expect(pendingSkills.filter((observation) => observation.final === 'open')).toHaveLength(10)
    const throwObservations = report.observations.filter(
      (observation) =>
        observation.domain === 'item' &&
        (observation.kind === 'pending-throw' || observation.kind === 'silent-empty-throw'),
    )
    expect(throwObservations).toHaveLength(58)
    expect(
      throwObservations.every(
        (observation) =>
          observation.raw === 'open' &&
          observation.augmented === 'accounted' &&
          observation.final === 'accounted',
      ),
    ).toBe(true)
    const c8SiteProof = report.evidence.find((evidence) => evidence.kind === 'c8-site-repair')
    expect(c8SiteProof?.appliesToLayers).not.toContain('final')
    if (!c8SiteProof || c8SiteProof.kind !== 'c8-site-repair')
      throw new Error('PAL C8 site proof fixture 缺失')
    expect(dispositionBySite.get(c8SiteProof.siteId)?.layers.final.state).toBe('open')
    const s048RepairProofs = report.evidence.filter(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'scene-semantic-repair' }> =>
        evidence.kind === 'scene-semantic-repair' && evidence.sceneId === 's048',
    )
    expect(s048RepairProofs.length).toBeGreaterThan(0)
    expect(s048RepairProofs.every((evidence) => !evidence.appliesToLayers.includes('final'))).toBe(
      true,
    )
    expect(
      s048RepairProofs.every(
        (evidence) => dispositionBySite.get(evidence.siteId)?.layers.final.state === 'open',
      ),
    ).toBe(true)

    const targetSets = report.evidence.filter(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'canonical-target-set' }> =>
        evidence.kind === 'canonical-target-set' &&
        (evidence.layerTargets.augmented?.selectors.some((selector) =>
          selector.includes('content/scenes/s001.json#entity/e1/behaviors/trigger/'),
        ) ??
          false),
    )
    const drifted = targetSets.filter(
      (evidence) =>
        !evidence.appliesToLayers.includes('final') && evidence.layerTargets.final !== undefined,
    )
    expect(drifted.length).toBeGreaterThan(0)
    const driftedIds = new Set(drifted.map((evidence) => evidence.id))
    const affectedProofs = report.evidence.filter(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'canonical-site' }> =>
        evidence.kind === 'canonical-site' && driftedIds.has(evidence.targetSetEvidenceId),
    )
    expect(affectedProofs.length).toBeGreaterThan(0)
    const affectedSites = new Set(affectedProofs.map((evidence) => evidence.siteId))
    const affected = report.dispositions.filter((disposition) =>
      affectedSites.has(disposition.siteId),
    )
    expect(affected).toHaveLength(affectedSites.size)
    expect(
      affected.every(
        (disposition) =>
          disposition.disposition === 'open-debt' &&
          disposition.layers.augmented.state === 'accounted' &&
          disposition.layers.final.state === 'open',
      ),
    ).toBe(true)

    const canonicalProofs = report.evidence.filter(
      (
        evidence,
      ): evidence is Extract<(typeof report.evidence)[number], { kind: 'canonical-site' }> =>
        evidence.kind === 'canonical-site' && evidence.appliesToLayers.includes('final'),
    )
    const firstProofByDisposition = new Map<
      (typeof canonicalProofs)[number]['proves'],
      (typeof canonicalProofs)[number]
    >()
    let victim: (typeof canonicalProofs)[number] | undefined
    let donor: (typeof canonicalProofs)[number] | undefined
    for (const proof of canonicalProofs) {
      const first = firstProofByDisposition.get(proof.proves)
      if (first && first.targetSetEvidenceId !== proof.targetSetEvidenceId) {
        victim = first
        donor = proof
        break
      }
      firstProofByDisposition.set(proof.proves, proof)
    }
    expect(victim).toBeDefined()
    expect(donor).toBeDefined()
    if (!victim || !donor) throw new Error('PAL canonical proof fixture 缺失')
    Object.assign(victim, {
      proves: donor.proves,
      appliesToLayers: donor.appliesToLayers,
      translationOutcomeDigest: donor.translationOutcomeDigest,
      bodyAuditDigest: donor.bodyAuditDigest,
      bodyIds: donor.bodyIds,
      p6LedgerDigest: donor.p6LedgerDigest,
      p6EvidenceIds: donor.p6EvidenceIds,
      p6TargetDigest: donor.p6TargetDigest,
      targetSetEvidenceId: donor.targetSetEvidenceId,
    })
    const { digest: _digest, ...withoutDigest } = report
    report.digest = sealR13SourceInstructionDispositionV3(withoutDigest).digest
    expect(() => assertR13SourceInstructionDispositionV3(report, args)).toThrow(
      /source-backed canonical (?:target join|site) 漂移/,
    )
  }, 900_000)
})
