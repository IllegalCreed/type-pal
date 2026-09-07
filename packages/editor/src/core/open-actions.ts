/**
 * 项目动作(P4)—— 启动屏与编辑器内「项目」菜单共享:新建(克隆/空白)/ 打开 / 另存为。
 * 每个动作 = 拿本地目录句柄(原生选夹,须用户手势)→ 操作 → openLocalProject 装配 → Opened。
 * 用户取消选夹 → 返回 null(调用方静默忽略)。
 */
import type { CurrentManifest } from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  httpSource,
  readProjectSaveState,
  withStableProjectRead,
} from '@type-pal/reforge'
import {
  type AuthorDiskBaseline,
  authorBaselineDirectory,
  verifyOpenedAuthorBaseline,
  verifySourceAuthorBaseline,
} from './author-disk-baseline.js'
import { MissingAuthorSaveReceiptError, recoverAuthorSaveUnderLock } from './author-save-journal.js'
import { findAuthorSaveReceipt } from './author-save-store.js'
import { type CloneProgress, cloneFromPal } from './clone.js'
import { currentDirectoryPickerAvailability } from './file-system-access.js'
import { readDirectoryCopy } from './fsa-copy.js'
import {
  findWorkspaceRecordByHandle,
  saveWorkspaceHandle,
  saveWorkspaceHandleUnderLock,
  type WorkspaceHandleRecord,
  type WorkspaceRegistrationLock,
  withWorkspaceDiscoveryLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import { type OpenedProject, openLocalProject } from './open-local.js'
import { assetCopyInputs, observeProjectCopySource } from './project-copy-source.js'
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
  authorizedDirectory,
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
  recoveryWarning?: string
}

interface FinishOpenOptions {
  workspaceHint?: WorkspaceContext
  expectedIdentity?: WorkspaceHandleRecord
  forceSandbox?: boolean
  /** Reuse the caller's active write/identity lock after a create/copy operation. */
  registrationMutation?: AuthorizedWorkspaceMutation
  onRecovering?: () => void
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

/** 目录句柄 → 装配 Opened + 记入 IndexedDB(最近项目 / 重连)。 */
export async function finishOpen(
  dir: FileSystemDirectoryHandle,
  options: FinishOpenOptions = {},
): Promise<Opened> {
  if (options.expectedIdentity && !(await options.expectedIdentity.handle.isSameEntry(dir)))
    throw new Error('最近项目记录指向的目录句柄与本次打开目标不一致')
  const read = (lock?: WorkspaceRegistrationLock) => {
    const source = fsaSource(dir)
    return withStableProjectRead(source, () => readOpenedProject(dir, options, lock)).finally(() =>
      source.dispose?.(),
    )
  }
  if (options.registrationMutation) {
    if (!(await authorizedDirectory(options.registrationMutation).isSameEntry(dir)))
      throw new Error('打开目标与原保存操作目录不一致')
    return read()
  }
  return withWorkspaceDiscoveryLock(async () => {
    const receipt = await findAuthorSaveReceipt(dir)
    const binding = await findWorkspaceRecordByHandle(dir)
    const expected = options.expectedIdentity ?? options.workspaceHint
    if (
      receipt &&
      expected &&
      ['workspaceId', 'projectId', 'mode', 'source'].some(
        (key) =>
          receipt.identity[key as keyof typeof receipt.identity] !==
          expected[key as keyof typeof receipt.identity],
      )
    )
      throw new Error('恢复记录与本次打开请求的工作区身份不符')
    const workspaceId = receipt?.workspaceId ?? binding?.workspaceId
    if (!workspaceId) {
      // No record means this may be a copied pending directory or a cleared browser origin.
      if ((await readProjectSaveState(fsaSource(dir)))?.phase === 'pending')
        throw new MissingAuthorSaveReceiptError()
      return read() // unmarked first open: discovery excludes concurrent first saves
    }
    return withWorkspaceRegistrationLock(workspaceId, async (lock) => {
      const recovered = await recoverAuthorSaveUnderLock(dir, lock, {
        forceSandbox: options.forceSandbox,
        onRecovering: options.onRecovering,
      })
      const opened = await read(lock)
      return recovered?.cleanupWarning
        ? { ...opened, recoveryWarning: recovered.cleanupWarning }
        : opened
    })
  })
}

async function readOpenedProject(
  dir: FileSystemDirectoryHandle,
  options: FinishOpenOptions,
  lock?: WorkspaceRegistrationLock,
): Promise<Opened> {
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
    await verifyOpenedAuthorBaseline(opened.authorBaseline, dir)
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
        if (!finalPalProof) throw new Error('PAL 开发基线打开缺少载入前的可信快照证明')
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
      await registerAuthorizedWorkspaceMutation(options.registrationMutation, workspace, dir.name)
    else if (lock) await saveWorkspaceHandleUnderLock(lock, workspace, dir.name, dir)
    else await saveWorkspaceHandle(workspace, dir.name, dir)
    return { ...opened, dir, workspace }
  }

  // Creation/Save As already owns the discovery lock through its first-save mutation. Standalone
  // opens acquire it here; re-entering the non-reentrant Web Lock would deadlock.
  return resolveAndBind()
}

/** 打开已有本地项目。取消 → null。 */
export async function openExistingProject(
  options: Pick<FinishOpenOptions, 'forceSandbox' | 'onRecovering'> = {},
): Promise<Opened | null> {
  const dir = await pickDir()
  return dir ? finishOpen(dir, options) : null
}

/** 新建空白项目(选空夹 → 写骨架 → 打开)。取消 → null。 */
export async function newBlankProject(): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const files = await buildBlankProject(dir.name)
  const manifest = files['manifest.json'] as CurrentManifest
  const workspace = createLocalWorkspaceContext(manifest.id, 'blank-project')
  await preflightFirstSaveTarget(workspace, dir)
  const target = await authorizeFirstSaveTarget(workspace, dir)
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, workspace, dir.name)
    const saved = await writeProject(mutation, files)
    const opened = await finishOpen(dir, {
      workspaceHint: workspace,
      registrationMutation: mutation,
    })
    return saved.cleanupWarning ? { ...opened, recoveryWarning: saved.cleanupWarning } : opened
  })
}

/** 从 pal 克隆(选空夹 → 逐文件暂存并完整提交 → 打开)。取消 → null。onProgress 驱动进度条。 */
export async function newFromPal(
  seedBaseUrl: string,
  onProgress: CloneProgress,
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const seed = httpSource(seedBaseUrl)
  const manifest = await seed.readJson<CurrentManifest>('manifest.json')
  const workspace = createLocalWorkspaceContext(manifest.id, 'pal-development-snapshot-clone')
  await preflightFirstSaveTarget(workspace, dir)
  const target = await authorizeFirstSaveTarget(workspace, dir)
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, workspace, dir.name)
    const saved = await cloneFromPal(seed, mutation, onProgress)
    const opened = await finishOpen(dir, {
      workspaceHint: workspace,
      registrationMutation: mutation,
    })
    return saved.cleanupWarning ? { ...opened, recoveryWarning: saved.cleanupWarning } : opened
  })
}

export async function assertSaveAsTargetOutsideSource(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
): Promise<void> {
  const relative = await source.resolve(target)
  if (relative !== null)
    throw new Error('另存为目标不能是源项目目录本身或其子目录，请选择独立空文件夹')
}

/**
 * 另存为:先在原始点击手势内选目标夹，再异步组装当前项目文件集并写入。
 * File System Access 要求 transient user activation，不能先 await 序列化再弹 picker。
 */
export async function saveProjectAs(
  sourceWorkspace: WorkspaceContext,
  buildFiles: () => Promise<Record<string, unknown>>,
  srcDir?: FileSystemDirectoryHandle,
  removePaths: readonly string[] = [],
  sourceEvidence?: { source: FileSource; authorBaseline: AuthorDiskBaseline },
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const sourceDir =
    srcDir ?? (sourceEvidence ? authorBaselineDirectory(sourceEvidence.authorBaseline) : undefined)
  const workspace = createSaveAsWorkspaceContext(sourceWorkspace)
  await preflightFirstSaveTarget(workspace, dir)
  if (sourceDir) await assertSaveAsTargetOutsideSource(sourceDir, dir)
  const original = sourceDir ? fsaSource(sourceDir) : sourceEvidence?.source
  const observed = sourceEvidence && original ? await observeProjectCopySource(original) : undefined
  const verifyAuthor = async () => {
    if (!sourceEvidence || !original) throw new Error('另存为缺少源项目基线，请重新打开项目')
    if (sourceDir) await verifyOpenedAuthorBaseline(sourceEvidence.authorBaseline, sourceDir)
    else await verifySourceAuthorBaseline(sourceEvidence.authorBaseline, original)
  }
  if (sourceEvidence) await verifyAuthor()
  const files = structuredClone(await buildFiles())
  await preflightProjectWriteSet(files, removePaths)
  await verifyAuthor()
  if (!observed) throw new Error('另存为缺少源项目读取证据')
  const copied = sourceDir ? await readDirectoryCopy(sourceDir, observed.source) : undefined
  const target = await authorizeFirstSaveTarget(workspace, dir, {
    additionalVerify: sourceDir ? () => assertSaveAsTargetOutsideSource(sourceDir, dir) : undefined,
  })
  // Source bytes, current edits and removals form ONE staged intent. No source W lock is
  // nested inside the target lock: source revision/bytes/inventory are checked before sealing.
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, workspace, dir.name)
    const saved = await writeProject(mutation, files, {
      removePaths,
      copies: copied?.copies ?? assetCopyInputs(files, observed.source),
      directories: copied?.directories,
      verifySource: async () => {
        await verifyAuthor()
        await copied?.verify()
        await observed.verify()
      },
    })
    const opened = await finishOpen(dir, {
      workspaceHint: workspace,
      registrationMutation: mutation,
    })
    return saved.cleanupWarning ? { ...opened, recoveryWarning: saved.cleanupWarning } : opened
  })
}
