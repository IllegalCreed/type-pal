import { isDeepStrictEqual } from 'node:util'
import {
  canonicalScriptTransitionJson,
  checkHostileBehaviorV13,
  checkSharedScriptLibraryV13,
  mapAssetById,
  type ProjectManifest,
  SCRIPT_V4_V5_TRANSITION_ID,
  validateActors,
  validateAssetCatalog,
  validateBattleFields,
  validateBattleSprites,
  validateEnemies,
  validateEnemyTeamsV12,
  validateEquipBattleSpriteReferences,
  validateItemsV5,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateMigrationDiagnostics,
  validateProjectMigrationDescriptorV1,
  validateProjectMigrationSidecarV1,
  validateProjectRelativePath,
  validateScenesV13,
  validateScenesV5,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateStartWorldResources,
  validateTilesets,
} from '@type-pal/content'
import {
  type AppendOnlyTransitionState,
  appendOnlyTransitionState,
} from './experimental/script-v5/append-only-transition-state.js'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import { b10PublishTimeSurfaceDigest } from './pal-b10-enemy-team-slots.js'
import {
  assertB10PublishedAuthorityGraph,
  assertW9ControlGraphProjectionSelfConsistent,
  type W9B10ControlGraphProjectionV1,
} from './pal-w9-control-graph.js'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

const W9_TRANSITION_ID = 'w9-entity-lifecycle-v1' as const
const W9_METHOD_VERSION = 'w9-entity-lifecycle-source-ledger-v1' as const
const W9_SEAL_PATH = '_transitions/w9-entity-lifecycle-v1.json' as const

export interface W9EntityLifecycleTransitionSealV1 {
  kind: 'w9-entity-lifecycle-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof W9_TRANSITION_ID
  methodVersion: typeof W9_METHOD_VERSION
  parent: {
    transitionId: 'b10-enemy-team-slots-v1'
    metadataDigest: string
    sealDigest: string
    contentDigest: string
    publishTimeSurfaceDigest: string
  }
  controlGraph: W9B10ControlGraphProjectionV1
  sourceLedger: {
    digest: string
    affectedFileAllowlist: string[]
    affectedFileAllowlistSha256: string
  }
  successor: {
    contentVersion: 13
    minimumSaveVersion: 8
    manifestDigest: string
    publishTimeSurfaceDigest: string
  }
  digest: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function fileHash(value: MigrationJson, path: string): string {
  return sha256(serializeMigrationJson(value, path))
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // W9 parent authority is immutable. Several historical rewind/build helpers use
    // copy-on-write and may mutate a JSON body they receive; deep-clone values here so a
    // B10 replay cannot silently alter the parent surface before the recursive seal check.
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function normalizeAllowlist(paths: readonly string[]): string[] {
  const normalized = [...new Set(paths)].sort(stableStringCompare)
  if (!normalized.length) throw new Error('W9 seal: affected-file allowlist 为空')
  for (const path of normalized)
    if (
      !path ||
      path.startsWith('/') ||
      path.startsWith('./') ||
      path.includes('\\') ||
      path.split('/').some((part) => part === '' || part === '.' || part === '..')
    )
      throw new Error(`W9 seal: 非法 affected-file allowlist 路径 ${path}`)
  return normalized
}

function changedManagedPaths(
  parent: MigrationSnapshot,
  successor: MigrationSnapshot,
): string[] {
  const paths = new Set([...parent.managedFiles, ...successor.managedFiles])
  return [...paths]
    .filter(
      (path) =>
        snapshotFilePresent(parent, path) !== snapshotFilePresent(successor, path) ||
        snapshotFileHash(parent, path) !== snapshotFileHash(successor, path),
    )
    .sort(stableStringCompare)
}

function assertW9AffectedFileClosure(
  parent: MigrationSnapshot,
  successor: MigrationSnapshot,
  allowlist: readonly string[],
): void {
  const special = new Set(['manifest.json', W9_SEAL_PATH])
  const declaredGenerated = allowlist.filter((path) => !special.has(path))
  const changed = changedManagedPaths(parent, successor)
  if (!isDeepStrictEqual(changed, declaredGenerated))
    throw new Error(
      `W9 seal: successor 变化越过 affected-file allowlist；changed=${JSON.stringify(changed)} ` +
        `declared=${JSON.stringify(declaredGenerated)}`,
    )
  if (!allowlist.includes('manifest.json') || !allowlist.includes(W9_SEAL_PATH))
    throw new Error('W9 seal: affected-file allowlist 必须显式包含 manifest 与 W9 seal')
}

function hasW9Marker(source: MigrationSnapshot): boolean {
  return (
    source.baselineMetadata?.transitions[W9_TRANSITION_ID] !== undefined ||
    source.files.has(W9_SEAL_PATH) ||
    source.managedFiles.has(W9_SEAL_PATH) ||
    source.hashes?.has(W9_SEAL_PATH) === true
  )
}

function sealBody(value: W9EntityLifecycleTransitionSealV1): Omit<W9EntityLifecycleTransitionSealV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function assertSealSelfConsistent(value: W9EntityLifecycleTransitionSealV1, label: string): void {
  const raw = value as unknown
  if (!isRecord(raw)) throw new Error(`${label}: 期望对象`)
  const exactKeys = (
    object: Record<string, unknown>,
    expected: readonly string[],
    path: string,
  ): void => {
    const actual = Object.keys(object).sort(stableStringCompare)
    const wanted = [...expected].sort(stableStringCompare)
    if (!isDeepStrictEqual(actual, wanted))
      throw new Error(`${path}: 字段集合漂移`)
  }
  exactKeys(
    raw,
    [
      'kind',
      'version',
      'projectId',
      'transitionId',
      'methodVersion',
      'parent',
      'controlGraph',
      'sourceLedger',
      'successor',
      'digest',
    ],
    label,
  )
  if (
    value.kind !== 'w9-entity-lifecycle-transition' ||
    value.version !== 1 ||
    value.projectId !== 'pal' ||
    value.transitionId !== W9_TRANSITION_ID ||
    value.methodVersion !== W9_METHOD_VERSION
  )
    throw new Error(`${label}: seal identity 漂移`)
  if (!isRecord(value.parent)) throw new Error(`${label}.parent: 期望对象`)
  exactKeys(
    value.parent,
    [
      'transitionId',
      'metadataDigest',
      'sealDigest',
      'contentDigest',
      'publishTimeSurfaceDigest',
    ],
    `${label}.parent`,
  )
  if (value.parent.transitionId !== 'b10-enemy-team-slots-v1')
    throw new Error(`${label}.parent.transitionId: 期望 B10`)
  for (const [key, digest] of Object.entries(value.parent))
    if (key !== 'transitionId' && (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)))
      throw new Error(`${label}.parent.${key}: 期望 sha256 digest`)
  assertW9ControlGraphProjectionSelfConsistent(value.controlGraph)
  if (!isRecord(value.sourceLedger)) throw new Error(`${label}.sourceLedger: 期望对象`)
  exactKeys(
    value.sourceLedger,
    ['digest', 'affectedFileAllowlist', 'affectedFileAllowlistSha256'],
    `${label}.sourceLedger`,
  )
  if (!/^[a-f0-9]{64}$/.test(value.sourceLedger.digest))
    throw new Error(`${label}.sourceLedger.digest: 期望 sha256 digest`)
  const allowlist = normalizeAllowlist(value.sourceLedger.affectedFileAllowlist)
  if (!isDeepStrictEqual(allowlist, value.sourceLedger.affectedFileAllowlist))
    throw new Error(`${label}.sourceLedger.affectedFileAllowlist: 未规范化`)
  if (stableJsonSha256(allowlist) !== value.sourceLedger.affectedFileAllowlistSha256)
    throw new Error(`${label}.sourceLedger.affectedFileAllowlistSha256: 不符`)
  if (!isRecord(value.successor)) throw new Error(`${label}.successor: 期望对象`)
  exactKeys(
    value.successor,
    [
      'contentVersion',
      'minimumSaveVersion',
      'manifestDigest',
      'publishTimeSurfaceDigest',
    ],
    `${label}.successor`,
  )
  if (value.successor.contentVersion !== 13 || value.successor.minimumSaveVersion !== 8)
    throw new Error(`${label}.successor: 版本对漂移`)
  for (const key of ['manifestDigest', 'publishTimeSurfaceDigest'] as const)
    if (!/^[a-f0-9]{64}$/.test(value.successor[key]))
      throw new Error(`${label}.successor.${key}: 期望 sha256 digest`)
  if (!/^[a-f0-9]{64}$/.test(value.digest)) throw new Error(`${label}.digest: 期望 sha256 digest`)
  const recomputed = stableJsonSha256(sealBody(value))
  if (recomputed !== value.digest) throw new Error(`${label}: seal body 重算 digest 与自摘要不符`)
}

function stripW9Seal(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  snapshot.files.delete(W9_SEAL_PATH)
  snapshot.managedFiles.delete(W9_SEAL_PATH)
  snapshot.hashes?.delete(W9_SEAL_PATH)
  if (snapshot.baselineMetadata) delete snapshot.baselineMetadata.transitions[W9_TRANSITION_ID]
  return snapshot
}

function downgradeW9LifecycleCommands(
  value: unknown,
  path: string,
  self: { sceneId: string; entityId: string },
): unknown {
  if (Array.isArray(value))
    return value.map((entry, index) =>
      downgradeW9LifecycleCommands(entry, `${path}[${index}]`, self),
    )
  if (!isRecord(value)) return value
  if (value.kind === 'suspendEntity' || value.kind === 'hideEntity') {
    const allowed = new Set(['kind', 'target', 'ticks'])
    for (const key of Object.keys(value))
      if (!allowed.has(key)) throw new Error(`${path}.${key}: W9 rewind lifecycle 未知字段`)
    if (!Number.isSafeInteger(value.ticks) || Number(value.ticks) <= 0)
      throw new Error(`${path}.ticks: W9 rewind 期望正安全整数`)
    if (!isRecord(value.target)) throw new Error(`${path}.target: W9 rewind 期望对象`)
    if (value.target.scene !== self.sceneId || value.target.entity !== self.entityId)
      throw new Error(`${path}.target: PAL W9 lifecycle target 不是当前 self`)
    if (value.kind === 'suspendEntity') {
      if (value.ticks !== 15)
        throw new Error(`${path}.ticks: PAL W9 suspend 只允许已封存的 15 ticks`)
      return { kind: 'vanishEntity', seconds: 2 }
    }
    if (Number(value.ticks) % 10 !== 0)
      throw new Error(`${path}.ticks: PAL W9 hide 无法精确还原 v12 seconds`)
    return { kind: 'vanishEntity', seconds: Number(value.ticks) / 10 }
  }
  if (value.kind === 'restoreEntity' || value.kind === 'removeEntity')
    throw new Error(`${path}.kind: PAL W9 publication 不允许无 v12 parent 的 ${String(value.kind)}`)
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      downgradeW9LifecycleCommands(child, `${path}.${key}`, self),
    ]),
  )
}

function downgradeW9Hostile(value: unknown, path: string): Record<string, unknown> {
  checkHostileBehaviorV13(value, path)
  if (value.onPlayerFlee.kind !== 'suspend' || value.onPlayerFlee.ticks !== 15)
    throw new Error(`${path}.onPlayerFlee: PAL W9 successor 只允许 suspend 15`)
  let respawnSeconds: number | undefined
  if (value.onVictory.kind === 'hide') {
    if (value.onVictory.ticks % 10 !== 0)
      throw new Error(`${path}.onVictory.ticks: 无法精确还原 v12 respawnSeconds`)
    respawnSeconds = value.onVictory.ticks / 10
  } else if (value.onVictory.kind === 'remain') {
    throw new Error(`${path}.onVictory: PAL W9 folded hostile 不允许 remain`)
  }
  const {
    onVictory: _onVictory,
    onPlayerFlee: _onPlayerFlee,
    ...parent
  } = structuredClone(value)
  return {
    ...parent,
    ...(respawnSeconds === undefined ? {} : { respawnSeconds }),
  }
}

function rewindW9SceneFiles(
  successor: MigrationSnapshot,
  seal: W9EntityLifecycleTransitionSealV1,
): MigrationSnapshot {
  const snapshot = cloneSnapshot(successor)
  const scenePaths = seal.sourceLedger.affectedFileAllowlist.filter((path) =>
    path.startsWith('content/scenes/'),
  )
  for (const path of scenePaths) {
    const raw = snapshot.files.get(path)
    if (!isRecord(raw)) throw new Error(`W9 rewind: successor 缺 scene ${path}`)
    const scene = structuredClone(raw)
    if (!Array.isArray(scene.entities)) throw new Error(`W9 rewind: ${path}.entities 非数组`)
    const parentEntities = scene.entities.map((rawEntity, index) => {
      const entityPath = `${path}.entities[${index}]`
      if (!isRecord(rawEntity)) throw new Error(`${entityPath}: 期望对象`)
      const { hostile, ...entityWithoutHostile } = rawEntity
      if (typeof rawEntity.id !== 'string' || !rawEntity.id)
        throw new Error(`${entityPath}.id: 期望非空 string`)
      const entity = downgradeW9LifecycleCommands(entityWithoutHostile, entityPath, {
        sceneId: String(scene.id),
        entityId: rawEntity.id,
      }) as Record<string, unknown>
      if (hostile !== undefined)
        entity.hostile = downgradeW9Hostile(hostile, `${entityPath}.hostile`)
      return entity
    })
    scene.entities = asJson(parentEntities)
    const [parentScene] = validateScenesV5([scene])
    if (!parentScene) throw new Error(`W9 rewind: ${path} 还原后为空`)
    snapshot.files.set(path, asJson(parentScene))
    snapshot.hashes?.set(path, fileHash(asJson(parentScene), path))
  }
  return snapshot
}

function assertRewoundW9Parent(
  successor: MigrationSnapshot,
  seal: W9EntityLifecycleTransitionSealV1,
): MigrationSnapshot {
  if (w9PublishTimeSurfaceDigest(successor) !== seal.successor.publishTimeSurfaceDigest)
    throw new Error('W9 rewind: successor publish surface digest 不符')
  const parent = rewindW9SceneFiles(successor, seal)
  if (b10PublishTimeSurfaceDigest(parent) !== seal.parent.publishTimeSurfaceDigest)
    throw new Error('W9 rewind: parent publish surface digest 不符')
  const graph = assertB10PublishedAuthorityGraph(parent)
  const parentSeal = graph.b10
  if (!isDeepStrictEqual(graph.projection, seal.controlGraph))
    throw new Error('W9 rewind: B10 required-control graph 漂移')
  if (parentSeal.digest !== seal.parent.sealDigest)
    throw new Error('W9 rewind: parent B10 seal digest 不符')
  if (parentSeal.content.successorDigest !== seal.parent.contentDigest)
    throw new Error('W9 rewind: parent B10 successor content digest 不符')
  return parent
}

export function w9PublishTimeSurfaceDigest(source: MigrationSnapshot): string {
  const stripped = stripW9Seal(source)
  const managed = new Set(stripped.managedFiles)
  for (const path of [...stripped.files.keys()])
    if (!managed.has(path) || isAtomicProjectMapPath(path)) stripped.files.delete(path)
  if (stripped.hashes)
    for (const path of [...stripped.hashes.keys()])
      if (!managed.has(path)) stripped.hashes.delete(path)
  return stableJsonSha256({
    files: Object.fromEntries([...stripped.files.entries()].sort(([a], [b]) => a.localeCompare(b))),
    managedFiles: [...stripped.managedFiles].sort(),
    hashes: Object.fromEntries(
      [...(stripped.hashes ?? new Map())].sort(([a], [b]) => a.localeCompare(b)),
    ),
    ...(stripped.baselineMetadata
      ? {
          generatorEpoch: stripped.baselineMetadata.generatorEpoch,
          transitions: structuredClone(stripped.baselineMetadata.transitions),
        }
      : {}),
  })
}

export function rewindPublishedW9PublicationIfPresent(
  source: MigrationSnapshot,
): MigrationSnapshot {
  if (!hasW9Marker(source)) return source
  const metadataDigest = source.baselineMetadata?.transitions[W9_TRANSITION_ID]
  const raw = source.files.get(W9_SEAL_PATH)
  const fileHashRecorded = source.hashes?.get(W9_SEAL_PATH)
  if (
    metadataDigest === undefined ||
    raw === undefined ||
    !source.managedFiles.has(W9_SEAL_PATH) ||
    fileHashRecorded === undefined
  )
    throw new Error('W9 rewind: transition 半状态 metadata/file/managed/hash 不齐')
  const seal = raw as unknown as W9EntityLifecycleTransitionSealV1
  assertSealSelfConsistent(seal, 'W9 rewind seal')
  if (metadataDigest !== seal.digest)
    throw new Error('W9 rewind: transition metadata 与 seal digest 不符')
  if (fileHash(asJson(seal), W9_SEAL_PATH) !== fileHashRecorded)
    throw new Error('W9 rewind: seal 文件 hash 不符')

  return assertRewoundW9Parent(stripW9Seal(source), seal)
}

/**
 * Project snapshots copy the published W9 seal as a managed artifact, but intentionally do not
 * carry baseline transition metadata. Historical canaries still need to project their v13
 * scene leaves back to the exact v12 authoring surface before invoking older rewind helpers.
 * Validate the copied seal against the published baseline, then remove only the W9 artifact and
 * downgrade the declared scene paths; no project bytes outside those paths are guessed or edited.
 */
export function rewindPublishedW9ProjectAgainstPublishedBaseline(
  project: MigrationSnapshot,
  publishedBaseline: MigrationSnapshot,
): MigrationSnapshot {
  if (!hasW9Marker(publishedBaseline)) return project
  const baselineRaw = publishedBaseline.files.get(W9_SEAL_PATH)
  const baselineHash = publishedBaseline.hashes?.get(W9_SEAL_PATH)
  if (baselineRaw === undefined || baselineHash === undefined)
    throw new Error('W9 project rewind: published authority seal 四态不完整')
  const baselineSeal = baselineRaw as unknown as W9EntityLifecycleTransitionSealV1
  assertSealSelfConsistent(baselineSeal, 'W9 project rewind authority seal')
  if (baselineHash !== fileHash(asJson(baselineSeal), W9_SEAL_PATH))
    throw new Error('W9 project rewind: published authority seal hash 不符')

  const projectRaw = project.files.get(W9_SEAL_PATH)
  const projectHash = project.hashes?.get(W9_SEAL_PATH)
  if (
    projectRaw === undefined ||
    projectHash === undefined ||
    !project.managedFiles.has(W9_SEAL_PATH)
  )
    throw new Error('W9 project rewind: 工程 W9 seal 四态不完整')
  if (!isDeepStrictEqual(projectRaw, baselineRaw))
    throw new Error('W9 project rewind: 工程 seal 与 published authority 不符')
  if (projectHash !== fileHash(asJson(projectRaw), W9_SEAL_PATH))
    throw new Error('W9 project rewind: 工程 seal hash 不符')
  if (project.baselineMetadata?.transitions[W9_TRANSITION_ID] !== undefined)
    throw new Error('W9 project rewind: 工程不得携带 baseline transition metadata')

  const downgraded = rewindW9SceneFiles(project, baselineSeal)
  downgraded.files.delete(W9_SEAL_PATH)
  downgraded.managedFiles.delete(W9_SEAL_PATH)
  downgraded.hashes?.delete(W9_SEAL_PATH)
  return downgraded
}

export function buildW9EntityLifecycleSeal(args: {
  parentBaseline: MigrationSnapshot
  successor: MigrationSnapshot
  sourceLedgerDigest: string
  affectedFileAllowlist: readonly string[]
  nextManifest: ProjectManifest<13>
}): W9EntityLifecycleTransitionSealV1 {
  const parentSurface = rewindPublishedW9PublicationIfPresent(args.parentBaseline)
  const graph = assertB10PublishedAuthorityGraph(parentSurface)
  const parentSeal = graph.b10
  const allowlist = normalizeAllowlist(args.affectedFileAllowlist)
  assertW9AffectedFileClosure(parentSurface, args.successor, allowlist)
  const manifest = structuredClone(args.nextManifest)
  const manifestDigest = stableJsonSha256(manifest)
  const successorDigest = w9PublishTimeSurfaceDigest(args.successor)
  const body: Omit<W9EntityLifecycleTransitionSealV1, 'digest'> = {
    kind: 'w9-entity-lifecycle-transition' as const,
    version: 1 as const,
    projectId: 'pal' as const,
    transitionId: W9_TRANSITION_ID,
    methodVersion: W9_METHOD_VERSION,
    parent: {
      transitionId: 'b10-enemy-team-slots-v1' as const,
      metadataDigest: parentSeal.digest,
      sealDigest: parentSeal.digest,
      contentDigest: parentSeal.content.successorDigest,
      publishTimeSurfaceDigest: b10PublishTimeSurfaceDigest(parentSurface),
    },
    controlGraph: graph.projection,
    sourceLedger: {
      digest: args.sourceLedgerDigest,
      affectedFileAllowlist: allowlist,
      affectedFileAllowlistSha256: stableJsonSha256(allowlist),
    },
    successor: {
      contentVersion: 13,
      minimumSaveVersion: 8,
      manifestDigest,
      publishTimeSurfaceDigest: successorDigest,
    },
  }
  const seal = { ...body, digest: stableJsonSha256(body) }
  const roundTrip = rewindW9SceneFiles(args.successor, seal)
  const drift = changedManagedPaths(parentSurface, roundTrip)
  if (drift.length)
    throw new Error(`W9 seal: successor → parent 逆投影漂移 ${drift.slice(0, 8).join(',')}`)
  return seal
}

export function installW9EntityLifecycleSeal(
  baseline: MigrationSnapshot,
  seal: W9EntityLifecycleTransitionSealV1,
): AppendOnlyTransitionState {
  if (!baseline.baselineMetadata) throw new Error('W9 seal: baseline 缺 metadata')
  if (!baseline.hashes) throw new Error('W9 seal: baseline 缺 hashes')
  assertSealSelfConsistent(seal, 'W9 seal authority')
  const mode = appendOnlyTransitionState(baseline, {
    transitionId: W9_TRANSITION_ID,
    sealPath: W9_SEAL_PATH,
    errorPrefix: 'W9 seal',
  })

  const parentSurface =
    mode === 'replay'
      ? rewindPublishedW9PublicationIfPresent(baseline)
      : assertRewoundW9Parent(baseline, seal)
  const graph = assertB10PublishedAuthorityGraph(parentSurface)
  const parentSeal = graph.b10
  if (!isDeepStrictEqual(graph.projection, seal.controlGraph))
    throw new Error('W9 seal: B10 required-control graph 漂移')
  if (parentSeal.digest !== seal.parent.sealDigest)
    throw new Error('W9 seal: parent B10 seal digest 不符')
  if (b10PublishTimeSurfaceDigest(parentSurface) !== seal.parent.publishTimeSurfaceDigest)
    throw new Error('W9 seal: parent B10 publish surface digest 不符')
  if (parentSeal.content.successorDigest !== seal.parent.contentDigest)
    throw new Error('W9 seal: parent B10 successor content digest 不符')
  if (w9PublishTimeSurfaceDigest(baseline) !== seal.successor.publishTimeSurfaceDigest)
    throw new Error('W9 seal: successor publish surface digest 不符')

  if (seal.successor.contentVersion !== 13 || seal.successor.minimumSaveVersion !== 8)
    throw new Error('W9 seal: successor 版本对不符')

  if (mode === 'replay') {
    const publishedRaw = baseline.files.get(W9_SEAL_PATH)
    if (!isRecord(publishedRaw)) throw new Error('W9 seal: published seal 不是对象')
    const published = structuredClone(publishedRaw) as unknown as W9EntityLifecycleTransitionSealV1
    assertSealSelfConsistent(published, 'W9 seal published')
    if (published.digest !== baseline.baselineMetadata.transitions[W9_TRANSITION_ID])
      throw new Error('W9 seal: published seal 与 transition metadata 不符')
    if (baseline.hashes.get(W9_SEAL_PATH) !== fileHash(asJson(published), W9_SEAL_PATH))
      throw new Error('W9 seal: published seal 与文件 hash 不符')
    if (!isDeepStrictEqual(published, seal))
      throw new Error('W9 seal: published seal 与重建 authority 不符')
    return mode
  }

  baseline.files.set(W9_SEAL_PATH, asJson(seal))
  baseline.managedFiles.add(W9_SEAL_PATH)
  baseline.hashes.set(W9_SEAL_PATH, fileHash(asJson(seal), W9_SEAL_PATH))
  baseline.baselineMetadata.transitions[W9_TRANSITION_ID] = seal.digest
  return mode
}

function targetFile(snapshot: MigrationSnapshot, path: string): MigrationJson {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`W9 v13 target 缺 ${path}`)
  return value
}

function contentPath(
  manifest: ProjectManifest<13>,
  key: string,
  options: { required?: boolean } = {},
): string | undefined {
  const value = manifest.content[key]
  if (value === undefined) {
    if (options.required) throw new Error(`工程 "${manifest.id}": manifest 缺 ${key} 路径`)
    return undefined
  }
  return validateProjectRelativePath(value, `manifest.content.${key}`)
}

function sceneDirectory(manifest: ProjectManifest<13>): string {
  const raw = manifest.content.scenes ?? 'content/scenes/'
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw
  validateProjectRelativePath(trimmed, 'manifest.content.scenes')
  return `${trimmed}/`
}

function validateSceneIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry))
    throw new Error('scenes/index.json: 期望非空 string[]')
  const ids = value as string[]
  if (new Set(ids).size !== ids.length) throw new Error('scenes/index.json: scene id 重复')
  return ids
}

function validateHistoricalMigrationRegistry(
  target: MigrationSnapshot,
  manifest: ProjectManifest<13>,
): void {
  for (const [id, descriptorValue] of Object.entries(manifest.migrations ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (id !== SCRIPT_V4_V5_TRANSITION_ID)
      throw new Error(`manifest.migrations.${id}: 引擎不支持该 content transition`)
    const descriptor = validateProjectMigrationDescriptorV1(descriptorValue)
    const rawSidecar = targetFile(target, descriptor.path)
    const actualFileDigest = sha256(serializeMigrationJson(rawSidecar, descriptor.path))
    if (actualFileDigest !== descriptor.sha256)
      throw new Error(
        `${descriptor.path}: manifest 登记 SHA-256 ${descriptor.sha256}，实际 ${actualFileDigest}`,
      )
    const sidecar = validateProjectMigrationSidecarV1(rawSidecar, manifest.id)
    const { digest: declaredDigest, ...body } = sidecar
    const actualDigest = sha256(canonicalScriptTransitionJson(body))
    if (actualDigest !== declaredDigest)
      throw new Error(
        `${descriptor.path}: sidecar 自摘要 ${declaredDigest}，实际 ${actualDigest}`,
      )
  }
}

export async function validateW9ProjectV13Target(args: {
  target: MigrationSnapshot
  manifest: ProjectManifest<13>
}): Promise<void> {
  if (args.manifest.contentVersion !== 13)
    throw new Error(`W9 v13 target 只接受 contentVersion 13，收到 ${String(args.manifest.contentVersion)}`)
  if (args.manifest.minimumSaveVersion !== 8)
    throw new Error(
      `W9 v13 target 只接受 minimumSaveVersion 8，收到 ${String(args.manifest.minimumSaveVersion)}`,
    )
  const { target, manifest } = args
  if (manifest.content.scripts !== undefined)
    throw new Error(`工程 "${manifest.id}": v13 禁止 legacy content.scripts`)
  validateHistoricalMigrationRegistry(target, manifest)
  validateStartWorldResources(manifest.startWorld)
  for (const [index, entry] of (manifest.entryPoints ?? []).entries()) {
    if (entry.startWorld)
      validateStartWorldResources(entry.startWorld, `entryPoints[${index}].startWorld`)
  }

  const catalogPath = validateProjectRelativePath(
    manifest.assets.catalog,
    'manifest.assets.catalog',
  )
  const assetCatalog = validateAssetCatalog(targetFile(target, catalogPath))
  validateManifestAssetConfigV3(manifest.assets, assetCatalog)
  const mapIndex = validateMapIndex(targetFile(target, contentPath(manifest, 'maps', { required: true })!))
  const mapIds = new Set(mapIndex.maps.map((map) => map.id))
  const sceneDir = sceneDirectory(manifest)
  const sceneIds = validateSceneIds(targetFile(target, `${sceneDir}index.json`))
  if (!sceneIds.includes(manifest.entryScene))
    throw new Error(`工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`)
  for (const sceneId of sceneIds) {
    const [scene] = validateScenesV13([targetFile(target, `${sceneDir}${sceneId}.json`)])
    if (!scene) throw new Error(`工程 "${manifest.id}": v13 场景 ${sceneId} 为空`)
    if (scene.id !== sceneId)
      throw new Error(`W9 v13 target: 场景文件 id 不符(期望 "${sceneId}",得 "${scene.id}")`)
    if (!mapAssetById(mapIndex, scene.mapId) || !mapIds.has(scene.mapId))
      throw new Error(`场景 "${scene.id}": mapId "${scene.mapId}" 不在地图索引`)
  }

  const actors = validateActors(targetFile(target, contentPath(manifest, 'actors', { required: true })!))
  validateSkills(targetFile(target, contentPath(manifest, 'skills', { required: true })!))
  const items = validateItemsV5(targetFile(target, contentPath(manifest, 'items', { required: true })!))
  validateLocale(targetFile(target, contentPath(manifest, 'locale', { required: true })!), {
    allowLegacySoftWrap: true,
  })
  validateSprites(
    targetFile(target, contentPath(manifest, 'sprites', { required: true })!),
    assetCatalog,
  )
  const battleSprites = validateBattleSprites(
    targetFile(target, contentPath(manifest, 'battleSprites', { required: true })!),
    assetCatalog,
  )
  const equipIssue = validateEquipBattleSpriteReferences(items, actors, battleSprites)[0]
  if (equipIssue) throw new Error(`${equipIssue.where}: ${equipIssue.message}`)
  const enemiesPath = contentPath(manifest, 'enemies')
  const enemies = enemiesPath ? validateEnemies(targetFile(target, enemiesPath)) : []
  const enemyTeamsPath = contentPath(manifest, 'enemyTeams')
  if (enemyTeamsPath)
    validateEnemyTeamsV12(
      targetFile(target, enemyTeamsPath),
      new Set(enemies.map((enemy) => enemy.id)),
    )
  const battleFieldsPath = contentPath(manifest, 'battleFields')
  if (battleFieldsPath) validateBattleFields(targetFile(target, battleFieldsPath))
  validateTilesets(
    targetFile(target, contentPath(manifest, 'tilesets', { required: true })!),
    assetCatalog,
  )
  const sharedScriptsPath = contentPath(manifest, 'sharedScripts', { required: true })!
  checkSharedScriptLibraryV13(targetFile(target, sharedScriptsPath))
  const diagnosticsPath = contentPath(manifest, 'migrationDiagnostics')
  if (diagnosticsPath) validateMigrationDiagnostics(targetFile(target, diagnosticsPath))
  const stampsPath = contentPath(manifest, 'stamps')
  if (stampsPath) validateStampTemplates(targetFile(target, stampsPath))

  // Keep optional loader surfaces fail-loud: present paths must resolve to arrays even where the
  // v13 core intentionally treats their schema as historical pass-through data.
  for (const key of ['poisons', 'ambiences', 'shops'] as const) {
    const path = contentPath(manifest, key)
    if (path && !Array.isArray(targetFile(target, path)))
      throw new Error(`W9 v13 target ${path}: 期望数组`)
  }
}
