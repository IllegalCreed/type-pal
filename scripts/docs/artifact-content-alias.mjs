import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { posix } from 'node:path'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fields = ['bytes', 'path', 'pointer', 'receipt', 'retained', 'sha256', 'sourceBlob']
function atPointer(value, pointer) {
  assert(
    typeof pointer === 'string' &&
      pointer.endsWith('/identity/artifact') &&
      pointer.startsWith('/') &&
      !/~(?![01])/u.test(pointer),
    'artifact alias: invalid descriptor pointer',
  )
  let current = value
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    assert(
      current && typeof current === 'object' && Object.hasOwn(current, key),
      'artifact alias: descriptor pointer missing',
    )
    current = current[key]
  }
  return current
}

/** Finite content aliases preserve separate immutable execution descriptors.
 * Missing ordinary evidence never falls back to another file unless this exact
 * source/pointer/content relationship was separately admitted by the Owner. */
export function loadArtifactContentAliases({
  rows = [],
  source,
  physicalPath,
  readCurrent,
  safePath,
}) {
  assert(Array.isArray(rows), 'artifact alias: invalid list')
  const aliases = new Map()
  const byPhysical = new Map()
  const check = (row) => {
    assert.deepEqual(Object.keys(row).sort(), fields, 'artifact alias: unexpected fields')
    for (const path of [row.path, row.retained, row.receipt]) safePath(path)
    const directory = posix.dirname(row.path)
    assert(
      /^docs\/ops\/evidence\/[^/]+\/counterproof-raw\/(?:.+\.restored|final-replay)\.identity\.tsv$/u.test(
        row.path,
      ) &&
        row.retained === `${directory}/baseline.identity.tsv` &&
        row.receipt === `${posix.dirname(directory)}/counterproof.json`,
      'artifact alias: only same-task restored/final identity output may share its baseline',
    )
    const original = source.entries.get(row.path)
    const retained = source.entries.get(row.retained)
    assert(
      original?.mode === '100644' &&
        original.type === 'blob' &&
        retained?.mode === '100644' &&
        retained.type === 'blob' &&
        original.object === row.sourceBlob &&
        original.object === retained.object,
      'artifact alias: fixed sources differ or are not ordinary files',
    )
    const bytes = source.read(row.path)
    assert(
      Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        bytes.length === row.bytes &&
        /^[a-f\d]{64}$/u.test(row.sha256 ?? '') &&
        hash(bytes) === row.sha256,
      'artifact alias: fixed content identity differs',
    )
    const receipt = source.read(row.receipt)
    assert(
      receipt && readCurrent(physicalPath(row.receipt))?.equals(receipt),
      'artifact alias: immutable execution receipt changed or missing',
    )
    const descriptor = atPointer(JSON.parse(receipt.toString('utf8')), row.pointer)
    safePath(descriptor.path)
    assert(
      posix.join(posix.dirname(row.receipt), descriptor.path) === row.path &&
        descriptor.bytes === row.bytes &&
        descriptor.sha256 === row.sha256,
      'artifact alias: execution descriptor does not identify this original',
    )
    assert(
      readCurrent(physicalPath(row.path)) === undefined,
      'artifact alias: retired physical copy still exists',
    )
    assert(
      readCurrent(physicalPath(row.retained))?.equals(bytes),
      'artifact alias: retained content missing or changed',
    )
  }
  for (const input of rows) {
    const row = Object.freeze({ ...input })
    assert(!aliases.has(row.path), 'artifact alias: duplicate identity')
    check(row)
    aliases.set(row.path, row)
    byPhysical.set(physicalPath(row.path), row)
  }
  return {
    entries: Object.freeze([...aliases.values()]),
    get: (path) => aliases.get(path) ?? byPhysical.get(path),
    resolve: (path) => physicalPath((aliases.get(path) ?? byPhysical.get(path))?.retained ?? path),
    assertUnchanged: () => {
      for (const row of aliases.values()) check(row)
    },
  }
}
