import { describe, expect, test } from 'vitest'
import { createMigrationPlan } from '../../migration-plan.js'
import { assertR13SourceExecutionCensus } from './source-execution-census.js'
import {
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
})
