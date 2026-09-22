/** Isolated loader mutations; never edits production files or official coverage outputs. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-reference-mutants-'))
const actor = 'packages/content/src/actor-reference.ts'
const command = 'packages/content/src/command-target-reference.ts'
const tests = [
  'src/actor-reference.boundaries.test.ts',
  'src/command-target-reference.boundaries.test.ts',
]
const renameCase =
  'expression rename changes only exact actor/key leaves, preserves the actual input and all other dialogue data'
const mutations = [
  {
    id: 'actor-owner',
    file: actor,
    from: 'identityRecord.actor === actorId &&',
    to: 'true &&',
    title: renameCase,
  },
  {
    id: 'input-mutation',
    file: actor,
    from: 'rewritten++',
    to: 'portraitRecord.expression = to; rewritten++',
    title: renameCase,
  },
  {
    id: 'rewrite-count',
    file: actor,
    from: 'rewritten++',
    to: 'rewritten += 0',
    title: renameCase,
  },
  {
    id: 'choreography',
    file: actor,
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Exact source text needle, not an interpolated value.
    from: 'references.push(...collectActorTaggedReferences(record.choreography, `${where}.choreography`))',
    to: 'references.push(...[])',
    title:
      'canonical battle visit includes choreography actor leaves but leaves onLose commands for their own visitor',
  },
  {
    id: 'visitor-reset',
    file: command,
    from: 'nodeReferences.length = 0',
    to: 'void nodeReferences',
    title:
      'visitor publishes each edge exactly once and later nodes cannot overwrite retained callbacks',
  },
  {
    id: 'copy-alias',
    file: command,
    from: 'return visit(value) as T',
    to: 'return value',
    title: 'copy deeply detaches non-reference dialogue data and leaves literal source text intact',
  },
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries([actor, command].map((file) => [file, hash(file)]))
const assertionOnly = (entry) =>
  entry.status === 'failed' &&
  entry.failureMessages.length > 0 &&
  entry.failureMessages.every((message) => /^AssertionError(?:\b|:)/.test(message.trimStart()))
assert(assertionOnly({ status: 'failed', failureMessages: ['AssertionError: expected 2 to be 1'] }))
assert(!assertionOnly({ status: 'failed', failureMessages: ['Error: embeds AssertionError'] }))
assert(
  !assertionOnly({
    status: 'failed',
    failureMessages: ['AssertionError: expected', 'TypeError: setup failed'],
  }),
)
assert(!assertionOnly({ status: 'failed', failureMessages: ['Error: Test timed out'] }))
assert(!assertionOnly({ status: 'pending', failureMessages: [] }))

const evidence = []
for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  if (mutation)
    assert.equal(
      readFileSync(resolve(root, mutation.file), 'utf8').split(mutation.from).length - 1,
      1,
      `${id}: needle must be unique`,
    )
  const report = join(output, `${id}.json`),
    config = join(output, `${id}.config.mjs`)
  writeFileSync(
    config,
    `import {readFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)},target=${JSON.stringify(mutation ? resolve(root, mutation.file) : '')};
export default {root:${JSON.stringify(resolve(root, 'packages/content'))},
plugins:mutation?[{name:'isolated-reference-oracle',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('mutation needle not unique');return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  assert.equal(run.signal, null, `${id}: process terminated`)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(
      stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`),
    ),
    `${id}: unhandled environment/runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(data.numTotalTests, 12, `${id}: wrong execution scope`)
  assert.equal(data.numPendingTests, 0, `${id}: skipped tests`)
  assert.equal(data.numTodoTests, 0, `${id}: todo tests`)
  const assertions = data.testResults.flatMap((file) => file.assertionResults)
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite-level error`,
  )
  assert.equal(assertions.length, 12)
  assert.equal(new Set(assertions.map((entry) => entry.fullName)).size, 12)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  if (!mutation) {
    assert.equal(run.status, 0, `${id}: control failed; see ${output}`)
    assert.equal(data.success, true)
    assert.equal(failed.length, 0)
    assert.equal(data.numPassedTests, 12)
  } else {
    assert.equal(run.status, 1, `${id}: mutant not rejected; see ${output}`)
    assert.equal(data.success, false)
    assert(failed.length > 0 && failed.every(assertionOnly), `${id}: non-business failure`)
    assert.equal(
      failed.filter((entry) => entry.fullName === mutation.title).length,
      1,
      `${id}: intended case not red`,
    )
  }
  for (const [file, before] of Object.entries(hashes))
    assert.equal(hash(file), before, `${id}: production modified`)
  evidence.push({
    id,
    exitCode: run.status,
    tests: data.numTotalTests,
    failed: failed.map((entry) => entry.fullName),
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(join(output, 'summary.json'), `${JSON.stringify({ hashes, evidence }, null, 2)}\n`)
console.log(`Reference oracles passed: 1 control + ${mutations.length} mutations. ${output}`)
