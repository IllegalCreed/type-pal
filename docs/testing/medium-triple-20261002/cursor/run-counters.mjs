#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const dir = resolve(root, 'docs/testing/medium-triple-20261002/cursor')
const manifest = JSON.parse(readFileSync(join(dir, 'counter-manifest.json'), 'utf8'))
const ok = []
const blocked = []

for (const spec of manifest) {
  const outDir = resolve(dir, 'counters', spec.id)
  if (existsSync(join(outDir, 'receipt.json'))) {
    ok.push({ ...spec, skipped: 'receipt-exists' })
    continue
  }
  mkdirSync(outDir, { recursive: true })
  const args = [
    join(dir, 'counter.mjs'),
    '--id',
    spec.id,
    '--file',
    spec.file,
    '--find',
    spec.find,
    '--replace',
    spec.replace,
    '--test',
    spec.test,
    '--expect-fullname',
    spec.expectFullname,
    '--out',
    outDir,
  ]
  if (spec.grep) args.push('--grep', spec.grep)
  if (spec.old) args.push('--old', spec.old)
  const run = spawnSync('node', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const line = (run.stdout || run.stderr || '').trim().split('\n').filter(Boolean).pop() ?? ''
  let parsed = null
  try {
    parsed = JSON.parse(line)
  } catch {
    /* ignore */
  }
  if (run.status === 0 && parsed?.ok) {
    ok.push({
      id: spec.id,
      productFile: spec.file,
      expectFullname: spec.expectFullname,
      oldGreenNewRed: Boolean(spec.oldGreenNewRed && parsed.oldOnMutated?.oldGreenNewRed),
      outDir: outDir.replace(`${root}/`, ''),
    })
    console.log(`OK ${spec.id}`)
  } else {
    blocked.push({
      id: spec.id,
      reason: parsed?.ok === false ? line : run.stderr?.slice(0, 800) || `exit-${run.status}`,
      spec,
    })
    console.error(`BLOCKED ${spec.id}: ${String(blocked.at(-1).reason).slice(0, 200)}`)
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  valid: ok.filter((entry) => !entry.skipped).length,
  skippedExisting: ok.filter((entry) => entry.skipped).length,
  blocked: blocked.length,
  oldGreenNewRed: ok.filter((entry) => entry.oldGreenNewRed).length,
  counters: ok.map((entry) => ({
    id: entry.id,
    productFile: entry.productFile,
    expectFullname: entry.expectFullname,
    dir: entry.outDir,
    ...(entry.oldGreenNewRed ? { oldGreenNewRed: true } : {}),
    ...(entry.skipped ? { skipped: entry.skipped } : {}),
  })),
  blockedEntries: blocked,
}

writeFileSync(join(dir, 'counters.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(
  JSON.stringify({
    valid: index.valid,
    blocked: index.blocked,
    oldGreenNewRed: index.oldGreenNewRed,
  }),
)
