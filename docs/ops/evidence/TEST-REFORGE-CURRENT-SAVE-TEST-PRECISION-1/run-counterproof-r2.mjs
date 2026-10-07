// TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 r2 反控 runner(按 Codex B-R1 counter 有限重采)。
//
// 范围:B-R1-01 归还的四条独立接线合同 + 容器缺席拆分后的两条独立身份。r1 的 14 针证据
// (counterproof.json/counterproof-runs/)原样保留;本 runner 只重采受影响执行集:新绿基线
// (三文件执行集,结构/codec 文件行数已变)→ 6 针逐针红(独立新树/冻结源核验/恰一文本变异/
// 恰一指定业务 AssertionError)→ 还原绿(执行集与快照逐字一致)→ 末次重放。判据库
// lib-isolated-tree.mjs 与 r1 完全相同(未改);真实 Vitest 探针证据沿用 r1
// (probe-*.raw/json),此处仅重跑内存内 judgeSelfTest。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildIsolatedTree,
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  REPO,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-isolated-tree.mjs'

const EVIDENCE_DIR = import.meta.dirname
const RUNS_DIR = path.join(EVIDENCE_DIR, 'counterproof-r2-runs')

const STRUCTURE_TEST = 'src/save/current-structure.test.ts'
const CODEC_TEST = 'src/save/current-codec.contracts.test.ts'

const M_THROW = 'expected [Function] to throw an error'
const M_EQUAL = 'to deeply equal'

const NEEDLES = [
  {
    id: 'NR1-gridpos-height-wiring',
    file: 'src/save/current-structure.ts',
    from: `requireFiniteNumber(pos.height, \`\${path}.height\`)`,
    to: `if (pos.height !== undefined) requireFiniteNumber(pos.height, \`\${path}.height\`)`,
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） position 坏形状 缺 height（独立接线，B-R1-01 归还） 带路径拒绝',
    marker: M_THROW,
    axis: 'r2 B-R1-01:assertGridPos height 有限数接线(current-structure.ts:114)',
  },
  {
    id: 'NR2-appearance-spriteid-wiring',
    file: 'src/save/current-structure.ts',
    from: 'optional(appearance.spriteId,',
    to: 'if (false) optional(appearance.spriteId,',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · CharacterInstance（party 与 reserve 同型） 实例坏形状 appearance.spriteId=数字（独立接线，B-R1-01 归还） 带路径拒绝',
    marker: M_THROW,
    axis: 'r2 B-R1-01:assertAppearance spriteId 自有 optional 闭包(current-structure.ts:147-149)',
  },
  {
    id: 'NR3-appearance-battlesprite-wiring',
    file: 'src/save/current-structure.ts',
    from: 'optional(appearance.battleSprite,',
    to: 'if (false) optional(appearance.battleSprite,',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · CharacterInstance（party 与 reserve 同型） 实例坏形状 appearance.battleSprite=null（非可选 null；独立接线，B-R1-01 归还） 带路径拒绝',
    marker: M_THROW,
    axis: 'r2 B-R1-01:assertAppearance battleSprite 自有 optional 闭包(current-structure.ts:155-157)',
  },
  {
    id: 'NR4-skillusecounts-inner-wiring',
    file: 'src/save/current-structure.ts',
    from: `requireFiniteNumberRecord(entry, \`\${path}[\${JSON.stringify(key)}]\`)`,
    to: `if (false) requireFiniteNumberRecord(entry, \`\${path}[\${JSON.stringify(key)}]\`)`,
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · 可选子树存在时的形状检查 可选子树 skillUseCounts 内层值非有限数（独立接线，B-R1-01 归还） 拒绝',
    marker: M_THROW,
    axis: 'r2 B-R1-01:assertSkillUseCounts 内层有限数接线(current-structure.ts:207-211)',
  },
  {
    id: 'NR5-skillusecounts-absence-fill',
    file: 'src/save/current-codec.ts',
    from: 'worldRecord.skillUseCounts = {}',
    to: 'worldRecord.skillUseCounts = { hero: { fire: 1 } }',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · 可省略容器缺省（当前 schema 唯一允许的缺省） skillUseCounts 缺席：clone 内补空 {}，原件保持缺席不变',
    marker: M_EQUAL,
    axis: 'r2 B-R1-01:skillUseCounts 缺席补空独立身份(current-codec.ts:46)',
  },
  {
    id: 'NR6-entitylifecycles-absence-fill',
    file: 'src/save/current-codec.ts',
    from: "    'payload.world.entityLifecycles',\n  )\n  return payload",
    to: "    'payload.world.entityLifecycles',\n  )\n  payload.world.entityLifecycles = { s001: { e001: { phase: 'suspended', remainingTicks: 9 } } }\n  return payload",
    testFile: CODEC_TEST,
    fullName:
      'current-codec · 可省略容器缺省（当前 schema 唯一允许的缺省） entityLifecycles 缺席：clone 内补空 {}，原件保持缺席不变',
    marker: M_EQUAL,
    axis: 'r2 B-R1-01:entityLifecycles 缺席补空独立身份(current-codec.ts:111-115)',
  },
]

function rel(file) {
  return path.relative(EVIDENCE_DIR, file)
}

function runSummary(run) {
  return {
    exit: run.exit,
    signal: run.signal,
    pid: run.pid,
    spawnError: run.spawnError,
    argvTail: run.argv.slice(-4),
    cwd: run.cwd,
    env: run.env,
    unhandledInOutput: run.unhandledInOutput,
    numTotalTests: run.report.numTotalTests,
    numPassedTests: run.report.numPassedTests,
    numFailedTests: run.report.numFailedTests,
    raw: { file: rel(run.rawFile), sha256: run.rawSha256 },
    json: { file: rel(run.jsonFile), sha256: run.jsonSha256 },
  }
}

function fail(message) {
  throw new Error(message)
}

rmSync(RUNS_DIR, { recursive: true, force: true })
mkdirSync(RUNS_DIR, { recursive: true })
const receipt = {
  protocol:
    'r2 有限重采:新绿基线 → 6 针逐针红(独立新树) → 还原绿(执行集逐字一致) → 末次重放;r1 14 针证据保留于 counterproof.json/counterproof-runs/',
  createdAt: new Date().toISOString(),
  judgeCriteria:
    '与 r1 同一判据库(未修改):进程层(exit/signal/spawnError) + 非空 file×fullName 执行集逐字锁定 + 计数/明细一致 + 非空 suite.message 拒收 + 零断言 failed suite 拒收 + stdout/stderr 无 unhandled + 红态恰一指定业务 AssertionError;真实 Vitest 探针证据沿用 r1(probe-*.raw/json),判据未放宽',
}

receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)

const contentLifecycleSha = sha256Of(path.join(REPO, 'packages/content/src/entity-lifecycle.ts'))
if (contentLifecycleSha !== 'eba9caaf60260067ddae40b769dbec9f1afe631a18f7e7ff2e81b718ad86054e')
  fail('content/entity-lifecycle.ts sha256 与任务卡冻结源不符')
receipt.frozenSources = {
  'packages/content/src/entity-lifecycle.ts': contentLifecycleSha,
  note: 'reforge 四源由 buildIsolatedTree 逐树校验',
}

// Phase 1:r2 原始绿(三文件,执行集含 r2 新行)。
const greenTree = buildIsolatedTree('r2-green')
try {
  const greenRun = runVitestJson(
    greenTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'green.raw'),
    path.join(RUNS_DIR, 'green.json'),
  )
  const greenRows = executionSetOf(greenRun, TEST_FILES)
  const greenProblems = judgeGreen(greenRun, greenRows, TEST_FILES)
  if (greenProblems.length) fail(`r2 green 判据失败: ${greenProblems.join('; ')}`)
  if (greenRows.length !== 78)
    fail(
      `r2 green 执行集 ${greenRows.length} 行,预期 78(64 structure + 8 codec + 6 characterization)`,
    )
  receipt.green = { process: runSummary(greenRun), executionSet: greenRows }
} finally {
  receipt.greenCleanup = greenTree.cleanup()
}
const greenRows = receipt.green.executionSet
const rowsByFile = {}
for (const file of TEST_FILES)
  rowsByFile[file] = greenRows.filter((r) => r.startsWith(`${file} :: `))

// Phase 2:逐针红(增量落盘)。
receipt.needles = []
const persistReceipt = () => {
  persistJson(path.join(EVIDENCE_DIR, 'counterproof-r2.json'), JSON.stringify(receipt, null, 2))
}
for (const needle of NEEDLES) {
  const tree = buildIsolatedTree(needle.id)
  let pushed = false
  try {
    const target = path.join(tree.pkg, needle.file)
    const pristine = sha256Of(target)
    const source = readFileSync(target, 'utf8')
    const hits = source.split(needle.from).length - 1
    if (hits !== 1) fail(`${needle.id}: 变异锚命中 ${hits} 次(要求恰 1)`)
    writeFileSync(target, source.replace(needle.from, needle.to))
    const mutantSha = sha256Of(target)
    if (mutantSha === pristine) fail(`${needle.id}: 变异未改变文件`)
    const run = runVitestJson(
      tree.pkg,
      [needle.testFile],
      path.join(RUNS_DIR, `${needle.id}.raw`),
      path.join(RUNS_DIR, `${needle.id}.json`),
    )
    const problems = judgeRed(
      run,
      rowsByFile[needle.testFile],
      [needle.testFile],
      needle.fullName,
      needle.marker,
    )
    const failed = run.tests.filter((t) => t.status === 'failed')
    receipt.needles.push({
      id: needle.id,
      axis: needle.axis,
      testFile: needle.testFile,
      mutation: {
        file: `packages/reforge/${needle.file}`,
        from: needle.from,
        to: needle.to,
        frozenSha256: pristine,
        mutantSha256: mutantSha,
      },
      treeFrozenVerified: true,
      judge: problems.length === 0 ? 'VALID' : `INVALID: ${problems.join('; ')}`,
      failed: failed.map((t) => t.fullName),
      failureExcerpt: (failed[0]?.failureMessages ?? []).join('\n').slice(0, 400),
      process: runSummary(run),
    })
    pushed = true
    if (problems.length) {
      persistReceipt()
      fail(`${needle.id}: 红态判据失败: ${problems.join('; ')}`)
    }
  } finally {
    const cleanup = tree.cleanup()
    if (pushed) receipt.needles.at(-1).cleanup = cleanup
    persistReceipt()
  }
}

// Phase 3:还原绿。
const restoredTree = buildIsolatedTree('r2-restored-green')
try {
  const restoredRun = runVitestJson(
    restoredTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'restored-green.raw'),
    path.join(RUNS_DIR, 'restored-green.json'),
  )
  const restoredRows = executionSetOf(restoredRun, TEST_FILES)
  const restoredProblems = judgeGreen(restoredRun, greenRows, TEST_FILES)
  if (restoredRows.join('\n') !== greenRows.join('\n')) fail('r2 还原绿执行集与快照不一致')
  if (restoredProblems.length) fail(`r2 还原绿判据失败: ${restoredProblems.join('; ')}`)
  receipt.restoredGreen = {
    process: runSummary(restoredRun),
    executionSetIdentical: true,
    problems: restoredProblems,
  }
} finally {
  receipt.restoredGreenCleanup = restoredTree.cleanup()
}

// Phase 4:末次重放(首针独立重建再现红)。
const replayNeedle = NEEDLES[0]
const replayTree = buildIsolatedTree('r2-final-replay')
try {
  const target = path.join(replayTree.pkg, replayNeedle.file)
  const source = readFileSync(target, 'utf8')
  if (source.split(replayNeedle.from).length - 1 !== 1) fail('r2 final-replay: 变异锚不再恰一命中')
  writeFileSync(target, source.replace(replayNeedle.from, replayNeedle.to))
  const run = runVitestJson(
    replayTree.pkg,
    [replayNeedle.testFile],
    path.join(RUNS_DIR, 'final-replay.raw'),
    path.join(RUNS_DIR, 'final-replay.json'),
  )
  const problems = judgeRed(
    run,
    rowsByFile[replayNeedle.testFile],
    [replayNeedle.testFile],
    replayNeedle.fullName,
    replayNeedle.marker,
  )
  if (problems.length) fail(`r2 final-replay 判据失败: ${problems.join('; ')}`)
  receipt.finalReplay = { needle: replayNeedle.id, judge: 'VALID', process: runSummary(run) }
} finally {
  receipt.finalReplayCleanup = replayTree.cleanup()
}

receipt.summary = {
  selfTestCases: receipt.judgeSelfTest.length,
  greenRows: greenRows.length,
  needles: receipt.needles.length,
  allValid: receipt.needles.every((n) => n.judge === 'VALID'),
  executionSetIdenticalAfterRestore: true,
}
const sha = persistJson(
  path.join(EVIDENCE_DIR, 'counterproof-r2.json'),
  JSON.stringify(receipt, null, 2),
)
console.log(
  `OK r2 needles=${receipt.summary.needles} allValid=${receipt.summary.allValid} sha256=${sha}`,
)
