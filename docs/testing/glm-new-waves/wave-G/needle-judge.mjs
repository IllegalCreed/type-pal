/**
 * TEST-GLM-NEW-G-1 反控判据 v2（loader 注入；绝不写正式生产源）。
 *
 * 机制：为每针在 /tmp 生成一次性 vitest 配置（唯一 cacheDir），配置内 pre-load 插件
 * 对**精确目标模块**返回内存中的突变源码——磁盘生产文件零写入；基线/注入两跑均
 * 整文件执行（无 -t，杜绝 skipped 伪绿）。
 *
 * 判据（全部满足才 valid，任一违反 invalid）：
 *   基线：exit===0；目标断言恰 passed；文件内零 failed/skipped/todo，执行数===总数>0；
 *         testResults 恰 1 条且 name===测试文件绝对路径。
 *   注入：exit===1（拒绝 0/2+/null）；恰 1 条 failed 且其绝对 file+fullName 与期望
 *         全等；其余全 passed；零 skipped/todo；执行数===总数>0（拒绝零执行/超时）；
 *         文件名约束同基线。
 *   产品：目标源码 SHA256 注入前后一致（全程未写盘）；收尾 `git status --porcelain`
 *         为空（整个工作树无残留）；tmp 配置目录用后即删。
 *
 * 自测：--self-test 场景组（基线红/exit0/exit2/双红/错 fullName/错文件/skipped/
 *       零执行/hash 漂移/好例）验证同一判据函数的拒绝能力，结果并入 verdicts。
 * 用法：node docs/testing/glm-new-waves/wave-G/needle-judge.mjs
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const reforgeRoot = resolve(repoRoot, 'packages/reforge')
const outDir = resolve(repoRoot, 'docs/testing/glm-new-waves/wave-G')
const needleTmpRoot = '/tmp/type-pal-glm-new-wave/G/needle'
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const NEEDLES = [
  {
    id: 'G-N1',
    target: 'packages/reforge/src/battle/battle-session.ts',
    fault: [
      'if (assets.playerBaseDefinitionIds.length !== players.length)',
      'if (false && assets.playerBaseDefinitionIds.length !== players.length)',
    ],
    testFile: 'src/battle/battle-session.glm-next-wave.test.ts',
    fullName:
      'G01 battle-session 公开边界残差 playerBaseDefinitionIds 长度与 players 不符在构造边界 fail-loud（battle-session.ts:373）',
    rationale: '构造边界 playerBaseDefinitionIds 长度守卫失效 → 负控必须业务红',
  },
  {
    id: 'G-N2',
    target: 'packages/reforge/src/screen-fx.ts',
    fault: ['if (shift > 0 && shift < w) {', 'if (shift > 0) {'],
    testFile: 'src/screen-fx.glm-next-wave.test.ts',
    fullName:
      'G06 screen-fx 波动背景缓存残差 shift ≥ w（小画布大波幅）走整行复制 else 臂；0<shift<w 对照两段卷行',
    rationale: 'shift≥w 整行复制 else 臂被绕过 → 波动卷行合同红',
  },
  {
    id: 'G-N3',
    target: 'packages/reforge/src/battle-trial-host.ts',
    fault: [
      "if (!canvas || !ctx) throw new Error('独立试打缺少可用画布')",
      "if (!canvas || !ctx) throw new Error('独立试打画布缺失（注入）')",
    ],
    testFile: 'src/battle-trial-host.glm-next-wave.test.ts',
    fullName: '无 #screen 画布时入口精确 fail-loud（battle-trial-host.ts:33）',
    rationale: 'trial host 入口画布守卫消息漂移 → 精确消息合同红',
  },
  {
    id: 'G-N4',
    target: 'packages/reforge/src/magic-menu-state.ts',
    fault: ["eff.curesTier ?? 'common'", "eff.curesTier ?? 'severe'"],
    testFile: 'src/magic-menu-state.glm-next-wave.test.ts',
    fullName:
      'G05 magic-menu-state 残差 curePoison 缺 curesTier 对 severe 毒：保留毒、零效果不扣 MP',
    rationale:
      'curePoison 缺省 tier 漂移为 severe → severe 毒被误解、保留毒臂红（common 解毒臂不受影响，证明针尖精确）',
  },
]

/** 判据纯函数：自测反例与真实裁决共用同一实现。 */
export function evaluateVerdict(expectation, baseline, injected) {
  const problems = []
  const rowsOf = (run) => run.json?.testResults ?? []
  const assertionsOf = (run) => rowsOf(run).flatMap((file) => file.assertionResults ?? [])
  for (const phase of ['baseline', 'injected']) {
    const run = phase === 'baseline' ? baseline : injected
    if (run.json === null) problems.push(`${phase}: JSON 解析失败`)
    if (rowsOf(run).length !== 1)
      problems.push(`${phase}: testResults 恰 1 条，实际 ${rowsOf(run).length}`)
    const first = rowsOf(run)[0]
    if (first && first.name !== expectation.testFileAbs)
      problems.push(`${phase}: 测试文件非绝对期望路径 ${first.name}`)
    const rows = assertionsOf(run)
    const executedRows = rows.filter((row) => row.status !== 'skipped' && row.status !== 'todo')
    if (rows.length === 0 || executedRows.length === 0) problems.push(`${phase}: 零执行`)
    if (executedRows.length !== rows.length)
      problems.push(`${phase}: 存在 skipped/todo（执行 ${executedRows.length}/${rows.length}）`)
    if (rows.length !== expectation.fileTotal)
      problems.push(`${phase}: 执行总数 ${rows.length} ≠ 文件测试数 ${expectation.fileTotal}`)
    if (phase === 'baseline') {
      if (run.exit !== 0) problems.push(`baseline: exit ${run.exit} ≠ 0`)
      if (rows.some((row) => row.status === 'failed')) problems.push('baseline: 存在 failed')
      const hit = rows.find((row) => row.fullName === expectation.fullName)
      if (!hit || hit.status !== 'passed')
        problems.push(`baseline: 目标 fullName 未 passed（${hit?.status ?? '缺失'}）`)
    } else if (run.exit !== 1) {
      problems.push(`injected: exit ${run.exit} ≠ 1（拒绝 exit0/exit2/崩溃）`)
    } else {
      const failed = rows.filter((row) => row.status === 'failed')
      if (failed.length !== 1) problems.push(`injected: 恰 1 条 failed，实际 ${failed.length}`)
      const hit = failed[0]
      if (!hit || hit.fullName !== expectation.fullName)
        problems.push(`injected: 失败 fullName 不精确（${hit?.fullName ?? '缺失'}）`)
    }
  }
  if (injected.hashBefore !== injected.hashAfter)
    problems.push('product: 目标源码 SHA256 注入前后不一致')
  return { valid: problems.length === 0, problems }
}

function runVitest(rundir, testFileAbs, configPath) {
  const outputFile = resolve(rundir, `result-${Math.random().toString(36).slice(2)}.json`)
  const started = Date.now()
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--maxWorkers',
      '1',
      ...(configPath ? ['--config', configPath] : []),
      '--reporter=json',
      `--outputFile=${outputFile}`,
      testFileAbs,
    ],
    { cwd: reforgeRoot, encoding: 'utf8', timeout: 300000 },
  )
  let json = null
  let parseError
  try {
    json = JSON.parse(readFileSync(outputFile, 'utf8'))
  } catch (error) {
    parseError = String(error)
  }
  return {
    exit: result.status,
    durationMs: Date.now() - started,
    json,
    parseError: json === null ? parseError : undefined,
  }
}

/** 生成一次性 vitest 配置：pre-load 插件仅对目标模块返回内存突变源；不写任何生产路径。 */
function makeInjectedRun(targetAbs, mutatedSource, testFileAbs, hashBefore) {
  const rundir = mkdtempSync(resolve(needleTmpRoot, 'run-'))
  const payloadPath = resolve(rundir, 'needle-payload.json')
  writeFileSync(payloadPath, JSON.stringify({ target: targetAbs, source: mutatedSource }))
  writeFileSync(
    resolve(rundir, 'vitest.config.mjs'),
    `// 一次性反控注入配置（用后即删）；产品磁盘文件零写入。
import { readFileSync } from 'node:fs'
const { target, source } = JSON.parse(readFileSync(${JSON.stringify(payloadPath)}, 'utf8'))
export default {
  root: ${JSON.stringify(reforgeRoot)},
  cacheDir: ${JSON.stringify(resolve(rundir, 'cache'))},
  plugins: [
    {
      name: 'wave-g-needle-injection',
      enforce: 'pre',
      load(id) {
        const clean = id.split('?')[0]
        const path = clean.startsWith('file://') ? new URL(clean).pathname : clean
        return path === target ? source : null
      },
    },
  ],
}
`,
  )
  const configPath = resolve(rundir, 'vitest.config.mjs')
  return {
    run: () => {
      const outcome = runVitest(rundir, testFileAbs, configPath)
      return {
        ...outcome,
        hashBefore,
        hashAfter: sha256(readFileSync(targetAbs)),
      }
    },
    rundir,
  }
}

const allVerdicts = []
let allValid = true
rmSync(needleTmpRoot, { recursive: true, force: true })
mkdirSync(needleTmpRoot, { recursive: true })
// 本次判据运行前的工作树快照：运行后必须逐字一致（证明判据自身零残留）。
const worktreeBefore = spawnSync('git', ['status', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).stdout

for (const needle of NEEDLES) {
  const targetAbs = resolve(repoRoot, needle.target)
  const testFileAbs = resolve(reforgeRoot, needle.testFile)
  const source = readFileSync(targetAbs, 'utf8')
  const parts = source.split(needle.fault[0])
  if (parts.length !== 2) {
    allVerdicts.push({ id: needle.id, valid: false, problems: ['fault anchor not unique'] })
    allValid = false
    continue
  }
  const fileTotal = (
    JSON.parse(readFileSync(resolve(outDir, 'vitest-results.json'), 'utf8')).testResults.find(
      (file) => file.name === testFileAbs,
    )?.assertionResults ?? []
  ).length
  const expectation = { fullName: needle.fullName, testFileAbs, fileTotal }
  const hashBefore = sha256(source)
  const baselineRundir = mkdtempSync(resolve(needleTmpRoot, 'base-'))
  const baseline = runVitest(baselineRundir, testFileAbs)
  rmSync(baselineRundir, { recursive: true, force: true })
  const injectedSetup = makeInjectedRun(
    targetAbs,
    `${parts[0]}${needle.fault[1]}${parts[1]}`,
    testFileAbs,
    hashBefore,
  )
  const injected = injectedSetup.run()
  rmSync(injectedSetup.rundir, { recursive: true, force: true })
  const worktreeAfter = spawnSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).stdout
  const worktreeClean = worktreeAfter === worktreeBefore
  const verdict = evaluateVerdict(expectation, baseline, injected)
  if (!worktreeClean) {
    verdict.valid = false
    verdict.problems.push('worktree: git status 非空（存在残留写入）')
  }
  allVerdicts.push({
    id: needle.id,
    target: needle.target,
    rationale: needle.rationale,
    injection: 'loader 注入（一次性 vitest pre-load 插件；产品磁盘文件零写入，整文件执行无 -t）',
    executedTotal: injected.json?.testResults[0]?.assertionResults.length ?? 0,
    worktreeClean,
    ...verdict,
  })
  if (!verdict.valid) allValid = false
}

// 同一判据的反例自测：构造场景必须逐项被拒（好例必须通过）。
const goodJson = (rows) => ({
  testResults: [{ name: '/abs/file.test.ts', assertionResults: rows }],
})
const pass = (fullName) => ({ fullName, status: 'passed' })
const fail = (fullName) => ({ fullName, status: 'failed' })
const skip = (fullName) => ({ fullName, status: 'skipped' })
const expectation = { fullName: 'T > case', testFileAbs: '/abs/file.test.ts', fileTotal: 2 }
const good = {
  exit: 0,
  hashBefore: 'h',
  hashAfter: 'h',
  json: goodJson([pass('T > case'), pass('T > other')]),
}
const selfTestCases = [
  {
    name: 'good pair',
    expectation,
    baseline: good,
    injected: { ...good, exit: 1, json: goodJson([fail('T > case'), pass('T > other')]) },
    expectValid: true,
  },
  {
    name: 'baseline red',
    expectation,
    baseline: { ...good, exit: 1, json: goodJson([fail('T > case'), pass('T > other')]) },
    injected: { ...good, exit: 1, json: goodJson([fail('T > case'), pass('T > other')]) },
    expectValid: false,
  },
  {
    name: 'injected exit 0',
    expectation,
    baseline: good,
    injected: { ...good, exit: 0 },
    expectValid: false,
  },
  {
    name: 'injected exit 2',
    expectation,
    baseline: good,
    injected: { ...good, exit: 2, json: goodJson([fail('T > case'), pass('T > other')]) },
    expectValid: false,
  },
  {
    name: 'double failure',
    expectation,
    baseline: good,
    injected: { ...good, exit: 1, json: goodJson([fail('T > case'), fail('T > other')]) },
    expectValid: false,
  },
  {
    name: 'wrong fullName',
    expectation,
    baseline: good,
    injected: { ...good, exit: 1, json: goodJson([fail('T > other'), pass('T > case')]) },
    expectValid: false,
  },
  {
    name: 'wrong file',
    expectation,
    baseline: good,
    injected: {
      exit: 1,
      hashBefore: 'h',
      hashAfter: 'h',
      json: {
        testResults: [
          { name: '/other/path.test.ts', assertionResults: [fail('T > case'), pass('T > other')] },
        ],
      },
    },
    expectValid: false,
  },
  {
    name: 'skipped present',
    expectation,
    baseline: good,
    injected: { ...good, exit: 1, json: goodJson([fail('T > case'), skip('T > other')]) },
    expectValid: false,
  },
  {
    name: 'zero executed',
    expectation,
    baseline: { ...good, json: goodJson([skip('T > case'), skip('T > other')]) },
    injected: { ...good, exit: 1, json: goodJson([skip('T > case'), skip('T > other')]) },
    expectValid: false,
  },
  {
    name: 'product hash drift',
    expectation,
    baseline: good,
    injected: {
      ...good,
      exit: 1,
      json: goodJson([fail('T > case'), pass('T > other')]),
      hashAfter: 'changed',
    },
    expectValid: false,
  },
]
const selfTest = selfTestCases.map(({ name, expectValid, ...rest }) => {
  const verdict = evaluateVerdict(rest.expectation, rest.baseline, rest.injected)
  return {
    name,
    expectValid,
    actualValid: verdict.valid,
    ok: verdict.valid === expectValid,
    problems: verdict.problems,
  }
})
const selfTestOk = selfTest.every((row) => row.ok)
if (!selfTestOk) allValid = false

const report = {
  wave: 'G',
  judge:
    'needle-judge.mjs v2 (loader injection; whole-file runs; strict absolute file/fullName/executed-count/no-skip/product-hash verdicts)',
  generatedAt: new Date().toISOString(),
  allValid,
  selfTestOk,
  selfTest,
  verdicts: allVerdicts,
}
writeFileSync(resolve(outDir, 'needle-verdicts.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify({
    allValid,
    selfTestOk,
    verdicts: allVerdicts.map((v) => ({ id: v.id, valid: v.valid, problems: v.problems })),
  }),
)
if (!allValid) process.exit(1)
