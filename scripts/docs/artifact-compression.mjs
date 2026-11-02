import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fields = [
  'bytes',
  'codec',
  'path',
  'sha256',
  'sourceBlob',
  'stored',
  'storedBytes',
  'storedSha256',
]

/** A compressed carrier keeps the fixed source identity and exact decoded bytes.
 * It does not merge executions or turn a display copy into original run output.
 * Missing ordinary files never acquire an implicit archive/Git fallback. */
export function loadCompressedArtifacts({ rows = [], source, physicalPath, readState, safePath }) {
  assert(Array.isArray(rows), 'artifact compression: invalid list')
  const sourceTargets = new Set([...source.entries.keys()].map(physicalPath))
  const entries = []
  const paths = new Map()
  const check = (row) => {
    assert.deepEqual(Object.keys(row).sort(), fields, 'artifact compression: unexpected fields')
    safePath(row.path)
    safePath(row.stored)
    assert(
      /^(?:docs\/ops\/(?:evidence|tasks\/evidence|archive)\/|docs\/testing\/archive\/).+\.(?:tsv|raw|log|txt)$/u.test(
        row.path,
      ) &&
        row.codec === 'gzip' &&
        row.stored === `${physicalPath(row.path)}.gz`,
      'artifact compression: only declared historical text carriers may use adjacent gzip storage',
    )
    const original = source.entries.get(row.path)
    assert(
      original?.mode === '100644' &&
        original.type === 'blob' &&
        original.object === row.sourceBlob &&
        !sourceTargets.has(row.stored),
      'artifact compression: fixed source or storage identity differs',
    )
    const fixed = source.read(row.path)
    assert(
      Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        fixed.length === row.bytes &&
        /^[a-f\d]{64}$/u.test(row.sha256 ?? '') &&
        hash(fixed) === row.sha256,
      'artifact compression: fixed carrier content differs',
    )
    assert(
      Number.isSafeInteger(row.storedBytes) &&
        row.storedBytes > 0 &&
        row.storedBytes < row.bytes &&
        /^[a-f\d]{64}$/u.test(row.storedSha256 ?? ''),
      'artifact compression: invalid compressed extent or hash',
    )
    assert(
      !readState(physicalPath(row.path)).buffer,
      'artifact compression: uncompressed carrier still exists',
    )
    const state = readState(row.stored)
    assert(
      state.buffer &&
        (state.identity.mode & 0o777) === 0o644 &&
        state.buffer.length === row.storedBytes &&
        hash(state.buffer) === row.storedSha256,
      'artifact compression: stored carrier missing or changed',
    )
    // The fixed Git extent is the inflate bound, not a size supplied by the gzip
    // footer. CRC/ISIZE validation comes from zlib; exact fixed bytes are decisive.
    const decoded = gunzipSync(state.buffer, { maxOutputLength: row.bytes })
    assert(
      decoded.equals(fixed) && decoded.length === row.bytes && hash(decoded) === row.sha256,
      'artifact compression: decoded carrier differs',
    )
    return { ...state, buffer: decoded }
  }
  for (const input of rows) {
    const row = Object.freeze({ ...input })
    for (const path of new Set([row.path, physicalPath(row.path), row.stored])) {
      assert(!paths.has(path), 'artifact compression: duplicate or colliding identity')
      paths.set(path, row)
    }
    check(row)
    entries.push(row)
  }
  return {
    entries: Object.freeze(entries),
    get: (path) => paths.get(path),
    readState: (path) => {
      const row = paths.get(path)
      return row ? check(row) : undefined
    },
    assertUnchanged: () => {
      for (const row of entries) check(row)
    },
  }
}
