import { describe, expect, test } from 'vitest'
import type { SourceEntrySite } from './script-control-flow-audit.js'
import type { SourceCmd } from './source-facts.js'
import {
  buildR13SourceExecutionCensusFromGraph,
  type R13SourceExecutionCensusV1,
} from './experimental/script-v5/source-execution-census.js'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import {
  buildW9LifecycleSourceLedger,
  type W9LifecycleRuntimeEntryFact,
  type W9LifecycleSourceContractEntry,
  type W9LifecycleTarget,
} from './pal-w9-lifecycle-source-ledger.js'

const ROOT: SourceEntrySite = {
  kind: 'entity-trigger',
  sourceId: 's001/e1/trigger',
  owner: 's001',
  entry: 1,
  channel: 'trigger',
}

const ROOT_RUNTIME_FACT: W9LifecycleRuntimeEntryFact = {
  sourceId: ROOT.sourceId,
  kind: 'entity-trigger',
  sceneId: 's001',
  entityId: 'e1',
  sourceAddress: ROOT.entry,
  sourceLabel: `L_${ROOT.entry}`,
  runtimeGate: 'trigger-mode-positive-state-gate',
  triggerMode: 5,
  sourceInitialState: 1,
  sourceEventObjectSha256: 'a'.repeat(64),
}

const ITEM_ROOT: SourceEntrySite = {
  kind: 'item',
  sourceId: 'global/items/1/scriptOnUse',
  owner: 'global/items',
  entry: 4,
  channel: 'trigger',
}

function build(args: {
  commands: SourceCmd[]
  contract: W9LifecycleSourceContractEntry[]
  folded?: W9LifecycleTarget[]
  census?: R13SourceExecutionCensusV1
  runtimeEntryFacts?: ReadonlyMap<string, W9LifecycleRuntimeEntryFact>
}) {
  const census = args.census ?? buildR13SourceExecutionCensusFromGraph(args.commands, [ROOT])
  return buildW9LifecycleSourceLedger({
    commands: args.commands,
    census,
    foldedHostileTargets: args.folded ?? [],
    generationCommand: 'synthetic-w9-producer',
    affectedFileAllowlist: ['content/scenes/s001.json'],
    sourceContract: args.contract,
    runtimeEntryFacts:
      args.runtimeEntryFacts ?? new Map([[ROOT_RUNTIME_FACT.sourceId, ROOT_RUNTIME_FACT]]),
  })
}

function fourBContract(sourceAddress: number): W9LifecycleSourceContractEntry[] {
  const command = { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] } satisfies SourceCmd
  return [
    {
      sourceAddress,
      opcode: 0x4b,
      operands: command.operands!,
      sourceCommandSha256: stableJsonSha256(command),
      ticks: 15,
    },
  ]
}

function fiftyTwoContract(
  sourceAddress: number,
  ticks: number,
): W9LifecycleSourceContractEntry[] {
  const command = {
    op: 'raw',
    opcode: 0x52,
    operands: [ticks === 800 ? 0 : ticks, 0, 0],
  } satisfies SourceCmd
  return [
    {
      sourceAddress,
      opcode: 0x52,
      operands: command.operands,
      sourceCommandSha256: stableJsonSha256(command),
      ticks,
    },
  ]
}

describe('W9 lifecycle source ledger', () => {
  test('proves direct positive entity entries and keeps 0x4B/0x52 dispositions separate', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x52, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    const ledger = build({
      commands,
      contract: [
        ...fourBContract(1),
        ...fiftyTwoContract(2, 800),
      ],
    })

    expect(ledger.entries).toHaveLength(2)
    expect(ledger.entries.map((entry) => entry.preState)).toEqual([
      { kind: 'positive' },
      { kind: 'positive' },
    ])
    expect(ledger.entries.map((entry) => entry.disposition)).toEqual([
      { kind: 'lifecycle-suspend', command: 'suspendEntity', ticks: 15 },
      { kind: 'lifecycle-hide', command: 'hideEntity', ticks: 800 },
    ])
    expect(ledger.summary.landings).toEqual({
      hostilePolicies: 0,
      suspendCommands: 1,
      hideCommands: 1,
      total: 2,
    })
    expect(ledger.entries.every((entry) => /^[0-9a-f]{64}$/.test(entry.preStateProof.factsSha256)))
      .toBe(true)
  })

  test('preserves 0x07 only after proving battle writers do not touch W9 targets', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x07, operands: [1, 0, 0] },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    const ledger = build({
      commands,
      contract: fourBContract(2),
    })

    expect(ledger.entries[0]?.preState).toEqual({ kind: 'positive' })
    expect(ledger.generator.battleStartPreservationProof).toMatchObject({
      targetEntityCount: 1,
      battleContextCount: 0,
      writerSiteCount: 0,
      writerHitSiteCount: 0,
    })
  })

  test('fails 0x07 preservation when a battle-root writer can hit the W9 target', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x07, operands: [1, 0, 0] },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x49, operands: [2, 0, 0] },
      { op: 'end' },
    ]
    const census = buildR13SourceExecutionCensusFromGraph(commands, [ROOT, ITEM_ROOT])

    expect(() =>
      build({
        commands,
        contract: fourBContract(2),
        census,
      }),
    ).toThrow(/0x07 battle preservation 不成立/)
  })

  test('folds a proven pair into one hostile policy landing', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x52, operands: [150, 0, 0] },
      { op: 'end' },
    ]
    const ledger = build({
      commands,
      contract: [
        ...fourBContract(1),
        ...fiftyTwoContract(2, 150),
      ],
      folded: [{ sceneId: 's001', entityId: 'e1' }],
    })

    expect(ledger.entries.map((entry) => entry.disposition)).toEqual([
      {
        kind: 'folded-hostile-on-player-flee',
        policy: { kind: 'suspend', ticks: 15 },
      },
      { kind: 'folded-hostile-on-victory', policy: { kind: 'hide', ticks: 150 } },
    ])
    expect(ledger.summary.landings).toEqual({
      hostilePolicies: 1,
      suspendCommands: 0,
      hideCommands: 0,
      total: 1,
    })
  })

  test.each([
    ['0x4B negative', 0x4b, 0xffff, /preState=negative/],
    ['0x4B zero', 0x4b, 0, /preState=zero/],
    ['0x52 negative', 0x52, 0xffff, /preState=negative/],
    ['0x52 zero', 0x52, 0, /preState=zero/],
  ] as const)('fails closed for %s pre-state', (_name, opcode, stateWord, expected) => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x49, operands: [0xffff, stateWord, 0] },
      { op: 'raw', opcode, operands: [0, 0, 0] },
      { op: 'end' },
    ]

    expect(() =>
      build({
        commands,
        contract: opcode === 0x4b ? fourBContract(2) : fiftyTwoContract(2, 800),
      }),
    ).toThrow(expected)
  })

  test.each([
    {
      name: '0x6F conditional write',
      command: { op: 'raw', opcode: 0x6f, operands: [3, 0xffff, 0] } satisfies SourceCmd,
      expected: /preState=positive\|negative/,
    },
    {
      name: '0x84 successful placement',
      command: { op: 'raw', opcode: 0x84, operands: [2, 0xffff, 4] } satisfies SourceCmd,
      expected: /preState=negative/,
    },
    {
      name: '0x9A range write',
      command: { op: 'raw', opcode: 0x9a, operands: [2, 2, 0] } satisfies SourceCmd,
      expected: /preState=zero/,
    },
  ])('tracks $name before emitting a landing', ({ command, expected }) => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      command,
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
      { op: 'end' },
    ]
    expect(() => build({ commands, contract: fourBContract(2) })).toThrow(expected)
  })

  test('marks an opaque trigger-call continuation unknown', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x04, operands: [3, 0, 0] },
      { op: 'raw', opcode: 0x52, operands: [0, 0, 0] },
      { op: 'end' },
    ]

    expect(() => build({ commands, contract: fiftyTwoContract(2, 800) })).toThrow(
      /preState=positive\|zero\|negative/,
    )
  })

  test('marks an unmodeled raw opcode continuation unknown', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x0b, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]

    expect(() => build({ commands, contract: fourBContract(2) })).toThrow(
      /preState=positive\|zero\|negative/,
    )
  })

  test('does not borrow the caller gate inside a 0x04 callee with event-object id zero', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x04, operands: [3, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]

    expect(() => build({ commands, contract: fourBContract(3) })).toThrow(
      /不是可证明的直接实体入口|preState=positive\|zero\|negative/,
    )
  })

  test('does not treat an inventoried but runtime-disabled trigger pointer as a positive gate', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    expect(() =>
      build({ commands, contract: fourBContract(1), runtimeEntryFacts: new Map() }),
    ).toThrow(/preState=positive\|zero\|negative/)
  })

  test.each([
    {
      name: '0x6F op0=0 self-read',
      command: { op: 'raw', opcode: 0x6f, operands: [0, 0xffff, 0] } satisfies SourceCmd,
    },
    {
      name: '0x84 0xFFFF fails the scene-range check',
      command: { op: 'raw', opcode: 0x84, operands: [0xffff, 0xffff, 2] } satisfies SourceCmd,
    },
    {
      name: '0x84 cross-entity write leaves self unchanged',
      command: { op: 'raw', opcode: 0x84, operands: [3, 0xffff, 2] } satisfies SourceCmd,
    },
  ])('keeps the proven self state for $name', ({ command }) => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      command,
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    expect(build({ commands, contract: fourBContract(2) }).entries[0]?.preState).toEqual({
      kind: 'positive',
    })
  })

  test('rejects a dynamic owner/self target instead of borrowing the caller gate', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x04, operands: [3, 4, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]

    expect(() => build({ commands, contract: fourBContract(3) })).toThrow(
      /不是可证明的直接实体入口|前态不可证明/,
    )
  })

  test.each([
    {
      name: 'opcode drift',
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x52, operands: [0, 0, 0] },
        { op: 'end' },
      ] satisfies SourceCmd[],
      contract: fourBContract(1),
      expected: /source drift/,
    },
    {
      name: 'SHORT overflow',
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x52, operands: [0x8000, 0, 0] },
        { op: 'end' },
      ] satisfies SourceCmd[],
      contract: fiftyTwoContract(1, 0x8000),
      expected: /SHORT ticks=-32768 非正/,
    },
    {
      name: 'ticks drift',
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x52, operands: [100, 0, 0] },
        { op: 'end' },
      ] satisfies SourceCmd[],
      contract: [
        {
          ...fiftyTwoContract(1, 100)[0]!,
          ticks: 800,
        },
      ],
      expected: /ticks=100，期望 800/,
    },
    {
      name: 'unused operand drift',
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x52, operands: [0, 1, 0] },
        { op: 'end' },
      ] satisfies SourceCmd[],
      contract: fiftyTwoContract(1, 800),
      expected: /source command drift/,
    },
    {
      name: 'label drift',
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x4b, operands: [0, 0, 0], label: 'L_1' },
        { op: 'end' },
      ] satisfies SourceCmd[],
      contract: fourBContract(1),
      expected: /source command drift/,
    },
  ])('fails before returning output on $name', ({ commands, contract, expected }) => {
    let output: unknown
    expect(() => {
      output = build({ commands, contract })
    }).toThrow(expected)
    expect(output).toBeUndefined()
  })

  test('binds the generation command and normalized allowlist deterministically', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x4b, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    const census = buildR13SourceExecutionCensusFromGraph(commands, [ROOT])
    const first = buildW9LifecycleSourceLedger({
      commands,
      census,
      foldedHostileTargets: [],
      generationCommand: 'synthetic-w9-producer',
      affectedFileAllowlist: ['content/scenes/s001.json', '_transitions/w9.json'],
      sourceContract: fourBContract(1),
      runtimeEntryFacts: new Map([[ROOT_RUNTIME_FACT.sourceId, ROOT_RUNTIME_FACT]]),
    })
    const second = buildW9LifecycleSourceLedger({
      commands,
      census,
      foldedHostileTargets: [],
      generationCommand: 'synthetic-w9-producer',
      affectedFileAllowlist: ['_transitions/w9.json', 'content/scenes/s001.json'],
      sourceContract: fourBContract(1),
      runtimeEntryFacts: new Map([[ROOT_RUNTIME_FACT.sourceId, ROOT_RUNTIME_FACT]]),
    })

    expect(second).toEqual(first)
    expect(first.generator.affectedFileAllowlist).toEqual([
      '_transitions/w9.json',
      'content/scenes/s001.json',
    ])
  })
})
