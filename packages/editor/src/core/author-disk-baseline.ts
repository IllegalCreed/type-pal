import { type AssetCatalogV1, validateProjectRelativePath } from '@type-pal/content'
import { type FileSource, fsaSource, type LoadedCurrentProjectCore } from '@type-pal/reforge'
import { binarySnapshotSignature } from './binary-signature.js'
import { isWorkspaceIdentityPath, type WorkspaceContext } from './workspace-context.js'

declare const authorBaselineBrand: unique symbol
/** Editor-session evidence, never an output diff, a persistent revision or a save-format field. */
export type AuthorDiskBaseline = Readonly<{ [authorBaselineBrand]: never }>
type Signature = string | null
interface BaselineState {
  projectId: string
  signatures: Map<string, Signature>
  resources: Map<string, string>
  catalogPath?: string
  dir?: FileSystemDirectoryHandle
  workspaceId?: string
  bytesRead: number
}
const baselines = new WeakMap<object, BaselineState>()

export class AuthorSaveConflictError extends Error {
  constructor(
    readonly path: string,
    afterWrite = false,
  ) {
    super(
      afterWrite
        ? `项目保存后的文件与本次写入不一致，当前修改仍保留，请核对文件：${path}`
        : `项目文件已在其他位置修改；本次未写入，当前修改仍保留：${path}`,
    )
    this.name = 'AuthorSaveConflictError'
  }
}

function stateOf(baseline: AuthorDiskBaseline): BaselineState {
  const state = baseline && baselines.get(baseline)
  if (!state) throw new Error('缺少可信的作者文件基线，拒绝保存，请重新打开项目')
  return state
}
function createBaseline(state: BaselineState): AuthorDiskBaseline {
  const baseline = Object.freeze({}) as AuthorDiskBaseline
  baselines.set(baseline, state)
  return baseline
}
function resourceSignatures(catalog: AssetCatalogV1): Map<string, string> {
  return new Map(
    Object.values(catalog.assets).map((asset) => [
      asset.path,
      `bin:${asset.bytes}:${asset.sha256}`,
    ]),
  )
}

/** Fresh target only; identity/empty-directory authorization remains the persistence policy's job. */
export function createEmptyAuthorDiskBaseline(projectId: string): AuthorDiskBaseline {
  return createBaseline({ projectId, signatures: new Map(), resources: new Map(), bytesRead: 0 })
}

/** Capture the exact bytes supplied to the loader, not a reserialization of its derived state. */
export function observeAuthorSource(original: FileSource) {
  const observed = new Map<string, string>()
  let capturing = true
  let bytesRead = 0
  const readBytes = async (path: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
    const bytes = await original.readBytes(path, signal)
    if (capturing && !isWorkspaceIdentityPath(path)) {
      const signature = await binarySnapshotSignature(bytes)
      const previous = observed.get(path)
      if (previous !== undefined && previous !== signature) throw new AuthorSaveConflictError(path)
      observed.set(path, signature)
      bytesRead += bytes.byteLength
    }
    return bytes
  }
  const source: FileSource = {
    readBytes,
    readText: async (path, signal) => new TextDecoder().decode(await readBytes(path, signal)),
    readJson: async <T>(path: string, signal?: AbortSignal) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path, signal))) as T,
    urlFor: (path) => original.urlFor(path),
    dispose: () => original.dispose?.(),
  }
  return {
    source,
    async finish(
      project: LoadedCurrentProjectCore,
      dir?: FileSystemDirectoryHandle,
    ): Promise<AuthorDiskBaseline> {
      // Canonical loader has already read the manifest, tables, catalog and scene index/bodies.
      // Maps remain unparsed/unhydrated: only their registered source bytes join the read evidence.
      for (const map of project.mapIndex.maps)
        if (!observed.has(map.path)) await readBytes(map.path)
      const state: BaselineState = {
        projectId: project.manifest.id,
        signatures: new Map(observed),
        resources: resourceSignatures(project.assetCatalog),
        catalogPath: project.manifest.assets.catalog,
        dir,
        bytesRead,
      }
      await verifySignatures(original, state.signatures)
      capturing = false
      return createBaseline(state)
    },
  }
}

export function authorBaselineSummary(baseline: AuthorDiskBaseline) {
  const state = stateOf(baseline)
  return { paths: [...state.signatures.keys()].sort(), bytesRead: state.bytesRead }
}

/** Read-only provenance also exists for sandbox inspection, which intentionally has no writable dir. */
export function authorBaselineDirectory(
  baseline: AuthorDiskBaseline,
): FileSystemDirectoryHandle | undefined {
  return stateOf(baseline).dir
}

async function readSignature(source: FileSource, path: string): Promise<Signature> {
  validateProjectRelativePath(path, '作者文件基线路径')
  try {
    return await binarySnapshotSignature(await source.readBytes(path))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null
    throw error
  }
}
async function verifySignatures(
  source: FileSource,
  signatures: ReadonlyMap<string, Signature>,
  afterWrite = false,
) {
  for (const [path, expected] of signatures) {
    if ((await readSignature(source, path)) !== expected)
      throw new AuthorSaveConflictError(path, afterWrite)
  }
}

/** Re-check after finishOpen's asynchronous identity proof, before handing out a writable session. */
export async function verifyOpenedAuthorBaseline(
  baseline: AuthorDiskBaseline,
  dir: FileSystemDirectoryHandle,
) {
  const state = stateOf(baseline)
  if (state.dir && state.dir !== dir && !(await state.dir.isSameEntry(dir)))
    throw new Error('作者文件基线与打开目录不一致')
  await verifySignatures(fsaSource(dir), state.signatures)
}

/** Copying an HTTP project must also retain the author's loaded revision, not adopt live JSON. */
export async function verifySourceAuthorBaseline(baseline: AuthorDiskBaseline, source: FileSource) {
  await verifySignatures(source, stateOf(baseline).signatures)
}

export async function bindAuthorBaseline(
  baseline: AuthorDiskBaseline,
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
): Promise<void> {
  const state = stateOf(baseline)
  if (
    state.projectId !== context.projectId ||
    (state.workspaceId && state.workspaceId !== context.workspaceId)
  )
    throw new Error('作者文件基线与当前项目/工作区不一致')
  if (state.dir && state.dir !== dir && !(await state.dir.isSameEntry(dir)))
    throw new Error('作者文件基线与保存目录不一致')
  state.dir = dir
  state.workspaceId = context.workspaceId
}

/** A transient expected post-state. Only verified own writes/removals may advance the session. */
export function authorDiskMutation(baseline: AuthorDiskBaseline, dir: FileSystemDirectoryHandle) {
  const state = stateOf(baseline)
  const expected = new Map(state.signatures)
  let resources = new Map(state.resources)
  let catalogPath = state.catalogPath
  const catalogs = new Map<string, AssetCatalogV1>()
  const catalogPaths = new Set(catalogPath ? [catalogPath] : [])
  const source = fsaSource(dir)
  let changed = false
  return {
    snapshot: () => new Map(expected),
    async plan(paths: readonly string[], nextCatalogPath?: string) {
      if (nextCatalogPath) catalogPaths.add(nextCatalogPath)
      const added = new Map<string, Signature>()
      for (const path of paths) {
        validateProjectRelativePath(path, '保存目标路径')
        if (!expected.has(path)) {
          const signature = resources.get(path) ?? null
          expected.set(path, signature)
          added.set(path, signature)
        }
      }
      // Existing author paths were checked at lock entry and will be checked again immediately
      // before the first mutation. Only newly planned destinations need this extra read.
      await verifySignatures(source, added, changed)
    },
    verify: () => verifySignatures(source, expected),
    async wrote(path: string, value: unknown) {
      // Match writeFile's exact on-disk encoding; no late reread may turn outside edits into evidence.
      const blob =
        value instanceof Blob
          ? value
          : new Blob([
              value instanceof ArrayBuffer
                ? value
                : typeof value === 'string'
                  ? value
                  : `${JSON.stringify(value, null, 2)}\n`,
            ])
      expected.set(path, await binarySnapshotSignature(await blob.arrayBuffer()))
      changed = true
      if (path === 'manifest.json') {
        const manifest = JSON.parse(await blob.text()) as { assets?: { catalog?: string } }
        catalogPath = manifest.assets?.catalog
      }
      // Catalog candidates are small JSON; binaries/maps are neither parsed nor retained.
      if (catalogPaths.has(path))
        catalogs.set(path, JSON.parse(await blob.text()) as AssetCatalogV1)
    },
    removed(path: string) {
      expected.set(path, null)
      changed = true
    },
    async finish() {
      await verifySignatures(source, expected, changed)
      if (catalogPath && catalogs.has(catalogPath))
        resources = resourceSignatures(catalogs.get(catalogPath)!)
      // Resource bytes are verified when this operation touches them, not rehashed on every later
      // JSON edit. Their canonical expected hashes stay in the catalog-derived resource map.
      state.signatures = new Map([...expected].filter(([path]) => !resources.has(path)))
      state.resources = resources
      state.catalogPath = catalogPath
    },
  }
}
export type AuthorDiskMutation = ReturnType<typeof authorDiskMutation>
