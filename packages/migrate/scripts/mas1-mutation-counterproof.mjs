#!/usr/bin/env node
// TEST-GLM-MIGRATE-ASSET-SUPPLY-1 — migrate 资产供应链 13 针变异反控驱动。
//
// 口径沿用 mt1 r2（判例：pnpm --filter 红相位 banner 污染 JSON → cwd=pkgRoot 裸 pnpm exec；
// biome files.maxSize 上限 → 执行集 artifact 用 TSV；运行期不并发编辑 tracked 文件）：
//   - 每 phase（baseline / 每针 mutant / 每针 restored / final）以 vitest JSON reporter 解析
//     完整 file×fullName×status 执行集，排序落盘 identity artifact，回执记录字节/文件 sha256
//     与集合 sha256（identitySha256）。
//   - 红相位硬门：exit≠0、signal/spawnError null、numFailedTests=1、pending/todo=0、
//     无空断言集失败 suite、唯一失败 fullName 与目标合同精确相等、failureMessages 含
//     指定 AssertionError 片段（console 原文旁证）。
//   - 绿相位硬门：exit 0、全 passed、identitySha256 与 baseline 集合级一致。
//   - 执行集=本卡定向文件（--project unit src/pal-migrate-asset-supply.glm-r1.test.ts）：
//     针间正交性以该集合唯一红证明；全量门禁另见 gates/。
//   - 临时树清理证明：运行前后扫描 os.tmpdir() 的 mas1-supply- 前缀残留（期望 0）。
//   - runner 自测（先于真针）：正例 + 多失败/错 fullName/exit0/pending/collection error/
//     非断言错误/signal/spawn/绿相位集合漂移共 11 例，同一判据函数必须正确拒收/放行。
//
// 干净 checkout 重建：node packages/migrate/scripts/mas1-mutation-counterproof.mjs（约 5 分钟）。
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(repoRoot, 'docs/ops/evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1')
const rawDir = path.join(evidenceDir, 'counterproof-raw')

const directedArgs = ['--project', 'unit', 'src/pal-migrate-asset-supply.glm-r1.test.ts']

const ownNewPaths = [
  'packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts',
  'packages/migrate/scripts/mas1-mutation-counterproof.mjs',
  'docs/ops/evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1',
  'docs/ops/tasks/TEST-GLM-MIGRATE-ASSET-SUPPLY-1.md',
  'docs/ops/evidence/README.md',
]

// 并行 Agent 同树在途交付（reforge 侧其它卡）：非本卡改动、与本卡 7 个目标源无交集，
// 从 clean 判定按前缀豁免，但逐相位快照披露；若出现前缀外意外脏路径仍 fail-loud。
const foreignPrefixes = ['packages/reforge/', 'docs/ops/evidence/TEST-GLM-REFORGE-']
const branchName = 'codex/glm-migrate-asset-supply-r1'
const gateExclusions = []

const injections = [
  {
    id: 'EFFECT-CENSUS',
    file: 'packages/migrate/src/pal-assets.ts',
    anchor: 'PAL 特效精灵基线漂移: assets=',
    mutate: (line) =>
      line.replace('PAL 特效精灵基线漂移: assets=', 'PAL 特效精灵基线漂移!: assets='),
    expectedTest: '56 个合法 gzip 特效源推进到冻结 census 并以精确计数拒绝（bytes/frames 闭包）',
    expectedErrorPart: '特效精灵基线漂移',
  },
  {
    id: 'EFFECT-GZIP-MAGIC',
    file: 'packages/migrate/src/pal-assets.ts',
    anchor: 'throw new Error(`${' + 'spec.label}: 期望 gzip RLE`)',
    mutate: (line) =>
      line.replace(
        'throw new Error(`${' + 'spec.label}: 期望 gzip RLE`)',
        'throw new Error(`${' + 'spec.label} 期望 gzip RLE`)',
      ),
    expectedTest: '物理特效源 gzip magic 缺陷在首文件精确拒绝（首字节 0x1f、次字节非 0x8b）',
    expectedErrorPart: 'PAL 物理命中特效',
  },
  {
    id: 'STORE0-SOURCE-TIERS',
    file: 'packages/migrate/src/pal-store-boundary.ts',
    anchor: 'if (!sameStrings(sourceRewards, PAL_STORE0_REWARD_ITEM_IDS))',
    mutate: (line) =>
      line.replace(
        'if (!sameStrings(sourceRewards, PAL_STORE0_REWARD_ITEM_IDS))',
        'if (false && !sameStrings(sourceRewards, PAL_STORE0_REWARD_ITEM_IDS))',
      ),
    expectedTest: '源 Store0 九档奖励集合漂移（换序）被精确拒绝',
    expectedErrorPart: '源 Store0 九档漂移',
  },
  {
    id: 'GOURD-POOL-COUNT',
    file: 'packages/migrate/src/pal-store-boundary.ts',
    anchor: 'item270 resource pool 数量 ${' + 'effects.length} != 1',
    mutate: (line) =>
      line.replace(
        'item270 resource pool 数量 ${' + 'effects.length} != 1',
        'item270 resource pool 数量 ${' + 'effects.length} != 2',
      ),
    expectedTest: 'item270 携带两个资源池被精确拒绝（数量 != 1）',
    expectedErrorPart: 'PAL Store0 invariant: item270',
  },
  {
    id: 'VESSEL-CRAFT-COUNT',
    file: 'packages/migrate/src/pal-store-boundary.ts',
    anchor: 'item268 craftRecipe=${' + 'craftEffects.length}/',
    mutate: (line) =>
      line.replace(
        'item268 craftRecipe=${' + 'craftEffects.length}/',
        'item268 craft=${' + 'craftEffects.length}/',
      ),
    expectedTest: 'item268 craft 数量与配方数量漂移逐轴精确拒绝',
    expectedErrorPart: 'PAL Store0 invariant: item268 craft',
  },
  {
    id: 'ENCODE-LAYER0-RANGE',
    file: 'packages/migrate/src/project-map-converter.ts',
    anchor: 'layer0 tile 超出旧格式可回编码范围',
    mutate: (line) =>
      line.replace('layer0 tile 超出旧格式可回编码范围', 'layer0 tile 超出旧格式编码范围'),
    expectedTest: 'encodeProjectMapWord 三域越界（layer0 tile / layer1 tile / height）逐轴精确拒绝',
    expectedErrorPart: 'layer0 tile 超出旧格式',
  },
  {
    id: 'SOURCE-WORD-LAYERS',
    file: 'packages/migrate/src/project-map-converter.ts',
    anchor: "if (!lower || !upper) throw new Error('源图回编码要求 layer-0/layer-1 两层')",
    mutate: (line) =>
      line.replace(
        "if (!lower || !upper) throw new Error('源图回编码要求 layer-0/layer-1 两层')",
        "if (!lower) throw new Error('源图回编码要求 layer-0/layer-1 两层')",
      ),
    expectedTest: 'sourceWordFromProjectMap 缺 layer-1 时精确拒绝',
    expectedErrorPart: '源图回编码要求',
  },
  {
    id: 'POOL-MESSAGE-MISSING-CURRENT',
    file: 'packages/migrate/src/pal-authored-overlays.ts',
    anchor: 'PAL generated resource message: current 缺物品',
    mutate: (line) =>
      line.replace(
        'PAL generated resource message: current 缺物品',
        'PAL generated resource message: current 缺物品!',
      ),
    expectedTest: 'generated 池消息指向 current 缺失物品时 fail-loud',
    expectedErrorPart: 'PAL generated resource message',
  },
  {
    id: 'POOL-MESSAGE-SYNC',
    file: 'packages/migrate/src/pal-authored-overlays.ts',
    anchor: 'const currentPool = currentPools[index]',
    mutate: (line) =>
      line.replace(
        'const currentPool = currentPools[index]',
        'const currentPool = currentPools[0]',
      ),
    expectedTest: '姐妹池仅同步带 message 的那条：对位不同步、作者字段保留、current 输入不可变',
    expectedErrorPart: '资源不足',
  },
  {
    id: 'CASUALTY-0x05-OPERANDS',
    file: 'packages/migrate/src/pal-casualty-scripts.ts',
    anchor: '0x05 参数非空',
    mutate: (line) => line.replace('0x05 参数非空', '0x05 参数非空X'),
    expectedTest: '0x05 重绘指令参数非空被精确拒绝（0x06 门两元 operands 合法）',
    expectedErrorPart: '0x05 参数非空',
  },
  {
    id: 'CASUALTY-BATTLER-GUARD',
    file: 'packages/migrate/src/pal-casualty-scripts.ts',
    anchor:
      'if (!actor?.battler) throw new Error(`B11-1 casualty: 角色 ${' + 'roleIndex} 缺 battler`)',
    mutate: (line) =>
      line.replace(
        'if (!actor?.battler) throw new Error(`B11-1 casualty: 角色 ${' + 'roleIndex} 缺 battler`)',
        'if (false && !actor?.battler) throw new Error(`B11-1 casualty: 角色 ${' +
          'roleIndex} 缺 battler`)',
      ),
    expectedTest: '伤亡入口角色缺 battler 时 fail-closed',
    expectedErrorPart: '缺 battler',
  },
  {
    id: 'OVERLAY-EVIDENCE-SOURCE',
    file: 'packages/migrate/src/pal-world-sprite-registry.ts',
    anchor: "source: 'pal-overlay',",
    mutate: (line) => line.replace("source: 'pal-overlay',", "source: 'scene',"),
    expectedTest:
      'overlay 精灵被场景引用时以 overlay 证据物化中性 id；异布局场景证据建 -f 变体并报告冲突',
    expectedErrorPart: 'pal-overlay',
  },
  {
    id: 'PUBLICATION-REFERENCE-GATE',
    file: 'packages/migrate/src/pal-current-publication.ts',
    anchor: 'PAL current 跨引用失败',
    mutate: (line) => line.replace('PAL current 跨引用失败', 'PAL current 跨引用失败X'),
    expectedTest: '发布商店引用未知物品时 validateReferences 以精确 where 拒绝',
    expectedErrorPart: 'PAL current 跨引用失败',
  },
]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// ── 判据函数（自测与真针共用同一实现） ────────────────────────────────────────────

const countsIssues = (phase) => {
  const issues = []
  const c = phase.counts ?? {}
  if (phase.exitCode === 0) issues.push('exit 0（未红/假绿）')
  if (phase.signal !== null) issues.push(`signal=${phase.signal}`)
  if (phase.spawnError !== null) issues.push(`spawnError=${phase.spawnError}`)
  if (c.numFailedTests !== 1) issues.push(`numFailedTests=${c.numFailedTests} ≠ 1`)
  if (c.numPendingTests !== 0) issues.push(`numPendingTests=${c.numPendingTests} ≠ 0`)
  if (c.numTodoTests !== 0) issues.push(`numTodoTests=${c.numTodoTests} ≠ 0`)
  if (phase.success !== false) issues.push('success≠false')
  return issues
}

const validateRedPhase = (phase, expectedFullName, expectedErrorPart, consoleText = '') => {
  const issues = [...countsIssues(phase)]
  if (!Number.isFinite(phase.identity?.rows) || phase.identity.rows <= 0)
    issues.push('identity 执行集为空（vacuous）')
  for (const suite of phase.suites ?? [])
    if (suite.status === 'failed' && suite.assertionCount === 0)
      issues.push(`collection/runtime error suite: ${suite.name}`)
  const failedRows = phase.identity?.failedRows ?? []
  if (failedRows.length !== 1) {
    issues.push(`failed 行数 ${failedRows.length} ≠ 1`)
  } else if (failedRows[0].fullName !== expectedFullName) {
    issues.push(
      `唯一失败 fullName 不精确等于目标合同：got ${JSON.stringify(failedRows[0].fullName)}`,
    )
  }
  const red = failedRows[0]
  if (red) {
    const messages = red.messages ?? []
    if (messages.length === 0) issues.push('失败无 failureMessages')
    else if (!messages.some((m) => m.includes('AssertionError')))
      issues.push('指定失败非 AssertionError')
    else {
      const part = expectedErrorPart.replace(/["']/g, '')
      const hay = messages.join('\n').replace(/["']/g, '')
      if (!hay.includes(part)) issues.push(`失败消息不含指定片段 ${expectedErrorPart}`)
    }
    const consoleHay = consoleText.replace(/["']/g, '')
    if (!consoleHay.includes('AssertionError')) issues.push('console 原文无 AssertionError 旁证')
    else if (!consoleHay.includes(expectedErrorPart.replace(/["']/g, '')))
      issues.push('console 原文不含指定片段旁证')
  }
  return issues
}

const validateGreenPhase = (phase, baselineIdentitySha) => {
  const issues = []
  if (phase.exitCode !== 0) issues.push(`exit=${phase.exitCode} ≠ 0`)
  if (phase.signal !== null) issues.push(`signal=${phase.signal}`)
  if (phase.spawnError !== null) issues.push(`spawnError=${phase.spawnError}`)
  const c = phase.counts ?? {}
  if (c.numFailedTests !== 0) issues.push(`numFailedTests=${c.numFailedTests} ≠ 0`)
  if (c.numPendingTests !== 0) issues.push(`numPendingTests=${c.numPendingTests} ≠ 0`)
  if (c.numTodoTests !== 0) issues.push(`numTodoTests=${c.numTodoTests} ≠ 0`)
  if (phase.success !== true) issues.push('success≠true')
  if (phase.identity?.failedRows?.length) issues.push('identity 含 failed 行')
  for (const suite of phase.suites ?? [])
    if (suite.status === 'failed' || suite.assertionCount === 0)
      issues.push(`异常 suite: ${suite.name}(${suite.status}/${suite.assertionCount})`)
  if (phase.identity?.identitySha256 !== baselineIdentitySha)
    issues.push(
      `identity 集合与 baseline 不一致：${phase.identity?.identitySha256?.slice(0, 12)} ≠ ${baselineIdentitySha.slice(0, 12)}`,
    )
  return issues
}

// ── runner 自测：合成 phase 必须被同一判据正确拒收/放行 ──────────────────────────

const selfTest = () => {
  const targetFullName =
    'MAS1 effect-sprites 分区闭包（经 loadPalAssets 公开入口） 56 个合法 gzip 特效源推进到冻结 census 并以精确计数拒绝（bytes/frames 闭包）'
  const otherFullName = 'MAS1 effect-sprites 分区闭包（经 loadPalAssets 公开入口） 其它合同'
  const baseIdentity = (failedRows) => ({
    rows: 15,
    identitySha256: 'a'.repeat(64),
    failedRows,
  })
  const redRow = (fullName, messages) => ({ file: 'x.test.ts', fullName, messages })
  const baseCounts = (over = {}) => ({
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    ...over,
  })
  const greenBase = {
    exitCode: 0,
    signal: null,
    spawnError: null,
    success: true,
    counts: baseCounts({ numFailedTests: 0 }),
    suites: [{ name: 'x.test.ts', status: 'passed', assertionCount: 3 }],
    identity: baseIdentity([]),
  }
  const okRed = {
    exitCode: 1,
    signal: null,
    spawnError: null,
    success: false,
    counts: baseCounts(),
    suites: [{ name: 'x.test.ts', status: 'failed', assertionCount: 3 }],
    identity: baseIdentity([
      redRow(targetFullName, ['AssertionError: expected ... 特效精灵基线漂移 ...']),
    ]),
  }
  const cases = [
    {
      case: 'valid-red-accept',
      expect: 'accept',
      issues: validateRedPhase(
        okRed,
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'two-failures-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          counts: baseCounts({ numFailedTests: 2 }),
          identity: baseIdentity([
            redRow(targetFullName, ['AssertionError: 特效精灵基线漂移']),
            redRow(otherFullName, ['AssertionError: expected 1 to be 2']),
          ]),
        },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'wrong-fullname-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: baseIdentity([redRow(otherFullName, ['AssertionError: 特效精灵基线漂移'])]),
        },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'exit-zero-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, exitCode: 0, success: true },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'pending-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, counts: baseCounts({ numPendingTests: 1 }) },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'collection-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          suites: [
            { name: 'broken.test.ts', status: 'failed', assertionCount: 0 },
            { name: 'x.test.ts', status: 'passed', assertionCount: 3 },
          ],
        },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'non-assertion-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: baseIdentity([
            redRow(targetFullName, ['TypeError: cannot read props of undefined']),
          ]),
        },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'signal-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, signal: 'SIGKILL' },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'spawn-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, spawnError: 'spawn pnpm ENOENT' },
        targetFullName,
        '特效精灵基线漂移',
        'AssertionError: 特效精灵基线漂移',
      ),
    },
    {
      case: 'green-identity-mismatch-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        { ...greenBase, identity: { ...greenBase.identity, identitySha256: 'b'.repeat(64) } },
        'a'.repeat(64),
      ),
    },
    {
      case: 'valid-green-accept',
      expect: 'accept',
      issues: validateGreenPhase(greenBase, greenBase.identity.identitySha256),
    },
  ]
  return cases.map((c) => ({
    case: c.case,
    expect: c.expect,
    issueCount: c.issues.length,
    ok: c.expect === 'accept' ? c.issues.length === 0 : c.issues.length > 0,
    issues: c.issues,
  }))
}

// ── vitest 相位驱动 ────────────────────────────────────────────────────────────

const envSummary = () => ({
  nodeVersion: process.version,
  NODE_COMPILE_CACHE: 'deleted',
  cwd: pkgRoot,
})

const runVitest = (args) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const argv = ['exec', 'vitest', 'run', ...args]
  const proc = spawnSync('pnpm', argv, {
    cwd: pkgRoot,
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
    env,
    timeout: 600_000,
  })
  return { argv, proc }
}

const writeRaw = async (file, text) => {
  const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
  await writeFile(file, normalized)
  return {
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha256: sha256(Buffer.from(normalized, 'utf8')),
  }
}

const parseJson = (proc, label) => {
  let parsed
  try {
    parsed = JSON.parse(proc.stdout?.toString('utf8') ?? '')
  } catch {
    throw new Error(`[${label}] vitest json 输出不可解析`)
  }
  return parsed
}

const identityPhase = async (label, args, artifactName) => {
  const { argv, proc } = runVitest([...args, '--reporter=json'])
  const parsed = parseJson(proc, label)
  const rows = []
  const failedRows = []
  const suites = []
  for (const suite of parsed.testResults ?? []) {
    const assertionCount = (suite.assertionResults ?? []).length
    suites.push({ name: suite.name, status: suite.status, assertionCount })
    for (const tc of suite.assertionResults ?? []) {
      rows.push({ file: suite.name, fullName: tc.fullName, status: tc.status })
      if (tc.status === 'failed')
        failedRows.push({
          file: suite.name,
          fullName: tc.fullName,
          messages: tc.failureMessages ?? [],
        })
    }
  }
  if (!parsed.numTotalTests) throw new Error(`[${label}] vacuous 运行:零测试被收集/执行`)
  rows.sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.fullName < b.fullName ? -1 : 1,
  )
  const identityText = `${rows.map((r) => `${r.file}\t${r.fullName}\t${r.status}`).join('\n')}\n`
  const identityBytes = Buffer.from(identityText, 'utf8')
  const identitySha256 = sha256(identityBytes)
  const artifactPath = path.join(rawDir, artifactName)
  await writeFile(artifactPath, identityBytes)
  const counts = {
    numTotalTests: parsed.numTotalTests,
    numPassedTests: parsed.numPassedTests,
    numFailedTests: parsed.numFailedTests,
    numPendingTests: parsed.numPendingTests,
    numTodoTests: parsed.numTodoTests,
    numTotalTestSuites: parsed.numTotalTestSuites,
    numFailedTestSuites: parsed.numFailedTestSuites,
  }
  return {
    label,
    argv: ['pnpm', ...argv],
    env: envSummary(),
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    success: parsed.success,
    counts,
    suites,
    identity: {
      rows: rows.length,
      identitySha256,
      failedRows,
      artifact: {
        path: path.relative(evidenceDir, artifactPath),
        format: 'tsv: file<TAB>fullName<TAB>status per row, sorted by (file, fullName)',
        bytes: identityBytes.length,
        sha256: identitySha256,
      },
    },
  }
}

const consolePhase = async (label, args) => {
  const { argv, proc } = runVitest(args)
  const text = `${proc.stdout?.toString('utf8') ?? ''}\n${proc.stderr?.toString('utf8') ?? ''}`
  const base = path.join(rawDir, label)
  const stat = await writeRaw(`${base}.console`, text)
  return {
    label,
    argv: ['pnpm', ...argv],
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    artifacts: { console: { ...stat, path: path.relative(evidenceDir, `${base}.console`) } },
    text,
  }
}

function assertTreeClean(tag, targetHashes = new Map()) {
  const currentBranch = execFileSync('git', ['branch', '--show-current'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()
  if (currentBranch !== branchName)
    throw new Error(`[${tag}] 工作树分支被切走: ${currentBranch} ≠ ${branchName}`)
  for (const [file, hash] of targetHashes)
    if (
      sha256(execFileSync('git', ['show', `:${file}`], { cwd: repoRoot, encoding: 'utf8' })) !==
      hash
    )
      throw new Error(`[${tag}] 目标源 index 态漂移: ${file}`)
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  const rows = out
    .split('\n')
    .filter((row) => row.trim().length > 3)
    .filter((row) => {
      const p = row.slice(3).split(' -> ')[0]
      if (ownNewPaths.some((own) => p === own || p.startsWith(`${own}/`))) return false
      const foreign = foreignPrefixes.some((prefix) => p.startsWith(prefix))
      if (foreign) {
        gateExclusions.push({ tag, path: p })
        return false
      }
      return true
    })
  if (rows.length) throw new Error(`[${tag}] 工作树非 clean: ${JSON.stringify(rows)}`)
}

const tmpResidue = async () =>
  (await readdir(tmpdir())).filter((name) => name.startsWith('mas1-supply-')).sort()

let here = null
try {
  assertTreeClean('pre')
  const selfTestResults = selfTest()
  const selfTestAllOk = selfTestResults.every((c) => c.ok)
  if (!selfTestAllOk)
    throw new Error(
      `runner 自测未过: ${JSON.stringify(selfTestResults.filter((c) => !c.ok).map((c) => c.case))}`,
    )

  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  here = await mkdtemp(path.join(tmpdir(), 'mas1-counterproof-'))
  const tmpBefore = await tmpResidue()

  const originals = new Map()
  const targetIndexHashes = new Map()
  for (const injection of injections) {
    if (originals.has(injection.file)) continue
    const abs = path.join(repoRoot, injection.file)
    const original = await readFile(abs, 'utf8')
    originals.set(injection.file, { abs, original, hash: sha256(Buffer.from(original, 'utf8')) })
    targetIndexHashes.set(
      injection.file,
      sha256(
        execFileSync('git', ['show', `:${injection.file}`], { cwd: repoRoot, encoding: 'utf8' }),
      ),
    )
  }
  assertTreeClean('targets', targetIndexHashes)

  const baseline = await identityPhase('baseline', directedArgs, 'baseline.identity.tsv')
  const baselineIssues = validateGreenPhase(baseline, baseline.identity.identitySha256)
  if (baselineIssues.length) throw new Error(`[baseline] 基线非绿: ${baselineIssues.join('; ')}`)

  const baselineTsv = await readFile(path.join(rawDir, 'baseline.identity.tsv'), 'utf8')
  const expectedFullNames = {}
  for (const injection of injections) {
    const matches = baselineTsv
      .split('\n')
      // 判例：vitest JSON reporter 的 fullName 以空格连接 describe/test（非 ' > '）。
      .filter((line) => line.split('\t')[1]?.endsWith(injection.expectedTest))
    if (matches.length !== 1)
      throw new Error(
        `[${injection.id}] 基线执行集中 ${injection.expectedTest} 匹配 ${matches.length} 条 ≠ 1`,
      )
    expectedFullNames[injection.id] = matches[0].split('\t')[1]
  }

  const receipts = []
  for (const injection of injections) {
    const { abs, original, hash: originalHash } = originals.get(injection.file)
    const lines = original.split('\n')
    const hits = lines.filter((line) => line.includes(injection.anchor))
    if (hits.length !== 1) throw new Error(`[${injection.id}] 锚点命中 ${hits.length} 行,拒绝注入`)
    const mutant = lines
      .map((line) => (line.includes(injection.anchor) ? injection.mutate(line) : line))
      .join('\n')
    if (mutant === original) throw new Error(`[${injection.id}] 变异未生效`)

    const mutantHash = sha256(Buffer.from(mutant, 'utf8'))
    let redJson = null
    let redConsole = null
    try {
      await writeFile(abs, mutant)
      redJson = await identityPhase(
        `${injection.id}.mutant`,
        directedArgs,
        `${injection.id}.mutant.identity.tsv`,
      )
      redConsole = await consolePhase(`${injection.id}.mutant`, directedArgs)
    } finally {
      await writeFile(abs, original)
    }
    const redIssues = validateRedPhase(
      redJson,
      expectedFullNames[injection.id],
      injection.expectedErrorPart,
      redConsole.text,
    )

    const restoredHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (restoredHash !== originalHash) throw new Error(`[${injection.id}] 恢复字节与原始不一致`)
    const restored = await identityPhase(
      `${injection.id}.restored`,
      directedArgs,
      `${injection.id}.restored.identity.tsv`,
    )
    const restoredIssues = validateGreenPhase(restored, baseline.identity.identitySha256)

    const rebuiltHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (rebuiltHash !== originalHash) throw new Error(`[${injection.id}] rebuilt hash 不一致`)

    receipts.push({
      id: injection.id,
      file: injection.file,
      anchor: injection.anchor,
      expectedTest: injection.expectedTest,
      expectedFullName: expectedFullNames[injection.id],
      expectedErrorPart: injection.expectedErrorPart,
      original: { hash: originalHash },
      mutant: {
        hash: mutantHash,
        phase: redJson,
        consolePhase: { ...redConsole, text: undefined },
        issues: redIssues,
      },
      restored: { sourceHash: restoredHash, phase: restored, issues: restoredIssues },
      rebuilt: { hash: rebuiltHash },
      pass: redIssues.length === 0 && restoredIssues.length === 0,
    })
    assertTreeClean(`post-${injection.id}`, targetIndexHashes)
  }

  const finalReplay = await identityPhase('final-replay', directedArgs, 'final-replay.identity.tsv')
  const finalIssues = validateGreenPhase(finalReplay, baseline.identity.identitySha256)

  const tmpAfter = await tmpResidue()
  const tmpClean = tmpBefore.length === 0 && tmpAfter.length === 0

  const allPass =
    receipts.every((r) => r.pass) && finalIssues.length === 0 && selfTestAllOk && tmpClean
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    executionSet:
      'pnpm exec vitest run --project unit src/pal-migrate-asset-supply.glm-r1.test.ts（cwd=packages/migrate，--reporter=json）',
    selfTest: { cases: selfTestResults, allOk: selfTestAllOk },
    baseline,
    injections: receipts,
    finalReplay: { phase: finalReplay, issues: finalIssues },
    tmpTree: {
      fixturePrefix: 'mas1-supply-',
      residueBefore: tmpBefore,
      residueAfter: tmpAfter,
      clean: tmpClean,
      runnerTmp: { created: here, removedInFinally: true },
    },
    allPass,
    ownNewPathsExcluded: ownNewPaths,
    concurrentForeignWork: {
      note: '并行卡（reforge 侧）同树在途交付；按前缀豁免 clean 判定，逐相位披露，与本卡目标源/交付零交集',
      excludedPrefixes: foreignPrefixes,
      gateExclusions,
    },
  }
  const outPath = path.join(evidenceDir, 'counterproof.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (!allPass)
    throw new Error(
      `反控存在未过项: ${JSON.stringify(
        receipts
          .filter((r) => !r.pass)
          .map((r) => ({ id: r.id, red: r.mutant.issues, restored: r.restored.issues }))
          .concat(finalIssues.length ? [{ id: 'final-replay', issues: finalIssues }] : [])
          .concat(
            tmpClean ? [] : [{ id: 'tmp-residue', issues: { before: tmpBefore, after: tmpAfter } }],
          ),
      )}`,
    )
  console.log(`mas1 counterproof: ${receipts.length}/${receipts.length} PASS → ${outPath}`)
} finally {
  if (here) await rm(here, { recursive: true, force: true })
}
