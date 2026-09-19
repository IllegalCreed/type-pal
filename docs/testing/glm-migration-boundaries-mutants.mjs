// TEST-MIGRATION-BOUNDARIES-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
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
const logs = mkdtempSync(join(tmpdir(), 'tb10-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  editor: { filter: '@type-pal/migrate', prefix: 'packages/migrate/src' },
}

const TESTS = {
  io: ['src/migration-project-io.boundaries.test.ts'],
  tx: ['src/migration-transaction.boundaries.test.ts'],
  wp: ['src/migration-write-plan.boundaries.test.ts'],
  conv: ['src/project-map-converter.boundaries.test.ts'],
  facts: ['src/source-facts.boundaries.test.ts'],
  overlay: ['src/pal-authored-overlays.boundaries.test.ts'],
  labels: ['src/pal-item-scheme-labels.boundaries.test.ts'],
  store: ['src/pal-store-boundary.boundaries.test.ts'],
}

const cases = [
  { name: 'control-io', pkg: 'editor', group: 'io', file: null, from: '', to: '', expected: 0 },
  { name: 'control-facts', pkg: 'editor', group: 'facts', file: null, from: '', to: '', expected: 0 },
  { name: 'control-store', pkg: 'editor', group: 'store', file: null, from: '', to: '', expected: 0 },
  {
    name: 'io-escape-path-guard-removed',
    pkg: 'editor',
    group: 'io',
    file: 'migration-project-io.ts',
    from: "if (isAbsolute(path) || path.split('/').some((part) => part === '..'))",
    to: 'if (false)',
    red: '越界相对路径不再拒绝（TOCTOU 复核可逃出工程根）',
    redTest: 'loadProjectMigrationSnapshot：越界路径拒绝；managed 集合不别名；snapshot 新增目标检查',
    expected: 1,
  },
  {
    name: 'tx-staged-path-check-removed',
    pkg: 'editor',
    group: 'tx',
    file: 'migration-transaction.ts',
    from: "if (staged !== expectedStaged) throw new Error(`迁移事务 journal staging 路径不符: ${target}`)",
    to: "if (false) throw new Error('unreachable')",
    red: 'staged 路径不再与操作目标配对校验（篡改 staged 可指向别处）',
    redTest: '单轴坏 operations/kind/previousHash/staged/version 拒绝且 journal/目标字节全保留',
    expected: 1,
  },
  {
    name: 'wp-scene-index-boost-dropped',
    pkg: 'editor',
    group: 'wp',
    file: 'migration-write-plan.ts',
    from: "(path === 'content/scenes/index.json' ? 1 : 0)",
    to: '0',
    red: 'SceneIndex 不再提升到 scenes 正文之后提交',
    redTest: '多 write/delete：scene 先于 index、其余 localeCompare、delete 排序、源 plan/baseline 不变',
    expected: 1,
  },
  {
    name: 'conv-row-guard-removed',
    pkg: 'editor',
    group: 'conv',
    file: 'project-map-converter.ts',
    from: "if (source.cells.length !== source.height)",
    to: 'if (false)',
    red: 'tilemap 行缺口不再被拒（错位解码）',
    redTest: '源 shape 单轴：宽缺口/行缺口精确拒绝',
    expected: 1,
  },
  {
    name: 'conv-layer1-9bit-dropped',
    pkg: 'editor',
    group: 'conv',
    file: 'project-map-converter.ts',
    from: 'const encodedLayer1Tile = ((value >>> 16) & 0xff) | ((value >>> 20) & 0x100)',
    to: 'const encodedLayer1Tile = ((value >>> 16) & 0xff)',
    red: '上层第 9 位解码丢失（tile 256..510 全错）',
    redTest: '两行非对称上下子格：四行 matrices 逐格独立、heights 缺省省略、过 validateProjectMap、输入保真',
    expected: 1,
  },
  {
    name: 'facts-name-word-map-shifted',
    pkg: 'editor',
    group: 'facts',
    file: 'source-facts.ts',
    from: "  39: 'anu',\n  40: 'wu-hou',",
    to: "  39: 'wu-hou',\n  40: 'anu',",
    red: '巫后/阿奴名字 WORD 指针对调修正被撤销',
    redTest: '名字 WORD：36..41 命中（含 39=anu/40=wu-hou 指针对调修正），35/42/非整数 undefined',
    expected: 1,
  },
  {
    name: 'overlay-channel-kind-blind',
    pkg: 'editor',
    group: 'overlay',
    file: 'pal-authored-overlays.ts',
    from: "generatedItem.use?.effects.filter((effect) => effect.kind === 'craftRecipe') ?? []",
    to: "generatedItem.use?.effects.filter(() => true) ?? []",
    red: 'craft 同步不再按 kind 过滤（pool message 混入 craft 条）',
    redTest: 'craft+pool 混合：各自函数只同步各自 kind 的 message，互不触碰；多 item 不串引用',
    expected: 1,
  },
  {
    name: 'labels-behaviors-channel-dropped',
    pkg: 'editor',
    group: 'labels',
    file: 'pal-item-scheme-labels.ts',
    from: "JSON.stringify([address.kind, address.sceneId, address.entityId, address.channel, address.id])",
    to: "JSON.stringify([address.kind, address.sceneId, address.entityId, address.id])",
    red: '行为地址漏 channel 维（不同通道同 id 误判同节点）',
    redTest: '两个 item 各指各的 hook（共享底层行为）→ 各自独立成方案、报告合法且输入不变',
    expected: 1,
  },
  {
    name: 'store-store0-count-blind',
    pkg: 'editor',
    group: 'store',
    file: 'pal-store-boundary.ts',
    from: "if (store0.length !== 1)",
    to: 'if (false)',
    red: '源 Store0 数量不再校验（0 个或多个都放行）',
    redTest: '源 Store0 缺失/重复、源 id 顺序漂移、生成货单不一致各自精确拒绝',
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

function pinnedVerdict(failureMessages) {
  if ((failureMessages ?? []).length === 0) return false
  return failureMessages.every((m) => /AssertionError|^expect\(/.test(m))
}
assert.equal(
  pinnedVerdict(['Error: STACK_TRACE_ERROR\n    at task']),
  false,
  'target timeout rejected',
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
  const pkgDir = join(root, 'packages/migrate')
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
 plugins:[{name:'tb10-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{
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
    const pinned = assertions.find(
      (r) => r.title === item.redTest || r.title.endsWith(item.redTest),
    )
    assert.ok(pinned, `${item.name}: pinned not executed: ${item.redTest}; ${log}`)
    assert.equal(pinned.status, 'failed', `${item.name}: pinned did not fail; ${log}`)
    assert.ok((pinned.failureMessages ?? []).length > 0, `${item.name}: no failureMessages; ${log}`)
    for (const message of pinned.failureMessages ?? [])
      assert.match(
        message,
        /AssertionError|^expect\(/,
        `${item.name}: pinned not business AssertionError; ${log}`,
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
