/** Codex review of b8e037cb: candidate code is only transformed in a temporary Vite loader. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import ts from 'typescript'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-glm-content-guards-wave2')
const output = mkdtempSync(resolve(tmpdir(), 'codex-guard-leaf-review-'))
const tool = readFileSync(
  resolve(root, 'docs/testing/glm-content-guards-wave2/guard-leaf-mutants.mjs'),
  'utf8',
)
const tree = ts.createSourceFile(
  'mutants.mjs',
  tool,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
function initializer(name) {
  const found = []
  function walk(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(tree) === name) found.push(n)
    ts.forEachChild(n, walk)
  }
  walk(tree)
  assert.equal(found.length, 1)
  return found[0].initializer.getText(tree)
}
// Execute the author's actual runtime validation block; no substitute predicate.
const start = tool.indexOf('  assert.equal(data.numTotalTests,')
const end = tool.indexOf('  for (const [name, before]', start)
assert(start >= 0 && end > start)
const judge = new Function(
  'assert',
  'mutation',
  'run',
  'data',
  'root',
  'output',
  `
 const id=mutation.id;
 const assertionOnly=${initializer('assertionOnly')};
 const fullNameOf=${initializer('fullNameOf')};
 ${tool.slice(start, end)}
`,
)
const mutation = new Function(`return (${initializer('mutations')})[0]`)()
function sample() {
  const entries = Array.from({ length: 91 }, (_, index) => ({
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
    numTotalTests: 91,
    numPassedTests: 90,
    numPendingTests: 0,
    numTodoTests: 0,
    success: false,
    testResults: [
      { name: resolve(root, 'packages/content', mutation.file), assertionResults: entries },
    ],
  }
}
const criterionCases = [
  { id: 'valid-red', expected: true, edit() {} },
  {
    id: 'same-message-mixed-error',
    expected: false,
    edit(d) {
      d.testResults[0].assertionResults[0].failureMessages[0] += '\nTypeError: environment broken'
    },
  },
  {
    id: 'assertion-prefixed-timeout',
    expected: false,
    edit(d) {
      d.testResults[0].assertionResults[0].failureMessages = ['AssertionError: test timed out']
    },
  },
  {
    id: 'additional-unrelated-red',
    expected: false,
    edit(d) {
      d.testResults[0].assertionResults[1].status = 'failed'
      d.testResults[0].assertionResults[1].failureMessages = ['AssertionError: unrelated red']
      d.numPassedTests = 89
    },
  },
  {
    id: 'wrong-fullname-red-with-intended-green',
    expected: false,
    edit(d) {
      const entries = d.testResults[0].assertionResults
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
    expected: false,
    edit(d) {
      d.testResults[0].name = resolve('/different-candidate-root/packages/content', mutation.file)
    },
  },
  { id: 'exit-two', expected: false, exit: 2, edit() {} },
  { id: 'exit-null', expected: false, exit: null, edit() {} },
]
const criterion = criterionCases.map((item) => {
  const data = sample()
  item.edit(data)
  let accepted = false
  try {
    judge(
      assert,
      mutation,
      { status: Object.hasOwn(item, 'exit') ? item.exit : 1 },
      data,
      root,
      output,
    )
    accepted = true
  } catch {}
  return { id: item.id, expected: item.expected, accepted }
})
console.log(JSON.stringify({ criterion }, null, 2))

const tests = [
  'enemy-validation-shapes.leaf',
  'enemy-ai-condition-guard.leaf',
  'battle-choreography.leaf',
]
const sources = ['enemy-validation-shapes', 'enemy-ai-condition-guard', 'battle-choreography']
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, `packages/content/src/${name}.ts`)))
    .digest('hex')
const hashes = Object.fromEntries(sources.map((name) => [name, hash(name)]))
const probes = [
  {
    id: 'record-mutates-same-object',
    source: 'enemy-validation-shapes',
    from: '  return value as Record<string, unknown>',
    to: "  if (path === 'v' && (value as Record<string, unknown>).kind === 'wait') (value as Record<string, unknown>).ms = 888\n  return value as Record<string, unknown>",
  },
  {
    id: 'callback-mutates-cue-after-delivery',
    source: 'battle-choreography',
    from: `options.checkDialogueCue(action.cue, \`\${path}.cue\`)`,
    to: `(options.checkDialogueCue(action.cue, \`\${path}.cue\`), Object.assign((action.cue as {rows: {text: string}[]}).rows[0], {text: 'changed-by-validator'}))`,
  },
  {
    id: 'difficulty-path-prefix-corrupted',
    source: 'enemy-ai-condition-guard',
    from: `nonEmptyString(entry, \`\${path}.in[\${index}]\`)`,
    to: `nonEmptyString(entry, \`WRONG.\${path}.in[\${index}]\`)`,
  },
]
const rows = []
for (const item of [null, ...probes]) {
  const id = item?.id ?? 'control',
    report = resolve(output, `${id}.json`),
    config = resolve(output, `${id}.config.mjs`)
  const target = item ? resolve(root, `packages/content/src/${item.source}.ts`) : ''
  const entered = resolve(output, `${id}.entered.json`)
  if (item) assert.equal(readFileSync(target, 'utf8').split(item.from).length, 2, id)
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(item)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(resolve(root, 'packages/content'))},plugins:item?[{name:'codex-guard-leaf-witness',enforce:'pre',load(id){if(id!==target)return;const text=readFileSync(target,'utf8');if(text.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:item.id,target}));return text.replace(item.from,item.to)}}]:[],
test:{include:${JSON.stringify(tests.map((name) => `src/${name}.test.ts`))},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  writeFileSync(resolve(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
  assert.equal(run.signal, null)
  const result = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(result.numTotalTests, 91)
  assert.equal(result.numPendingTests, 0)
  assert(result.testResults.every((file) => !file.message))
  const failed = result.testResults.flatMap((file) =>
    file.assertionResults
      .filter((entry) => entry.status === 'failed')
      .map((entry) => ({ file: file.name, ...entry })),
  )
  if (!item) {
    assert.equal(run.status, 0)
    assert.equal(result.numPassedTests, 91)
  } else assert.deepEqual(JSON.parse(readFileSync(entered, 'utf8')), { id, target })
  for (const [name, expected] of Object.entries(hashes)) assert.equal(hash(name), expected)
  const verdict = !item
    ? 'control'
    : run.status === 0 && result.numPassedTests === 91
      ? 'MISSED'
      : run.status === 1 &&
          failed.length > 0 &&
          failed.every(
            (entry) =>
              entry.failureMessages.length > 0 &&
              entry.failureMessages.every((m) => /^AssertionError\b/.test(m.trimStart())),
          )
        ? 'detected'
        : 'invalid'
  rows.push({ id, exit: run.status, passed: result.numPassedTests, failed, verdict })
  console.log(`${id}: ${verdict}, ${result.numPassedTests}/91 passed`)
}
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ root, criterion, hashes, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
