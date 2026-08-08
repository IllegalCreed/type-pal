import { describe, expect, test } from 'vitest'
import type { R13SourceExecutionCensusV1 } from './source-execution-census.js'
import {
  addR13SegmentTransferResumeEvidence,
  type R13DispositionEvidence,
  type R13SourceExecutionDisposition,
} from './source-instruction-disposition.js'

interface Detail {
  sourceAddress: number
  refKind: 'call' | 'goto' | 'branch' | 'install'
  term: 'advance' | 'reset'
  successor: number
}

function censusWithKinds(kindsByAddress: Record<number, string>): R13SourceExecutionCensusV1 {
  const contexts = Object.entries(kindsByAddress).flatMap(([address, kind], index) => {
    const contextId = `ctx-${address}-${index}`
    return [
      {
        id: contextId,
        entrySiteId: `global/entry/${address}`,
        channel: 'trigger' as const,
        owner: 'e1',
        host: { kind, sourceId: `global/entry/${address}` },
      },
    ]
  })
  const sites = Object.entries(kindsByAddress).flatMap(([address], index) => [
    {
      id: `site-${address}`,
      address: Number(address),
      contextId: `ctx-${address}-${index}`,
    },
  ])
  const instructions = Object.keys(kindsByAddress).map((address) => ({
    address: Number(address),
    sourceCommandSha256: 'a'.repeat(64),
    op: 'raw',
    opcode: 0x06,
    reachable: true,
    executionSiteIds: [],
  }))
  return {
    kind: 'r13-source-execution-census',
    version: 1,
    methodVersion: 'n3-p7-r13-source-execution-census-v1',
    generator: { sourceDigest: 'b'.repeat(64) },
    entries: [],
    contexts,
    instructions,
    sites,
    summary: {
      instructions: instructions.length,
      reachableInstructions: instructions.length,
      unreachableInstructions: 0,
      entrySites: 0,
      contexts: contexts.length,
      sites: sites.length,
    },
  } as unknown as R13SourceExecutionCensusV1
}

function disposition(
  siteId: string,
  finalState: 'accounted' | 'open',
): R13SourceExecutionDisposition {
  return {
    siteId,
    disposition: finalState === 'accounted' ? 'structured' : 'open-debt',
    evidenceIds: [],
    candidateEvidenceIds: [],
    layers: {
      raw: { state: 'accounted', evidenceIds: [] },
      augmented: { state: 'accounted', evidenceIds: [] },
      final: { state: finalState, evidenceIds: [] },
    },
  }
}

function runOracle(
  details: Detail[],
  kindsByAddress: Record<number, string>,
  finalStates: Record<number, 'accounted' | 'open'> = {},
): { id?: string; failedAddresses: number[] } {
  const census = censusWithKinds(kindsByAddress)
  const dispositions = Object.keys(kindsByAddress).map((address) =>
    disposition(`site-${address}`, finalStates[Number(address)] ?? 'accounted'),
  )
  return addR13SegmentTransferResumeEvidence({
    details,
    census,
    dispositions,
    evidence: new Map<string, R13DispositionEvidence>(),
  })
}

describe('R13-6D segment-transfer oracle（Kimi R2/R3/R4 返工测试）', () => {
  test('goto/advance 形态:entity-trigger 覆盖 → 通过', () => {
    const result = runOracle(
      [{ sourceAddress: 100, refKind: 'goto', term: 'advance', successor: 101 }],
      { 101: 'entity-trigger' },
    )
    expect(result.failedAddresses).toEqual([])
    expect(result.id).toMatch(/^r13-segment-transfer-resume:/)
  })

  test('install/reset 形态:entity-auto 覆盖 → 通过', () => {
    const result = runOracle(
      [{ sourceAddress: 200, refKind: 'install', term: 'reset', successor: 201 }],
      { 201: 'entity-auto' },
    )
    expect(result.failedAddresses).toEqual([])
    expect(result.id).toBeDefined()
  })

  test('branch/advance 形态:scene-on-enter 覆盖 → 通过', () => {
    const result = runOracle(
      [{ sourceAddress: 300, refKind: 'branch', term: 'advance', successor: 301 }],
      { 301: 'scene-on-enter' },
    )
    expect(result.failedAddresses).toEqual([])
    expect(result.id).toBeDefined()
  })

  test('install/advance 形态:dynamic-scene-on-enter 覆盖 → 通过(Codex 白名单修正)', () => {
    const result = runOracle(
      [{ sourceAddress: 27509, refKind: 'install', term: 'advance', successor: 27535 }],
      { 27535: 'dynamic-scene-on-enter' },
    )
    expect(result.failedAddresses).toEqual([])
    expect(result.id).toBeDefined()
  })

  test('负路径:successor 不可达 → fail 且显式枚举失败地址(Kimi R4)', () => {
    const result = runOracle(
      [{ sourceAddress: 400, refKind: 'goto', term: 'advance', successor: 999 }],
      {},
    )
    expect(result.id).toBeUndefined()
    expect(result.failedAddresses).toEqual([999])
  })

  test('负路径:covering site final open → fail 且枚举', () => {
    const result = runOracle(
      [{ sourceAddress: 500, refKind: 'install', term: 'advance', successor: 501 }],
      { 501: 'entity-auto' },
      { 501: 'open' },
    )
    expect(result.id).toBeUndefined()
    expect(result.failedAddresses).toEqual([501])
  })

  test('负路径:仅 scene-on-teleport 覆盖(白名单外)→ fail-closed(Kimi R3)', () => {
    const result = runOracle(
      [{ sourceAddress: 600, refKind: 'branch', term: 'advance', successor: 601 }],
      { 601: 'scene-on-teleport' },
    )
    expect(result.id).toBeUndefined()
    expect(result.failedAddresses).toEqual([601])
  })
})
