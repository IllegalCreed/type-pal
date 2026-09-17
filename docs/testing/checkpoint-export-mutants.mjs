// Q1-CHECKPOINT-EXPORT-1: isolated mutations of the actual main.ts?raw registration/queue.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'checkpoint-export-mutants-'))
const file = join(root, 'packages/reforge/src/main.ts')
const sha = (text) => createHash('sha256').update(text).digest('hex')
const before = readFileSync(file, 'utf8')
const binding = 'dumpSave: () => enqueueSaveSnapshot(captureCurrentSavePayload)'
const cases = [
  { name: 'control', expected: 0 },
  {
    name: 'bare-builder',
    from: binding,
    to: 'dumpSave: buildCurrentSavePayload',
    test: 'actual DEV zero-argument',
    expected: 1,
  },
  {
    name: 'bypass-barrier',
    from: binding,
    to: 'dumpSave: async () => captureCurrentSavePayload()',
    test: 'export timeout rejects',
    expected: 1,
  },
  {
    name: 'independent-export',
    from: binding,
    to: 'dumpSave: () => expectDefined(scriptRuntime).withSaveBarrier(captureCurrentSavePayload)',
    test: 'shared queue preserves',
    expected: 1,
  },
  {
    name: 'swallow-snapshot',
    from: '    return snapshot\n  }\n\n  function doSave',
    to: '    return snapshot.catch(() => undefined as never)\n  }\n\n  function doSave',
    test: 'snapshot exception reaches caller',
    expected: 1,
  },
  {
    name: 'poison-queue',
    from: '    saveSnapshotQueue = snapshot.then(\n      () => undefined,\n      () => undefined,\n    )',
    to: '    saveSnapshotQueue = snapshot as Promise<void>',
    test: 'snapshot exception reaches caller',
    expected: 1,
  },
]
const results = []
try {
  for (const entry of cases) {
    if (entry.from) assert.equal(before.split(entry.from).length, 2, `unique point: ${entry.name}`)
    const config = join(logs, `${entry.name}.config.mjs`)
    writeFileSync(
      config,
      `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const entry = ${JSON.stringify(entry)};
const file = ${JSON.stringify(file)};
export default {
 root: ${JSON.stringify(join(root, 'packages/reforge'))},
 plugins:[{name:'checkpoint-single-point',enforce:'pre',load(id){
   if(!entry.from || id.split('?')[0]!==file)return;
   const source=readFileSync(file,'utf8');
   assert.equal(source.split(entry.from).length,2,'unique point');
   const changed=source.replace(entry.from,entry.to);
   console.log('MUTATION_HIT',entry.name);
   return id.includes('?raw')?'export default '+JSON.stringify(changed):changed;
 }}],
 test:{include:['src/checkpoint-export.chain.test.ts'],maxWorkers:1,fileParallelism:false}
};
`,
    )
    const command = ['--filter', '@type-pal/reforge', 'exec', 'vitest', 'run', '--config', config]
    if (entry.test) command.push('-t', entry.test)
    const run = spawnSync('pnpm', command, {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${entry.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.signal, null, `interrupted: ${log}`)
    assert.equal(run.status, entry.expected, `exit: ${log}`)
    assert.doesNotMatch(
      output,
      /ReferenceError|Cannot find module|Failed to load url|No test files found|Test timed out|Unhandled Errors/,
      log,
    )
    if (entry.expected) {
      assert.ok(output.includes(`MUTATION_HIT ${entry.name}`), `not loaded: ${log}`)
      assert.match(output, /AssertionError/, `not business red: ${log}`)
    }
    results.push({
      ...entry,
      command: ['pnpm', ...command],
      exit: run.status,
      log,
      logSha256: sha(output),
    })
    process.stdout.write(`${entry.name}: expected ${entry.expected}, actual ${run.status}\n`)
  }
} finally {
  assert.equal(sha(readFileSync(file)), sha(before), 'product changed during negative controls')
}
console.log(JSON.stringify({ logs, productSha256: sha(before), results }, null, 2))
