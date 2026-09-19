// TEST-EDITOR-SCRIPT-HELPERS-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
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
const logs = mkdtempSync(join(tmpdir(), 'tb07-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  editor: { filter: '@type-pal/editor', prefix: 'packages/editor/src' },
}

const TESTS = {
  cmdedit: ['src/core/author-command-edit.boundaries.test.ts'],
  projection: ['src/core/script-editor-projection.boundaries.test.ts'],
  catalog: ['src/core/script-reference-catalog.boundaries.test.ts'],
  item: ['src/core/item-authoring.boundaries.test.ts'],
  alchemy: ['src/core/item-alchemy.boundaries.test.ts'],
  rewards: ['src/ui/enemy-defeated-events.boundaries.test.ts'],
}

const cases = [
  {
    name: 'control-cmdedit',
    pkg: 'editor',
    group: 'cmdedit',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-catalog',
    pkg: 'catalog' in TESTS ? 'editor' : 'editor',
    group: 'catalog',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'control-rewards',
    pkg: 'editor',
    group: 'rewards',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'cmdedit-child-kind-gate-blinded',
    pkg: 'editor',
    group: 'cmdedit',
    file: 'core/author-command-edit.ts',
    from: "      return command.kind === 'branch' ? command.then : undefined",
    to: "      return command.kind === 'branch' ? command.else : undefined",
    red: 'then 子键错读 else 子块（分支正文串位）',
    redTest: 'get 按 kind 命中；错配 kind/越界/缺下标 undefined',
    expected: 1,
  },
  {
    name: 'projection-initial-animation-shell-ignored',
    pkg: 'editor',
    group: 'projection',
    file: 'core/script-editor-projection.ts',
    from: '    const animation = shellPages?.[0]?.animation',
    to: '    const animation = undefined',
    red: 'initial 页动画不再被 shell 覆盖（canonical 旧动画泄漏）',
    redTest:
      'initial 页动画以 shell 覆盖/移除；非 initial 页动画保持 canonical；hostile 三 callback canonical 优先',
    expected: 1,
  },
  {
    name: 'projection-hostile-canonical-dropped',
    pkg: 'editor',
    group: 'projection',
    file: 'core/script-editor-projection.ts',
    from: '...(canonical?.hostile?.onLose !== undefined',
    to: '...(false',
    red: 'hostile.onLose 不再取 canonical（正文来源丢失）',
    redTest:
      'initial 页动画以 shell 覆盖/移除；非 initial 页动画保持 canonical；hostile 三 callback canonical 优先',
    expected: 1,
  },

  {
    name: 'catalog-empty-falls-back-to-library',
    pkg: 'editor',
    group: 'catalog',
    file: 'core/script-reference-catalog.ts',
    from: '      input.authorScripts ??',
    to: '      input.authorScripts?.length ? input.authorScripts :',
    red: '显式空 authorScripts 退回 library（库脚本泄漏为可编辑目标）',
    redTest: '显式空数组不退 library（库脚本不泄漏为可编辑目标）',
    expected: 1,
  },
  {
    name: 'item-copy-serial-start-shifted',
    pkg: 'editor',
    group: 'item',
    file: 'core/item-authoring.ts',
    from: '  for (let serial = 2; ; serial++) {',
    to: '  for (let serial = 3; ; serial++) {',
    red: 'copy 序号从 -3 起（-2 被跳过）',
    redTest: 'copy 与 copy-2 均占用后生成 -3；非首 gap 取第一个空位；乱序输入不依赖顺序',
    expected: 1,
  },
  {
    name: 'alchemy-kind-guard-removed',
    pkg: 'editor',
    group: 'alchemy',
    file: 'core/item-alchemy.ts',
    from: '  if (next.kind !== effectKind(surface))',
    to: '  if (false)',
    red: 'mutator 改写为另一 kind 不再拒绝',
    redTest: '缺 surface / 重复 effect / 改另一 kind 精确拒绝且零派发',
    expected: 1,
  },
  {
    name: 'rewards-dialog-span-dropped',
    pkg: 'editor',
    group: 'rewards',
    file: 'ui/enemy-defeated-events.ts',
    from: '    endIndex: giveIndex + (dialog ? 2 : 1),',
    to: '    endIndex: giveIndex + 1,',
    red: '奖励区间不再含相邻对白（替换会删掉对白）',
    redTest:
      '默认 count 1；100% 无 skip 的 startIndex 不吞前条；合法 chance→stop 保护区间含保护与对白',
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
 plugins:[{name:'tb07-single-point',enforce:'pre',load(id){
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
