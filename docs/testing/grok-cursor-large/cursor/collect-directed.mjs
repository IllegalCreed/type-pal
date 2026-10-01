#!/usr/bin/env node
/**
 * Collect directed vitest JSON for cursor-r1 tests.
 * Usage: node docs/testing/grok-cursor-large/cursor/collect-directed.mjs [glob...]
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = process.cwd()
const editorRoot = join(root, 'packages/editor')
const out = resolve(root, 'docs/testing/grok-cursor-large/cursor/directed-vitest.json')

function discoverCursorR1Tests(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) discoverCursorR1Tests(p, acc)
    else if (/\.cursor-r1\.test\.(ts|tsx)$/.test(name)) acc.push(p.replace(`${editorRoot}/`, ''))
  }
  return acc
}

const cliSpecs = process.argv.slice(2)
const testSpecs =
  cliSpecs.length > 0 ? cliSpecs : discoverCursorR1Tests(join(editorRoot, 'src')).sort()
if (testSpecs.length === 0) {
  console.error('no cursor-r1 test files found')
  process.exit(2)
}

const rawPath = resolve(root, 'docs/testing/grok-cursor-large/cursor/_vitest-raw.json')
const result = spawnSync(
  'pnpm',
  [
    '--filter',
    '@type-pal/editor',
    'exec',
    'vitest',
    'run',
    '--reporter=json',
    '--outputFile',
    rawPath,
    ...testSpecs,
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_COMPILE_CACHE: undefined } },
)
let raw
try {
  raw = JSON.parse(readFileSync(rawPath, 'utf8'))
} catch (error) {
  console.error(result.stdout)
  console.error(result.stderr)
  throw error
}
const tests = []
for (const file of raw.testResults ?? []) {
  const rel = file.name.replace(/.*\/packages\/editor\//, '')
  for (const t of file.assertionResults ?? []) {
    tests.push({
      file: rel.startsWith('src/') ? rel : `src/${rel}`,
      fullName: t.fullName ?? t.title,
      status: t.status === 'passed' ? 'passed' : t.status,
      duration: t.duration ?? 0,
    })
  }
}
const payload = {
  total: tests.length,
  passed: tests.filter((t) => t.status === 'passed').length,
  failed: tests.filter((t) => t.status !== 'passed').length,
  tests,
}
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`)
console.log(
  JSON.stringify(
    { total: payload.total, passed: payload.passed, failed: payload.failed, out },
    null,
    2,
  ),
)
process.exit(result.status === 0 && payload.failed === 0 ? 0 : 1)
