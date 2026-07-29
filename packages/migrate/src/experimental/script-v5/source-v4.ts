import { createHash } from 'node:crypto'
import {
  type Command,
  checkScriptIndex,
  checkScriptLibrary,
  isScriptRef,
  type ScriptChunkV1,
  type ScriptIndexV1,
} from '@type-pal/content'
import { isAtomicProjectMapPath, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { stableStringCompare } from './stable-json.js'
import type {
  P2LegacyCommandCensus,
  P2LegacyCommandKind,
  P2LegacyCommandSite,
  P2TransitionConflict,
} from './types.js'

export interface V4MigrationSnapshotLike {
  files: ReadonlyMap<string, MigrationJson>
  managedFiles?: ReadonlySet<string>
  /** PAL baseline 对原子地图只保留字节 hash；语义快照必须把它们计入而不是当作缺失。 */
  hashes?: ReadonlyMap<string, string>
}

export interface V4ScriptBody {
  id: string
  chunk: string
  body: Command[]
  authorCellSha256: string
}

export interface V4ScriptCorpus {
  source: V4MigrationSnapshotLike
  bodies: V4ScriptBody[]
  byId: Map<string, V4ScriptBody>
  inboundReferences: V4InboundReferenceSite[]
  sourceSnapshotSha256: string
  nonScriptSnapshotSha256: string
  scriptLibrarySnapshotSha256: string
  rawGeneratorSnapshotSha256: string
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
}

/**
 * A scoped reader for snapshots that remain immutable for the reader lifetime.
 *
 * Transition planning walks the same base/author snapshots through cumulative
 * P2→P4 checks. Keeping this cache explicitly scoped lets those checks share
 * the expensive corpus scan without changing `readV4ScriptCorpus` semantics
 * for ordinary callers that may mutate a snapshot between reads.
 */
export interface V4ScriptCorpusReader {
  read(migration: V4MigrationSnapshotLike): V4ScriptCorpus
}

interface V4ScriptCorpusDerivationData {
  nonScript: NonScriptSnapshotDigestParts
  raw: RawSnapshotDigestParts
}

const derivationDataByCorpus = new WeakMap<V4ScriptCorpus, V4ScriptCorpusDerivationData>()

export interface V4InboundReferenceSite {
  source: string
  targetLegacyScriptId: string
  refCellSha256: string
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function canonicalLegacyAuthorCell(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalLegacyAuthorCell)
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  const entries = Object.entries(record)
    .filter(([key]) => !(key === 'chunk' && isScriptRef(record)))
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([key, child]) => [key, canonicalLegacyAuthorCell(child)] as const)
  return Object.fromEntries(entries)
}

export function legacyAuthorCellSha256(value: unknown): string {
  return sha256(JSON.stringify(canonicalLegacyAuthorCell(value)))
}

interface RawSnapshotDigestParts {
  fileSha256: Map<string, string>
  digest: string
}

function aggregateRawSnapshotDigest(fileSha256: ReadonlyMap<string, string>): string {
  const hash = createHash('sha256')
  for (const [path, digest] of [...fileSha256].sort(([left], [right]) =>
    stableStringCompare(left, right),
  )) {
    hash.update(path)
    hash.update('\0')
    hash.update(digest)
    hash.update('\n')
  }
  return hash.digest('hex')
}

function rawSnapshotDigestParts(files: ReadonlyMap<string, MigrationJson>): RawSnapshotDigestParts {
  const fileSha256 = new Map<string, string>()
  for (const [path, value] of files)
    fileSha256.set(path, sha256(serializeMigrationJson(value, path)))
  return { fileSha256, digest: aggregateRawSnapshotDigest(fileSha256) }
}

interface NonScriptSnapshotDigestParts {
  managedPaths: string[]
  fileSha256: Map<string, string>
  digest: string
}

function semanticNonScriptFileDigest(migration: V4MigrationSnapshotLike, path: string): string {
  const value = migration.files.get(path)
  const atomicHash =
    isAtomicProjectMapPath(path) && value === undefined ? migration.hashes?.get(path) : undefined
  if (value === undefined && !atomicHash)
    throw new Error(`P2 source: managed non-script file missing ${path}`)
  return (
    atomicHash ??
    (isAtomicProjectMapPath(path)
      ? sha256(serializeMigrationJson(value!, path))
      : legacyAuthorCellSha256(value))
  )
}

function aggregateNonScriptSnapshotDigest(
  managedPaths: readonly string[],
  fileSha256: ReadonlyMap<string, string>,
): string {
  const hash = createHash('sha256')
  hash.update('managed-files\n')
  for (const path of managedPaths) {
    hash.update(path)
    hash.update('\n')
  }
  hash.update('semantic-files\n')
  for (const path of managedPaths) {
    const digest = fileSha256.get(path)
    if (!digest) throw new Error(`P2 source: managed non-script digest missing ${path}`)
    hash.update(path)
    hash.update('\0')
    hash.update(digest)
    hash.update('\n')
  }
  return hash.digest('hex')
}

function semanticNonScriptSnapshotDigestParts(
  migration: V4MigrationSnapshotLike,
): NonScriptSnapshotDigestParts {
  const managedPaths = [...(migration.managedFiles ?? migration.files.keys())]
    .filter((path) => !path.startsWith('content/scripts/'))
    .sort(stableStringCompare)
  const fileSha256 = new Map<string, string>()
  for (const path of managedPaths)
    fileSha256.set(path, semanticNonScriptFileDigest(migration, path))
  return {
    managedPaths,
    fileSha256,
    digest: aggregateNonScriptSnapshotDigest(managedPaths, fileSha256),
  }
}

function semanticSourceSnapshotDigest(
  nonScriptSnapshotSha256: string,
  scriptLibrarySnapshotSha256: string,
  bodies: readonly V4ScriptBody[],
): string {
  const hash = createHash('sha256')
  hash.update(`non-script\0${nonScriptSnapshotSha256}\n`)
  hash.update(`script-library\0${scriptLibrarySnapshotSha256}\n`)
  for (const body of bodies) {
    hash.update(body.id)
    hash.update('\0')
    hash.update(body.authorCellSha256)
    hash.update('\n')
  }
  return hash.digest('hex')
}

const LEGACY_COMMAND_KINDS = new Set<P2LegacyCommandKind>([
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
])

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function collectInboundReferenceSites(
  node: unknown,
  owner: string,
  pointer: string,
  targets: ReadonlySet<string> | undefined,
  sites: V4InboundReferenceSite[],
): void {
  if (Array.isArray(node)) {
    for (const [index, value] of node.entries())
      collectInboundReferenceSites(value, owner, `${pointer}/${index}`, targets, sites)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (isScriptRef(record)) {
    if (!targets || targets.has(record.id))
      sites.push({
        source: `${owner}#${pointer || '/'}`,
        targetLegacyScriptId: record.id,
        refCellSha256: legacyAuthorCellSha256(record),
      })
    return
  }
  for (const [key, value] of Object.entries(record).sort(([left], [right]) =>
    stableStringCompare(left, right),
  ))
    collectInboundReferenceSites(value, owner, `${pointer}/${pointerToken(key)}`, targets, sites)
}

function collectCommandSites(
  node: unknown,
  file: string,
  pointer: string,
  sites: P2LegacyCommandSite[],
): void {
  if (Array.isArray(node)) {
    for (const [index, value] of node.entries())
      collectCommandSites(value, file, `${pointer}/${index}`, sites)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (
    typeof record.kind === 'string' &&
    LEGACY_COMMAND_KINDS.has(record.kind as P2LegacyCommandKind)
  ) {
    const kind = record.kind as P2LegacyCommandKind
    const script = isScriptRef(record.script) ? record.script : undefined
    const representation =
      kind === 'setEntityTriggerMode' || kind === 'clearSceneScripts'
        ? ('state-mutation' as const)
        : script
          ? ('script-ref' as const)
          : ('inline-stages' as const)
    const source = `${file}#${pointer || '/'}`
    sites.push({
      source,
      kind,
      representation,
      ...(script ? { targetLegacyScriptId: script.id } : {}),
      disposition:
        source === 'content/scenes/s018.json#/onEnter/0/entry/prepare/0'
          ? 'transitioned-p2'
          : 'legacy-pending',
    })
  }
  for (const [key, value] of Object.entries(record).sort(([left], [right]) =>
    stableStringCompare(left, right),
  ))
    collectCommandSites(value, file, `${pointer}/${pointerToken(key)}`, sites)
}

export function commandSiteInventory(
  files: ReadonlyMap<string, MigrationJson>,
  bodies: readonly V4ScriptBody[],
): P2LegacyCommandSite[] {
  const sites: P2LegacyCommandSite[] = []
  for (const [file, value] of [...files]
    .filter(([file]) => !file.startsWith('content/scripts/'))
    .sort(([left], [right]) => stableStringCompare(left, right)))
    collectCommandSites(value, file, '', sites)
  for (const body of bodies) collectCommandSites(body.body, `legacy-script:${body.id}`, '', sites)
  return sites.sort((left, right) => stableStringCompare(left.source, right.source))
}

export function commandCensus(sites: readonly P2LegacyCommandSite[]): P2LegacyCommandCensus {
  const count = (kind: P2LegacyCommandKind) => sites.filter((site) => site.kind === kind).length
  return {
    setEntityAuto: count('setEntityAuto'),
    setEntityTrigger: count('setEntityTrigger'),
    setEntityTriggerMode: count('setEntityTriggerMode'),
    setSceneOnEnter: count('setSceneOnEnter'),
    setSceneOnTeleport: count('setSceneOnTeleport'),
    clearSceneScripts: count('clearSceneScripts'),
    total: sites.length,
  }
}

export function readV4ScriptCorpus(migration: V4MigrationSnapshotLike): V4ScriptCorpus {
  const rawIndex = migration.files.get('content/scripts/index.json')
  checkScriptIndex(rawIndex, 'content/scripts/index.json')
  const index = rawIndex as unknown as ScriptIndexV1
  const chunks: Record<string, ScriptChunkV1> = {}
  for (const [chunkId, meta] of Object.entries(index.chunks).sort(([left], [right]) =>
    stableStringCompare(left, right),
  )) {
    const raw = migration.files.get(`content/scripts/${meta.path}`)
    if (!raw) throw new Error(`P2 source: missing script chunk ${chunkId}`)
    chunks[chunkId] = raw as unknown as ScriptChunkV1
  }
  checkScriptLibrary(index, chunks, 'content/scripts')

  const bodies = Object.entries(chunks)
    .flatMap(([chunk, value]) =>
      Object.entries(value.scripts).map(([id, body]) => {
        const clonedBody = jsonClone(body)
        return {
          id,
          chunk,
          body: clonedBody,
          authorCellSha256: legacyAuthorCellSha256(clonedBody),
        }
      }),
    )
    .sort((left, right) => stableStringCompare(left.id, right.id))
  const byId = new Map<string, V4ScriptBody>()
  for (const body of bodies) {
    if (byId.has(body.id)) throw new Error(`P2 source: duplicate script body ${body.id}`)
    byId.set(body.id, body)
  }
  const commandSites = commandSiteInventory(migration.files, bodies)
  const inboundReferences: V4InboundReferenceSite[] = []
  for (const body of bodies)
    collectInboundReferenceSites(
      body.body,
      `legacy-script:${body.id}`,
      '',
      undefined,
      inboundReferences,
    )
  for (const [path, value] of [...migration.files]
    .filter(([path]) => !path.startsWith('content/scripts/'))
    .sort(([left], [right]) => stableStringCompare(left, right)))
    collectInboundReferenceSites(value, path, '', undefined, inboundReferences)
  const sortedInboundReferences = inboundReferences
    .filter(
      (site) =>
        !site.source.startsWith('content/scenes/s018.json#/onEnter/0/entry/prepare/0/script'),
    )
    .sort(
      (left, right) =>
        stableStringCompare(left.targetLegacyScriptId, right.targetLegacyScriptId) ||
        stableStringCompare(left.source, right.source),
    )
  const nonScript = semanticNonScriptSnapshotDigestParts(migration)
  const raw = rawSnapshotDigestParts(migration.files)
  const nonScriptSnapshotSha256 = nonScript.digest
  const scriptLibrarySnapshotSha256 = legacyAuthorCellSha256(index.library ?? {})
  const corpus: V4ScriptCorpus = {
    source: migration,
    bodies,
    byId,
    inboundReferences: sortedInboundReferences,
    sourceSnapshotSha256: semanticSourceSnapshotDigest(
      nonScriptSnapshotSha256,
      scriptLibrarySnapshotSha256,
      bodies,
    ),
    nonScriptSnapshotSha256,
    scriptLibrarySnapshotSha256,
    rawGeneratorSnapshotSha256: raw.digest,
    commandCensus: commandCensus(commandSites),
    commandSites,
  }
  derivationDataByCorpus.set(corpus, { nonScript, raw })
  return corpus
}

export function createV4ScriptCorpusReader(): V4ScriptCorpusReader {
  const cache = new WeakMap<object, V4ScriptCorpus>()
  return {
    read(migration) {
      const key = migration as object
      const cached = cache.get(key)
      if (cached) return cached
      const corpus = readV4ScriptCorpus(migration)
      cache.set(key, corpus)
      return corpus
    },
  }
}

function sameStringSet(
  left: ReadonlySet<string> | undefined,
  right: ReadonlySet<string> | undefined,
  leftFallback: Iterable<string>,
  rightFallback: Iterable<string>,
): boolean {
  const leftValues = left ?? new Set(leftFallback)
  const rightValues = right ?? new Set(rightFallback)
  if (leftValues.size !== rightValues.size) return false
  for (const value of leftValues) if (!rightValues.has(value)) return false
  return true
}

function sameStringMap(
  left: ReadonlyMap<string, string> | undefined,
  right: ReadonlyMap<string, string> | undefined,
): boolean {
  if (!left || !right) return left === right
  if (left.size !== right.size) return false
  for (const [key, value] of left) if (right.get(key) !== value) return false
  return true
}

function changedFilePaths(base: V4MigrationSnapshotLike, fork: V4MigrationSnapshotLike): string[] {
  const paths = new Set([...base.files.keys(), ...fork.files.keys()])
  return [...paths]
    .filter(
      (path) =>
        base.files.has(path) !== fork.files.has(path) ||
        !Object.is(base.files.get(path), fork.files.get(path)),
    )
    .sort(stableStringCompare)
}

function sameScriptChunkTopology(left: ScriptIndexV1, right: ScriptIndexV1): boolean {
  const leftEntries = Object.entries(left.chunks).sort(([a], [b]) => stableStringCompare(a, b))
  const rightEntries = Object.entries(right.chunks).sort(([a], [b]) => stableStringCompare(a, b))
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([chunkId, meta], index) =>
        rightEntries[index]?.[0] === chunkId && rightEntries[index]?.[1].path === meta.path,
    )
  )
}

function scriptChunks(
  migration: V4MigrationSnapshotLike,
  index: ScriptIndexV1,
): Record<string, ScriptChunkV1> {
  const chunks: Record<string, ScriptChunkV1> = {}
  for (const [chunkId, meta] of Object.entries(index.chunks).sort(([left], [right]) =>
    stableStringCompare(left, right),
  )) {
    const raw = migration.files.get(`content/scripts/${meta.path}`)
    if (!raw) throw new Error(`P2 source: missing script chunk ${chunkId}`)
    chunks[chunkId] = raw as unknown as ScriptChunkV1
  }
  return chunks
}

function derivedCorpusOrUndefined(
  base: V4MigrationSnapshotLike,
  fork: V4MigrationSnapshotLike,
  seed: V4ScriptCorpus,
): V4ScriptCorpus | undefined {
  if (
    fork === base ||
    fork.files === base.files ||
    !sameStringSet(base.managedFiles, fork.managedFiles, base.files.keys(), fork.files.keys()) ||
    !sameStringMap(base.hashes, fork.hashes)
  )
    return

  const changedPaths = changedFilePaths(base, fork)
  if (changedPaths.length === 0) {
    const corpus = { ...seed, source: fork }
    const seedData = derivationDataByCorpus.get(seed)
    if (seedData) derivationDataByCorpus.set(corpus, seedData)
    return corpus
  }
  if (changedPaths.some((path) => !base.files.has(path) || !fork.files.has(path))) return

  const indexPath = 'content/scripts/index.json'
  const changedScriptPaths = changedPaths.filter(
    (path) => path.startsWith('content/scripts/') && path !== indexPath,
  )
  const changedNonScriptPaths = changedPaths.filter((path) => !path.startsWith('content/scripts/'))
  const indexChanged = changedPaths.includes(indexPath)
  if (
    changedScriptPaths.length > 1 ||
    (changedScriptPaths.length > 0 && !indexChanged) ||
    (changedScriptPaths.length > 0 && changedNonScriptPaths.length > 0)
  )
    return

  let bodies = seed.bodies
  let byId = seed.byId
  const changedBodyIds = new Set<string>()
  let scriptLibrarySnapshotSha256 = seed.scriptLibrarySnapshotSha256
  if (indexChanged || changedScriptPaths.length > 0) {
    const baseRawIndex = base.files.get(indexPath)
    const forkRawIndex = fork.files.get(indexPath)
    checkScriptIndex(baseRawIndex, indexPath)
    checkScriptIndex(forkRawIndex, indexPath)
    const baseIndex = baseRawIndex as unknown as ScriptIndexV1
    const forkIndex = forkRawIndex as unknown as ScriptIndexV1
    if (!sameScriptChunkTopology(baseIndex, forkIndex)) return
    const chunks = scriptChunks(fork, forkIndex)
    checkScriptLibrary(forkIndex, chunks, 'content/scripts')
    scriptLibrarySnapshotSha256 = legacyAuthorCellSha256(forkIndex.library ?? {})

    if (changedScriptPaths.length === 1) {
      const changedPath = changedScriptPaths[0]!
      const changedChunkId = Object.entries(forkIndex.chunks).find(
        ([, meta]) => `content/scripts/${meta.path}` === changedPath,
      )?.[0]
      if (!changedChunkId) return
      const changedChunk = chunks[changedChunkId]!
      for (const body of seed.bodies) if (body.chunk === changedChunkId) changedBodyIds.add(body.id)
      const replacements = Object.entries(changedChunk.scripts).map(([id, body]) => {
        const clonedBody = jsonClone(body)
        changedBodyIds.add(id)
        return {
          id,
          chunk: changedChunkId,
          body: clonedBody,
          authorCellSha256: legacyAuthorCellSha256(clonedBody),
        }
      })
      bodies = [
        ...seed.bodies.filter((body) => body.chunk !== changedChunkId),
        ...replacements,
      ].sort((left, right) => stableStringCompare(left.id, right.id))
      byId = new Map<string, V4ScriptBody>()
      for (const body of bodies) {
        if (byId.has(body.id)) throw new Error(`P2 source: duplicate script body ${body.id}`)
        byId.set(body.id, body)
      }
    }
  }

  const sourceWasChanged = (source: string): boolean => {
    for (const path of changedNonScriptPaths) if (source.startsWith(`${path}#`)) return true
    for (const id of changedBodyIds) if (source.startsWith(`legacy-script:${id}#`)) return true
    return false
  }

  let commandSites = seed.commandSites
  let inboundReferences = seed.inboundReferences
  if (changedNonScriptPaths.length > 0 || changedBodyIds.size > 0) {
    const nextCommandSites = seed.commandSites.filter((site) => !sourceWasChanged(site.source))
    const nextInboundReferences = seed.inboundReferences.filter(
      (site) => !sourceWasChanged(site.source),
    )
    for (const path of changedNonScriptPaths) {
      const value = fork.files.get(path)
      collectCommandSites(value, path, '', nextCommandSites)
      collectInboundReferenceSites(value, path, '', undefined, nextInboundReferences)
    }
    for (const id of changedBodyIds) {
      const body = byId.get(id)
      if (!body) continue
      collectCommandSites(body.body, `legacy-script:${id}`, '', nextCommandSites)
      collectInboundReferenceSites(
        body.body,
        `legacy-script:${id}`,
        '',
        undefined,
        nextInboundReferences,
      )
    }
    commandSites = nextCommandSites.sort((left, right) =>
      stableStringCompare(left.source, right.source),
    )
    inboundReferences = nextInboundReferences
      .filter(
        (site) =>
          !site.source.startsWith('content/scenes/s018.json#/onEnter/0/entry/prepare/0/script'),
      )
      .sort(
        (left, right) =>
          stableStringCompare(left.targetLegacyScriptId, right.targetLegacyScriptId) ||
          stableStringCompare(left.source, right.source),
      )
  }

  const seedData = derivationDataByCorpus.get(seed)
  if (!seedData) return
  const nonScriptFileSha256 = new Map(seedData.nonScript.fileSha256)
  for (const path of changedNonScriptPaths)
    if (nonScriptFileSha256.has(path))
      nonScriptFileSha256.set(path, semanticNonScriptFileDigest(fork, path))
  const nonScriptSnapshotSha256 = aggregateNonScriptSnapshotDigest(
    seedData.nonScript.managedPaths,
    nonScriptFileSha256,
  )
  const rawFileSha256 = new Map(seedData.raw.fileSha256)
  for (const path of changedPaths)
    rawFileSha256.set(path, sha256(serializeMigrationJson(fork.files.get(path)!, path)))
  const rawGeneratorSnapshotSha256 = aggregateRawSnapshotDigest(rawFileSha256)
  const corpus: V4ScriptCorpus = {
    source: fork,
    bodies,
    byId,
    inboundReferences,
    sourceSnapshotSha256: semanticSourceSnapshotDigest(
      nonScriptSnapshotSha256,
      scriptLibrarySnapshotSha256,
      bodies,
    ),
    nonScriptSnapshotSha256,
    scriptLibrarySnapshotSha256,
    rawGeneratorSnapshotSha256,
    commandCensus: commandCensus(commandSites),
    commandSites,
  }
  derivationDataByCorpus.set(corpus, {
    nonScript: {
      managedPaths: seedData.nonScript.managedPaths,
      fileSha256: nonScriptFileSha256,
      digest: nonScriptSnapshotSha256,
    },
    raw: { fileSha256: rawFileSha256, digest: rawGeneratorSnapshotSha256 },
  })
  return corpus
}

/**
 * Fast-test-only style reader for shallow copy-on-write forks of one immutable
 * seed snapshot. Unsupported fork shapes transparently fall back to a complete
 * corpus read; release callers keep using `createV4ScriptCorpusReader`.
 */
export function createSeededV4ScriptCorpusReader(
  base: V4MigrationSnapshotLike,
  seed: V4ScriptCorpus,
): V4ScriptCorpusReader {
  if (seed.source !== base)
    throw new Error('P2 source: seeded corpus 与 base migration identity 不一致')
  if (!derivationDataByCorpus.has(seed))
    throw new Error('P2 source: seeded corpus 缺 derivation metadata')
  const cache = new WeakMap<object, V4ScriptCorpus>()
  cache.set(base as object, seed)
  return {
    read(migration) {
      const key = migration as object
      const cached = cache.get(key)
      if (cached) return cached
      const corpus =
        derivedCorpusOrUndefined(base, migration, seed) ?? readV4ScriptCorpus(migration)
      cache.set(key, corpus)
      return corpus
    },
  }
}

export function inboundReferenceInventory(
  migration: V4MigrationSnapshotLike,
  corpus: V4ScriptCorpus,
  targets: ReadonlySet<string>,
  options: { includeTargetBodies?: boolean } = {},
): V4InboundReferenceSite[] {
  if (corpus.source !== migration)
    throw new Error('P2 source: inbound reference corpus 与 migration identity 不一致')
  return corpus.inboundReferences.filter((site) => {
    if (!targets.has(site.targetLegacyScriptId)) return false
    if (options.includeTargetBodies || !site.source.startsWith('legacy-script:')) return true
    const separator = site.source.indexOf('#', 'legacy-script:'.length)
    const owner =
      separator < 0
        ? site.source.slice('legacy-script:'.length)
        : site.source.slice('legacy-script:'.length, separator)
    return !targets.has(owner)
  })
}

export function commandAtPointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) throw new Error(`P2 source: invalid JSON pointer ${pointer}`)
  let current = root
  for (const encoded of pointer.slice(1).split('/')) {
    const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~')
    if (Array.isArray(current)) {
      const index = Number(key)
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        throw new Error(`P2 source: JSON pointer out of range ${pointer}`)
      current = current[index]
    } else if (current && typeof current === 'object' && Object.hasOwn(current, key))
      current = (current as Record<string, unknown>)[key]
    else throw new Error(`P2 source: JSON pointer missing ${pointer}`)
  }
  return current
}

export function rewriteScriptRefs(
  value: unknown,
  replacements: ReadonlyMap<string, string>,
): unknown {
  if (Array.isArray(value)) return value.map((entry) => rewriteScriptRefs(entry, replacements))
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (isScriptRef(record)) {
    const target = replacements.get(record.id)
    if (!target) return jsonClone(record)
    return { ...jsonClone(record), chunk: 'experimental/n3-p2', id: target }
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, rewriteScriptRefs(child, replacements)]),
  )
}

export function reverseP2ScriptRefs(value: unknown, reverse: ReadonlyMap<string, string>): unknown {
  return rewriteScriptRefs(value, reverse)
}

export function modifiedCellConflict(args: {
  kind: P2TransitionConflict['kind']
  source: string
  expected: string
  actual: string
}): P2TransitionConflict {
  return {
    kind: args.kind,
    source: args.source,
    expected: args.expected,
    actual: args.actual,
  }
}
