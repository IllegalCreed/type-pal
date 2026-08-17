import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  assertStableParallelBenefit,
  compareReleasePair,
  median,
  type ReleasePairEvidence,
} from '../src/release-proof-protocol.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '../..')
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function parseRoot(): string {
  let requested: string | undefined
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--run-root=')) requested = arg.slice('--run-root='.length)
    else if (arg !== '--') throw new Error(`release proof: unknown argument ${arg}`)
  }
  const batchId = `${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}-${randomBytes(4).toString('hex')}`
  const root = requested
    ? resolve(requested)
    : resolve(repoRoot, 'build/release-runs', `proof-${batchId}`)
  if (!isAbsolute(root)) throw new Error('release proof: run root 必须是绝对路径')
  if (existsSync(root)) throw new Error(`release proof: run root 已存在 ${root}`)
  return root
}

function terminate(child: ReturnType<typeof spawn>, signal: NodeJS.Signals): void {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal)
    else child.kill(signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The child may already have completed.
    }
  }
}

async function runMode(
  mode: 'serial-control' | 'parallel',
  runRoot: string,
  logPath: string,
): Promise<unknown> {
  mkdirSync(dirname(logPath), { recursive: true })
  const log = createWriteStream(logPath, { flags: 'a' })
  const child = spawn(
    pnpmCommand,
    ['exec', 'tsx', 'scripts/run-release-isolated.mts', `--mode=${mode}`, `--run-root=${runRoot}`],
    {
      cwd: packageRoot,
      detached: process.platform !== 'win32',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  const forward = (signal: NodeJS.Signals): void => terminate(child, signal)
  process.once('SIGINT', forward)
  process.once('SIGTERM', forward)
  child.stdout?.on('data', (chunk: Buffer) => {
    log.write(chunk)
    process.stdout.write(chunk)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    log.write(chunk)
    process.stderr.write(chunk)
  })
  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>(
    (resolveResult, rejectResult) => {
      child.once('error', rejectResult)
      child.once('close', (exitCode, signal) => resolveResult({ exitCode, signal }))
    },
  )
  process.removeListener('SIGINT', forward)
  process.removeListener('SIGTERM', forward)
  log.end()
  if (result.exitCode !== 0 || result.signal)
    throw new Error(
      `release proof: ${mode} child 失败 exit=${String(result.exitCode)} signal=${String(result.signal)}`,
    )
  const summaryPath = resolve(runRoot, 'summary.json')
  if (!existsSync(summaryPath)) throw new Error(`release proof: summary 缺失 ${summaryPath}`)
  return JSON.parse(readFileSync(summaryPath, 'utf8')) as unknown
}

async function main(): Promise<void> {
  const runRoot = parseRoot()
  mkdirSync(runRoot, { recursive: true })
  const startedAt = new Date().toISOString()
  const monotonicStart = performance.now()
  const pairs: ReleasePairEvidence[] = []
  const errors: string[] = []
  try {
    for (let index = 1; index <= 3; index += 1) {
      const pairRoot = resolve(runRoot, `pair-${index}`)
      const serialRoot = resolve(pairRoot, 'serial-control')
      const parallelRoot = resolve(pairRoot, 'parallel')
      const serial = await runMode(
        'serial-control',
        serialRoot,
        resolve(pairRoot, 'serial-control.runner.log'),
      )
      const parallel = await runMode(
        'parallel',
        parallelRoot,
        resolve(pairRoot, 'parallel.runner.log'),
      )
      const evidence = compareReleasePair(serial, parallel)
      pairs.push(evidence)
      writeFileSync(resolve(pairRoot, 'comparison.json'), `${JSON.stringify(evidence, null, 2)}\n`)
    }
    assertStableParallelBenefit(pairs)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  const summary = {
    schemaVersion: 1,
    success: errors.length === 0 && pairs.length === 3,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: performance.now() - monotonicStart,
    runRoot,
    pairs,
    metrics:
      pairs.length > 0
        ? {
            savedMsMedian: median(pairs.map((pair) => pair.savedMs)),
            savedMsMin: Math.min(...pairs.map((pair) => pair.savedMs)),
            savedMsMax: Math.max(...pairs.map((pair) => pair.savedMs)),
            serialWallMsMedian: median(pairs.map((pair) => pair.serialDurationMs)),
            parallelWallMsMedian: median(pairs.map((pair) => pair.parallelDurationMs)),
            serialRssBytesMax: Math.max(...pairs.map((pair) => pair.serialMaxRssBytes)),
            sharedRssBytesMax: Math.max(...pairs.map((pair) => pair.sharedMaxRssBytes)),
            freshRssBytesMax: Math.max(...pairs.map((pair) => pair.freshMaxRssBytes)),
            combinedRssBytesMax: Math.max(...pairs.map((pair) => pair.combinedMaxRssBytes)),
          }
        : null,
    errors,
  }
  const summaryPath = resolve(runRoot, 'proof-summary.json')
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`\n[release proof] ${summary.success ? 'PASS' : 'FAIL'}`)
  console.log(`[release proof] summary=${summaryPath}`)
  if (!summary.success) process.exitCode = 1
}

await main()
