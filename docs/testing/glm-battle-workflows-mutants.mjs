// TEST-BATTLE-WORKFLOWS-1 单点负控（r4 判据精化版，闭 N4）。
// 判据合同：
//  - 钉名用**正控实跑解析出的唯一 fullName**（转义+^$ 锚定传 -t），验证 failed 项 fullName 精确相等
//    （同 leaf 后缀的异 suite 不再误收）；
//  - 文件身份用**规范绝对路径全等**（同后缀的无关项目文件不再误收）；
//  - MUTATION_HIT 带针身份（`MUTATION_HIT:<needle>`），本针 marker 必须出现且不得出现他针 marker；
//  - 拒绝混合错误：套件级 message、多失败项、未执行/多执行、Unhandled 错误，以及
//    **同一失败项内逐条 failureMessages 的非业务首行**（AssertionError+Error 混错不放行）；
//  - timeout 拒绝扫**全部行**（首行业务断言、后续行 Test timed out 亦拒）；
//  - **变异成功必须恰 exit1**：exit0=MISSED；exit2/被杀 null 退出=invalid，不算 detected；
//  - 正控（兼 fullName 解析）逐组实跑；单针模式只报实际跑过的组数，不虚称 6 组；
//  - 未知针 exit1；产品 hash 前后不变；判据自测复用真实 judge 入口。
// 运行：node docs/testing/glm-battle-workflows-mutants.mjs [needle-id]
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'bw1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')
const only = process.argv[2]
const groups = ['selection', 'round', 'action', 'script', 'terminal', 'writeback']
const GROWTH_FIXED_BLOCK = `          character.level += mutation.delta.level
          character.maxHP += mutation.delta.maxHP
          character.maxMP += mutation.delta.maxMP
          character.attack += mutation.delta.attack
          character.magicAttack += mutation.delta.magicAttack
          character.defense += mutation.delta.defense`

const cases = [
  // W1: 菜单输入吞掉（提交永不发生）
  {
    name: 'w1-menu-input-swallowed',
    group: 'selection',
    file: 'battle/battle-session.ts',
    from: "if (this.ui === 'menu') {",
    to: 'if (false) {',
    redTest: '默认攻击：空格确认后离开菜单，我方行动与敌反击真实发生（行动者按行首区分）',
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
  // W4: 准备屏障解锁（重复进入准备可被"一回合一次准备回调"合同检出）
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
  // C1: 成长写回单字段漏写（magicAttack 不入账；fixed 分支整块为唯一锚）
  {
    name: 'c1-growth-magicattack-skipped',
    group: 'writeback',
    file: 'battle/battle-session.ts',
    from: GROWTH_FIXED_BLOCK,
    to: GROWTH_FIXED_BLOCK.replace(
      '\n          character.magicAttack += mutation.delta.magicAttack',
      '',
    ),
    redTest:
      '真实成长写回：8 字段对账；未参战队员/money/非空库存保真；奖励后二次写回与独立预期全等',
  },
]

if (only) {
  const found = cases.find((c) => c.name === only)
  if (!found) {
    console.error(`BW1: unknown needle "${only}"；可用：${cases.map((c) => c.name).join(', ')}`)
    process.exit(1)
  }
}

const files = [...new Set(cases.flatMap((c) => [`packages/reforge/src/${c.file}`]))]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(join(root, f), 'utf8'))]))

const escapePattern = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 真实判据入口：对单个（针/正控）运行产物给出 verdict。self-test 复用同一函数。 */
function judge(item, { runStatus, data, logText, targetFileAbs, resolvedFullName }) {
  const reasons = []
  const exactFile = (p) => resolve(p.replace(/\\/g, '/')) === targetFileAbs
  if (!data) return { verdict: 'invalid', reasons: ['NO_REPORT'] }
  const suites = data.testResults ?? []
  if (suites.length !== 1 || !exactFile(suites[0].name))
    reasons.push(`file identity: ${suites.map((s) => s.name).join(';')}`)
  if ((suites[0]?.message ?? '') !== '') reasons.push('suite-level message present')
  if (/Unhandled (Rejection|Error)|unhandledRejection/i.test(logText))
    reasons.push('unhandled error in log')
  const assertions = suites.flatMap((s) => s.assertionResults ?? [])
  const executed = assertions.filter((a) => a.status !== 'skipped')
  const failed = assertions.filter((a) => a.status === 'failed')
  if (item.control) {
    if (runStatus !== 0) reasons.push(`exit ${runStatus}`)
    if (failed.length > 0) reasons.push(`${failed.length} failed in control`)
    if (executed.length === 0) reasons.push('nothing executed')
    return {
      verdict: reasons.length ? 'CONTROL_FAIL' : 'green',
      reasons,
      executed: executed.length,
    }
  }
  if (runStatus !== 1) {
    // 变异成功必须恰 exit1：exit0=没抓住（MISSED）；exit2/被杀 null 退出=异常退出，不是业务红
    const why = runStatus === 0 ? 'mutated run stayed green' : `abnormal exit ${runStatus}`
    return {
      verdict: runStatus === 0 ? 'MISSED' : 'invalid',
      reasons: [why],
      executed: executed.length,
    }
  }
  if (executed.length !== 1) reasons.push(`executed ${executed.length} != 1`)
  if (failed.length !== 1) reasons.push(`failed ${failed.length} != 1`)
  if (failed[0] && resolvedFullName && failed[0].fullName !== resolvedFullName)
    reasons.push(`title identity: ${failed[0].fullName}`)
  const messages = failed.flatMap((f) => f.failureMessages ?? [])
  if (messages.length === 0) reasons.push('no failure messages')
  // 逐条 failureMessages：每一条的首行都必须是业务断言（同一失败项携带的套件/环境混错不放过）
  for (const message of messages) {
    const first = message.split('\n', 1)[0] ?? ''
    if (!/^AssertionError(?:\b|:)|^expect\(/.test(first)) {
      reasons.push('non-business message first line')
      break
    }
  }
  for (const message of messages)
    for (const line of message.split('\n'))
      if (/timed out|waitFor/i.test(line)) {
        reasons.push('timeout wording present')
        break
      }
  const markers = [...logText.matchAll(/MUTATION_HIT:(\S+)/g)].map((m) => m[1])
  if (!markers.includes(item.name)) reasons.push(`no MUTATION_HIT:${item.name} witness`)
  if (markers.some((m) => m !== item.name)) reasons.push('foreign needle marker present')
  return { verdict: reasons.length ? 'invalid' : 'detected', reasons, executed: executed.length }
}

// ── 判据自测（Codex r2 反证矩阵：构造产物走真实 judge，非装饰断言） ──
const mkCtx = (over = {}) => ({
  runStatus: 1,
  targetFileAbs: '/repo/packages/reforge/src/battle/x.test.ts',
  resolvedFullName: 'W1 suite > 默认攻击：业务红',
  logText: 'MUTATION_HIT:w1-menu-input-swallowed\n',
  data: {
    testResults: [
      {
        name: '/repo/packages/reforge/src/battle/x.test.ts',
        message: '',
        assertionResults: [
          {
            fullName: 'W1 suite > 默认攻击：业务红',
            status: 'failed',
            failureMessages: ['AssertionError: expected 1 to be 2'],
          },
          { fullName: 'W1 suite > 其他', status: 'skipped', failureMessages: [] },
        ],
      },
    ],
  },
  ...over,
})
const needle = { name: 'w1-menu-input-swallowed' }
assert.equal(judge(needle, mkCtx()).verdict, 'detected', 'self: 正确钉名+业务红')
assert.equal(
  judge(
    needle,
    mkCtx({
      resolvedFullName: '另一个 suite > 默认攻击：业务红',
    }),
  ).verdict,
  'invalid',
  'self: 同 leaf 后缀异 suite 拒收',
)
assert.equal(
  judge(
    needle,
    mkCtx({
      data: { testResults: [{ ...mkCtx().data.testResults[0], name: '/elsewhere/x.test.ts' }] },
    }),
  ).verdict,
  'invalid',
  'self: 无关项目同后缀文件拒收',
)
assert.equal(
  judge(needle, mkCtx({ logText: 'MUTATION_HIT:w2-auto-disabled\n' })).verdict,
  'invalid',
  'self: 他针 marker 拒收',
)
assert.equal(
  judge(
    needle,
    mkCtx({
      data: {
        testResults: [
          {
            ...mkCtx().data.testResults[0],
            assertionResults: [
              ...mkCtx().data.testResults[0].assertionResults,
              { fullName: 'W1 suite > 崩溃项', status: 'failed', failureMessages: ['Error: boom'] },
            ],
          },
        ],
      },
    }),
  ).verdict,
  'invalid',
  'self: 断言+套件普通 Error 混合拒收',
)
assert.equal(
  judge(
    needle,
    mkCtx({
      data: {
        testResults: [
          {
            ...mkCtx().data.testResults[0],
            assertionResults: [
              {
                fullName: 'W1 suite > 默认攻击：业务红',
                status: 'failed',
                failureMessages: [
                  'AssertionError: expected 1 to be 2',
                  'Test timed out after 5000ms',
                ],
              },
              { fullName: 'W1 suite > 其他', status: 'skipped', failureMessages: [] },
            ],
          },
        ],
      },
    }),
  ).verdict,
  'invalid',
  'self: 后行 timeout 拒收',
)
assert.equal(judge(needle, mkCtx({ data: undefined })).verdict, 'invalid', 'self: 无报告拒收')
// N4 反证矩阵：同一失败项携带混错 / 异常退出码
assert.equal(
  judge(
    needle,
    mkCtx({
      data: {
        testResults: [
          {
            ...mkCtx().data.testResults[0],
            assertionResults: [
              {
                fullName: 'W1 suite > 默认攻击：业务红',
                status: 'failed',
                failureMessages: [
                  'AssertionError: expected 1 to be 2',
                  'Error: fixture setup failed',
                ],
              },
              { fullName: 'W1 suite > 其他', status: 'skipped', failureMessages: [] },
            ],
          },
        ],
      },
    }),
  ).verdict,
  'invalid',
  'self: 同项混错（AssertionError+Error）拒收',
)
assert.equal(judge(needle, mkCtx({ runStatus: 2 })).verdict, 'invalid', 'self: exit2 拒收')
assert.equal(
  judge(needle, mkCtx({ runStatus: null })).verdict,
  'invalid',
  'self: null 退出（被杀/崩溃）拒收',
)
assert.equal(
  judge(needle, mkCtx({ runStatus: 0 })).verdict,
  'MISSED',
  'self: exit0 归 MISSED 非 detected',
)

// ── 正控兼 fullName 解析：逐组实跑（only 模式只跑针所属组）──
const wantedGroups = only ? [cases.find((c) => c.name === only).group] : groups
const resolvedNames = new Map()
const results = []
for (const group of wantedGroups) {
  const testFile = `src/battle/battle-session.${group}-flows.test.ts`
  const targetFileAbs = resolve(join(root, 'packages/reforge', testFile))
  const report = join(logs, `control-${group}.json`)
  const run = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--reporter=json', '--outputFile', report, testFile],
    {
      cwd: join(root, 'packages/reforge'),
      encoding: 'utf8',
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  const logText = (run.stdout ?? '') + (run.stderr ?? '')
  writeFileSync(join(logs, `control-${group}.log`), logText)
  let data
  try {
    data = JSON.parse(readFileSync(report, 'utf8'))
  } catch {
    results.push({ name: `control-${group}`, verdict: 'CONTROL_FAIL', reasons: ['NO_REPORT'] })
    continue
  }
  const verdict = judge(
    { control: true, name: `control-${group}` },
    { runStatus: run.status, data, logText, targetFileAbs },
  )
  results.push({ name: `control-${group}`, ...verdict })
  for (const a of data.testResults.flatMap((s) => s.assertionResults ?? []))
    if (a.fullName && !resolvedNames.has(a.fullName)) resolvedNames.set(a.fullName, a.fullName)
}

for (const item of cases) {
  if (only && item.name !== only) continue
  const testFile = `src/battle/battle-session.${item.group}-flows.test.ts`
  const targetFileAbs = resolve(join(root, 'packages/reforge', testFile))
  // 从正控实跑解析钉名目标的确切 fullName（唯一），转义+锚定后传 -t
  const leaf = item.redTest
  const matches = [...resolvedNames.keys()].filter(
    (name) => name === leaf || name.endsWith(` ${leaf}`),
  )
  assert.equal(
    matches.length,
    1,
    `resolve fullName for ${item.name}: got ${matches.length} (${matches.join(' | ')})`,
  )
  const resolvedFullName = matches[0]
  const config = join(logs, `${item.name}.config.mjs`)
  const report = join(logs, `${item.name}.json`)
  const mutation = { ...item, file: join(root, 'packages/reforge/src', item.file) }
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
    console.log('MUTATION_HIT:' + mutation.name);
    return before.replace(mutation.from, mutation.to);
  }
  if (id.split('?')[0] === targetFile) return readFileSync(id, 'utf8');
 }}],
 test: { include: [targetFile], maxWorkers: 1, fileParallelism: false },
};
`,
  )
  const run = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--reporter=json',
      '--outputFile',
      report,
      '-t',
      `^${escapePattern(resolvedFullName)}$`,
    ],
    { cwd: root, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
  )
  const logText = (run.stdout ?? '') + (run.stderr ?? '')
  writeFileSync(join(logs, `${item.name}.log`), logText)
  let data
  try {
    data = JSON.parse(readFileSync(report, 'utf8'))
  } catch {
    data = undefined
  }
  const verdict = judge(item, {
    runStatus: run.status,
    data,
    logText,
    targetFileAbs,
    resolvedFullName,
  })
  results.push({
    name: item.name,
    resolvedFullName,
    ...verdict,
    log: join(logs, `${item.name}.log`),
  })
}

for (const [f, h] of Object.entries(hashes))
  assert.equal(sha(readFileSync(join(root, f), 'utf8')), h, `product hash changed: ${f}`)
writeFileSync(join(logs, 'summary.json'), JSON.stringify({ root, results }, null, 2))
for (const r of results)
  console.log(
    `${r.name}: ${r.verdict}${r.executed !== undefined ? ` (${r.executed} executed)` : ''}${r.reasons?.length ? ` [${r.reasons.join('; ')}]` : ''}`,
  )
const bad = results.filter((r) => r.verdict !== 'green' && r.verdict !== 'detected')
const controlsRun = results.filter((r) => r.name.startsWith('control-')).length
const detected = results.filter((r) => r.verdict === 'detected').length
console.log(
  bad.length === 0
    ? `BW1: ${controlsRun} controls (of ${groups.length}) + ${detected} mutations passed. ${logs}`
    : `BW1 FAILURES: ${bad.map((r) => r.name).join(', ')}. ${logs}`,
)
process.exit(bad.length === 0 ? 0 : 1)
