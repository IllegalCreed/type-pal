import type { FileSource } from '@type-pal/reforge'
import { useCallback, useRef, useState } from 'react'
import {
  type AuthorDiskBaseline,
  createEmptyAuthorDiskBaseline,
  verifySourceAuthorBaseline,
} from '../core/author-disk-baseline.js'
import { battleSimulatorRemovalPaths } from '../core/battle-simulator-library.js'
import { RenameProjectCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { exportProjectZip } from '../core/export-zip.js'
import { type Opened, openExistingProject, pickDir, saveProjectAs } from '../core/open-actions.js'
import type { EditorPlayIdentity } from '../core/play-url.js'
import { assetCopyInputs, observeProjectCopySource } from '../core/project-copy-source.js'
import {
  resumeOwnProjectSave,
  serializeProjectWithMapCopies,
  writeProject,
} from '../core/project-io.js'
import type {
  ProjectLeaveChoice,
  ProjectLeaveGuard,
  ProjectLeaveIntent,
  ProjectSaveOutcome,
} from '../core/project-leave-guard.js'
import type { ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from '../core/script-editor-projection.js'
import type { WorkspaceContext } from '../core/workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from '../core/workspace-persistence.js'
import type { ProjectSaveActivity } from './ProjectSaveDialog.js'

export interface EditorProjectSession {
  error: string
  activity: ProjectSaveActivity | null
  dirty: boolean
  hasDirectory: boolean
  playWorkspaceId: string | undefined
  playIdentity: EditorPlayIdentity
  getLocalDirectory(): FileSystemDirectoryHandle | null
  getAuthorBaseline(): AuthorDiskBaseline
  save(beforeLeaving?: boolean): Promise<ProjectSaveOutcome>
  saveAs(): Promise<void>
  requestLeave(intent: ProjectLeaveIntent): void
  continueLeave(choice: ProjectLeaveChoice): void
  rename(): void
  exportZip(): void
}

/** Owns the editor's directory binding, save recovery state and project IO lifecycle. */
export function useEditorProjectSession(input: {
  main: EditSession
  script: ScriptEditSession
  projectGuard: ProjectLeaveGuard
  projectSource: FileSource
  workspace: WorkspaceContext
  initialDirectory?: FileSystemDirectoryHandle
  initialWarning?: string
  authorBaseline: AuthorDiskBaseline
  forceSandbox?: boolean
  onOpened?(opened: Opened): void
  onBackToPicker?(): void
}): EditorProjectSession {
  const inputRef = useRef(input)
  inputRef.current = input
  const directoryRef = useRef<FileSystemDirectoryHandle | null>(input.initialDirectory ?? null)
  /** An interrupted first save is not yet a bound project; retain its directory for recovery only. */
  const saveAttemptDirectoryRef = useRef<FileSystemDirectoryHandle | null>(
    input.initialDirectory ?? null,
  )
  const snapshotRef = useRef<Map<string, string> | null>(null)
  const authorBaselineRef = useRef(input.authorBaseline)
  const firstSaveAuthorRef = useRef<AuthorDiskBaseline | undefined>(undefined)
  const [error, setError] = useState(input.initialWarning ?? '')
  const [activity, setActivity] = useState<ProjectSaveActivity | null>(null)

  const getLocalDirectory = useCallback(() => directoryRef.current, [])
  const getAuthorBaseline = useCallback(() => authorBaselineRef.current, [])

  const save = useCallback(async (beforeLeaving = false): Promise<ProjectSaveOutcome> => {
    const current = inputRef.current
    const { main, script, projectGuard, projectSource, workspace } = current
    const lease = projectGuard.begin('save', beforeLeaving)
    if (!lease) return 'cancelled'
    let outcome: ProjectSaveOutcome = 'cancelled'
    const updateActivity = (value: ProjectSaveActivity): void => {
      if (projectGuard.isCurrent(lease)) setActivity(value)
    }
    updateActivity({ phase: 'choosing-directory' })
    try {
      let directory = directoryRef.current
      let rememberDirectory = false
      let resumesInterruptedAttempt = false
      if (!directory) {
        if (
          workspace.mode === 'pal-development' &&
          !window.confirm(
            '当前是 PAL 开发基线模式。只有选择与本次启动快照一致的 projects/pal 目录才会获准写入；要继续吗？',
          )
        )
          return outcome
        directory = await pickDir()
        if (!directory || !projectGuard.isCurrent(lease)) return outcome
        const previousAttempt = saveAttemptDirectoryRef.current
        resumesInterruptedAttempt = previousAttempt
          ? await directory.isSameEntry(previousAttempt)
          : false
        if (!resumesInterruptedAttempt) {
          snapshotRef.current = null
          firstSaveAuthorRef.current =
            workspace.mode === 'pal-development'
              ? authorBaselineRef.current
              : createEmptyAuthorDiskBaseline(workspace.projectId)
        }
        saveAttemptDirectoryRef.current = directory
        rememberDirectory = true
      }
      const authorBaseline = rememberDirectory
        ? firstSaveAuthorRef.current!
        : authorBaselineRef.current
      setError('')
      updateActivity({ phase: 'preparing' })
      const recovered = await resumeOwnProjectSave(workspace, directory, authorBaseline, () =>
        updateActivity({ phase: 'recovering' }),
      )
      if (!projectGuard.isCurrent(lease)) return outcome
      if (recovered) {
        snapshotRef.current = recovered.snapshot
        authorBaselineRef.current = authorBaseline
        directoryRef.current = directory
        rememberDirectory = false
      }
      if (rememberDirectory)
        await preflightFirstSaveTarget(workspace, directory, { resumesInterruptedAttempt })
      const savedState = main.getState()
      const savedScriptState = script.getState()
      const savedScriptVersion = script.getVersion()
      const removePaths = [
        ...battleSimulatorRemovalPaths(savedState.battleSimulator),
        ...main.getDeletedScenePaths(),
        ...main.getDeletedMapPaths(),
        ...main.getDeletedAssetPaths(),
      ]
      setError('')
      updateActivity({ phase: 'preparing' })
      // Yield after the synchronous directory picker so the native modal can enter the top layer.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      const copySource = rememberDirectory
        ? await observeProjectCopySource(projectSource)
        : undefined
      if (copySource) await verifySourceAuthorBaseline(authorBaselineRef.current, projectSource)
      const files = await serializeEditorSnapshot(savedState, savedScriptState, projectSource)
      if (!projectGuard.isCurrent(lease)) return outcome
      let lastPercent = -1
      const recoverySnapshot = snapshotRef.current ?? new Map<string, string>()
      snapshotRef.current = recoverySnapshot
      const target = rememberDirectory
        ? await authorizeFirstSaveTarget(workspace, directory, {
            resumesInterruptedAttempt,
            authorBaseline,
          })
        : await authorizeBoundWorkspaceTarget(workspace, directory, authorBaseline)
      const result = await withAuthorizedWorkspaceMutation(target, async (mutation) => {
        await registerAuthorizedWorkspaceMutation(mutation, workspace, directory.name)
        return writeProject(mutation, files, {
          prevSnapshot: recoverySnapshot,
          removePaths,
          copies: copySource ? assetCopyInputs(files, copySource.source) : undefined,
          verifySource: copySource
            ? async () => {
                await verifySourceAuthorBaseline(authorBaselineRef.current, projectSource)
                await copySource.verify()
              }
            : undefined,
          onProgress: ({ completed, total }) => {
            const percent = total > 0 ? Math.floor((completed / total) * 100) : 0
            if (percent === lastPercent && completed < total) return
            lastPercent = percent
            updateActivity({ phase: 'writing', completed, total })
          },
        })
      })
      if (!projectGuard.isCurrent(lease)) return outcome
      snapshotRef.current = result.snapshot
      setError(result.cleanupWarning ?? '')
      if (main.getState() === savedState) main.markSaved()
      if (script.getVersion() === savedScriptVersion) script.markSaved()
      if (rememberDirectory) {
        authorBaselineRef.current = authorBaseline
        directoryRef.current = directory
        saveAttemptDirectoryRef.current = directory
      }
      outcome = 'committed'
      return outcome
    } catch (caught) {
      if (projectGuard.isCurrent(lease))
        setError(caught instanceof Error ? caught.message : String(caught))
      outcome = 'failed'
      return outcome
    } finally {
      if (projectGuard.isCurrent(lease)) setActivity(null)
      projectGuard.finish(lease, outcome)
    }
  }, [])

  const runOpen = useCallback(async (): Promise<void> => {
    const current = inputRef.current
    const { projectGuard } = current
    const lease = projectGuard.begin('open')
    if (!lease) return
    setActivity({ phase: 'choosing-directory' })
    setError('')
    try {
      const opened = await openExistingProject({
        forceSandbox: current.forceSandbox,
        onRecovering: () => {
          if (!projectGuard.isCurrent(lease)) return
          projectGuard.recovering(lease)
          setActivity({ phase: 'recovering' })
        },
      })
      if (!opened || !projectGuard.isCurrent(lease)) return
      if (projectGuard.canReplace(lease)) current.onOpened?.(opened)
      else setError('打开期间当前项目又有修改，已保留当前编辑内容。请重新打开。')
    } catch (caught) {
      if (projectGuard.isCurrent(lease))
        setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (projectGuard.isCurrent(lease)) setActivity(null)
      projectGuard.finish(lease)
    }
  }, [])

  const performLeave = useCallback(
    (intent: ProjectLeaveIntent): void => {
      if (intent === 'open') {
        // Keep the native picker in the original user gesture call stack.
        void runOpen()
        return
      }
      const current = inputRef.current
      const lease = current.projectGuard.begin('new')
      if (!lease) return
      try {
        if (current.projectGuard.canReplace(lease)) current.onBackToPicker?.()
      } finally {
        current.projectGuard.finish(lease)
      }
    },
    [runOpen],
  )

  const requestLeave = useCallback(
    (intent: ProjectLeaveIntent): void => {
      if (inputRef.current.projectGuard.request(intent)) performLeave(intent)
    },
    [performLeave],
  )
  const continueLeave = useCallback(
    (choice: ProjectLeaveChoice): void => {
      const intent = inputRef.current.projectGuard.confirm(choice)
      if (intent) performLeave(intent)
    },
    [performLeave],
  )

  const saveAs = useCallback(async (): Promise<void> => {
    const current = inputRef.current
    const { main, script, projectGuard, projectSource, workspace } = current
    const lease = projectGuard.begin('save-as')
    if (!lease) return
    setActivity({ phase: 'saving-as' })
    try {
      const savedState = main.getState()
      const savedScriptState = script.getState()
      const removePaths = [
        ...battleSimulatorRemovalPaths(savedState.battleSimulator),
        ...main.getDeletedScenePaths(),
        ...main.getDeletedMapPaths(),
        ...main.getDeletedAssetPaths(),
      ]
      const sourceDirectory = directoryRef.current ?? undefined
      const opened = await saveProjectAs(
        workspace,
        () => serializeEditorSnapshot(savedState, savedScriptState, projectSource),
        sourceDirectory,
        removePaths,
        { source: projectSource, authorBaseline: authorBaselineRef.current },
      )
      if (!opened || !projectGuard.isCurrent(lease)) return
      if (projectGuard.canReplace(lease)) current.onOpened?.(opened)
      else setError('副本已保存；当前项目又有新修改，仍未保存，已保留在当前页面。')
    } catch (caught) {
      if (projectGuard.isCurrent(lease))
        setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (projectGuard.isCurrent(lease)) setActivity(null)
      projectGuard.finish(lease)
    }
  }, [])

  const rename = useCallback((): void => {
    const { main } = inputRef.current
    const currentName = main.getState().manifest.name
    const next = window.prompt('项目名称（文件夹与 ID 不变）：', currentName)?.trim()
    if (next && next !== currentName) main.dispatch(new RenameProjectCommand(next))
  }, [])

  const exportZip = useCallback((): void => {
    const current = inputRef.current
    const directory = directoryRef.current
    if (!directory || current.projectGuard.blocked()) return
    if (
      (current.main.isDirty() || current.script.isDirty()) &&
      !window.confirm('有未保存改动，导出只读取磁盘内容。仍要导出吗？（建议先保存）')
    )
      return
    const lease = current.projectGuard.begin('export')
    if (!lease) return
    setError('')
    void exportProjectZip(directory, current.main.getState().manifest.id)
      .catch((caught: unknown) => {
        if (current.projectGuard.isCurrent(lease))
          setError(caught instanceof Error ? caught.message : String(caught))
      })
      .finally(() => current.projectGuard.finish(lease))
  }, [])

  const hasDirectory = directoryRef.current !== null
  const manifestId = input.main.getState().manifest.id
  return {
    error,
    activity,
    dirty: input.main.isDirty() || input.script.isDirty(),
    hasDirectory,
    playWorkspaceId: hasDirectory ? input.workspace.workspaceId : undefined,
    playIdentity: {
      projectId: manifestId,
      workspaceId: input.workspace.workspaceId,
      source: hasDirectory ? 'local' : 'http',
    },
    getLocalDirectory,
    getAuthorBaseline,
    save,
    saveAs,
    requestLeave,
    continueLeave,
    rename,
    exportZip,
  }
}

function serializeEditorSnapshot(
  shellState: ReturnType<EditSession['getState']>,
  scriptState: ScriptEditorState | undefined,
  source: FileSource,
): Promise<Record<string, unknown>> {
  if (!scriptState) throw new Error('current 作者态缺失，拒绝序列化交互投影')
  return serializeProjectWithMapCopies(
    mergeEditorProjectionWithCurrentAuthorState(scriptState, shellState),
    source,
  )
}
