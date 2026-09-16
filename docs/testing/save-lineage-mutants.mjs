// SAVE-BARRIER-LINEAGE-1: isolated single-point negative controls; never writes product sources.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'save-lineage-mutants-'))
const sourceRoot = join(root, 'packages/reforge/src')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const include = [
  'src/script-activity-lineage.test.ts',
  'src/runtime-save-lineage.test.ts',
  'src/save-lineage.chain.test.ts',
]
const cases = [
  { name: 'control', expected: 0 },
  {
    name: 'wrapper-key',
    file: 'runtime-script-project.ts',
    from: 'return await withScriptActivityLineage(this, this.coordinator, signal, () =>\n      this.options.startBattle(request, signal),\n    )',
    to: 'return await this.retainedHost.startBattle(request, signal)',
    test: 'confirm → save → battle',
    expected: 1,
  },
  {
    name: 'wide-admission',
    file: 'script-world.ts',
    from: 'if (this.pending && (!parent || this.pending.ready)) return',
    to: '/* gate deliberately removed */',
    test: 'child/grandchild keep the barrier',
    expected: 1,
  },
  {
    name: 'premature-child-stop',
    file: 'script-world.ts',
    from: 'this.coordinator.gateClosed() && !this.nested',
    to: 'this.coordinator.gateClosed()',
    test: 'confirm → save → exit',
    expected: 1,
  },
  {
    name: 'stale-registration',
    file: 'script-activity-lineage.ts',
    from: 'coordinator.hasActiveLease(registration.lease)',
    to: 'true',
    test: 'closed lease with pending finally',
    expected: 1,
  },
  {
    name: 'exception-lease-leak',
    file: 'script-activity-lineage.ts',
    from: 'activity.close()',
    to: '/* no close */',
    test: 'failed activity releases membership',
    expected: 1,
  },
  {
    name: 'stale-epoch-write',
    file: 'script-world.ts',
    from: 'this.coordinator.epochForKey(this.key) !== this.epoch',
    to: 'false',
    test: 'epoch invalidation does not kill live lineage',
    expected: 1,
  },
  {
    name: 'forged-parent',
    file: 'script-world.ts',
    from: 'parent && !this.hasActiveLease(parent)',
    to: 'false',
    test: 'begin rejects',
    expected: 1,
  },
  {
    name: 'key-not-identity',
    file: 'script-world.ts',
    from: 'return key !== undefined && this.active.get(key) === lease',
    to: 'return key !== undefined && this.active.has(key)',
    test: 'closed lease with pending finally',
    expected: 1,
  },
]
const paths = [
  ...new Set(cases.flatMap((entry) => (entry.file ? [join(sourceRoot, entry.file)] : []))),
]
const hashes = Object.fromEntries(paths.map((file) => [file, sha(readFileSync(file))]))
const results = []
try {
  for (const entry of cases) {
    const file = entry.file ? join(sourceRoot, entry.file) : null
    if (file)
      assert.equal(
        readFileSync(file, 'utf8').split(entry.from).length,
        2,
        `unique point: ${entry.name}`,
      )
    const config = join(logs, `${entry.name}.config.mjs`)
    writeFileSync(
      config,
      `
      import { readFileSync } from 'node:fs';
      import assert from 'node:assert/strict';
      const entry = ${JSON.stringify({ ...entry, file })};
      export default {
        root: ${JSON.stringify(join(root, 'packages/reforge'))},
        plugins: [{name:'save-lineage-single-point',enforce:'pre',load(id){
          if(!entry.file || id.split('?')[0]!==entry.file)return;
          const text=readFileSync(entry.file,'utf8');
          assert.equal(text.split(entry.from).length,2,'unique source point');
          console.log('MUTATION_HIT',entry.name);
          return text.replace(entry.from,entry.to);
        }}],
        test:{include:${JSON.stringify(include)},maxWorkers:1,fileParallelism:false}
      };
    `,
    )
    const args = ['--filter', '@type-pal/reforge', 'exec', 'vitest', 'run', '--config', config]
    if (entry.test) args.push('-t', entry.test)
    const run = spawnSync('pnpm', args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${entry.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.signal, null, `interrupted ${entry.name}: ${log}`)
    assert.equal(run.status, entry.expected, `exit ${entry.name}: ${log}`)
    assert.doesNotMatch(
      output,
      /No test files found|Cannot find module|Failed to load url|Test timed out|Unhandled Errors/,
      log,
    )
    if (entry.expected) {
      assert.ok(output.includes(`MUTATION_HIT ${entry.name}`), `not loaded ${entry.name}`)
      assert.match(output, /AssertionError/, `not a business assertion ${log}`)
    }
    results.push({
      ...entry,
      file,
      command: ['pnpm', ...args],
      exit: run.status,
      log,
      logSha256: sha(output),
    })
    process.stderr.write(`${entry.name}: ${run.status}\n`)
  }
} finally {
  for (const [file, hash] of Object.entries(hashes))
    assert.equal(sha(readFileSync(file)), hash, `source changed: ${file}`)
}
console.log(JSON.stringify({ logs, hashes, results }, null, 2))
