import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { performance } from 'node:perf_hooks'

export const GIB = 1024 ** 3

export interface ProcessTreeSample {
  bytes: number
  pids: number[]
}

export interface ReleaseChildSpec {
  id: string
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  logPath: string
  reportPath: string | null
  tmpDir: string
  transactionRoot: string | null
  gate: string
  timeoutMs: number
  rssLimitBytes: number | null
}

export interface ReleaseChildResult {
  id: string
  pid: number | null
  processGroup: number | null
  startedAt: string
  durationMs: number
  exitCode: number | null
  signal: NodeJS.Signals | null
  maxRssBytes: number | null
  rssSamples: number
  rssSeries: Array<{ offsetMs: number; bytes: number; pids: number[] }>
  cancelled: boolean
  failureClass: 'exit' | 'signal' | 'oom' | 'timeout' | 'rss' | 'telemetry' | 'spawn' | null
  stderrTail: string
}

export interface ReleaseChildGroupResult {
  success: boolean
  error: string | null
  maxCombinedRssBytes: number | null
  combinedRssSamples: number
  combinedRssSeries: Array<{ offsetMs: number; bytes: number }>
  children: ReleaseChildResult[]
}

export interface ReleaseChildGroupOptions {
  sampleIntervalMs?: number
  combinedRssLimitBytes?: number | null
  abortSignal?: AbortSignal
  echoOutput?: boolean
  sampleProcessTrees?: (rootPids: number[]) => Map<number, ProcessTreeSample>
}

interface MutableChildState {
  spec: ReleaseChildSpec
  child: ChildProcess
  startedAt: string
  monotonicStartedAt: number
  log: ReturnType<typeof createWriteStream>
  stderrTail: string
  maxRssBytes: number | null
  rssSamples: number
  rssSeries: Array<{ offsetMs: number; bytes: number; pids: number[] }>
  cancelled: boolean
  timedOut: boolean
  rssFailed: boolean
  telemetryFailed: boolean
  spawnFailed: boolean
  result?: ReleaseChildResult
  completion?: Promise<ReleaseChildResult>
}

const STDERR_TAIL_LIMIT = 64 * 1024

export function parsePsTable(raw: string): Map<number, { parent: number; rssKiB: number }> {
  const processes = new Map<number, { parent: number; rssKiB: number }>()
  for (const line of raw.split('\n')) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 3) continue
    const pid = Number(fields[0])
    const parent = Number(fields[1])
    const rssKiB = Number(fields[2])
    if (
      Number.isSafeInteger(pid) &&
      Number.isSafeInteger(parent) &&
      Number.isSafeInteger(rssKiB) &&
      pid > 0 &&
      parent >= 0 &&
      rssKiB >= 0
    )
      processes.set(pid, { parent, rssKiB })
  }
  return processes
}

export function processTreeSamplesFromTable(
  processes: ReadonlyMap<number, { parent: number; rssKiB: number }>,
  rootPids: readonly number[],
): Map<number, ProcessTreeSample> {
  const result = new Map<number, ProcessTreeSample>()
  const allOwnedPids = new Map<number, number>()
  for (const rootPid of rootPids) {
    if (!processes.has(rootPid)) throw new Error(`release runner: PID ${rootPid} 的 RSS 不可读`)
    const descendants = new Set<number>([rootPid])
    let changed = true
    while (changed) {
      changed = false
      for (const [pid, info] of processes) {
        if (descendants.has(info.parent) && !descendants.has(pid)) {
          descendants.add(pid)
          changed = true
        }
      }
    }
    for (const pid of descendants) {
      const owner = allOwnedPids.get(pid)
      if (owner !== undefined && owner !== rootPid)
        throw new Error(`release runner: PID ${pid} 同时属于进程树 ${owner}/${rootPid}`)
      allOwnedPids.set(pid, rootPid)
    }
    const bytes = [...descendants].reduce(
      (total, pid) => total + (processes.get(pid)?.rssKiB ?? 0) * 1024,
      0,
    )
    if (!bytes) throw new Error(`release runner: PID ${rootPid} 的进程树 RSS 为零`)
    result.set(rootPid, {
      bytes,
      pids: [...descendants].sort((left, right) => left - right),
    })
  }
  return result
}

export function sampleProcessTreesRss(rootPids: number[]): Map<number, ProcessTreeSample> {
  if (process.platform === 'win32') throw new Error('release runner: Windows 不支持 ps RSS 采样')
  const raw = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  return processTreeSamplesFromTable(parsePsTable(raw), rootPids)
}

export function assertIsolatedChildSpecs(specs: readonly ReleaseChildSpec[]): void {
  if (specs.length === 0) throw new Error('release runner: child specs 为空')
  const ids = new Set<string>()
  const ownedPaths = new Map<string, string>()
  for (const spec of specs) {
    if (!spec.id.trim()) throw new Error('release runner: child id 为空')
    if (ids.has(spec.id)) throw new Error(`release runner: child id 重复 ${spec.id}`)
    ids.add(spec.id)
    if (!spec.gate.trim()) throw new Error(`release runner: ${spec.id} gate 为空`)
    if (!Number.isSafeInteger(spec.timeoutMs) || spec.timeoutMs <= 0)
      throw new Error(`release runner: ${spec.id} timeout 非法`)
    if (
      spec.rssLimitBytes !== null &&
      (!Number.isSafeInteger(spec.rssLimitBytes) || spec.rssLimitBytes <= 0)
    )
      throw new Error(`release runner: ${spec.id} RSS 上限非法`)
    const paths = [spec.logPath, spec.tmpDir, ...(spec.reportPath ? [spec.reportPath] : [])]
    if (spec.transactionRoot) paths.push(spec.transactionRoot)
    for (const path of paths) {
      const owner = ownedPaths.get(path)
      if (owner) throw new Error(`release runner: child 路径冲突 ${owner}/${spec.id}: ${path}`)
      ownedPaths.set(path, spec.id)
    }
    if (spec.env.TYPE_PAL_MIGRATE_TEST_GATE !== spec.gate)
      throw new Error(`release runner: ${spec.id} gate env 不一致`)
    for (const name of ['TMPDIR', 'TMP', 'TEMP'] as const) {
      if (spec.env[name] !== spec.tmpDir)
        throw new Error(`release runner: ${spec.id} ${name} 未绑定独立 tmpDir`)
    }
    if (spec.transactionRoot && spec.env.TYPE_PAL_MIGRATE_TRANSACTION_ROOT !== spec.transactionRoot)
      throw new Error(`release runner: ${spec.id} transaction root env 不一致`)
  }
}

export function classifyChildFailure(args: {
  exitCode: number | null
  signal: NodeJS.Signals | null
  stderrTail: string
  timedOut?: boolean
  rssFailed?: boolean
  telemetryFailed?: boolean
  spawnFailed?: boolean
}): ReleaseChildResult['failureClass'] {
  if (args.spawnFailed) return 'spawn'
  if (args.telemetryFailed) return 'telemetry'
  if (args.rssFailed) return 'rss'
  if (args.timedOut) return 'timeout'
  if (/heap out of memory|allocation failed|javascript heap/i.test(args.stderrTail)) return 'oom'
  if (args.signal) return 'signal'
  if (args.exitCode !== 0) return 'exit'
  return null
}

function terminateProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal)
    else child.kill(signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The process may have exited between the group signal and fallback.
    }
  }
}

function appendTail(current: string, chunk: string): string {
  const combined = `${current}${chunk}`
  return combined.length <= STDERR_TAIL_LIMIT ? combined : combined.slice(-STDERR_TAIL_LIMIT)
}

export async function runReleaseChildGroup(
  specs: readonly ReleaseChildSpec[],
  options: ReleaseChildGroupOptions = {},
): Promise<ReleaseChildGroupResult> {
  assertIsolatedChildSpecs(specs)
  const sampleIntervalMs = options.sampleIntervalMs ?? 1_000
  if (!Number.isSafeInteger(sampleIntervalMs) || sampleIntervalMs <= 0)
    throw new Error('release runner: RSS sample interval 非法')
  const combinedLimit = options.combinedRssLimitBytes ?? null
  if (combinedLimit !== null && (!Number.isSafeInteger(combinedLimit) || combinedLimit <= 0))
    throw new Error('release runner: combined RSS 上限非法')

  const states: MutableChildState[] = []
  let groupError: string | null = null
  let maxCombinedRssBytes: number | null = null
  let combinedRssSamples = 0
  const combinedRssSeries: Array<{ offsetMs: number; bytes: number }> = []
  const groupMonotonicStart = performance.now()
  let settled = false
  let killTimer: ReturnType<typeof setTimeout> | undefined

  const fail = (message: string): void => {
    groupError ??= message
    for (const state of states) {
      if (state.child.exitCode === null && state.child.signalCode === null) {
        state.cancelled = true
        terminateProcessGroup(state.child, 'SIGTERM')
      }
    }
    killTimer ??= setTimeout(() => {
      for (const state of states) {
        if (state.child.exitCode === null && state.child.signalCode === null)
          terminateProcessGroup(state.child, 'SIGKILL')
      }
    }, 5_000)
    killTimer.unref()
  }

  const abort = (): void => fail('release runner: 收到外部中止信号')
  options.abortSignal?.addEventListener('abort', abort, { once: true })

  try {
    for (const spec of specs) {
      mkdirSync(dirname(spec.logPath), { recursive: true })
      mkdirSync(spec.tmpDir, { recursive: true })
      if (spec.reportPath) mkdirSync(dirname(spec.reportPath), { recursive: true })
      if (spec.transactionRoot) mkdirSync(spec.transactionRoot, { recursive: true })
      const log = createWriteStream(spec.logPath, { flags: 'a' })
      let child: ChildProcess
      try {
        child = spawn(spec.command, spec.args, {
          cwd: spec.cwd,
          detached: process.platform !== 'win32',
          env: spec.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error) {
        log.end()
        fail(`release runner: ${spec.id} spawn 失败: ${String(error)}`)
        break
      }
      const state: MutableChildState = {
        spec,
        child,
        startedAt: new Date().toISOString(),
        monotonicStartedAt: performance.now(),
        log,
        stderrTail: '',
        maxRssBytes: null,
        rssSamples: 0,
        rssSeries: [],
        cancelled: false,
        timedOut: false,
        rssFailed: false,
        telemetryFailed: false,
        spawnFailed: false,
      }
      states.push(state)
      child.stdout?.setEncoding('utf8')
      child.stderr?.setEncoding('utf8')
      child.stdout?.on('data', (chunk: string) => {
        log.write(chunk)
        if (options.echoOutput !== false) process.stdout.write(`[${spec.id}] ${chunk}`)
      })
      child.stderr?.on('data', (chunk: string) => {
        state.stderrTail = appendTail(state.stderrTail, chunk)
        log.write(chunk)
        if (options.echoOutput !== false) process.stderr.write(`[${spec.id}] ${chunk}`)
      })
      child.once('error', (error) => {
        state.spawnFailed = true
        fail(`release runner: ${spec.id} child error: ${error.message}`)
      })
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          state.timedOut = true
          fail(`release runner: ${spec.id} 超时 ${spec.timeoutMs}ms`)
        }
      }, spec.timeoutMs).unref()
      state.completion = new Promise<ReleaseChildResult>((resolveResult) => {
        child.once('close', (exitCode, signal) => {
          const failureClass = classifyChildFailure({
            exitCode,
            signal,
            stderrTail: state.stderrTail,
            timedOut: state.timedOut,
            rssFailed: state.rssFailed,
            telemetryFailed: state.telemetryFailed,
            spawnFailed: state.spawnFailed,
          })
          const result: ReleaseChildResult = {
            id: state.spec.id,
            pid: state.child.pid ?? null,
            processGroup: process.platform !== 'win32' && state.child.pid ? state.child.pid : null,
            startedAt: state.startedAt,
            durationMs: performance.now() - state.monotonicStartedAt,
            exitCode,
            signal,
            maxRssBytes: state.maxRssBytes,
            rssSamples: state.rssSamples,
            rssSeries: state.rssSeries,
            cancelled: state.cancelled,
            failureClass,
            stderrTail: state.stderrTail,
          }
          state.result = result
          if (failureClass && !state.cancelled)
            fail(
              `release runner: ${state.spec.id} 失败 class=${failureClass} exit=${String(exitCode)} signal=${String(signal)}`,
            )
          state.log.end(() => resolveResult(result))
        })
      })
    }

    if (states.length !== specs.length) fail('release runner: child 未全部启动')

    const sample = (): void => {
      const running = states.filter(
        (state) => state.child.exitCode === null && state.child.signalCode === null,
      )
      if (!running.length) return
      const roots = running.flatMap((state) => (state.child.pid ? [state.child.pid] : []))
      if (roots.length !== running.length) {
        for (const state of running) state.telemetryFailed = true
        fail('release runner: child PID 缺失，无法采样 RSS')
        return
      }
      try {
        const samples = (options.sampleProcessTrees ?? sampleProcessTreesRss)(roots)
        let combined = 0
        for (const state of running) {
          const pid = state.child.pid
          const value = pid ? samples.get(pid) : undefined
          if (!value) throw new Error(`release runner: ${state.spec.id} RSS sample 缺失`)
          state.rssSamples += 1
          state.maxRssBytes = Math.max(state.maxRssBytes ?? 0, value.bytes)
          state.rssSeries.push({
            offsetMs: performance.now() - state.monotonicStartedAt,
            bytes: value.bytes,
            pids: value.pids,
          })
          combined += value.bytes
          if (state.spec.rssLimitBytes !== null && value.bytes > state.spec.rssLimitBytes) {
            state.rssFailed = true
            fail(
              `release runner: ${state.spec.id} RSS ${value.bytes} 超预算 ${state.spec.rssLimitBytes}`,
            )
          }
        }
        combinedRssSamples += 1
        maxCombinedRssBytes = Math.max(maxCombinedRssBytes ?? 0, combined)
        combinedRssSeries.push({
          offsetMs: performance.now() - groupMonotonicStart,
          bytes: combined,
        })
        if (combinedLimit !== null && combined > combinedLimit)
          fail(`release runner: combined RSS ${combined} 超预算 ${combinedLimit}`)
      } catch (error) {
        for (const state of running) state.telemetryFailed = true
        fail(
          `release runner: RSS 采样失败: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    const initialSample = setTimeout(sample, Math.min(100, sampleIntervalMs))
    const sampleTimer = setInterval(sample, sampleIntervalMs)
    const results = await Promise.all(
      states.map((state) => {
        if (!state.completion)
          throw new Error(`release runner: ${state.spec.id} completion 未初始化`)
        return state.completion
      }),
    )
    clearTimeout(initialSample)
    clearInterval(sampleTimer)
    settled = true
    for (const result of results) {
      if (result.rssSamples === 0 || result.maxRssBytes === null)
        groupError ??= `release runner: ${result.id} 缺少 RSS 样本`
      if (result.failureClass) groupError ??= `release runner: ${result.id} ${result.failureClass}`
    }
    return {
      success: groupError === null,
      error: groupError,
      maxCombinedRssBytes,
      combinedRssSamples,
      combinedRssSeries,
      children: results,
    }
  } finally {
    if (!settled && states.some((state) => !state.result))
      fail('release runner: child group 异常退出')
    if (killTimer) clearTimeout(killTimer)
    options.abortSignal?.removeEventListener('abort', abort)
  }
}
