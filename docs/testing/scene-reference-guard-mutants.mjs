// EDITOR-SCENE-REF-GUARD-1: one normal control + three isolated, runtime-witnessed mutations.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const product = join(root, 'packages/editor/src/core/project-reference-adapters.ts')
const source = readFileSync(product, 'utf8')
const hash = () => createHash('sha256').update(readFileSync(product)).digest('hex')
const originalHash = hash()
const logs = mkdtempSync(join(tmpdir(), 'scene-reference-guard-mutants-'))
const cases = [
  { name: 'control' },
  {
    name: 'omit-selection-scene',
    from: "kind !== 'selectSceneHooks' &&",
    to: '(WITNESS, true) &&',
    redTest: 'onEnter retains inherit/disabled scene dependency with exact source',
  },
  {
    name: 'omit-transition-wiring',
    from: '...canonicalTransitionSceneEdges(input.transitionVisits, input.scriptState),',
    to: '...(WITNESS, []),',
    redTest: 'onEnter collects all/any/not and nested transitions once, not command bodies',
  },
  {
    name: 'duplicate-use-hook',
    from: "target.target.kind !== 'scene-hook'",
    to: '(WITNESS, true)',
    redTest:
      "'one use plus disabled' keeps each existing composite edge once in the parent scene bucket",
  },
]

const environmentalError =
  /TypeError|ReferenceError|SyntaxError|No test files found|Failed to load url|Cannot find module|Test timed out|Unhandled Errors/
const businessFailure = (text) => /AssertionError/.test(text) && !environmentalError.test(text)
assert.equal(businessFailure('AssertionError: expected one scene reference'), true)
assert.equal(
  businessFailure('AssertionError: expected one; TypeError; Test timed out; Unhandled Errors'),
  false,
)

const results = []
try {
  for (const item of cases) {
    if (item.from) assert.equal(source.split(item.from).length, 2, `${item.name}: unique mutation`)
    const marker = `SCENE_REFERENCE_MUTANT_EXECUTED:${item.name}`
    const replacement = item.to?.replace('WITNESS', `console.info(${JSON.stringify(marker)})`)
    const config = join(logs, `${item.name}.config.mjs`)
    const json = join(logs, `${item.name}.json`)
    writeFileSync(
      config,
      `
import {readFileSync} from 'node:fs';
export default {
 root:${JSON.stringify(join(root, 'packages/editor'))},
 plugins:[{name:'scene-reference-single-point-mutant',enforce:'pre',load(id){
   if(id.split('?')[0]!==${JSON.stringify(product)})return;
   const source=readFileSync(${JSON.stringify(product)},'utf8');
   return ${item.from ? `source.replace(${JSON.stringify(item.from)},${JSON.stringify(replacement)})` : 'source'};
 }}],
 test:{include:['src/core/project-reference-scene-guards.test.ts','src/core/scene-reference-deletion-workflow.test.ts'],
 maxWorkers:1,fileParallelism:false}
};`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/editor',
        'exec',
        'vitest',
        'run',
        '--config',
        config,
        '--reporter=default',
        '--reporter=json',
        '--outputFile.json',
        json,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${item.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.error, undefined, log)
    assert.equal(run.signal, null, log)
    assert.equal(run.status, item.from ? 1 : 0, log)
    const report = JSON.parse(readFileSync(json, 'utf8'))
    const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
    assert.equal(assertions.length, 22, 'every final regression must actually execute')
    assert.doesNotMatch(output + JSON.stringify(report), environmentalError, log)
    if (item.from) {
      assert.ok(businessFailure(output + JSON.stringify(report)), log)
      assert.match(output, new RegExp(`stdout \\|[^\\n]*\\n${marker}(?:\\n|$)`), log)
      const failure = assertions.find((result) => result.title === item.redTest)
      assert.equal(failure?.status, 'failed', `named new business regression: ${item.redTest}`)
      assert.match(failure.failureMessages.join('\n'), /AssertionError/)
    } else
      assert.ok(
        assertions.every((result) => result.status === 'passed'),
        log,
      )
    results.push({
      name: item.name,
      exit: run.status,
      tests: assertions.length,
      redTest: item.redTest,
      log,
      json,
    })
    console.log(`${item.name}: exit ${run.status}, ${assertions.length} executed`)
  }
} finally {
  assert.equal(hash(), originalHash, 'product file changed during isolation')
}
console.log(JSON.stringify({ logs, originalHash, results }, null, 2))
