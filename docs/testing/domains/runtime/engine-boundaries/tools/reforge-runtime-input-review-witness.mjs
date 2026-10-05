// Independent D1 input-fidelity review. Vite-only mutation; candidate files stay untouched.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = realpathSync(process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-glm-reforge-runtime')
const product = join(root, 'packages/reforge/src/project-loader.ts')
const source = readFileSync(product, 'utf8')
const hash = () => createHash('sha256').update(readFileSync(product)).digest('hex')
const before = hash()
const logs = mkdtempSync(join(tmpdir(), 'runtime-input-review-'))
const from = 'for (const id of project.sceneIds) scenes.push(await loadScene(project, id))'
assert.equal(source.split(from).length, 2, 'one mutation site')
const results = []
try {
  for (const mutant of [false, true]) {
    const name = mutant ? 'loader-project-input-pollution' : 'control'
    const marker = `RR1_INPUT_REVIEW_EXECUTED:${name}`
    const to = `${from}
    const actor = Object.values(project.actorsById)[0];
    if (actor) { actor.name = 'polluted.name'; console.info(${JSON.stringify(marker)}, actor.name); }`
    const config = join(logs, `${name}.config.mjs`)
    const json = join(logs, `${name}.json`)
    writeFileSync(
      config,
      `import {readFileSync} from 'node:fs';
export default {root:${JSON.stringify(join(root, 'packages/reforge'))},
plugins:[{name:'runtime-input-review',enforce:'pre',load(id){
 if(id.split('?')[0]!==${JSON.stringify(product)})return;
 const text=readFileSync(${JSON.stringify(product)},'utf8');
 return ${mutant ? `text.replace(${JSON.stringify(from)},${JSON.stringify(to)})` : 'text'};
}}],test:{include:['src/project-loader.current-boundaries.test.ts'],maxWorkers:1,fileParallelism:false}};`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/reforge',
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
      { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${name}.log`)
    writeFileSync(log, output)
    assert.equal(run.error, undefined, log)
    assert.equal(run.signal, null, log)
    const report = JSON.parse(readFileSync(json, 'utf8'))
    const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
    assert.ok(assertions.length > 0, log)
    assert.doesNotMatch(
      output + JSON.stringify(report),
      /TypeError|ReferenceError|SyntaxError|No test files found|Test timed out|Unhandled Errors/,
      log,
    )
    if (mutant) {
      assert.match(output, new RegExp(`stdout \\|[^\\n]*\\n${marker} polluted.name(?:\\n|$)`), log)
      if (run.status === 0)
        assert.ok(
          assertions.every((result) => result.status === 'passed'),
          log,
        )
      else {
        assert.equal(run.status, 1, log)
        assert.match(output + JSON.stringify(report), /AssertionError/, log)
      }
    } else assert.equal(run.status, 0, log)
    results.push({
      name,
      exit: run.status,
      tests: assertions.length,
      verdict: mutant ? (run.status === 0 ? 'MISSED' : 'detected') : 'control',
      log,
      json,
    })
  }
} finally {
  assert.equal(hash(), before, 'candidate product changed')
}
console.log(JSON.stringify({ root, logs, hash: before, from, results }, null, 2))
