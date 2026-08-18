import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertIsolatedChildSpecs,
  classifyChildFailure,
  parsePsTable,
  processTreeSamplesFromTable,
  type ReleaseChildSpec,
  releaseRuntimeTmpDir,
  runReleaseChildGroup,
} from './release-runner-core.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function testRoot(): string {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-release-runner-test-'))
  roots.push(root)
  return root
}

function spec(args: {
  root: string
  id: string
  script: string
  timeoutMs?: number
  rssLimitBytes?: number | null
}): ReleaseChildSpec {
  const childRoot = resolve(args.root, args.id)
  const tmp = resolve(childRoot, 'tmp')
  return {
    id: args.id,
    command: process.execPath,
    args: ['-e', args.script],
    cwd: args.root,
    env: {
      ...process.env,
      TYPE_PAL_MIGRATE_TEST_GATE: `gate-${args.id}`,
      TMPDIR: tmp,
      TMP: tmp,
      TEMP: tmp,
    },
    logPath: resolve(childRoot, 'raw.log'),
    reportPath: resolve(childRoot, 'report.json'),
    tmpDir: tmp,
    transactionRoot: null,
    gate: `gate-${args.id}`,
    timeoutMs: args.timeoutMs ?? 2_000,
    rssLimitBytes: args.rssLimitBytes ?? 1024 * 1024,
  }
}

function fixedSamples(
  pids: number[],
  bytes = 1024,
): Map<number, { bytes: number; pids: number[] }> {
  return new Map(pids.map((pid) => [pid, { bytes, pids: [pid] }]))
}

describe('release runner process/RSS protocol', () => {
  test('keeps runtime tmp roots isolated and below the Unix socket path budget', () => {
    const first = releaseRuntimeTmpDir('parallel-run-a', 'manifest', '/tmp')
    const sibling = releaseRuntimeTmpDir('parallel-run-a', 'release-pal-shared', '/tmp')
    const nextRun = releaseRuntimeTmpDir('parallel-run-b', 'manifest', '/tmp')
    const socketProbe = resolve(first, 'tsx-4294967295', '4294967295.pipe')

    expect(new Set([first, sibling, nextRun]).size).toBe(3)
    expect(Buffer.byteLength(socketProbe)).toBeLessThanOrEqual(100)
  })

  test('parses process trees once and rejects overlapping ownership', () => {
    const table = parsePsTable('10 1 100\n11 10 50\n12 1 25\n')
    expect(processTreeSamplesFromTable(table, [10, 12])).toEqual(
      new Map([
        [10, { bytes: 150 * 1024, pids: [10, 11] }],
        [12, { bytes: 25 * 1024, pids: [12] }],
      ]),
    )
    expect(() => processTreeSamplesFromTable(table, [10, 11])).toThrow(/同时属于进程树/)
  })

  test('rejects shared tmp/report/log roots before spawn', () => {
    const root = testRoot()
    const left = spec({ root, id: 'left', script: '' })
    const right = spec({ root, id: 'right', script: '' })
    right.tmpDir = left.tmpDir
    right.env.TMPDIR = left.tmpDir
    right.env.TMP = left.tmpDir
    right.env.TEMP = left.tmpDir
    expect(() => assertIsolatedChildSpecs([left, right])).toThrow(/路径冲突/)
  })

  test('runs isolated siblings and records simultaneous RSS samples', async () => {
    const root = testRoot()
    const result = await runReleaseChildGroup(
      [
        spec({ root, id: 'left', script: 'setTimeout(() => {}, 120)' }),
        spec({ root, id: 'right', script: 'setTimeout(() => {}, 120)' }),
      ],
      {
        echoOutput: false,
        sampleIntervalMs: 20,
        combinedRssLimitBytes: 4096,
        sampleProcessTrees: (pids) => fixedSamples(pids),
      },
    )
    expect(result.success).toBe(true)
    expect(result.children).toHaveLength(2)
    expect(result.maxCombinedRssBytes).toBe(2048)
    expect(result.children.every((child) => child.rssSamples > 0)).toBe(true)
  })

  test('non-zero child cancels its sibling and preserves raw logs', async () => {
    const root = testRoot()
    const marker = resolve(root, 'should-not-exist')
    const result = await runReleaseChildGroup(
      [
        spec({ root, id: 'failure', script: 'setTimeout(() => process.exit(7), 50)' }),
        spec({
          root,
          id: 'sibling',
          script: `const fs=require('node:fs');setTimeout(()=>fs.writeFileSync(${JSON.stringify(marker)},'bad'),700)`,
        }),
      ],
      {
        echoOutput: false,
        sampleIntervalMs: 20,
        sampleProcessTrees: (pids) => fixedSamples(pids),
      },
    )
    expect(result.success).toBe(false)
    expect(result.children.find((child) => child.id === 'failure')?.failureClass).toBe('exit')
    expect(result.children.find((child) => child.id === 'sibling')?.cancelled).toBe(true)
    expect(existsSync(marker)).toBe(false)
    expect(existsSync(resolve(root, 'failure/raw.log'))).toBe(true)
    expect(existsSync(resolve(root, 'sibling/raw.log'))).toBe(true)
  })

  test.each([
    {
      name: 'telemetry unavailable',
      options: {
        sampleProcessTrees: () => {
          throw new Error('ps unavailable')
        },
      },
      failure: 'telemetry',
    },
    {
      name: 'RSS over budget',
      options: { sampleProcessTrees: (pids: number[]) => fixedSamples(pids, 2048) },
      failure: 'rss',
    },
  ])('fails closed on $name and cancels siblings', async ({ options, failure }) => {
    const root = testRoot()
    const result = await runReleaseChildGroup(
      [
        spec({ root, id: 'left', script: 'setTimeout(() => {}, 1000)', rssLimitBytes: 1024 }),
        spec({ root, id: 'right', script: 'setTimeout(() => {}, 1000)', rssLimitBytes: 1024 }),
      ],
      { echoOutput: false, sampleIntervalMs: 20, ...options },
    )
    expect(result.success).toBe(false)
    expect(result.children.some((child) => child.failureClass === failure)).toBe(true)
    expect(result.children.every((child) => child.cancelled)).toBe(true)
  })

  test('timeout is non-zero and kills the process group', async () => {
    const root = testRoot()
    const result = await runReleaseChildGroup(
      [spec({ root, id: 'slow', script: 'setTimeout(() => {}, 1000)', timeoutMs: 60 })],
      {
        echoOutput: false,
        sampleIntervalMs: 20,
        sampleProcessTrees: (pids) => fixedSamples(pids),
      },
    )
    expect(result.success).toBe(false)
    expect(result.children[0]?.failureClass).toBe('timeout')
  })

  test('classifies signal and V8 OOM without treating them as a normal exit', () => {
    expect(classifyChildFailure({ exitCode: null, signal: 'SIGTERM', stderrTail: '' })).toBe(
      'signal',
    )
    expect(
      classifyChildFailure({
        exitCode: 134,
        signal: null,
        stderrTail:
          'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
      }),
    ).toBe('oom')
  })
})
