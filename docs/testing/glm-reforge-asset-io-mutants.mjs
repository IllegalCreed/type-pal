// TEST-REFORGE-ASSET-IO-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 6 组各 1 针 + 3 对照（sfx 双针/readiness/cache/http/fsa/registry）；
// 判据含：钉名目标 failureMessages 非空且每条首行匹配 AssertionError/^expect(；
// STACK_TRACE_ERROR/TypeError/超时/未处理异常 全局排除；永久四向自测。
// 运行：node docs/testing/glm-reforge-asset-io-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'aio1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  sfx: ['src/audio/sfx.staged-failures.test.ts'],
  readiness: ['src/audio/sfx-readiness.collections.test.ts'],
  cache: ['src/project-image-cache.lifecycle.test.ts'],
  http: ['src/file-source.cancel-windows.test.ts'],
  fsa: ['src/fsa-source.cancel-windows.test.ts'],
  registry: ['src/engine-chrome/registry.lifecycle.test.ts'],
}

const cases = [
  { name: 'control-sfx', pkg: 'reforge', group: 'sfx', file: null, from: '', to: '', expected: 0 },
  {
    name: 'control-cache',
    pkg: 'reforge',
    group: 'cache',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-registry',
    pkg: 'reforge',
    group: 'registry',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'sfx-wave-gate-removed',
    pkg: 'reforge',
    group: 'sfx',
    file: 'audio/sfx.ts',
    from: "if (view.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')",
    to: 'if (false)',
    red: 'RIFF 标记门失效（坏 WAV 到达 decode）',
    redTest: 'RIFF 首标记错 / WAVE 标记错 / 长度不足 三轴各自拒绝且 decode 零调用',
    expected: 1,
  },
  {
    name: 'sfx-adapter-copy-removed',
    pkg: 'reforge',
    group: 'sfx',
    file: 'audio/sfx.ts',
    from: 'decode: (bytes) => context.decodeAudioData(bytes.slice(0)),',
    to: 'decode: (bytes) => context.decodeAudioData(bytes),',
    red: 'browserAdapter 不再复制字节（源可被 decode 污染）',
    redTest:
      'window.AudioContext 双替身下产品 browserAdapter 构造：decode 收到字节副本、宿主事件齐',
    expected: 1,
  },
  {
    name: 'readiness-throw-sound-dropped',
    pkg: 'reforge',
    group: 'readiness',
    file: 'audio/sfx-readiness.ts',
    from: 'add(out, item?.throw?.sound)',
    to: 'void item',
    red: '背包投掷音不再入集',
    redTest: '背包物品三音轴：use.sound + throw.sound + magic 呈现动画音都入集',
    expected: 1,
  },
  {
    name: 'cache-kind-gate-removed',
    pkg: 'reforge',
    group: 'cache',
    file: 'project-image-cache.ts',
    from: 'if (!PROJECT_IMAGE_KINDS.has(expectedKind))',
    to: 'if (false)',
    red: '不支持 kind 的零读取门失效',
    redTest: '不支持 kind 在任何读取前拒绝（resolver.record 零调用 → 零 bytes 读取）',
    expected: 1,
  },
  {
    name: 'cache-pending-reuse-removed',
    pkg: 'reforge',
    group: 'cache',
    file: 'project-image-cache.ts',
    from: 'const inflight = this.pending.get(asset)\n    if (inflight) return inflight',
    to: 'const inflight = undefined',
    red: 'pending 复用失效（并发同 asset 重复解码）',
    redTest: 'pending 复用：并发同 asset 只解码一次、同一 bitmap 身份；命中后零新读取',
    expected: 1,
  },
  {
    name: 'http-signal-passthrough-removed',
    pkg: 'reforge',
    group: 'http',
    file: 'file-source.ts',
    from: '? await fetch(url, { signal })',
    to: '? await fetch(url)',
    red: '带 signal 的普通读取不再透传取消',
    redTest: '同一 AbortSignal 实例原样到达 fetch（identity 不复制不重建）',
    expected: 1,
  },
  {
    name: 'fsa-mid-abort-removed',
    pkg: 'reforge',
    group: 'fsa',
    file: 'fsa-source.ts',
    from: 'for (const p of parts) {\n    d = await d.getDirectoryHandle(p)\n    throwIfAborted(signal)\n  }',
    to: 'for (const p of parts) {\n    d = await d.getDirectoryHandle(p)\n  }',
    red: '目录段之后的取消门失效（取消后文件段 IO 仍开始）',
    redTest: '目录段之后、文件段之前取消 → AbortError 且文件段 IO 未开始（可控门见证）',
    expected: 1,
  },
  {
    name: 'registry-cache-hit-removed',
    pkg: 'reforge',
    group: 'registry',
    file: 'engine-chrome/registry.ts',
    from: 'const hit = imageCache.get(slot)',
    to: 'const hit = undefined',
    red: '模块级缓存命中失效（同 slot 重复 fetch）',
    redTest: '成功路径：同 slot 二次调用返回同一 Promise 身份（缓存命中）；跨 slot 各自独立',
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
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, 'packages/reforge/src', c.file)] : []))),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/reforge/src', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages/reforge'))},
 plugins:[{name:'aio1-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{include:${JSON.stringify(TESTS[item.group])},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const jsonReport = join(logs, `${item.name}.json`)
  const command = [
    '--filter',
    '@type-pal/reforge',
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
