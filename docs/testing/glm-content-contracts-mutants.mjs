// TEST-CONTENT-CONTRACTS-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 每组 2 针 + 每组 1 个未变异正控，共 18 次执行；变异针必须实际执行且本包
// 新增业务断言以 AssertionError 变红（模块加载打印/TypeError/超时/未处理异常不算）。
// 运行态执行见证：每次跑 --reporter=json，钉死本组新增测试的精确标题必须 failed。
// 判据自测：启动时 AST 抽取本文件唯一的 `if (item.expected === 1)` 判据块，
// 用纯业务红日志（必须通过）与混合宿主故障日志（必须被拒绝）做正反控。
// 运行：node docs/testing/glm-content-contracts-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'cc1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  A: ['src/asset-catalog.contracts.test.ts', 'src/asset-closure.contracts.test.ts'],
  B: [
    'src/project-map.contracts.test.ts',
    'src/map-index.contracts.test.ts',
    'src/tileset-stamp.contracts.test.ts',
  ],
  C: ['src/frame-sequence.contracts.test.ts'],
  D: [
    'src/sprite-frame-demand.contracts.test.ts',
    'src/battle-sprite-profile.contracts.test.ts',
    'src/enemy-team.contracts.test.ts',
  ],
  E: [
    'src/author-dialogue.contracts.test.ts',
    'src/actor-reference.contracts.test.ts',
    'src/command-target-reference.contracts.test.ts',
  ],
  F: ['src/validate-refs.contracts.test.ts'],
}

const cases = [
  { name: 'control-A', pkg: 'content', group: 'A', file: null, from: '', to: '', expected: 0 },
  { name: 'control-B', pkg: 'content', group: 'B', file: null, from: '', to: '', expected: 0 },
  { name: 'control-C', pkg: 'content', group: 'C', file: null, from: '', to: '', expected: 0 },
  { name: 'control-D', pkg: 'content', group: 'D', file: null, from: '', to: '', expected: 0 },
  { name: 'control-E', pkg: 'content', group: 'E', file: null, from: '', to: '', expected: 0 },
  { name: 'control-F', pkg: 'content', group: 'F', file: null, from: '', to: '', expected: 0 },
  {
    // A负控1：相对路径空段/../.. 门失效 → 路径 fail-loud 轴 a//b、a/./b、a/../b
    // 不再抛 → AssertionError
    name: 'asset-path-segment-gate-removed',
    pkg: 'content',
    group: 'A',
    file: 'asset.ts',
    from: "if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))",
    to: 'if (false)',
    red: 'asset-catalog 路径 fail-loud 轴 a//b、a/./b、a/../b 不再抛',
    redTest: '空段 拒绝且消息含类别',
    expected: 1,
  },
  {
    // A负控2：manifest 角色 kind 门失效 → video.startupSplash 指向 sprite 记录
    // 的 toThrow(/期望.*实际/) 不再抛 → AssertionError
    name: 'asset-role-kind-gate-removed',
    pkg: 'content',
    group: 'A',
    file: 'asset.ts',
    from: 'const expected = ASSET_ROLE_KINDS[role]\n      if (record.kind !== expected)',
    to: 'const expected = ASSET_ROLE_KINDS[role]\n      if (false)',
    red: 'asset-catalog manifest 角色kind门轴（video 角色绑 sprite 资产）不再拒绝',
    redTest: 'kind 不匹配',
    expected: 1,
  },
  {
    // B负控1：地图矩阵行数门失效 → height×2 截断/超长拒绝断言不再抛 → AssertionError
    name: 'map-row-count-gate-removed',
    pkg: 'content',
    group: 'B',
    file: 'project-map.ts',
    from: 'value.length !== rows',
    to: 'false',
    red: 'project-map 矩阵行数=height×2 轴（截断/超长）不再拒绝',
    redTest: '矩阵行数必须是 height×2（截断/超长拒绝）',
    expected: 1,
  },
  {
    // B负控2：stamp anchor 越界门失效 → anchor 越界拒绝断言不再抛 → AssertionError
    name: 'stamp-anchor-bound-gate-removed',
    pkg: 'content',
    group: 'B',
    file: 'stamp.ts',
    from: 'anchor.row >= content.height * 2 || anchor.col >= content.width',
    to: 'false',
    red: 'tileset-stamp anchor 越界轴（row/col 超出 height×2/width）不再拒绝',
    redTest: 'anchor 越界拒绝（超出 height×width）',
    expected: 1,
  },
  {
    // C负控1：TPFS block 解码丢 XOR prev → 35 帧跨块全像素 oracle
    //（local>0 帧=current^prev）逐像素失配 → AssertionError
    name: 'tpfs-decode-drops-xor-delta',
    pkg: 'content',
    group: 'C',
    file: 'frame-sequence.ts',
    from: 'frame[byte] = (raw[sourceOffset + byte] ?? 0) ^ (previous[byte] ?? 0)',
    to: 'frame[byte] = raw[sourceOffset + byte] ?? 0',
    red: 'frame-sequence 35帧跨块像素 oracle：delta 帧解码值不等于输入像素',
    redTest: '35 帧跨两块（32+3）：block firstFrame/frameCount 精确、全部像素逐帧 oracle',
    expected: 1,
  },
  {
    // C负控2：帧时长 frameRate 换算层失效 → durationMs(…, 50) 应为 1000/50=20
    // 实际回落 100 → toBe(20) AssertionError
    name: 'tpfs-duration-framerate-layer-removed',
    pkg: 'content',
    group: 'C',
    file: 'frame-sequence.ts',
    from: 'if (range.frameRate !== undefined) return 1000 / range.frameRate',
    to: 'if (false) return 1000 / range.frameRate',
    red: 'frame-sequence 帧时长三级优先级：显式帧率换算层丢失',
    redTest: '帧时长优先级：显式 durationMs > defaultFrameMs',
    expected: 1,
  },
  {
    // D负控1：需求量丢 poses 叠加 → static+pose帧9 应为 max(1,10)=10
    // 实际回落 1 → toBe(10) AssertionError
    name: 'sprite-demand-drops-pose-max',
    pkg: 'content',
    group: 'D',
    file: 'sprite.ts',
    from: 'return Math.max(layoutDemand, poseDemand)',
    to: 'return layoutDemand',
    red: 'sprite-frame-demand poses 高帧号叠加轴：需求量回落为布局需求',
    redTest: 'poses 高帧号叠加取最大；需求量不是实际帧数（合同）',
    expected: 1,
  },
  {
    // D负控2：敌队槽位数上限门失效 → slots>5 拒绝断言不再抛 → AssertionError
    name: 'enemy-team-slot-cap-removed',
    pkg: 'content',
    group: 'D',
    file: 'enemy-team.ts',
    from: 'team.slots.length > 5',
    to: 'false',
    red: 'enemy-team 结构拒绝轴：槽位数超上限 5 不再拒绝',
    redTest: '槽位超上限 5 拒绝',
    expected: 1,
  },
  {
    // E负控1：整树 walker 丢子节点递归 → 嵌套 then 臂内引用不再命中，
    // “整树递归命中两处”断言失配 → AssertionError
    name: 'actor-walker-drops-tree-recursion',
    pkg: 'content',
    group: 'E',
    file: 'actor-reference.ts',
    // 字符串内容是被替换的生产源文本，须逐字含 `${path}.${key}`，非模板插值。
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source text, not interpolation
    from: 'out.push(...actorTaggedReferencesAtNode(record, path))\n    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)',
    to: 'out.push(...actorTaggedReferencesAtNode(record, path))',
    red: 'actor-reference 整树递归轴：嵌套臂引用丢失（canonical 单叶替身化）',
    redTest: 'collectActorTaggedReferences 整树递归命中两处（含嵌套 then 臂）',
    expected: 1,
  },
  {
    // E负控2：resolver 缺主立绘门失效 → default-portrait cue 不再 fail-loud，
    // toThrow(/缺 portraits\\.default/) 断言红 → AssertionError
    name: 'dialogue-resolver-default-portrait-gate-removed',
    pkg: 'content',
    group: 'E',
    file: 'author-dialogue.ts',
    // 同上：throw 语句的源文本须逐字含模板字面量。
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source text, not interpolation
    from: 'if (!actor.portraits?.default)\n      throw new Error(`${path}.portrait: Actor "${identity.actor}" 缺 portraits.default`)',
    to: '',
    red: 'author-dialogue resolver fail-loud 轴：缺 portraits.default 静默通过',
    redTest: '缺 Actor/缺主立绘/缺命名表情 fail-loud 不回退全局资源',
    expected: 1,
  },
  {
    // F负控1：实体悬空 actor 门失效 → 精确多重集合断言拿到 [] → AssertionError
    name: 'refs-entity-actor-gate-removed',
    pkg: 'content',
    group: 'F',
    file: 'validate-refs.ts',
    from: 'if (!actorIds.has(e.actor))',
    to: 'if (false)',
    red: 'validate-refs 实体→actors 表轴：ghost-actor 不再报 issue',
    redTest: '实体引用悬空 actor → 精确 error（完整 where/severity/目标 id；无额外 issue）',
    expected: 1,
  },
  {
    // F负控2：entryPoint 悬空 scene 门失效 → 精确多重集合断言拿到 [] → AssertionError
    name: 'refs-entry-scene-gate-removed',
    pkg: 'content',
    group: 'F',
    file: 'validate-refs.ts',
    from: 'if (!scenesById.has(entry.scene))',
    to: 'if (false)',
    red: 'validate-refs entryPoint→scenes 轴：ghost-scene 不再报 issue',
    redTest: 'entryPoint scene 悬空 → 精确 error；不引入任何额外 issue',
    expected: 1,
  },
]

// ── 判据自测（正反控）──────────────────────────────────────────────
// 与接收复核工具同法：AST 抽取本文件唯一的 `if (item.expected === 1)` 判据块，
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
const selfGood = {
  item: { name: 'selftest-good' },
  output: 'MUTATION_HIT selftest-good\nAssertionError: expected 1 to equal 2',
}
new Function('assert', 'item', 'output', criterionBlocks[0])(assert, selfGood.item, selfGood.output)
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
 plugins:[{name:'cc1-single-point',enforce:'pre',load(id){
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
