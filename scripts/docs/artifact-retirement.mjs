import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { parseTerminalJson } from './terminal-json.mjs'

const fields = ['bytes', 'path', 'sha256', 'sourceBlob']
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const artifactRetirementReplayRoots = Object.freeze([
  ...['candidates', 'configs', 'diagnostics', 'fixtures', 'tools'].map(
    (name) => `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/${name}`,
  ),
  'docs/testing/archive/legacy/unresolved-tools',
])
const legacyTaskCaptures = new Set([
  'docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/fullsuite.raw',
  'docs/ops/tasks/evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1/directed-adjacent.raw',
])
const listPaths = new Set(
  ['', '-2', '-3', '-4'].map(
    (suffix) => `docs/tasks/evidence/REPO-SLIM-PLAN-1-retired-artifacts${suffix}.json.gz`,
  ),
)
const isListPath = (path) =>
  typeof path === 'string' &&
  /^docs\/tasks\/evidence\/REPO-SLIM-PLAN-1-retired-artifacts(?:-\d+)?\.json\.gz$/u.test(path)
const listFields = [
  'codec',
  'decodedBytes',
  'decodedSha256',
  'entries',
  'path',
  'storedBytes',
  'storedSha256',
]

/** One bounded administrative member set, registered as ordinary artifacts.
 * This only replaces inline storage; each member still needs the same fixed
 * source and absence checks below. The carrier never supplies semantic credit. */
export function readArtifactRetirementRows({ declaration, artifacts = [], readState, safePath }) {
  const isDescriptor = (row) => row && typeof row === 'object' && Object.hasOwn(row, 'codec')
  const descriptorArray = Array.isArray(declaration) && declaration.some(isDescriptor)
  if (declaration === undefined || (Array.isArray(declaration) && !descriptorArray)) {
    assert(
      !artifacts.some((row) => isListPath(row?.path)),
      'artifact retirement list: undeclared administrative shard',
    )
    return { rows: declaration ?? [], assertUnchanged: () => {} }
  }
  assert(
    declaration && typeof declaration === 'object',
    'artifact retirement list: descriptor required',
  )
  const inputs = descriptorArray ? declaration : [declaration]
  assert(
    inputs.length <= 4 && inputs.every(isDescriptor),
    'artifact retirement list: mixed members or shard count exceeds four',
  )
  const descriptors = inputs.map((input) => {
    const descriptor = Object.freeze({ ...input })
    assert.deepEqual(
      Object.keys(descriptor).sort(),
      listFields,
      'artifact retirement list: unexpected descriptor fields',
    )
    safePath(descriptor.path)
    assert(
      listPaths.has(descriptor.path) &&
        descriptor.codec === 'gzip' &&
        /^[a-f\d]{64}$/u.test(descriptor.storedSha256 ?? '') &&
        /^[a-f\d]{64}$/u.test(descriptor.decodedSha256 ?? '') &&
        Number.isSafeInteger(descriptor.storedBytes) &&
        descriptor.storedBytes > 0 &&
        descriptor.storedBytes <= 1_048_576 &&
        Number.isSafeInteger(descriptor.decodedBytes) &&
        descriptor.decodedBytes > 0 &&
        descriptor.decodedBytes <= 4_194_304 &&
        Number.isSafeInteger(descriptor.entries) &&
        descriptor.entries > 0 &&
        descriptor.entries <= 16_384,
      'artifact retirement list: fixed carrier, codec or budget differs',
    )
    return descriptor
  })
  const paths = new Set(descriptors.map((row) => row.path))
  assert(
    paths.size === descriptors.length &&
      descriptors.reduce((sum, row) => sum + row.entries, 0) <= 16_384 &&
      descriptors.reduce((sum, row) => sum + row.decodedBytes, 0) <= 16 * 1024 * 1024,
    'artifact retirement list: duplicate shard or aggregate budget differs',
  )
  assert(
    artifacts.every((row) => !isListPath(row?.path) || paths.has(row.path)),
    'artifact retirement list: undeclared administrative shard',
  )
  const lists = descriptors.map((descriptor) => {
    const registrations = artifacts.filter((row) => row?.path === descriptor.path)
    assert(
      registrations.length === 1 &&
        registrations[0].sha256 === descriptor.storedSha256 &&
        registrations[0].bytes === descriptor.storedBytes,
      'artifact retirement list: ordinary artifact registration differs',
    )
    const parents = new Map()
    const state = readState(descriptor.path, parents)
    assert(
      state.identity &&
        (state.identity.mode & 0o777) === 0o644 &&
        state.buffer?.length === descriptor.storedBytes &&
        hash(state.buffer) === descriptor.storedSha256,
      'artifact retirement list: stored carrier missing, changed or nonordinary',
    )
    const original = Buffer.from(state.buffer)
    const decoded = gunzipSync(original, { maxOutputLength: descriptor.decodedBytes })
    assert(
      decoded.length === descriptor.decodedBytes && hash(decoded) === descriptor.decodedSha256,
      'artifact retirement list: decoded identity differs',
    )
    const rows = parseTerminalJson(decoded)
    assert(
      Array.isArray(rows) && rows.length === descriptor.entries,
      'artifact retirement list: member array or count differs',
    )
    return {
      rows,
      assertUnchanged: () => {
        const after = readState(descriptor.path, parents)
        assert.deepEqual(
          after.identity,
          state.identity,
          'artifact retirement list: carrier identity changed',
        )
        assert(after.buffer?.equals(original), 'artifact retirement list: carrier bytes changed')
      },
    }
  })
  return {
    rows: lists.flatMap((list) => list.rows),
    assertUnchanged: () => {
      for (const list of lists) list.assertUnchanged()
    },
  }
}

/** Positive lifecycle decisions for fixed historical input carriers, not bodies.
 * Native execution metadata stays separate. The Owner admits each exact member;
 * a name, suffix or directory never decides whether an attachment is disposable.
 * Retired bytes are recoverable explicitly from Git, never a current-read fallback. */
export function loadArtifactRetirements({
  rows = [],
  source,
  physicalPath,
  readState,
  safePath,
  reservedPaths = new Set(),
}) {
  assert(Array.isArray(rows), 'artifact retirement: invalid list')
  const entries = []
  const paths = new Map()
  const check = (row) => {
    assert.deepEqual(Object.keys(row).sort(), fields, 'artifact retirement: unexpected fields')
    safePath(row.path)
    assert(
      /^(?:docs\/ops\/(?:evidence|tasks\/evidence|archive)\/|docs\/testing\/archive\/).+\.gz$/u.test(
        row.path,
      ) ||
        /^docs\/ops\/evidence\/.+\.(?:txt|log|tsv|raw)$/u.test(row.path) ||
        legacyTaskCaptures.has(row.path) ||
        (artifactRetirementReplayRoots.some((root) => row.path.startsWith(`${root}/`)) &&
          /\.(?:tsx?|m[jt]s)$/u.test(row.path)),
      'artifact retirement: only declared historical gzip attachments or archived replay sources or admitted text captures may retire',
    )
    const currentPath = physicalPath(row.path)
    safePath(currentPath)
    assert(
      !reservedPaths.has(row.path) && !reservedPaths.has(currentPath),
      'artifact retirement: overlaps another document or artifact disposition',
    )
    const original = source.entries.get(row.path)
    assert(
      original?.mode === '100644' &&
        original.type === 'blob' &&
        /^[a-f\d]{40}$/u.test(row.sourceBlob ?? '') &&
        original.object === row.sourceBlob &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        original.bytes === row.bytes &&
        /^[a-f\d]{64}$/u.test(row.sha256 ?? ''),
      'artifact retirement: fixed source identity, extent or ordinary mode differs',
    )
    const bytes = source.read(row.path)
    assert(
      Buffer.isBuffer(bytes) && bytes.length === row.bytes && hash(bytes) === row.sha256,
      'artifact retirement: fixed source bytes differ',
    )
    for (const path of new Set([row.path, currentPath])) {
      const state = readState(path)
      assert(
        state.identity === null && state.buffer === null,
        `artifact retirement: retired physical carrier reappeared: ${path}`,
      )
    }
  }
  const checkInWindows = (inputs, consume) => {
    let pending = [],
      bytes = 0
    const flush = () => {
      source.prefetch?.(pending.map((row) => row?.path))
      for (const row of pending) consume(row)
      pending = []
      bytes = 0
    }
    for (const row of inputs) {
      const length = source.entries.get(row?.path)?.bytes ?? 0
      if (pending.length && (pending.length === 512 || bytes + length > 32 * 1024 * 1024)) flush()
      pending.push(row)
      bytes += length
    }
    if (pending.length) flush()
  }
  checkInWindows(rows, (input) => {
    assert(
      input && typeof input === 'object' && !Array.isArray(input),
      'artifact retirement: member must be an object',
    )
    const row = Object.freeze({ ...input })
    check(row)
    for (const path of new Set([row.path, physicalPath(row.path)])) {
      assert(!paths.has(path), 'artifact retirement: duplicate or colliding identity')
      paths.set(path, row)
    }
    entries.push(row)
  })
  return {
    entries: Object.freeze(entries),
    get: (path) => paths.get(path),
    assertUnchanged: () => checkInWindows(entries, check),
  }
}
