import { beforeAll, describe, expect, test } from 'vitest'
import { loadPalTestOracle } from './pal-test-oracle.js'
import {
  buildR13SourceSemanticsCanaryFixture,
  cloneR13SourceSemanticsCanarySnapshot,
  type R13SourceSemanticsCanaryFixture,
} from './r13-source-semantics-canary.js'
import {
  createR13SourceSemanticsV5MigrationPlan,
  R13_SOURCE_SEMANTICS_SEAL_PATH,
} from './r13-source-semantics-mg2.js'

/**
 * Producer-backed smoke path. This is intentionally separate from the larger historical PAL
 * assertion file: it is the one cold canary that the developer/release gate calls explicitly.
 * It must never use a prepared authority or persisted projection from another process.
 */
describe('R13-6A source-backed cold canary', () => {
  let fixture: R13SourceSemanticsCanaryFixture

  beforeAll(() => {
    fixture = buildR13SourceSemanticsCanaryFixture()
  }, 900_000)

  test('producer rebuild matches the exact R13-6A golden and preserves the closure', () => {
    const { proofs } = loadPalTestOracle().projection
    const golden = proofs.r13SourceSemantics
    expect(fixture.first.seal.digest).toBe(golden.sealDigest)
    expect(fixture.first.authority.digest).toBe(golden.authorityDigest)
    expect(fixture.first.authority.sourceDisposition.digest).toBe(golden.sourceDispositionDigest)
    expect(fixture.first.authority.sourceDispositionInputDigest).toBe(
      golden.sourceDispositionInputDigest,
    )
    expect(fixture.first.authority.sourceDisposition.census).toBe(
      fixture.first.authority.sourceDispositionInput.parentSourceDisposition.census,
    )
    expect(fixture.first.authority.augmentation.evidence.digest).toBe(golden.augmentationDigest)
    expect(fixture.first.augmentation.evidence.successorContentDigest).toBe(
      golden.successorContentDigest,
    )
    expect(fixture.first.seal.sourceControl).toEqual(fixture.first.authority.sourceControl)
    expect(fixture.first.sealMode).toBe('initialize')
    expect(fixture.first.augmentation.evidence.summary).toEqual({
      commandSites: golden.summary.commandSites,
      skillCosts: golden.summary.skillCosts,
      changedScenes: golden.summary.changedScenes,
      changedFiles: golden.summary.changedFiles,
    })
    expect(fixture.first.plan.writes.size).toBe(golden.summary.writes)
    expect(fixture.first.plan.deletes).toHaveLength(golden.summary.deletes)
    expect(fixture.first.plan.conflicts).toHaveLength(golden.summary.conflicts)
    expect(fixture.first.target.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(false)
    expect(fixture.first.nextBaseline.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(true)
  }, 60_000)

  test('the same live authority replays to an identical seal and zero writes', () => {
    const replayOurs = cloneR13SourceSemanticsCanarySnapshot(fixture.first.target)
    replayOurs.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
    const replay = createR13SourceSemanticsV5MigrationPlan({
      base: cloneR13SourceSemanticsCanarySnapshot(fixture.first.nextBaseline),
      ours: replayOurs,
      currentSources: fixture.first.authority.currentSources,
      currentMigration: fixture.first.authority.currentMigration,
      projectPrerequisites: fixture.projectPrerequisites,
      sourceDispositionInput: fixture.first.authority.sourceDispositionInput,
      preparedAuthority: fixture.first.authority,
    })
    expect(replay.sealMode).toBe('replay')
    expect(replay.seal).toEqual(fixture.first.seal)
    expect(replay.plan.writes.size).toBe(0)
    expect(replay.plan.deletes).toEqual([])
    expect(replay.plan.conflicts).toEqual([])
  }, 60_000)
})
