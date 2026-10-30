import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertIncrementalPreservation,
  incrementalCandidateProtocol,
  incrementalDigest,
  prepareIncrementalCandidate,
} from './incremental-document-candidates.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const frozen = Object.freeze({
  main: '72db417255d8ca4227522420e9185ef468462aa7',
  acceptedDocs: 'bd77f62da023f5e500d8b4db01863784fcc83e3d',
  commonBase: '28fd9013e09e8792decbff2fa117aae14c36b196',
  candidates: 1916,
})
const root = fileURLToPath(new URL('../..', import.meta.url))
const git = (args, options = {}) =>
  execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, ...options })
const external = (path) => {
  const full = realpathSync(resolve(path)),
    rel = relative(root, full)
  assert(
    isAbsolute(rel) || rel === '..' || rel.startsWith('../'),
    'packet must be outside repository',
  )
  assert(lstatSync(full).isFile(), 'ordinary packet file required')
  return full
}
function tree(revision) {
  const map = new Map()
  for (const line of git(['ls-tree', '-r', '-z', revision, 'docs']).toString('utf8').split('\0')) {
    if (!line) continue
    const [meta, path] = line.split('\t'),
      [mode, type, oid] = meta.split(' ')
    map.set(path, { mode, type, oid })
  }
  return map
}
function sourceMap(rows) {
  const main = tree(frozen.main),
    old = tree(frozen.acceptedDocs),
    base = tree(frozen.commonBase)
  const actual = [...main.keys()]
    .filter((p) => /\.(md|json|html)$/u.test(p) && !old.has(p) && !base.has(p))
    .sort()
  assert.deepEqual(
    rows.map((r) => r.path),
    actual,
    'exact newly added source cohort required',
  )
  assert.equal(rows.length, frozen.candidates)
  for (const [index, row] of rows.entries()) {
    const entry = main.get(row.path)
    assert(entry.mode === '100644' && entry.type === 'blob', 'ordinary fixed Git source required')
    assert.equal(row.sourceRevision, frozen.main)
    assert.equal(row.sourceGitObject, entry.oid)
    assert.equal(row.index, index)
    assert.equal(row.format, row.path.endsWith('.json') ? 'json' : 'markdown')
  }
  const raw = git(['cat-file', '--batch'], {
    input: rows.map((r) => `${r.sourceGitObject}\n`).join(''),
  })
  const result = new Map()
  let offset = 0
  for (const row of rows) {
    const end = raw.indexOf(10, offset),
      [oid, type, length] = raw.subarray(offset, end).toString('ascii').split(' ')
    assert.equal(oid, row.sourceGitObject)
    assert.equal(type, 'blob')
    const size = Number(length),
      bytes = raw.subarray(end + 1, end + 1 + size)
    assert.equal(bytes.length, row.bytes)
    assert.equal(incrementalDigest(bytes), row.sourceSha256)
    assert.equal(raw[end + 1 + size], 10)
    result.set(row.path, bytes)
    offset = end + 2 + size
  }
  assert.equal(offset, raw.length, 'unexpected source batch suffix')
  return result
}
function draftsFrom(path) {
  const file = external(path),
    value = parseTerminalJson(readFileSync(file))
  if (Array.isArray(value.rows)) return value.rows
  assert(Array.isArray(value.shards), 'draft rows or bounded shard index required')
  return value.shards.flatMap((shard) => {
    assert(/^[a-zA-Z0-9_.-]+\.json$/u.test(shard.path), 'leaf shard path required')
    const bytes = readFileSync(external(resolve(dirname(file), shard.path)))
    assert(bytes.length < 524_288, 'draft shard must be below512KiB')
    assert.equal(incrementalDigest(bytes), shard.sha256)
    const value = parseTerminalJson(bytes)
    assert.equal(value.rows.length, shard.entries)
    return value.rows
  })
}
function ordinaryTarget(path) {
  const parts = path.split('/')
  let current = root
  for (const [i, part] of parts.entries()) {
    assert(part && part !== '.' && part !== '..' && !part.includes('\\'), 'unsafe target')
    current = resolve(current, part)
    const stat = lstatSync(current)
    assert(!stat.isSymbolicLink(), 'target path cannot traverse a symlink')
    assert(
      i === parts.length - 1 ? stat.isFile() : stat.isDirectory(),
      'ordinary target/parents required',
    )
  }
  return current
}

/** Only author-candidate prose writes. Central files, JSON carriers and acceptance are never written. */
export function runIncrementalCandidates(argv) {
  const args = new Map(),
    flags = new Set()
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (['--write', '--complete'].includes(key)) {
      assert(!flags.has(key))
      flags.add(key)
    } else {
      assert(
        ['--manifest', '--drafts', '--out'].includes(key) && !args.has(key),
        'unknown/duplicate option',
      )
      args.set(key, argv[++i])
    }
  }
  const manifestPath = external(args.get('--manifest')),
    manifest = parseTerminalJson(readFileSync(manifestPath))
  assert.equal(manifest.protocol, incrementalCandidateProtocol)
  assert.deepEqual(manifest.sources, frozen)
  assert.equal(manifest.semanticAcceptanceGranted, false)
  const admissions = manifest.rows,
    sources = sourceMap(admissions),
    byPath = new Map(admissions.map((r) => [r.path, r]))
  const beforeStatus = git(['status', '--porcelain', '--untracked-files=all']).toString('utf8')
  const manifestBase = manifest.candidateBase
  assert(/^[a-f\d]{40}$/u.test(manifestBase), 'real full candidate base required')
  git(['merge-base', '--is-ancestor', manifestBase, 'HEAD'])
  const changed = git(['diff', '--name-only', manifestBase, '--'])
    .toString('utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
  for (const path of changed)
    assert(byPath.get(path)?.format === 'markdown', `out-of-scope change: ${path}`)
  for (const line of beforeStatus.split('\n').filter(Boolean)) {
    const path = line.slice(3)
    if (line.startsWith('?? ') && /(^|\/)node_modules\/?$/u.test(path)) continue
    assert(byPath.get(path)?.format === 'markdown', `unapproved worktree item: ${path}`)
  }
  const registry = parseTerminalJson(
    readFileSync(resolve(root, 'docs/phase-governance/templates/registry.json')),
  )
  const registryBytes = readFileSync(resolve(root, 'docs/phase-governance/templates/registry.json'))
  assert.equal(incrementalDigest(registryBytes), manifest.templateRegistrySha256)
  const rows = draftsFrom(args.get('--drafts')),
    seen = new Set(),
    outputs = [],
    reviews = []
  for (const draft of rows) {
    assert(!seen.has(draft.path), 'duplicate draft path')
    seen.add(draft.path)
    const admission = byPath.get(draft.path)
    assert(admission, 'draft outside whitelist')
    const source = sources.get(draft.path),
      target = ordinaryTarget(draft.path)
    const prepared = prepareIncrementalCandidate({
      draft,
      admission,
      source,
      registry,
      read: (p) => readFileSync(resolve(root, p), 'utf8'),
    })
    const current = readFileSync(target)
    if (admission.format === 'json') assert(current.equals(source), 'native carrier changed')
    else if (!current.equals(prepared.body)) {
      if (!current.equals(source)) assertIncrementalPreservation(current, source)
      outputs.push({ path: draft.path, target, before: current, after: prepared.body })
    }
    reviews.push(prepared.row)
  }
  if (flags.has('--complete'))
    assert.deepEqual(
      [...seen].sort(),
      admissions.map((r) => r.path),
      'complete delivery must contain1916 final authored entries',
    )
  assert(
    !flags.has('--write') || !flags.has('--complete'),
    'write batches first; final complete verification is read-only',
  )
  if (flags.has('--complete'))
    assert.equal(outputs.length, 0, 'complete delivery prose must already be written')
  const out = resolve(args.get('--out')),
    rel = relative(root, out)
  assert(
    isAbsolute(rel) || rel === '..' || rel.startsWith('../'),
    'output must be outside repository',
  )
  // Exclusive creation leaves previous evidence intact; caller uses a new run path.
  const fd = { flag: 'wx' }
  for (const output of outputs)
    if (flags.has('--write')) {
      assert(readFileSync(output.target).equals(output.before), 'concurrent prose edit')
      const temp = `${output.target}.incremental-writing`
      writeFileSync(temp, output.after, fd)
      renameSync(temp, output.target)
    }
  const result = {
    protocol: incrementalCandidateProtocol,
    head: git(['rev-parse', 'HEAD']).toString('utf8').trim(),
    mode: flags.has('--write') ? 'author-write' : 'read-only',
    targets: rows.length,
    proseWritten: flags.has('--write') ? outputs.length : 0,
    prosePendingWrite: flags.has('--write') ? 0 : outputs.length,
    nativeCarriersUnchanged: rows.filter((r) => byPath.get(r.path).format === 'json').length,
    productionAdmission: false,
    semanticAcceptanceGranted: false,
    creditGranted: 0,
    entries: reviews,
  }
  if (!flags.has('--write'))
    assert.equal(
      git(['status', '--porcelain', '--untracked-files=all']).toString('utf8'),
      beforeStatus,
      'read-only run changed status',
    )
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, fd)
  console.log(JSON.stringify({ ...result, entries: result.entries.length }))
  return result
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runIncrementalCandidates(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
