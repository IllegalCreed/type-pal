#!/usr/bin/env node
/**
 * Run counter pins from counter-manifest.json; write counters.json index + blocked log.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const dir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const manifestPaths = [
  join(dir, 'counter-manifest.json'),
  join(dir, 'counter-manifest-supplement.json'),
  join(dir, 'counter-manifest-extra.json'),
  join(dir, 'counter-manifest-final10.json'),
]
const manifest = manifestPaths.flatMap((p) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [],
)

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
  const run = spawnSync('node', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
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
      outDir: outDir.replace(`${root}/`, ''),
    })
    console.log(`OK ${spec.id}`)
  } else {
    blocked.push({
      id: spec.id,
      reason: parsed?.ok === false ? line : run.stderr?.slice(0, 400) || `exit-${run.status}`,
      spec,
    })
    console.error(`BLOCKED ${spec.id}: ${blocked.at(-1).reason.slice(0, 120)}`)
    if (existsSync(outDir)) {
      try {
        for (const f of readdirSync(outDir)) {
          if (f !== 'positive.json' && f !== 'positive.raw.txt') continue
        }
      } catch {
        /* */
      }
    }
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  valid: ok.filter((e) => !e.skipped).length,
  skippedExisting: ok.filter((e) => e.skipped).length,
  blocked: blocked.length,
  counters: ok.map((entry) => ({
    id: entry.id,
    productFile: entry.productFile,
    expectFullname: entry.expectFullname,
    dir: entry.outDir,
    ...(entry.skipped ? { skipped: entry.skipped } : {}),
  })),
  blockedEntries: blocked,
}

writeFileSync(join(dir, 'counters.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(JSON.stringify({ valid: index.valid, blocked: index.blocked }))
