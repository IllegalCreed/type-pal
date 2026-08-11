import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type LegacyManifestV12,
  canonicalLegacyBindingV4,
  canonicalScriptTransitionJson,
  type LegacyManifestV4,
  type LegacyManifestV9,
  type ProjectMigrationSidecarV1,
  type ProjectScriptV4V5ResolutionPlan,
  ProjectScriptV4V5UpgradeError,
  projectLocalScriptV4ToV5,
  SCRIPT_V4_V5_SIDECAR_PATH,
  SCRIPT_V4_V5_TRANSITION_ID,
  upgradeEmbeddedBattleChoreographyV9ToV10,
  upgradeEnemiesV9ToV10,
  upgradeItemsV7ToV8,
  upgradeItemsV8ToV9,
  upgradeManifestV9ToV10,
  upgradeManifestV10ToV11,
  upgradeManifestV11ToV12,
  validateItemsV5,
  validateProjectMigrationSidecarV1,
  validateProjectRelativePath,
  validateScenesV5,
} from '@type-pal/content'
import {
  type FileSource,
  loadAllScenes,
  loadAllScenesV5,
  loadAllScriptChunks,
  loadProjectFrom,
  loadProjectV5From,
} from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'

const JOURNAL_PATH = '.type-pal/journals/script-v4-v5.json'
const STAGING_ROOT = '.type-pal/migration-staging'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export interface LocalProjectV4V5MigrationPreview {
  projectId: string
  inputDigest: string
  scenes: number
  items: number
  sharedScripts: number
  pageAllocations: number
  stageAllocations: number
  legacyEntityAliases: number
  legacyCursorAliases: number
  behaviorChangeSelections: number
}

export class LocalProjectV4V5PreviewRequiredError extends Error {
  constructor(readonly preview: LocalProjectV4V5MigrationPreview) {
    super('contentVersion 4 -> 5 迁移预检已通过；确认预览后才会启动本地事务')
    this.name = 'LocalProjectV4V5PreviewRequiredError'
  }
}

export interface UpgradeLocalProjectV4ScriptV5Options {
  resolutionPlan?: ProjectScriptV4V5ResolutionPlan
  confirmInputDigest?: string
}

interface LocalProjectMigrationWriteV1 {
  op: 'write'
  target: string
  oldSha256?: string
  stagedPath: string
  newSha256: string
}

interface LocalProjectMigrationDeleteV1 {
  op: 'delete'
  target: string
  oldSha256: string
}

type LocalProjectMigrationEntryV1 = LocalProjectMigrationWriteV1 | LocalProjectMigrationDeleteV1

interface LocalProjectMigrationJournalV1 {
  version: 1
  transitionId: typeof SCRIPT_V4_V5_TRANSITION_ID
  projectId: string
  txid: string
  manifestPrecondition: string
  entries: LocalProjectMigrationEntryV1[]
}

function jsonBytes(value: unknown): Uint8Array {
  return textEncoder.encode(`${JSON.stringify(value, null, 2)}\n`)
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

async function fileHandle(
  root: FileSystemDirectoryHandle,
  rel: string,
  create = false,
): Promise<FileSystemFileHandle> {
  const parts = rel.split('/')
  const name = parts.pop()
  if (!name) throw new Error(`空文件路径：${rel}`)
  let directory = root
  for (const part of parts)
    directory = await directory.getDirectoryHandle(part, create ? { create: true } : undefined)
  return directory.getFileHandle(name, create ? { create: true } : undefined)
}

async function readBytesIfPresent(
  root: FileSystemDirectoryHandle,
  rel: string,
): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await (await (await fileHandle(root, rel)).getFile()).arrayBuffer())
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

async function writeBytes(
  root: FileSystemDirectoryHandle,
  rel: string,
  bytes: Uint8Array,
): Promise<void> {
  const handle = await fileHandle(root, rel, true)
  const writable = await handle.createWritable()
  await writable.write(new Blob([Uint8Array.from(bytes)]))
  await writable.close()
}

async function removeFileIfPresent(root: FileSystemDirectoryHandle, rel: string): Promise<void> {
  const parts = rel.split('/')
  const name = parts.pop()
  if (!name) throw new Error(`空文件路径：${rel}`)
  let directory = root
  try {
    for (const part of parts) directory = await directory.getDirectoryHandle(part)
    await directory.removeEntry(name)
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  return sha256Hex(bytes)
}

async function digestInventory(source: FileSource, paths: readonly string[]): Promise<string> {
  const inventory: Array<{ path: string; sha256: string }> = []
  for (const path of [...new Set(paths)].sort())
    inventory.push({ path, sha256: await digest(new Uint8Array(await source.readBytes(path))) })
  return digest(textEncoder.encode(canonicalScriptTransitionJson(inventory)))
}

async function targetClosures(
  cursors: ProjectMigrationSidecarV1['legacyCursors'],
  bindings: ProjectMigrationSidecarV1['legacyBindings'],
): Promise<ProjectMigrationSidecarV1['targetClosures']> {
  const referenced = new Map<
    string,
    {
      target: ProjectMigrationSidecarV1['legacyCursors'][number] extends infer _Alias
        ? import('@type-pal/content').CanonicalScriptOwnerV5
        : never
      cursors: Set<string>
    }
  >()
  for (const alias of cursors) {
    const targets = alias.mode === 'single' ? [alias.target] : alias.targets
    for (const entry of targets) {
      const key = canonicalScriptTransitionJson(entry.target)
      const record = referenced.get(key) ?? {
        target: structuredClone(entry.target),
        cursors: new Set<string>(),
      }
      for (const index of entry.indices)
        record.cursors.add(canonicalScriptTransitionJson(index.cursor))
      referenced.set(key, record)
    }
  }
  for (const alias of bindings) {
    const key = canonicalScriptTransitionJson(alias.target)
    referenced.set(
      key,
      referenced.get(key) ?? {
        target: structuredClone(alias.target),
        cursors: new Set<string>(),
      },
    )
  }
  const result: ProjectMigrationSidecarV1['targetClosures'] = []
  for (const [key, record] of [...referenced].sort(([left], [right]) => left.localeCompare(right)))
    result.push({
      target: record.target,
      identityDigest: await digest(
        textEncoder.encode(
          canonicalScriptTransitionJson({
            target: JSON.parse(key) as unknown,
            referenced: [...record.cursors].sort(),
          }),
        ),
      ),
    })
  return result
}

function scriptDirectory(manifest: LegacyManifestV4): string | undefined {
  const path = manifest.content.scripts
  if (!path) return undefined
  return path.endsWith('/') ? path : `${path}/`
}

function sceneDirectory(manifest: LegacyManifestV4): string {
  const path = manifest.content.scenes ?? 'content/scenes/'
  return path.endsWith('/') ? path : `${path}/`
}

function overlaySource(base: FileSource, overlay: ReadonlyMap<string, Uint8Array>): FileSource {
  const source: FileSource = {
    async readText(path, signal) {
      if (signal?.aborted) throw new DOMException('file read aborted', 'AbortError')
      const bytes = overlay.get(path)
      return bytes ? textDecoder.decode(bytes) : base.readText(path, signal)
    },
    async readJson<T>(path: string, signal?: AbortSignal) {
      return JSON.parse(await source.readText(path, signal)) as T
    },
    async readBytes(path, signal) {
      if (signal?.aborted) throw new DOMException('file read aborted', 'AbortError')
      const bytes = overlay.get(path)
      return bytes ? Uint8Array.from(bytes).buffer : base.readBytes(path, signal)
    },
    urlFor: (path) => base.urlFor(path),
    legacy: base.legacy,
  }
  return source
}

function assertJournal(value: unknown): LocalProjectMigrationJournalV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('script-v4-v5 本地 journal 不是对象')
  const journal = value as Partial<LocalProjectMigrationJournalV1>
  if (
    journal.version !== 1 ||
    journal.transitionId !== SCRIPT_V4_V5_TRANSITION_ID ||
    typeof journal.projectId !== 'string' ||
    typeof journal.txid !== 'string' ||
    !/^[a-f0-9]{24}$/.test(journal.txid) ||
    !/^[a-f0-9]{64}$/.test(String(journal.manifestPrecondition)) ||
    !Array.isArray(journal.entries)
  )
    throw new Error('script-v4-v5 本地 journal 头部无效')
  for (const [index, entry] of journal.entries.entries()) {
    if (!entry || typeof entry !== 'object')
      throw new Error(`script-v4-v5 journal.entries[${index}] 无效`)
    if (entry.op === 'write') {
      validateProjectRelativePath(entry.target, `script-v4-v5 journal.entries[${index}].target`)
      validateProjectRelativePath(
        entry.stagedPath,
        `script-v4-v5 journal.entries[${index}].stagedPath`,
      )
      if (
        typeof entry.target !== 'string' ||
        typeof entry.stagedPath !== 'string' ||
        !/^[a-f0-9]{64}$/.test(entry.newSha256) ||
        (entry.oldSha256 !== undefined && !/^[a-f0-9]{64}$/.test(entry.oldSha256))
      )
        throw new Error(`script-v4-v5 journal.entries[${index}] write 无效`)
      if (!entry.stagedPath.startsWith(`${STAGING_ROOT}/${journal.txid}/`))
        throw new Error(`script-v4-v5 journal.entries[${index}] stagedPath 越权`)
    } else if (
      entry.op !== 'delete' ||
      typeof entry.target !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.oldSha256)
    )
      throw new Error(`script-v4-v5 journal.entries[${index}] delete 无效`)
    else validateProjectRelativePath(entry.target, `script-v4-v5 journal.entries[${index}].target`)
  }
  const manifests = journal.entries.filter((entry) => entry.target === 'manifest.json')
  if (
    manifests.length !== 1 ||
    manifests[0]?.op !== 'write' ||
    manifests[0].oldSha256 !== journal.manifestPrecondition
  )
    throw new Error('script-v4-v5 journal manifest precondition 无效')
  return journal as LocalProjectMigrationJournalV1
}

async function applyJournal(
  dir: FileSystemDirectoryHandle,
  journal: LocalProjectMigrationJournalV1,
): Promise<void> {
  const manifest = journal.entries.find((entry) => entry.target === 'manifest.json')
  if (!manifest || manifest.op !== 'write')
    throw new Error('script-v4-v5 journal 缺 manifest 最终 write')
  const ordered = [...journal.entries.filter((entry) => entry.target !== 'manifest.json'), manifest]
  for (const entry of ordered) {
    const current = await readBytesIfPresent(dir, entry.target)
    if (entry.op === 'delete') {
      if (!current) continue
      if ((await digest(current)) !== entry.oldSha256)
        throw new Error(`${entry.target}: 旧清理源已修改，保留 journal 并拒绝继续`)
      await removeFileIfPresent(dir, entry.target)
      continue
    }
    const staged = await readBytesIfPresent(dir, entry.stagedPath)
    if (!staged || (await digest(staged)) !== entry.newSha256)
      throw new Error(`${entry.stagedPath}: staged bytes 缺失或摘要不符，保留 journal`)
    if (current && (await digest(current)) === entry.newSha256) continue
    if (entry.oldSha256 === undefined) {
      if (current) throw new Error(`${entry.target}: 预期不存在但已经出现，保留 journal`)
    } else if (!current || (await digest(current)) !== entry.oldSha256)
      throw new Error(`${entry.target}: 旧摘要不符，保留 journal`)
    await writeBytes(dir, entry.target, staged)
  }
  for (const entry of journal.entries)
    if (entry.op === 'write') await removeFileIfPresent(dir, entry.stagedPath)
  await removeFileIfPresent(dir, JOURNAL_PATH)
}

/** open-local 的第一步；即使 manifest 已发布为 v5，也必须先把既有事务前滚完成。 */
export async function recoverLocalProjectV4V5Migration(
  dir: FileSystemDirectoryHandle,
): Promise<boolean> {
  const bytes = await readBytesIfPresent(dir, JOURNAL_PATH)
  if (!bytes) return false
  let value: unknown
  try {
    value = JSON.parse(textDecoder.decode(bytes))
  } catch {
    throw new Error('script-v4-v5 本地 journal JSON 损坏，拒绝猜测恢复')
  }
  const journal = assertJournal(value)
  const manifestBytes = await readBytesIfPresent(dir, 'manifest.json')
  if (!manifestBytes) throw new Error('script-v4-v5 恢复时 manifest 缺失')
  const manifest = JSON.parse(textDecoder.decode(manifestBytes)) as { id?: unknown }
  if (manifest.id !== journal.projectId)
    throw new Error('script-v4-v5 journal 与当前工程 id 不匹配')
  await applyJournal(dir, journal)
  return true
}

async function buildJournal(args: {
  dir: FileSystemDirectoryHandle
  projectId: string
  sourceAuditDigest: string
  writes: ReadonlyMap<string, Uint8Array>
  deletes: readonly string[]
}): Promise<LocalProjectMigrationJournalV1> {
  const txid = args.sourceAuditDigest.slice(0, 24)
  const entries: LocalProjectMigrationEntryV1[] = []
  for (const [target, bytes] of [...args.writes].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const old = await readBytesIfPresent(args.dir, target)
    entries.push({
      op: 'write',
      target,
      ...(old ? { oldSha256: await digest(old) } : {}),
      stagedPath: `${STAGING_ROOT}/${txid}/${target}`,
      newSha256: await digest(bytes),
    })
  }
  for (const target of [...new Set(args.deletes)].sort()) {
    if (args.writes.has(target)) throw new Error(`script-v4-v5 同时写删 ${target}`)
    const old = await readBytesIfPresent(args.dir, target)
    if (!old) continue
    entries.push({ op: 'delete', target, oldSha256: await digest(old) })
  }
  const manifestIndex = entries.findIndex((entry) => entry.target === 'manifest.json')
  if (manifestIndex < 0) throw new Error('script-v4-v5 迁移计划缺 manifest')
  return {
    version: 1,
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    projectId: args.projectId,
    txid,
    manifestPrecondition:
      entries[manifestIndex]!.op === 'write' && entries[manifestIndex]!.oldSha256
        ? entries[manifestIndex]!.oldSha256
        : args.sourceAuditDigest,
    entries,
  }
}

/**
 * contentVersion 4 本地工程的唯一升级入口。纯投影与 v5 overlay loader 全绿后才创建
 * staging/journal；随后幂等前滚，manifest 永远最后提交。
 */
export async function upgradeLocalProjectV4ScriptV5(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
  options: UpgradeLocalProjectV4ScriptV5Options = {},
): Promise<boolean> {
  if (
    !rawManifest ||
    typeof rawManifest !== 'object' ||
    (rawManifest as { contentVersion?: unknown }).contentVersion !== 4
  )
    return false
  const manifest = rawManifest as LegacyManifestV4
  if (manifest.migrations && Object.keys(manifest.migrations).length)
    throw new Error('contentVersion 4 manifest 不得预先声明 v5 migration registry')
  const enemyUpgradeOverlay = new Map<string, Uint8Array>()
  if (manifest.content.enemies) {
    const upgradedEnemies = upgradeEnemiesV9ToV10(
      await source.readJson<unknown>(manifest.content.enemies),
    )
    enemyUpgradeOverlay.set(manifest.content.enemies, jsonBytes(upgradedEnemies))
  }
  const project = await loadProjectFrom(
    enemyUpgradeOverlay.size ? overlaySource(source, enemyUpgradeOverlay) : source,
  )
  const [scenes, chunks] = await Promise.all([loadAllScenes(project), loadAllScriptChunks(project)])
  const sceneDir = sceneDirectory(manifest)
  const scriptDir = scriptDirectory(manifest)
  const itemsPath = manifest.content.items
  if (!itemsPath) throw new Error(`工程 "${manifest.id}": manifest 缺 items 路径`)
  const sourcePaths = [
    'manifest.json',
    itemsPath,
    ...(manifest.content.enemies ? [manifest.content.enemies] : []),
    `${sceneDir}index.json`,
    ...project.sceneIds.map((id) => `${sceneDir}${id}.json`),
    ...(scriptDir
      ? [
          `${scriptDir}index.json`,
          ...Object.values(project.scriptIndex?.chunks ?? {}).map(
            (chunk) => `${scriptDir}${chunk.path}`,
          ),
        ]
      : []),
  ]
  const sourceAuditDigest = await digestInventory(source, sourcePaths)
  if (options.resolutionPlan && options.resolutionPlan.inputDigest !== sourceAuditDigest)
    throw new Error(
      `contentVersion 4 -> 5 迁移报告已作废：输入摘要从 ${options.resolutionPlan.inputDigest} 变为 ${sourceAuditDigest}，请重新预检`,
    )
  let projection: ReturnType<typeof projectLocalScriptV4ToV5>
  try {
    projection = projectLocalScriptV4ToV5({
      projectId: manifest.id,
      scenes,
      items: Object.values(project.items),
      scriptIndex: project.scriptIndex,
      scriptChunks: chunks,
      resolutions: options.resolutionPlan?.resolutions,
    })
  } catch (error) {
    if (error instanceof ProjectScriptV4V5UpgradeError) {
      error.report.inputDigest = sourceAuditDigest
      error.message = `${error.message}；inputDigest=${sourceAuditDigest}`
    }
    throw error
  }
  validateScenesV5(projection.scenes)
  validateItemsV5(projection.items)
  if (options.resolutionPlan && options.confirmInputDigest !== sourceAuditDigest) {
    throw new LocalProjectV4V5PreviewRequiredError({
      projectId: manifest.id,
      inputDigest: sourceAuditDigest,
      scenes: projection.scenes.length,
      items: projection.items.length,
      sharedScripts: Object.keys(projection.sharedScripts).length,
      pageAllocations: projection.localAllocations.filter(
        (allocation) => allocation.kind === 'page',
      ).length,
      stageAllocations: projection.localAllocations.filter(
        (allocation) => allocation.kind === 'stage',
      ).length,
      legacyEntityAliases: projection.legacyEntities.length,
      legacyCursorAliases: projection.legacyCursors.length,
      behaviorChangeSelections: options.resolutionPlan.resolutions.filter(
        (resolution) =>
          (resolution.kind === 'resolve-legacy-entity-alias' ||
            resolution.kind === 'resolve-legacy-cursor-alias') &&
          resolution.mode === 'single',
      ).length,
    })
  }
  const transformDigest = await digest(
    textEncoder.encode(
      canonicalScriptTransitionJson({
        scenes: projection.scenes,
        items: projection.items,
        sharedScripts: projection.sharedScripts,
      }),
    ),
  )
  const legacyBindings: ProjectMigrationSidecarV1['legacyBindings'] = []
  const legacyBindingTargets = new Map<string, string>()
  for (const source of projection.legacyBindingSources) {
    const bindingDigest = await digest(
      textEncoder.encode(JSON.stringify(canonicalLegacyBindingV4(source.binding))),
    )
    const key = `${source.sceneId}\u0000${source.hook}\u0000${bindingDigest}`
    const targetKey = canonicalScriptTransitionJson(source.target)
    const previousTarget = legacyBindingTargets.get(key)
    if (previousTarget !== undefined) {
      if (previousTarget !== targetKey)
        throw new Error(
          `${source.sceneId}.${source.hook}: 同一旧 binding 被分配到多个 HookId，拒绝生成歧义 sidecar`,
        )
      continue
    }
    legacyBindingTargets.set(key, targetKey)
    legacyBindings.push({
      from: {
        kind: 'scene-hook-binding',
        sceneId: source.sceneId,
        hook: source.hook,
        digest: bindingDigest,
      },
      target: structuredClone(source.target),
    })
  }
  const sidecarWithoutDigest: Omit<ProjectMigrationSidecarV1, 'digest'> = {
    version: 1,
    projectId: manifest.id,
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    fromContentVersion: 4,
    toContentVersion: 5,
    sourceAuditDigest,
    provenance: { kind: 'project-local', transformDigest },
    legacyBindings,
    legacyCursors: projection.legacyCursors,
    legacyEntities: projection.legacyEntities,
    lineagePlans: projection.lineagePlans,
    localAllocations: projection.localAllocations,
    targetClosures: await targetClosures(projection.legacyCursors, legacyBindings),
  }
  const sidecar: ProjectMigrationSidecarV1 = {
    ...sidecarWithoutDigest,
    digest: await digest(textEncoder.encode(canonicalScriptTransitionJson(sidecarWithoutDigest))),
  }
  validateProjectMigrationSidecarV1(sidecar, manifest.id)
  const sidecarBytes = jsonBytes(sidecar)
  const { scripts: _legacyScripts, ...content } = manifest.content
  const upgradedItems = upgradeEmbeddedBattleChoreographyV9ToV10(
    upgradeItemsV8ToV9(upgradeItemsV7ToV8(projection.items)),
    'items',
  )
  const upgradedSharedScripts = upgradeEmbeddedBattleChoreographyV9ToV10(
    projection.sharedScripts,
    'sharedScripts',
  )
  const upgradedScenes = projection.scenes.map((scene) =>
    upgradeEmbeddedBattleChoreographyV9ToV10(scene, `scenes.${scene.id}`),
  )
  const manifestV9: LegacyManifestV9 = {
    ...cloneManifest(manifest),
    contentVersion: 9,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
    content: { ...content, sharedScripts: 'content/shared-scripts.json' },
    migrations: {
      [SCRIPT_V4_V5_TRANSITION_ID]: {
        version: 1,
        fromContentVersion: 4,
        toContentVersion: 5,
        path: SCRIPT_V4_V5_SIDECAR_PATH,
        sha256: await digest(sidecarBytes),
      },
    },
  }
  const manifestCurrent: LegacyManifestV12 = upgradeManifestV11ToV12(
    upgradeManifestV10ToV11(upgradeManifestV9ToV10(manifestV9)),
  )
  const writes = new Map<string, Uint8Array>([
    ['content/shared-scripts.json', jsonBytes(upgradedSharedScripts)],
    [itemsPath, jsonBytes(upgradedItems)],
    [SCRIPT_V4_V5_SIDECAR_PATH, sidecarBytes],
    ['manifest.json', jsonBytes(manifestCurrent)],
  ])
  if (manifest.content.enemies)
    writes.set(
      manifest.content.enemies,
      jsonBytes(upgradeEnemiesV9ToV10(Object.values(project.enemiesById))),
    )
  for (const scene of upgradedScenes) writes.set(`${sceneDir}${scene.id}.json`, jsonBytes(scene))
  const deletes = scriptDir
    ? [
        `${scriptDir}index.json`,
        ...Object.values(project.scriptIndex?.chunks ?? {}).map(
          (chunk) => `${scriptDir}${chunk.path}`,
        ),
      ]
    : []

  const preflight = overlaySource(source, writes)
  const validated = await loadProjectV5From(preflight)
  await loadAllScenesV5(validated)
  validated.source.dispose?.()

  const journal = await buildJournal({
    dir,
    projectId: manifest.id,
    sourceAuditDigest,
    writes,
    deletes,
  })
  for (const entry of journal.entries)
    if (entry.op === 'write') {
      const bytes = writes.get(entry.target)
      if (!bytes) throw new Error(`script-v4-v5 staging 缺目标 bytes：${entry.target}`)
      await writeBytes(dir, entry.stagedPath, bytes)
      const staged = await readBytesIfPresent(dir, entry.stagedPath)
      if (!staged || (await digest(staged)) !== entry.newSha256)
        throw new Error(`${entry.stagedPath}: staging 读回摘要不符`)
    }
  await writeBytes(dir, JOURNAL_PATH, jsonBytes(journal))
  await applyJournal(dir, journal)
  return true
}

function cloneManifest(manifest: LegacyManifestV4): Omit<LegacyManifestV9, 'contentVersion'> {
  return JSON.parse(JSON.stringify(manifest)) as Omit<LegacyManifestV9, 'contentVersion'>
}
