// TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 最小反控驱动(按需证据工具,非测试)。
// 流程:建隔离树(冻结源逐字节核) → 判据自测 → 真实 hook/uncaught 探针 → 基线全绿 →
// 每针四态(原始绿 → 恰一业务 AssertionError 红 → 恢复绿 → 同态重放) → 最终全量重放 →
// 清树 + 贡献者树产品字节未动证明 → 回执落盘。全部 run 记录 command/cwd/env/exit/signal/
// spawn/pid 与 raw/JSON 双 reporter 原件 sha。
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  applyNeedle,
  buildIsolatedTree,
  executionSetOf,
  FROZEN_SOURCES,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  restoreNeedle,
  runJudgeProbes,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-isolated-tree.mjs'

const HERE = import.meta.dirname
const LOGS = path.join(HERE, 'counterproof')
mkdirSync(LOGS, { recursive: true })

// 每针:变异锚(产品源内恰命中一次)、期望唯一红测试 fullName 前缀、失败 marker(取自真实红态
// failureMessages 的业务片段)。整文件执行集下每针必须恰一红——针形都设计成只影响单一合同。
const NEEDLES = [
  {
    id: 'E4-openShop-degraded-mode-pollution',
    file: 'src/ui/command-form-control.tsx',
    find: '<Num value={cmd.shop} onChange={(n) => set({ shop: n })} />',
    replace: "<Num value={cmd.shop} onChange={(n) => set({ shop: n, mode: 'buy' })} />",
    redFullNamePrefix: '当前作者命令 control 表单合同（E4/E6） E4 合法空店铺工程',
    marker: 'mode',
    defect: '空店铺降级数值输入把模式重置回 buy',
  },
  {
    id: 'E6-playSound-clear-guard-removed',
    file: 'src/ui/command-form-control.tsx',
    find: `          <SoundPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (asset) set({ asset })
            }}`,
    replace: `          <SoundPicker
            value={cmd.asset}
            onChange={(asset) => {
              set({ asset })
            }}`,
    redFullNamePrefix: '当前作者命令 control 表单合同（E4/E6） E6 空音效目录',
    marker: "to contain 'sound-bell'",
    defect: 'playSound 叶子清空守卫移除,undefined 提交进草稿',
  },
  {
    id: 'E6-playMusic-clear-guard-removed',
    file: 'src/ui/command-form-control.tsx',
    find: "if (typeof asset === 'string') set({ asset })",
    replace: 'set({ asset })',
    redFullNamePrefix: '当前作者命令 control 表单合同（E4/E6） E6 空音乐目录',
    marker: "to contain 'music-theme'",
    defect: 'playMusic 叶子清空守卫移除,undefined 提交进草稿',
  },
  {
    id: 'E9-portrait-select-erases-battlesprite',
    file: 'src/ui/command-form-world.tsx',
    find: 'onChange={(portrait) => set({ portrait })}',
    replace:
      'onChange={(portrait) => set({ portrait, ...(portrait ? { battleSprite: undefined } : {}) })}',
    redFullNamePrefix: '当前作者命令 world 表单合同（E9） 选择真实 portrait',
    marker: 'starter-fighter',
    defect: '选择立绘时顺带清空战斗形象(清空路径不受影响)',
  },
  {
    id: 'E9-portrait-clear-swallowed',
    file: 'src/ui/command-form-world.tsx',
    find: 'onChange={(portrait) => set({ portrait })}',
    replace: 'onChange={(portrait) => { if (portrait) set({ portrait }) }}',
    redFullNamePrefix: '当前作者命令 world 表单合同（E9） 用 (无) 清空 portrait',
    marker: 'Number of calls: 0',
    defect: '清空 portrait 被 if 守卫吞掉,aggregate 完成时零提交',
  },
]

const problems = []
const receipt = {
  generatedAt: new Date().toISOString(),
  command: process.argv.join(' '),
  cwd: process.cwd(),
  node: process.version,
  testFiles: TEST_FILES,
  judgeSelfTest: [],
  judgeProbes: [],
  baseline: null,
  needles: [],
  finalReplay: null,
  cleanup: null,
  contributorTreeUnchanged: null,
}

function runState(tag, tree, testFiles) {
  const run = runVitestJson(
    tree.editor,
    testFiles,
    path.join(LOGS, `${tag}.raw`),
    path.join(LOGS, `${tag}.json`),
  )
  return {
    run,
    rows: executionSetOf(run, testFiles),
    summary: {
      tag,
      argv: run.argv,
      cwd: run.cwd,
      env: run.env,
      exit: run.exit,
      signal: run.signal,
      pid: run.pid,
      spawnError: run.spawnError,
      unhandledInOutput: run.unhandledInOutput,
      counts: {
        numTotalTests: run.report.numTotalTests,
        numPassedTests: run.report.numPassedTests,
        numFailedTests: run.report.numFailedTests,
        numPendingTests: run.report.numPendingTests,
        numTodoTests: run.report.numTodoTests,
        numFailedTestSuites: run.report.numFailedTestSuites,
      },
      raw: { file: path.basename(run.rawFile), sha256: run.rawSha256 },
      json: { file: path.basename(run.jsonFile), sha256: run.jsonSha256 },
    },
  }
}

// 0) 贡献者树产品字节前后对照基准。
const CONTRIBUTOR_EDITOR = path.join(import.meta.dirname, '../../../..', 'packages/editor')
const contributorBefore = Object.fromEntries(
  Object.keys(FROZEN_SOURCES).map((rel) => [rel, sha256Of(path.join(CONTRIBUTOR_EDITOR, rel))]),
)

// 1) 隔离树 + 冻结源校验(建树失败自删)。
const tree = buildIsolatedTree('r1')
try {
  // 树内测试侧文件与贡献者树逐字节一致(执行身份)。
  const testSide = [
    ...TEST_FILES,
    'src/ui/__tests__/author-command-contracts/author-command-form-fixture.ts',
  ]
  for (const rel of testSide) {
    const inTree = sha256Of(path.join(tree.editor, rel))
    const inContributor = sha256Of(path.join(CONTRIBUTOR_EDITOR, rel))
    if (inTree !== inContributor) {
      throw new Error(`test-side identity drift in tree: ${rel}`)
    }
  }

  // 2) 判据自测(先于任何真实针)。
  receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)
  const rejected = receipt.judgeSelfTest.filter((c) => c.want === false && c.accepted).length
  if (rejected > 0) throw new Error(`judge self-test accepted ${rejected} invalid cases`)

  // 3) 真实 hook/uncaught 探针(复用前自证)。
  receipt.judgeProbes = runJudgeProbes(tree, LOGS)

  // 4) 基线全绿(两文件全量执行集)。
  const baseline = runState('baseline-green', tree, TEST_FILES)
  const baselineProblems = judgeGreen(baseline.run, baseline.rows, TEST_FILES)
  receipt.baseline = { ...baseline.summary, rows: baseline.rows, judge: baselineProblems }
  if (baselineProblems.length > 0) problems.push(`baseline: ${baselineProblems.join('; ')}`)

  // 5) 每针四态。
  for (const needle of NEEDLES) {
    const file = [
      TEST_FILES.find((f) => f.includes(needle.id.startsWith('E9') ? 'world' : 'control')),
    ]
    const green1 = runState(`${needle.id}.green-original`, tree, file)
    const green1Problems = judgeGreen(green1.run, green1.rows, file)
    const failedFullName = green1.rows
      .map((r) => r.split(' :: ')[1])
      .find((n) => n.startsWith(needle.redFullNamePrefix))
    if (!failedFullName)
      throw new Error(`${needle.id}: target test not found in green execution set`)

    const entry = applyNeedle(tree.editor, needle.file, needle.find, needle.replace)
    const red = runState(`${needle.id}.red`, tree, file)
    const redProblems = judgeRed(red.run, green1.rows, file, failedFullName, needle.marker)
    if (redProblems.some((p) => p.startsWith('marker not in failureMessages'))) {
      const failed = red.run.tests.find((t) => t.status === 'failed')
      console.error(`[marker-discovery] ${needle.id} failureMessages:`)
      for (const m of failed?.failureMessages ?? []) console.error(m.slice(0, 600))
    }
    const restored = restoreNeedle(entry)
    const green2 = runState(`${needle.id}.green-restored`, tree, file)
    const green2Problems = judgeGreen(green2.run, green1.rows, file)

    receipt.needles.push({
      id: needle.id,
      defect: needle.defect,
      mutatedFile: needle.file,
      find: needle.find,
      replace: needle.replace,
      expectedRed: failedFullName,
      marker: needle.marker,
      hashes: { before: entry.before, mutant: entry.mutant, restored },
      greenOriginal: { ...green1.summary, judge: green1Problems },
      red: {
        ...red.summary,
        failedFullNames: red.run.tests.filter((t) => t.status === 'failed').map((t) => t.fullName),
        judge: redProblems,
      },
      greenRestored: { ...green2.summary, judge: green2Problems },
    })
    for (const [label, p] of [
      ['greenOriginal', green1Problems],
      ['red', redProblems],
      ['greenRestored', green2Problems],
    ]) {
      if (p.length > 0) problems.push(`${needle.id}/${label}: ${p.join('; ')}`)
    }
  }

  // 6) 最终全量重放(两文件,与基线同判据同执行集)。
  const finalReplay = runState('final-replay-green', tree, TEST_FILES)
  const finalProblems = judgeGreen(finalReplay.run, baseline.rows, TEST_FILES)
  receipt.finalReplay = { ...finalReplay.summary, judge: finalProblems }
  if (finalProblems.length > 0) problems.push(`finalReplay: ${finalProblems.join('; ')}`)
} finally {
  // 7) 清树(无论成败),并证明贡献者树产品字节未动。
  receipt.cleanup = tree.cleanup()
  const contributorAfter = Object.fromEntries(
    Object.keys(FROZEN_SOURCES).map((rel) => [
      rel,
      sha256Of(path.join(import.meta.dirname, '../../../..', 'packages/editor', rel)),
    ]),
  )
  receipt.contributorTreeUnchanged = {
    before: contributorBefore,
    after: contributorAfter,
    allMatch: Object.keys(contributorBefore).every(
      (k) => contributorBefore[k] === contributorAfter[k],
    ),
    matchesFrozenCard: Object.entries(contributorAfter).every(
      ([rel, sha]) => FROZEN_SOURCES[rel] === sha,
    ),
  }
}

receipt.verdict = problems.length === 0 ? 'ALL-VALID' : 'INVALID'
receipt.problems = problems
const receiptPath = path.join(HERE, 'counterproof-receipt.json')
const receiptSha = persistJson(receiptPath, JSON.stringify(receipt, null, 2))
console.log(`receipt: ${receiptPath} sha256=${receiptSha}`)

if (problems.length > 0) {
  console.error(`INVALID: ${problems.length} problems`)
  for (const p of problems) console.error(` - ${p}`)
  process.exit(1)
}
console.log('ALL-VALID')
for (const n of receipt.needles) {
  console.log(
    `  ${n.id}: red=[${n.red.failedFullNames.join(', ')}] marker=${n.marker} restored=${n.hashes.restored === n.hashes.before}`,
  )
}
