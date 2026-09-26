/** TEST-GLM-CONTENT-GUARDS-2 isolated single-point business controls; never edits production or coverage/fast. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-guard-leaf-mutants-'))
const tests = [
  'src/enemy-validation-shapes.leaf.test.ts',
  'src/enemy-ai-condition-guard.leaf.test.ts',
  'src/battle-choreography.leaf.test.ts',
]
const mutations = [
  {
    id: 'shapes-trim',
    file: 'src/enemy-validation-shapes.leaf.test.ts',
    module: 'enemy-validation-shapes',
    describe: 'G1 nonEmptyString',
    from: 'value !== value.trim()',
    to: "typeof value === 'string' && value.includes(' ')",
    title: '合法串原值返回；内部空格合法（只禁首尾空白）',
  },
  {
    id: 'ai-difficulty-index',
    file: 'src/enemy-ai-condition-guard.leaf.test.ts',
    module: 'enemy-ai-condition-guard',
    describe: 'G2 离散叶轴',
    from: 'nonEmptyString(entry, `${path}.in[${index}]`)',
    to: 'nonEmptyString(entry, `${path}.in`)',
    title: 'difficulty 非数组与元素非串拒绝（空表/空元素轴 wave2 已证）',
  },
  {
    id: 'ai-of-recursion',
    file: 'src/enemy-ai-condition-guard.leaf.test.ts',
    module: 'enemy-ai-condition-guard',
    describe: 'G3 组合容器',
    from: 'checkEnemyAiCondition(entry, `${path}.of[${index}]`)',
    to: '',
    title: '坏子节点在完整 where 路径上报告且同输入快照不变',
  },
  {
    id: 'choreo-tenths-bound',
    file: 'src/battle-choreography.leaf.test.ts',
    module: 'battle-choreography',
    describe: 'G4 动作叶',
    from: 'Number(action.tenths) > 10',
    to: 'Number(action.tenths) > 11',
    title: 'revivePartyAll tenths 越上界拒绝且输入不变',
  },
  {
    id: 'choreo-cue-path',
    file: 'src/battle-choreography.leaf.test.ts',
    module: 'battle-choreography',
    describe: 'G5 dialog 委派',
    from: 'options.checkDialogueCue(action.cue, `${path}.cue`)',
    to: 'options.checkDialogueCue(action.cue, path)',
    title: '选中 callback 收到原 cue 对象与精确路径，正常返回即接受',
  },
  {
    id: 'choreo-once-gate',
    file: 'src/battle-choreography.leaf.test.ts',
    module: 'battle-choreography',
    describe: 'G6 容器三层',
    from: "if (hook.once !== undefined && typeof hook.once !== 'boolean')",
    to: 'if (false)',
    title: 'once 非布尔拒绝且完整输入保真',
  },
]
const sourcePath = (name) => resolve(root, `packages/content/src/${name}.ts`)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const modules = [...new Set(mutations.map((entry) => entry.module))]
const hashes = Object.fromEntries(modules.map((name) => [name, hash(name)]))
const assertionOnly = (entry) =>
  entry.status === 'failed' &&
  entry.failureMessages.length > 0 &&
  entry.failureMessages.every((message) => /^AssertionError(?:\b|:)/.test(message.trimStart()))
assert(assertionOnly({ status: 'failed', failureMessages: ['AssertionError: expected'] }))
for (const messages of [
  ['Error: embeds AssertionError'],
  ['AssertionError: expected', 'TypeError: fixture'],
  ['Error: Test timed out'],
])
  assert(!assertionOnly({ status: 'failed', failureMessages: messages }))
assert(!assertionOnly({ status: 'pending', failureMessages: [] }))
const fullNameOf = (entry) =>
  [...(entry.ancestorTitles ?? []), entry.title].filter(Boolean).join(' > ')
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
  const config = join(output, `${id}.config.mjs`)
  writeFileSync(
    config,
    `import {readFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)}, target=${JSON.stringify(mutation ? sourcePath(mutation.module) : '')};
export default {root:${JSON.stringify(resolve(root, 'packages/content'))},
plugins:mutation?[{name:'isolated-guard-leaf',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  assert.equal(run.signal, null, `${id}: terminated`)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(
      stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`),
    ),
    `${id}: unhandled runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(data.numTotalTests, 91, `${id}: wrong scope`)
  assert.equal(data.numPendingTests, 0)
  assert.equal(data.numTodoTests, 0)
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite-level failure`,
  )
  const assertions = data.testResults.flatMap((file) => file.assertionResults)
  assert.equal(assertions.length, 91)
  assert.equal(new Set(assertions.map((entry) => entry.fullName)).size, 91)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  assert.equal(run.status, mutation ? 1 : 0, `${id}: unexpected exit; see ${output}`)
  assert.equal(data.success, !mutation)
  if (mutation) {
    assert(failed.length > 0 && failed.every(assertionOnly), `${id}: non-business failure`)
    const intendedFiles = data.testResults
      .filter((file) => file.assertionResults.some((entry) => entry.title === mutation.title))
      .map((file) => file.name)
    assert.equal(intendedFiles.length, 1, `${id}: intended title not unique in scope`)
    assert.ok(intendedFiles[0]?.endsWith(mutation.file), `${id}: intended case in unexpected file`)
    assert.equal(
      failed.filter((entry) => entry.title === mutation.title).length,
      1,
      `${id}: exact intended case not red`,
    )
    const targetFullName = `${mutation.describe} > ${mutation.title}`
    assert.ok(
      assertions.some(
        (entry) => entry.title === mutation.title && fullNameOf(entry) === targetFullName,
      ),
      `${id}: intended fullName absent from scope`,
    )
  } else {
    assert.equal(failed.length, 0)
    assert.equal(data.numPassedTests, 91)
  }
  for (const [name, before] of Object.entries(hashes))
    assert.equal(hash(name), before, `${id}: production modified`)
  evidence.push({
    id,
    exitCode: run.status,
    tests: data.numTotalTests,
    failed: failed.map((entry) => fullNameOf(entry)),
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(join(output, 'summary.json'), `${JSON.stringify({ hashes, evidence }, null, 2)}\n`)
console.log(`Guard leaf oracles passed: 1 control + ${mutations.length} mutations. ${output}`)
