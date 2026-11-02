import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertRollforwardManifest,
  deriveRollforwardScope,
  prepareRollforwardCandidate,
  rollforwardContract,
  rollforwardOwnerPilotPaths,
  rollforwardSeedMatches,
  rollforwardSourceRows,
} from './document-rollforward-candidates.mjs'
import {
  assertIncrementalPreservation,
  assertPreservedMarkdownSpans,
  incrementalDigest,
} from './incremental-document-candidates.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const git = (args, options = {}) =>
  execFileSync('git', args, {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  })
const digest = (value) => incrementalDigest(Buffer.from(JSON.stringify(value)))
function tree(revision) {
  assert.equal(git(['cat-file', '-t', revision]).toString().trim(), 'commit')
  return new Map(
    git(['ls-tree', '-r', '-z', revision, '--', 'docs'])
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split('\t'),
          [mode, type, oid] = meta.split(' ')
        return [path, { mode, type, oid }]
      }),
  )
}

/** Fixed real Git trees, including unchanged accepted predecessors of amended documents. */
export function collectRollforwardSources() {
  const previous = tree(rollforwardContract.previousMain),
    incoming = tree(rollforwardContract.main),
    accepted = tree(rollforwardContract.accepted),
    integrated = tree(rollforwardContract.integration)
  const scope = deriveRollforwardScope({ previous, incoming, accepted })
  const trees = new Map([
    [rollforwardContract.main, incoming],
    [rollforwardContract.accepted, accepted],
    [rollforwardContract.integration, integrated],
  ])
  const objects = new Map(),
    sources = new Map()
  const readSource = (revision, path) => {
    const entry = trees.get(revision)?.get(path)
    assert(
      entry?.mode === '100644' && entry.type === 'blob',
      `ordinary fixed source required: ${revision}:${path}`,
    )
    if (!objects.has(entry.oid)) objects.set(entry.oid, git(['cat-file', 'blob', entry.oid]))
    return { ...entry, buffer: objects.get(entry.oid) }
  }
  const rows = rollforwardSourceRows(scope, rollforwardContract.integration, readSource)
  for (const row of rows) sources.set(row.path, readSource(row.sourceRevision, row.path).buffer)
  return { scope, rows, sources }
}

function outside(path, exists = true) {
  assert(typeof path === 'string' && path.length > 0, 'external path required')
  const absolute = resolve(path)
  const full = exists
    ? realpathSync(absolute)
    : resolve(realpathSync(dirname(absolute)), absolute.split('/').at(-1))
  const rel = relative(realpathSync(root), full)
  assert(
    isAbsolute(rel) || rel === '..' || rel.startsWith('../'),
    'evidence must be outside the repository',
  )
  if (exists)
    assert(
      lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(),
      'ordinary packet file required',
    )
  return full
}
function externalRows(file) {
  const path = outside(file),
    parsed = parseTerminalJson(readFileSync(path))
  if (Array.isArray(parsed.rows)) return parsed.rows
  assert(Array.isArray(parsed.shards), 'bounded rows or shard index required')
  return parsed.shards.flatMap((s) => {
    assert(/^[a-zA-Z0-9_.-]+\.json$/u.test(s.path), 'ordinary shard leaf required')
    const bytes = readFileSync(outside(resolve(dirname(path), s.path)))
    assert(bytes.length < 524_288, 'shard exceeds512KiB')
    assert.equal(incrementalDigest(bytes), s.sha256, 'draft shard SHA mismatch')
    const value = parseTerminalJson(bytes)
    assert.equal(value.rows.length, s.entries, 'draft shard count mismatch')
    return value.rows
  })
}
function ordinaryTarget(path) {
  assert(/^docs\/.+\.(md|json)$/u.test(path), 'document target required')
  let target = root
  const parts = path.split('/')
  for (const [i, part] of parts.entries()) {
    assert(part && part !== '.' && part !== '..' && !part.includes('\\'), 'unsafe target path')
    target = resolve(target, part)
    const stat = lstatSync(target)
    assert(
      !stat.isSymbolicLink() && (i === parts.length - 1 ? stat.isFile() : stat.isDirectory()),
      'ordinary target and parents required',
    )
  }
  return target
}
function status() {
  return git(['status', '--porcelain', '--untracked-files=all']).toString('utf8')
}

/** Whole-package validation is read-only; write batches can change only admitted prose. */
export function runRollforwardCandidates(argv) {
  const args = new Map(),
    flags = new Set()
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (['--write', '--complete'].includes(key)) {
      assert(!flags.has(key), 'duplicate flag')
      flags.add(key)
    } else {
      assert(
        ['--manifest', '--drafts', '--out'].includes(key) && !args.has(key),
        'unknown or duplicate option',
      )
      assert(argv[i + 1] && !argv[i + 1].startsWith('--'), 'missing option value')
      args.set(key, argv[++i])
    }
  }
  assert(!(flags.has('--write') && flags.has('--complete')), '--complete cannot write')
  const manifestBytes = readFileSync(outside(args.get('--manifest'))),
    manifest = parseTerminalJson(manifestBytes)
  const snapshot = collectRollforwardSources()
  assertRollforwardManifest(manifest, snapshot.scope, snapshot.rows)
  assert(/^[a-f\d]{40}$/u.test(manifest.candidateBase), 'full candidate base required')
  git(['merge-base', '--is-ancestor', rollforwardContract.integration, manifest.candidateBase])
  git(['merge-base', '--is-ancestor', manifest.candidateBase, 'HEAD'])
  const byPath = new Map(snapshot.rows.map((r) => [r.path, r]))
  const checkScope = () => {
    for (const path of git(['diff', '--name-only', manifest.candidateBase, '--'])
      .toString('utf8')
      .trim()
      .split('\n')
      .filter(Boolean))
      assert.equal(byPath.get(path)?.format, 'markdown', `out-of-scope tracked change: ${path}`)
    for (const line of status().split('\n').filter(Boolean)) {
      const path = line.slice(3)
      if (line.startsWith('?? ') && /(^|\/)node_modules\/?$/u.test(path)) continue
      assert.equal(byPath.get(path)?.format, 'markdown', `out-of-scope worktree item: ${path}`)
    }
  }
  checkScope()
  const templatePath = 'docs/phase-governance/templates/registry.json',
    templateBytes = readFileSync(resolve(root, templatePath))
  assert.equal(
    incrementalDigest(templateBytes),
    manifest.templateRegistrySha256,
    'template registry changed',
  )
  const registry = parseTerminalJson(templateBytes),
    drafts = externalRows(args.get('--drafts')),
    seen = new Set(),
    prepared = [],
    outputs = []
  const before = {
    head: git(['rev-parse', 'HEAD']).toString().trim(),
    status: status(),
    diff: incrementalDigest(git(['diff', manifest.candidateBase, '--'])),
  }
  for (const draft of drafts) {
    assert(!seen.has(draft.path), 'duplicate authored path')
    seen.add(draft.path)
    const admission = byPath.get(draft.path)
    assert(admission, `path outside frozen author scope: ${draft.path}`)
    const target = ordinaryTarget(draft.path),
      source = snapshot.sources.get(draft.path),
      current = readFileSync(target)
    const result = prepareRollforwardCandidate({
      draft,
      admission,
      source,
      registry,
      read: (p) => readFileSync(resolve(root, p), 'utf8'),
    })
    if (admission.format === 'json')
      assert(current.equals(source), `native carrier changed: ${draft.path}`)
    if (rollforwardOwnerPilotPaths.includes(draft.path) && manifest.ownerPilotRows) {
      const seed = manifest.ownerPilotRows.find((r) => r.path === draft.path)
      assert(
        seed && rollforwardSeedMatches(seed.row, result.row),
        `Owner pilot semantic row changed: ${draft.path}`,
      )
      assert.equal(incrementalDigest(current), seed.afterSha256, 'Owner pilot body changed')
      assert(current.equals(result.body), 'Owner pilot rendering changed')
    }
    if (!current.equals(result.body)) {
      if (!current.equals(source)) {
        if (admission.kind === 'amendment') assertPreservedMarkdownSpans(current, source)
        else assertIncrementalPreservation(current, source)
      }
      outputs.push({ target, before: current, after: result.body, path: draft.path })
    }
    prepared.push(result.row)
  }
  if (flags.has('--complete')) {
    assert.deepEqual(
      [...seen].sort(),
      snapshot.scope.author,
      'complete207-file authored set required',
    )
    assert.equal(outputs.length, 0, 'complete delivery prose not yet written')
  }
  const out = outside(args.get('--out'), false)
  if (flags.has('--write'))
    assert(
      /^codex\//u.test(git(['branch', '--show-current']).toString().trim()),
      'author writes require an isolated codex branch',
    )
  // Preflight every temporary path and input before the first write. A failed write
  // is not acceptance; sources are immutable Git blobs and the surviving staging
  // file is retained for diagnosis rather than silently erased.
  // Reserve the receipt before mutating prose: an existing receipt cannot cause a
  // late failure after successful writes. On failure the reserved file/raw stderr
  // and any remaining per-file staging survive, and no acceptance is produced.
  const fd = openSync(out, 'wx')
  try {
    if (flags.has('--write')) {
      for (const item of outputs) {
        assert(
          readFileSync(ordinaryTarget(item.path)).equals(item.before),
          'concurrent prose change',
        )
        try {
          lstatSync(`${item.target}.rollforward-writing`)
          assert.fail('stale prose staging file')
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      checkScope()
      for (const item of outputs) {
        assert(readFileSync(item.target).equals(item.before), 'concurrent prose change')
        const temporary = `${item.target}.rollforward-writing`
        writeFileSync(temporary, item.after, { flag: 'wx' })
        renameSync(temporary, item.target)
      }
    } else {
      assert.equal(status(), before.status, 'read-only status changed')
      assert.equal(
        incrementalDigest(git(['diff', manifest.candidateBase, '--'])),
        before.diff,
        'read-only diff changed',
      )
    }
    assert.equal(
      git(['rev-parse', 'HEAD']).toString().trim(),
      before.head,
      'HEAD changed during execution',
    )
    assert(
      readFileSync(outside(args.get('--manifest'))).equals(manifestBytes),
      'admission changed during execution',
    )
    assert(
      readFileSync(resolve(root, templatePath)).equals(templateBytes),
      'template contract changed during execution',
    )
    checkScope()
    const result = {
      protocol: rollforwardContract.protocol,
      head: before.head,
      manifestSha256: incrementalDigest(manifestBytes),
      sourceRowsSha256: digest(snapshot.rows),
      targets: prepared.length,
      mode: flags.has('--write') ? 'author-write' : 'read-only',
      proseWritten: flags.has('--write') ? outputs.length : 0,
      prosePendingWrite: flags.has('--write') ? 0 : outputs.length,
      nativeCarriersProtected: snapshot.rows.filter((r) => r.format === 'json').length,
      productionAdmission: false,
      semanticAcceptanceGranted: false,
      creditGranted: 0,
      entries: prepared,
    }
    writeFileSync(fd, `${JSON.stringify(result, null, 2)}\n`)
    console.log(JSON.stringify({ ...result, entries: result.entries.length }))
    return result
  } finally {
    closeSync(fd)
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runRollforwardCandidates(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
