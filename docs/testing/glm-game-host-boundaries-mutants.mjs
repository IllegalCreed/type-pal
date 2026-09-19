// TEST-GAME-HOST-BOUNDARIES-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 8 针（全选隐藏层门、paste collision 冲突判定、patch collision 重复门、draft 层空值门、
// template id 归一、placement 锁层门、group capture 去重、template category）+ 3 对照；
// 判据同队列标准（钉名 AssertionError + 四向自测）。
// 运行：node docs/testing/glm-editor-map-data-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'tb09-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  editor: { filter: '@type-pal/game', prefix: 'packages/game/src' },
}

const TESTS = {
  fetchretry: ['src/shell/fetch-retry.boundaries.test.ts'],
  input: ['src/shell/input.boundaries.test.ts'],
  audio: ['src/shell/audio-volume.boundaries.test.ts'],
  consent: ['src/analytics/analytics-consent.boundaries.test.ts'],
  ga: ['src/analytics/google-analytics.boundaries.test.ts'],
  timer: ['src/tools/speedrun/timer.boundaries.test.ts'],
  timefmt: ['src/tools/speedrun/time-format.boundaries.test.ts'],
}

const cases = [
  {
    name: 'control-timer',
    pkg: 'editor',
    group: 'timer',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-consent',
    pkg: 'editor',
    group: 'consent',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-timefmt',
    pkg: 'editor',
    group: 'timefmt',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'fetchretry-gateway-retry-gate-removed',
    pkg: 'editor',
    group: 'fetchretry',
    file: 'shell/fetch-retry.ts',
    from: 'if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {',
    to: 'if (false) {',
    red: '502/503/504 不再重试（瞬时网关错误直抛给游戏）',
    redTest: '重试后成功：返回最终那次 Response 身份（502→504→200）',
    expected: 1,
  },
  {
    name: 'input-fade-filter-removed',
    pkg: 'editor',
    group: 'input',
    file: 'shell/input.ts',
    from: 'held: new Set([...this.held].filter((k) => !this.suppressedHeld.has(k))),',
    to: 'held: new Set(this.held),',
    red: 'fade 抑制集不再过滤 held（演出期间方向泄漏进快照）',
    redTest: '未知 keyup 不清合法 held；fade 抑制只针对方向键且物理松开解除',
    expected: 1,
  },
  {
    name: 'audio-muted-zero-apply-dropped',
    pkg: 'editor',
    group: 'audio',
    file: 'shell/audio-volume.ts',
    from: 'opts.applyVolume(muted ? 0 : volume)',
    to: 'opts.applyVolume(volume)',
    red: '静音时仍 apply 目标音量（静音失效）',
    redTest: '三通道 keyVol 独立、keyMute 共享：精确 IO；静音中改目标仍 apply 0，unmute 恢复新值',
    expected: 1,
  },
  {
    name: 'consent-detail-validation-dropped',
    pkg: 'editor',
    group: 'consent',
    file: 'analytics/analytics-consent.ts',
    from: "listener(isStoredConsent(detail) ? detail : 'unset')",
    to: 'listener((detail ?? null) as never)',
    red: '非法 detail 直传订阅者（unset 判别失效）',
    redTest: '非 CustomEvent → unset；unsubscribe 后真实 dispatch 零回调',
    expected: 1,
  },
  {
    name: 'ga-deny-lastpath-kept',
    pkg: 'editor',
    group: 'ga',
    file: 'analytics/google-analytics.ts',
    from: '    lastPath = undefined',
    to: '    lastPath = lastPath',
    red: 'deny 后不清 lastPath（regrant 同页被去重吞掉）',
    redTest:
      '不传 subscribePage：grant 发当前页一次；deny 停发且清 lastPath；regrant 同页可再发；stop 后零回调',
    expected: 1,
  },
  {
    name: 'timer-live-gate-removed',
    pkg: 'editor',
    group: 'timer',
    file: 'tools/speedrun/timer.ts',
    from: 'if (live) run.elapsedMs += Math.max(0, dt)',
    to: 'run.elapsedMs += Math.max(0, dt)',
    red: '暂停期照常累计（计时器不停表）',
    redTest: '手动暂停 3 秒倒计时精确边界：2999 未恢复、3000 恢复且恢复帧不计时；justResumed 一次',
    expected: 1,
  },
  {
    name: 'detectors-enterany-prev-clause-dropped',
    pkg: 'editor',
    group: 'timer',
    file: 'tools/speedrun/detectors.ts',
    from: 'return (cur, prev) => set.has(cur.scene) && (prev == null || !set.has(prev.scene))',
    to: 'return (cur) => set.has(cur.scene)',
    red: 'enterAny 忽略来源（集内转场误触发）',
    redTest: 'enterAny：集合内转场不触发；从集合外进入触发；prev=null 视为进入',
    expected: 1,
  },
  {
    name: 'timefmt-minute-second-cap-removed',
    pkg: 'editor',
    group: 'timefmt',
    file: 'tools/speedrun/time-format.ts',
    from: 'if (m > 59 || sec > 59) return null',
    to: 'if (false) return null',
    red: '分秒 >59 不再拒绝（1:60 被当合法）',
    redTest: 'parseHms：2/3 段合法；负号/空白段/非数字/分秒 60/单段全拒绝',
    expected: 1,
  },
]

// ── 判据自测（正反控 + 逐目标四向）────────────────────────────────────
const ts = createRequire(join(root, 'package.json'))('typescript')
const ownPath = fileURLToPath(import.meta.url)
const ownAst = ts.createSourceFile(
  ownPath,
  readFileSync(ownPath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
const criterionBlocks = []
function visitOwn(node) {
  if (
    ts.isIfStatement(node) &&
    ['item.expected === 1', 'item.redTest !== undefined'].includes(node.expression.getText(ownAst))
  )
    criterionBlocks.push(node.thenStatement.getText(ownAst))
  ts.forEachChild(node, visitOwn)
}
visitOwn(ownAst)
assert.equal(criterionBlocks.length, 2, 'exactly two verdict blocks')
// 实际运行与自测共用判据：直接执行抽取出的两段运行态块（非另写谓词）。
const runCriterion = new Function(
  'assert',
  'item',
  'output',
  'assertions',
  'log',
  criterionBlocks.join('\n'),
)
const pinnedEntry = (title, messages) => ({
  title,
  status: 'failed',
  ...(messages === null ? {} : { failureMessages: messages }),
})
const business = ['AssertionError: expected 1 to equal 2']
const accepts = (assertions) => {
  try {
    runCriterion(
      assert,
      { name: 'selftest', expected: 1, redTest: 'target' },
      'MUTATION_HIT selftest\nAssertionError: expected 1 to equal 2',
      assertions,
      'selftest',
    )
    return true
  } catch (error) {
    assert(
      error instanceof assert.AssertionError,
      `self-test rejection must be AssertionError, got: ${String(error)}`,
    )
    return false
  }
}
// 正控：唯一精确目标 + 业务红首行
assert.equal(accepts([pinnedEntry('target', business)]), true, 'exact unique target accepted')
// 后缀冒名：只有「other target」失败、精确目标未执行 → 拒绝
assert.equal(
  accepts([pinnedEntry('other target', business)]),
  false,
  'suffix-impersonation target rejected',
)
// 重名：两个同名 target → 拒绝（不猜取哪一个）
assert.equal(
  accepts([pinnedEntry('target', business), pinnedEntry('target', business)]),
  false,
  'duplicate target titles rejected',
)
// 未失败 / 空 messages / 普通Error内嵌AssertionError / 纯超时 → 全拒绝
assert.equal(
  accepts([{ title: 'target', status: 'passed', failureMessages: [] }]),
  false,
  'not-failed target rejected',
)
assert.equal(accepts([pinnedEntry('target', [])]), false, 'empty failureMessages rejected')
assert.equal(
  accepts([
    pinnedEntry('target', [
      'Error: decoder rejected input\nCaused by AssertionError: nested detail',
    ]),
  ]),
  false,
  'ordinary Error with nested AssertionError substring rejected (first-line only)',
)
assert.equal(
  accepts([pinnedEntry('target', ['Error: Test timed out in 5000ms\n  async test failed'])]),
  false,
  'pure timeout rejected even when other tests carry business red',
)
// expect 形式与普通 AssertionError 均为合法业务首行
assert.equal(
  accepts([pinnedEntry('target', ['expect(received).toBe(expected)'])]),
  true,
  'expect-form accepted',
)
let poisoned = false
try {
  runCriterion(
    assert,
    { name: 'selftest-poisoned', expected: 1 },
    'MUTATION_HIT x\nAssertionError: y\nTypeError: host\nTest timed out\nUnhandled Errors\nSTACK_TRACE_ERROR',
    [],
    'selftest',
  )
} catch {
  poisoned = true
}
assert.ok(poisoned, 'poisoned log must be rejected')
process.stderr.write(`criterion self-test ok (blocks=${criterionBlocks.length})\n`)

const files = [
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, PACKAGES[c.pkg].prefix, c.file)] : []))),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const pkgDir = join(root, 'packages/game')
  const mutation = {
    ...item,
    file: item.file ? join(root, PACKAGES[item.pkg].prefix, item.file) : null,
  }
  if (mutation.file)
    assert.equal(
      readFileSync(mutation.file, 'utf8').split(item.from).length,
      2,
      `${item.name}: one point`,
    )
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation=${JSON.stringify(mutation)};
export default {
 root:${JSON.stringify(pkgDir)},
 plugins:[{name:'tb09-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{
 environment: 'jsdom',
 setupFiles: ['./vitest.setup.ts'],
 include:${JSON.stringify(TESTS[item.group])},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const jsonReport = join(logs, `${item.name}.json`)
  const command = [
    '--filter',
    PACKAGES[item.pkg].filter,
    'exec',
    'vitest',
    'run',
    '--config',
    config,
    '--reporter=json',
    '--outputFile',
    jsonReport,
  ]
  const run = spawnSync('pnpm', command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const raw = (run.stdout ?? '') + (run.stderr ?? '')
  const report = JSON.parse(readFileSync(jsonReport, 'utf8'))
  const assertions = report.testResults.flatMap((r) => r.assertionResults)
  const failureText = assertions.flatMap((r) => r.failureMessages ?? []).join('\n')
  const output = `${raw}\n${failureText}`
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: interrupted; ${log}`)
  assert.ok(report.numTotalTests > 0, `${item.name}: zero tests; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: exit; ${log}`)
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: business red expected`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors|STACK_TRACE_ERROR/,
      `${item.name}: host failure`,
    )
  }
  if (item.redTest !== undefined) {
    // 精确且唯一目标：title 全等（后缀冒名拒绝）、命中恰 1（重名拒绝）、failed、
    // 非空 failureMessages 且每条首行业务 AssertionError/expect。
    const matches = assertions.filter((r) => r.title === item.redTest)
    assert.equal(
      matches.length,
      1,
      `${item.name}: pinned target "${item.redTest}" must match exactly one executed test (got ${matches.length}); ${log}`,
    )
    const pinned = matches[0]
    assert.equal(pinned.status, 'failed', `${item.name}: pinned did not fail; ${log}`)
    assert.ok((pinned.failureMessages ?? []).length > 0, `${item.name}: no failureMessages; ${log}`)
    for (const message of pinned.failureMessages ?? [])
      assert.match(
        message.split('\n', 1)[0] ?? message,
        /^AssertionError(?:\b|:)|^expect\(/,
        `${item.name}: pinned not business AssertionError (first line); ${log}`,
      )
  } else {
    assert.ok(
      assertions.every((r) => r.status === 'passed'),
      `${item.name}: control non-passing; ${log}`,
    )
  }
  results.push({
    name: item.name,
    exit: run.status,
    red: item.red ?? null,
    redTest: item.redTest ?? null,
    executedTests: report.numTotalTests,
    log,
    logSha256: sha(output),
  })
  process.stderr.write(
    `${item.name}: expected ${item.expected}, actual ${run.status}, tests ${report.numTotalTests}\n`,
  )
}
for (const [f, h] of Object.entries(hashes))
  assert.equal(sha(readFileSync(f)), h, `product changed: ${f}`)
console.log(
  JSON.stringify(
    {
      logs,
      criterionSelfTest: {
        goodAccepted: true,
        poisonedRejected: poisoned,
        pinnedVerdictFourWay: true,
      },
      sourceHashes: hashes,
      results,
    },
    null,
    2,
  ),
)
