import { describe, expect, test } from 'vitest'
import type { PalMigrationSources } from '../../pal-migration.js'
import type { SourceEntrySite } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  assertPreparedR13SourceExecutionCensus,
  assertR13SourceExecutionCensus,
  buildR13SourceExecutionCensus,
  buildR13SourceExecutionCensusFromGraph,
  prepareR13SourceExecutionCensus,
  type R13SourceExecutionCensusV1,
} from './source-execution-census.js'
import { stableJsonSha256 } from './stable-json.js'

function entry(
  sourceId: string,
  owner: string,
  address: number,
  channel: SourceEntrySite['channel'] = 'trigger',
): SourceEntrySite {
  return {
    kind: 'entity-trigger',
    sourceId,
    owner,
    entry: address,
    channel,
  }
}

function reseal(census: R13SourceExecutionCensusV1): void {
  const { digest: _digest, ...withoutDigest } = census
  census.digest = stableJsonSha256(withoutDigest)
}

describe('R13 source execution census', () => {
  test('tracks one source address separately for every execution context', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x04, operands: [3, 6, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x24, operands: [8, 5, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x6d, operands: [2, 6, 0] },
      { op: 'end' },
    ]
    const entries = [
      entry('scenes/s001/e1/trigger', 's001/e1', 1),
      entry('scenes/s002/e2/trigger', 's002/e2', 1),
    ]

    const census = buildR13SourceExecutionCensusFromGraph(commands, entries)
    assertR13SourceExecutionCensus(census)

    expect(census.instructions).toHaveLength(commands.length)
    expect(census.instructions[1]?.executionSiteIds).toHaveLength(2)
    expect(census.contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 'e5', self: 'e5' }),
        expect.objectContaining({
          channel: 'auto',
          owner: 'e7',
          self: 'e7',
          host: expect.objectContaining({ kind: 'dynamic-entity-auto' }),
        }),
        expect.objectContaining({
          owner: 's001',
          host: expect.objectContaining({ kind: 'dynamic-scene-on-enter' }),
        }),
      ]),
    )
    expect(census.instructions[0]?.reachable).toBe(false)
  })

  test('runs an 0x04 callee as trigger while preserving auto fallthrough', () => {
    const census = buildR13SourceExecutionCensusFromGraph(
      [
        { op: 'end' },
        { op: 'raw', opcode: 0x04, operands: [3, 6, 0] },
        { op: 'end' },
        { op: 'end' },
      ],
      [entry('s001/e9/auto', 'e9', 1, 'auto')],
    )
    const contextFor = (address: number) =>
      census.instructions[address]!.executionSiteIds.map((siteId) => {
        const site = census.sites.find((candidate) => candidate.id === siteId)!
        return census.contexts.find((candidate) => candidate.id === site.contextId)!
      })

    expect(contextFor(3)).toContainEqual(
      expect.objectContaining({ channel: 'trigger', owner: 'e5', self: 'e5' }),
    )
    expect(contextFor(2)).toContainEqual(
      expect.objectContaining({ channel: 'auto', owner: 'e9', self: 'e9' }),
    )
  })

  test('is deterministic when entry input order changes', () => {
    const commands: SourceCmd[] = [{ op: 'end' }, { op: 'end' }]
    const entries = [
      entry('scenes/s001/e1/trigger', 's001/e1', 1),
      entry('scenes/s002/e2/trigger', 's002/e2', 1),
    ]

    const forward = buildR13SourceExecutionCensusFromGraph(commands, entries)
    const reverse = buildR13SourceExecutionCensusFromGraph(commands, [...entries].reverse())

    expect(reverse).toEqual(forward)
  })

  test('keeps current self for 0xffff dynamic behavior owner', () => {
    const census = buildR13SourceExecutionCensusFromGraph(
      [{ op: 'end' }, { op: 'raw', opcode: 0x24, operands: [0xffff, 2, 0] }, { op: 'end' }],
      [entry('s001/e9/trigger', 's001', 1)],
    )

    expect(census.contexts).toContainEqual(
      expect.objectContaining({
        channel: 'auto',
        owner: 'e9',
        self: 'e9',
        host: expect.objectContaining({ kind: 'dynamic-entity-auto' }),
      }),
    )
    expect(census.contexts.some((context) => context.self === 'e65534')).toBe(false)
  })

  test('does not follow a dynamic binding whose entity operand is zero', () => {
    const census = buildR13SourceExecutionCensusFromGraph(
      [
        { op: 'end' },
        { op: 'raw', opcode: 0x24, operands: [0, 3, 0] },
        { op: 'end' },
        { op: 'end' },
      ],
      [entry('s001/e9/trigger', 's001', 1)],
    )

    expect(census.contexts.some((context) => context.host.kind === 'dynamic-entity-auto')).toBe(
      false,
    )
    expect(census.instructions[3]?.reachable).toBe(false)
  })

  test('rejects a reverse-index drift', () => {
    const census = buildR13SourceExecutionCensusFromGraph(
      [{ op: 'end' }, { op: 'end' }],
      [entry('scenes/s001/e1/trigger', 's001/e1', 1)],
    )
    census.instructions[1]!.executionSiteIds = []

    expect(() => assertR13SourceExecutionCensus(census)).toThrow(/reachability 漂移|反向引用/)
  })

  test('rejects resealed context, site, or summary tampering', () => {
    const original = buildR13SourceExecutionCensusFromGraph(
      [{ op: 'end' }, { op: 'end' }],
      [entry('scenes/s001/e1/trigger', 's001/e1', 1)],
    )

    const contextDrift = structuredClone(original)
    contextDrift.contexts[0]!.owner = 's999/e999'
    reseal(contextDrift)
    expect(() => assertR13SourceExecutionCensus(contextDrift)).toThrow(/context id\/payload 漂移/)

    const siteDrift = structuredClone(original)
    siteDrift.sites[0]!.address = 0
    reseal(siteDrift)
    expect(() => assertR13SourceExecutionCensus(siteDrift)).toThrow(/site id\/payload 漂移/)

    const summaryDrift = structuredClone(original)
    summaryDrift.summary.executionSites++
    reseal(summaryDrift)
    expect(() => assertR13SourceExecutionCensus(summaryDrift)).toThrow(/summary 漂移/)
  })

  test('rejects a stale report digest', () => {
    const census = buildR13SourceExecutionCensusFromGraph(
      [{ op: 'end' }, { op: 'end' }],
      [entry('scenes/s001/e1/trigger', 's001/e1', 1)],
    )
    census.digest = '0'.repeat(64)

    expect(() => assertR13SourceExecutionCensus(census)).toThrow(/digest 漂移/)
  })

  test('source-backed validation rejects a self-consistently resealed source drift', () => {
    const commands: SourceCmd[] = [{ op: 'end' }, { op: 'end' }]
    const sources = {
      migrate: { commands, items: [], spells: [], enemyObjects: [] },
      scenes: [
        {
          sceneId: 1,
          eventObjects: [
            {
              id: 1,
              triggerLabel: 'L_1',
            },
          ],
        },
      ],
      objectPlayers: [],
    } as unknown as PalMigrationSources
    const census = buildR13SourceExecutionCensus(sources)
    census.instructions[1]!.op = 'raw:0xff'
    census.instructions[1]!.sourceCommandSha256 = 'f'.repeat(64)
    census.generator.sourceDigest = 'e'.repeat(64)
    reseal(census)

    expect(() => assertR13SourceExecutionCensus(census)).not.toThrow()
    expect(() => assertR13SourceExecutionCensus(census, sources)).toThrow(
      /source-backed rebuild 漂移/,
    )
  })

  test('prepared validation is scoped to exact immutable source and census identities', () => {
    const sources = {
      migrate: {
        commands: [{ op: 'end' }, { op: 'end' }],
        items: [],
        spells: [],
        enemyObjects: [],
      },
      scenes: [
        {
          sceneId: 1,
          eventObjects: [{ id: 1, triggerLabel: 'L_1' }],
        },
      ],
      objectPlayers: [],
    } as unknown as PalMigrationSources
    const prepared = prepareR13SourceExecutionCensus(sources)

    expect(() =>
      assertPreparedR13SourceExecutionCensus(prepared, sources, prepared.census),
    ).not.toThrow()
    expect(() =>
      assertPreparedR13SourceExecutionCensus(prepared, { ...sources }, prepared.census),
    ).toThrow(/输入身份漂移/)

    prepared.census.generator.sourceDigest = 'e'.repeat(64)
    reseal(prepared.census)
    expect(() =>
      assertPreparedR13SourceExecutionCensus(prepared, sources, prepared.census),
    ).toThrow(/摘要漂移/)
  })
})
