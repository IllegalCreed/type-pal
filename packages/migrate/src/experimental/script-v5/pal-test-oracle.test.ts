import { describe, expect, test } from 'vitest'
import { assertPalTestOracle, loadPalTestOracle } from './pal-test-oracle.js'

describe('PAL compact test oracle', () => {
  test('pins the published P7→R13 chain without constructing the 81k source graph', () => {
    const oracle = loadPalTestOracle()
    expect(oracle.projection).toMatchObject({
      generatorEpoch: 'n3-script-v5-p7-v1',
      managedFiles: 544,
      scriptV4V5: {
        entries: 18_383,
        evidence: 8_975,
        groups: 5_630,
        canonicalTargets: 8_271,
      },
      content: { scenes: 294, items: 234, enemies: 153, localeKeys: 9_552 },
    })
    expect(Object.keys(oracle.projection.transitions)).toEqual([
      'script-v4-v5',
      'c8-item-use-v5-v1',
      'r13-cadence-v1',
      'r13-cross-activation-v1',
      'r13-item-throw-v1',
      'r13-confirm-v1',
      'r13-enemy-script-v1',
      'r13-source-semantics-v1',
    ])
    expect(
      oracle.manifest.inputTrees.map(({ role, root, selector }) => ({
        role,
        root,
        selector,
      })),
    ).toEqual([
      { role: 'extracted-source', root: 'data/extracted', selector: 'all' },
      {
        role: 'published-baseline',
        root: 'packages/migrate/baselines/pal',
        selector: 'all',
      },
      { role: 'project-prerequisite', root: 'projects/pal', selector: 'all' },
      {
        role: 'generated-shadow',
        root: 'packages/migrate/.shadow/N3-1/v5/p6',
        selector: 'all',
      },
      {
        role: 'producer-code',
        root: 'packages/migrate/src',
        selector: 'production-typescript',
      },
      {
        role: 'producer-code',
        root: 'packages/content/src',
        selector: 'production-typescript',
      },
      {
        role: 'producer-code',
        root: 'packages/reforge/src',
        selector: 'production-typescript',
      },
      {
        role: 'runtime-code',
        root: 'packages/shared/src',
        selector: 'production-typescript',
      },
    ])
    expect(oracle.projection.proofs).toMatchObject({
      executionSites: 81_674,
      p6Ir: expect.stringMatching(/^[0-9a-f]{64}$/),
      p6Ledger: expect.stringMatching(/^[0-9a-f]{64}$/),
      sourceCensus: expect.stringMatching(/^[0-9a-f]{64}$/),
      enemyDisposition: expect.stringMatching(/^[0-9a-f]{64}$/),
      enemyRuntime: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(oracle.projection.proofs.r13SourceSemantics).toMatchObject({
      transitionId: 'r13-source-semantics-v1',
      sealDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      authorityDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      summary: { commandSites: 22, skillCosts: 3, writes: 17, deletes: 0, conflicts: 0 },
    })
    expect(Object.isFrozen(oracle)).toBe(true)
    expect(Object.isFrozen(oracle.projection.transitions['r13-enemy-script-v1'])).toBe(true)
  })

  test('rejects a self-edited projection instead of trusting persisted JSON', () => {
    const oracle = loadPalTestOracle()
    const changed = structuredClone(oracle)
    changed.projection.content.items++
    expect(() => assertPalTestOracle(changed)).toThrow(/projection digest 漂移/)
  })
})
