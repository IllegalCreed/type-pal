import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { parseTerminalJson } from './terminal-json.mjs'

export const documentRegistryPhases = Object.freeze([
  'ops',
  'lore',
  'phase1',
  'phase2',
  'phase3',
  'phase-governance',
  'testing',
])
export const documentRegistryLimit = 1_048_576
export const frozenRegistrySource = Object.freeze({
  revision: '3fae68aec8f448bf83d1d85e61da35c94d5200ae',
  path: 'docs/phase-governance/document-registry.json',
  sha256: '921eaef61673fdf83c69763e1f2e9a72e55b08afaf67bc8b5930dbd08331ae33',
  total: 2374,
})
const defaultManifest = fileURLToPath(
  new URL('../../docs/phase-governance/document-registry.json', import.meta.url),
)
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const sources = new WeakMap()
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`document registry: ${message}`)
}
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const lockPath = (manifestPath) => `${manifestPath}.lock`
const present = (path) => {
  try {
    lstatSync(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}
function ordinaryBytes(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    demand(fstatSync(fd).isFile(), `ordinary file required: ${path}`)
    return readFileSync(fd)
  } finally {
    closeSync(fd)
  }
}
function jsonBytes(bytes, path) {
  demand(bytes.length < documentRegistryLimit, `physical file reaches 1 MiB: ${path}`)
  return parseTerminalJson(bytes)
}
function shardName(value) {
  demand(
    typeof value === 'string' && /^document-registry\.[a-z0-9-]+\.json$/.test(value),
    `unsafe shard path: ${String(value)}`,
  )
  return value
}
function entriesValid(entries) {
  demand(Array.isArray(entries), 'entries array missing')
  const paths = new Set()
  for (const entry of entries) {
    demand(object(entry), 'entry object required')
    for (const key of [
      'path',
      'phase',
      'docType',
      'templateId',
      'templateCompliance',
      'reviewStatus',
      'reviewRecord',
    ])
      demand(text(entry[key]), `${entry.path ?? 'entry'}: missing native ${key}`)
    demand(documentRegistryPhases.includes(entry.phase), `${entry.path}: invalid phase`)
    demand(
      /^docs\/(?!.*(?:^|\/)\.{1,2}(?:\/|$))[^\\\0]+\.(?:md|json|html)$/.test(entry.path),
      `unsafe document path: ${entry.path}`,
    )
    demand(!paths.has(entry.path), `duplicate document path: ${entry.path}`)
    paths.add(entry.path)
  }
}
export function summarizeDocumentRegistry(entries) {
  const count = (key) => {
    const counts = new Map()
    for (const entry of entries) counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1)
    return Object.fromEntries(counts)
  }
  return {
    total: entries.length,
    byPhase: count('phase'),
    byType: count('docType'),
    reviewStatus: count('reviewStatus'),
    templateCompliance: count('templateCompliance'),
  }
}
function validateLogical(registry) {
  demand(object(registry), 'registry object required')
  entriesValid(registry.entries)
  demand(
    isDeepStrictEqual(registry.summary, summarizeDocumentRegistry(registry.entries)),
    'summary mismatch',
  )
}
function readPackage(manifestPath, read = ordinaryBytes) {
  const files = new Map()
  const take = (path) => {
    const bytes = read(path)
    files.set(path, bytes)
    return jsonBytes(bytes, path)
  }
  const manifest = take(manifestPath)
  demand(object(manifest) && manifest.schemaVersion === 2, 'live loader requires schemaVersion 2')
  demand(!Object.hasOwn(manifest, 'entries'), 'manifest must not contain flat entries')
  demand(text(manifest.storageProducer), 'storageProducer missing')
  demand(object(manifest.summary) && Number.isSafeInteger(manifest.summary.total), 'total invalid')
  demand(manifest.summary.total >= 0, 'total must be nonnegative')
  demand(Array.isArray(manifest.shards) && manifest.shards.length > 0, 'shards missing')
  const keys = new Set()
  const paths = new Set()
  const positions = new Map()
  for (const descriptor of manifest.shards) {
    demand(object(descriptor) && text(descriptor.key), 'shard key missing')
    demand(!keys.has(descriptor.key), `duplicate shard key: ${descriptor.key}`)
    keys.add(descriptor.key)
    const name = shardName(descriptor.path)
    demand(!paths.has(name), `duplicate shard path: ${name}`)
    paths.add(name)
    demand(documentRegistryPhases.includes(descriptor.phase), `${name}: invalid descriptor phase`)
    demand(/^[a-f\d]{64}$/.test(descriptor.sha256), `${name}: invalid descriptor SHA`)
    const path = join(dirname(manifestPath), name)
    const shard = take(path)
    demand(digest(files.get(path)) === descriptor.sha256, `${name}: shard SHA drift`)
    demand(object(shard) && shard.schemaVersion === 1, `${name}: shard schema invalid`)
    demand(shard.phase === descriptor.phase, `${name}: shard phase mismatch`)
    demand(
      Array.isArray(shard.positions) && Array.isArray(shard.entries),
      `${name}: arrays missing`,
    )
    demand(shard.positions.length === shard.entries.length, `${name}: positions length mismatch`)
    demand(descriptor.total === shard.entries.length, `${name}: descriptor total mismatch`)
    for (const [index, entry] of shard.entries.entries()) {
      const position = shard.positions[index]
      demand(
        Number.isSafeInteger(position) && position >= 0 && position < manifest.summary.total,
        `${name}: position out of range`,
      )
      demand(!positions.has(position), `${name}: duplicate position ${position}`)
      demand(object(entry) && entry.phase === descriptor.phase, `${name}: entry phase mismatch`)
      positions.set(position, entry)
    }
  }
  demand(positions.size === manifest.summary.total, 'missing global positions')
  const entries = Array.from({ length: positions.size }, (_, position) => positions.get(position))
  const registry = { ...manifest, entries }
  validateLogical(registry)
  return { registry, files }
}
function sameInput(files) {
  for (const [path, bytes] of files)
    demand(digest(ordinaryBytes(path)) === digest(bytes), `source-conflict: ${path}`)
}
function issueSource(manifestPath, pack) {
  const loadedSource = Object.freeze({
    manifestPath,
    files: Object.freeze(
      [...pack.files].map(([path, bytes]) => Object.freeze({ path, sha256: digest(bytes) })),
    ),
  })
  sources.set(loadedSource, {
    manifestPath,
    files: pack.files,
    registry: structuredClone(pack.registry),
  })
  return { registry: pack.registry, loadedSource }
}
export function loadDocumentRegistry({ manifestPath = defaultManifest } = {}) {
  manifestPath = resolve(manifestPath)
  demand(!present(lockPath(manifestPath)), 'busy or interrupted publication; inspect retained lock')
  const pack = readPackage(manifestPath)
  sameInput(pack.files)
  demand(!present(lockPath(manifestPath)), 'publication started during read')
  return issueSource(manifestPath, pack)
}
function formatted(value, path, formatDirectory) {
  const input = `${JSON.stringify(value, null, 2)}\n`
  demand(
    Buffer.byteLength(input) < documentRegistryLimit,
    `unformatted file reaches 1 MiB: ${path}`,
  )
  const inputPath = join(formatDirectory, basename(path))
  writeFileSync(inputPath, input, { flag: 'wx' })
  const fd = openSync(inputPath, constants.O_RDONLY | constants.O_NOFOLLOW)
  let result
  try {
    result = spawnSync(
      process.execPath,
      [require.resolve('@biomejs/biome/bin/biome'), 'format', '--stdin-file-path', path],
      {
        cwd: repoRoot,
        stdio: [fd, 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: documentRegistryLimit * 2,
        timeout: 30_000,
      },
    )
  } finally {
    closeSync(fd)
  }
  demand(
    !result.error &&
      result.status === 0 &&
      !result.signal &&
      result.stderr === '' &&
      text(result.stdout),
    `format failed: ${result.error?.message ?? result.stderr}`,
  )
  const bytes = Buffer.from(result.stdout)
  jsonBytes(bytes, path)
  return bytes
}
function prepare(registry, source, formatDirectory) {
  validateLogical(registry)
  const descriptors = registry.shards
  demand(Array.isArray(descriptors) && descriptors.length > 0, 'writer requires explicit shards')
  const byPath = new Map()
  for (const descriptor of source.registry.shards ?? []) {
    const raw = source.files.get(join(dirname(source.manifestPath), descriptor.path))
    if (raw)
      for (const entry of parseTerminalJson(raw).entries) byPath.set(entry.path, descriptor.key)
  }
  const shards = descriptors.map((descriptor) => ({
    descriptor,
    value: { schemaVersion: 1, phase: descriptor.phase, positions: [], entries: [] },
  }))
  registry.entries.forEach((entry, position) => {
    const target =
      shards.find(
        ({ descriptor }) =>
          descriptor.key === byPath.get(entry.path) && descriptor.phase === entry.phase,
      ) ?? shards.find(({ descriptor }) => descriptor.phase === entry.phase)
    demand(target, `${entry.path}: no explicit shard for phase ${entry.phase}`)
    target.value.positions.push(position)
    target.value.entries.push(entry)
  })
  const output = new Map()
  const nextDescriptors = shards.map(({ descriptor, value }) => {
    const name = shardName(descriptor.path)
    const path = join(dirname(source.manifestPath), name)
    demand(!output.has(path), `duplicate output shard path: ${name}`)
    const bytes = formatted(value, path, formatDirectory)
    output.set(path, bytes)
    return { ...descriptor, total: value.entries.length, sha256: digest(bytes) }
  })
  const { entries: _entries, ...manifest } = registry
  manifest.shards = nextDescriptors
  output.set(source.manifestPath, formatted(manifest, source.manifestPath, formatDirectory))
  const prepared = readPackage(source.manifestPath, (path) => {
    demand(output.has(path), `unprepared target: ${path}`)
    return output.get(path)
  })
  demand(
    JSON.stringify(prepared.registry.entries) === JSON.stringify(registry.entries),
    'prepared native entries changed',
  )
  return { output, prepared }
}
function publish(registry, source) {
  const manifestPath = source.manifestPath
  const lock = lockPath(manifestPath)
  const token = randomUUID()
  const owner = {
    schemaVersion: 1,
    token,
    pid: process.pid,
    createdAt: new Date().toISOString(),
    inputs: [...source.files].map(([path, bytes]) => ({ path, sha256: digest(bytes) })),
  }
  try {
    mkdirSync(lock, { mode: 0o700 })
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('document registry: writer busy; lock not stolen')
    throw error
  }
  let publishing = false
  const save = (name, value) =>
    writeFileSync(join(lock, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
  const release = () => {
    demand(
      JSON.parse(ordinaryBytes(join(lock, 'owner.json'))).token === token,
      'lock owner changed',
    )
    rmSync(lock, { recursive: true })
  }
  try {
    save('owner.json', owner)
    sameInput(source.files)
    const formatDirectory = join(lock, 'format-input')
    mkdirSync(formatDirectory)
    const { output, prepared } = prepare(registry, source, formatDirectory)
    for (const path of output.keys())
      demand(source.files.has(path) || !present(path), `unowned target already exists: ${path}`)
    mkdirSync(join(lock, 'prepared'))
    mkdirSync(join(lock, 'previous'))
    for (const [path, bytes] of source.files)
      writeFileSync(join(lock, 'previous', basename(path)), bytes, { flag: 'wx' })
    for (const [path, bytes] of output)
      writeFileSync(join(lock, 'prepared', basename(path)), bytes, { flag: 'wx' })
    save('recovery.json', {
      ...owner,
      policy:
        'Retained lock requires explicit Owner inspection; never automatically steal or replay.',
      previous: owner.inputs.map((input) => ({
        ...input,
        retainedPath: `previous/${basename(input.path)}`,
      })),
      targets: [...output].map(([path, bytes]) => ({ path, sha256: digest(bytes) })),
      publicationOrder: [...output.keys()],
      manifestLast: manifestPath,
    })
    const staged = readPackage(manifestPath, (path) =>
      ordinaryBytes(join(lock, 'prepared', basename(path))),
    )
    demand(
      [...output].every(([path, bytes]) => staged.files.get(path)?.equals(bytes)),
      'staged bytes differ from prepared package',
    )
    // Recheck under the same lock after formatting and immediately before publication.
    sameInput(source.files)
    publishing = true
    for (const path of output.keys()) renameSync(join(lock, 'prepared', basename(path)), path)
    const actual = readPackage(manifestPath)
    demand(
      [...output].every(([path, bytes]) => actual.files.get(path)?.equals(bytes)),
      'published bytes differ from prepared package',
    )
    demand(
      JSON.stringify(actual.registry) === JSON.stringify(prepared.registry),
      'published logical view differs',
    )
    sameInput(actual.files)
    release()
    return issueSource(manifestPath, actual)
  } catch (error) {
    if (!publishing) release()
    // Once publication begins, old bytes, hashes and the owner lock remain for explicit recovery.
    throw error
  }
}
export function writeDocumentRegistry({ registry, loadedSource }) {
  const source = sources.get(loadedSource)
  demand(source, 'loadedSource must come from the public loader in this process')
  demand(registry?.schemaVersion === 2, 'writer requires schemaVersion 2')
  return publish(registry, source)
}
export function migrateFrozenDocumentRegistry({ manifestPath = defaultManifest } = {}) {
  manifestPath = resolve(manifestPath)
  const bytes = ordinaryBytes(manifestPath)
  demand(digest(bytes) === frozenRegistrySource.sha256, 'frozen v1 source SHA mismatch')
  const original = jsonBytes(bytes, manifestPath)
  demand(original.schemaVersion === 1 && !original.shards, 'migration requires explicit v1 source')
  validateLogical(original)
  demand(original.entries.length === frozenRegistrySource.total, 'frozen v1 entry count mismatch')
  const registry = {
    ...original,
    schemaVersion: 2,
    storageProducer: 'scripts/docs/document-registry.mjs',
    storageMigration: {
      ...frozenRegistrySource,
      rootsMeaning: 'Preserved historical inventory roots; not a current whole-docs scope claim.',
    },
    shards: documentRegistryPhases.map((phase) => ({
      key: phase,
      phase,
      path: `document-registry.${phase}.json`,
    })),
  }
  const result = publish(registry, {
    manifestPath,
    files: new Map([[manifestPath, bytes]]),
    registry: original,
  })
  const metadata = Object.keys(original)
    .filter((key) => !['schemaVersion', 'entries'].includes(key))
    .map((key) => ({
      key,
      sourceSha256: digest(JSON.stringify(original[key])),
      targetSha256: digest(JSON.stringify(result.registry[key])),
      nativeEqual: JSON.stringify(original[key]) === JSON.stringify(result.registry[key]),
    }))
  const locations = new Map()
  const publishedSource = sources.get(result.loadedSource)
  for (const descriptor of result.registry.shards) {
    const shard = parseTerminalJson(
      publishedSource.files.get(join(dirname(manifestPath), descriptor.path)),
    )
    shard.entries.forEach((entry, targetIndex) => {
      locations.set(entry.path, { shard: descriptor.path, targetIndex })
    })
  }
  const mapping = {
    schemaVersion: 1,
    kind: 'document-registry-storage-migration',
    nonAuthorReviewer: false,
    source: frozenRegistrySource,
    representation: { schemaVersion: '1 -> 2', entries: 'flat -> parallel shard positions' },
    nativeMetadata: metadata,
    entries: original.entries.map((entry, sourceIndex) => ({
      path: entry.path,
      sourceIndex,
      sourceObjectSha256: digest(JSON.stringify(entry)),
      ...locations.get(entry.path),
      nativeEqual: JSON.stringify(entry) === JSON.stringify(result.registry.entries[sourceIndex]),
    })),
    targets: result.loadedSource.files,
    incrementalEntries: [],
  }
  demand(
    metadata.every((item) => item.nativeEqual),
    'native metadata migration changed',
  )
  demand(
    mapping.entries.every((item) => item.nativeEqual),
    'native entry migration changed',
  )
  return { ...result, mapping }
}
