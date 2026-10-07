// TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 严格三态反控 runner(证据工具,不进默认 runner)。
// r3 对齐(B-R2-02):本 runner 为当前候选唯一有效反控入口——绿基线 81 行、N05 指向 r2 拆分
// 后的 skillUseCounts 独立身份、N08 指向 r2 更名后的稀疏 inventory 标题,并纳入 B-R2-01 三条
// 归还合同的新针 NRR1-NRR3,共 17 针。输出指向 counterproof-r3-runs//counterproof-r3.json;
// r1(counterproof.json/counterproof-runs)与 r2(counterproof-r2.json/counterproof-r2-runs)为
// 历史原件保持不动:r1 见 codex-review-r1 审计,r2 六针经 codex-review-r2 独立复跑确认。
// N05 与 r2 NR5 是同一变异(补空注入非空),信用不重复计。
//
// 协议:判据自证(judgeSelfTest 合成反例 + 真实 Vitest 探针:纯业务红接受、目标红+afterAll
// 同步抛错拒收、目标红+异步 uncaught 拒收) → 原始绿(三文件执行集快照) → 逐针红(每针独立
// 新树、冻结源核验、恰一文本替换、恰一指定业务 AssertionError) → 还原绿(全新原始树,
// 执行集与快照逐字一致) → 末次重放(首针重建再现红)。任何一步判据非空即整体失败退出,
// 不产出"部分通过"回执。产品变异只发生在 /tmp 临时树,贡献者工作树零改动。
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
  runJudgeProbes,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-isolated-tree.mjs'

const EVIDENCE_DIR = import.meta.dirname
const RUNS_DIR = path.join(EVIDENCE_DIR, 'counterproof-r3-runs')

const STRUCTURE_TEST = 'src/save/current-structure.test.ts'
const CHAR_TEST = 'src/save/current-save.current-characterization.test.ts'
const CODEC_TEST = 'src/save/current-codec.contracts.test.ts'

// marker 为 vitest4 断言失败原文稳定片段(隔离树 marker-probe 实测):
//   toThrow 未抛 → 'AssertionError: expected [Function] to throw an error'
//   toEqual 不等 → 'AssertionError: expected … to deeply equal …'
//   not.toThrow 被违反 → 'AssertionError: expected [Function] to not throw an error …'
const M_THROW = 'expected [Function] to throw an error'
const M_EQUAL = 'to deeply equal'
const M_NOT_THROW = 'expected [Function] to not throw an error'
const M_REJECTED = '必须被拒收'

const NEEDLES = [
  {
    id: 'N01-empty-actor-id',
    file: 'src/save/current-codec.ts',
    from: 'if (!actorId) throw',
    to: 'if (false && !actorId) throw',
    testFile: CODEC_TEST,
    fullName: 'current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此） 空角色 ID 拒绝',
    marker: M_THROW,
    axis: 'S6 空角色 ID 由 codec 拒绝(current-codec.ts:49)',
  },
  {
    id: 'N02-empty-skill-id',
    file: 'src/save/current-codec.ts',
    from: 'if (!skillId) throw',
    to: 'if (false && !skillId) throw',
    testFile: CODEC_TEST,
    fullName: 'current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此） 空技能 ID 拒绝',
    marker: M_THROW,
    axis: 'S6 空技能 ID 由 codec 拒绝(current-codec.ts:52)',
  },
  {
    id: 'N03-negative-count',
    file: 'src/save/current-codec.ts',
    from: 'Number(rawCount) < 0',
    to: 'Number(rawCount) < -1',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此） 负数计数拒绝（非负条件）',
    marker: M_THROW,
    axis: 'S6 非负条件(current-codec.ts:53)',
  },
  {
    id: 'N04-unsafe-integer-count',
    file: 'src/save/current-codec.ts',
    from: 'Number.isSafeInteger(rawCount)',
    to: 'Number.isInteger(rawCount)',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此） 超出安全整数边界拒绝（MAX_SAFE_INTEGER+1 是整数但不安全）',
    marker: M_THROW,
    axis: 'S6 safe-integer 条件(current-codec.ts:53)',
  },
  {
    id: 'N05-omit-container-fill',
    file: 'src/save/current-codec.ts',
    from: 'worldRecord.skillUseCounts = {}',
    to: 'worldRecord.skillUseCounts = { hero: { fire: 1 } }',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · 可省略容器缺省（当前 schema 唯一允许的缺省） skillUseCounts 缺席：clone 内补空 {}，原件保持缺席不变',
    marker: M_EQUAL,
    axis: 'S6 缺席只在 clone 补空(current-codec.ts:46)',
  },
  {
    id: 'N06-hostile-zero-ms',
    file: 'src/save/current-codec.ts',
    from: 'Number(awareness.remainingMs) <= 0',
    to: 'Number(awareness.remainingMs) < 0',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · hostileAwareness 正数性（结构层只验有限数，0 由此层拒绝） remainingMs=0 拒绝（期望正有限毫秒）',
    marker: M_THROW,
    axis: 'S7 codec 正数性(current-codec.ts:40)',
  },
  {
    id: 'N07-script-deep-wiring',
    file: 'src/save/current-codec.ts',
    from: 'if (payload.world.script !== undefined)',
    to: 'if (false && payload.world.script !== undefined)',
    testFile: CODEC_TEST,
    fullName:
      'current-codec · script 深层语义接线（结构层只验 record） vars 非有限数由 checkWorldScriptState 拒绝，路径锚在 payload.world.script',
    marker: M_THROW,
    axis: 'S7 checkWorldScriptState 接线(current-codec.ts:107-108)',
  },
  {
    id: 'N08-sparse-inventory-hole',
    file: 'src/save/current-structure.ts',
    from: 'const slot = requireRecord(entry, p)',
    to: 'if (entry === undefined) return\n    const slot = requireRecord(entry, p)',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：inventory[0]（记录型元素数组代表），不被 forEach 跳过',
    marker: M_THROW,
    axis: 'S4 稀疏空洞逐下标(current-structure.ts:194-197)',
  },
  {
    id: 'N09-sparse-tags-hole',
    file: 'src/save/current-structure.ts',
    from: "if (typeof entry !== 'string') fail(p, '必须为字符串')",
    to: "if (entry === undefined) return\n    if (typeof entry !== 'string') fail(p, '必须为字符串')",
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：tags[0]（字符串元素数组代表），不被 forEach 跳过',
    marker: M_THROW,
    axis: 'S4 字符串数组稀疏空洞(current-structure.ts:85-87)',
  },
  {
    id: 'N10-hiddenexp-full-keyset',
    file: 'src/save/current-structure.ts',
    from: 'if (!HIDDEN_KEYS.has(key)) fail',
    to: "if (!HIDDEN_KEYS.has(key) || key === 'speed') fail",
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · 合法载荷（正边界） hiddenExp 全部七个隐藏成长属性键通过（HIDDEN_STAT_KEYS 真源，含分数经验）',
    marker: M_NOT_THROW,
    axis: 'S1 hiddenExp 全键集正边界(current-structure.ts:138)',
  },
  {
    id: 'N11-envelope-version-guard',
    file: 'src/save/current-structure.ts',
    from: 'if (payload.version !== SAVE_VERSION) fail',
    to: 'if (payload.version !== SAVE_VERSION && payload.version !== SAVE_VERSION - 1) fail',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） Envelope 坏形状 version 非当前 SAVE 常量 带路径拒绝',
    marker: M_THROW,
    axis: 'S3 版本常量拒收(current-structure.ts:282)',
  },
  {
    id: 'N12-preflight-version-only',
    file: 'src/save/current-codec.ts',
    from: 'args.payload.version !== SAVE_VERSION || ',
    to: '',
    testFile: CHAR_TEST,
    fullName:
      'current SAVE11/content22 contract rejects non-current SAVE10/content22 before normalization',
    marker: M_REJECTED,
    axis: 'S3 仅 version 不同条件隔离(current-codec.ts:74)',
  },
  {
    id: 'N13-preflight-content-only',
    file: 'src/save/current-codec.ts',
    from: ' || args.payload.contentVersion !== CONTENT_VERSION)',
    to: ')',
    testFile: CHAR_TEST,
    fullName:
      'current SAVE11/content22 contract rejects non-current SAVE11/content21 before normalization',
    marker: M_REJECTED,
    axis: 'S3 仅 contentVersion 不同条件隔离(current-codec.ts:74)',
  },
  {
    id: 'N14-resolver-identity',
    file: 'src/save/current-codec.ts',
    from: 'input.projectId !== resolver.projectId ||',
    to: 'false ||',
    testFile: CHAR_TEST,
    fullName:
      'current SAVE11/content22 contract rejects a resolver whose identity does not match the payload before cloning',
    marker: M_THROW,
    axis: 'S8 resolver/payload 身份一致(current-codec.ts:101)',
  },
  {
    id: 'NRR1-maxmp-field-membership',
    file: 'src/save/current-structure.ts',
    from: "    'maxMP',\n",
    to: '',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · CharacterInstance（party 与 reserve 同型） 实例坏形状 maxMP=Infinity（字段数组成员资格，B-R2-01 归还） 带路径拒绝',
    marker: M_THROW,
    axis: 'r3 B-R2-01:maxMP 在 11 字段有限数循环数组成员内(current-structure.ts:164-177)',
  },
  {
    id: 'NRR2-extrastatuses-hole-callback',
    file: 'src/save/current-structure.ts',
    from: 'const status = requireRecord(entry, p)',
    to: 'if (entry === undefined) return\n    const status = requireRecord(entry, p)',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：extraStatuses[0]（独立回调接线，B-R2-01 归还），不被 forEach 跳过',
    marker: M_THROW,
    axis: 'r3 B-R2-01:assertCarriedStatuses 回调不跳过空洞(current-structure.ts:119-123)',
  },
  {
    id: 'NRR3-poisons-hole-callback',
    file: 'src/save/current-structure.ts',
    from: 'const poison = requireRecord(entry, p)',
    to: 'if (entry === undefined) return\n    const poison = requireRecord(entry, p)',
    testFile: STRUCTURE_TEST,
    fullName:
      'current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：poisons[0]（独立回调接线，B-R2-01 归还），不被 forEach 跳过',
    marker: M_THROW,
    axis: 'r3 B-R2-01:assertActivePoisons 回调不跳过空洞(current-structure.ts:126-131)',
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

// ---- 主协议 ----
rmSync(RUNS_DIR, { recursive: true, force: true })
mkdirSync(RUNS_DIR, { recursive: true })
const receipt = {
  protocol: 'green → per-needle red (fresh isolated tree each) → restored green → final replay',
  createdAt: new Date().toISOString(),
  judgeCriteria:
    '四态同判据:进程层(exit/signal/spawnError) + 非空 file×fullName 执行集逐字锁定 + 计数/明细一致 + 非空 suite.message 拒收 + 零断言 failed suite 拒收 + stdout/stderr 无 unhandled + 红态恰一指定业务 AssertionError',
}

// Phase 0a:判据自证(合成反例)。
receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)

// Phase 0b:content 冻结源在工作树直接核(不进隔离树,只读)。
const contentLifecycleSha = sha256Of(path.join(REPO, 'packages/content/src/entity-lifecycle.ts'))
if (contentLifecycleSha !== 'eba9caaf60260067ddae40b769dbec9f1afe631a18f7e7ff2e81b718ad86054e')
  fail('content/entity-lifecycle.ts sha256 与任务卡冻结源不符')
receipt.frozenSources = {
  'packages/content/src/entity-lifecycle.ts': contentLifecycleSha,
  note: 'reforge 四源由 buildIsolatedTree 逐树校验,见每针 treeFrozenVerified',
}

// Phase 1:原始绿(三文件)+ 探针。
const greenTree = buildIsolatedTree('green')
try {
  const greenRun = runVitestJson(
    greenTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'green.raw'),
    path.join(RUNS_DIR, 'green.json'),
  )
  const greenRows = executionSetOf(greenRun, TEST_FILES)
  const greenProblems = judgeGreen(greenRun, greenRows, TEST_FILES)
  if (greenProblems.length) fail(`green 判据失败: ${greenProblems.join('; ')}`)
  if (greenRows.length !== 81)
    fail(`green 执行集 ${greenRows.length} 行,预期 81(67 structure + 8 codec + 6 characterization)`)
  receipt.green = { process: runSummary(greenRun), executionSet: greenRows }
  receipt.greenProcess = { problems: greenProblems, rows: greenRows.length }
  // 探针复用同一棵原始树(探针文件用后即删)。
  receipt.judgeProbes = runJudgeProbes(greenTree, RUNS_DIR)
} finally {
  receipt.greenCleanup = greenTree.cleanup()
}
const greenRows = receipt.green.executionSet
const rowsByFile = {}
for (const file of TEST_FILES)
  rowsByFile[file] = greenRows.filter((r) => r.startsWith(`${file} :: `))

// Phase 2:逐针红(增量落盘回执,失败时保留现场证据)。
receipt.needles = []
const persistReceipt = () => {
  persistJson(path.join(EVIDENCE_DIR, 'counterproof-r3.json'), JSON.stringify(receipt, null, 2))
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

// Phase 3:还原绿(全新原始树,执行集与 Phase 1 快照逐字一致)。
const restoredTree = buildIsolatedTree('restored-green')
try {
  const restoredRun = runVitestJson(
    restoredTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'restored-green.raw'),
    path.join(RUNS_DIR, 'restored-green.json'),
  )
  const restoredRows = executionSetOf(restoredRun, TEST_FILES)
  const restoredProblems = judgeGreen(restoredRun, greenRows, TEST_FILES)
  if (restoredRows.join('\n') !== greenRows.join('\n')) fail('还原绿执行集与原始快照不一致')
  if (restoredProblems.length) fail(`还原绿判据失败: ${restoredProblems.join('; ')}`)
  receipt.restoredGreen = {
    process: runSummary(restoredRun),
    executionSetIdentical: true,
    problems: restoredProblems,
  }
} finally {
  receipt.restoredGreenCleanup = restoredTree.cleanup()
}

// Phase 4:末次重放(首针独立重建,再现同一恰一红)。
const replayNeedle = NEEDLES[0]
const replayTree = buildIsolatedTree('final-replay')
try {
  const target = path.join(replayTree.pkg, replayNeedle.file)
  const source = readFileSync(target, 'utf8')
  if (source.split(replayNeedle.from).length - 1 !== 1) fail('final-replay: 变异锚不再恰一命中')
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
  if (problems.length) fail(`final-replay 判据失败: ${problems.join('; ')}`)
  receipt.finalReplay = {
    needle: replayNeedle.id,
    judge: 'VALID',
    process: runSummary(run),
  }
} finally {
  receipt.finalReplayCleanup = replayTree.cleanup()
}

receipt.summary = {
  selfTestCases: receipt.judgeSelfTest.length,
  probes: receipt.judgeProbes.length,
  greenRows: greenRows.length,
  needles: receipt.needles.length,
  allValid: receipt.needles.every((n) => n.judge === 'VALID'),
  executionSetIdenticalAfterRestore: true,
}
const sha = persistJson(
  path.join(EVIDENCE_DIR, 'counterproof-r3.json'),
  JSON.stringify(receipt, null, 2),
)
console.log(
  `OK needles=${receipt.summary.needles} allValid=${receipt.summary.allValid} counterproof-r3.json sha256=${sha}`,
)
