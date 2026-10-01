/** Wave O 反控唯一 judge：runner 与 selftest 共同调用本模块，不再各自复制判据。
 *  判据：三态完整 file×fullName 多重集合一致；叶状态白名单；单文件；零执行拒收；
 *  injected 恰一红且精确 file 后缀 + fullName、业务 AssertionError 首帧（未处理异常/
 *  崩溃栈拒收）；exit 必须 0（control/restored）或 1（injected）——其余退出码（含 -1）
 *  一律视为 harness/环境失败拒收；signal/spawn error 拒收；raw 含 Vitest 未处理
 *  异常公告（"Unhandled"）拒收。
 */
export const LEAF_OK = new Set(['passed', 'failed'])

export function isBusinessAssertion(message) {
  return /^AssertionError|^expect\(/.test(message)
}

const hasUnhandledMarker = (raw) =>
  typeof raw === 'string' && /Unhandled (Error|Promise|rejection|exception)/i.test(raw)

const VALID_EXITS = { control: new Set([0]), restored: new Set([0]), injected: new Set([1]) }

const suffix2 = (p) => p.split('/').slice(-2).join('/')

/** 从 vitest JSON reporter 输出展平 {file, fullName, status, failureMessages}。 */
export function flattenTests(json) {
  return (json.testResults ?? []).flatMap((file) =>
    (file.assertionResults ?? []).map((entry) => ({
      file: file.name,
      fullName: entry.fullName,
      status: entry.status,
      failureMessages: entry.failureMessages ?? [],
    })),
  )
}

/** 三相多重执行身份：file×fullName 多重集合 + 逐例状态必须逐位相同。 */
export function sameExecutionIdentity(a, b, label) {
  const key = (t) => `${suffix2(t.file)} :: ${t.fullName}`
  const ms = (tests) => {
    const m = new Map()
    for (const t of tests) m.set(key(t), (m.get(key(t)) ?? 0) + 1)
    return m
  }
  const ma = ms(a)
  const mb = ms(b)
  if (ma.size !== mb.size || [...ma].some(([k, n]) => mb.get(k) !== n))
    throw new Error(`${label} 执行身份（file×fullName 多重集合）不一致`)
  const sa = new Map(a.map((t) => [key(t), t.status]))
  for (const t of b) {
    if (sa.get(key(t)) !== t.status)
      throw new Error(`${label} 状态漂移 ${key(t)}: ${sa.get(key(t))} → ${t.status}`)
  }
  return true
}

/**
 * 核心判据。run = { exitCode, json, stdout, stderr, signal, error }；
 * spec = { test: { file, title }, package }；phase ∈ control|injected|restored。
 * 返回 injected 的目标条目；其余返回 undefined。全部拒收路径 throw。
 */
export function judgePhase(run, spec, phase, ownerPackage) {
  const tests = flattenTests(run.json ?? {})
  if (tests.length === 0) throw new Error(`${phase} 零执行（collection/过滤后为空）拒收`)
  for (const entry of tests) {
    if (!LEAF_OK.has(entry.status))
      throw new Error(
        `${phase} 非叶状态 ${entry.status}（pending/todo/skip）拒收: ${entry.fullName}`,
      )
  }
  if (run.signal) throw new Error(`${phase} 被 signal=${run.signal} 终止拒收`)
  if (run.error) throw new Error(`${phase} spawn 失败拒收: ${String(run.error)}`)
  if (!VALID_EXITS[phase].has(run.exitCode))
    throw new Error(`${phase} 非正常退出码 ${run.exitCode}（harness/环境失败）拒收`)
  for (const raw of [run.stdout, run.stderr]) {
    if (hasUnhandledMarker(raw)) throw new Error(`${phase} raw 含未处理异常公告（Unhandled*）拒收`)
  }
  const files = new Set(tests.map((t) => suffix2(t.file)))
  if (files.size !== 1)
    throw new Error(`${phase} 期望单文件执行，实际 ${files.size} 个文件：${[...files].join(', ')}`)

  const failed = tests.filter((entry) => entry.status === 'failed')
  if (phase !== 'injected') {
    if (failed.length !== 0)
      throw new Error(`${phase} 须全绿：failed=${failed.length}（${failed[0]?.fullName}）`)
    return undefined
  }
  if (failed.length !== 1) throw new Error(`injected 须恰一红：failed=${failed.length}`)
  const target = failed[0]
  const wantedSuffix = suffix2(`packages/${ownerPackage}/${spec.test.file}`)
  if (suffix2(target.file) !== wantedSuffix)
    throw new Error(`红例文件不符: ${suffix2(target.file)} 期望 ${wantedSuffix}`)
  // fullName 精确匹配：组前缀 + ' ' + title，或直接等于 title（无 describe）。
  if (target.fullName !== spec.test.title && !target.fullName.endsWith(` ${spec.test.title}`))
    throw new Error(`红例 fullName 不符（须精确组前缀+title）: ${target.fullName}`)
  const message = target.failureMessages[0] ?? ''
  if (!isBusinessAssertion(message))
    throw new Error(`红例非业务 AssertionError（未处理异常/崩溃拒收）: ${message.slice(0, 200)}`)
  return target
}
