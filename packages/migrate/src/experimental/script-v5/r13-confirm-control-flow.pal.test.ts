import type { SceneDefV5 } from '@type-pal/content'
import { beforeAll, describe, expect, it } from 'vitest'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { getPalTestGeneratedFixture, hasPalTestFixture } from './pal-test-fixture.js'
import {
  assertR13ConfirmControlFlowEvidence,
  assertR13ConfirmDispositionBacked,
  assertR13ConfirmFinalTargetClosure,
  R13_CONFIRM_EXACT_SCENE_IDS,
  R13_CONFIRM_LOSSY_SCENE_IDS,
  R13_CONFIRM_MATERIALIZED_LOCALE_DIGEST,
  R13_CONFIRM_MATERIALIZED_LOCALE_IDS,
  type R13ConfirmControlFlowEvidenceV1,
} from './r13-confirm-control-flow.js'
import { stableJsonSha256 } from './stable-json.js'

const describePal = hasPalTestFixture() ? describe : describe.skip
type PalTestGeneratedFixture = ReturnType<typeof getPalTestGeneratedFixture>

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(
      [...source.files.entries()].map(([path, value]) => [path, structuredClone(value)]),
    ),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function scene(snapshot: MigrationSnapshot, sceneId: string): SceneDefV5 {
  const value = snapshot.files.get(`content/scenes/${sceneId}.json`)
  if (!value) throw new Error(`R13-4 PAL test: scene 缺 ${sceneId}`)
  return value as unknown as SceneDefV5
}

function locale(snapshot: MigrationSnapshot): Record<string, MigrationJson> {
  const value = snapshot.files.get('content/locale.json')
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('R13-4 PAL test: locale 无效')
  return value as Record<string, MigrationJson>
}

function resignEvidence(
  source: R13ConfirmControlFlowEvidenceV1,
  mutate: (evidence: R13ConfirmControlFlowEvidenceV1) => void,
): R13ConfirmControlFlowEvidenceV1 {
  const evidence = structuredClone(source)
  mutate(evidence)
  const { digest: _digest, ...body } = evidence
  evidence.digest = stableJsonSha256(body)
  return evidence
}

describePal('R13-4 confirm source control flow (PAL)', () => {
  let fixture: PalTestGeneratedFixture

  beforeAll(() => {
    fixture = getPalTestGeneratedFixture()
  }, 900_000)

  it('freezes the complete 26/28/31 authority and validates every final scene', () => {
    const { generated } = fixture
    const evidence = generated.confirmEvidence
    expect(evidence.summary).toEqual({
      rawInstructions: 26,
      logicalSites: 28,
      physicalSites: 31,
      exactLogicalSites: 6,
      exactPhysicalSites: 9,
      transformedLogicalSites: 22,
      transformedPhysicalSites: 22,
      transformedFlows: 18,
      retiredStageCursors: 26,
      recoveredDurableStates: 6,
      materializedLocaleEntries: 19,
      materializedSpriteDefinitions: 0,
      changedScenes: 13,
      terminalFamilies: {
        raw: { end: 2, advance: 18, reset: 5, loop: 1 },
        logical: { end: 2, advance: 20, reset: 5, loop: 1 },
        physical: { end: 3, advance: 20, reset: 6, loop: 2 },
      },
    })
    expect(evidence.inputs).toEqual({
      sourceCensusDigest: '3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac',
      p3FlowStructuresDigest: '1d88d9a2cb3498f65a400108ebda5dccf2209930fd7903c332ec9034a7acb431',
      triggerActivationEvidenceDigest:
        '95a7cdf0e97b9d32953724ac13cabe513e166bf38f94a406d98d9bedc1a6f544',
      c8EvidenceDigest: '4c2054e565a0d19ae94384030a744ad464524a56cab9c6c474343fdeda57eb8e',
      parentConfirmDigest: '2e0c4208182aed1d2fcc90ec3e23e15343093c04179a7ebb5f50086fbc9cb0b7',
    })
    expect(evidence.successorConfirmDigest).toBe(
      '99eba7cde42d49b467b9baf60d0034fa54216f2d5cd8e5a487d281f2f738b578',
    )
    expect(evidence.digest).toBe('57022d9efa05a970386ba8cef51f787c13a6c488f8d4665a5d5fe623de6f87f7')
    expect(evidence.changedSceneIds).toEqual([...R13_CONFIRM_LOSSY_SCENE_IDS])
    expect(evidence.exactSceneDigests).toEqual([
      {
        sceneId: 's029',
        digest: '100b0542ebd834c4e0f609437a47dfd3c47617c2cc58fe1196c9e09e0496224c',
      },
      {
        sceneId: 's030',
        digest: '4f3b7673c19fa599fdeaa411c2a80bb997a939205c8a11d06b7425efafbfc9d3',
      },
      {
        sceneId: 's081',
        digest: 'af3519fe1d6629e69954e39d520dea75b689b88e9ef30170d6120f40e4e4e23a',
      },
      {
        sceneId: 's108',
        digest: 'a66afefdddecb55df11764bc734b046becbc1ac45b8f8404be2ae77c7f0f3901',
      },
      {
        sceneId: 's118',
        digest: 'd85d1b06cbced1b1507c9277103f3b59a8a574f96e8dab3af2af9af1c264037b',
      },
    ])
    expect(evidence.exactSceneDigests.map(({ sceneId }) => sceneId)).toEqual([
      ...R13_CONFIRM_EXACT_SCENE_IDS,
    ])

    const ids = generated.r13ConfirmSuccessorSnapshot.files.get('content/scenes/index.json')
    if (!Array.isArray(ids)) throw new Error('R13-4 PAL test: scene index 无效')
    validateHistoricalScenesForCurrentSchema(
      ids.map((id) => scene(generated.r13ConfirmSuccessorSnapshot, String(id))),
    )
    assertR13ConfirmDispositionBacked(
      generated.r13ConfirmParentSnapshot,
      generated.r13ConfirmSuccessorSnapshot,
      evidence,
    )
    assertR13ConfirmFinalTargetClosure(generated.snapshot, evidence)
  })

  it('pins all recovered states and the exact additive locale delta', () => {
    const { generated } = fixture
    const evidence = generated.confirmEvidence
    expect(
      evidence.recoveredStates.map(({ ownerKey, stateId, sourceAddress, kind }) => ({
        ownerKey,
        stateId,
        sourceAddress,
        kind,
      })),
    ).toEqual([
      {
        ownerKey: 'entity:s091:e1682:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 15409,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s100:e1824:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 17536,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s102:e1882:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 21226,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s102:e1882:trigger:default',
        stateId: 'recovered-002',
        sourceAddress: 21230,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s128:e2245:trigger:legacy-001',
        stateId: 'decision-001',
        sourceAddress: 19350,
        kind: 'shared-decision',
      },
      {
        ownerKey: 'entity:s131:e2292:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 15993,
        kind: 'translated-durable',
      },
    ])
    expect(evidence.materializedLocaleIds).toEqual([...R13_CONFIRM_MATERIALIZED_LOCALE_IDS])
    expect(evidence.materializedLocaleDigest).toBe(R13_CONFIRM_MATERIALIZED_LOCALE_DIGEST)
    expect(evidence.materializedSpriteIds).toEqual([])

    const parent = locale(generated.r13ConfirmParentSnapshot)
    const successor = locale(generated.r13ConfirmSuccessorSnapshot)
    expect(
      Object.keys(successor)
        .filter((id) => parent[id] === undefined)
        .sort(),
    ).toEqual([...R13_CONFIRM_MATERIALIZED_LOCALE_IDS])
    for (const [id, value] of Object.entries(parent)) expect(successor[id]).toEqual(value)
  })

  it('keeps s128 on one shared confirm with safe No, insufficient and success paths', () => {
    const value = scene(fixture.generated.r13ConfirmSuccessorSnapshot, 's128')
    const flow = value.entities.find((entity) => entity.id === 'e2245')?.behaviors?.trigger?.[
      'legacy-001'
    ]?.flow
    if (flow?.kind !== 'stateMachine') throw new Error('R13-4 PAL test: s128 flow 非 machine')
    expect(Object.keys(flow.machine.states)).toEqual([
      'initial',
      'decision-001',
      'decision-001-insufficient',
      'decision-001-success',
    ])
    expect(flow.machine.states.initial?.next).toEqual({
      kind: 'continue',
      state: 'decision-001',
    })
    expect(flow.machine.states['decision-001']?.next).toEqual({
      kind: 'commandOutcome',
      commandId: 'decision-001',
      command: 'confirm',
      outcome: 'no',
      then: { kind: 'stay' },
      else: {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'hasMoney', atLeast: 15000 } },
        then: { kind: 'continue', state: 'decision-001-insufficient' },
        else: { kind: 'continue', state: 'decision-001-success' },
      },
    })
    expect(flow.machine.states['decision-001-insufficient']?.next).toEqual({
      kind: 'advance',
      state: 'decision-001',
    })
    expect(flow.machine.states['decision-001-success']?.next).toEqual({ kind: 'restart' })
    expect(
      flow.machine.states['decision-001-success']?.body.map((command) => command.kind),
    ).toEqual([
      'giveMoney',
      'clearDialog',
      'dialog',
      'setEntityState',
      'selectSceneHooks',
      'loadScene',
      'stopMusic',
      'fade',
      'playMusic',
    ])
  })

  it('fails closed on signed selector, mapping, locale and exact-scene tampering', () => {
    const { generated } = fixture
    const evidence = generated.confirmEvidence

    const commandTamper = cloneSnapshot(generated.r13ConfirmSuccessorSnapshot)
    const s005 = scene(commandTamper, 's005')
    const s005Flow = s005.entities.find((entity) => entity.id === 'e128')?.behaviors?.trigger
      ?.default?.flow
    if (s005Flow?.kind !== 'stateMachine') throw new Error('R13-4 PAL test: s005 flow 非 machine')
    const confirm = s005Flow.machine.states.initial?.body.find(
      (command) => command.kind === 'confirm',
    )
    if (confirm?.kind !== 'confirm') throw new Error('R13-4 PAL test: s005 confirm 缺失')
    confirm.onNo.push({ kind: 'clearDialog' })
    expect(() => assertR13ConfirmFinalTargetClosure(commandTamper, evidence)).toThrow(
      /selector|commandOutcome|flow/,
    )

    const localeTamper = cloneSnapshot(generated.r13ConfirmSuccessorSnapshot)
    locale(localeTamper)['dlg.5350'] = '篡改'
    expect(() => assertR13ConfirmFinalTargetClosure(localeTamper, evidence)).toThrow(
      /locale target/,
    )

    const unrelatedLocale = cloneSnapshot(generated.r13ConfirmSuccessorSnapshot)
    locale(unrelatedLocale)['author.unrelated'] = '保留作者文本'
    expect(() => assertR13ConfirmFinalTargetClosure(unrelatedLocale, evidence)).not.toThrow()

    const exactSceneTamper = cloneSnapshot(generated.r13ConfirmSuccessorSnapshot)
    const s029 = scene(exactSceneTamper, 's029')
    s029.entry.pos.col += 1
    expect(() =>
      assertR13ConfirmDispositionBacked(
        generated.r13ConfirmParentSnapshot,
        exactSceneTamper,
        evidence,
      ),
    ).toThrow(/successor snapshot|exact scene/)

    const remapped = resignEvidence(evidence, (draft) => {
      draft.physicalSites[0]!.logicalSiteId = draft.physicalSites[1]!.logicalSiteId
    })
    expect(() => assertR13ConfirmControlFlowEvidence(remapped)).toThrow(/multiplicity/)

    const terminalTamper = resignEvidence(evidence, (draft) => {
      draft.summary.terminalFamilies.raw.advance = 17 as 18
    })
    expect(() => assertR13ConfirmControlFlowEvidence(terminalTamper)).toThrow(/summary/)
  }, 30_000)
})
