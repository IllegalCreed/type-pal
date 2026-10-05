// TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（exit≠0 且恰 1 指定业务 AssertionError）→ git 字节还原 →
// 定向绿；raw 落盘统一 trimEof（恰好一个终止换行）并按落盘字节计算 sha256；四态 =
// 基线绿 / 各针红 / 各针还原绿 / 末次全套重放。逐针记录产品文件 原始/变异/恢复 hash。
// 临时树：每相位 raw 先写 mkdtemp 临时目录，终结化到证据目录后在 finally 移除，
// 清理证明（临时树存在性 before/after + 全仓 porcelain 仅剩证据新文件）写入回执。
// 任何一步不符即非零退出，不产出合格回执。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const reforge = path.join(root, 'packages/reforge')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-REFORGE-WORLD-LIFECYCLE-1')
const logs = path.join(ev, 'mutation-logs')

const FILES = [
  'src/deferred-trigger.world-lifecycle-1.test.ts',
  'src/async-intent.world-lifecycle-1.test.ts',
  'src/gameplay-clock.world-lifecycle-1.test.ts',
]

const hashBytes = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const run = (args, rawPath) => {
  let stdout = ''
  let exit = 0
  let signal = null
  try {
    stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', ...args], {
      cwd: reforge,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 240_000,
      env: { ...process.env, NODE_COMPILE_CACHE: '' },
    })
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exit = error.status ?? 1
    signal = error.signal ?? null
  }
  const trimmed = `${stdout.replace(/\n+$/, '')}\n`
  writeFileSync(rawPath, trimmed)
  return {
    exit,
    signal,
    sha: createHash('sha256').update(trimmed, 'utf8').digest('hex'),
    testsLine: stdout.match(/Tests\s+([^\n]+)/)?.[1]?.trim() ?? '',
    failedLine: stdout.match(/Failed Tests\s+([^\n]+)/)?.[1]?.trim() ?? '',
    firstFailure:
      stdout
        .split('\n')
        .find((line) => line.startsWith('AssertionError') || line.startsWith('Error: ')) ?? '',
  }
}

const mutate = (file, edits) => {
  const full = path.join(reforge, file)
  let source = readFileSync(full, 'utf8')
  for (const [oldText, newText] of edits) {
    if (source.split(oldText).length !== 2)
      throw new Error(`mutation anchor not unique in ${file}: ${oldText.slice(0, 60)}`)
    source = source.replace(oldText, newText)
  }
  writeFileSync(full, source)
}
const restore = (file) => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/reforge/${file}`], {
    stdio: 'ignore',
  })
}

const needles = [
  {
    id: 'N1-dt-clear-resets-fence',
    file: 'src/deferred-trigger.ts',
    edits: [
      [
        `  clear(): void {
    this.claim = null
    this.deliveryFence = false
  }`,
        `  clear(): void {
    this.claim = null
  }`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '原子复位未决 claim 与 deliveryFence'],
    mutation:
      'deferred-trigger.ts clear() 不再复位 deliveryFence → teardown 把 auto safe-point 围栏泄漏到新场景',
    expectedFailure: 'blocksAutoSafePoint 在 clear() 后仍为 true',
  },
  {
    id: 'N2-dt-fire-failure-dropped',
    file: 'src/deferred-trigger.ts',
    edits: [
      [
        `    this.claim = null
    if (!options.fire(claim)) return 'dropped'
    this.deliveryFence = true
    return 'started'`,
        `    this.claim = null
    options.fire(claim)
    this.deliveryFence = true
    return 'started'`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'fire 失败的落点按 dropped 收口：不设 deliveryFence、不保留 claim、不重试'],
    mutation:
      'deferred-trigger.ts drain() 忽略 fire 失败 → 未启动的交付仍报 started 并设 deliveryFence',
    expectedFailure: "drain 结果从 'dropped' 变 'started' 且 blocksAutoSafePoint 为 true",
  },
  {
    id: 'N3-async-capture-readonly',
    file: 'src/async-intent.ts',
    edits: [
      [
        `  capture(): number {
    return this.serial
  }`,
        `  capture(): number {
    return ++this.serial
  }`,
      ],
    ],
    target: FILES[1],
    filter: ['-t', '是只读快照：不换代、不作废在途 token'],
    mutation: 'async-intent.ts capture() 变换代读取 → 只读快照作废在途 token',
    expectedFailure: '连续两次 capture 返回不同 serial 且在途 begin token 被 capture 推翻',
  },
  {
    id: 'N4-clock-regression-clamp',
    file: 'src/gameplay-clock.ts',
    edits: [
      [
        `    const realDt = first ? 0 : Math.min(Math.max(0, realNow - this.lastReal), 100)`,
        `    const realDt = first ? 0 : Math.min(realNow - this.lastReal, 100)`,
      ],
    ],
    target: FILES[2],
    filter: ['-t', 'realNow 回退被钳为 0 dt，gameplayNow 单调不回退，恢复帧从重锚点起算'],
    mutation: 'gameplay-clock.ts 移除 dt 下限钳位 → realNow 回退倒扣 gameplayNow',
    expectedFailure: '回退帧 realDt/gameplayDt 为负且 gameplayNow 回退',
  },
]

const tempTree = mkdtempSync(path.join(tmpdir(), 'world-lifecycle-counterproof-'))
const receipt = { tempTree, phases: {}, needles: [], cleanup: {} }
let failed = false
const assertOk = (condition, message) => {
  if (!condition) {
    failed = true
    console.error(`[counterproof] FAIL: ${message}`)
  }
}

try {
  // 基线绿：三份定向文件全量。
  const baselineRaw = path.join(tempTree, 'green-baseline.raw')
  const baseline = run(FILES, baselineRaw)
  receipt.phases.greenBaseline = { ...baseline, raw: 'mutation-logs/green-baseline.raw' }
  execFileSync('mv', [baselineRaw, path.join(logs, 'green-baseline.raw')])
  assertOk(baseline.exit === 0, 'green baseline must pass')
  assertOk(/Tests\s+\d+ passed \(\d+\)/.test(`Tests ${baseline.testsLine}`), 'baseline all green')

  for (const needle of needles) {
    const productPath = path.join(reforge, needle.file)
    const originalHash = hashBytes(productPath)
    mutate(needle.file, needle.edits)
    const mutatedHash = hashBytes(productPath)

    const redRaw = path.join(tempTree, `${needle.id}.red.raw`)
    const red = run([needle.target, ...needle.filter], redRaw)
    execFileSync('mv', [redRaw, path.join(logs, `${needle.id}.red.raw`)])

    restore(needle.file)
    const restoredHash = hashBytes(productPath)
    const greenRaw = path.join(tempTree, `${needle.id}.green.raw`)
    const green = run([needle.target, ...needle.filter], greenRaw)
    execFileSync('mv', [greenRaw, path.join(logs, `${needle.id}.green.raw`)])

    receipt.needles.push({
      id: needle.id,
      mutation: needle.mutation,
      expectedFailure: needle.expectedFailure,
      file: needle.file,
      productHashes: { original: originalHash, mutated: mutatedHash, restored: restoredHash },
      hashRestoredEqualsOriginal: restoredHash === originalHash,
      red: {
        exit: red.exit,
        signal: red.signal,
        testsLine: red.testsLine,
        firstFailure: red.firstFailure,
        raw: `mutation-logs/${needle.id}.red.raw`,
        sha: red.sha,
      },
      restoredGreen: {
        exit: green.exit,
        testsLine: green.testsLine,
        raw: `mutation-logs/${needle.id}.green.raw`,
        sha: green.sha,
      },
    })

    assertOk(red.exit !== 0, `${needle.id}: red phase must exit non-zero`)
    assertOk(
      /1 failed/.test(red.testsLine),
      `${needle.id}: red phase must fail exactly the one targeted test (${red.testsLine})`,
    )
    assertOk(
      red.firstFailure.startsWith('AssertionError'),
      `${needle.id}: first failure must be a business AssertionError, got: ${red.firstFailure.slice(0, 80)}`,
    )
    assertOk(green.exit === 0, `${needle.id}: restored phase must pass`)
    assertOk(restoredHash === originalHash, `${needle.id}: restored bytes must equal original`)
  }

  // 末次全套重放：全部针还原后三份定向文件再跑一遍。
  const finalRaw = path.join(tempTree, 'final-replay.raw')
  const finalReplay = run(FILES, finalRaw)
  execFileSync('mv', [finalRaw, path.join(logs, 'final-replay.raw')])
  receipt.phases.finalReplay = { ...finalReplay, raw: 'mutation-logs/final-replay.raw' }
  assertOk(finalReplay.exit === 0, 'final replay must pass')

  // 产品零残留：本脚本运行后工作树不得有 M/D 产品文件（测试与证据已在/将在此提交前）。
  const porcelain = execFileSync('git', ['-C', root, 'status', '--porcelain'], {
    encoding: 'utf8',
  })
  receipt.cleanup.porcelainAfterRestore = porcelain.trim()
  assertOk(
    !porcelain.split('\n').some((line) => /^\s*[MD]\s+packages\/reforge\/src\//.test(line ?? '')),
    'no mutated product file may remain',
  )
} finally {
  const tempExistedBeforeRemoval = existsSync(tempTree)
  rmSync(tempTree, { recursive: true, force: true })
  receipt.cleanup.tempTree = {
    path: tempTree,
    existedBeforeRemoval: tempExistedBeforeRemoval,
    removed: !existsSync(tempTree),
  }
}

receipt.allPhasesValid = !failed
writeFileSync(path.join(ev, 'counterproof.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(`[counterproof] ${failed ? 'INVALID' : 'VALID'} — ${needles.length} needles`)
process.exit(failed ? 1 : 0)
