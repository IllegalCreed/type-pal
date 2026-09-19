// TEST-EDITOR-MAP-DATA-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
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
const logs = mkdtempSync(join(tmpdir(), 'tb06-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  editor: { filter: '@type-pal/editor', prefix: 'packages/editor/src/core' },
}

const TESTS = {
  selection: ['src/core/map-selection.boundaries.test.ts'],
  transform: ['src/core/map-transform.boundaries.test.ts'],
  patch: ['src/core/map-patch.boundaries.test.ts'],
  draft: ['src/core/stamp-draft.boundaries.test.ts'],
  template: ['src/core/stamp-template.boundaries.test.ts'],
  placement: ['src/core/stamp-placement.boundaries.test.ts'],
  group: ['src/core/stamp-group-transform.boundaries.test.ts'],
}

const cases = [
  {
    name: 'control-selection',
    pkg: 'editor',
    group: 'selection',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-patch',
    pkg: 'editor',
    group: 'patch',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-group',
    pkg: 'editor',
    group: 'group',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'selection-hidden-none-gate-removed',
    pkg: 'editor',
    group: 'selection',
    file: 'map-selection.ts',
    from: "if (layers.length === 0) return { kind: 'none' }",
    to: "if (false) return { kind: 'none' }",
    red: '隐藏活动层时全选不再返回 none',
    redTest: '隐藏活动层全选为 none；排除 key 精确集合（非空 remain）',
    expected: 1,
  },
  {
    name: 'transform-collision-conflict-blind',
    pkg: 'editor',
    group: 'transform',
    file: 'map-transform.ts',
    from: 'if (current !== 0 && current !== source.value)',
    to: 'if (false)',
    red: '不同非零 collision 冲突不再检出',
    redTest: 'collision：目标 0 或同值不冲突；不同非零才冲突',
    expected: 1,
  },
  {
    name: 'patch-collision-duplicate-blind',
    pkg: 'editor',
    group: 'patch',
    file: 'map-patch.ts',
    from: 'if (collisionByRef.has(refKey)) {',
    to: 'if (false) {',
    red: 'collision 同格重复写入静默覆盖',
    redTest: 'collision 同格重复写入拒绝（同值/不同值都不允许）；视觉坐标/值单轴各自拒绝',
    expected: 1,
  },
  {
    name: 'draft-layer-empty-guard-removed',
    pkg: 'editor',
    group: 'draft',
    file: 'stamp-draft.ts',
    from: "if (!id || !name) throw new Error('组合图层 ID 和名称不能为空。')",
    to: "if (false) throw new Error('unreachable')",
    red: '空 ID/名层不再拒绝',
    redTest: '空 ID/空名/重复 ID/缺层精确拒绝',
    expected: 1,
  },
  {
    name: 'template-id-normalize-dropped',
    pkg: 'editor',
    group: 'template',
    file: 'stamp-template.ts',
    from: "const stem = normalizedTemplateId(preferred) || 'stamp'",
    to: "const stem = 'stamp'",
    red: '模板 id 不再按偏好归一（恒 stamp）',
    redTest: 'nextStampTemplateId：NFKC/trim/小写/非法字符归一；空归 stamp；占用 -2 递增',
    expected: 1,
  },
  {
    name: 'placement-locked-gate-removed',
    pkg: 'editor',
    group: 'placement',
    file: 'stamp-placement.ts',
    from: 'if (locked.has(target.id))',
    to: 'if (false)',
    red: '锁定目标层不再阻止放置',
    redTest:
      '已占 placementId / 未知 mapping / 重复 mapping / 锁定层：完整 issues、canApply=false、map 不变',
    expected: 1,
  },
  {
    name: 'group-capture-dedup-removed',
    pkg: 'editor',
    group: 'group',
    file: 'stamp-group-transform.ts',
    from: 'const ids = [...new Set(placementIds)]',
    to: 'const ids = [...placementIds]',
    red: 'placement id 不再去重（重复 id 捕获两份）',
    redTest: '空列表 / 缺失组 → undefined；重复 id 去重仍捕获一份',
    expected: 1,
  },
  {
    name: 'template-category-dropped',
    pkg: 'editor',
    group: 'template',
    file: 'stamp-template.ts',
    from: 'const category = input.category?.trim()',
    to: 'const category = undefined',
    red: 'category 不再入模板（合法分类丢失）',
    redTest:
      '层序按 map 层序而非 selection 序；layerSlotNames 回退与 trim；category trim/缺省；输出不别名',
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
  if (ts.isIfStatement(node) && node.expression.getText(ownAst) === 'item.expected === 1')
    criterionBlocks.push(node.thenStatement.getText(ownAst))
  ts.forEachChild(node, visitOwn)
}
visitOwn(ownAst)
assert.equal(criterionBlocks.length, 1, 'exactly one verdict block')
new Function('assert', 'item', 'output', criterionBlocks[0])(
  assert,
  { name: 'selftest-good' },
  'MUTATION_HIT selftest-good\nAssertionError: expected 1 to equal 2',
)
let poisoned = false
try {
  new Function('assert', 'item', 'output', criterionBlocks[0])(
    assert,
    { name: 'selftest-poisoned' },
    'MUTATION_HIT x\nAssertionError: y\nTypeError: host\nTest timed out\nUnhandled Errors\nSTACK_TRACE_ERROR',
  )
} catch {
  poisoned = true
}
assert.ok(poisoned, 'poisoned log must be rejected')

/** 运行态判据（与四向自测同一语义）：仅认每条 failureMessages 的首行业务 AssertionError/expect 形式。 */
function pinnedVerdict(failureMessages) {
  if ((failureMessages ?? []).length === 0) return false
  return failureMessages.every((m) =>
    /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n', 1)[0] ?? ''),
  )
}
assert.equal(
  pinnedVerdict(['Error: STACK_TRACE_ERROR\n    at task']),
  false,
  'target timeout rejected',
)
assert.equal(
  pinnedVerdict(['Error: decoder rejected input\nCaused by AssertionError: nested detail']),
  false,
  'ordinary Error with nested AssertionError substring rejected (first-line only)',
)
assert.equal(
  pinnedVerdict(['Error: Test timed out in 5000ms\n  async test failed']),
  false,
  'pure timeout rejected even when other tests carry business red',
)
assert.equal(pinnedVerdict([]), false, 'not-run rejected')
assert.equal(pinnedVerdict(['AssertionError: expected 1 to be 2']), true, 'pure red passes')
assert.equal(pinnedVerdict(['expect(received).toBe(expected)']), true, 'expect-form passes')
process.stderr.write(`criterion self-test ok (blocks=${criterionBlocks.length})\n`)

const files = [
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, PACKAGES[c.pkg].prefix, c.file)] : []))),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const pkgDir = join(root, 'packages/editor')
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
 plugins:[{name:'tb06-single-point',enforce:'pre',load(id){
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
    const pinned = assertions.find(
      (r) => r.title === item.redTest || r.title.endsWith(item.redTest),
    )
    assert.ok(pinned, `${item.name}: pinned not executed: ${item.redTest}; ${log}`)
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
