// Codex independent review of d531aa24. Read candidate source, mutate only Vite's in-memory load.
// Usage: node docs/testing/editor-logic-coverage-review-witnesses.mjs /absolute/candidate/worktree
// A green mutant means the candidate tests missed a known contract violation; it is NOT acceptance.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'

const root = process.argv[2]
assert.ok(root && isAbsolute(root), 'pass the explicit candidate worktree path')
const logs = mkdtempSync(join(tmpdir(), 'editor-review-witnesses-'))
const editor = join(root, 'packages/editor')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const cases = [
  { name: 'control', testFile: 'actor-dialogue-commands.boundaries.test.ts' },
  {
    name: 'rename-input-mutation',
    file: 'actor-dialogue-commands.ts',
    testFile: 'actor-dialogue-commands.boundaries.test.ts',
    from: '    return { ...state, actors, scenes, items, sharedScripts, scriptChunks, enemies }',
    to: "    state.locale.__reviewInputPollution = 'leaked';\n    return { ...state, actors, scenes, items, sharedScripts, scriptChunks, enemies }",
    pollution: true,
  },
  {
    name: 'paint-input-mutation',
    file: 'commands.ts',
    testFile: 'commands-map.boundaries.test.ts',
    from: '    const next = paintProjectMapTiles(map, this.edits)',
    to: "    state.locale.__reviewInputPollution = 'leaked';\n    const next = paintProjectMapTiles(map, this.edits)",
    pollution: true,
  },
  {
    name: 'broken-rename-target',
    file: 'actor-dialogue-commands.ts',
    testFile: 'actor-dialogue-commands.boundaries.test.ts',
    from: '    expressions[to] = asset',
    to: "    expressions[to] = 'wrong-portrait-asset'",
  },
  {
    name: 'restore-input-mutation',
    file: 'actor-dialogue-commands.ts',
    testFile: 'actor-dialogue-commands.boundaries.test.ts',
    from: 'function restore(state: EditorState, slice: DialogueStateSlice): EditorState {\n',
    to: " state.locale.__reviewInputPollution = 'leaked';\n",
    afterMatch: true,
    pollution: true,
  },
  {
    name: 'real-closure-removal',
    file: 'actor-dialogue-commands.ts',
    testFile: 'actor-dialogue-commands.boundaries.test.ts',
    from: '    if (rewritten !== expected)',
    to: '    if (false)',
  },
]
const files = [...new Set(cases.filter((c) => c.file).map((c) => join(editor, 'src/core', c.file)))]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
try {
  for (const c of cases) {
    const product = c.file ? join(editor, 'src/core', c.file) : null
    const testFile = join(editor, 'src/core', c.testFile)
    if (product) assert.equal(readFileSync(product, 'utf8').split(c.from).length, 2, c.name)
    const verifyExecution = c.file
      ? `
import {afterAll as reviewAfterAll,expect as reviewExpect} from 'vitest';
reviewAfterAll(()=>{
 const calls=globalThis.__editorReviewWitnesses??[];
 reviewExpect(calls.length,'review witness did not execute').toBeGreaterThan(0);
 if(${Boolean(c.pollution)})for(const state of calls)
   reviewExpect(state.locale.__reviewInputPollution,'review pollution witness missing').toBe('leaked');
});`
      : ''
    const config = join(logs, `${c.name}.config.mjs`)
    writeFileSync(
      config,
      `
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const c=${JSON.stringify(c)}, product=${JSON.stringify(product)}, testFile=${JSON.stringify(testFile)};
export default {
 root:${JSON.stringify(editor)},
 plugins:[{name:'codex-editor-review-witness',enforce:'pre',load(id){
  if(id===testFile)return readFileSync(id,'utf8')+${JSON.stringify(verifyExecution)};
  if(!product||id!==product)return;
  const before=readFileSync(id,'utf8');assert.equal(before.split(c.from).length,2,'unique source point');
  console.log('MUTATION_LOADED',c.name);
  // Leading semicolon avoids attaching the witness to a preceding throw/delete expression.
  const witness='; (globalThis.__editorReviewWitnesses ??= []).push(state);\\n';
  return before.replace(c.from,(c.afterMatch?c.from:'')+witness+c.to);
 }}],
 test:{include:[${JSON.stringify(`src/core/${c.testFile}`)}],maxWorkers:1,fileParallelism:false}
};`,
    )
    const args = ['--filter', '@type-pal/editor', 'exec', 'vitest', 'run', '--config', config]
    const run = spawnSync('pnpm', args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${c.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.signal, null, log)
    assert.ok(run.status === 0 || run.status === 1, log)
    assert.doesNotMatch(
      output,
      /ReferenceError|TypeError|SyntaxError|Cannot find module|Failed to load url|No test files found|Test timed out|Unhandled Errors/,
      log,
    )
    if (!c.file) assert.equal(run.status, 0, log)
    else {
      assert.ok(output.includes(`MUTATION_LOADED ${c.name}`), log)
      // The assertion messages also appear in source excerpts only if this verification failed.
      assert.doesNotMatch(
        output,
        /AssertionError: review witness did not execute|AssertionError: review pollution witness missing/,
        log,
      )
      if (run.status === 1) assert.match(output, /AssertionError/, log)
    }
    results.push({
      name: c.name,
      exit: run.status,
      verdict: c.file ? (run.status ? 'detected' : 'MISSED') : 'control',
      log,
    })
    process.stdout.write(`${c.name}: exit ${run.status}\n`)
  }
} finally {
  for (const [file, hash] of Object.entries(hashes))
    assert.equal(sha(readFileSync(file)), hash, `product drift: ${file}`)
}
console.log(JSON.stringify({ logs, sourceHashes: hashes, results }, null, 2))
