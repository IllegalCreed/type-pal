import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import {
  getPalTestCoreFixture,
  getPalTestGeneratedFixture,
  getPalTestPreparedP2ScriptTransition,
  getPalTestPreparedP3ScriptTransition,
  getPalTestPreparedP4ScriptTransition,
  getPalTestPreparedP5ScriptTransition,
  getPalTestPreparedP6ScriptTransition,
  getPalTestPreparedR13CadenceAuthority,
  getPalTestPreparedR13ConfirmAuthority,
  getPalTestPreparedR13ConfirmControlAuditAuthority,
  getPalTestPreparedR13CrossActivationAuthority,
  getPalTestPreparedR13ItemThrowAuthority,
  getPalTestPreparedSourceExecutionCensus,
  resetPalTestSharedPreparedCachesForOrderProbe,
} from './pal-test-fixture.js'
import { fastJsonSha256, stableJsonFramedSha256, stableJsonSha256 } from './stable-json.js'

const CONTRACT_IDS = [
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'source-census',
  'cadence',
  'cross-activation',
  'item-throw',
  'confirm',
  'confirm-control',
] as const
type ContractId = (typeof CONTRACT_IDS)[number]

const BASE_ORDER: readonly ContractId[] = CONTRACT_IDS

function seededShuffle<T>(input: readonly T[], seed: number): T[] {
  const result = [...input]
  let state = seed >>> 0
  for (let index = result.length - 1; index > 0; index--) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const swap = (state >>> 0) % (index + 1)
    ;[result[index], result[swap]] = [result[swap]!, result[index]!]
  }
  return result
}

function digestSnapshot(snapshot: MigrationSnapshot): string {
  const paths = [...snapshot.files.keys()].sort()
  return stableJsonFramedSha256(
    (function* (): Iterable<unknown> {
      yield ['managed', [...snapshot.managedFiles].sort()]
      yield ['hashes', [...(snapshot.hashes ?? new Map())].sort(([left], [right]) => left.localeCompare(right))]
      yield ['metadata', snapshot.baselineMetadata ?? null]
      for (const path of paths) yield [path, snapshot.files.get(path)]
    })(),
  )
}

function digestLease(): string {
  const core = getPalTestCoreFixture()
  const generated = getPalTestGeneratedFixture().generated
  return stableJsonFramedSha256([
    ['source-segments', fastJsonSha256(core.sources.allJson.segments)],
    ['migration', digestSnapshot(core.migration)],
    ['generated-snapshot', digestSnapshot(generated.snapshot)],
    ['generated-project', fastJsonSha256(generated.project)],
    ['generated-ir', fastJsonSha256(generated.ir)],
    ['generated-ledger', fastJsonSha256(generated.ledgerDraft)],
  ])
}

function invoke(contract: ContractId): void {
  switch (contract) {
    case 'p2':
      getPalTestPreparedP2ScriptTransition()
      return
    case 'p3':
      getPalTestPreparedP3ScriptTransition()
      return
    case 'p4':
      getPalTestPreparedP4ScriptTransition()
      return
    case 'p5':
      getPalTestPreparedP5ScriptTransition()
      return
    case 'p6':
      getPalTestPreparedP6ScriptTransition()
      return
    case 'source-census':
      getPalTestPreparedSourceExecutionCensus()
      return
    case 'cadence':
      getPalTestPreparedR13CadenceAuthority()
      return
    case 'cross-activation':
      getPalTestPreparedR13CrossActivationAuthority()
      return
    case 'item-throw':
      getPalTestPreparedR13ItemThrowAuthority()
      return
    case 'confirm':
      getPalTestPreparedR13ConfirmAuthority()
      return
    case 'confirm-control':
      getPalTestPreparedR13ConfirmControlAuditAuthority()
      return
  }
}

function authoritySummary(): string {
  const p2 = getPalTestPreparedP2ScriptTransition()
  const p3 = getPalTestPreparedP3ScriptTransition()
  const p4 = getPalTestPreparedP4ScriptTransition()
  const p5 = getPalTestPreparedP5ScriptTransition()
  const p6 = getPalTestPreparedP6ScriptTransition()
  const sourceCensus = getPalTestPreparedSourceExecutionCensus()
  const cadence = getPalTestPreparedR13CadenceAuthority()
  const cross = getPalTestPreparedR13CrossActivationAuthority()
  const itemThrow = getPalTestPreparedR13ItemThrowAuthority()
  const confirm = getPalTestPreparedR13ConfirmAuthority()
  const confirmControl = getPalTestPreparedR13ConfirmControlAuditAuthority()
  return stableJsonSha256({
    p2: [p2.targetDigest, p2.ledgerDigest, fastJsonSha256(p2.targetConflicts)],
    p3: [p3.targetDigest, p3.ledgerDigest, fastJsonSha256(p3.targetConflicts)],
    p4: [p4.targetDigest, p4.ledgerDigest, fastJsonSha256(p4.targetConflicts)],
    p5: [p5.targetDigest, p5.ledgerDigest, fastJsonSha256(p5.targetConflicts)],
    p6: [p6.targetDigest, p6.ledgerDigest, fastJsonSha256(p6.targetConflicts)],
    sourceCensus: sourceCensus.censusDigest,
    cadence: cadence.evidenceDigest,
    cross: [
      cross.sourceDispositionDigest,
      cross.sourceControlDigest,
      cross.crossActivationEvidenceDigest,
    ],
    itemThrow: itemThrow.evidenceDigest,
    confirm: confirm.evidenceDigest,
    confirmControl: confirmControl.digest,
  })
}

function runOrder(order: readonly ContractId[]): string {
  for (const contract of order) invoke(contract)
  return authoritySummary()
}

describe('PAL release-shared prepared fixture order', () => {
  test('one cold lease survives default, reverse, and three seeded consumer orders', () => {
    // Establish the real producer lease once. The remaining permutations are intentionally warm
    // consumers: resetting and rebuilding every R13 authority per permutation would turn this
    // probe into five copies of the slow release route rather than an order/aliasing check.
    resetPalTestSharedPreparedCachesForOrderProbe()
    const leaseBefore = digestLease()
    const runs = [
      BASE_ORDER,
      [...BASE_ORDER].reverse(),
      seededShuffle(BASE_ORDER, 20260802),
      seededShuffle(BASE_ORDER, 20260803),
      seededShuffle(BASE_ORDER, 20260804),
    ].map(runOrder)
    const leaseAfter = digestLease()
    expect(leaseAfter, 'shared fixture mutated across order permutations').toBe(leaseBefore)
    expect(new Set(runs).size).toBe(1)
  }, 1_200_000)
})
