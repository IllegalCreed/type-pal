// TEST-RUNTIME-STATE-BOUNDARIES-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 16 针（六组各 ≥2）+ 每包 1 正控共 18 次执行；变异针必须实际执行且本包新增
// 业务断言以 AssertionError 变红。运行态执行见证：--reporter=json 钉名新增测试
// 精确标题必须 failed。判据自测：AST 抽取唯一的 `if (item.expected === 1)` 块，
// 纯业务红日志必须通过、混合宿主故障日志必须被拒绝。
// 运行：node docs/testing/glm-runtime-state-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'sb1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  A: ['src/world-variable.boundaries.test.ts', 'src/migration-diagnostic.boundaries.test.ts'],
  B: [
    'src/runtime-script-compiler.boundaries.test.ts',
    'src/runtime-project-view.boundaries.test.ts',
  ],
  C: ['src/entity-action-player.boundaries.test.ts'],
  D: ['src/frame-animation-player.boundaries.test.ts'],
  E: ['src/magic-menu-state.boundaries.test.ts', 'src/system-menu-state.boundaries.test.ts'],
  F: [
    'src/scene-entry-session.boundaries.test.ts',
    'src/screen-hold-transaction.boundaries.test.ts',
    'src/menu/reward-gain-queue.boundaries.test.ts',
  ],
}

const cases = [
  { name: 'control-A', pkg: 'content', group: 'A', file: null, from: '', to: '', expected: 0 },
  { name: 'control-B', pkg: 'reforge', group: 'B', file: null, from: '', to: '', expected: 0 },
  { name: 'control-C', pkg: 'reforge', group: 'C', file: null, from: '', to: '', expected: 0 },
  { name: 'control-D', pkg: 'reforge', group: 'D', file: null, from: '', to: '', expected: 0 },
  { name: 'control-E', pkg: 'reforge', group: 'E', file: null, from: '', to: '', expected: 0 },
  { name: 'control-F', pkg: 'reforge', group: 'F', file: null, from: '', to: '', expected: 0 },
  {
    name: 'wv-id-sys-ns',
    pkg: 'content',
    group: 'A',
    file: 'world-variable.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: "if (value.startsWith('sys:')) throw new Error(`${path}: sys: 命名空间保留给引擎`)",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    to: 'if (false) throw new Error(`${path}: sys: 命名空间保留给引擎`)',
    red: 'sys 前缀 ID 不再被保留域拒绝',
    redTest: '空 description 合法、空 name 非法；sys: 只约束 ID 不约束 name/description',
    expected: 1,
  },
  {
    name: 'wv-number-finite',
    pkg: 'content',
    group: 'A',
    file: 'world-variable.ts',
    from: "if (typeof definition.initial !== 'number' || !Number.isFinite(definition.initial))",
    to: 'if (false)',
    red: 'number initial 非有限值不再拒绝',
    redTest: 'registry/definition 错型、kind 错型、flag 非布尔、number 非有限各自精确路径',
    expected: 1,
  },
  {
    name: 'diag-severity-gate',
    pkg: 'content',
    group: 'A',
    file: 'migration-diagnostic.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: "if (diagnostic.severity !== 'warn') throw new Error(`${at}.severity: 期望 warn`)",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    to: 'if (false) throw new Error(`${at}.severity: 期望 warn`)',
    red: 'severity 非 warn 不再拒绝',
    redTest: '合法基线先证明可过守卫，再按轴改坏 root/version/diagnostics 容器',
    expected: 1,
  },
  {
    name: 'diag-address-gate',
    pkg: 'content',
    group: 'A',
    file: 'migration-diagnostic.ts',
    from: 'if (!Number.isInteger(source.address) || (source.address as number) < 0)',
    to: 'if (false)',
    red: 'address 负数/小数不再拒绝',
    redTest: 'target domain/objectId/label 与 source kind/label/address 各自精确路径',
    expected: 1,
  },
  {
    name: 'resolver-cache-key-collapse',
    pkg: 'reforge',
    group: 'B',
    file: 'runtime-script-compiler.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: 'const key = `${timing}\\u0000${boundaryPolicy}\\u0000${id}`',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    to: 'const key = `${id}`',
    red: 'timing×boundary 缓存键塌缩为 id',
    redTest: 'auto/interactive × perCommand/transition 四键互不复用；元数据与产物逐项精确',
    expected: 1,
  },
  {
    name: 'view-entry-cursor-lost',
    pkg: 'reforge',
    group: 'B',
    file: 'runtime-project-view.ts',
    from: 'return flow.stages.find((stage) => stage.id === cursor.stage)?.entry',
    to: 'return undefined',
    red: 'stages 游标 entry 选择丢失',
    redTest: 'stages 游标命中对应 stage 的 entry；stateMachine 游标命中对应 state；正文一律空',
    expected: 1,
  },
  {
    name: 'scratch-flags-alias',
    pkg: 'reforge',
    group: 'B',
    file: 'runtime-project-view.ts',
    from: 'flags: structuredClone(world.flags),',
    to: 'flags: world.flags,',
    red: 'scratch flags 不再深拷贝（别名写回）',
    redTest: 'scratch 可选分支缺席与在场：flags/vars/entityState 深拷贝不别名',
    expected: 1,
  },
  {
    name: 'action-frame-gate-removed',
    pkg: 'reforge',
    group: 'C',
    file: 'entity-action-player.ts',
    from: 'if (!Number.isInteger(step.frame) || step.frame < 0 || step.frame >= actualFrameCount)',
    to: 'if (false)',
    red: '实际帧数门失效',
    redTest: '精灵不匹配/动作缺失/空 steps/非正时长/loopFrom 越界/实际帧数门各自精确拒绝',
    expected: 1,
  },
  {
    name: 'action-dt-gate-removed',
    pkg: 'reforge',
    group: 'C',
    file: 'entity-action-player.ts',
    from: "if (!Number.isFinite(dtMs) || dtMs < 0) throw new Error('sprite action: dtMs 必须为非负有限数')",
    to: "if (false) throw new Error('sprite action: dtMs 必须为非负有限数')",
    red: '非法 dt 不再拒绝',
    redTest: '精确边界/半步 startAtMs 的帧号；dt=0 no-op；非法 dt 拒绝',
    expected: 1,
  },
  {
    name: 'reader-limit-gate-removed',
    pkg: 'reforge',
    group: 'D',
    file: 'frame-animation-player.ts',
    from: 'if (!Number.isInteger(frameLimit) || frameLimit <= 0)',
    to: 'if (false)',
    red: 'frameLimit 非法值不再拒绝',
    redTest: 'frameLimit 非正/非整数拒绝；帧索引负/非整数/上界拒绝；0/末帧正控',
    expected: 1,
  },
  {
    name: 'reader-lru-evict-removed',
    pkg: 'reforge',
    group: 'D',
    file: 'frame-animation-player.ts',
    from: 'while (this.#frames.size > this.frameLimit) {',
    to: 'while (false) {',
    red: 'LRU 淘汰失效（缓存超限）',
    redTest: '命中刷新触点：最近命中者存活、被淘汰者重解码；解码计数精确',
    expected: 1,
  },
  {
    name: 'magic-mp-gate-removed',
    pkg: 'reforge',
    group: 'E',
    file: 'magic-menu-state.ts',
    from: 'if (caster.mp < (skill.cost.mp ?? 0)) return null',
    to: 'if (false) return null',
    red: 'MP 门失效',
    redTest:
      'castAll 完整返回选中技能；toTarget 后 targetIdx 重置；MP 恰好足够通过、不足 null；各分支实际 world 快照不变',
    expected: 1,
  },
  {
    name: 'system-wrap-removed',
    pkg: 'reforge',
    group: 'E',
    file: 'system-menu-state.ts',
    from: 'return { ...s, cursor: (s.cursor + delta + n) % n }',
    to: 'return { ...s, cursor: s.cursor + delta }',
    red: '单列环绕丢失（越界溢出）',
    redTest: 'left/up 同为 -1、right/down 同为 +1；首尾环绕',
    expected: 1,
  },
  {
    name: 'entry-reveal-match-removed',
    pkg: 'reforge',
    group: 'F',
    file: 'scene-entry-session.ts',
    from: 'if (!sameReveal(active.reveal, reveal))',
    to: 'if (false && sameReveal(active.reveal, reveal))',
    red: 'reveal 契约失配不再拒绝',
    redTest: 'fade out/in 与 dither ms/kind 分别失配即拒；cut 正控；错误后当前 session 保持',
    expected: 1,
  },
  {
    name: 'hold-token-match-removed',
    pkg: 'reforge',
    group: 'F',
    file: 'screen-hold-transaction.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    from: 'if (!active || active.token !== token) throw new Error(`黑屏恢复 token 不匹配: ${token}`)',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: 逐字生产源文本
    to: 'if (!active) throw new Error(`黑屏恢复 token 不匹配: ${token}`)',
    red: '跨 token reveal 不再拒绝',
    redTest: '旧 owner 取消不影响新事务；当前 owner 能清；空 token 拒绝保留活动态',
    expected: 1,
  },
  {
    name: 'reward-double-present-removed',
    pkg: 'reforge',
    group: 'F',
    file: 'menu/reward-gain-queue.ts',
    from: "if (this.request) throw new Error('reward-gain 已有活动序列')",
    to: "if (false) throw new Error('reward-gain 已有活动序列')",
    red: '活动期间二次 present 不再拒绝',
    redTest: '活动序列期间二次 present 拒绝；首序列仍可完成（advance 驱动，不用时钟）',
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
assert.equal(criterionBlocks.length, 1, 'criterion self-test: exactly one verdict block expected')
new Function('assert', 'item', 'output', criterionBlocks[0])(
  assert,
  { name: 'selftest-good' },
  'MUTATION_HIT selftest-good\nAssertionError: expected 1 to equal 2',
)
let selfPoisonedRejected = false
try {
  new Function('assert', 'item', 'output', criterionBlocks[0])(
    assert,
    { name: 'selftest-poisoned' },
    'MUTATION_HIT selftest-poisoned\nAssertionError: unrelated\nTypeError: host fault\nTest timed out\nUnhandled Errors',
  )
} catch {
  selfPoisonedRejected = true
}
assert.ok(selfPoisonedRejected, 'criterion self-test: mixed host-failure log must be rejected')
process.stderr.write(
  `criterion self-test: good accepted, poisoned rejected (blocks=${criterionBlocks.length})\n`,
)

const files = [
  ...new Set(
    cases.flatMap((item) =>
      item.file ? [join(root, 'packages', item.pkg, 'src', item.file)] : [],
    ),
  ),
]
const sourceHashes = Object.fromEntries(files.map((file) => [file, sha(readFileSync(file))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages', item.pkg, 'src', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages', item.pkg))},
 plugins:[{name:'sb1-single-point',enforce:'pre',load(id){
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
    `@type-pal/${item.pkg}`,
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
  const rawOutput = (run.stdout ?? '') + (run.stderr ?? '')
  const report = JSON.parse(readFileSync(jsonReport, 'utf8'))
  const assertions = report.testResults.flatMap((result) => result.assertionResults)
  const failureText = assertions.flatMap((result) => result.failureMessages ?? []).join('\n')
  const output = `${rawOutput}\n${failureText}`
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: interruption; ${log}`)
  assert.ok(report.numTotalTests > 0, `${item.name}: zero tests; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: unexpected exit; ${log}`)
  if (item.expected === 1) {
    // 判据块（自包含）：仅 assert/item/output 自由变量
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: business regression expected`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors/,
      `${item.name}: host failure mixed`,
    )
  }
  if (item.redTest !== undefined) {
    const pinned = assertions.find((result) => result.title === item.redTest)
    assert.ok(pinned, `${item.name}: pinned red test not executed: ${item.redTest}; ${log}`)
    assert.equal(pinned.status, 'failed', `${item.name}: pinned red test did not fail; ${log}`)
  } else {
    assert.ok(
      assertions.every((result) => result.status === 'passed'),
      `${item.name}: control non-passing; ${log}`,
    )
  }
  results.push({
    name: item.name,
    group: item.group,
    pkg: item.pkg,
    command: ['pnpm', ...command],
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
for (const [file, hash] of Object.entries(sourceHashes))
  assert.equal(sha(readFileSync(file)), hash, `product changed: ${file}`)
console.log(
  JSON.stringify(
    {
      logs,
      criterionSelfTest: { goodAccepted: true, poisonedRejected: selfPoisonedRejected },
      sourceHashes,
      results,
    },
    null,
    2,
  ),
)
