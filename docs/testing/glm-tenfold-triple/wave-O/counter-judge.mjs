/** Wave O 反控唯一 judge：runner 与 selftest 共同调用本模块，不再各自复制判据。
 *
 *  正确语义（r8 审核修正）：
 *  - 三相执行身份（file×fullName 多重集合）必须完全一致；但**各例状态按相判**——
 *    正常完整生命周期是 control 全 passed → injected 目标恰一 failed → restored 全
 *    passed，跨相状态变化是业务预期，不得强求相同。
 *  - injected 目标匹配用**显式完整目标 fullName**（spec.test.target；兼容旧
 *    spec.test.title 字段做迁移），不再用短 title 的 endsWith/includes 近似。
 *  - collection/runtime 总门：numTotalTestSuites≠numPassedTestSuites+numFailedTestSuites、
 *    numRuntimeErrorTestSuites>0、numPendingTestSuites>0、空断言 failed suite、
 *    exit 码非 {0,1}、signal、spawn error、raw Unhandled 公告一律拒收。
 */
export const LEAF_OK = new Set(['passed', 'failed'])

export function isBusinessAssertion(message) {
  return /^AssertionError|^expect\(/.test(message)
}

const hasUnhandledMarker = (raw) =>
  typeof raw === 'string' && /Unhandled (Error|Promise|rejection|exception)/i.test(raw)

const VALID_EXITS = { control: new Set([0]), restored: new Set([0]), injected: new Set([1]) }

/**
 * r9 修正：只剥离临时 checkout 前缀（/var/folders/.../glm-o-cc-*-XXXX 或
 * /Users/.../.codex/worktrees/<name>/type-pal），保留完整 packages/包/子路径。
 * 不再用末两段 suffix2（丢失包与上游目录，异包误收）。
 */
const CHECKOUT_MARKERS = ['/glm-o-cc-control-', '/glm-o-cc-injected-']
const WORKTREE_MARKER = '/type-pal/'
export function normalizeTestPath(p) {
  const asIs = String(p).split('\\').join('/')
  for (const marker of CHECKOUT_MARKERS) {
    const at = asIs.indexOf(marker)
    // 临时 checkout：marker 之后是自建仓库根（= checkout 目录本身），紧接 packages/...
    if (at >= 0) return asIs.slice(asIs.indexOf('/packages/', at) + 1)
  }
  const at = asIs.indexOf(WORKTREE_MARKER)
  if (at >= 0) return asIs.slice(at + WORKTREE_MARKER.length)
  // 自测/其它无 marker 路径：取 'packages/...' 尾段
  const pk = asIs.indexOf('packages/')
  if (pk >= 0) return asIs.slice(pk)
  return asIs
}

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

/** 三相多重执行身份：file×fullName 多重集合必须逐位一致（状态按各相政策另行判）。 */
export function sameExecutionIdentity(a, b, label) {
  const key = (t) => `${normalizeTestPath(t.file)} :: ${t.fullName}`
  const ms = (tests) => {
    const m = new Map()
    for (const t of tests) m.set(key(t), (m.get(key(t)) ?? 0) + 1)
    return m
  }
  const ma = ms(a)
  const mb = ms(b)
  if (ma.size !== mb.size || [...ma].some(([k, n]) => mb.get(k) !== n))
    throw new Error(`${label} 执行身份（file×fullName 多重集合）不一致`)
  return true
}

/** collection/runtime 总门：JSON 顶层计数与 suite 级异常/空断言形态全部拒收。 */
export function assertNoCollectionErrors(json, phase) {
  // r9 修正：顶层执行数必须与实际叶集合闭合（numTotalTests 增1而叶不变 → 拒收）
  const leafCount = (json.testResults ?? []).reduce(
    (sum, suite) => sum + (suite.assertionResults?.length ?? 0),
    0,
  )
  if (Number.isInteger(json.numTotalTests) && json.numTotalTests !== leafCount)
    throw new Error(
      `${phase} 顶层执行数 ${json.numTotalTests} ≠ 叶集合 ${leafCount}（虚假执行数）拒收`,
    )
  if (json.numRuntimeErrorTestSuites > 0)
    throw new Error(`${phase} numRuntimeErrorTestSuites=${json.numRuntimeErrorTestSuites} 拒收`)
  if (json.numPendingTestSuites > 0)
    throw new Error(
      `${phase} numPendingTestSuites=${json.numPendingTestSuites}（pending/todo suite）拒收`,
    )
  if (json.numTODOTests > 0) throw new Error(`${phase} numTODOTests=${json.numTODOTests} 拒收`)
  const suites = json.testResults ?? []
  // Vitest 的 numPassed/numFailedTestSuites 是全 workspace 计数（可 > 单文件 testResults 长度，
  // 因 --filter 传入包内其它 suite）；只要求结论数 ≥ 报告 suite 数，不要求相等。
  const concluded = json.numPassedTestSuites + json.numFailedTestSuites
  if (suites.length > 0 && concluded < suites.length)
    throw new Error(
      `${phase} suite 结论数 ${concluded} < 报告 suite 数 ${suites.length}（collection 失败）拒收`,
    )
  if (
    Number.isInteger(json.numTotalTestSuites) &&
    json.numTotalTestSuites > 0 &&
    json.numPassedTestSuites + json.numFailedTestSuites + (json.numPendingTestSuites ?? 0) <
      json.numTotalTestSuites
  )
    throw new Error(
      `${phase} 全 workspace ${json.numTotalTestSuites} suite 中 ${json.numTotalTestSuites - json.numPassedTestSuites - json.numFailedTestSuites - (json.numPendingTestSuites ?? 0)} 个未结（collection/过滤失败）拒收`,
    )
  for (const suite of suites) {
    if (suite.status === 'failed' && (suite.assertionResults ?? []).length === 0)
      throw new Error(`${phase} 空断言 failed suite（runtime/collection 错误）拒收: ${suite.name}`)
    if (suite.status && suite.status !== 'failed' && suite.status !== 'passed')
      throw new Error(`${phase} suite 状态 ${suite.status} 拒收: ${suite.name}`)
  }
}

/** 目标精确匹配：spec.test.target（完整 fullName）或兼容迁移字段 spec.test.title
 *  在「组前缀 + ' ' + title」或「裸 title」两种形态下精确等于目标 fullName。 */
export function isExactTarget(fullName, specTest) {
  const target = specTest.target
  if (target !== undefined) return fullName === target
  const title = specTest.title
  return fullName === title || fullName.endsWith(` ${title}`)
}

/**
 * 核心判据。run = { exitCode, json, stdout, stderr, signal, error }；
 * spec = { test: { file, target?, title? }, package }；phase ∈ control|injected|restored。
 */
export function judgePhase(run, spec, phase, ownerPackage) {
  assertNoCollectionErrors(run.json ?? {}, phase)
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
  const files = new Set(tests.map((t) => normalizeTestPath(t.file)))
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
  const wantedPath = normalizeTestPath(`packages/${ownerPackage}/${spec.test.file}`)
  const targetPath = normalizeTestPath(target.file)
  if (targetPath !== wantedPath)
    throw new Error(`红例文件不符: ${targetPath} 期望 ${wantedPath}`)
  if (!isExactTarget(target.fullName, spec.test))
    throw new Error(
      `红例 fullName 不符（精确完整目标匹配，spec.test.target=${JSON.stringify(spec.test.target ?? spec.test.title)}）: ${target.fullName}`,
    )
  const message = target.failureMessages[0] ?? ''
  if (!isBusinessAssertion(message))
    throw new Error(`红例非业务 AssertionError（未处理异常/崩溃拒收）: ${message.slice(0, 200)}`)
  return target
}
