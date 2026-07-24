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
}

export interface V4ScriptCorpus {
  bodies: V4ScriptBody[]
  byId: Map<string, V4ScriptBody>
  sourceSnapshotSha256: string
  nonScriptSnapshotSha256: string
  scriptLibrarySnapshotSha256: string
  rawGeneratorSnapshotSha256: string
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
}

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

function rawSnapshotDigest(files: ReadonlyMap<string, MigrationJson>): string {
  const hash = createHash('sha256')
  for (const [path, value] of [...files].sort(([left], [right]) =>
    stableStringCompare(left, right),
  )) {
    const body = serializeMigrationJson(value, path)
    hash.update(path)
    hash.update('\0')
    hash.update(sha256(body))
    hash.update('\n')
  }
  return hash.digest('hex')
}

function semanticNonScriptSnapshotDigest(migration: V4MigrationSnapshotLike): string {
  const hash = createHash('sha256')
  const managed = [...(migration.managedFiles ?? migration.files.keys())]
    .filter((path) => !path.startsWith('content/scripts/'))
    .sort(stableStringCompare)
  hash.update('managed-files\n')
  for (const path of managed) {
    hash.update(path)
    hash.update('\n')
  }
  hash.update('semantic-files\n')
  for (const path of managed) {
    const value = migration.files.get(path)
    const atomicHash =
      isAtomicProjectMapPath(path) && value === undefined ? migration.hashes?.get(path) : undefined
    if (value === undefined && !atomicHash)
      throw new Error(`P2 source: managed non-script file missing ${path}`)
    hash.update(path)
    hash.update('\0')
    hash.update(
      atomicHash ??
        (isAtomicProjectMapPath(path)
          ? sha256(serializeMigrationJson(value!, path))
          : legacyAuthorCellSha256(value)),
    )
    hash.update('\n')
  }
  return hash.digest('hex')
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
    hash.update(legacyAuthorCellSha256(body.body))
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
  targets: ReadonlySet<string>,
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
    if (targets.has(record.id))
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
      Object.entries(value.scripts).map(([id, body]) => ({
        id,
        chunk,
        body: jsonClone(body),
      })),
    )
    .sort((left, right) => stableStringCompare(left.id, right.id))
  const byId = new Map<string, V4ScriptBody>()
  for (const body of bodies) {
    if (byId.has(body.id)) throw new Error(`P2 source: duplicate script body ${body.id}`)
    byId.set(body.id, body)
  }
  const commandSites = commandSiteInventory(migration.files, bodies)
  const nonScriptSnapshotSha256 = semanticNonScriptSnapshotDigest(migration)
  const scriptLibrarySnapshotSha256 = legacyAuthorCellSha256(index.library ?? {})
  return {
    bodies,
    byId,
    sourceSnapshotSha256: semanticSourceSnapshotDigest(
      nonScriptSnapshotSha256,
      scriptLibrarySnapshotSha256,
      bodies,
    ),
    nonScriptSnapshotSha256,
    scriptLibrarySnapshotSha256,
    rawGeneratorSnapshotSha256: rawSnapshotDigest(migration.files),
    commandCensus: commandCensus(commandSites),
    commandSites,
  }
}

export function inboundReferenceInventory(
  migration: V4MigrationSnapshotLike,
  corpus: V4ScriptCorpus,
  targets: ReadonlySet<string>,
): V4InboundReferenceSite[] {
  const sites: V4InboundReferenceSite[] = []
  for (const body of corpus.bodies) {
    if (targets.has(body.id)) continue
    collectInboundReferenceSites(body.body, `legacy-script:${body.id}`, '', targets, sites)
  }
  for (const [path, value] of [...migration.files]
    .filter(([path]) => !path.startsWith('content/scripts/'))
    .sort(([left], [right]) => stableStringCompare(left, right)))
    collectInboundReferenceSites(value, path, '', targets, sites)
  return sites
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
