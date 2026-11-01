// Closed input adapter. Writes a bounded plan and optional storage rehearsal only
// to a newly-created external directory, never registry/routing/current reviews.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectRollforwardSources } from './build-rollforward-document-candidates.mjs'
import { loadDocumentRegistry } from './document-registry.mjs'
import { rehearseRollforwardStorage } from './rehearse-rollforward-storage.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { fileState } from './review-record-storage-io.mjs'
import { biomeFormat, validateFormattedOutput } from './review-record-storage-packing.mjs'
import {
  prepareRollforwardReviewPlan,
  reviewPlanHash,
  rollforwardReviewContract,
} from './rollforward-review-plan.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
function external(path, existing) {
  assert(typeof path === 'string' && path.length > 0, 'external path required')
  const absolute = resolve(path)
  const full = existing
    ? realpathSync(absolute)
    : join(realpathSync(dirname(absolute)), absolute.split('/').at(-1))
  const rel = relative(realpathSync(root), full)
  assert(
    isAbsolute(rel) || rel === '..' || rel.startsWith('../'),
    'repository output/input path rejected',
  )
  if (existing)
    assert(
      lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(),
      'ordinary input file required',
    )
  return full
}

function readAcceptedRows(file) {
  const path = external(file, true),
    bytes = readFileSync(path)
  assert.equal(
    hash(bytes),
    '4e131182fe529615e204da14bd05d192a9a7570b85a22915bb753c92a628b2ae',
    'fixed Owner intake index differs',
  )
  const index = parseTerminalJson(bytes)
  return index.shards.flatMap((d) => {
    assert(/^review-input-\d\d\.json$/u.test(d.path), 'unsafe input shard leaf')
    const raw = readFileSync(external(join(dirname(path), d.path), true))
    assert(
      raw.length < 524288 && raw.length === d.bytes && hash(raw) === d.sha256,
      'input shard identity or capacity differs',
    )
    const shard = parseTerminalJson(raw)
    assert.equal(shard.rows.length, d.entries)
    return shard.rows
  })
}

export function runRollforwardReviewPlan(argv) {
  const values = new Map(),
    flags = new Set()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--rehearse') {
      assert(!flags.has(arg), 'duplicate flag')
      flags.add(arg)
    } else {
      assert(
        ['--input', '--out'].includes(arg) &&
          !values.has(arg) &&
          argv[i + 1] &&
          !argv[i + 1].startsWith('--'),
        'unknown, duplicate or incomplete option',
      )
      values.set(arg, argv[++i])
    }
  }
  assert.equal(values.size, 2, '--input and --out required')
  const out = external(values.get('--out'), false)
  const before = {
    head: git('rev-parse', 'HEAD').toString().trim(),
    status: git('status', '--porcelain', '--untracked-files=all').toString(),
    diff: hash(git('diff', '--binary', 'HEAD')),
  }
  git('merge-base', '--is-ancestor', rollforwardReviewContract.acceptedBase, before.head)
  const rows = readAcceptedRows(values.get('--input'))
  const group = loadReviewRecords({ root })
  const collected = collectRollforwardSources()
  // Compare all207 real fixed Git objects and the adopted tree, including a
  // full final-buffer equality, before creating any output directory.
  const tree = new Map(
    git('ls-tree', '-r', '-z', rollforwardReviewContract.authorCandidate, '--', 'docs')
      .toString()
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split('\t')
        return [path, meta.split(' ')]
      }),
  )
  const parents = new Map(),
    native = []
  const registry = loadDocumentRegistry({
    manifestPath: join(root, 'docs/phase-governance/document-registry.json'),
  })
  const controlPaths = [
    ...group.loadedSource.files.map((file) => file.path),
    ...registry.loadedSource.files.map(
      (file) => `docs/phase-governance/${file.path.split('/').at(-1)}`,
    ),
    'docs/phase-governance/routing.json',
    'docs/phase-governance/templates/registry.json',
  ]
  const frozenControls = new Map()
  const baseTree = new Map(
    git(
      'ls-tree',
      '-r',
      '-z',
      rollforwardReviewContract.acceptedBase,
      '--',
      'docs/phase-governance',
    )
      .toString()
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split('\t')
        return [path, meta.split(' ')]
      }),
  )
  for (const path of new Set(controlPaths)) {
    const object = baseTree.get(path)
    assert(
      object?.[0] === '100644' && object[1] === 'blob',
      `ordinary fixed control missing: ${path}`,
    )
    const current = fileState(root, path, parents, 'docs/').buffer
    assert(
      current?.equals(git('cat-file', 'blob', object[2])),
      `control differs from accepted base: ${path}`,
    )
    frozenControls.set(path, hash(current))
  }
  for (const [i, row] of rows.entries()) {
    const source = collected.rows[i],
      sourceBytes = collected.sources.get(row.path)
    assert(
      source?.path === row.path && hash(sourceBytes) === row.sourceSha256,
      'fixed source differs',
    )
    const object = tree.get(row.path)
    assert(object?.[0] === '100644' && object[1] === 'blob', 'ordinary adopted Git blob required')
    const adopted = git('cat-file', 'blob', object[2]),
      current = fileState(root, row.path, parents, 'docs/').buffer
    assert(
      current?.equals(adopted) && hash(adopted) === row.afterSha256,
      `adopted body drift: ${row.path}`,
    )
    if (row.path.endsWith('.json')) {
      assert(adopted.equals(sourceBytes), 'native carrier rewrite')
      native.push(row.path)
    }
  }
  assert.equal(native.length, 142)
  const plan = prepareRollforwardReviewPlan({
    rows,
    sources: collected.rows,
    records: group.records,
  })
  assertReviewRecordSourceUnchanged(group.loadedSource)
  // mkdir without recursive is an exclusive reservation: red runs cannot be
  // overwritten by the next green run, and an existing symlink is rejected.
  mkdirSync(out)
  const descriptors = [],
    pending = []
  let batch = []
  const flush = () => {
    const path = `review-plan-${String(descriptors.length + 1).padStart(2, '0')}.json`
    const value = { kind: plan.kind, changes: batch },
      bytes = biomeFormat(value, path, { repoRoot: root })
    validateFormattedOutput(bytes, value, 'review plan', path)
    writeFileSync(join(out, path), bytes, { flag: 'wx' })
    descriptors.push({ path, entries: batch.length, bytes: bytes.length, sha256: hash(bytes) })
    batch = []
  }
  for (const change of plan.changes) {
    if (batch.length && Buffer.byteLength(JSON.stringify([...batch, change], null, 2)) > 400000)
      flush()
    batch.push(change)
  }
  if (batch.length) flush()
  for (const [owner, record] of plan.records)
    for (const row of record.entries) {
      const body = fileState(root, row.path, parents, 'docs/').buffer
      if (body && row.afterSha256 !== hash(body))
        pending.push({
          path: row.path,
          owner,
          recordedAfter: row.afterSha256,
          observedAfter: hash(body),
        })
    }
  assert.deepEqual(
    pending.map((r) => r.path).sort(),
    [
      'docs/ops/board.md',
      'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
      'docs/ops/tasks/index.md',
      'docs/testing/catalog.json',
    ],
    'unexpected non-source drift after candidate normalization',
  )
  let rehearsal
  if (flags.has('--rehearse'))
    rehearsal = rehearseRollforwardStorage({
      root,
      directory: join(out, 'rehearsal'),
      baseRevision: before.head,
      group,
      plan,
    })
  assertReviewRecordSourceUnchanged(group.loadedSource)
  for (const [path, sha256] of frozenControls)
    assert.equal(
      hash(fileState(root, path, parents, 'docs/').buffer),
      sha256,
      `control changed during planning: ${path}`,
    )
  assert.deepEqual(
    {
      head: git('rev-parse', 'HEAD').toString().trim(),
      status: git('status', '--porcelain', '--untracked-files=all').toString(),
      diff: hash(git('diff', '--binary', 'HEAD')),
    },
    before,
    'repository changed during planning',
  )
  const result = {
    ...plan.summary,
    head: before.head,
    kind: plan.kind,
    acceptedRowsSha256: reviewPlanHash(rows),
    changesSha256: reviewPlanHash(plan.changes),
    shards: descriptors,
    reused: plan.reused,
    pendingAdministrativePins: pending,
    ...(rehearsal ? { rehearsal } : {}),
    repositoryUnchanged: true,
  }
  writeFileSync(join(out, 'index.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  console.log(
    JSON.stringify({
      ...result,
      shards: descriptors.length,
      pendingAdministrativePins: pending.length,
      rehearsal: rehearsal && { ...rehearsal, pinDeltas: rehearsal.pinDeltas.length },
    }),
  )
  return result
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runRollforwardReviewPlan(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
