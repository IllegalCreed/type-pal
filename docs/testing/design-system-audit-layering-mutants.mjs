/** Isolated real-module mutations for F1 design-system audit layering and flow performance. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageRoot = resolve(root, 'packages/editor')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-design-audit-layering-mutants-'))
const tests = {
  layering: 'scripts/design-system-audit-layering.test.mjs',
  rules: 'scripts/cursor-allowlist.test.mjs',
}
const titles = {
  ast: 'the AST fact layer caches one node while preserving conditional class variants',
  css: 'the CSS fact layer treats the scroll keyword as a bounded vertical owner',
  switch: 'unknown switches visit each distinct fall-through body once',
  terminal: 'a terminal empty case after default keeps its distinct continuation path',
  report: 'the report layer owns gate output and exit codes through narrow ports',
  rules: 'file, line, and rule mismatches stay unapproved while the original entry is stale',
}
const templateSigil = '$'
const mutations = [
  {
    id: 'ast-conditional-class-variant',
    source: 'scripts/design-system-audit-ast.mjs',
    test: tests.layering,
    title: titles.ast,
    from: '      const whenFalse = resolve(current.whenFalse)',
    to: '      const whenFalse = resolve(current.whenTrue)',
  },
  {
    id: 'switch-path-coalescing',
    source: 'scripts/design-system-audit-ast.mjs',
    test: tests.layering,
    title: titles.switch,
    from: '        pathStarts.add(firstExecutable)',
    to: '        pathStarts.add(start)',
  },
  {
    id: 'terminal-empty-case',
    source: 'scripts/design-system-audit-ast.mjs',
    test: tests.layering,
    title: titles.terminal,
    from: `        if (start === clauses.length) {
          canContinue = true
          continue
        }`,
    to: `        if (start === clauses.length) {
          canContinue = false
          continue
        }`,
  },
  {
    id: 'css-scroll-keyword',
    source: 'scripts/design-system-audit-css.mjs',
    test: tests.layering,
    title: titles.css,
    from: "          scroll: ['auto', 'scroll'].includes(winner?.value),",
    to: "          scroll: ['auto'].includes(winner?.value),",
  },
  {
    id: 'allowlist-rule-identity',
    source: 'scripts/design-system-audit-rules.mjs',
    test: tests.rules,
    title: titles.rules,
    from: `  for (const violation of violations) {
    const identity = \`${templateSigil}{violation.file}:${templateSigil}{violation.line}:${templateSigil}{violation.rule}\``,
    to: `  for (const violation of violations) {
    const identity = \`${templateSigil}{violation.file}:${templateSigil}{violation.line}:native-button\``,
  },
  {
    id: 'report-adoption-exit',
    source: 'scripts/design-system-audit-report.mjs',
    test: tests.layering,
    title: titles.report,
    from: `    if (adoptionProblems.length) {
      for (const problem of adoptionProblems) console.error(\`adoption: ${templateSigil}{problem}\`)
      return 2
    }`,
    to: `    if (adoptionProblems.length) {
      for (const problem of adoptionProblems) console.error(\`adoption: ${templateSigil}{problem}\`)
      return 0
    }`,
  },
]

const clean = (value) => stripVTControlCharacters(value)
function businessRed(exit, entries, file, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === file &&
    entry.fullName === title &&
    entry.status === 'failed' &&
    entry.failureMessages.length > 0 &&
    entry.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

const sample = {
  file: '/candidate.test.mjs',
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.file, sample.fullName))
for (const [exit, entries] of [
  [0, [sample]],
  [2, [sample]],
  [null, [sample]],
  [1, []],
  [1, [sample, sample]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const productFiles = [
  'packages/editor/scripts/design-system-audit.mjs',
  'packages/editor/scripts/design-system-audit-ast.mjs',
  'packages/editor/scripts/design-system-audit-css.mjs',
  'packages/editor/scripts/design-system-audit-report.mjs',
  'packages/editor/scripts/design-system-audit-rules.mjs',
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(productFiles.map((file) => [file, hash(file)]))
const rows = []
let controls

for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`)
  const config = resolve(output, `${id}.config.mjs`)
  const target = mutation ? resolve(packageRoot, mutation.source) : ''
  const testFile = mutation ? resolve(packageRoot, mutation.test) : ''
  const marker = resolve(output, `${id}.entered`)
  if (mutation) {
    assert.equal(
      readFileSync(target, 'utf8').split(mutation.from).length,
      2,
      `${id}: unique needle`,
    )
    assert.equal(
      controls.filter((entry) => entry.file === testFile && entry.fullName === mutation.title)
        .length,
      1,
      `${id}: exact passing control`,
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'design-audit-layering-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: packageRoot,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)))
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite error`,
  )
  assert.equal(data.numTodoTests, 0)
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  if (!mutation) {
    assert.equal(run.status, 0, `control: ${output}`)
    assert.equal(data.numPendingTests, 0)
    controls = entries
  } else {
    assert(businessRed(run.status, entries, testFile, mutation.title), `${id}: ${output}`)
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(data.numPendingTests, controls.length - 1)
  }
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(hash(file), expected, `${id}: changed product`)
  rows.push({
    id,
    exit: run.status,
    executed: entries
      .filter((entry) => ['passed', 'failed'].includes(entry.status))
      .map(({ file, fullName, status, failureMessages }) => ({
        file,
        fullName,
        status,
        failureMessages,
      })),
  })
  console.log(`${id}: ${mutation ? 'detected' : `${entries.length} passing`}`)
}

const summary = resolve(output, 'summary.json')
writeFileSync(summary, JSON.stringify({ output, productFiles, hashes, rows }, null, 2))
console.log(summary)
