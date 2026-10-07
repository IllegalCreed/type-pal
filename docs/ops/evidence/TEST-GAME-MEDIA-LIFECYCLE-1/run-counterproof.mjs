// TEST-GAME-MEDIA-LIFECYCLE-1 三态反控重放脚本(证据再生用,非测试)。
//
// 逐针四态:基线绿 → 树内变异产品 → 恰一指定业务 AssertionError 红 → 还原 → 定向绿;
// 全部针后末次整套重放。变异只发生在 mkdtemp 隔离树(/tmp,建树时校验冻结源 sha256 与
// 任务卡一致),finally 删除本次树并落清理证明;贡献者工作树的产品文件全程零改动
// (末尾再以 git status 对两冻结源核零残留)。执行集 = 两新测试文件 file×fullName,
// 四态逐字相同;红态须 fullName 精确相等 + failureMessages 含指定 marker 且以
// AssertionError 起头。判据先用合成反例自证拒收(judgeSelfTest),任何一步不符即
// 非零退出,不产出合格回执。
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  buildIsolatedTree,
  GAME,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  REPO,
  runJudgeProbes,
  runVitestJson,
  sha256Bytes,
  sha256Of,
  TEST_FILES,
  writeRaw,
} from './lib-isolated-tree.mjs'

const EV = import.meta.dirname
const LOGS = path.join(EV, 'mutation-logs')

const AVI = 'src/shell/avi-player.async-lifecycle.test.ts'
const RNG = 'src/shell/rng-player.io-lifecycle.test.ts'
const AVI_DESC = 'avi-player 迟到结果与跨视频所有权 TEST-GAME-MEDIA-LIFECYCLE-1'
const RNG_DESC = 'rng-player IO 生命周期 TEST-GAME-MEDIA-LIFECYCLE-1'

// 执行集(排序后与 lib executionSetOf 输出逐字比对):2 文件 × 7 合同。
const EXPECTED_ROWS = [
  `${AVI} :: ${AVI_DESC} M1 视频已 ended 收尾后原 play() 才 reject — 不重建重试层、不再次播放`,
  `${AVI} :: ${AVI_DESC} M2 重试 play 结果迟于 ended — 收尾自行退休重试层,迟到结果不重建 overlay 也不再播放`,
  `${AVI} :: ${AVI_DESC} M4 跳过 500ms 收尾窗口内的重复跳过键与 ended 只完成一次,残留定时器不触及下一段顺序视频`,
  `${AVI} :: ${AVI_DESC} M5 前段视频的迟到 play() reject 不抢下段视频的音量与 DOM 所有权`,
  `${AVI} :: ${AVI_DESC} M8 warm-up play() resolve 迟到 — 只清理自己的临时 video,不触及正式播放的 video`,
  `${RNG} :: ${RNG_DESC} M6 chunk A 加载失败不驱逐 chunk B 成功缓存 — 复播 B 不重载、帧数据不串`,
  `${RNG} :: ${RNG_DESC} M7 成功帧乱序迟到 + 中间帧失败 — 顺序保持、末屏为最后成功帧、结束后归还输入监听`,
]

const NEEDLES = [
  {
    id: 'N-M1-late-reject-rebuilds-overlay',
    file: 'src/shell/avi-player.ts',
    edits: [
      ['          if (settled || clickOverlay) return', '          if (clickOverlay) return'],
    ],
    failedFullName: `${AVI_DESC} M1 视频已 ended 收尾后原 play() 才 reject — 不重建重试层、不再次播放`,
    marker: 'M1: settled 后迟到 reject 不得重建点击重试层',
    mutation: 'tryPlay catch 移除 settled 早退 → ended 收尾后的迟到 reject 重建点击重试层',
  },
  {
    id: 'N-M2-cleanup-keeps-overlay',
    file: 'src/shell/avi-player.ts',
    edits: [
      [
        `      if (curVideoEl === video) curVideoEl = undefined // 解除跟踪,后续 setVideoVolume 不再触及已移除元素
      removeClickOverlay()
      if (video.parentElement) video.parentElement.removeChild(video)`,
        `      if (curVideoEl === video) curVideoEl = undefined // 解除跟踪,后续 setVideoVolume 不再触及已移除元素
      if (video.parentElement) video.parentElement.removeChild(video)`,
      ],
    ],
    failedFullName: `${AVI_DESC} M2 重试 play 结果迟于 ended — 收尾自行退休重试层,迟到结果不重建 overlay 也不再播放`,
    marker: 'M2: ended 收尾必须移除点击重试层',
    mutation: 'cleanup 移除 removeClickOverlay() 调用 → 重试结果未定期间 ended 收尾后 overlay 残留',
  },
  {
    id: 'N-M4-cleanup-not-idempotent',
    file: 'src/shell/avi-player.ts',
    edits: [
      [
        `    const cleanup = (): void => {
      if (settled) return
      settled = true`,
        `    const cleanup = (): void => {
      settled = true`,
      ],
    ],
    failedFullName: `${AVI_DESC} M4 跳过 500ms 收尾窗口内的重复跳过键与 ended 只完成一次,残留定时器不触及下一段顺序视频`,
    marker: 'M4: 收尾清理只执行一次(重复键定时器不得重复 pause)',
    mutation:
      'cleanup 移除 settled 幂等守卫 → 跳过窗口内重复键定时器 + ended 各自完整收尾(重复 pause)',
  },
  {
    id: 'N-M5-tracking-never-set',
    file: 'src/shell/avi-player.ts',
    edits: [
      [
        '    curVideoEl = video // 模块级跟踪 → 播放中拖滑块/切静音即时刷新',
        '    // N-M5 needle: curVideoEl 跟踪赋值移除',
      ],
    ],
    failedFullName: `${AVI_DESC} M5 前段视频的迟到 play() reject 不抢下段视频的音量与 DOM 所有权`,
    marker: 'M5: 下一段视频是当前音量所有者',
    mutation: '移除 curVideoEl = video 跟踪赋值 → 下一段视频不被登记为音量所有者',
  },
  {
    id: 'N-M8-warmup-forgets-pause',
    file: 'src/shell/avi-player.ts',
    edits: [
      [
        `      .then(() => {
        v.pause()
        v.remove()
      })`,
        `      .then(() => {
        v.remove()
      })`,
      ],
    ],
    failedFullName: `${AVI_DESC} M8 warm-up play() resolve 迟到 — 只清理自己的临时 video,不触及正式播放的 video`,
    marker: 'M8: 迟到 resolve 只 pause warm-up 自己的临时 video',
    mutation: 'warmUpVideoAutoplay 成功分支移除 v.pause() → 迟到 resolve 不再清理自己的临时 video',
  },
  {
    id: 'N-M6-failure-evicts-all-chunks',
    file: 'src/shell/rng-player.ts',
    edits: [
      [
        '    if (rngChunkCache.get(chunkIdx) === p) rngChunkCache.delete(chunkIdx)',
        '    if (rngChunkCache.get(chunkIdx) === p) rngChunkCache.clear()',
      ],
    ],
    failedFullName: `${RNG_DESC} M6 chunk A 加载失败不驱逐 chunk B 成功缓存 — 复播 B 不重载、帧数据不串`,
    marker: 'M6: chunk A 失败不得驱逐 chunk B 的成功缓存(复播 B 不重载)',
    mutation: '失败驱逐从按 chunk delete 改为整表 clear → chunk A 失败连带驱逐 chunk B 成功缓存',
  },
  {
    id: 'N-M7-listener-never-returned',
    file: 'src/shell/rng-player.ts',
    edits: [
      [
        `  } finally {
    window.removeEventListener('keydown', onKey, true)
  }`,
        `  } finally {
  }`,
      ],
    ],
    failedFullName: `${RNG_DESC} M7 成功帧乱序迟到 + 中间帧失败 — 顺序保持、末屏为最后成功帧、结束后归还输入监听`,
    marker: 'M7: 结束后跳过键监听已归还(不再被消费)',
    mutation:
      'playRng finally 移除 keydown removeEventListener → 播放结束后跳过键监听泄漏(继续被消费)',
  },
]

const report = {
  card: 'TEST-GAME-MEDIA-LIFECYCLE-1',
  revision:
    'r2(闭合 Codex 一审 A-R1-03/04:唯一判据拒收 signal/spawn/collection/身份漂移并自测;三态 JSON/raw/执行身份/完整失败文本/argv/cwd/env 持久化)',
  suite: `定向两文件(${AVI} + ${RNG}),执行集 7 合同(file×fullName 逐字锁定)`,
  command: `node node_modules/vitest/vitest.mjs run <两文件> --reporter=json --outputFile.json=<证据目录 mutation-logs/*.json>(cwd=mkdtemp 隔离树 packages/game)`,
  isolation:
    '变异只落 mkdtemp 树(建树校验冻结源 sha256;建树任一步失败也先删本次树);finally 删树;贡献者树两冻结源 git status 零残留',
  node: process.version,
  testFileSha256: {
    [AVI]: sha256Of(path.join(GAME, AVI)),
    [RNG]: sha256Of(path.join(GAME, RNG)),
  },
  judgeSelfTest: [],
  judgeProbes: [],
  baseline: {},
  needles: [],
  finalState: {},
  residue: '',
  earlyFailureCleanup: {},
  cleanup: '',
}

const fail = (message) => {
  throw new Error(message)
}

// ── 0) 判据自证:合成反例证明 judge 真实拒收,先于任何真实针 ──
report.judgeSelfTest = judgeSelfTest(TEST_FILES)
writeRaw(
  path.join(LOGS, 'judge-selftest.raw'),
  report.judgeSelfTest
    .map(
      (c) =>
        `${c.accepted === c.want ? 'ok' : 'BAD'} ${c.name} accepted=${c.accepted} want=${c.want}`,
    )
    .join('\n'),
)
console.log(`judge self-test: ${report.judgeSelfTest.length} cases all behave`)

const tree = buildIsolatedTree('counterproof')
const pristine = new Map()
for (const needle of NEEDLES) {
  if (!pristine.has(needle.file)) {
    pristine.set(needle.file, readFileSync(path.join(tree.game, needle.file), 'utf8'))
  }
}

const applyEdits = (needle) => {
  const full = path.join(tree.game, needle.file)
  let source = readFileSync(full, 'utf8')
  for (const [oldText, newText] of needle.edits) {
    if (source.split(oldText).length !== 2) {
      fail(`${needle.id}: mutation anchor not unique in ${needle.file}: ${oldText.slice(0, 60)}`)
    }
    source = source.replace(oldText, newText)
  }
  writeFileSync(full, Buffer.from(source, 'utf8'))
  return sha256Of(full)
}

const restorePristine = (file) => {
  const full = path.join(tree.game, file)
  writeFileSync(full, Buffer.from(pristine.get(file), 'utf8'))
  return sha256Of(full)
}

const sha256Text = (text) => sha256Bytes(Buffer.from(text, 'utf8'))

// ── 0b) 真实 Vitest 判据探针(A-R2-01):目标单红 + afterAll 抛错 / 异步 uncaught 必须拒收,
// 纯业务目标红必须接受;探针文件只在隔离树生成、用后删除,raw/JSON 持久于 mutation-logs/ ──
report.judgeProbes = runJudgeProbes(tree, LOGS)
console.log(
  `judge probes: ${report.judgeProbes.map((p) => `${p.id}=${p.rejected ? 'rejected' : 'accepted'}`).join(', ')}`,
)

const rel = (file) => path.relative(EV, file).replaceAll(path.sep, '/')

/** 每态完整记录(A-R1-04):进程层(exit/signal/pid/spawnError)、argv/cwd/env、计数、
 * 执行身份(file :: fullName :: status)、raw+JSON 持久路径与哈希;红态附完整失败文本。 */
const stateRecord = (run, state, { failedTest } = {}) => ({
  state,
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
    total: run.report.numTotalTests,
    passed: run.report.numPassedTests,
    failed: run.report.numFailedTests,
    pending: run.report.numPendingTests,
    todo: run.report.numTodoTests,
    suites: run.report.numTotalTestSuites,
    failedSuites: run.report.numFailedTestSuites,
  },
  executionIdentity: run.tests
    .map((t) => {
      const file = TEST_FILES.find((f) =>
        (run.suites.find((s) => s.assertionResults.includes(t))?.name ?? '').endsWith(f),
      )
      return `${file ?? '<unknown>'} :: ${t.fullName} :: ${t.status}`
    })
    .sort(),
  ...(failedTest
    ? {
        failedTest: {
          fullName: failedTest.fullName,
          status: failedTest.status,
          failureMessages: failedTest.failureMessages ?? [],
        },
      }
    : {}),
  raw: { file: rel(run.rawFile), sha256: run.rawSha256 },
  json: { file: rel(run.jsonFile), sha256: run.jsonSha256 },
})

try {
  // ── 1) 基线绿(第一态) ──
  const baseline = runVitestJson(
    tree.game,
    TEST_FILES,
    path.join(LOGS, 'green-baseline.raw'),
    path.join(LOGS, 'green-baseline.json'),
  )
  const baselineProblems = judgeGreen(baseline, EXPECTED_ROWS, TEST_FILES)
  if (baselineProblems.length > 0) fail(`baseline not green: ${baselineProblems.join('; ')}`)
  report.baseline = stateRecord(baseline, 'clean-baseline(第一态)')
  console.log(`baseline: ${report.baseline.counts.passed}/${report.baseline.counts.total} passed`)

  // ── 2) 逐针:变异红 → 还原绿 ──
  for (const needle of NEEDLES) {
    const pristineSha = sha256Text(pristine.get(needle.file))
    const mutantSha = applyEdits(needle)
    const red = runVitestJson(
      tree.game,
      TEST_FILES,
      path.join(LOGS, `${needle.id}.red.raw`),
      path.join(LOGS, `${needle.id}.red.json`),
    )
    const restoredSha = restorePristine(needle.file)
    if (restoredSha !== pristineSha) fail(`${needle.id}: restore sha mismatch`)
    const green = runVitestJson(
      tree.game,
      TEST_FILES,
      path.join(LOGS, `${needle.id}.green.raw`),
      path.join(LOGS, `${needle.id}.green.json`),
    )
    const redProblems = judgeRed(
      red,
      EXPECTED_ROWS,
      TEST_FILES,
      needle.failedFullName,
      needle.marker,
    )
    if (redProblems.length > 0) fail(`${needle.id} red judged invalid: ${redProblems.join('; ')}`)
    const greenProblems = judgeGreen(green, EXPECTED_ROWS, TEST_FILES)
    if (greenProblems.length > 0)
      fail(`${needle.id} restored not green: ${greenProblems.join('; ')}`)
    const failed = red.tests.find((t) => t.status === 'failed')
    report.needles.push({
      id: needle.id,
      mutation: `${needle.file}: ${needle.mutation}`,
      execution: `node node_modules/vitest/vitest.mjs run ${TEST_FILES.join(' ')} --reporter=json --outputFile.json=...(cwd=隔离树 ${rel(tree.game)},变异 ${needle.file})`,
      hashes: {
        sourcePristine: pristineSha,
        mutant: mutantSha,
        restored: restoredSha,
      },
      red: stateRecord(red, 'red(第二态:恰一指定业务 AssertionError)', {
        failedTest: failed,
      }),
      restoredGreen: stateRecord(green, 'restored-green(第三态)'),
    })
    console.log(
      `${needle.id}: red ok (${report.needles.at(-1).red.counts.passed}+1failed/${report.needles.at(-1).red.counts.total}) green ok`,
    )
  }

  // ── 3) 末次整套重放(第四态) ──
  const final = runVitestJson(
    tree.game,
    TEST_FILES,
    path.join(LOGS, 'final-replay.raw'),
    path.join(LOGS, 'final-replay.json'),
  )
  const finalProblems = judgeGreen(final, EXPECTED_ROWS, TEST_FILES)
  if (finalProblems.length > 0) fail(`final replay not green: ${finalProblems.join('; ')}`)
  report.finalState = stateRecord(final, 'final-replay(第四态:全部针还原后两文件整套重放)')

  // ── 4) 贡献者树冻结源零残留 ──
  const residue = spawnSync(
    'git',
    [
      '-C',
      REPO,
      'status',
      '--porcelain',
      'packages/game/src/shell/avi-player.ts',
      'packages/game/src/shell/rng-player.ts',
    ],
    { encoding: 'utf8' },
  )
  if (residue.stdout.trim() !== '')
    fail(`contributor tree frozen sources modified:\n${residue.stdout}`)
  report.residue =
    'clean(贡献者树 avi-player.ts / rng-player.ts git status 零改动;变异全程在隔离树)'
  // A-R1-02 双路径收尾举证:红态即「提前断言失败」路径的真实采样——失败点仍在途资源
  // (播放器 promise/window 监听/测试受控 deferred/overlay/fake timers)由 afterEach 经公开
  // 事件 settle、deferred 兜底 reject、runAllTimersAsync 排空后恢复端口。同一 jsdom window
  // 内后续 6 测试全绿 + 判据强制零 unhandled/零 collection suite 错误 = 提前失败未泄漏状态。
  report.earlyFailureCleanup = {
    normalPath: '基线/还原绿/末次重放:用例内自 settle,afterEach 兜底对空集 no-op',
    earlyFailurePath:
      '各针红态 = 断言中途失败且资源在途的真实采样;N-M2 失败点带在途重试 deferred+overlay,N-M8 带在途正式播放器+未 settle warm-up deferred',
    guarantees:
      '判据(四态同门)强制:零 unhandled 输出、零零断言 failed suite、其余 6 测试同进程全绿、执行集无漂移',
  }
} finally {
  report.cleanup = tree.cleanup()
  persistJson(path.join(EV, 'counterproof.json'), JSON.stringify(report, null, 2))
  console.log(`cleanup: ${report.cleanup}`)
}
