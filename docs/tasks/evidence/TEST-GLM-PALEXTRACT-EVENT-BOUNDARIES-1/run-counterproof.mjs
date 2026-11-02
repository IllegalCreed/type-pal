// TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 反控 runner v2（r2，Codex 二审返工）。
// 判据全部来自 `vitest run --reporter=json --outputFile=<tmp>` 的机读 JSON：
//   - 相位计数 numFailedTests / numPendingTests / numTodoTests / numTotalTests；
//   - 完整执行集 file×fullName×status（排序稳定摘要）+ 规范序列化 sha256；
//   - 失败条目 fullName 严格 === 目标合同 fullName（由 original 执行集按 title 唯一提取）；
//   - 唯一失败条目的 failureMessages 中恰 1 条以 AssertionError 开头且含指定差异子串。
// stdout 只落档（trimEof 恰一终止换行）不作判据；旧 `/1 failed/` 文本匹配已废除。
// 红相位门：exit!==0 && signal===null && spawnError===null && numFailedTests===1
//   && numPendingTests===0 && numTodoTests===0 && 无 runtime/collection error。
// 绿相位门：exit===0 && 三失败类计数 0 && numTotalTests>0 && 全 passed && 无 runtime error。
// restored / finalReplay 的完整执行集必须与 original 逐三元组一致（identity set）。
// 自测反例（synthetic phase 喂同一验证器）：两失败 / 错误 fullName / exit 0 / pending /
// todo / runtime error / collection error / signal / spawn 失败 / 绿相位带失败 ——
// 全部必须被拒；另含 canonical 红/绿正控（防验证器恒拒）。任何一步不符即非零退出。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const pkg = path.join(root, 'packages/pal-extract')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1')
const logs = path.join(ev, 'mutation-logs')

const TARGET_FILE = 'src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts'
const PRODUCT_FILE = 'src/resources/parsers/player-roles.ts'

const hashBytes = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const shaText = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const trimEof = (text) => `${text.replace(/\n+$/, '')}\n`

const tempTree = mkdtempSync(path.join(tmpdir(), 'palextract-boundaries-counterproof-'))

// ── 相位执行：唯一 spawn 口径（cwd=包根裸 exec，防 pnpm 递归 banner 污染 stdout） ──
const runPhase = (id) => {
  const jsonPath = path.join(tempTree, `${id}.json`)
  let stdout = ''
  let exit = 0
  let signal = null
  let spawnError = null
  try {
    stdout = execFileSync(
      'pnpm',
      ['exec', 'vitest', 'run', '--reporter=json', `--outputFile=${jsonPath}`, TARGET_FILE],
      {
        cwd: pkg,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 240_000,
        env: { ...process.env, NODE_COMPILE_CACHE: '' },
      },
    )
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exit = error.status ?? 1
    signal = error.signal ?? null
    if (error.code) spawnError = String(error.code)
  }
  let parsed = null
  if (spawnError === null) {
    if (!existsSync(jsonPath)) spawnError = 'json-output-missing'
    else {
      try {
        parsed = JSON.parse(readFileSync(jsonPath, 'utf8'))
      } catch {
        spawnError = 'json-output-unparseable'
      }
    }
  }

  const assertions = []
  const executionSet = []
  const runtimeErrors = []
  const failedEntries = []
  if (parsed) {
    for (const tr of parsed.testResults ?? []) {
      const file = tr.name ? tr.name.split('/').pop() : '?'
      const message = tr.message?.trim()
      if (message) runtimeErrors.push(`${file}: ${message.slice(0, 120)}`)
      if (!tr.assertionResults || tr.assertionResults.length === 0)
        runtimeErrors.push(`${file}: collection-error-empty-assertions`)
      for (const a of tr.assertionResults ?? []) {
        assertions.push({ file, fullName: a.fullName, title: a.title, status: a.status })
        executionSet.push([file, a.fullName, a.status])
        if (a.status === 'failed')
          failedEntries.push({
            file,
            fullName: a.fullName,
            failureMessages: a.failureMessages ?? [],
          })
      }
    }
  }
  executionSet.sort((x, y) =>
    x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0,
  )
  writeFileSync(path.join(logs, `${id}.raw`), trimEof(stdout))
  execFileSync('mv', [jsonPath, path.join(logs, `${id}.json`)])
  return {
    exit,
    signal,
    spawnError,
    counts: parsed
      ? {
          total: parsed.numTotalTests ?? 0,
          passed: parsed.numPassedTests ?? 0,
          failed: parsed.numFailedTests ?? 0,
          pending: parsed.numPendingTests ?? 0,
          todo: parsed.numTodoTests ?? 0,
        }
      : null,
    executionSet,
    executionSetSha: shaText(JSON.stringify(executionSet)),
    runtimeErrors,
    failedEntries,
    assertions,
    raw: `mutation-logs/${id}.raw`,
    json: `mutation-logs/${id}.json`,
  }
}

// ── 验证器：problems 非空 = 拒收 ──────────────────────────────────────────────
const baseProblems = (phase) => {
  const problems = []
  if (phase.spawnError !== null) problems.push(`spawnError=${phase.spawnError}`)
  if (phase.signal !== null) problems.push(`signal=${phase.signal}`)
  if (!phase.counts) problems.push('no-json-counts')
  if (phase.runtimeErrors.length)
    problems.push(`runtimeErrors=${JSON.stringify(phase.runtimeErrors)}`)
  return problems
}

const greenProblems = (phase) => {
  const problems = baseProblems(phase)
  if (phase.exit !== 0) problems.push(`exit=${phase.exit}`)
  if (phase.counts) {
    if (phase.counts.failed !== 0) problems.push(`numFailedTests=${phase.counts.failed}`)
    if (phase.counts.pending !== 0) problems.push(`numPendingTests=${phase.counts.pending}`)
    if (phase.counts.todo !== 0) problems.push(`numTodoTests=${phase.counts.todo}`)
    if (phase.counts.total === 0) problems.push('numTotalTests=0')
  }
  if (!phase.executionSet.every((e) => e[2] === 'passed'))
    problems.push('non-passed-entry-in-execution-set')
  return problems
}

const redProblems = (phase, target) => {
  const problems = baseProblems(phase)
  if (phase.exit === 0) problems.push('exit=0')
  if (phase.counts) {
    if (phase.counts.failed !== 1) problems.push(`numFailedTests=${phase.counts.failed}`)
    if (phase.counts.pending !== 0) problems.push(`numPendingTests=${phase.counts.pending}`)
    if (phase.counts.todo !== 0) problems.push(`numTodoTests=${phase.counts.todo}`)
  }
  if (phase.failedEntries.length !== 1)
    problems.push(`failed-entries=${phase.failedEntries.length}`)
  else {
    const f = phase.failedEntries[0]
    if (f.fullName !== target.fullName)
      problems.push(`failed-fullName=${JSON.stringify(f.fullName)} != target-fullName`)
    const assertionMatches = f.failureMessages.filter(
      (m) => m.startsWith('AssertionError') && m.includes(target.assertionSubstring),
    )
    if (assertionMatches.length !== 1)
      problems.push(`assertion-substring-matches=${assertionMatches.length}`)
  }
  return problems
}

const identitySetEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ── 自测反例：synthetic phase 喂同一验证器，全部必须被拒 ────────────────────────
const synTarget = { fullName: 'd t1', assertionSubstring: 'AssertionError: expected [' }
const mkSynthetic = (over = {}) => ({
  exit: 1,
  signal: null,
  spawnError: null,
  runtimeErrors: [],
  counts: { total: 2, passed: 1, failed: 1, pending: 0, todo: 0 },
  executionSet: [
    ['f.test.ts', 'd t1', 'failed'],
    ['f.test.ts', 'd t2', 'passed'],
  ],
  failedEntries: [
    {
      file: 'f.test.ts',
      fullName: 'd t1',
      failureMessages: ['AssertionError: expected [ to deeply equal'],
    },
  ],
  ...over,
})

const selfTestCases = [
  {
    case: 'two-failures',
    phase: mkSynthetic({
      counts: { total: 2, passed: 0, failed: 2, pending: 0, todo: 0 },
      executionSet: [
        ['f.test.ts', 'd t1', 'failed'],
        ['f.test.ts', 'd t2', 'failed'],
      ],
      failedEntries: [
        { file: 'f.test.ts', fullName: 'd t1', failureMessages: ['AssertionError: expected ['] },
        { file: 'f.test.ts', fullName: 'd t2', failureMessages: ['AssertionError: expected ['] },
      ],
    }),
  },
  {
    case: 'wrong-fullname',
    phase: mkSynthetic({
      failedEntries: [
        { file: 'f.test.ts', fullName: 'd other', failureMessages: ['AssertionError: expected ['] },
      ],
    }),
  },
  { case: 'red-exit-zero', phase: mkSynthetic({ exit: 0 }) },
  {
    case: 'pending-test',
    phase: mkSynthetic({
      counts: { total: 2, passed: 0, failed: 1, pending: 1, todo: 0 },
      executionSet: [
        ['f.test.ts', 'd t1', 'failed'],
        ['f.test.ts', 'd t2', 'pending'],
      ],
    }),
  },
  {
    case: 'todo-test',
    phase: mkSynthetic({ counts: { total: 2, passed: 1, failed: 1, pending: 0, todo: 1 } }),
  },
  {
    case: 'runtime-error',
    phase: mkSynthetic({ runtimeErrors: ['f.test.ts: Cannot find module'] }),
  },
  {
    case: 'collection-error-empty-assertions',
    phase: mkSynthetic({ runtimeErrors: ['f.test.ts: collection-error-empty-assertions'] }),
  },
  { case: 'signal-failure', phase: mkSynthetic({ signal: 'SIGTERM' }) },
  { case: 'spawn-failure', phase: mkSynthetic({ spawnError: 'ENOENT' }) },
  {
    case: 'green-phase-with-failure',
    validator: 'green',
    phase: mkSynthetic(),
  },
]

// ── 变异定义（锚文本须在产品文件命中恰 1 次） ───────────────────────────────────
const needles = [
  {
    id: 'N1-name-pointer-clamped',
    title:
      'rgwName 指针越 persons 表或 0 哨兵 → 该 role 安全缺省 _name，表内命中与 3/4 对调不受污染',
    assertionSubstring: "AssertionError: expected [ '李逍遥', '李逍遥',",
    edits: [
      [
        `    const personIdx = name[i]! - PERSONS_WORD_OFFSET`,
        `    const personIdx = Math.max(0, name[i]! - PERSONS_WORD_OFFSET)`,
      ],
    ],
    mutation:
      'player-roles.ts 名称指针下限钳 0 → 0 哨兵缺省 role 错取 persons[0] 当名（越表尾不受此钳影响）',
    expectedFailure: 'roles[1]._name 由 undefined 变 李逍遥（_name 映射数组 toEqual 首失）',
  },
  {
    id: 'N2-elem-water-earth-transposed',
    title: 'elemResistance water 与 earth 两键行列映射判别补全（手写字面量 5 键钉死）',
    assertionSubstring: 'AssertionError: expected { wind: +0, thunder: +0, …(3) } to deeply equal',
    edits: [
      [
        `        water: elemResRows[2]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[4]![i]!,`,
        `        water: elemResRows[4]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[2]![i]!,`,
      ],
    ],
    mutation: 'player-roles.ts elemResistance 手写键字面量 water↔earth 行互换',
    expectedFailure: 'roles[0].elemResistance 变 {water:50, earth:30}（toEqual 首失）',
  },
]

const mutate = (edits) => {
  const full = path.join(pkg, PRODUCT_FILE)
  let source = readFileSync(full, 'utf8')
  for (const [oldText, newText] of edits) {
    if (source.split(oldText).length !== 2)
      throw new Error(`mutation anchor not unique in ${PRODUCT_FILE}: ${oldText.slice(0, 60)}`)
    source = source.replace(oldText, newText)
  }
  writeFileSync(full, source)
}
const restore = () => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/pal-extract/${PRODUCT_FILE}`], {
    stdio: 'ignore',
  })
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
const receipt = {
  card: 'TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1',
  schema: 'vitest-json-reporter-v2',
  tempTree,
  phases: {},
  needles: [],
  selfTest: [],
  cleanup: {},
}
let failed = false
const assertOk = (condition, message) => {
  if (!condition) {
    failed = true
    console.error(`[counterproof] FAIL: ${message}`)
  }
}

try {
  // 0) 自测反例：同一验证器必须拒收全部非法形态，且正控形态必须通过。
  for (const c of selfTestCases) {
    const problems =
      c.validator === 'green' ? greenProblems(c.phase) : redProblems(c.phase, synTarget)
    const rejected = problems.length > 0
    receipt.selfTest.push({ case: c.case, expected: 'rejected', rejected, problems })
    assertOk(rejected, `self-test ${c.case} must be rejected`)
  }
  const canonicalRed = redProblems(mkSynthetic(), synTarget)
  const canonicalGreen = greenProblems(
    mkSynthetic({
      exit: 0,
      counts: { total: 2, passed: 2, failed: 0, pending: 0, todo: 0 },
      executionSet: [
        ['f.test.ts', 'd t1', 'passed'],
        ['f.test.ts', 'd t2', 'passed'],
      ],
      failedEntries: [],
    }),
  )
  receipt.selfTest.push({
    case: 'canonical-red-accepted',
    expected: 'accepted',
    rejected: canonicalRed.length > 0,
    problems: canonicalRed,
  })
  receipt.selfTest.push({
    case: 'canonical-green-accepted',
    expected: 'accepted',
    rejected: canonicalGreen.length > 0,
    problems: canonicalGreen,
  })
  assertOk(canonicalRed.length === 0, 'self-test canonical red must be accepted')
  assertOk(canonicalGreen.length === 0, 'self-test canonical green must be accepted')
  const driftDetected = !identitySetEq(
    [
      ['f.test.ts', 'd t1', 'passed'],
      ['f.test.ts', 'd t2', 'passed'],
    ],
    [['f.test.ts', 'd t1', 'passed']],
  )
  receipt.selfTest.push({
    case: 'identity-drift-detected',
    expected: 'detected',
    rejected: driftDetected,
    problems: [],
  })
  assertOk(driftDetected, 'self-test identity drift must be detected')

  // 1) original：未变异产品全文件绿；从此提取各针目标合同 fullName（title 唯一匹配）。
  const original = runPhase('original')
  receipt.phases.original = original
  const originalProblems = greenProblems(original)
  assertOk(
    originalProblems.length === 0,
    `original phase must be green: ${originalProblems.join('; ')}`,
  )

  // 2) 逐针：变异 → 红（全文件、不 -t 过滤——同时证明针不误伤兄弟测试）→ 还原 → 还原绿。
  for (const needle of needles) {
    const matches = original.assertions.filter((a) => a.title === needle.title)
    assertOk(matches.length === 1, `needle ${needle.id}: title must match exactly one assertion`)
    const target = {
      fullName: matches[0]?.fullName,
      title: needle.title,
      assertionSubstring: needle.assertionSubstring,
    }

    const productPath = path.join(pkg, PRODUCT_FILE)
    const originalHash = hashBytes(productPath)
    mutate(needle.edits)
    const mutatedHash = hashBytes(productPath)

    const red = runPhase(`${needle.id}.red`)
    const redPs = redProblems(red, target)

    restore()
    const restoredHash = hashBytes(productPath)
    const green = runPhase(`${needle.id}.green`)
    const greenPs = greenProblems(green)
    const identityEq = identitySetEq(green.executionSet, original.executionSet)

    receipt.needles.push({
      id: needle.id,
      mutation: needle.mutation,
      expectedFailure: needle.expectedFailure,
      file: PRODUCT_FILE,
      target,
      productHashes: {
        original: originalHash,
        mutated: mutatedHash,
        restored: restoredHash,
      },
      hashRestoredEqualsOriginal: restoredHash === originalHash,
      red: {
        exit: red.exit,
        signal: red.signal,
        spawnError: red.spawnError,
        counts: red.counts,
        failedEntries: red.failedEntries.map((f) => ({
          file: f.file,
          fullName: f.fullName,
          failureMessageHeads: f.failureMessages.map((m) => m.slice(0, 160)),
        })),
        problems: redPs,
        executionSet: red.executionSet,
        executionSetSha: red.executionSetSha,
        raw: red.raw,
        json: red.json,
      },
      restoredGreen: {
        exit: green.exit,
        signal: green.signal,
        spawnError: green.spawnError,
        counts: green.counts,
        problems: greenPs,
        executionSet: green.executionSet,
        executionSetSha: green.executionSetSha,
        identitySetEqualsOriginal: identityEq,
        raw: green.raw,
        json: green.json,
      },
    })

    assertOk(redPs.length === 0, `${needle.id}: red phase invalid: ${redPs.join('; ')}`)
    assertOk(greenPs.length === 0, `${needle.id}: restored green invalid: ${greenPs.join('; ')}`)
    assertOk(identityEq, `${needle.id}: restored execution set must equal original`)
    assertOk(restoredHash === originalHash, `${needle.id}: restored bytes must equal original`)
  }

  // 3) finalReplay：全部针还原后再跑全文件，执行集与 original 完全一致。
  const finalReplay = runPhase('final-replay')
  receipt.phases.finalReplay = finalReplay
  const finalPs = greenProblems(finalReplay)
  const finalIdentityEq = identitySetEq(finalReplay.executionSet, original.executionSet)
  receipt.phases.finalReplayIdentitySetEqualsOriginal = finalIdentityEq
  assertOk(finalPs.length === 0, `final replay must be green: ${finalPs.join('; ')}`)
  assertOk(finalIdentityEq, 'final replay execution set must equal original')

  // 4) 产品零残留 + porcelain 复核。
  const porcelain = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' })
  receipt.cleanup.porcelainAfterRestore = porcelain.trim()
  assertOk(
    !porcelain
      .split('\n')
      .some((line) => /^\s*[MD]\s+packages\/pal-extract\/src\//.test(line ?? '')),
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
console.log(
  `[counterproof] ${failed ? 'INVALID' : 'VALID'} — ${needles.length} needles, ${receipt.selfTest.length} self-test cases`,
)
process.exit(failed ? 1 : 0)
