// TEST-GAME-MENU-BOUNDARIES-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
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
const logs = mkdtempSync(join(tmpdir(), 'tb08-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  editor: { filter: '@type-pal/game', prefix: 'packages/game/src/core/menu' },
}

const TESTS = {
  inventory: ['src/core/menu/inventory-menu.boundaries.test.ts'],
  primitives: ['src/core/menu/primitives.boundaries.test.ts'],
  magic: ['src/core/menu/magic-select.boundaries.test.ts'],
  shop: ['src/core/menu/shop-menu.boundaries.test.ts'],
  sell: ['src/core/menu/sell-menu.boundaries.test.ts'],
  equip: ['src/core/menu/equip-menu.boundaries.test.ts'],
  system: ['src/core/menu/in-game-menu.boundaries.test.ts'],
  ingame: ['src/core/menu/in-game-magic-menu.boundaries.test.ts'],
}

const cases = [
  { name: 'control-inventory', pkg: 'editor', group: 'inventory', file: null, from: '', to: '', expected: 0 },
  { name: 'control-ingame', pkg: 'editor', group: 'ingame', file: null, from: '', to: '', expected: 0 },
  { name: 'control-system', pkg: 'editor', group: 'system', file: null, from: '', to: '', expected: 0 },
  {
    name: 'inventory-availability-gate-removed',
    pkg: 'editor',
    group: 'inventory',
    file: 'inventory-menu.ts',
    from: "if (!item?.flags.usable || sel.count - sel.inUse <= 0) {",
    to: 'if (false) {',
    red: 'count===inUse 的占用门失效（装备中物品仍可确认）',
    redTest: 'count===inUse 拒绝留在 list；少占用正控进 use-target；追加装备 count0/inUse-1 可确认',
    expected: 1,
  },
  {
    name: 'primitives-page-offset-advance-broken',
    pkg: 'editor',
    group: 'primitives',
    file: 'primitives.ts',
    from: 's.pageOffset = s.cursor - s.pageSize + 1',
    to: 's.pageOffset = s.cursor',
    red: '跨页后 pageOffset 不再按视窗推进',
    redTest: '跨 page 移动：cursor 与 pageOffset 完整推进/回落；pageUp/Down 落到可选项跳过 disabled',
    expected: 1,
  },
  {
    name: 'magic-mp-exact-equality-disabled',
    pkg: 'editor',
    group: 'magic',
    file: 'magic-select.ts',
    from: 'const insufficient = cfg.currentMp < mpCost',
    to: 'const insufficient = cfg.currentMp <= mpCost',
    red: 'MP 恰等 cost 被误判为不足（原版允许）',
    redTest: 'MP 恰等 cost 不禁用、差 1 禁用；排序后实际传入 roles.magic 不被污染',
    expected: 1,
  },
  {
    name: 'shop-affordability-gate-removed',
    pkg: 'editor',
    group: 'shop',
    file: 'shop-menu.ts',
    from: 'if (!item || item.price > gsCash) return false',
    to: 'if (!item) return false',
    red: '买不起仍弹 confirm',
    redTest: 'cash===price 恰等可进 confirm；差 1 拒绝；空列表拒绝',
    expected: 1,
  },
  {
    name: 'sell-availability-gate-removed',
    pkg: 'editor',
    group: 'sell',
    file: 'sell-menu.ts',
    from: "if (!item || !matchesFilter(item, 'sellable') || slot.count - slot.inUse <= 0) return false",
    to: "if (!item || !matchesFilter(item, 'sellable')) return false",
    red: '卖出占用门失效',
    redTest: 'inUse 耗尽拒绝；少占用正控进 confirm；confirm 期 Page/Home/End 不改 grid',
    expected: 1,
  },
  {
    name: 'equip-roleid-uses-cursor',
    pkg: 'editor',
    group: 'equip',
    file: 'equip-menu.ts',
    from: 'const roleId = state.partyMembers[state.playerCursor]',
    to: 'const roleId = state.playerCursor',
    red: '请求返回 cursor 位而非 roleId（party[2,0] 错人）',
    redTest: 'inUse 耗尽拒绝；party[2,0] 返回 roleId 非 cursor；意图不改装备/钱/库存',
    expected: 1,
  },
  {
    name: 'system-switch-default-dropped',
    pkg: 'editor',
    group: 'system',
    file: 'in-game-menu.ts',
    from: '  s.switchTarget = target\n  s.confirmYes = currentOn',
    to: '  s.switchTarget = target\n  s.confirmYes = false',
    red: 'switch 子单不再默认高亮当前开关态',
    redTest: 'EnterConfirm 重置 confirmYes=false；ToggleConfirm 翻转；EnterSwitch 按 id 记目标且高亮当前态',
    expected: 1,
  },
  {
    name: 'ingame-single-party-direct-removed',
    pkg: 'editor',
    group: 'ingame',
    file: 'in-game-magic-menu.ts',
    from: 'if (partyMembers.length === 1) {',
    to: 'if (false) {',
    red: '单人队不再跳过选施法人直进法术列表',
    redTest: '单人队直进 pick-spell；applyToAll 留相/单体切 pick-target；非顺序 party 返回 roleId',
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
  const pkgDir = join(root, 'packages/game')
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
 plugins:[{name:'tb08-single-point',enforce:'pre',load(id){
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
