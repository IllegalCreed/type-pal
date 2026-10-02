#!/usr/bin/env node
/** Wave O 反控证据再判定（O-R9 规则落地）：
 *  只改判据/登记、业务源与执行身份未变的针，用当前 counter-judge 对**已存三态证据**
 *  重新判定后保留；不再重跑 vitest。同时做两类机械化失效检测：
 *  1) spec.mutation.find 在当前产品源中必须仍恰好出现一次（锚点漂移 → 需重采/退役）；
 *  2) spec.test.target（完整 fullName）必须仍存在于当前候选测试文件（目标被删 → 退役）。
 *  任一失败即整表退出码 1。产物：re-adjudication.json（逐针 verdict + judge 版本锚）。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flattenTests, judgePhase, sameExecutionIdentity } from './counter-judge.mjs'
import { parseTestTitles } from './test-titles.mjs'

const here = import.meta.dirname
const evidenceRoot = here
const repoRoot = resolve(here, '../../../..')

const index = JSON.parse(readFileSync(resolve(evidenceRoot, 'counters.json'), 'utf8'))
const retired = new Set(index.retired ?? [])

/** 从 raw .txt 证据头恢复 exit/signal，正文恢复 stdout/stderr（与 run-counter 落盘格式一致）。 */
function parseRaw(txt) {
  const head = txt.split('\n')[0] ?? ''
  const exit = Number((head.match(/exit=(-?\d+)/) ?? [])[1] ?? -1)
  const signal = (head.match(/signal=(\S+)/) ?? [])[1]
  const signalNorm = signal === 'null' ? null : signal
  const errored = (head.match(/errored=(\S+)/) ?? [])[1]
  const stdoutAt = txt.indexOf('# === stdout ===')
  const stderrAt = txt.indexOf('# === stderr ===')
  const stdout = txt.slice(stdoutAt >= 0 ? stdoutAt + 16 : 0, stderrAt >= 0 ? stderrAt : undefined)
  const stderr = stderrAt >= 0 ? txt.slice(stderrAt + 16) : ''
  return {
    exitCode: exit,
    signal: signalNorm,
    error: errored !== 'null' && errored ? errored : undefined,
    stdout,
    stderr,
  }
}

const verdicts = []
let failed = 0
for (const dir of readdirSync(resolve(evidenceRoot, 'counters'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const id = dir.name
  if (retired.has(id)) continue
  const entry = { id, verdict: 'pass', reasons: [] }
  try {
    const spec = JSON.parse(
      readFileSync(resolve(evidenceRoot, 'counters', id, 'spec.json'), 'utf8'),
    )
    const pkg = spec.package ?? 'migrate'
    const runs = {}
    for (const phase of ['control', 'injected', 'restored']) {
      const json = JSON.parse(
        readFileSync(resolve(evidenceRoot, 'counters', id, `vitest-${phase}.json`), 'utf8'),
      )
      const raw = parseRaw(
        readFileSync(resolve(evidenceRoot, 'counters', id, `vitest-${phase}.txt`), 'utf8'),
      )
      runs[phase] = { ...raw, json }
    }
    for (const phase of ['control', 'injected', 'restored'])
      judgePhase(runs[phase], spec, phase, pkg)
    // O-R10-01 修正：身份比较必须传 flattenTests 后的叶集合（file×fullName），
    // 不能传 suite 数组——suite 无 file/fullName，会把每份报告折成同一个
    // undefined 键导致比较恒真（Codex r10 反例：换一个 passed 邻居 fullName 仍被接受）。
    sameExecutionIdentity(
      flattenTests(runs.control.json),
      flattenTests(runs.injected.json),
      'control↔injected',
    )
    sameExecutionIdentity(
      flattenTests(runs.injected.json),
      flattenTests(runs.restored.json),
      'injected↔restored',
    )
    // result.json 记录的红例 fullName 必须与当前判定结果一致
    const recorded = JSON.parse(
      readFileSync(resolve(evidenceRoot, 'counters', id, 'result.json'), 'utf8'),
    )
    const injectedFailed = runs.injected.json.testResults
      .flatMap((suite) => suite.assertionResults ?? [])
      .filter((leaf) => leaf.status === 'failed')
    if (
      injectedFailed.length !== 1 ||
      injectedFailed[0].fullName !== recorded.injected.failedFullName
    )
      entry.reasons.push('result.json 记录的红例与再判定结果不一致')
    // 变异锚点仍唯一存在于当前产品源
    const productPath = resolve(repoRoot, 'packages', pkg, spec.mutation.file)
    const source = readFileSync(productPath, 'utf8')
    const occurrences = source.split(spec.mutation.find).length - 1
    if (occurrences !== 1) entry.reasons.push(`变异锚点在当前源出现 ${occurrences} 次（须恰 1）`)
    // 目标 fullName 仍存在于当前候选测试文件（标题字面量必须可找到；title 含引号时
    // 源码用另一种引号书写，两种形态都接受）。target 与 title 保持组前缀拼接关系。
    const testPath = resolve(repoRoot, 'packages', pkg, spec.test.file)
    const testSource = readFileSync(testPath, 'utf8')
    const title = spec.test.title ?? ''
    const literalFound = testSource.includes(`'${title}'`) || testSource.includes(`"${title}"`)
    if (!title || !literalFound)
      entry.reasons.push('目标 title 不在当前测试文件（目标被删/改名 → 须重采或退役）')
    if (spec.test.target && !spec.test.target.endsWith(` ${title}`))
      entry.reasons.push('spec.test.target 与 title 拼接关系不一致')
    // 执行集一致性：存档 control 的 fullName 多重集必须等于当前文件的解析 fullName 多重集
    // （文件增删/改名测试 → 执行集变化 → 按规则须重采该针）
    const currentIdentities = parseTestTitles(testSource).map((t) => t.fullName)
    const storedIdentities = flattenTests(runs.control.json).map((t) => t.fullName)
    const ms = (list) => {
      const m = new Map()
      for (const k of list) m.set(k, (m.get(k) ?? 0) + 1)
      return m
    }
    const cur = ms(currentIdentities)
    const sto = ms(storedIdentities)
    if (cur.size !== sto.size || [...cur].some(([k, v]) => sto.get(k) !== v))
      entry.reasons.push(
        `执行集已变化（存档 ${storedIdentities.length} 例 vs 当前文件 ${currentIdentities.length} 例）→ 须重采`,
      )
  } catch (error) {
    entry.reasons.push(String(error).split('\n')[0])
  }
  if (entry.reasons.length) {
    entry.verdict = 'recollect-or-retire'
    failed += 1
  }
  verdicts.push(entry)
}

const summary = {
  judgeSource:
    'counter-judge.mjs@729d554d0（O-R9-01 判据：路径归一化保留完整 packages/包/子路径 + 顶层执行数闭合 + 逐相状态政策）',
  total: verdicts.length,
  pass: verdicts.filter((v) => v.verdict === 'pass').length,
  flagged: verdicts.filter((v) => v.verdict !== 'pass'),
}
writeFileSync(
  resolve(evidenceRoot, 're-adjudication.json'),
  `${JSON.stringify({ ...summary, verdicts }, null, 2)}\n`,
)
for (const v of verdicts) {
  if (v.verdict === 'pass') continue
  console.log(`FLAG ${v.id}: ${v.reasons.join(' | ')}`)
}
console.log(
  `re-adjudication: ${summary.pass}/${summary.total} pass, ${summary.flagged.length} flagged`,
)
process.exitCode = failed ? 1 : 0
