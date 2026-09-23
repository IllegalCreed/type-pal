// TEST-BATTLE-WORKFLOWS-1 单点负控（r2 返工版）。
// 判据修正（R4）：未知针名 exit1（不再“0 mutations passed”）；每针验证失败项的确切
// title/file 与钉名目标一致；失败首行匹配 AssertionError/^expect( 且拒绝 timeout 字样与
// 纯 Error/未执行；mutated 运行必须出现 MUTATION_HIT 加载见证；控制组固定 6 组全量正控。
// 运行：node docs/testing/glm-battle-workflows-mutants.mjs [needle-id]
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'bw1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')
const only = process.argv[2]
const groups = ['selection', 'round', 'action', 'script', 'terminal', 'writeback']

const cases = [
  ...groups.map((group) => ({ name: `control-${group}`, control: true, group })),
  // W1: 菜单输入吞掉（提交永不发生）
  {
    name: 'w1-menu-input-swallowed',
    group: 'selection',
    file: 'battle/battle-session.ts',
    from: "if (this.ui === 'menu') {",
    to: 'if (false) {',
    redTest: '默认攻击：空格确认选敌→确认后离开菜单，敌 HP 真实下降',
  },
  // W2a: A 持续自动入口关闭
  {
    name: 'w2-auto-disabled',
    group: 'round',
    file: 'battle/battle-session.ts',
    from: 'this.fAuto = true // 持续自动(uibattle.c:1266 fAutoAttack;Esc 取消)',
    to: 'void 0',
    redTest: 'A 持续自动：开启后零菜单按键连续多轮自动攻击到终态',
  },
  // W2b: R 重复查表失效（lastActs 读取点唯一）——R 降级 attack，MP 阶梯断
  {
    name: 'w2-repeat-lookup-removed',
    group: 'round',
    file: 'battle/battle-session.ts',
    from: 'let act = this.lastActs.get(sel)',
    to: 'let act = undefined',
    redTest: 'R 重复上轮 cast：次轮真实重提同一法术（MP 40→20→0 精确阶梯）',
  },
  // W3: 终态永不进入 over
  {
    name: 'w3-ui-never-over',
    group: 'action',
    file: 'battle/battle-session.ts',
    from: "this.ui = 'over'",
    to: "this.ui = 'menu'",
    redTest: '攻击选择→真 core 执行→敌死亡→victory 终态（精确 done 结果）',
  },
  // W4: 准备屏障解锁（pending 期间按键穿透 + MP 偷扣可检出）
  {
    name: 'w4-preparing-unlock',
    group: 'script',
    file: 'battle/battle-session.ts',
    from: "if (this.ui === 'preparing') return",
    to: "if (this.ui === 'preparing') { if (pressed.size) this.ui = 'menu'; return }",
    redTest: '屏障挂起：pending 期间按键零业务副作用（MP 不偷扣），放行后真实推进',
  },
  // W5a: 结算重复构建
  {
    name: 'w5-settlement-rebuilt',
    group: 'terminal',
    file: 'battle/battle-session.ts',
    from: '&& this.settlement === null) {',
    to: ') { this.settlement = null;',
    redTest: 'victory：真实击杀→settlement 恰一次→300ms 边界前不兑现→精确 resolve victory',
  },
  // W5b: 300ms 边界移除
  {
    name: 'w5-early-done',
    group: 'terminal',
    file: 'battle/battle-session.ts',
    from: 'this.overTimer >= 300',
    to: 'this.overTimer >= 0',
    redTest: 'victory：真实击杀→settlement 恰一次→300ms 边界前不兑现→精确 resolve victory',
  },
  // W6a: 库存覆写跳过
  {
    name: 'w6-inventory-overwrite-skip',
    group: 'writeback',
    file: 'battle/battle-session.ts',
    from: 'if (w) w.count = s.count',
    to: 'if (w) w.count = w.count',
    redTest: 'writeBackInventory：真实消耗一件物品后写回 count-1；未持有项保留；count 0 清项',
  },
  // W6b: count 0 清项移除
  {
    name: 'w6-zero-clear-removed',
    group: 'writeback',
    file: 'battle/battle-session.ts',
    from: 'for (let i = inv.length - 1; i >= 0; i--)',
    to: 'for (let i = 0; i > inv.length; i--)',
    redTest: 'writeBackInventory：真实消耗一件物品后写回 count-1；未持有项保留；count 0 清项',
  },
]

if (only) {
  const found = cases.find((c) => c.name === only)
  if (!found) {
    console.error(
      `BW1: unknown needle "${only}"；可用：${cases
        .filter((c) => !c.control)
        .map((c) => c.name)
        .join(', ')}`,
    )
    process.exit(1)
  }
}

const files = [...new Set(cases.flatMap((c) => (c.file ? [`packages/reforge/src/${c.file}`] : [])))]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(join(root, f), 'utf8'))]))

// 判据自测（复用真实运行入口的谓词，非装饰函数）
const businessFirstLine = (messages) =>
  messages.length > 0 &&
  messages.every((m) => {
    const first = m.split('\n', 1)[0] ?? ''
    return /^AssertionError(?:\b|:)|^expect\(/.test(first) && !/timed out|waitFor/i.test(first)
  })
assert.equal(businessFirstLine(['AssertionError: expected 1 to be 2']), true, 'self: 正常业务红')
assert.equal(businessFirstLine(['AssertionError: waitFor timed out']), false, 'self: timeout 拒绝')
assert.equal(businessFirstLine(['Error: boom']), false, 'self: 纯 Error 拒绝')
assert.equal(businessFirstLine([]), false, 'self: 未执行拒绝')

const results = []
for (const item of cases) {
  if (only && item.name !== only) continue
  const config = join(logs, `${item.name}.config.mjs`)
  const report = join(logs, `${item.name}.json`)
  const testFile = `src/battle/battle-session.${item.group}-flows.test.ts`
  const targetFileAbs = join(root, 'packages/reforge', testFile)
  const mutation = item.file
    ? { ...item, file: join(root, 'packages/reforge/src', item.file) }
    : null
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation = ${JSON.stringify(mutation)};
const targetFile = ${JSON.stringify(targetFileAbs)};
export default {
 root: ${JSON.stringify(join(root, 'packages/reforge'))},
 plugins: [{name:'bw1-single-point', enforce:'pre', load(id){
  if (mutation && id.split('?')[0] === mutation.file) {
    const before = readFileSync(id, 'utf8');
    assert.equal(before.split(mutation.from).length, 2, 'unique source point');
    console.log('MUTATION_HIT', mutation.name);
    return before.replace(mutation.from, mutation.to);
  }
  if (id.split('?')[0] === targetFile) return readFileSync(id, 'utf8');
 }}],
 test: { include: [targetFile], maxWorkers: 1, fileParallelism: false },
};
`,
  )
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
  const logText = (run.stdout ?? '') + (run.stderr ?? '')
  writeFileSync(join(logs, `${item.name}.log`), logText)
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
  // 验证目标文件确被执行（防配置漂移跑错文件）
  const fileMatches = data.testResults.every((r) => r.name.replace(/\\/g, '/').endsWith(testFile))
  const executed = assertions.filter((r) => r.status !== 'skipped').length
  const failed = assertions.filter((r) => r.status === 'failed')
  const filteredByExactName = assertions.filter((r) => r.status === 'skipped').length
  const titleMatches = failed.every((r) => r.fullName.endsWith(item.redTest ?? r.fullName))
  const mutationWitness = !mutation || logText.includes('MUTATION_HIT')
  if (item.control) {
    const ok = run.status === 0 && failed.length === 0 && executed > 0 && fileMatches
    results.push({
      name: item.name,
      exit: run.status,
      executedTests: executed,
      fileMatches,
      verdict: ok ? 'green' : 'CONTROL_FAIL',
    })
    continue
  }
  const business = businessFirstLine(failed.flatMap((r) => r.failureMessages ?? []))
  const verdict =
    run.status === 1 &&
    executed === 1 &&
    failed.length === 1 &&
    business &&
    titleMatches &&
    fileMatches &&
    mutationWitness
      ? 'detected'
      : run.status === 0
        ? 'MISSED'
        : 'invalid'
  results.push({
    name: item.name,
    exit: run.status,
    executedTests: executed,
    filteredByExactName,
    titleMatches,
    fileMatches,
    mutationWitness,
    verdict,
    log: join(logs, `${item.name}.log`),
  })
}
for (const [f, h] of Object.entries(hashes))
  assert.equal(sha(readFileSync(join(root, f), 'utf8')), h, `product hash changed: ${f}`)
writeFileSync(join(logs, 'summary.json'), JSON.stringify({ root, results }, null, 2))
for (const r of results)
  console.log(
    `${r.name}: ${r.verdict}${r.executedTests !== undefined ? ` (${r.executedTests} executed)` : ''}`,
  )
const bad = results.filter((r) => r.verdict !== 'green' && r.verdict !== 'detected')
console.log(
  bad.length === 0
    ? `BW1: 6 controls + ${results.filter((r) => r.verdict === 'detected').length} mutations passed. ${logs}`
    : `BW1 FAILURES: ${bad.map((r) => r.name).join(', ')}. ${logs}`,
)
process.exit(bad.length === 0 ? 0 : 1)
