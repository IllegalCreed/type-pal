import { describe, expect, test } from 'vitest'
import { createMigrationPlan } from '../../migration-plan.js'
import {
  assertHistoricalR13_5RuntimeCapabilityAuditReportV3,
  assertR13RuntimeCapabilityAuditReportV3,
  assertR13RuntimeCapabilityAuditV3,
  buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3,
  buildAndAssertR13RuntimeCapabilityAuditV3,
} from './runtime-capability-audit-v3.js'
import { assertR13SourceExecutionCensus } from './source-execution-census.js'
import { stableJsonSha256 } from './stable-json.js'
import {
  createSyntheticRuntimeSnapshot,
  createSyntheticSourceGraphFixture,
  createSyntheticStageFlowFixture,
} from './synthetic-test-fixture.js'

describe('synthetic migration fixture', () => {
  test('builds branch/call/dynamic/loop source semantics through the production census path', () => {
    const fixture = createSyntheticSourceGraphFixture()
    expect(() => assertR13SourceExecutionCensus(fixture.census)).not.toThrow()
    expect(fixture.census.summary.executionSites).toBeGreaterThan(0)
    expect(
      fixture.census.contexts.some((context) => context.host.kind === 'dynamic-scene-on-enter'),
    ).toBe(true)
    expect(fixture.census.instructions.some((instruction) => instruction.op === 'raw:0x06')).toBe(
      true,
    )
    expect(fixture.census.instructions.some((instruction) => instruction.op === 'raw:0x04')).toBe(
      true,
    )
  })

  test('rejects census tamper and keeps migration replay/merge plans zero-write', () => {
    const census = structuredClone(createSyntheticSourceGraphFixture().census)
    census.instructions[1]!.sourceCommandSha256 = '0'.repeat(64)
    expect(() => assertR13SourceExecutionCensus(census)).toThrow(/digest|hash|漂移/)

    const base = {
      files: new Map([['content/fixture.json', { value: 1 }]]),
      managedFiles: new Set(['content/fixture.json']),
    }
    const ours = {
      files: new Map(base.files),
      managedFiles: new Set(base.managedFiles),
    }
    const generated = {
      files: new Map([['content/fixture.json', { value: 2 }]]),
      managedFiles: new Set(['content/fixture.json']),
    }
    const first = createMigrationPlan(base, ours, generated)
    expect(first.conflicts).toEqual([])
    expect(first.summary.writes).toBe(1)
    const replay = createMigrationPlan(
      { files: new Map(first.target), managedFiles: new Set(first.target.keys()) },
      { files: new Map(first.target), managedFiles: new Set(first.target.keys()) },
      generated,
    )
    expect(replay.writes.size).toBe(0)
    expect(replay.deletes).toEqual([])
    const authorConflict = createMigrationPlan(
      base,
      {
        files: new Map([['content/fixture.json', { value: 3 }]]),
        managedFiles: new Set(base.managedFiles),
      },
      generated,
    )
    expect(authorConflict.conflicts).toHaveLength(1)
    expect(authorConflict.writes.size).toBe(0)
  })

  test('keeps entry-order and mutation cases isolated', () => {
    const forward = createSyntheticSourceGraphFixture()
    const reverse = createSyntheticSourceGraphFixture({ entryOrder: 'reverse' })
    expect(reverse.census).toEqual(forward.census)
    expect(reverse.inputDigest).not.toBe(forward.inputDigest)

    const changed = createSyntheticSourceGraphFixture()
    changed.census.instructions[1]!.reachable = !changed.census.instructions[1]!.reachable
    expect(forward.census.instructions[1]!.reachable).not.toBe(
      changed.census.instructions[1]!.reachable,
    )
  })

  test('uses the production v5 vocabulary for stage, branch, loop and confirm fixtures', () => {
    const flow = createSyntheticStageFlowFixture()
    expect(flow.kind).toBe('stages')
    if (flow.kind !== 'stages') return
    expect(flow.stages.map((stage) => stage.id)).toEqual(['initial', 'completed'])
    expect(flow.stages[0]!.next).toBe('completed')
    expect(flow.stages[0]!.body.map((command) => command.kind)).toEqual(['branch', 'loop'])
    const branch = flow.stages[0]!.body[0]!
    if (branch.kind !== 'branch') throw new Error('synthetic branch missing')
    expect(branch.then[0]).toMatchObject({ kind: 'confirm', id: 'continue-choice' })
  })

  test('keeps current/historical profile, snapshot identity and missing prerequisites fail-closed', () => {
    const snapshot = createSyntheticRuntimeSnapshot()
    const current = buildAndAssertR13RuntimeCapabilityAuditV3(snapshot)
    const historical = buildAndAssertHistoricalR13_5RuntimeCapabilityAuditV3(snapshot)
    expect(() => assertR13RuntimeCapabilityAuditReportV3(historical)).toThrow('matrix 漂移')
    expect(() => assertHistoricalR13_5RuntimeCapabilityAuditReportV3(current)).toThrow(
      'matrix 漂移',
    )

    const editedSnapshot = createSyntheticRuntimeSnapshot()
    editedSnapshot.files.set('content/items.json', [{ id: 'edited' }])
    expect(() => assertR13RuntimeCapabilityAuditV3(current, editedSnapshot)).toThrow(
      /snapshot-backed rebuild 漂移|校验失败|无效|缺键/,
    )

    const missingPrerequisite = createSyntheticRuntimeSnapshot()
    missingPrerequisite.files.delete('content/shared-scripts.json')
    expect(() => buildAndAssertR13RuntimeCapabilityAuditV3(missingPrerequisite)).toThrow(
      '缺 content/shared-scripts.json',
    )
  })

  test('rejects forged self-resigned runtime evidence', () => {
    const report = buildAndAssertR13RuntimeCapabilityAuditV3(createSyntheticRuntimeSnapshot())
    const forged = structuredClone(report)
    forged.matrix.cells[0]!.status =
      forged.matrix.cells[0]!.status === 'executed' ? 'refused' : 'executed'
    const { digest: _digest, ...withoutDigest } = forged
    forged.digest = stableJsonSha256(withoutDigest)
    expect(() => assertR13RuntimeCapabilityAuditReportV3(forged)).toThrow(/matrix 漂移|digest/)
  })
})
