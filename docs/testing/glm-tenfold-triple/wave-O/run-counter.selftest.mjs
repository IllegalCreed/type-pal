#!/usr/bin/env node
/** 反控 judge 自测：直接调用与 runner 相同的 counter-judge.mjs（唯一判据源）。
 *  覆盖 O-R7 审核给出的全部误收反例：异身份恢复、fullName 附加错后缀、
 *  一断言红叠未处理异常、exit=-1；以及零执行/非叶/多文件/双红/错目标/错文件/
 *  崩溃栈/raw Unhandled 公告/signal/spawn 与四个正控。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { flattenTests, judgePhase, sameExecutionIdentity } from './counter-judge.mjs'

const repo = mkdtempSync(resolve(tmpdir(), 'glm-o-selftest-'))
const spec = { test: { file: 'src/x.glm-o.test.ts', title: '目标合同' } }
const pkg = 'content'
const file = resolve(repo, 'packages/content/src/x.glm-o.test.ts')
const T = (fullName, status, failureMessages = []) => ({
  file,
  fullName,
  status,
  failureMessages,
})
const run = (tests, extra = {}) => ({
  exitCode: 1,
  json: { testResults: [{ name: file, assertionResults: tests }] },
  stdout: '',
  stderr: '',
  ...extra,
})
const pass = (fullName) => T(fullName, 'passed')
const red = (fullName, msg = 'AssertionError: expected 1 to be 2') => T(fullName, 'failed', [msg])

let n = 0
const rejects = (label, fn, match) => {
  let err
  try {
    fn()
  } catch (error) {
    err = error
  }
  assert.ok(err, `${label} 应拒收`)
  assert.match(err.message, match, `${label} 拒收消息不符`)
  n++
}

// ── 拒收：执行集与状态 ──
rejects('零执行', () => judgePhase(run([]), spec, 'injected', pkg), /零执行/)
rejects(
  'skip 叶',
  () => judgePhase(run([T('a 目标合同', 'skipped')]), spec, 'injected', pkg),
  /非叶状态 skipped/,
)
rejects(
  'todo 叶',
  () => judgePhase(run([T('a 目标合同', 'todo')]), spec, 'injected', pkg),
  /非叶状态 todo/,
)
rejects(
  '多文件',
  () =>
    judgePhase(
      {
        exitCode: 0,
        json: {
          testResults: [
            { name: file, assertionResults: [pass('a')] },
            {
              name: resolve(repo, 'packages/content/src/y.glm-o.test.ts'),
              assertionResults: [pass('b')],
            },
          ],
        },
        stdout: '',
        stderr: '',
      },
      spec,
      'control',
      pkg,
    ),
  /单文件/,
)
// control 红在 exit=0 正常形态下触发须全绿拒收
rejects(
  'control 红',
  () => judgePhase(run([red('a 目标合同')], { exitCode: 0 }), spec, 'control', pkg),
  /control 须全绿/,
)

// ── 拒收：目标精确性 ──
rejects(
  '双红',
  () => judgePhase(run([red('a 目标合同'), red('b 其它')]), spec, 'injected', pkg),
  /恰一红/,
)
rejects(
  '错目标（无此前缀）',
  () => judgePhase(run([red('完全不同的合同')]), spec, 'injected', pkg),
  /fullName 不符/,
)
rejects(
  'fullName 附加错后缀（append-only 不算精确匹配）',
  () => judgePhase(run([red('a 目标合同XX')]), spec, 'injected', pkg),
  /fullName 不符/,
)
rejects(
  '错文件（spec 指 src/x，红落 src/z）',
  () =>
    judgePhase(
      {
        exitCode: 1,
        json: {
          testResults: [
            {
              name: resolve(repo, 'packages/content/src/z.glm-o.test.ts'),
              assertionResults: [red('a 目标合同')],
            },
          ],
        },
        stdout: '',
        stderr: '',
      },
      spec,
      'injected',
      pkg,
    ),
  /文件不符/,
)

// ── 拒收：非业务红与 harness 形态 ──
rejects(
  '未处理 Promise 异常红',
  () =>
    judgePhase(
      run([red('a 目标合同', 'Error: promise resolved "x" instead of rejecting')]),
      spec,
      'injected',
      pkg,
    ),
  /非业务 AssertionError/,
)
rejects(
  '崩溃栈红',
  () => judgePhase(run([red('a 目标合同', 'TypeError: cannot read')]), spec, 'injected', pkg),
  /非业务 AssertionError/,
)
rejects(
  '一断言红叠 raw Unhandled 公告',
  () =>
    judgePhase(
      run([red('a 目标合同')], { stderr: 'Unhandled Error: boom at processTicks' }),
      spec,
      'injected',
      pkg,
    ),
  /未处理异常公告/,
)
rejects(
  'exit=-1（harness 崩溃）拒收',
  () => judgePhase(run([pass('a 目标合同')], { exitCode: -1 }), spec, 'control', pkg),
  /非正常退出码 -1/,
)
rejects(
  'injected exit=2 拒收',
  () => judgePhase(run([red('a 目标合同')], { exitCode: 2 }), spec, 'injected', pkg),
  /非正常退出码 2/,
)
rejects(
  'signal 拒收',
  () =>
    judgePhase(run([pass('a 目标合同')], { exitCode: 0, signal: 'SIGKILL' }), spec, 'control', pkg),
  /signal=SIGKILL/,
)
rejects(
  'spawn error 拒收',
  () =>
    judgePhase(
      run([pass('a 目标合同')], { exitCode: 0, error: new Error('spawn ENOENT') }),
      spec,
      'control',
      pkg,
    ),
  /spawn 失败/,
)

// ── 拒收：三相身份比较 ──
rejects(
  '异身份恢复（injected 多一条）',
  () =>
    sameExecutionIdentity(
      flattenTests({ testResults: [{ name: file, assertionResults: [pass('a'), pass('b')] }] }),
      flattenTests({ testResults: [{ name: file, assertionResults: [pass('a')] }] }),
      'control↔injected',
    ),
  /执行身份/,
)
rejects(
  '状态漂移（a passed → failed）',
  () =>
    sameExecutionIdentity(
      flattenTests({ testResults: [{ name: file, assertionResults: [pass('a')] }] }),
      flattenTests({ testResults: [{ name: file, assertionResults: [red('a')] }] }),
      'injected↔restored',
    ),
  /状态漂移/,
)

// ── 正控 ──
const target = judgePhase(run([red('O08 组 目标合同')]), spec, 'injected', pkg)
assert.equal(target.fullName, 'O08 组 目标合同')
n++
judgePhase(run([pass('a 目标合同')], { exitCode: 0 }), spec, 'control', pkg)
n++
judgePhase(run([pass('a 目标合同')], { exitCode: 0 }), spec, 'restored', pkg)
n++
sameExecutionIdentity(
  flattenTests({ testResults: [{ name: file, assertionResults: [pass('a'), red('b')] }] }),
  flattenTests({ testResults: [{ name: file, assertionResults: [pass('a'), red('b')] }] }),
  'x↔y',
)
n++

rmSync(repo, { recursive: true, force: true })
console.log(`selftest ${n} 判据用例全过（拒收 18 + 正控 4，全部经 counter-judge.mjs 唯一判据）`)
