import { createHash } from 'node:crypto'

export interface ComparableReleaseSummary {
  schemaVersion: 1
  runId: string
  mode: 'parallel' | 'serial-control'
  success: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
  runRoot: string
  git: { head: string; statusSha256: string }
  host: {
    platform: string
    arch: string
    node: string
    cpuCount: number
    cpuModel: string
    totalMemoryBytes: number
    loadAverageStart: number[]
    loadAverageBeforeParallel: number[] | null
    loadAverageEnd: number[]
  }
  manifest: {
    files: number
    tests: number
    sha256: string
    routeSha256: string
  }
  coverage: {
    files: number
    tests: number
    assertions: number
    passed: number
    skipped: number
    unlistedSkipped: number
    failed: number
    outcomeSha256: string
    testListSha256: string
    routeSha256: string
  }
  protectedWorkspace: {
    writes: number
    deletes: number
    conflicts: number
    beforeSha256: string
    afterSha256: string
  }
  maxCombinedParallelRssBytes: number | null
  phases: Array<{
    id: string
    group: {
      maxCombinedRssBytes: number | null
      children: Array<{ id: string; maxRssBytes: number | null }>
    }
  }>
  errors: string[]
}

export interface ReleasePairEvidence {
  serialRunId: string
  parallelRunId: string
  serialDurationMs: number
  parallelDurationMs: number
  savedMs: number
  coverageSha256: string
  testListSha256: string
  routeSha256: string
  serialMaxRssBytes: number
  sharedMaxRssBytes: number
  freshMaxRssBytes: number
  combinedMaxRssBytes: number
  hostSha256: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function validateComparableReleaseSummary(value: unknown): ComparableReleaseSummary {
  if (!isRecord(value) || value.schemaVersion !== 1)
    throw new Error('release proof: summary schemaVersion 非法')
  if (value.mode !== 'serial-control' && value.mode !== 'parallel')
    throw new Error('release proof: summary mode 非法')
  if (value.success !== true || !Array.isArray(value.errors) || value.errors.length)
    throw new Error('release proof: summary 未成功')
  if (
    !isRecord(value.git) ||
    typeof value.git.head !== 'string' ||
    !validDigest(value.git.statusSha256)
  )
    throw new Error('release proof: git evidence 非法')
  if (!isRecord(value.host) || !nonNegative(value.host.totalMemoryBytes))
    throw new Error('release proof: host evidence 非法')
  if (!isRecord(value.manifest) || !validDigest(value.manifest.routeSha256))
    throw new Error('release proof: manifest evidence 非法')
  if (
    !isRecord(value.coverage) ||
    !validDigest(value.coverage.outcomeSha256) ||
    !validDigest(value.coverage.testListSha256) ||
    !validDigest(value.coverage.routeSha256)
  )
    throw new Error('release proof: coverage evidence 非法')
  if (
    !isRecord(value.protectedWorkspace) ||
    value.protectedWorkspace.writes !== 0 ||
    value.protectedWorkspace.deletes !== 0 ||
    value.protectedWorkspace.conflicts !== 0 ||
    value.protectedWorkspace.beforeSha256 !== value.protectedWorkspace.afterSha256
  )
    throw new Error('release proof: protected workspace 非零')
  if (!Array.isArray(value.phases) || !nonNegative(value.durationMs))
    throw new Error('release proof: phase/duration evidence 非法')
  return value as unknown as ComparableReleaseSummary
}

function phasePeak(summary: ComparableReleaseSummary, id: string): number {
  const phase = summary.phases.find((entry) => entry.id === id)
  if (!phase) throw new Error(`release proof: phase 缺失 ${id}`)
  const values = phase.group.children.map((child) => child.maxRssBytes)
  if (!values.length || values.some((value) => !nonNegative(value)))
    throw new Error(`release proof: phase RSS 缺失 ${id}`)
  return Math.max(...(values as number[]))
}

function hostIdentity(summary: ComparableReleaseSummary): Record<string, unknown> {
  return {
    platform: summary.host.platform,
    arch: summary.host.arch,
    node: summary.host.node,
    cpuCount: summary.host.cpuCount,
    cpuModel: summary.host.cpuModel,
    totalMemoryBytes: summary.host.totalMemoryBytes,
  }
}

export function compareReleasePair(
  serialValue: unknown,
  parallelValue: unknown,
): ReleasePairEvidence {
  const serial = validateComparableReleaseSummary(serialValue)
  const parallel = validateComparableReleaseSummary(parallelValue)
  if (serial.mode !== 'serial-control' || parallel.mode !== 'parallel')
    throw new Error('release proof: pair mode 顺序必须是 serial-control -> parallel')
  if (
    serial.git.head !== parallel.git.head ||
    serial.git.statusSha256 !== parallel.git.statusSha256
  )
    throw new Error('release proof: pair git identity 不一致')
  const serialHost = stableJson(hostIdentity(serial))
  const parallelHost = stableJson(hostIdentity(parallel))
  if (serialHost !== parallelHost) throw new Error('release proof: pair host identity 不一致')
  for (const key of ['files', 'tests', 'sha256', 'routeSha256'] as const)
    if (serial.manifest[key] !== parallel.manifest[key])
      throw new Error(`release proof: manifest ${key} 不一致`)
  for (const key of [
    'files',
    'tests',
    'assertions',
    'passed',
    'skipped',
    'unlistedSkipped',
    'failed',
    'outcomeSha256',
    'testListSha256',
    'routeSha256',
  ] as const)
    if (serial.coverage[key] !== parallel.coverage[key])
      throw new Error(`release proof: coverage ${key} 不一致`)
  const combined = parallel.maxCombinedParallelRssBytes
  if (!nonNegative(combined)) throw new Error('release proof: parallel combined RSS 缺失')
  return {
    serialRunId: serial.runId,
    parallelRunId: parallel.runId,
    serialDurationMs: serial.durationMs,
    parallelDurationMs: parallel.durationMs,
    savedMs: serial.durationMs - parallel.durationMs,
    coverageSha256: serial.coverage.outcomeSha256,
    testListSha256: serial.coverage.testListSha256,
    routeSha256: serial.coverage.routeSha256,
    serialMaxRssBytes: phasePeak(serial, 'canonical-release'),
    sharedMaxRssBytes: phasePeak(parallel, 'release-pal-shared'),
    freshMaxRssBytes: phasePeak(parallel, 'release-pal-fresh'),
    combinedMaxRssBytes: combined,
    hostSha256: sha256(serialHost),
  }
}

export function median(values: readonly number[]): number {
  if (!values.length) throw new Error('release proof: median 输入为空')
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function assertStableParallelBenefit(pairs: readonly ReleasePairEvidence[]): void {
  if (pairs.length !== 3) throw new Error(`release proof: 需要 3 组对照，实际 ${pairs.length}`)
  if (new Set(pairs.map((pair) => pair.hostSha256)).size !== 1)
    throw new Error('release proof: 三组 host identity 不一致')
  if (new Set(pairs.map((pair) => pair.testListSha256)).size !== 1)
    throw new Error('release proof: 三组 test list 不一致')
  if (new Set(pairs.map((pair) => pair.routeSha256)).size !== 1)
    throw new Error('release proof: 三组 route digest 不一致')
  if (new Set(pairs.map((pair) => pair.coverageSha256)).size !== 1)
    throw new Error('release proof: 三组 coverage digest 不一致')
  if (pairs.some((pair) => pair.savedMs <= 0))
    throw new Error('release proof: 至少一组 parallel 没有正墙钟收益')
  if (median(pairs.map((pair) => pair.savedMs)) <= 0)
    throw new Error('release proof: parallel 墙钟收益中位数不为正')
}
