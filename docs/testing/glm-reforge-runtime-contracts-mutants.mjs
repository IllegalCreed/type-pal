// TEST-REFORGE-RUNTIME-CONTRACTS-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 每组 2 针 + 每组 1 个未变异正控，共 15 次执行；变异针必须实际执行且本包
// 新增业务断言以 AssertionError 变红（模块加载打印/TypeError/超时/未处理异常不算）。
// 运行态执行见证：每次跑 --reporter=json，钉死本组新增测试的精确标题必须 failed。
// 判据自测：启动时 AST 抽取本文件唯一的 `if (item.expected === 1)` 判据块，
// 用纯业务红日志（必须通过）与混合宿主故障日志（必须被拒绝）做正反控。
// 运行：node docs/testing/glm-reforge-runtime-contracts-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'rr1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  A: ['src/input.keyboard-boundaries.test.ts', 'src/menu-state.navigation-boundaries.test.ts'],
  B: [
    'src/equip-menu-state.navigation-boundaries.test.ts',
    'src/use-menu-state.navigation-boundaries.test.ts',
  ],
  C: [
    'src/audio/bgm.runtime-boundaries.test.ts',
    'src/audio/midi-preview.lifecycle-boundaries.test.ts',
  ],
  D: ['src/project-loader.current-boundaries.test.ts', 'src/asset-resolver.io-boundaries.test.ts'],
  E: [
    'src/cutscene-controller.dispatch-boundaries.test.ts',
    'src/script-host-adapter.current-dispatch.test.ts',
  ],
}

const cases = [
  { name: 'control-A', pkg: 'reforge', group: 'A', file: null, from: '', to: '', expected: 0 },
  { name: 'control-B', pkg: 'reforge', group: 'B', file: null, from: '', to: '', expected: 0 },
  { name: 'control-C', pkg: 'reforge', group: 'C', file: null, from: '', to: '', expected: 0 },
  { name: 'control-D', pkg: 'reforge', group: 'D', file: null, from: '', to: '', expected: 0 },
  { name: 'control-E', pkg: 'reforge', group: 'E', file: null, from: '', to: '', expected: 0 },
  {
    // A负控1：repeat 守卫失效 → OS 连发重排 held/重复边沿 → A1/A2 repeat 断言红
    name: 'input-repeat-guard-removed',
    pkg: 'reforge',
    group: 'A',
    file: 'input.ts',
    from: 'if (!e.repeat) {',
    to: 'if (true) {',
    red: 'input repeat 事件重排 held 且重复产生边沿',
    redTest: '交错方向键取最后首次按下；repeat 不把旧键顶回；释放后回退剩余键',
    expected: 1,
  },
  {
    // A负控2：openMenu 越界归 0 失效 → A4 越界记忆断言红
    name: 'menu-cursor-clamp-removed',
    pkg: 'reforge',
    group: 'A',
    file: 'menu-state.ts',
    from: 'const cursor = defaultCursor >= 0 && defaultCursor < MAIN_MENU.length ? defaultCursor : 0',
    to: 'const cursor = defaultCursor',
    red: 'menu-state 记忆光标越界未归 0',
    redTest: '非零记忆重开定位该项；合法末项保持；越界（正/负）归 0',
    expected: 1,
  },
  {
    // B负控1：装备列表上界钳制失效 → B1 末行吸附断言红
    name: 'equip-clamp-removed',
    pkg: 'reforge',
    group: 'B',
    file: 'equip-menu-state.ts',
    from: 'return { ...s, cursor: next < 0 ? 0 : next >= n ? n - 1 : next }',
    to: 'return { ...s, cursor: next < 0 ? 0 : next }',
    red: 'equip-menu 光标下界保留上界钳制丢失（越界可越过末项）',
    redTest: '4 项/3 列：末行不满；↑↓±3、←→±1，越界吸附首/尾不环绕',
    expected: 1,
  },
  {
    // B负控2：use 重开钳位失效 → B4/B5 越界 clamp 断言红
    name: 'use-open-clamp-removed',
    pkg: 'reforge',
    group: 'B',
    file: 'use-menu-state.ts',
    from: 'const cursor = list.length === 0 ? 0 : Math.min(Math.max(0, initialCursor), list.length - 1)',
    to: 'const cursor = initialCursor',
    red: 'use-menu 重开/归并光标不再钳到列表界内',
    redTest: 'initialCursor 记忆恢复并 clamp 到末项；空列表 cursor 0',
    expected: 1,
  },
  {
    // C负控1：resume 并发去重失效 → C1 唯一 ctx.resume 断言红
    name: 'bgm-resume-dedup-removed',
    pkg: 'reforge',
    group: 'C',
    file: 'audio/bgm.ts',
    from: "if (resuming || ctx.state !== 'suspended') return",
    to: "if (ctx.state !== 'suspended') return",
    red: 'bgm 并发 resume 不再去重（重复触发 ctx.resume）',
    redTest: '挂起期间并发 resume 只触发一次 ctx.resume；被拒后清旗标，后续手势可再次调用',
    expected: 1,
  },
  {
    // C负控2：load 迟到旧读拒收门失效 → C4 AbortError 断言红
    name: 'midi-load-stale-gate-removed',
    pkg: 'reforge',
    group: 'C',
    file: 'audio/midi-preview.ts',
    from: "if (disposed || request !== serial || asset !== nextAsset)\n          throw new DOMException('MIDI 选择已变化', 'AbortError')",
    to: '/* stale gate removed */',
    red: 'midi-preview 迟到的旧选择不再被拒收（错误提交旧字节）',
    redTest: '旧选择迟到被拒（AbortError），transport 仍是新选择；不清新请求的成果',
    expected: 1,
  },
  {
    // D负控1：批读顺序反转 → D1/D2 顺序断言红
    name: 'loader-batch-order-reversed',
    pkg: 'reforge',
    group: 'D',
    file: 'project-loader.ts',
    from: 'for (const id of project.sceneIds) scenes.push(await loadAuthorScene(project, id))',
    to: 'for (const id of [...project.sceneIds].reverse()) scenes.push(await loadAuthorScene(project, id))',
    red: 'loadAllAuthorScenes 返回顺序不再跟随 sceneIds',
    redTest: '返回顺序 = sceneIds 顺序（与文件表写入顺序无关）',
    expected: 1,
  },
  {
    // D负控2：resolver kind 门失效 → D6 kind 门断言红
    name: 'resolver-kind-gate-removed',
    pkg: 'reforge',
    group: 'D',
    file: 'asset-resolver.ts',
    from: 'if (expectedKind && record.kind !== expectedKind)',
    to: 'if (false)',
    red: 'AssetResolver 显式 asset 入口不再按期望 kind 拒绝',
    redTest: '显式 asset 入口 kind 门：错 kind 报实际 kind 与 path',
    expected: 1,
  },
  {
    // E负控1：fade 缺省时长改 0 → E3 缺省 300 断言红
    name: 'cutscene-fade-default-zeroed',
    pkg: 'reforge',
    group: 'E',
    file: 'cutscene-controller.ts',
    from: 'return this.exec.fade(intent.dir, intent.ms ?? 300, intent.color, signal)',
    to: 'return this.exec.fade(intent.dir, intent.ms ?? 0, intent.color, signal)',
    red: 'cutscene fade 缺省时长丢失（300→0）',
    redTest: 'frameAnimation startFrame:0 显式保留；fade ms 缺省 300 / 显式 0 保留',
    expected: 1,
  },
  {
    // E负控2：giveItem count 缺省改 2 → E4 count 默认 1 断言红
    name: 'adapter-giveitem-default-changed',
    pkg: 'reforge',
    group: 'E',
    file: 'script-host-adapter.ts',
    from: 'await host.giveItem(command.itemId, command.count ?? 1, signal)',
    to: 'await host.giveItem(command.itemId, command.count ?? 2, signal)',
    red: 'script-host giveItem count 缺省值漂移（1→2）',
    redTest: 'dialog/clear/wait + give/lose/playSound/music/ambience 全参数与 count 默认 1',
    expected: 1,
  },
]

// ── 判据自测（正反控）──────────────────────────────────────────────
// 与接收纪律同法：AST 抽取本文件唯一的 `if (item.expected === 1)` 判据块，
// 纯业务红日志必须通过、混合宿主故障日志（TypeError/超时/未处理异常混入）必须被拒绝。
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
    'MUTATION_HIT selftest-poisoned\nAssertionError: unrelated assertion\nTypeError: host fault\nTest timed out\nUnhandled Errors',
  )
} catch {
  selfPoisonedRejected = true
}
assert.ok(selfPoisonedRejected, 'criterion self-test: mixed host-failure log must be rejected')
process.stderr.write(
  `criterion self-test: good log accepted, poisoned log rejected (blocks=${criterionBlocks.length})\n`,
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
      `${item.name}: exactly one replacement point required`,
    )
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation=${JSON.stringify(mutation)};
export default {
 root:${JSON.stringify(join(root, 'packages', item.pkg))},
 plugins:[{name:'rr1-single-point',enforce:'pre',load(id){
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
  // 运行态执行见证：JSON 报告给出真实执行的测试与其状态，failureMessages
  // 一并并入判据文本（json reporter 下 AssertionError 只出现在 failureMessages）。
  const report = JSON.parse(readFileSync(jsonReport, 'utf8'))
  const assertions = report.testResults.flatMap((result) => result.assertionResults)
  const failureText = assertions.flatMap((result) => result.failureMessages ?? []).join('\n')
  const output = `${rawOutput}\n${failureText}`
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: process interruption; ${log}`)
  assert.ok(report.numTotalTests > 0, `${item.name}: zero tests executed; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: unexpected exit; ${log}`)
  if (item.expected === 1) {
    // 判据块：必须自包含（仅 assert/item/output 自由变量）——判据自测与接收复核
    // 工具都会把这整块抽出来直接执行，块内不得引用循环局部变量。
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: mutation was not loaded`)
    assert.match(
      output,
      /AssertionError/,
      `${item.name}: expected business regression, not host failure`,
    )
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors/,
      `${item.name}: host failure mixed into business red`,
    )
  }
  if (item.redTest !== undefined) {
    // 运行态执行见证（判据块之外）：钉死本组新增测试的精确标题必须实际 failed。
    const pinned = assertions.find((result) => result.title === item.redTest)
    assert.ok(pinned, `${item.name}: pinned red test not executed: ${item.redTest}; ${log}`)
    assert.equal(
      pinned.status,
      'failed',
      `${item.name}: pinned red test did not fail: ${item.redTest}; ${log}`,
    )
  } else {
    assert.ok(
      assertions.every((result) => result.status === 'passed'),
      `${item.name}: control run has non-passing tests; ${log}`,
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
    from: item.from,
    to: item.to,
    file: mutation.file,
  })
  process.stderr.write(
    `${item.name}: expected ${item.expected}, actual ${run.status}, tests ${report.numTotalTests}\n`,
  )
}
for (const [file, hash] of Object.entries(sourceHashes))
  assert.equal(sha(readFileSync(file)), hash, `product changed during verification: ${file}`)
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
