// TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 反控 runner(证据工具,非测试)。
// 用法:
//   node run-counterproof.mjs discover  — 只跑各针红态一次,打印真实 failureMessages 前缀供 marker 定稿。
//   node run-counterproof.mjs formal    — 完整四态:基线绿 → 变异红(恰一指定业务 AssertionError) →
//                                          还原绿 → 末次重放绿;N3 另附三文件范围级联诚实披露;
//                                          判据自测与真实 Vitest 探针先于真实针。
// 全程只在 mkdtemp 隔离树变异,finally 只清本次树;贡献者工作树产品零改动。
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  applyMutation,
  buildIsolatedTree,
  DIRECTED_FILES,
  executionSetOf,
  judgeCascade,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  restoreMutation,
  runJudgeProbes,
  runVitestJson,
  TEST_FILE,
} from './counterproof-lib.mjs'

const HERE = import.meta.dirname
const LOGS = path.join(HERE, 'counterproof', 'mutation-logs')

const FN = {
  bf08: 'BF-08 宿主战败终局：无结算无战后脚本、恢复场景音但不还原音乐、HP 写回 0',
  bf09a: 'BF-09 胜利曲经验门（exp>0）：options.boss 直传 victory(boss)、胜利曲恰奏一次、奏后归静',
  bf09b: 'BF-09 零经验胜利（exp=0）：经验门关胜利曲零奏、金钱不受经验门影响',
  bf10: 'BF-10 宿主逃跑终局：playerFled 不结算不跑战后脚本、金钱零变化、场景音恢复',
  h1: 'BF-H1 正常收尾：start Promise 兑现后关闭——active 槽清空、spy/global/DOM 复原',
  h2: 'BF-H2 准备拒绝收尾：真实精灵 IO 拒绝被消费、零端口副作用、spy/global/DOM 复原',
  h3: 'BF-H3 断言提前失败收尾：IO 受持期断言红后关闭——start Promise 消费、持定 IO 释放、复原',
  h4: 'BF-H4 取消收尾：会话中段取消后关闭——start Promise 以 AbortError 消费、active 槽清空、复原',
  bf02: 'BF-02 零经验胜利：经验门关、金钱照入账、无结算屏',
}

/** 针表:marker 由 discover 定稿后填入(null = formal 拒绝运行)。 */
const NEEDLES = [
  {
    id: 'N1-BF08-defeat-still-restores-music',
    file: 'src/battle/battle-host.ts',
    find: "    if (result !== 'defeat') restoreMusic()",
    replace: '    if (true) restoreMusic()',
    target: FN.bf08,
    marker: null,
  },
  {
    id: 'N2-BF09a-boss-flag-not-passed',
    file: 'src/battle/battle-host.ts',
    find: 'this.music.victory(!!options?.boss),',
    replace: 'this.music.victory(false),',
    target: FN.bf09a,
    marker: null,
  },
  {
    id: 'N3-BF09b-exp-gate-always-open',
    file: 'src/battle/battle-world-result.ts',
    find: 'if (rewards.exp > 0) onExpReward()',
    replace: 'if (true) onExpReward()',
    target: FN.bf09b,
    marker: null,
    // settle 层 exp 门是共享 oracle 点:同变异在三文件范围的真实波及(实测)=BF-02(settle 层
    // onExpRewardCalls)+BF-09b(本针)+battle-host.test.ts:36/:232(host 层经 playVictory 多出
    // music:play 破坏端口序)。逐字披露,不冒充恰一。
    cascade: {
      files: DIRECTED_FILES,
      alsoFails: [
        FN.bf02,
        'battle host commits real victory once, then hooks, scene sounds and music in order',
        'world replacement after session completion blocks final writeback',
      ],
    },
  },
  {
    id: 'N4-BF10-flee-runs-defeated-hooks',
    file: 'src/battle/battle-host.ts',
    find: "      if (result === 'victory')",
    replace: "      if (result !== 'defeat')",
    target: FN.bf10,
    marker: null,
  },
  {
    id: 'N5-H3-hold-gate-never-blocks',
    file: 'src/__tests__/battle-finalization-reliability/battle-finalization-host-harness.ts',
    find: '        await promise',
    replace: '        void promise',
    target: FN.h3,
    marker: null,
  },
  {
    id: 'N6-H1-close-skips-restore',
    file: 'src/__tests__/battle-finalization-reliability/battle-finalization-host-harness.ts',
    find: '    await browser.close()',
    replace: '    await Promise.resolve()',
    target: FN.h1,
    marker: null,
    // 共享 harness 的复原步骤被删时 H1..H4 的复原身份断言同面全红(discover 实测四红均
    // 'expected [AsyncFunction] to be [AsyncFunction]' AssertionError)——按家族探针以级联
    // 判据记录(期望失败集恰为四 H 合同),不冒充恰一针。
    family: true,
    familyExpected: [FN.h1, FN.h2, FN.h3, FN.h4],
  },
]

function statePaths(needleId, state) {
  return [path.join(LOGS, `${needleId}.${state}.raw`), path.join(LOGS, `${needleId}.${state}.json`)]
}

function receiptOf(run) {
  return {
    process: {
      exit: run.exit,
      signal: run.signal,
      pid: run.pid,
      spawnError: run.spawnError,
      argv: run.argv,
      cwd: run.cwd,
      env: run.env,
    },
    counts: {
      numTotalTests: run.report.numTotalTests,
      numPassedTests: run.report.numPassedTests,
      numFailedTests: run.report.numFailedTests,
      numPendingTests: run.report.numPendingTests,
      numTodoTests: run.report.numTodoTests,
      success: run.report.success,
    },
    unhandledInOutput: run.unhandledInOutput,
    executionSet: executionSetOf(run, run.__expectedFiles),
    raw: { file: path.relative(HERE, run.rawFile), sha256: run.rawSha256 },
    json: { file: path.relative(HERE, run.jsonFile), sha256: run.jsonSha256 },
  }
}

function runScoped(tree, files, rawOut, jsonOut) {
  const run = runVitestJson(tree.reforge, files, rawOut, jsonOut)
  run.__expectedFiles = files
  return run
}

const mode = process.argv[2]
if (mode !== 'discover' && mode !== 'formal') {
  console.error('usage: node run-counterproof.mjs discover|formal')
  process.exit(2)
}
const baked = {}
if (mode === 'formal') {
  const markerTable = JSON.parse(readFileSync(path.join(HERE, 'counterproof-markers.json'), 'utf8'))
  for (const n of NEEDLES) {
    n.marker = markerTable[n.id]
    if (!n.marker) throw new Error(`missing baked marker for ${n.id}`)
  }
  Object.assign(baked, markerTable)
}

mkdirSync(LOGS, { recursive: true })
const tree = buildIsolatedTree(mode)
let cleanupProof = null
try {
  const selfTest = judgeSelfTest([TEST_FILE])

  // 基线绿(两种范围),锁定执行身份行集。
  const [b1raw, b1json] = statePaths('baseline', 'singlefile-green')
  const baselineSingle = runScoped(tree, [TEST_FILE], b1raw, b1json)
  const rowsSingle = executionSetOf(baselineSingle, [TEST_FILE])
  const baselineSingleProblems = judgeGreen(baselineSingle, rowsSingle, [TEST_FILE])

  const [b3raw, b3json] = statePaths('baseline', 'threefile-green')
  const baselineThree = runScoped(tree, DIRECTED_FILES, b3raw, b3json)
  const rowsThree = executionSetOf(baselineThree, DIRECTED_FILES)
  const baselineThreeProblems = judgeGreen(baselineThree, rowsThree, DIRECTED_FILES)

  const probes = runJudgeProbes(tree, LOGS)

  if (baselineSingleProblems.length > 0 || baselineThreeProblems.length > 0) {
    throw new Error(
      `baseline not green: single=[${baselineSingleProblems.join('; ')}] three=[${baselineThreeProblems.join('; ')}]`,
    )
  }

  const needleResults = []
  for (const needle of NEEDLES) {
    const entry = { id: needle.id, file: needle.file, target: needle.target }
    const mut = applyMutation(tree, needle.file, needle.find, needle.replace)
    entry.mutation = {
      find: needle.find,
      replace: needle.replace,
      beforeSha256: mut.beforeSha256,
      mutantSha256: mut.mutantSha256,
    }
    try {
      // 红态(单文件范围):恰一指定业务 AssertionError;家族探针按级联判据(期望失败集
      // 恰为家族四合同,且每条失败均含 marker 并以 AssertionError 起头)。
      const [rraw, rjson] = statePaths(needle.id, 'red')
      const red = runScoped(tree, [TEST_FILE], rraw, rjson)
      let redProblems
      if (needle.family) {
        redProblems = judgeCascade(red, rowsSingle, [TEST_FILE], needle.familyExpected)
        for (const t of red.tests.filter((x) => x.status === 'failed')) {
          const first = (t.failureMessages ?? [])[0] ?? ''
          if (!first.includes(needle.marker ?? '\u0000')) {
            redProblems.push(`family failure missing marker: ${t.fullName}`)
          }
        }
      } else {
        redProblems = judgeRed(
          red,
          rowsSingle,
          [TEST_FILE],
          needle.target,
          needle.marker ?? 'AssertionError',
        )
      }
      entry.red = receiptOf(red)
      entry.red.failureMessages = red.tests
        .filter((t) => t.status === 'failed')
        .flatMap((t) => t.failureMessages ?? [])
      if (mode === 'discover') {
        console.log(`\n=== ${needle.id} ===`)
        console.log(
          'failed:',
          red.tests.filter((t) => t.status === 'failed').map((t) => t.fullName),
        )
        console.log('first failure message head:')
        console.log((entry.red.failureMessages[0] ?? '<none>').slice(0, 600))
      } else if (redProblems.length > 0) {
        throw new Error(`needle ${needle.id} red state rejected: ${redProblems.join('; ')}`)
      } else {
        entry.red.judge = 'accepted'
      }

      // N3:同变异下三文件范围级联披露(共享 oracle 跨层命中,非 needle 判据)。
      if (needle.cascade) {
        const [craw, cjson] = statePaths(needle.id, 'cascade-threefile')
        const cas = runScoped(tree, needle.cascade.files, craw, cjson)
        const casProblems = judgeCascade(cas, rowsThree, needle.cascade.files, [
          needle.target,
          ...needle.cascade.alsoFails,
        ])
        entry.cascade = receiptOf(cas)
        entry.cascade.expectedFailed = [needle.target, ...needle.cascade.alsoFails]
        entry.cascade.judge =
          casProblems.length === 0 ? 'accepted' : `rejected: ${casProblems.join('; ')}`
      }
    } finally {
      // 还原无条件先行(不在此 throw:unsafeFinally);sha 校验与阶段错误在 finally 外结算。
      entry.restoredSha256 = restoreMutation(tree, needle.file, needle.find, needle.replace)
    }
    if (entry.restoredSha256 !== mut.beforeSha256) {
      throw new Error(
        `restore mismatch for ${needle.id}: ${entry.restoredSha256} != ${mut.beforeSha256}`,
      )
    }
    if (mode === 'discover') continue

    // 还原绿 + 末次重放绿(单文件范围,执行集逐字不变)。
    const [graw, gjson] = statePaths(needle.id, 'restored-green')
    const restored = runScoped(tree, [TEST_FILE], graw, gjson)
    const restoredProblems = judgeGreen(restored, rowsSingle, [TEST_FILE])
    entry.restoredGreen = receiptOf(restored)
    if (restoredProblems.length > 0) {
      throw new Error(
        `needle ${needle.id} restored state not green: ${restoredProblems.join('; ')}`,
      )
    }
    const [p2raw, p2json] = statePaths(needle.id, 'replay-green')
    const replay = runScoped(tree, [TEST_FILE], p2raw, p2json)
    const replayProblems = judgeGreen(replay, rowsSingle, [TEST_FILE])
    entry.replayGreen = receiptOf(replay)
    if (replayProblems.length > 0) {
      throw new Error(`needle ${needle.id} replay state not green: ${replayProblems.join('; ')}`)
    }
    needleResults.push(entry)
  }

  if (mode === 'discover') {
    console.log('\n(discover done — paste markers into counterproof-markers.json)')
    cleanupProof = tree.cleanup()
    console.log(cleanupProof)
    process.exit(0)
  }

  cleanupProof = tree.cleanup()
  const receipt = {
    card: 'TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1',
    mode,
    argv: process.argv.slice(1),
    cwd: process.cwd(),
    node: process.version,
    bakedMarkers: baked,
    selfTest,
    judgeProbes: probes,
    baselines: {
      singleFile: receiptOf(baselineSingle),
      threeFile: receiptOf(baselineThree),
    },
    needles: needleResults,
    cleanup: cleanupProof,
  }
  const sha = persistJson(
    path.join(HERE, 'counterproof', 'counterproof.json'),
    JSON.stringify(receipt, null, 2),
  )
  console.log(`counterproof.json sha256=${sha}`)
  console.log(cleanupProof)
} catch (error) {
  if (!cleanupProof) cleanupProof = tree.cleanup()
  console.error('COUNTERPROOF FAILED:', error.message)
  console.error(cleanupProof)
  process.exit(1)
}
