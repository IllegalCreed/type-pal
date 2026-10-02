#!/usr/bin/env node
/** re-adjudicate 判据自测（O-R10-01）：
 *  用真实 O01-CC1 存档三态 JSON 构造两类用例：
 *  1) 正控：原样三相 flatten 后身份一致 → 通过；
 *  2) 反例：同数量下仅换一个 passed 邻居的 fullName（保持 status/数量不变）→
 *     修后判据必须拒收（修前传 suite 数组时每份报告折成同一 undefined 键，恒通过）。
 *  另含 suite-直传形态的即时反例：即便误传 suite 数组，flattenTests(key) 也会因
 *  undefined 键冲突在多数 suite 场景暴露——本自测钉住正确调用形态的语义。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flattenTests, sameExecutionIdentity } from './counter-judge.mjs'

const here = import.meta.dirname
const dir = resolve(here, 'counters', 'O01-CC1')
const load = (phase) =>
  JSON.parse(readFileSync(resolve(dir, `vitest-${phase}.json`), 'utf8'))

let passed = 0
let failedCount = 0
const check = (label, fn) => {
  try {
    fn()
    passed++
    console.log(`ok   ${label}`)
  } catch (error) {
    failedCount++
    console.log(`FAIL ${label}: ${String(error).split('\n')[0]}`)
  }
}

const control = load('control')
const injected = load('injected')
const restored = load('restored')

check('正控：真实存档三相 flatten 后身份一致', () => {
  sameExecutionIdentity(flattenTests(control), flattenTests(injected), 'control↔injected')
  sameExecutionIdentity(flattenTests(injected), flattenTests(restored), 'injected↔restored')
})

// 反例构造：同数量、同 status，仅把 control 里一个 passed 邻居的 fullName 换成
// 不存在的名字（模拟 Codex r10 审计的「换 passed 邻居身份」变异）。
const swapNeighbor = (json) => {
  const cloned = structuredClone(json)
  const leaves = cloned.testResults.flatMap((suite) => suite.assertionResults ?? [])
  const target = leaves.find((leaf) => leaf.status === 'passed' && leaf.fullName.length > 0)
  if (!target) throw new Error('存档中找不到 passed 邻居（夹具不适用）')
  target.fullName = `${target.fullName}（被换邻居）`
  return cloned
}

check('反例：同数量换一个 passed 邻居 fullName → 必须拒收', () => {
  let wronglyAccepted = false
  try {
    sameExecutionIdentity(flattenTests(swapNeighbor(control)), flattenTests(injected), 'control↔injected')
    wronglyAccepted = true
  } catch {
    // 预期拒收
  }
  if (wronglyAccepted) throw new Error('换邻居身份被错误接受（判据失效）')
})

check('反例：dropped 一例（数量变化）→ 必须拒收', () => {
  const cloned = structuredClone(control)
  const suite = cloned.testResults[0]
  suite.assertionResults = suite.assertionResults.slice(0, -1)
  let wronglyAccepted = false
  try {
    sameExecutionIdentity(flattenTests(cloned), flattenTests(injected), 'control↔injected')
    wronglyAccepted = true
  } catch {
    // 预期拒收
  }
  if (wronglyAccepted) throw new Error('数量变化被错误接受')
})

check('钉住旧 bug 语义：suite 直传对换邻居反例恒接受，flatten 后同例必拒', () => {
  const swapped = swapNeighbor(control)
  // 旧调用形态（把 suite 数组当叶集合传）：suite 无 file/fullName，单文件两相各 1 个
  // suite → 双方各折成同一个 undefined::undefined 键 → 多重集相等 → 恒接受。
  let buggyFormAccepted = false
  try {
    sameExecutionIdentity(swapped.testResults, injected.testResults, 'suite-直传')
    buggyFormAccepted = true
  } catch {
    throw new Error('suite 直传形态竟拒收了（与旧 bug 语义不符，检查夹具）')
  }
  if (!buggyFormAccepted) throw new Error('unreachable')
  // 正确调用形态（flattenTests 叶集合）：同一反例必须拒收——这正是 O-R10-01 的修复点。
  let fixedFormAccepted = false
  try {
    sameExecutionIdentity(flattenTests(swapped), flattenTests(injected), 'flatten-直传')
    fixedFormAccepted = true
  } catch {
    // 预期拒收
  }
  if (fixedFormAccepted) throw new Error('flatten 后仍接受换邻居身份（修复未生效）')
})

console.log(`re-adjudicate.selftest: ${passed} passed, ${failedCount} failed`)
process.exitCode = failedCount ? 1 : 0
