/**
 * 工程动作(P4)—— 启动屏与编辑器内「工程」菜单共享:新建(克隆/空白)/ 打开 / 另存为。
 * 每个动作 = 拿本地目录句柄(原生选夹,须用户手势)→ 操作 → openLocalProject 装配 → Opened。
 * 用户取消选夹 → 返回 null(调用方静默忽略)。
 */
import type { CurrentManifest } from '@type-pal/content'
import { httpSource } from '@type-pal/reforge'
import { cloneFromPal } from './clone.js'
import { currentDirectoryPickerAvailability } from './file-system-access.js'
import { copyDirRecursive } from './fsa-copy.js'
import {
  saveWorkspaceHandle,
  withWorkspaceDiscoveryLock,
  type WorkspaceHandleRecord,
} from './handle-store.js'
import { type OpenedProject, openLocalProject } from './open-local.js'
import { preflightProjectWriteSet, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  assertSamePalDevelopmentProof,
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  type WorkspaceContext,
} from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  assertPalDevelopmentDirectory,
  assertSameWorkspaceMetadataInspection,
  authorizeFirstSaveTarget,
  createSaveAsWorkspaceContext,
  inspectWorkspaceMetadata,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  resolveOpenedWorkspaceContext,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

export type Opened = OpenedProject & {
  /** Omitted for force-sandbox inspection: the source directory is never a writable binding. */
  dir?: FileSystemDirectoryHandle
  workspace: WorkspaceContext
}

interface FinishOpenOptions {
  workspaceHint?: WorkspaceContext
  expectedIdentity?: WorkspaceHandleRecord
  forceSandbox?: boolean
  /** Reuse the caller's active write/identity lock after a create/copy operation. */
  registrationMutation?: AuthorizedWorkspaceMutation
}

/** 弹原生选夹(readwrite);用户取消 → null。 */
export async function pickDir(): Promise<FileSystemDirectoryHandle | null> {
  const availability = currentDirectoryPickerAvailability()
  if (!availability.available) throw new Error(availability.message)
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/** 目录句柄 → 装配 Opened + 记入 IndexedDB(最近工程 / 重连)。 */
export async function finishOpen(
  dir: FileSystemDirectoryHandle,
  options: FinishOpenOptions = {},
): Promise<Opened> {
  if (options.expectedIdentity && !(await options.expectedIdentity.handle.isSameEntry(dir)))
    throw new Error('最近工程记录指向的目录句柄与本次打开目标不一致')
  // Metadata is inspected before canonical loading/registration:an invalid sidecar must never be
  // silently downgraded to an unrestricted local project or overwrite the evidence in IndexedDB.
  const metadata = await inspectWorkspaceMetadata(dir)
  const trustedPalSource =
    metadata.palDevelopment.kind === 'valid' ? httpSource('projects/pal') : undefined
  const palProofBefore = trustedPalSource
    ? await createPalDevelopmentWorkspaceContext(trustedPalSource)
    : undefined
  if (palProofBefore) await assertPalDevelopmentDirectory(palProofBefore, dir)
  const opened = await openLocalProject(dir)
  const metadataAfter = await inspectWorkspaceMetadata(dir)
  assertSameWorkspaceMetadataInspection(metadata, metadataAfter)
  const palProofAfter = trustedPalSource
    ? await createPalDevelopmentWorkspaceContext(trustedPalSource)
    : undefined
  if (palProofBefore && palProofAfter) {
    assertSamePalDevelopmentProof(palProofBefore, palProofAfter)
    await assertPalDevelopmentDirectory(palProofAfter, dir)
  }
  const resolveAndBind = async (): Promise<Opened> => {
    // The discovery lock must cover the final identity read, unmarked-handle lookup, identity
    // choice and registration. Otherwise two tabs can mint separate local workspaceIds for the
    // same physical directory before either recent record becomes visible to the other.
    const finalMetadata = await inspectWorkspaceMetadata(dir)
    assertSameWorkspaceMetadataInspection(metadataAfter, finalMetadata)
    const finalPalProof = trustedPalSource
      ? await createPalDevelopmentWorkspaceContext(trustedPalSource)
      : undefined
    if (palProofAfter && finalPalProof) {
      assertSamePalDevelopmentProof(palProofAfter, finalPalProof)
      await assertPalDevelopmentDirectory(finalPalProof, dir)
    }
    const workspace = await resolveOpenedWorkspaceContext(dir, opened.project.manifest.id, {
      metadata: finalMetadata,
      workspaceHint: options.workspaceHint,
      expectedIdentity: options.expectedIdentity,
      forceSandbox: options.forceSandbox,
      loadTrustedPalContext: async () => {
        if (!finalPalProof)
          throw new Error('PAL 开发基线打开缺少载入前的可信快照证明')
        return finalPalProof
      },
    })
    const mayBindForcedSandbox =
      options.forceSandbox &&
      finalMetadata.sandbox.kind === 'valid' &&
      workspace.mode === 'sandbox' &&
      workspace.workspaceId === finalMetadata.sandbox.value.workspaceId
    if (options.forceSandbox && !mayBindForcedSandbox) return { ...opened, workspace }
    if (options.registrationMutation)
      await registerAuthorizedWorkspaceMutation(
        options.registrationMutation,
        workspace,
        dir.name,
      )
    else await saveWorkspaceHandle(workspace, dir.name, dir)
    return { ...opened, dir, workspace }
  }

  // Creation/Save As already owns the discovery lock through its first-save mutation. Standalone
  // opens acquire it here; re-entering the non-reentrant Web Lock would deadlock.
  return options.registrationMutation
    ? resolveAndBind()
    : withWorkspaceDiscoveryLock(resolveAndBind)
}

/** 打开已有本地工程。取消 → null。 */
export async function openExistingProject(
  options: Pick<FinishOpenOptions, 'forceSandbox'> = {},
): Promise<Opened | null> {
  const dir = await pickDir()
  return dir ? finishOpen(dir, options) : null
}

/** 新建空白工程(选空夹 → 写骨架 → 打开)。取消 → null。 */
export async function newBlankProject(): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const files = await buildBlankProject(dir.name)
  const manifest = files['manifest.json'] as CurrentManifest
  const workspace = createLocalWorkspaceContext(manifest.id, 'blank-project')
  await preflightFirstSaveTarget(workspace, dir)
  const target = await authorizeFirstSaveTarget(workspace, dir)
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await writeProject(mutation, files)
    return finishOpen(dir, { workspaceHint: workspace, registrationMutation: mutation })
  })
}

/** 从 pal 克隆(选空夹 → 流式下载 207MB → 打开)。取消 → null。onProgress 驱动进度条。 */
export async function newFromPal(
  seedBaseUrl: string,
  onProgress: (done: number, total: number) => void,
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const seed = httpSource(seedBaseUrl)
  const manifest = await seed.readJson<CurrentManifest>('manifest.json')
  const workspace = createLocalWorkspaceContext(manifest.id, 'pal-development-snapshot-clone')
  await preflightFirstSaveTarget(workspace, dir)
  const target = await authorizeFirstSaveTarget(workspace, dir)
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await cloneFromPal(seed, mutation, onProgress)
    return finishOpen(dir, { workspaceHint: workspace, registrationMutation: mutation })
  })
}

export async function assertSaveAsTargetOutsideSource(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
): Promise<void> {
  const relative = await source.resolve(target)
  if (relative !== null)
    throw new Error('另存为目标不能是源工程目录本身或其子目录，请选择独立空文件夹')
}

/**
 * 另存为:先在原始点击手势内选目标夹，再异步组装当前工程文件集并写入。
 * File System Access 要求 transient user activation，不能先 await 序列化再弹 picker。
 */
export async function saveProjectAs(
  sourceWorkspace: WorkspaceContext,
  buildFiles: () => Promise<Record<string, unknown>>,
  srcDir?: FileSystemDirectoryHandle,
  removePaths: readonly string[] = [],
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const workspace = createSaveAsWorkspaceContext(sourceWorkspace)
  await preflightFirstSaveTarget(workspace, dir)
  if (srcDir) await assertSaveAsTargetOutsideSource(srcDir, dir)
  const files = await buildFiles()
  await preflightProjectWriteSet(files, removePaths)
  const target = await authorizeFirstSaveTarget(workspace, dir, {
    additionalVerify: srcDir
      ? () => assertSaveAsTargetOutsideSource(srcDir, dir)
      : undefined,
  })
  // A5 债修:目标经空目录门后先整树拷贝源目录(磁盘素材不在编辑器 state,不拷即丢 ——
  // 克隆工程 200MB assets 曾被另存为静默丢掉),再 writeProject 覆写内容文件(当前编辑赢)。
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    if (srcDir) await copyDirRecursive(srcDir, mutation)
    await writeProject(mutation, files, { removePaths })
    return finishOpen(dir, { workspaceHint: workspace, registrationMutation: mutation })
  })
}
