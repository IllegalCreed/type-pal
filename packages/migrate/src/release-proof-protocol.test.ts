import { describe, expect, test } from 'vitest'
import {
  assertStableParallelBenefit,
  type ComparableReleaseSummary,
  compareReleasePair,
  median,
} from './release-proof-protocol.js'

const digest = (character: string): string => character.repeat(64)

function summary(mode: 'serial-control' | 'parallel'): ComparableReleaseSummary {
  const parallel = mode === 'parallel'
  return {
    schemaVersion: 1,
    runId: `${mode}-1`,
    mode,
    success: true,
    startedAt: '2026-08-18T00:00:00.000Z',
    finishedAt: '2026-08-18T00:01:00.000Z',
    durationMs: parallel ? 50_000 : 60_000,
    runRoot: `/tmp/${mode}`,
    git: { head: 'abc', statusSha256: digest('a') },
    host: {
      platform: 'darwin',
      arch: 'arm64',
      node: 'v22',
      cpuCount: 10,
      cpuModel: 'test',
      totalMemoryBytes: 16 * 1024 ** 3,
      loadAverageStart: [1, 1, 1],
      loadAverageBeforeParallel: parallel ? [1, 1, 1] : null,
      loadAverageEnd: [1, 1, 1],
    },
    manifest: { files: 2, tests: 3, sha256: digest('b'), routeSha256: digest('c') },
    coverage: {
      files: 2,
      tests: 3,
      assertions: 4,
      passed: 3,
      skipped: 1,
      unlistedSkipped: 1,
      failed: 0,
      outcomeSha256: digest('d'),
      testListSha256: digest('b'),
      routeSha256: digest('c'),
    },
    protectedWorkspace: {
      writes: 0,
      deletes: 0,
      conflicts: 0,
      beforeSha256: digest('e'),
      afterSha256: digest('e'),
    },
    maxCombinedParallelRssBytes: parallel ? 3000 : null,
    phases: parallel
      ? [
          {
            id: 'release-pal-shared',
            group: {
              maxCombinedRssBytes: 3000,
              children: [{ id: 'release-pal-shared', maxRssBytes: 2000 }],
            },
          },
          {
            id: 'release-pal-fresh',
            group: {
              maxCombinedRssBytes: 3000,
              children: [{ id: 'release-pal-fresh', maxRssBytes: 1000 }],
            },
          },
        ]
      : [
          {
            id: 'canonical-release',
            group: {
              maxCombinedRssBytes: 2500,
              children: [{ id: 'canonical-release', maxRssBytes: 2500 }],
            },
          },
        ],
    errors: [],
  }
}

describe('release serial/parallel proof protocol', () => {
  test('compares coverage, host, git and zero mutation evidence exactly', () => {
    expect(compareReleasePair(summary('serial-control'), summary('parallel'))).toMatchObject({
      savedMs: 10_000,
      serialMaxRssBytes: 2500,
      sharedMaxRssBytes: 2000,
      freshMaxRssBytes: 1000,
      combinedMaxRssBytes: 3000,
      coverageSha256: digest('d'),
    })
  })

  test.each([
    [
      'coverage digest',
      (value: ComparableReleaseSummary) => (value.coverage.outcomeSha256 = digest('f')),
    ],
    [
      'route digest',
      (value: ComparableReleaseSummary) => (value.coverage.routeSha256 = digest('f')),
    ],
    ['host identity', (value: ComparableReleaseSummary) => (value.host.cpuCount = 11)],
    ['git identity', (value: ComparableReleaseSummary) => (value.git.head = 'other')],
    ['workspace write', (value: ComparableReleaseSummary) => (value.protectedWorkspace.writes = 1)],
  ])('fails closed on %s mismatch', (_label, mutate) => {
    const parallel = summary('parallel')
    mutate(parallel)
    expect(() => compareReleasePair(summary('serial-control'), parallel)).toThrow()
  })

  test('requires three positive same-host/same-route samples', () => {
    const pair = compareReleasePair(summary('serial-control'), summary('parallel'))
    expect(() => assertStableParallelBenefit([pair, pair, pair])).not.toThrow()
    expect(() => assertStableParallelBenefit([pair, pair])).toThrow(/3 组/)
    expect(() => assertStableParallelBenefit([pair, pair, { ...pair, savedMs: 0 }])).toThrow(
      /正墙钟收益/,
    )
    expect(median([9, 1, 5])).toBe(5)
  })
})
