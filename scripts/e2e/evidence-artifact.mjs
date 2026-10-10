import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const EVIDENCE_MAX_BYTES = 256 * 1024 * 1024

/** The returned binding describes exactly one immutable serialization, never a re-encoding. */
export function encodeEvidenceArtifact(value, maxBytes = EVIDENCE_MAX_BYTES) {
  assert(Number.isSafeInteger(maxBytes) && maxBytes > 0, 'invalid evidence byte budget')
  const bytes = `${JSON.stringify(value)}\n`,
    byteLength = Buffer.byteLength(bytes)
  assert(byteLength <= maxBytes, 'trace exceeds bounded evidence byte budget')
  return { bytes, byteLength, sha256: digest(bytes) }
}

export async function writeEvidenceArtifact(directory, name, value, maxBytes) {
  const artifact = encodeEvidenceArtifact(value, maxBytes)
  await writeFile(await evidencePath(directory, name), artifact.bytes, { flag: 'wx' })
  return { path: name, sha256: artifact.sha256, byteLength: artifact.byteLength }
}

async function evidencePath(directory, name, reading = false) {
  assert(typeof name === 'string' && name && !isAbsolute(name), 'invalid evidence relative path')
  const path = resolve(directory, name),
    local = relative(resolve(directory), path)
  assert(
    local && local !== '..' && !local.startsWith('../'),
    'evidence path escapes report directory',
  )
  const physicalRoot = await realpath(directory),
    physicalPath = await realpath(reading ? path : dirname(path)),
    physicalRelative = relative(physicalRoot, physicalPath)
  assert(
    physicalRelative !== '..' &&
      !physicalRelative.startsWith('../') &&
      !isAbsolute(physicalRelative),
    'evidence symlink escapes report directory',
  )
  return path
}

/** Missing historical bindings remain unknown; any supplied but false binding is rejected. */
export async function readEvidenceArtifact(directory, reference) {
  const path = await evidencePath(directory, reference.path, true),
    bytes = await readFile(path),
    sha256 = digest(bytes),
    missing = []
  if (reference.sha256 === undefined) missing.push('sha256')
  else {
    assert.match(reference.sha256, /^[a-f0-9]{64}$/, 'invalid evidence hash')
    assert.equal(sha256, reference.sha256, 'evidence bytes differ from recorded hash')
  }
  if (reference.byteLength === undefined) missing.push('byteLength')
  else {
    assert(
      Number.isSafeInteger(reference.byteLength) && reference.byteLength > 0,
      'invalid evidence size',
    )
    assert.equal(bytes.byteLength, reference.byteLength, 'evidence byte count differs')
  }
  return {
    path,
    sha256,
    byteLength: bytes.byteLength,
    value: JSON.parse(bytes),
    binding: { status: missing.length ? 'unknown' : 'verified', missing },
  }
}

/** Resolve actual predecessor bytes; the caller separately validates their story semantics. */
export async function readCheckpointInput(predecessor, engine, fragment) {
  assert(predecessor?.report, 'actual predecessor report required')
  const directory = dirname(resolve(predecessor.report))
  const report = await readEvidenceArtifact(directory, { path: basename(predecessor.report) })
  assert.equal(report.value.status, 'passed')
  assert.equal(report.value.engine, engine)
  assert.equal(report.value.fragment, fragment)
  assert.equal(
    report.value.checkpoint?.sha256,
    predecessor.sha256,
    'predecessor checkpoint binding differs',
  )
  const checkpoint = await readEvidenceArtifact(directory, report.value.checkpoint)
  assert.equal(checkpoint.sha256, predecessor.sha256, 'predecessor checkpoint bytes differ')
  return { payload: checkpoint.value, artifacts: [report, checkpoint] }
}
