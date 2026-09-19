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
