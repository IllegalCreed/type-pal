// TEST-CONTENT-RESIDUAL-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 5 文件 × 1 正控 + 13 变异针（每个族 ≥1）；每针钉名新增测试 failed 的 JSON 执行见证。
// 判据自测：AST 抽取唯一 `if (item.expected === 1)` 块做 good/毒日志正反控。
// 运行：node docs/testing/glm-content-residual-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'cr1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = [
  'src/asset.residual.test.ts',
  'src/author-dialogue.field-guards.test.ts',
  'src/frame-sequence.residual.test.ts',
  'src/map-index.residual.test.ts',
  'src/validate-refs.data-refs.test.ts',
]

const cases = [
  { name: 'control', pkg: 'content', file: null, from: '', to: '', expected: 0 },
  {
    name: 'asset-unbound-arm-removed',
    file: 'asset.ts',
    from: "identityRecord.kind === 'unbound' &&",
    to: "identityRecord.kind === 'never-unbound' &&",
    red: 'unbound 直连肖像臂失配（不产出边）',
    redTest: '合法 unbound cue → 精确 AssetId 肖像引用（where/kind 完整）',
    expected: 1,
  },
  {
    name: 'asset-pal-sprite-min-flattened',
    file: 'asset.ts',
    from: "const minimum = channel === 'player' ? 0 : 1",
    to: 'const minimum = 0',
    red: 'enemy 最小 1 门塌缩为 0',
    redTest: 'player 0 合法/enemy 最小 1；正数与三位零填充格式；越界与错型精确拒绝',
    expected: 1,
  },
  {
    name: 'dialogue-rows-empty-allowed',
    file: 'author-dialogue.ts',
    from: 'if (!Array.isArray(cue.rows) || cue.rows.length === 0)',
    to: 'if (!Array.isArray(cue.rows))',
    red: '空 rows 不再拒绝',
    redTest: '空数组拒绝；元素缺 text/非对象拒绝；多行合法',
    expected: 1,
  },
  {
    name: 'dialogue-speed-guard-removed',
    file: 'author-dialogue.ts',
    from: "(typeof row.speed !== 'number' || !Number.isFinite(row.speed) || row.speed < 0)",
    to: '(false)',
    red: 'speed 非法值不再拒绝',
    redTest: 'speed 非法值拒绝（负/NaN/非有限）；0 与非整数正数合法',
    expected: 1,
  },
  {
    name: 'dialogue-advance-guard-removed',
    file: 'author-dialogue.ts',
    from: "typeof cue.autoAdvance !== 'number' ||\n      !Number.isFinite(cue.autoAdvance) ||\n      cue.autoAdvance < 0",
    to: "cue.autoAdvance === '__never__'",
    red: 'autoAdvance 非法值不再拒绝（整个守卫塌缩）',
    redTest: 'autoAdvance 非法值拒绝；0 与非整数非负有限数合法；输入不变',
    expected: 1,
  },
  {
    name: 'dialogue-slot-guard-removed',
    file: 'author-dialogue.ts',
    from: "cue.slot !== 'top' &&",
    to: '(false) &&',
    red: '非法 slot 不再拒绝',
    redTest: '非法 slot 拒绝；四个合法值逐一通过',
    expected: 1,
  },
  {
    name: 'dialogue-cursor-guard-removed',
    file: 'author-dialogue.ts',
    from: 'cue.cursorFrame !== undefined &&',
    to: '(false) &&',
    red: '非法 cursorFrame 不再拒绝',
    redTest: '非法 cursorFrame 拒绝（超 0..2/非整数）；0/1/2 合法',
    expected: 1,
  },
  {
    name: 'map-version-gate-removed',
    file: 'map-index.ts',
    from: 'if (value.version !== 1)',
    to: 'if (false)',
    red: 'version 非 1 不再拒绝',
    redTest: 'version 非 1 拒绝',
    expected: 1,
  },
  {
    name: 'map-name-gate-removed',
    file: 'map-index.ts',
    from: "if (typeof raw.name !== 'string' || !raw.name.trim())",
    to: "if (typeof raw.name !== 'string')",
    red: '空白 name 不再拒绝',
    redTest: 'name 纯空白 拒绝',
    expected: 1,
  },
  {
    name: 'refs-world-bsprite-gate-removed',
    file: 'validate-refs.ts',
    from: 'if (battleSprite)\n          references.push({',
    to: 'if (false)\n          references.push({',
    red: 'world appearance.battleSprite 悬空不再报',
    redTest: '队员 appearance.battleSprite 悬空 → 精确 error；补回后零 issue（完整往返）',
    expected: 1,
  },
  {
    name: 'refs-shop-item-gate-removed',
    file: 'validate-refs.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: 'message: `商店物品 "${itemId}" 不在 items`,',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    to: 'message: `商店物品 "${itemId}" 不在 items（跳过）`,',
    red: '商店货单悬空物品消息被改写（精确多重集合失配）',
    redTest: '货单引用悬空物品 → 精确 error；正控合法货单零 issue',
    expected: 1,
  },
  {
    name: 'refs-levelup-owner-gate-removed',
    file: 'validate-refs.ts',
    from: "if (!actorIds.has(cid))\n      issues.push({\n        severity: ACTOR_REFERENCE_POLICIES['level-up-owner'].danglingSeverity,",
    to: "if (!actorIds.has(cid) && cid === '__never__')\n      issues.push({\n        severity: ACTOR_REFERENCE_POLICIES['level-up-owner'].danglingSeverity,",
    red: 'levelUp 属主悬空 warn 不再报',
    redTest:
      'levelUp 键角色不在 actors → warn（companion 降级政策）；空 levelUp 缺席语义不产生 issue',
    expected: 1,
  },
  {
    name: 'tpfs-utf8-lead-gate-removed',
    file: 'frame-sequence.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: '} else throw new Error(`${path}: 非法 UTF-8 起始字节`)',
    to: '} else code = first; length = 1; minimum = 0',
    red: '非法 UTF-8 起始字节不再拒绝',
    redTest: '非法起始字节 / 截断序列 / 非法延续字节 / 非法码点各自精确路径',
    expected: 1,
  },
  {
    name: 'tpfs-json-wrap-removed',
    file: 'frame-sequence.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: '`TPFS.index: 非法 JSON: ${error instanceof Error ? error.message : String(error)}`',
    to: "'JSON-ok'",
    red: '非法 JSON 包装错误丢失',
    redTest: '合法 UTF-8 的非法 JSON → 非法 JSON 包装错误',
    expected: 1,
  },
]

// ── 判据自测（正反控）──────────────────────────────────────────────
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
    'MUTATION_HIT x\nAssertionError: y\nTypeError: host\nTest timed out\nUnhandled Errors',
  )
} catch {
  poisoned = true
}
assert.ok(poisoned, 'poisoned log must be rejected')
process.stderr.write(`criterion self-test ok (blocks=${criterionBlocks.length})\n`)

const files = [
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, 'packages/content/src', c.file)] : []))),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/content/src', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages/content'))},
 plugins:[{name:'cr1-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{include:${JSON.stringify(TESTS)},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const jsonReport = join(logs, `${item.name}.json`)
  const command = [
    '--filter',
    '@type-pal/content',
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
    // 判据块（自包含）
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: business red expected`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors/,
      `${item.name}: host failure`,
    )
  }
  if (item.redTest !== undefined) {
    const pinned = assertions.find(
      (r) => r.title === item.redTest || r.title.endsWith(item.redTest),
    )
    assert.ok(pinned, `${item.name}: pinned not executed: ${item.redTest}; ${log}`)
    assert.equal(pinned.status, 'failed', `${item.name}: pinned did not fail; ${log}`)
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
      criterionSelfTest: { goodAccepted: true, poisonedRejected: poisoned },
      sourceHashes: hashes,
      results,
    },
    null,
    2,
  ),
)
