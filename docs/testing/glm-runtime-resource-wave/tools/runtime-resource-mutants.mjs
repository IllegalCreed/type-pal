/** TEST-GLM-RUNTIME-RESOURCE-2 各批共用单点业务反控 runner；不改生产源/旧测试/覆盖口径。
 * 判据与 docs/testing/glm-state-commands/tools/state-commands-mutants.mjs 同语义：
 * 对照恰 exit0 全绿；变异恰 exit1、恰一红、红记录绝对文件与 Vitest 实际 fullName 命中、
 * failureMessages 逐条拒混错/timeout/零执行；隔离 loader 只在临时副本 config 注入，
 * 前后产品 hash 不变；判据自测与实跑走同一 judge。用法：node runtime-resource-mutants.mjs <batch>
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-glm-runtime-resource-mutants-'))

/** 每批注册：包根、对照跑范围与总数、该批 2 个单点针。 */
const batches = {
  a: {
    packageRoot: resolve(root, 'packages/pal-extract'),
    production: [
      'src/resources/parsers/ball.ts',
      'src/resources/parsers/rgm.ts',
      'src/resources/parsers/fire.ts',
      'src/resources/scene.ts',
      'src/resources/sprite.ts',
      'src/resources/palette.ts',
    ],
    control: {
      tests: [
        'src/resources/palette.glm-runtime-resource.test.ts',
        'src/resources/palette.test.ts',
        'src/resources/palette.boundaries.test.ts',
        'src/resources/parsers/ball.glm-runtime-resource.test.ts',
        'src/resources/parsers/rgm.glm-runtime-resource.test.ts',
        'src/resources/parsers/fire.glm-runtime-resource.test.ts',
        'src/resources/scene.glm-runtime-resource.test.ts',
        'src/resources/scene.test.ts',
        'src/resources/sprite.glm-runtime-resource.test.ts',
        'src/resources/sprite.test.ts',
      ],
      total: 41,
    },
    mutations: [
      {
        id: 'ball-marker-prefix-misread',
        module: 'src/resources/parsers/ball.ts',
        file: 'src/resources/parsers/ball.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R03 decodeBallIcon 空槽与标记头',
        title: '0x02000000 标记头剥离：2×1 帧（跳1 + opaque palette-0）→ PNG 真解码 alpha 0/255',
        from: "if (buf[0] === 0x02 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00) {\n    rleBuf = buf.subarray(4)\n  }",
        to: 'if (false) {\n    rleBuf = buf.subarray(4)\n  }',
        category: '标记头语义破坏：BALL/RGM 单帧整-chunk 的 0x02000000 前缀被忽略，带头图标整体解坏成空槽',
      },
      {
        id: 'scene-label-zero-entry',
        module: 'src/resources/scene.ts',
        file: 'src/resources/scene.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R04 dumpScene 未占用切片轴',
        title: '入口 0：sceneId=0 从 0 切片；onEnter=0 → undefined；onTeleport 非 0 → L_ip',
        from: 'return ip > 0 ? `L_${ip}` : undefined',
        to: 'return ip >= 0 ? `L_${ip}` : undefined',
        category: '入口 0 语义破坏：ip=0「无入口」被伪造成假 label L_0，runtime 会把 0 当真入口跳转',
      },
    ],
  },
}

const MIXED_ERROR =
  /(^|\n)\s*(TypeError|RangeError|ReferenceError|SyntaxError|EvalError|URIError|Error)\s*:/
const TIMEOUT = /timed out|timeout/i

function judge(mutation, run, data) {
  const violations = []
  const expectedExit = mutation ? 1 : 0
  const expectedTotal = mutation ? mutation.total : mutation_batch.control.total
  if (run.signal !== null) violations.push(`terminated by signal ${String(run.signal)}`)
  if (run.status !== expectedExit) violations.push(`exit ${String(run.status)} != ${expectedExit}`)
  const text = stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(text))
    violations.push('unhandled runtime error')
  if (!data || !Array.isArray(data.testResults)) {
    violations.push('no report data')
    return violations
  }
  if (data.numTotalTests !== expectedTotal)
    violations.push(`numTotalTests ${data.numTotalTests} != ${expectedTotal}`)
  if (data.numPendingTests !== 0 || data.numTodoTests !== 0) violations.push('pending/todo present')
  if (data.testResults.some((file) => file.message)) violations.push('suite-level failure')
  const assertions = data.testResults.flatMap((file) => file.assertionResults ?? [])
  if (assertions.length !== expectedTotal)
    violations.push(`assertions ${assertions.length} != ${expectedTotal}`)
  if (new Set(assertions.map((entry) => entry.fullName)).size !== expectedTotal)
    violations.push('duplicate fullName in scope')
  const badStatus = assertions.filter(
    (entry) => entry.status !== 'passed' && entry.status !== 'failed',
  )
  if (badStatus.length > 0) violations.push(`${badStatus.length} entries neither passed nor failed`)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  const passed = assertions.filter((entry) => entry.status === 'passed')
  if (passed.length !== expectedTotal - failed.length)
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
  const targetFile = resolve(mutation_batch.packageRoot, mutation.file)
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

function sample(mutation) {
  const entries = Array.from({ length: mutation.total }, (_, index) => ({
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
    numTotalTests: mutation.total,
    numPendingTests: 0,
    numTodoTests: 0,
    success: false,
    testResults: [
      { name: resolve(mutation_batch.packageRoot, mutation.file), assertionResults: entries },
    ],
  }
}

function selfTest() {
  const mutation = mutation_batch.mutations[0]
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
          '/different-candidate-root/packages/pal-extract',
          mutation.file,
        )
      },
    },
    { id: 'exit-two', expectReject: true, run: { status: 2, signal: null, stdout: '', stderr: '' }, edit() {} },
    { id: 'exit-null', expectReject: true, run: { status: null, signal: null, stdout: '', stderr: '' }, edit() {} },
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
  const controlData = sample(mutation)
  controlData.numTotalTests = mutation_batch.control.total
  controlData.success = true
  const controlEntries = controlData.testResults[0].assertionResults.map((entry, index) =>
    index === 0 ? { ...entry, status: 'passed', failureMessages: [] } : entry,
  )
  while (controlEntries.length < mutation_batch.control.total)
    controlEntries.push({
      title: `control filler ${controlEntries.length}`,
      ancestorTitles: ['control'],
      fullName: `control control filler ${controlEntries.length}`,
      status: 'passed',
      failureMessages: [],
    })
  controlData.testResults[0].assertionResults = controlEntries
  const controlViolations = judge(
    null,
    { status: 0, signal: null, stdout: '', stderr: '' },
    controlData,
  )
  assert.equal(
    controlViolations.length,
    0,
    `control sample must pass: ${JSON.stringify(controlViolations)}`,
  )
  results.push({ id: 'control-sample', expectReject: false, rejected: false, violations: [] })
  return results
}

const batchKey = process.argv[2] ?? ''
const mutation_batch = batches[batchKey]
assert.ok(mutation_batch, `usage: node runtime-resource-mutants.mjs <${Object.keys(batches).join('|')}>`)

const selfTestResults = selfTest()
console.log(`criteria self-test: ${selfTestResults.length} cases, all as expected`)

const sourcePath = (name) => resolve(mutation_batch.packageRoot, name)
const hash = (name) =>
  createHash('sha256').update(readFileSync(sourcePath(name))).digest('hex')
const hashes = Object.fromEntries(mutation_batch.production.map((name) => [name, hash(name)]))

const evidence = []
for (const mutation of [null, ...mutation_batch.mutations]) {
  const id = mutation?.id ?? 'control'
  const tests = mutation ? [mutation.file] : mutation_batch.control.tests
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
export default {root:${JSON.stringify(mutation_batch.packageRoot)},
plugins:mutation?[{name:'isolated-runtime-resource',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target}));return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: mutation_batch.packageRoot,
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
  `${JSON.stringify({ batch: batchKey, hashes, selfTest: selfTestResults, evidence }, null, 2)}\n`,
)
console.log(
  `Batch ${batchKey} oracles passed: criteria self-test ${selfTestResults.length} cases + 1 control + ${mutation_batch.mutations.length} mutations. ${output}`,
)
