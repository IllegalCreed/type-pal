#!/usr/bin/env node
/** run-counter 判据自测：以合成 Vitest JSON 报告验证 assertPhase 拒收路径。
 *  每个用例构造最小报告形状，直接调用提取出的判定逻辑等价实现（与 run-counter.mjs
 *  同判据复制），断言拒收消息。不自建 worktree、不跑 vitest。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const LEAF_OK = new Set(['passed', 'failed'])
function isBusinessAssertion(message) {
  return /^AssertionError|^expect\(/.test(message)
}
// 与 run-counter.mjs 相同的判据（复制以供纯函数测试；改动须同步两处）
function assertPhase(run, spec, phase, ownerPackage, repoRoot) {
  const tests = run.json.testResults.flatMap((f) =>
    (f.assertionResults ?? []).map((a) => ({ ...a, file: f.name })),
  )
  if (tests.length === 0) throw new Error(`${phase} 零执行（collection/过滤后为空）拒收`)
  for (const entry of tests) {
    if (!LEAF_OK.has(entry.status))
      throw new Error(
        `${phase} 非叶状态 ${entry.status}（pending/todo/skip）拒收: ${entry.fullName}`,
      )
  }
  const failed = tests.filter((e) => e.status === 'failed')
  const files = new Set(run.json.testResults.map((f) => f.name))
  if (files.size !== 1) throw new Error(`${phase} 期望单文件执行，实际 ${files.size} 个文件`)
  if (phase !== 'injected') {
    if (run.exitCode !== 0 || failed.length !== 0)
      throw new Error(`${phase} 须全绿：exit=${run.exitCode} failed=${failed.length}`)
    return undefined
  }
  if (run.exitCode === 0 || failed.length !== 1)
    throw new Error(`injected 须恰一红：exit=${run.exitCode} failed=${failed.length}`)
  const target = failed[0]
  if (!target.fullName.includes(spec.test.title))
    throw new Error(`红例 fullName 不符: ${target.fullName}`)
  const targetFile = run.json.testResults.find((f) =>
    (f.assertionResults ?? []).some((a) => a.fullName === target.fullName),
  )?.name
  const wanted = resolve(repoRoot, `packages/${ownerPackage}`, spec.test.file)
  if (!targetFile || !resolve(targetFile).startsWith(wanted))
    throw new Error(`红例文件不符: ${targetFile} 期望 ${wanted}`)
  const message = target.failureMessages[0] ?? ''
  if (!isBusinessAssertion(message))
    throw new Error(`红例非业务 AssertionError（未处理异常/崩溃拒收）: ${message.slice(0, 200)}`)
  return target
}

const repo = mkdtempSync(resolve(tmpdir(), 'glm-o-selftest-'))
const spec = { test: { file: 'src/x.glm-o.test.ts', title: '目标合同' } }
const file = resolve(repo, 'packages/content/src/x.glm-o.test.ts')
const report = (assertionResults, exitCode = 1) => ({
  exitCode,
  json: { testResults: [{ name: file, assertionResults }] },
})

let checked = 0
const rejects = (label, fn, match) => {
  let threw
  try {
    fn()
  } catch (error) {
    threw = error
  }
  assert.ok(threw, `${label} 应拒收`)
  assert.match(threw.message, match, `${label} 拒收消息`)
  checked++
}

// 1) 零执行拒收（control 与 injected 都拒）
rejects(
  '零执行 control',
  () => assertPhase(report([], 0), spec, 'control', 'content', repo),
  /零执行/,
)
rejects(
  '零执行 injected',
  () => assertPhase(report([], 1), spec, 'injected', 'content', repo),
  /零执行/,
)

// 2) skip/pending 非叶状态拒收
rejects(
  'skip 叶',
  () =>
    assertPhase(
      report([{ fullName: 'a 目标合同', status: 'skipped' }]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /非叶状态 skipped/,
)
rejects(
  'todo 叶',
  () =>
    assertPhase(
      report([{ fullName: 'a 目标合同', status: 'todo' }]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /非叶状态 todo/,
)

// 3) 多文件拒收
const twoFiles = {
  exitCode: 1,
  json: {
    testResults: [
      { name: file, assertionResults: [{ fullName: 'a 目标合同', status: 'passed' }] },
      {
        name: resolve(repo, 'packages/content/src/y.glm-o.test.ts'),
        assertionResults: [{ fullName: 'b', status: 'passed' }],
      },
    ],
  },
}
rejects('多文件', () => assertPhase(twoFiles, spec, 'injected', 'content', repo), /单文件/)

// 4) control 有红拒收
rejects(
  'control 红',
  () =>
    assertPhase(
      report([
        { fullName: 'a 目标合同', status: 'failed', failureMessages: ['AssertionError: x'] },
      ]),
      spec,
      'control',
      'content',
      repo,
    ),
  /control 须全绿/,
)

// 5) injected 双红拒收
rejects(
  '双红',
  () =>
    assertPhase(
      report([
        { fullName: 'a 目标合同', status: 'failed', failureMessages: ['AssertionError: x'] },
        { fullName: 'b 其它', status: 'failed', failureMessages: ['AssertionError: y'] },
      ]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /恰一红/,
)

// 6) 目标 fullName 不符拒收
rejects(
  '错目标',
  () =>
    assertPhase(
      report([
        { fullName: 'a 完全不同的合同', status: 'failed', failureMessages: ['AssertionError: x'] },
      ]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /fullName 不符/,
)

// 7) 红在错误文件拒收（spec 指向 src/x，红落在 src/z）
const wrongFileReport = {
  exitCode: 1,
  json: {
    testResults: [
      {
        name: resolve(repo, 'packages/content/src/z.glm-o.test.ts'),
        assertionResults: [
          { fullName: 'a 目标合同', status: 'failed', failureMessages: ['AssertionError: x'] },
        ],
      },
    ],
  },
}
rejects('错文件', () => assertPhase(wrongFileReport, spec, 'injected', 'content', repo), /文件不符/)

// 8) 未处理 Promise 异常/崩溃红拒收（非 AssertionError 首帧）
rejects(
  '未处理异常红',
  () =>
    assertPhase(
      report([
        {
          fullName: 'a 目标合同',
          status: 'failed',
          failureMessages: ['Error: promise resolved "x" instead of rejecting'],
        },
      ]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /非业务 AssertionError/,
)
rejects(
  '崩溃栈红',
  () =>
    assertPhase(
      report([
        { fullName: 'a 目标合同', status: 'failed', failureMessages: ['TypeError: cannot read'] },
      ]),
      spec,
      'injected',
      'content',
      repo,
    ),
  /非业务 AssertionError/,
)

// 9) 正控：合法单目标业务红通过
const okTarget = assertPhase(
  report([
    {
      fullName: 'O08 组 a 目标合同',
      status: 'failed',
      failureMessages: ['AssertionError: expected 1 to be 2'],
    },
  ]),
  spec,
  'injected',
  'content',
  repo,
)
assert.equal(okTarget.fullName, 'O08 组 a 目标合同')
checked++

// 10) 正控：control/restored 全绿通过
assertPhase(
  report([{ fullName: 'a 目标合同', status: 'passed' }], 0),
  spec,
  'control',
  'content',
  repo,
)
checked++

rmSync(repo, { recursive: true, force: true })
console.log(`selftest ${checked} 判据用例全过（拒收 10 + 正控 2 + 目标返回 1）`)
