// TEST-BATTLE-WORKFLOWS-1 单点负控（可重建）。每针唯一替换点、Vite load 实际进入、
// 目标为新增 case 精确标题（同文件其余项按名过滤不计执行）、自身 AssertionError 首行；
// 普通 Error/混合错误/超时/未执行一律判 invalid；产品 hash 前后不变。
// 运行：node docs/testing/glm-battle-workflows-mutants.mjs [单针 WAVE2_MUTANT 式: argv[2]]
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'bw1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')
const only = process.argv[2]

const TESTS = [
  'src/battle/battle-session.selection-flows.test.ts',
  'src/battle/battle-session.round-flows.test.ts',
  'src/battle/battle-session.action-flows.test.ts',
  'src/battle/battle-session.script-flows.test.ts',
  'src/battle/battle-session.terminal-flows.test.ts',
  'src/battle/battle-session.writeback-flows.test.ts',
]
const cases = [
  {
    name: 'control-selection',
    control: true,
    group: 'selection',
  },
  {
    name: 'control-round',
    control: true,
    group: 'round',
  },
  {
    name: 'control-action',
    control: true,
    group: 'action',
  },
  {
    name: 'control-script',
    control: true,
    group: 'script',
  },
  {
    name: 'control-terminal',
    control: true,
    group: 'terminal',
  },
  {
    name: 'control-writeback',
    control: true,
    group: 'writeback',
  },
  // W1: 菜单输入吞掉（提交永不发生）
  {
    name: 'w1-menu-input-swallowed',
    group: 'selection',
    file: 'battle/battle-session.ts',
    from: "if (this.ui === 'menu') {",
    to: 'if (false) {',
    redTest: '默认攻击：空格确认选敌→确认→进入 acting，log 记录真实提交',
  },
  // W3: 终态永不进入 over（ui 停 menu）
  {
    name: 'w3-ui-never-over',
    group: 'action',
    file: 'battle/battle-session.ts',
    from: "this.ui = 'over'",
    to: "this.ui = 'menu'",
    redTest: '攻击选择→真 core 执行→敌 HP 实际下降（debugPlayers 以外经 done/log 见证）',
  },
  // W4: 准备屏障解锁（pending 期间输入穿透）
  {
    name: 'w4-preparing-unlock',
    group: 'script',
    file: 'battle/battle-session.ts',
    from: "if (this.ui === 'preparing') return",
    to: "if (this.ui === 'preparing') { if (pressed.size) this.ui = 'menu'; return }",
    redTest: '屏障挂起：pending 期间菜单输入零提交，放行后真实推进',
  },
  // W5a: 结算重复构建
  {
    name: 'w5-settlement-rebuilt',
    group: 'terminal',
    file: 'battle/battle-session.ts',
    from: '&& this.settlement === null) {',
    to: ') { this.settlement = null;',
    redTest: 'victory：真实击杀后 done resolve victory；settlement 回调恰一次',
  },
  // W5b: 提前 done（300ms 边界移除）
  {
    name: 'w5-early-done',
    group: 'terminal',
    file: 'battle/battle-session.ts',
    from: 'this.overTimer >= 300',
    to: 'this.overTimer >= 0',
    redTest: 'victory：真实击杀后 done resolve victory；settlement 回调恰一次',
  },
  // W6a: 库存覆写跳过
  {
    name: 'w6-inventory-overwrite-skip',
    group: 'writeback',
    file: 'battle/battle-session.ts',
    from: 'if (w) w.count = s.count',
    to: 'if (w) w.count = w.count',
    redTest: 'writeBackInventory：战斗库存覆写 world.inventory 同 itemId 计数、count 0 清项',
  },
  // W6b: count 0 清项移除
  {
    name: 'w6-zero-clear-removed',
    group: 'writeback',
    file: 'battle/battle-session.ts',
    from: 'for (let i = inv.length - 1; i >= 0; i--)',
    to: 'for (let i = 0; i > inv.length; i--)',
    redTest: 'writeBackInventory：战斗库存覆写 world.inventory 同 itemId 计数、count 0 清项',
  },
]
const files = [...new Set(cases.flatMap((c) => (c.file ? [`packages/reforge/src/${c.file}`] : [])))]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(join(root, f), 'utf8'))]))
const results = []
const businessFirstLine = (messages) =>
  messages.every((m) => /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n', 1)[0] ?? ''))
for (const item of cases) {
  if (only && item.name !== only) continue
  const config = join(logs, `${item.name}.config.mjs`)
  const report = join(logs, `${item.name}.json`)
  const testFile = `src/battle/battle-session.${item.group}-flows.test.ts`
  const mutation = item.file
    ? {
        ...item,
        file: join(root, 'packages/reforge/src', item.file),
      }
    : null
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation = ${JSON.stringify(mutation)};
const targetTest = ${JSON.stringify(item.redTest ?? '')};
const targetFile = ${JSON.stringify(join(root, 'packages/reforge', testFile))};
export default {
 root: ${JSON.stringify(join(root, 'packages/reforge'))},
 plugins: [{name:'bw1-single-point', enforce:'pre', load(id){
  if (mutation && id.split('?')[0] === mutation.file) {
    const before = readFileSync(id, 'utf8');
    assert.equal(before.split(mutation.from).length, 2, 'unique source point');
    console.log('MUTATION_HIT', mutation.name);
    return before.replace(mutation.from, mutation.to);
  }
  if (id.split('?')[0] === targetFile) {
    // 名称过滤：只执行钉名目标（其余同文件项不计执行）
    const source = readFileSync(id, 'utf8');
    return source; // 不改测试；执行过滤经 testNamePattern
  }
 }}],
 test: { include: [targetFile], maxWorkers: 1, fileParallelism: false },
};
`,
  )
  // 名称过滤用 vitest -t 参数（中文标题可含正则元字符 → 转义）
  const esc = (item.redTest ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const args = [
    'exec',
    'vitest',
    'run',
    '--config',
    config,
    '--reporter=json',
    '--outputFile',
    report,
  ]
  if (item.redTest) args.push('-t', item.redTest)
  const run = spawnSync('pnpm', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  writeFileSync(join(logs, `${item.name}.log`), (run.stdout ?? '') + (run.stderr ?? ''))
  let data
  try {
    data = JSON.parse(readFileSync(report, 'utf8'))
  } catch {
    results.push({
      name: item.name,
      exit: run.status,
      verdict: 'NO_REPORT',
      log: join(logs, `${item.name}.log`),
    })
    continue
  }
  const assertions = data.testResults.flatMap((r) => r.assertionResults)
  // 名称过滤下的真实执行数：skipped 是同文件被精确名过滤掉的项，不计执行
  const executed = assertions.filter((r) => r.status !== 'skipped').length
  const failed = assertions.filter((r) => r.status === 'failed')
  const filteredByExactName = assertions.filter((r) => r.status === 'skipped').length
  if (item.control) {
    const ok = run.status === 0 && failed.length === 0 && executed > 0
    results.push({
      name: item.name,
      exit: run.status,
      executedTests: executed,
      verdict: ok ? 'green' : 'CONTROL_FAIL',
    })
    continue
  }
  const business =
    failed.length > 0 &&
    failed.every(
      (r) =>
        r.failureMessages.length > 0 &&
        r.failureMessages.every((m) =>
          /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n', 1)[0] ?? ''),
        ),
    )
  const verdict =
    run.status === 1 && executed === 1 && failed.length === 1 && business
      ? 'detected'
      : run.status === 0
        ? 'MISSED'
        : 'invalid'
  results.push({
    name: item.name,
    exit: run.status,
    executedTests: executed,
    filteredByExactName,
    verdict,
    redTest: item.redTest,
    log: join(logs, `${item.name}.log`),
  })
}
for (const [f, h] of Object.entries(hashes))
  assert.equal(sha(readFileSync(join(root, f), 'utf8')), h, `product hash changed: ${f}`)
writeFileSync(join(logs, 'summary.json'), JSON.stringify({ root, results }, null, 2))
const bad = results.filter((r) => r.verdict !== 'green' && r.verdict !== 'detected')
for (const r of results)
  console.log(
    `${r.name}: ${r.verdict}${r.executedTests !== undefined ? ` (${r.executedTests} executed)` : ''}`,
  )
console.log(
  bad.length === 0
    ? `BW1: 6 controls + ${results.filter((r) => r.verdict === 'detected').length} mutations passed. ${logs}`
    : `BW1 FAILURES: ${bad.map((r) => r.name).join(', ')}. ${logs}`,
)
process.exit(bad.length === 0 ? 0 : 1)
