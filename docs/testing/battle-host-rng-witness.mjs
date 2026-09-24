/** Rebuild the original H9 RNG counterexample against both frozen and refactored hosts. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = process.cwd()
const out = mkdtempSync(resolve(tmpdir(), 'battle-host-rng-'))
const path = 'packages/reforge/src/main.battle-host-flows.test.ts'
const originalTest = execFileSync('git', ['show', `7f3840e6:${path}`], { encoding: 'utf8' })
const oldMain = execFileSync('git', ['show', '7f3840e6:packages/reforge/src/main.ts'], {
  encoding: 'utf8',
})
const title =
  'H9 real defeat writes zero HP, skips victory hooks and follows only onLose plus continuation'
const needle = `test('${title}', async () => {\n  host = await installShellHost()`
assert.equal(originalTest.split(needle).length, 2)
const rows = []
for (const version of ['before', 'after'])
  for (const rng of [0.99, 0.5]) {
    const id = `${version}-${rng}`
    const test = `import { vi } from 'vitest'\n${originalTest.replace(needle, `${needle}\n  vi.spyOn(Math, 'random').mockReturnValue(${rng})`)}`
    const report = resolve(out, `${id}.json`)
    const config = resolve(out, `${id}.config.mjs`)
    writeFileSync(
      config,
      `export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:[{name:'frozen-h9',enforce:'pre',load(id){if(id===${JSON.stringify(resolve(root, path))})return ${JSON.stringify(test)};if(${version === 'before'}&&id===${JSON.stringify(resolve(root, 'packages/reforge/src/main.ts'))})return ${JSON.stringify(oldMain)}}}],test:{include:['src/main.battle-host-flows.test.ts'],testNamePattern:${JSON.stringify(`^${title}$`)},reporters:['json'],outputFile:${JSON.stringify(report)},maxWorkers:1}}`,
    )
    const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
      cwd: root,
      env: preciseCoverageEnvironment(),
      encoding: 'utf8',
    })
    writeFileSync(resolve(out, `${id}.log`), `${run.stdout}\n${run.stderr}`)
    const result = JSON.parse(readFileSync(report, 'utf8'))
    const entries = result.testResults
      .flatMap((f) => f.assertionResults)
      .filter((e) => ['passed', 'failed'].includes(e.status))
    assert.equal(entries.length, 1)
    assert.equal(entries[0].fullName, title)
    assert.equal(run.status, rng === 0.99 ? 1 : 0)
    if (rng === 0.99)
      assert(entries[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
    rows.push({
      version,
      rng,
      exit: run.status,
      status: entries[0].status,
      failures: entries[0].failureMessages,
    })
    console.log(id, run.status, entries[0].status)
  }
writeFileSync(resolve(out, 'summary.json'), JSON.stringify(rows, null, 2))
console.log(out)
