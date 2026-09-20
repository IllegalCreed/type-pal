// TEST-PAL-TABLES-COVERAGE-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 8 针（SSS signed→unsigned、WORD 段界偏一、items 脚本偏移别名、items 装备位基号、
// teams 原身份覆盖、misc level/magic 错位、enemy-pos 转置、MSG 端点坍缩）+ 3 对照；
// 判据含：钉名目标 failureMessages 非空且每条首行匹配 AssertionError/^expect(；
// STACK_TRACE_ERROR/TypeError/超时/未处理异常 全局排除；永久四向自测。
// 运行：node docs/testing/glm-pal-tables-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'tb04-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  sss: ['src/io/sss.boundaries.test.ts'],
  word: ['src/io/word.boundaries.test.ts'],
  msg: ['src/io/msg.boundaries.test.ts'],
  items: ['src/resources/parsers/__tests__/items.boundaries.test.ts'],
  teams: ['src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts'],
  misc: ['src/resources/parsers/__tests__/data-misc.boundaries.test.ts'],
  pos: ['src/resources/enemy-pos.boundaries.test.ts'],
  stores: ['src/resources/parsers/__tests__/stores.boundaries.test.ts'],
  fields: ['src/resources/parsers/__tests__/battle-fields.boundaries.test.ts'],
}

const cases = [
  { name: 'control-sss', group: 'sss', file: null, from: '', to: '', expected: 0 },
  { name: 'control-stores', group: 'stores', file: null, from: '', to: '', expected: 0 },
  { name: 'control-fields', group: 'fields', file: null, from: '', to: '', expected: 0 },
  {
    name: 'sss-signed-to-unsigned',
    group: 'sss',
    file: 'io/sss.ts',
    from: 'vanishTime: readI16(view, base + 0),',
    to: 'vanishTime: readU16(view, base + 0),',
    red: 'sVanishTime 被当 unsigned 读（0x8000 → 32768）',
    redTest: '非对称 16 字段 EO 逐字段精确；signed（vanishTime/layer/state）与 unsigned 高位分开',
    expected: 1,
  },
  {
    name: 'word-items-offset-shift',
    group: 'word',
    file: 'io/word.ts',
    from: 'const ITEMS_OFFSET = 61',
    to: 'const ITEMS_OFFSET = 62',
    red: '物品段起点偏一位（段界错位）',
    redTest:
      'persons36..41 / battleUi42..60 / items61..295 / spells296..397 / enemies398..550 / scenes551..564 / system0..35 段界精确',
    expected: 1,
  },
  {
    name: 'items-script-offset-alias',
    group: 'items',
    file: 'resources/parsers/items.ts',
    from: 'scriptOnEquip: u16(view, base, ITEM_OFF.scriptOnEquip),',
    to: 'scriptOnEquip: u16(view, base, ITEM_OFF.scriptOnThrow),',
    red: 'scriptOnEquip 读 scriptOnThrow 偏移（字段别名）',
    redTest: '296×14B 表：234 条（61..294）逐条七 WORD 精确，梦蛇 295 排除且邻位完整',
    expected: 1,
  },
  {
    name: 'items-equip-role-bit-shift',
    group: 'items',
    file: 'resources/parsers/items.ts',
    from: 'const ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT = 6',
    to: 'const ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT = 5',
    red: '装备位基号偏一位（读到基础 flag 位）',
    redTest: '六基础 flag 一热 + 六装备位一热（同 role 号），295 不在断言域',
    expected: 1,
  },
  {
    name: 'teams-raw-identity-overwritten',
    group: 'teams',
    file: 'resources/parsers/enemy-teams.ts',
    from: '...(objectIndexToEnemyId ? { enemyObjectIndexes: rawSlots } : {}),',
    to: '...(objectIndexToEnemyId ? { enemyObjectIndexes: enemies } : {}),',
    red: 'enemyObjectIndexes 被译文覆盖（原始 OBJECT 身份丢失）',
    redTest:
      '两 OBJECT 映同 enemyId：enemies 各自翻译、enemyObjectIndexes 保 raw、0/0xFFFF 不压缩、_names 按 OBJECT 反查',
    expected: 1,
  },
  {
    name: 'misc-level-magic-swap',
    group: 'misc',
    file: 'resources/parsers/data-misc.ts',
    from: 'const level = view.getUint16(off, true) // wLevel',
    to: 'const level = view.getUint16(off + 2, true) // wLevel',
    red: 'wLevel 读到 wMagic 偏移（level/magic 错位）',
    redTest: '学习表 20×5：level=e*5+r+1 / magic=e*7+r+2（entry 与 role 双向非对称，转置即红）',
    expected: 1,
  },
  {
    name: 'enemypos-transpose',
    group: 'pos',
    file: 'resources/enemy-pos.ts',
    from: 'const off = (enemyIdx * MAX_ENEMIES_IN_TEAM + maxIdx) * PALPOS_BYTES',
    to: 'const off = (maxIdx * MAX_ENEMIES_IN_TEAM + enemyIdx) * PALPOS_BYTES',
    red: 'C 布局两维转置（pos[maxIdx][enemyIdx]）',
    redTest:
      'layouts[count-1][enemyIdx] 逐坐标精确；长度 1..5；C 布局 (enemyIdx*5+maxIdx) 转置即红',
    expected: 1,
  },
  {
    name: 'msg-end-offset-collapse',
    group: 'msg',
    file: 'io/msg.ts',
    from: 'const end = offsets[i + 1]!',
    to: 'const end = offsets[i]!',
    red: '消息终点坍缩到起点（所有消息为空）',
    redTest: '四条精确（含空条）；末 offset 只作下界不产消息；GBK 双字节轴',
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
    cases.flatMap((c) => (c.file ? [join(root, 'packages/pal-extract/src', c.file)] : [])),
  ),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/pal-extract/src', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages/pal-extract'))},
 plugins:[{name:'tb04-single-point',enforce:'pre',load(id){
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
    '@type-pal/pal-extract',
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
