// EDITOR-SPRITE-PICK-1: isolated in-memory Vite mutations; never rewrite product files.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const product = join(root, 'packages/editor/src/ui/SpriteUploadWizard.tsx')
const source = readFileSync(product, 'utf8')
const hash = () => createHash('sha256').update(readFileSync(product)).digest('hex')
const originalHash = hash()
const logs = mkdtempSync(join(tmpdir(), 'sprite-selection-mutants-'))
const cases = [
  { name: 'control' },
  {
    name: 'success-ownership',
    from: '      if (!selection.active || selection.revision !== revision) return',
    to: '      WITNESS',
  },
  {
    name: 'error-ownership',
    from: '      if (selection.active && selection.revision === revision)\n        setErr(e instanceof Error ? e.message : String(e))',
    to: '      WITNESS\n      setErr(e instanceof Error ? e.message : String(e))',
  },
  {
    name: 'bitmap-release',
    from: '      bitmap?.close()',
    to: '      WITNESS',
  },
  {
    name: 'ready-draft-admission',
    from: '\n      selection.readyDraft !== draft ||',
    to: '\n      (WITNESS, false) ||',
  },
  {
    name: 'palette-error-ownership',
    from: '        if (alive && selection.active) setErr(e instanceof Error ? e.message : String(e))',
    to: '        WITNESS\n        setErr(e instanceof Error ? e.message : String(e))',
  },
  {
    name: 'busy-state-ownership',
    from: '      if (selection.active && selection.revision === revision) setDecoding(false)',
    to: '      WITNESS\n      setDecoding(false)',
  },
]
const results = []
try {
  for (const item of cases) {
    if (item.from) assert.equal(source.split(item.from).length, 2, `${item.name}: unique point`)
    const marker = `SPRITE_MUTANT_EXECUTED:${item.name}`
    const replacement = item.to?.replace('WITNESS', `console.info(${JSON.stringify(marker)})`)
    const config = join(logs, `${item.name}.config.mjs`)
    writeFileSync(
      config,
      `
import {readFileSync} from 'node:fs';
export default {
 root:${JSON.stringify(join(root, 'packages/editor'))},
 plugins:[{name:'sprite-single-point-mutant',enforce:'pre',load(id){
   if(id.split('?')[0]!==${JSON.stringify(product)})return;
   const source=readFileSync(${JSON.stringify(product)},'utf8');
   return ${item.from ? `source.replace(${JSON.stringify(item.from)},${JSON.stringify(replacement)})` : 'source'};
 }}],
 test:{include:['src/ui/SpriteUploadWizard.selection.test.tsx','src/ui/SpriteUploadWizard.test.tsx'],
 maxWorkers:1,fileParallelism:false}
};`,
    )
    const run = spawnSync(
      'pnpm',
      ['--filter', '@type-pal/editor', 'exec', 'vitest', 'run', '--config', config],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 90_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${item.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.signal, null, log)
    assert.equal(run.status, item.from ? 1 : 0, log)
    assert.doesNotMatch(
      output,
      /TypeError|ReferenceError|SyntaxError|No test files found|Failed to load url|Cannot find module|Test timed out|Unhandled Errors/,
      log,
    )
    if (item.from) {
      assert.match(output, /AssertionError/, log)
      assert.match(
        output,
        new RegExp(`stdout \\|[^\\n]*\\n${marker}(?:\\n|$)`),
        `mutation must log from actual execution, not a source excerpt: ${log}`,
      )
    }
    results.push({ name: item.name, exit: run.status, log })
    console.log(`${item.name}: exit ${run.status}`)
  }
} finally {
  assert.equal(hash(), originalHash, 'product must remain byte-identical')
}
console.log(JSON.stringify({ logs, originalHash, results }, null, 2))
