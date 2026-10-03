#!/usr/bin/env node
/**
 * 串行跑 counter-manifest（MAX_CONCURRENCY=1）。
 * 每针由 counter.mjs finally 回收自己的精确临时树；本脚本不并行、不复制 node_modules。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { listPrefixTempsInTmpdir, MAX_CONCURRENCY, readLiveRegistry } from './counter-lifecycle.mjs'

const root = process.cwd()
const dir = resolve(root, 'docs/testing/medium-triple-20261002/cursor')
const evidenceDir = join(dir, 'cleanup-evidence')
mkdirSync(evidenceDir, { recursive: true })
const manifest = JSON.parse(readFileSync(join(dir, 'counter-manifest.json'), 'utf8'))

if (MAX_CONCURRENCY !== 1) {
  console.error('run-counters refuses MAX_CONCURRENCY !== 1')
  process.exitCode = 2
  process.exit(2)
}

const ok = []
const blocked = []
const cleanupSnapshots = []

for (const spec of manifest) {
  const outDir = resolve(dir, 'counters', spec.id)
  if (existsSync(join(outDir, 'receipt.json'))) {
    ok.push({ ...spec, skipped: 'receipt-exists' })
    continue
  }
  const beforeTemps = listPrefixTempsInTmpdir()
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
  const afterTemps = listPrefixTempsInTmpdir()
  const registry = readLiveRegistry(root)
  const line = (run.stdout || run.stderr || '').trim().split('\n').filter(Boolean).pop() ?? ''
  let parsed = null
  try {
    parsed = JSON.parse(line)
  } catch {
    /* ignore */
  }
  const residue = {
    id: spec.id,
    beforeTemps,
    afterTemps,
    registryOwned: registry?.ownedExactPaths ?? [],
    zeroResidue: afterTemps.length === 0 && (registry?.ownedExactPaths?.length ?? 0) === 0,
  }
  cleanupSnapshots.push(residue)
  if (run.status === 0 && parsed?.ok && residue.zeroResidue) {
    ok.push({
      id: spec.id,
      productFile: spec.file,
      expectFullname: spec.expectFullname,
      oldGreenNewRed: Boolean(spec.oldGreenNewRed && parsed.oldOnMutated?.oldGreenNewRed),
      outDir: outDir.replace(`${root}/`, ''),
      cleanup: residue,
    })
    console.log(`OK ${spec.id}`)
  } else {
    blocked.push({
      id: spec.id,
      reason: !residue.zeroResidue
        ? `cleanup-residue:${JSON.stringify(residue.afterTemps)}`
        : parsed?.ok === false
          ? line
          : run.stderr?.slice(0, 800) || `exit-${run.status}`,
      spec,
      cleanup: residue,
    })
    console.error(`BLOCKED ${spec.id}: ${String(blocked.at(-1).reason).slice(0, 200)}`)
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  maxConcurrency: MAX_CONCURRENCY,
  valid: ok.filter((entry) => !entry.skipped).length,
  skippedExisting: ok.filter((entry) => entry.skipped).length,
  blocked: blocked.length,
  oldGreenNewRed: ok.filter((entry) => entry.oldGreenNewRed).length,
  cleanupSnapshots,
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
writeFileSync(join(evidenceDir, 'run-counters-cleanup.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(
  JSON.stringify({
    valid: index.valid,
    blocked: index.blocked,
    oldGreenNewRed: index.oldGreenNewRed,
    cleanupOk: cleanupSnapshots.every((s) => s.zeroResidue),
  }),
)
process.exitCode = blocked.length ? 1 : 0
