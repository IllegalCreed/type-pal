#!/usr/bin/env node
/**
 * TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 反控驱动（三态 native 证据）。
 *
 * 相位：green0（原始绿）→ N1/N2/N3（每针：变异→红→还原→sha 校验）→ green2（还原绿）→
 * replay-n1（末次首针重放）。每相位同一子进程内双 reporter（json 落文件 + default 落 stdout
 * 原样保存）。
 *
 * 判据（judge，四层，绿/针共用核心）：
 * 1. 进程层：exit 码（绿=0，针=非0）、raw stdout 须有 Tests 摘要行且非 0 例。
 * 2. 集合层：numTotalTests===3、file×fullName 多重集与执行集恰等、pending/todo=0。
 * 3. 断言层（针）：failed===1 且 fullName===预期、failureMessages[0] 含 AssertionError、
 *    suite 级 message 空、raw 无 uncaught/unhandled 污染标记。
 * 4. 变异层：锚点恰命中 1 处（split 长度===2）、针后 git 还原且产品 sha 回到冻结值、
 *    被跟踪文件零脏。
 * 判据自证：judge 先跑 5 个合成反例（双红/TypeError 红/绿配 exit1/执行集缺失/合法针），
 * 前 4 项必须 INVALID、末项必须 VALID。
 *
 * 运行期禁并发编辑本树；本脚本只临时变异唯一产品文件 ItemUseEffectEditor.tsx 并精确还原。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = '/private/tmp/tp-item-effect-residual'
const evidenceDir = join(repoRoot, 'docs/ops/evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1')
const receiptsDir = join(evidenceDir, 'receipts')
const productRel = 'packages/editor/src/ui/ItemUseEffectEditor.tsx'
const productAbs = join(repoRoot, productRel)
const testRel = 'packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx'
const editorDir = join(repoRoot, 'packages/editor')

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const frozenProductSha = sha256(readFileSync(productAbs, 'utf8'))
const frozenTestSha = sha256(readFileSync(join(repoRoot, testRel), 'utf8'))

const NEEDLES = [
  {
    id: 'N1',
    contract: 'R1',
    anchor:
      'onValueChange={(value) =>\n              onChange({\n                ...effect,\n                target: { ...effect.target, entity: value },\n              })\n            }',
    replacement:
      'onValueChange={(value) =>\n              onChange({\n                ...effect,\n                target: { ...effect.target },\n              })\n            }',
  },
  {
    id: 'N2',
    contract: 'R3',
    anchor: 'const scene = scenes.find((candidate) => candidate.entities.length > 0)',
    replacement: 'const scene = scenes.find(() => true)',
  },
  {
    id: 'N3',
    contract: 'R5',
    anchor:
      '    } catch (cause) {\n      props.onError?.(cause instanceof Error ? cause.message : String(cause))\n    }\n  }\n  const compatibleKindsAt',
    replacement: '    } catch (cause) {\n      void cause\n    }\n  }\n  const compatibleKindsAt',
  },
]

/** 唯一命中断言的字符串替换；命中数≠1 即抛错（防静默 no-op / 误伤多处）。 */
function applyMutation(needle) {
  const original = readFileSync(productAbs, 'utf8')
  const parts = original.split(needle.anchor)
  if (parts.length !== 2)
    throw new Error(`${needle.id} 锚点命中数异常：${parts.length - 1}（期望 1）`)
  const mutated = parts.join(needle.replacement)
  writeFileSync(productAbs, mutated)
  return {
    beforeSha: sha256(original),
    mutatedSha: sha256(mutated),
    patchSha: sha256(`${needle.anchor}\n--->\n${needle.replacement}`),
  }
}

function restoreProduct(needle) {
  const restore = spawnSync('git', ['checkout', '--', productRel], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (restore.status !== 0) throw new Error(`${needle.id} git 还原失败：${restore.stderr}`)
  const restoredSha = sha256(readFileSync(productAbs, 'utf8'))
  if (restoredSha !== frozenProductSha)
    throw new Error(`${needle.id} 还原后 sha 与冻结值不一致：${restoredSha}`)
}

/** 变异内执行 fn；无论成败都先精确还原再返回/抛出。 */
function withMutation(needle, fn) {
  const mutation = applyMutation(needle)
  let result
  try {
    result = fn()
  } catch (error) {
    restoreProduct(needle)
    throw error
  }
  restoreProduct(needle)
  return { mutation, result }
}

function trackedDirty() {
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  return status.stdout.split('\n').filter((line) => line && !line.startsWith('??'))
}

function runVitest(phase) {
  const jsonPath = join(receiptsDir, `${phase}.json`)
  rmSync(jsonPath, { force: true })
  const proc = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      'src/ui/ItemUseEffectEditor.residual.glm.test.tsx',
      '--reporter=json',
      '--reporter=default',
      `--outputFile=${jsonPath}`,
    ],
    { cwd: editorDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  const raw = proc.stdout ?? ''
  writeFileSync(join(receiptsDir, `${phase}.raw`), raw)
  if (proc.stderr)
    writeFileSync(
      join(receiptsDir, `${phase}.stderr`),
      proc.stderr.replace(/\n+$/u, '\n'),
    )
  let json = null
  try {
    json = JSON.parse(readFileSync(jsonPath, 'utf8'))
  } catch (error) {
    throw new Error(`${phase} vitest json 解析失败：${error.message}`)
  }
  return {
    phase,
    exit: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error) : undefined,
    json,
    raw,
    jsonPath,
    rawPath: join(receiptsDir, `${phase}.raw`),
  }
}

function collectFullNames(json) {
  return json.testResults.flatMap((suite) =>
    (suite.assertionResults ?? []).map((assertion) => assertion.fullName),
  )
}

/** 判据核心；expectedRed 为空 → 绿相位，否则针相位。 */
function judge(run, expectedFullNames, expectedRed) {
  const problems = []
  const { json, exit, raw } = run
  if (run.spawnError) problems.push(`spawn 失败：${run.spawnError}`)
  if (expectedRed) {
    if (exit === 0) problems.push('针相位 exit=0（期望非 0）')
  } else if (exit !== 0) problems.push(`绿相位 exit=${exit}（期望 0）`)

  const summaryLine = [...raw.split('\n')].reverse().find((line) => line.includes('Tests  '))
  if (!summaryLine) problems.push('raw 缺 Tests 摘要行')
  if (/Tests\s+0 /.test(summaryLine ?? '')) problems.push(`Tests 摘要为 0：${summaryLine}`)

  if (json.numTotalTests !== expectedFullNames.length)
    problems.push(`numTotalTests=${json.numTotalTests}（期望 ${expectedFullNames.length}）`)
  const pending = (json.numPendingTests ?? 0) + (json.numTodoTests ?? 0)
  if (pending !== 0) problems.push(`pending/todo=${pending}（期望 0）`)
  const actual = collectFullNames(json).sort()
  const expected = [...expectedFullNames].sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    problems.push(`执行集 fullName 不一致：${JSON.stringify(actual)}`)

  const failed = json.testResults.flatMap((suite) =>
    (suite.assertionResults ?? []).filter((assertion) => assertion.status === 'failed'),
  )
  const suitePollution = json.testResults.filter(
    (suite) =>
      suite.status === 'failed' &&
      !(suite.assertionResults ?? []).some((assertion) => assertion.status === 'failed'),
  )
  if (suitePollution.length)
    problems.push(
      `存在 suite 级失败污染：${JSON.stringify(suitePollution.map((suite) => suite.message))}`,
    )
  if (/uncaught|unhandled/i.test(raw)) problems.push('raw 含 uncaught/unhandled 污染标记')

  if (!expectedRed) {
    if (json.numFailedTests !== 0) problems.push(`绿相位 failed=${json.numFailedTests}（期望 0）`)
  } else {
    if (json.numFailedTests !== 1) problems.push(`failed=${json.numFailedTests}（期望恰 1）`)
    const only = failed[0]
    if (!only) problems.push('缺失败断言')
    else {
      if (only.fullName !== expectedRed)
        problems.push(`红 fullName=${only.fullName}（期望 ${expectedRed}）`)
      const message = (only.failureMessages ?? []).join('\n')
      if (!message.includes('AssertionError')) problems.push('失败非 AssertionError（业务断言）')
      if (/\bTypeError\b|\bSyntaxError\b/.test(message))
        problems.push('失败含 TypeError/SyntaxError')
    }
  }
  return { verdict: problems.length ? 'INVALID' : 'VALID', problems }
}

/** 判据自证：合成反例必须被拒、合法样本必须被收。 */
function judgeSelftest(expectedFullNames, redFullName) {
  const passed = (fullName) => ({ fullName, status: 'passed' })
  const others = expectedFullNames.filter((fullName) => fullName !== redFullName).map(passed)
  const greenJson = {
    numTotalTests: 3,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [{ status: 'passed', assertionResults: expectedFullNames.map(passed) }],
  }
  const redAssertion = (failureMessages) => ({
    fullName: redFullName,
    status: 'failed',
    failureMessages,
  })
  const cases = [
    {
      id: 'selftest-a-双红拒绝',
      run: {
        json: {
          numTotalTests: 3,
          numFailedTests: 2,
          numPendingTests: 0,
          numTodoTests: 0,
          testResults: [
            {
              status: 'failed',
              assertionResults: [
                redAssertion(['AssertionError: expected red']),
                redAssertion(['AssertionError: second red']),
                ...others,
              ],
            },
          ],
        },
        exit: 1,
        raw: 'Tests  2 failed | 1 passed',
      },
      expectedRed: redFullName,
      want: 'INVALID',
    },
    {
      id: 'selftest-b-TypeError-红拒绝',
      run: {
        json: {
          numTotalTests: 3,
          numFailedTests: 1,
          numPendingTests: 0,
          numTodoTests: 0,
          testResults: [
            {
              status: 'failed',
              assertionResults: [redAssertion(['TypeError: cannot read']), ...others],
            },
          ],
        },
        exit: 1,
        raw: 'Tests  1 failed | 2 passed',
      },
      expectedRed: redFullName,
      want: 'INVALID',
    },
    {
      id: 'selftest-c-绿配-exit1-拒绝',
      run: { json: greenJson, exit: 1, raw: 'Tests  3 passed' },
      expectedRed: undefined,
      want: 'INVALID',
    },
    {
      id: 'selftest-d-合法针接受',
      run: {
        json: {
          numTotalTests: 3,
          numFailedTests: 1,
          numPendingTests: 0,
          numTodoTests: 0,
          testResults: [
            {
              status: 'failed',
              assertionResults: [redAssertion(['AssertionError: expected red']), ...others],
            },
          ],
        },
        exit: 1,
        raw: 'Tests  1 failed | 2 passed',
      },
      expectedRed: redFullName,
      want: 'VALID',
    },
    {
      id: 'selftest-e-执行集缺失拒绝',
      run: {
        json: {
          ...greenJson,
          testResults: [
            { status: 'passed', assertionResults: expectedFullNames.slice(0, 2).map(passed) },
          ],
        },
        exit: 0,
        raw: 'Tests  2 passed',
      },
      expectedRed: undefined,
      want: 'INVALID',
    },
  ]
  const results = cases.map((item) => {
    const verdict = judge(item.run, expectedFullNames, item.expectedRed)
    return {
      id: item.id,
      want: item.want,
      got: verdict.verdict,
      ok: verdict.verdict === item.want,
      problems: verdict.problems,
    }
  })
  return { allValid: results.every((result) => result.ok), results }
}

function main() {
  mkdirSync(receiptsDir, { recursive: true })
  const receipt = {
    task: 'TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1',
    startedAt: new Date().toISOString(),
    command: `node ${process.argv.slice(1).join(' ')}`,
    cwd: repoRoot,
    execPath: process.execPath,
    nodeVersion: process.version,
    product: productRel,
    test: testRel,
    frozenProductSha,
    frozenTestSha,
    phases: [],
  }

  const dirty0 = trackedDirty()
  if (dirty0.length) throw new Error(`起始树有被跟踪脏文件：${JSON.stringify(dirty0)}`)

  // P0 原始绿：捕获执行集 fullName。
  const green0 = runVitest('green0')
  const fullNames = collectFullNames(green0.json)
  if (fullNames.length !== 3) throw new Error(`执行集数量异常：${fullNames.length}`)
  const redByContract = Object.fromEntries(
    NEEDLES.map((needle) => [
      needle.contract,
      fullNames.find((name) => name.includes(needle.contract)),
    ]),
  )
  for (const [contract, name] of Object.entries(redByContract))
    if (!name) throw new Error(`未找到 ${contract} 的 fullName`)

  const selftest = judgeSelftest(fullNames, redByContract[NEEDLES[0].contract])
  if (!selftest.allValid) throw new Error(`判据自证失败：${JSON.stringify(selftest.results)}`)

  const judgeGreen0 = judge(green0, fullNames, undefined)
  receipt.phases.push({
    phase: 'green0',
    exit: green0.exit,
    jsonPath: green0.jsonPath,
    rawPath: green0.rawPath,
    verdict: judgeGreen0.verdict,
    problems: judgeGreen0.problems,
    fullNames,
  })
  if (judgeGreen0.verdict !== 'VALID')
    throw new Error(`green0 INVALID：${JSON.stringify(judgeGreen0.problems)}`)

  // 针相位（每针后核被跟踪零脏）。
  for (const needle of NEEDLES) {
    const { mutation, result } = withMutation(needle, () => runVitest(needle.id.toLowerCase()))
    const verdict = judge(result, fullNames, redByContract[needle.contract])
    const dirty = trackedDirty()
    if (dirty.length)
      throw new Error(`${needle.id} 还原后仍有被跟踪脏文件：${JSON.stringify(dirty)}`)
    receipt.phases.push({
      phase: needle.id,
      contract: needle.contract,
      expectedRed: redByContract[needle.contract],
      mutation,
      exit: result.exit,
      jsonPath: result.jsonPath,
      rawPath: result.rawPath,
      verdict: verdict.verdict,
      problems: verdict.problems,
    })
    if (verdict.verdict !== 'VALID')
      throw new Error(`${needle.id} INVALID：${JSON.stringify(verdict.problems)}`)
  }

  // 还原绿。
  const green2 = runVitest('green2')
  const judgeGreen2 = judge(green2, fullNames, undefined)
  receipt.phases.push({
    phase: 'green2',
    exit: green2.exit,
    jsonPath: green2.jsonPath,
    rawPath: green2.rawPath,
    verdict: judgeGreen2.verdict,
    problems: judgeGreen2.problems,
  })
  if (judgeGreen2.verdict !== 'VALID')
    throw new Error(`green2 INVALID：${JSON.stringify(judgeGreen2.problems)}`)

  // 末次首针重放。
  const replayNeedle = NEEDLES[0]
  const replay = withMutation(replayNeedle, () => runVitest('replay-n1'))
  const judgeReplay = judge(replay.result, fullNames, redByContract[replayNeedle.contract])
  receipt.phases.push({
    phase: 'replay-n1',
    expectedRed: redByContract[replayNeedle.contract],
    mutation: replay.mutation,
    exit: replay.result.exit,
    jsonPath: replay.result.jsonPath,
    rawPath: replay.result.rawPath,
    verdict: judgeReplay.verdict,
    problems: judgeReplay.problems,
  })
  if (judgeReplay.verdict !== 'VALID')
    throw new Error(`replay-n1 INVALID：${JSON.stringify(judgeReplay.problems)}`)

  const dirtyEnd = trackedDirty()
  if (dirtyEnd.length) throw new Error(`收尾仍有被跟踪脏文件：${JSON.stringify(dirtyEnd)}`)
  receipt.restoredProductSha = sha256(readFileSync(productAbs, 'utf8'))
  receipt.restoredTestSha = sha256(readFileSync(join(repoRoot, testRel), 'utf8'))
  if (receipt.restoredTestSha !== frozenTestSha) throw new Error('测试文件在反控期被改动')
  receipt.selftest = selftest.results
  receipt.finishedAt = new Date().toISOString()
  receipt.overall = 'VALID'
  writeFileSync(
    join(receiptsDir, 'counterproof-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  )
  // 尾步格式化：落盘收据字节过全仓 biome 门；不回跑测试（格式只动空白）。
  const format = spawnSync('pnpm', ['exec', 'biome', 'format', '--write', receiptsDir], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (format.status !== 0)
    throw new Error(`收据 biome format 失败：${format.stdout}${format.stderr}`)
  console.log('COUNTERPROOF VALID')
  console.log(
    `phases: ${receipt.phases.map((phase) => `${phase.phase}:${phase.verdict}`).join(' ')}`,
  )
}

try {
  main()
} catch (error) {
  console.error('COUNTERPROOF FAILED:', error.message)
  process.exitCode = 1
}
