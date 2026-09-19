// TEST-EDITOR-IMPORT-CODEC-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 8 针（image-import 签名门/battle-background 尺寸门、battle-sprite 10 帧门/id 递增、
// codec 块缓存逐出/来源越界、worker-client 传输副本、video-metadata meta 偏移）+ 3 对照；
// 判据含：钉名目标 failureMessages 非空且每条首行匹配 AssertionError/^expect(；
// STACK_TRACE_ERROR/TypeError/超时/未处理异常 全局排除；永久四向自测。
// 运行：node docs/testing/glm-import-codec-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'ic1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  stages: ['src/core/image-import.stages.test.ts'],
  battle: ['src/core/battle-sprite-import.boundaries.test.ts'],
  codec: ['src/core/frame-animation-codec.tpfs.test.ts'],
  client: ['src/core/frame-animation-worker-client.boundaries.test.ts'],
  video: ['src/core/video-metadata.boxes.test.ts'],
  worker: ['src/core/frame-animation-codec.worker.test.ts'],
  images: ['src/core/frame-animation-images.boundaries.test.ts'],
}

const cases = [
  { name: 'control-stages', group: 'stages', file: null, from: '', to: '', expected: 0 },
  { name: 'control-worker', group: 'worker', file: null, from: '', to: '', expected: 0 },
  { name: 'control-images', group: 'images', file: null, from: '', to: '', expected: 0 },
  {
    name: 'png-signature-gate-removed',
    group: 'stages',
    file: 'image-import.ts',
    from: 'if (signature.length !== 8 || expected.some((value, index) => signature[index] !== value))',
    to: 'if (false)',
    red: 'PNG 8 字节签名门失效（坏签名被当有效文件）',
    redTest: '非 PNG 扩展名拒绝；坏签名拒绝（真实 8 字节签名域）；解码失败带文件名与原因',
    expected: 1,
  },
  {
    name: 'battle-background-size-gate-removed',
    group: 'stages',
    file: 'image-import.ts',
    from: 'if (width !== 320 || height !== 200) {',
    to: 'if (false) {',
    red: '战场背景 320×200 尺寸门失效',
    redTest:
      'battle-background：320×200 + palette 通过并产出 preview；尺寸不符拒绝、缺 palette 拒绝',
    expected: 1,
  },
  {
    name: 'player-ten-frame-gate-removed',
    group: 'battle',
    file: 'battle-sprite-import.ts',
    from: 'if (frameCount < 10)',
    to: 'if (false)',
    red: '玩家战斗精灵 10 帧下限失效',
    redTest: 'player 9 帧拒绝；10 帧产出完整十帧位表；summon 只带 kind',
    expected: 1,
  },
  {
    name: 'unique-id-bypassed',
    group: 'battle',
    file: 'battle-sprite-import.ts',
    from: 'if (!state.battleSprites.some((entry) => entry.id === candidate)) return candidate',
    to: 'if (true) return candidate',
    red: '占用 id 不再递增 -2（同 id 重复定义）',
    redTest: 'id 占用后 -2 递增；同字节二次导入复用同一 record 并校验存量字节',
    expected: 1,
  },
  {
    name: 'block-cache-eviction-removed',
    group: 'codec',
    file: 'frame-animation-codec.ts',
    from: 'if (blockCache.size <= 2) break',
    to: 'if (true) break',
    red: '块缓存不再逐出（容量无界，见证计数变 3）',
    redTest: '跨三块引用 5 帧只解码 4 块；命中帧不重解压',
    expected: 1,
  },
  {
    name: 'source-frame-bounds-removed',
    group: 'codec',
    file: 'frame-animation-codec.ts',
    from: 'frameIndex >= source.index.frames.length',
    to: 'frameIndex >= source.index.frames.length + 1000',
    red: 'sourceFrame 越界门失效（合法帧号域外仍尝试恢复）',
    redTest: '缺旧动画来源 / 越界 / 非整数 sourceFrame 各自拒绝',
    expected: 1,
  },
  {
    name: 'transfer-slice-removed',
    group: 'client',
    file: 'frame-animation-worker-client.ts',
    from: 'const source = request.source?.slice(0)',
    to: 'const source = request.source',
    red: 'encode 不再拷贝 source 直接 transfer（调用者原 buffer 被 detach）',
    redTest: 'postMessage 传副本 detach、调用者原 buffer 完好；应答后 terminate 恰一次',
    expected: 1,
  },
  {
    name: 'meta-content-offset-dropped',
    group: 'video',
    file: 'video-metadata.ts',
    from: "if (type === 'meta' && content + 4 <= boxEnd && scanMp4Boxes(bytes, content + 4, boxEnd))",
    to: "if (type === 'meta' && content + 4 <= boxEnd && scanMp4Boxes(bytes, content, boxEnd))",
    red: 'meta 子 box 起点错用 content（+4 版本/flags 偏移丢失）',
    redTest: 'meta 按 content+4 起扫子 box；音轨藏在 meta→moov 链内仍可命中',
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
  ...new Set(
    cases.flatMap((c) => (c.file ? [join(root, 'packages/editor/src/core', c.file)] : [])),
  ),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/editor/src/core', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages/editor'))},
 plugins:[{name:'ic1-single-point',enforce:'pre',load(id){
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
    '@type-pal/editor',
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
