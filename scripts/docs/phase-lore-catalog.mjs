import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_MANIFEST = fileURLToPath(
  new URL('../../docs/phase-governance/catalog.json', import.meta.url),
)
const REQUIRED_ENTRY_FIELDS = [
  'id',
  'path',
  'phase',
  'module',
  'capability',
  'status',
  'reviewStatus',
  'owner',
  'sourceSha256',
  'afterSha256',
  'sourceRefs',
  'publicCallers',
  'legalInputs',
  'businessOracle',
  'dedupe',
  'revision',
  'evidence',
  'history',
  'supersedes',
  'stopLine',
  'lastReviewed',
]
const PHASES = ['lore', 'phase1', 'phase2', 'phase3']

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const readJson = (path, label) => {
  if (!existsSync(path)) throw new Error(`${label} missing: ${path}`)
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${label} invalid JSON: ${path}: ${error.message}`)
  }
}
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const relativeShardPath = (manifestPath, declaredPath) => {
  assert(typeof declaredPath === 'string' && declaredPath.length > 0, 'manifest shard path missing')
  assert(!isAbsolute(declaredPath), `manifest shard path must be relative: ${declaredPath}`)
  const manifestDir = resolve(manifestPath, '..')
  const shardPath = resolve(manifestDir, declaredPath)
  const rel = relative(manifestDir, shardPath)
  assert(
    rel && rel !== '..' && !rel.startsWith(`..${sep}`),
    `manifest shard path escapes catalog directory: ${declaredPath}`,
  )
  return shardPath
}

export function loadPhaseLoreCatalog({ manifestPath = DEFAULT_MANIFEST } = {}) {
  const manifest = readJson(manifestPath, 'phase/lore catalog manifest')
  assert(
    manifest.schemaVersion === 2,
    `unsupported phase/lore catalog manifest schema: ${manifest.schemaVersion}`,
  )
  assert(
    Array.isArray(manifest.shards) && manifest.shards.length === PHASES.length,
    'manifest must declare four phase/lore shards',
  )
  const phaseSet = new Set()
  const pathSet = new Set()
  const idSet = new Set()
  const entries = []

  for (const descriptor of manifest.shards) {
    assert(
      descriptor && typeof descriptor === 'object',
      'manifest shard descriptor must be an object',
    )
    assert(PHASES.includes(descriptor.phase), `unsupported shard phase: ${descriptor.phase}`)
    assert(!phaseSet.has(descriptor.phase), `duplicate shard phase: ${descriptor.phase}`)
    phaseSet.add(descriptor.phase)
    const shardPath = relativeShardPath(manifestPath, descriptor.path)
    assert(
      typeof descriptor.sha256 === 'string' && /^[a-f\d]{64}$/.test(descriptor.sha256),
      `invalid shard SHA: ${descriptor.path}`,
    )
    assert(digest(shardPath) === descriptor.sha256, `shard SHA drift: ${descriptor.path}`)
    const shard = readJson(shardPath, 'phase/lore catalog shard')
    assert(shard.schemaVersion === 1, `unsupported shard schema: ${descriptor.path}`)
    assert(shard.phase === descriptor.phase, `shard phase mismatch: ${descriptor.path}`)
    assert(Array.isArray(shard.entries), `shard entries missing: ${descriptor.path}`)
    assert(
      shard.summary?.total === shard.entries.length,
      `shard summary total mismatch: ${descriptor.path}`,
    )
    assert(
      descriptor.total === shard.entries.length,
      `manifest shard total mismatch: ${descriptor.path}`,
    )
    for (const entry of shard.entries) {
      assert(entry && typeof entry === 'object', `invalid catalog entry in ${descriptor.path}`)
      for (const field of REQUIRED_ENTRY_FIELDS)
        assert(
          entry[field] !== undefined && entry[field] !== null && entry[field] !== '',
          `${descriptor.path}: missing ${field}`,
        )
      assert(
        entry.phase === descriptor.phase,
        `${entry.path}: entry phase does not match shard ${descriptor.phase}`,
      )
      assert(!pathSet.has(entry.path), `duplicate catalog path: ${entry.path}`)
      assert(!idSet.has(entry.id), `duplicate catalog id: ${entry.id}`)
      pathSet.add(entry.path)
      idSet.add(entry.id)
      entries.push(entry)
    }
  }
  assert(
    phaseSet.size === PHASES.length && PHASES.every((phase) => phaseSet.has(phase)),
    'manifest shard phase set incomplete',
  )
  entries.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const byPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, entries.filter((entry) => entry.phase === phase).length]),
  )
  const byStatus = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.status))]
      .sort()
      .map((status) => [status, entries.filter((entry) => entry.status === status).length]),
  )
  assert(
    manifest.summary?.total === entries.length,
    `manifest summary total ${manifest.summary?.total} != ${entries.length}`,
  )
  const sameCounts = (left, right) => {
    const keys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort()
    return keys.every((key) => left?.[key] === right?.[key])
  }
  assert(sameCounts(manifest.summary.byPhase, byPhase), 'manifest summary byPhase mismatch')
  assert(sameCounts(manifest.summary.byStatus, byStatus), 'manifest summary byStatus mismatch')
  return { ...manifest, entries }
}
