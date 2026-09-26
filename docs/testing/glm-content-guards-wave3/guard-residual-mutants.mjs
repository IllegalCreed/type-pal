/** TEST-GLM-CONTENT-GUARDS-3 isolated single-point business controls; never edits production or coverage/fast.
 * R3：判据绑定同一失败记录的绝对文件与 Vitest 实际 fullName、恰一红、恰 exit1，
 * 逐条 failureMessages 拒混错/timeout；load 实际命中写入运行态见证；
 * 自测（五反例+有效红/exit/零执行）调用同一 judge 函数，不另造脱离运行入口的谓词。
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-guard-residual-mutants-'))
const contentRoot = resolve(root, 'packages/content')
const tests = [
  'src/author-flow.guard-residual.test.ts',
  'src/author-state.guard-residual.test.ts',
  'src/author-command.guard-residual.test.ts',
  'src/script-command.guard-residual.test.ts',
  'src/enemy-hook.guard-residual.test.ts',
  'src/record-actors.guard-residual.test.ts',
  'src/record-skills-poisons.guard-residual.test.ts',
  'src/record-items.guard-residual.test.ts',
]

const mutations = [
  {
    id: 'flow-stages-empty',
    file: 'src/author-flow.guard-residual.test.ts',
    module: 'author-script-core',
    describe: 'G1 author/runtime script flow 残差',
    from: 'if (!Array.isArray(flow.stages) || flow.stages.length === 0)',
    to: 'if (false)',
    title: 'stages 空数组拒绝且路径精确',
  },
  {
    id: 'world-flags-bool',
    file: 'src/author-state.guard-residual.test.ts',
    module: 'author-script-core',
    describe: 'G2 world script state 残差',
    from: "if (typeof entry !== 'boolean') throw new Error(`${path}.flags.${id}: 期望 boolean`)",
    to: 'if (false) continue',
    title: 'flags 非布尔拒绝且实际输入不变',
  },
  {
    id: 'bare-entity-release',
    file: 'src/author-command.guard-residual.test.ts',
    module: 'author-script-core',
    describe: 'G3 author/runtime command 残差',
    from: "if (kind === 'vanishEntity' || kind === 'releaseEntity') {",
    to: "if (kind === 'vanishEntity') {",
    title: '条件与命令里的裸实体 id 拒绝',
  },
  {
    id: 'dialog-line-retired',
    file: 'src/script-command.guard-residual.test.ts',
    module: 'script',
    describe: 'G4 checkCommands 残差',
    from: 'if (dialog.line !== undefined)',
    to: 'if (false)',
    title: 'dialog.line 退役与 cue rows/autoAdvance 叶拒绝',
  },
  {
    id: 'effect-id-dup',
    file: 'src/enemy-hook.guard-residual.test.ts',
    module: 'enemy-script',
    describe: 'G5 enemy hook/AI/onDefeated 残差',
    from: 'if (effectIds.has(id)) throw new Error(`${path}.id: 同一 state 内 effect id 重复 ${id}`)',
    to: 'if (false) void id',
    title: 'setFallback 缺省正控与同 state effect id 重复拒绝',
  },
  {
    id: 'actor-percent-int',
    file: 'src/record-actors.guard-residual.test.ts',
    module: 'validate',
    describe: 'G6 validateActors 残差',
    from: 'if (!Number.isInteger(eo.percent) || (eo.percent as number) < 1)',
    to: 'if (false)',
    title: 'casualty tempStatBuff percent 非整数拒绝且实际输入不变',
  },
  {
    id: 'skill-placement',
    file: 'src/record-skills-poisons.guard-residual.test.ts',
    module: 'validate',
    describe: 'G7 validateSkills/validatePoisons 残差',
    from: "    animation.placement !== undefined &&\n    !['normal', 'attackAll', 'attackWhole', 'attackField'].includes(String(animation.placement))",
    to: 'false',
    title: 'animation placement 非法拒绝',
  },
  {
    id: 'item-status-dup',
    file: 'src/record-items.guard-residual.test.ts',
    module: 'validate',
    describe: 'G8 validateItems use 效果残差',
    from: 'if (seen.has(status)) throw new Error(`${ctx}.statuses[${index}]: 状态 ${status} 重复`)',
    to: 'if (false)',
    title: 'removeStatus 重复拒绝且实际输入不变',
  },
]
const TOTAL = 110
const sourcePath = (name) => resolve(root, `packages/content/src/${name}.ts`)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const modules = [...new Set(mutations.map((entry) => entry.module))]
const hashes = Object.fromEntries(modules.map((name) => [name, hash(name)]))

// 混错判定：除首字符 AssertionError 前缀外，任何以错误构造符开头的行都视为第二条错误；
// vitest 对 not.toThrow 的合法断言会把被抛错误内嵌在引号文本里（如 but 'Error: ...'），
// 那是行中引用，不构成混错。
const MIXED_ERROR =
  /(^|\n)\s*(TypeError|RangeError|ReferenceError|SyntaxError|EvalError|URIError|Error)\s*:/
// timeout 判定锚定首行：真实超时签名（如 "test timed out"）在消息首行，
// 而普通失败消息的堆栈行含 vitest 内部帧名 runWithTimeout，不能参与判定。
const TIMEOUT = /timed out|timeout/i

/**
 * 同一真实判据：实跑验收与自测反例都走本函数。返回违规列表，空列表 = 判定通过。
 * mutation 为 null 时要求恰 exit0 全绿；否则要求恰 exit1、恰一红且该失败记录的
 * 绝对文件与 Vitest 实际 fullName 都等于目标，失败消息逐条拒混错/timeout。
 */
function judge(mutation, run, data) {
  const violations = []
  const expectedExit = mutation ? 1 : 0
  if (run.signal !== null) violations.push(`terminated by signal ${String(run.signal)}`)
  if (run.status !== expectedExit) violations.push(`exit ${String(run.status)} != ${expectedExit}`)
  const text = stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(text))
    violations.push('unhandled runtime error')
  if (!data || !Array.isArray(data.testResults)) {
    violations.push('no report data')
    return violations
  }
  if (data.numTotalTests !== TOTAL)
    violations.push(`numTotalTests ${data.numTotalTests} != ${TOTAL}`)
  if (data.numPendingTests !== 0 || data.numTodoTests !== 0) violations.push('pending/todo present')
  if (data.testResults.some((file) => file.message)) violations.push('suite-level failure')
  const assertions = data.testResults.flatMap((file) => file.assertionResults ?? [])
  if (assertions.length !== TOTAL) violations.push(`assertions ${assertions.length} != ${TOTAL}`)
  if (new Set(assertions.map((entry) => entry.fullName)).size !== TOTAL)
    violations.push('duplicate fullName in scope')
  const badStatus = assertions.filter(
    (entry) => entry.status !== 'passed' && entry.status !== 'failed',
  )
  if (badStatus.length > 0) violations.push(`${badStatus.length} entries neither passed nor failed`)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  const passed = assertions.filter((entry) => entry.status === 'passed')
  if (passed.length !== TOTAL - failed.length)
    violations.push(`passed ${passed.length} inconsistent with ${failed.length} failed`)
  if (!mutation) {
    if (failed.length !== 0) violations.push(`control red: ${failed.length}`)
    return violations
  }
  if (failed.length !== 1) {
    violations.push(`failed ${failed.length}, expected exactly 1`)
    return violations
  }
  const red = failed[0]
  const targetFullName = `${mutation.describe} ${mutation.title}`
  if (red.fullName !== targetFullName)
    violations.push(
      `red fullName ${JSON.stringify(red.fullName)} != ${JSON.stringify(targetFullName)}`,
    )
  const host = data.testResults.find((file) =>
    (file.assertionResults ?? []).some((entry) => entry.status === 'failed'),
  )
  const targetFile = resolve(contentRoot, mutation.file)
  if (!host || host.name !== targetFile)
    violations.push(`red file ${String(host?.name)} != ${targetFile}`)
  const messages = red.failureMessages ?? []
  if (messages.length === 0) violations.push('failure without messages')
  for (const message of messages) {
    const trimmed = message.trimStart()
    if (!/^AssertionError\b/.test(trimmed)) {
      violations.push(`non-assertion failure: ${trimmed.slice(0, 80)}`)
      continue
    }
    if (TIMEOUT.test(trimmed.split('\n', 1)[0] ?? ''))
      violations.push(`timeout treated as red: ${trimmed.slice(0, 80)}`)
    if (MIXED_ERROR.test(trimmed))
      violations.push(`mixed non-business error: ${trimmed.slice(0, 80)}`)
  }
  return violations
}

/** 自测样本：91 项作用域，目标失败记录默认落在正确的绝对文件与 fullName 上。 */
function sample(mutation) {
  const entries = Array.from({ length: TOTAL }, (_, index) => ({
    title: `other ${index}`,
    ancestorTitles: ['other'],
    fullName: `other other ${index}`,
    status: 'passed',
    failureMessages: [],
  }))
  entries[0] = {
    title: mutation.title,
    ancestorTitles: [mutation.describe],
    fullName: `${mutation.describe} ${mutation.title}`,
    status: 'failed',
    failureMessages: ['AssertionError: expected business rejection'],
  }
  return {
    numTotalTests: TOTAL,
    numPendingTests: 0,
    numTodoTests: 0,
    success: false,
    testResults: [{ name: resolve(contentRoot, mutation.file), assertionResults: entries }],
  }
}

/** 判据自测：五反例 + 有效红/exit/零执行，全部调用同一 judge。 */
function selfTest() {
  const mutation = mutations[0]
  const baseRun = { status: 1, signal: null, stdout: '', stderr: '' }
  const cases = [
    { id: 'valid-red', expectReject: false, run: baseRun, edit() {} },
    {
      id: 'same-message-mixed-error',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].assertionResults[0].failureMessages[0] +=
          '\nTypeError: environment broken'
      },
    },
    {
      id: 'assertion-prefixed-timeout',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].assertionResults[0].failureMessages = ['AssertionError: test timed out']
      },
    },
    {
      id: 'additional-unrelated-red',
      expectReject: true,
      run: baseRun,
      edit(data) {
        const extra = data.testResults[0].assertionResults[1]
        extra.status = 'failed'
        extra.failureMessages = ['AssertionError: unrelated red']
      },
    },
    {
      id: 'wrong-fullname-red-with-intended-green',
      expectReject: true,
      run: baseRun,
      edit(data) {
        const entries = data.testResults[0].assertionResults
        entries[0].status = 'passed'
        entries[0].failureMessages = []
        entries[1] = {
          title: mutation.title,
          ancestorTitles: ['different group'],
          fullName: `different group ${mutation.title}`,
          status: 'failed',
          failureMessages: ['AssertionError: wrong case'],
        }
      },
    },
    {
      id: 'foreign-file-same-suffix',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].name = resolve(
          '/different-candidate-root/packages/content',
          mutation.file,
        )
      },
    },
    {
      id: 'exit-two',
      expectReject: true,
      run: { status: 2, signal: null, stdout: '', stderr: '' },
      edit() {},
    },
    {
      id: 'exit-null',
      expectReject: true,
      run: { status: null, signal: null, stdout: '', stderr: '' },
      edit() {},
    },
    {
      id: 'zero-execution',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.numTotalTests = 0
        data.testResults[0].assertionResults = []
      },
    },
  ]
  const results = []
  for (const item of cases) {
    const data = sample(mutation)
    item.edit(data)
    const violations = judge(mutation, item.run, data)
    const rejected = violations.length > 0
    assert.equal(
      rejected,
      item.expectReject,
      `${item.id}: expected ${item.expectReject ? 'reject' : 'accept'}, got ${JSON.stringify(violations)}`,
    )
    results.push({ id: item.id, expectReject: item.expectReject, rejected, violations })
  }
  const greenEntries = sample(mutation).testResults[0].assertionResults.map((entry, index) =>
    index === 0 ? { ...entry, status: 'passed', failureMessages: [] } : entry,
  )
  const controlViolations = judge(
    null,
    { status: 0, signal: null, stdout: '', stderr: '' },
    {
      numTotalTests: TOTAL,
      numPendingTests: 0,
      numTodoTests: 0,
      success: true,
      testResults: [{ name: resolve(contentRoot, mutation.file), assertionResults: greenEntries }],
    },
  )
  assert.equal(
    controlViolations.length,
    0,
    `control sample must pass: ${JSON.stringify(controlViolations)}`,
  )
  results.push({ id: 'control-sample', expectReject: false, rejected: false, violations: [] })
  return results
}

const selfTestResults = selfTest()
console.log(`criteria self-test: ${selfTestResults.length} cases, all as expected`)

const evidence = []
for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  if (mutation)
    assert.equal(
      readFileSync(sourcePath(mutation.module), 'utf8').split(mutation.from).length - 1,
      1,
      `${id}: unique needle required`,
    )
  const report = join(output, `${id}.json`)
  const entered = join(output, `${id}.entered.json`)
  const config = join(output, `${id}.config.mjs`)
  const target = mutation ? sourcePath(mutation.module) : ''
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)}, target=${JSON.stringify(target)};
export default {root:${JSON.stringify(contentRoot)},
plugins:mutation?[{name:'isolated-guard-leaf',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target}));return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  let data = null
  try {
    data = JSON.parse(readFileSync(report, 'utf8'))
  } catch {}
  const violations = judge(mutation, run, data)
  assert.deepEqual(violations, [], `${id}: judge violations: ${JSON.stringify(violations)}`)
  let enteredWitness = null
  if (mutation) {
    enteredWitness = JSON.parse(readFileSync(entered, 'utf8'))
    assert.deepEqual(enteredWitness, { id, target }, `${id}: load-hit witness mismatch`)
  }
  for (const [name, before] of Object.entries(hashes))
    assert.equal(hash(name), before, `${id}: production modified`)
  const failed = (data?.testResults ?? []).flatMap((file) =>
    (file.assertionResults ?? [])
      .filter((entry) => entry.status === 'failed')
      .map((entry) => entry.fullName),
  )
  evidence.push({
    id,
    exitCode: run.status,
    tests: data?.numTotalTests ?? null,
    entered: enteredWitness,
    failed,
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ hashes, selfTest: selfTestResults, evidence }, null, 2)}\n`,
)
console.log(
  `Guard residual oracles passed: criteria self-test ${selfTestResults.length} cases + 1 control + ${mutations.length} mutations. ${output}`,
)
