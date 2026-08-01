import type { ScriptFlowV5 } from '@type-pal/content'
import type { SourceEntrySite } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  buildR13SourceExecutionCensusFromGraph,
  type R13SourceExecutionCensusV1,
} from './source-execution-census.js'
import { stableJsonSha256 } from './stable-json.js'

export interface SyntheticSourceGraphFixture {
  readonly commands: readonly SourceCmd[]
  readonly entries: readonly SourceEntrySite[]
  readonly census: R13SourceExecutionCensusV1
  readonly inputDigest: string
}

export interface SyntheticSourceGraphOptions {
  entryOrder?: 'forward' | 'reverse'
}

function sourceEntry(
  sourceId: string,
  owner: string,
  entry: number,
  channel: SourceEntrySite['channel'],
): SourceEntrySite {
  return { kind: 'entity-trigger', sourceId, owner, entry, channel }
}

/**
 * A tiny source graph that deliberately contains the same structural hazards as PAL:
 * probability branch, script call, dynamic binding, a loop/goto and a scene hook entry.
 * It is input to the production census builder; it is not a serialized census/authority.
 */
export function createSyntheticSourceGraphFixture(
  options: SyntheticSourceGraphOptions = {},
): SyntheticSourceGraphFixture {
  const commands: SourceCmd[] = [
    { op: 'end' },
    { op: 'raw', opcode: 0x06, operands: [30, 3, 0] },
    { op: 'raw', opcode: 0x04, operands: [3, 6, 0] },
    { op: 'goto', to: 'L_4' } as SourceCmd,
    { op: 'raw', opcode: 0x24, operands: [0xffff, 2, 0] },
    { op: 'raw', opcode: 0x6d, operands: [2, 6, 0] },
    { op: 'end' },
  ]
  const entries = [
    sourceEntry('scenes/synthetic/e1/trigger', 'synthetic/e1', 1, 'trigger'),
    sourceEntry('scenes/synthetic/e2/auto', 'synthetic/e2', 1, 'auto'),
    sourceEntry('scenes/synthetic/on-enter', 'synthetic', 1, 'trigger'),
  ]
  if (options.entryOrder === 'reverse') entries.reverse()
  const census = buildR13SourceExecutionCensusFromGraph(commands, entries)
  return {
    commands: Object.freeze(commands.map((command) => structuredClone(command))),
    entries: Object.freeze(entries.map((entry) => structuredClone(entry))),
    census,
    inputDigest: stableJsonSha256({ commands, entries }),
  }
}

/**
 * Canonical flow fixture for tests that need stage advance, branch/loop and yes/no closure.
 * It uses the public v5 command vocabulary, so tests cannot accidentally invent a test-only AST.
 */
export function createSyntheticStageFlowFixture(): ScriptFlowV5 {
  return {
    kind: 'stages',
    initial: 'initial',
    stages: [
      {
        id: 'initial',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'met', is: true },
            then: [
              {
                kind: 'confirm',
                id: 'continue-choice',
                onNo: [{ kind: 'clearDialog' }],
              },
            ],
            else: [],
          },
          {
            kind: 'loop',
            mode: 'while',
            cond: { kind: 'var', var: 'attempts', op: '<', value: 2 },
            body: [{ kind: 'clearDialog' }],
            yield: 'worldTick',
            maxIterations: 2,
          },
        ],
        next: 'completed',
      },
      { id: 'completed', body: [] },
    ],
  }
}
