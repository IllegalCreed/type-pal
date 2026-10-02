// Q-R19-01 · 反控 meta 唯一校验器（Q 专属证据工具，含拒收自测）。
//
// 背景：r18 的 counter-run-prod.sh v3 有两个生产器字段错误——sha256.mutated 被 phase
// summary 变量覆盖成对象、targetFullName 自拼产生前导空格。v4 已修（hash/summary 分
// 变量、fullName 直读 JSON）。本校验器把「同类坏 meta 必须拒收」固化为可执行判据：
//   拒收：对象/非 64-hex hash、fullName 含附加空白、mutant 红身份与目标不等（含
//         前导空格类错配）、零红/多红、正/恢复相非绿、执行数漂移。
// 用法：
//   node validate-counter-meta.mjs <meta.json> <positive.json> <mutant.json> <restored.json>
//   node validate-counter-meta.mjs --selftest   （合成坏/好样本，坏全拒 + 好全过才 exit 0）
import { readFileSync } from 'node:fs'

const HEX64 = /^[0-9a-f]{64}$/

function validate(meta, pos, mut, res) {
  const errors = []
  for (const key of ['testFile', 'original', 'mutated', 'restored']) {
    const h = meta?.sha256?.[key]
    if (typeof h !== 'string' || !HEX64.test(h)) {
      errors.push(
        `sha256.${key} 非字符串/非 64-hex（got ${typeof h}${typeof h === 'object' ? ' 对象' : ''}）`,
      )
    }
  }
  const fullName = meta?.targetFullName
  if (typeof fullName !== 'string' || fullName.length === 0) errors.push('targetFullName 缺失')
  else if (fullName !== fullName.trim()) errors.push('targetFullName 含附加空白')
  if (pos?.success !== true) errors.push('positive 相非绿')
  if (res?.success !== true) errors.push('restored 相非绿')
  if (pos?.numTotalTests !== res?.numTotalTests) errors.push('执行数漂移')
  const failed = (mut?.testResults ?? []).flatMap((tr) =>
    (tr.assertionResults ?? []).filter((a) => a.status === 'failed').map((a) => a.fullName),
  )
  if (failed.length !== 1) errors.push(`mutant 红数=${failed.length}（要求恰 1）`)
  else if (fullName && failed[0] !== fullName)
    errors.push(
      `mutant 红身份不等目标（${JSON.stringify(failed[0])} vs ${JSON.stringify(fullName)}）`,
    )
  return errors
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'))
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') {
  const goodSummary = { numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, success: true }
  const badSummary = { numTotalTests: 2, numPassedTests: 1, numFailedTests: 1, success: false }
  const fullName = 'Q10 CLI 战斗精灵 dump-all：F/ABC 合法 YJ2 sprite'
  const run = (summary) => ({
    ...summary,
    testResults: [
      { assertionResults: [{ fullName, status: summary.success ? 'passed' : 'failed' }] },
    ],
  })
  const hash = 'a'.repeat(64)
  const baseMeta = {
    targetFullName: fullName,
    sha256: { testFile: hash, original: hash, mutated: hash, restored: hash },
  }
  const cases = [
    {
      name: 'v3 复现：mutated 为 summary 对象',
      meta: { ...baseMeta, sha256: { ...baseMeta.sha256, mutated: badSummary } },
      pos: goodSummary,
      mut: run(badSummary),
      res: goodSummary,
    },
    {
      name: '非 hex hash',
      meta: { ...baseMeta, sha256: { ...baseMeta.sha256, original: 'not-a-hash' } },
      pos: goodSummary,
      mut: run(badSummary),
      res: goodSummary,
    },
    {
      name: 'fullName 前导空格错配',
      meta: { ...baseMeta, targetFullName: ` ${fullName}` },
      pos: goodSummary,
      mut: run(badSummary),
      res: goodSummary,
    },
    {
      name: 'mutant 红身份非目标',
      meta: { ...baseMeta, targetFullName: '其它目标 fullName' },
      pos: goodSummary,
      mut: run(badSummary),
      res: goodSummary,
    },
    {
      name: '零红（mutant 全绿）',
      meta: baseMeta,
      pos: goodSummary,
      mut: run(goodSummary),
      res: goodSummary,
    },
    {
      name: '执行数漂移',
      meta: baseMeta,
      pos: { ...goodSummary, numTotalTests: 2 },
      mut: run(badSummary),
      res: { ...goodSummary, numTotalTests: 3 },
    },
    {
      name: '好样本全过',
      meta: baseMeta,
      pos: goodSummary,
      mut: run(badSummary),
      res: goodSummary,
      expectPass: true,
    },
  ]
  let failures = 0
  for (const c of cases) {
    const errors = validate(c.meta, c.pos, c.mut, c.res)
    const pass = errors.length === 0
    if (c.expectPass ? !pass : pass) {
      console.error(`SELFTEST FAIL: ${c.name}（errors=${JSON.stringify(errors)}）`)
      failures += 1
    } else {
      console.log(`SELFTEST OK: ${c.expectPass ? '接受' : '拒收'} — ${c.name}`)
    }
  }
  if (failures > 0) process.exit(1)
  console.log('SELFTEST PASS: 6 拒收 + 1 接受全部符合预期')
  process.exit(0)
}

if (args.length !== 4) {
  console.error(
    '用法: node validate-counter-meta.mjs <meta.json> <positive.json> <mutant.json> <restored.json>',
  )
  process.exit(2)
}
const meta = readJson(args[0])
const errors = validate(meta, readJson(args[1]), readJson(args[2]), readJson(args[3]))
if (errors.length > 0) {
  console.error(`REJECT ${meta.id ?? args[0]}: ${errors.join('；')}`)
  process.exit(1)
}
console.log(
  `PASS ${meta.id ?? args[0]}（hash×4 hex、fullName 无附加空白、mutant 恰一红且身份相等、正/恢复绿、执行数一致）`,
)
