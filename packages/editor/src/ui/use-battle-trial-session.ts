import { type BattleTrialConfig, type FileSource, fsaSource } from '@type-pal/reforge'
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import {
  type AuthorDiskBaseline,
  verifySourceAuthorBaseline,
} from '../core/author-disk-baseline.js'
import type { BattleSimulatorDraft, BattleTrialSubject } from '../core/battle-simulator-state.js'
import { launchBattleTrial } from '../core/battle-trial-launch.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorPlayIdentity } from '../core/play-url.js'
import { resolvePlayWorkspaceRecord } from '../core/play-workspace.js'
import type { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import type { ScriptEditSession } from '../core/script-editor.js'

export interface BattleTrialSession {
  draft: BattleSimulatorDraft | undefined
  setDraft: Dispatch<SetStateAction<BattleSimulatorDraft | undefined>>
  subject: BattleTrialSubject | undefined
  setSubject: Dispatch<SetStateAction<BattleTrialSubject | undefined>>
  discardPending: boolean
  requestDiscard(continuation: () => void): void
  cancelDiscard(): void
  confirmDiscard(): void
  start(config: BattleTrialConfig): Promise<void>
}

/** Owns temporary trial state, popup handles, unload protection and launch revalidation. */
export function useBattleTrialSession(input: {
  main: EditSession
  script: ScriptEditSession
  projectGuard: ProjectLeaveGuard
  projectSource: FileSource
  playIdentity: EditorPlayIdentity
  getLocalDirectory(): FileSystemDirectoryHandle | null
  getAuthorBaseline(): AuthorDiskBaseline
  onResult(result: string): void
}): BattleTrialSession {
  const inputRef = useRef(input)
  inputRef.current = input
  const [draft, setDraftState] = useState<BattleSimulatorDraft>()
  const draftRef = useRef(draft)
  const setDraft = useCallback<Dispatch<SetStateAction<BattleSimulatorDraft | undefined>>>(
    (next) => {
      const value = typeof next === 'function' ? next(draftRef.current) : next
      draftRef.current = value
      setDraftState(value)
    },
    [],
  )
  const [subject, setSubject] = useState<BattleTrialSubject>()
  const [discardPending, setDiscardPending] = useState(false)
  const discardContinuationRef = useRef<(() => void) | undefined>(undefined)
  const windowsRef = useRef(new Set<ReturnType<typeof launchBattleTrial>>())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const windows = windowsRef.current
    return () => {
      mountedRef.current = false
      discardContinuationRef.current = undefined
      for (const trial of windows) trial.close()
      windows.clear()
    }
  }, [])

  useEffect(() => {
    if (!draft?.changed) return
    const guard = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [draft?.changed])

  const requestDiscard = useCallback((continuation: () => void): void => {
    if (!draftRef.current?.changed) {
      continuation()
      return
    }
    discardContinuationRef.current = continuation
    setDiscardPending(true)
  }, [])
  const cancelDiscard = useCallback((): void => {
    discardContinuationRef.current = undefined
    setDiscardPending(false)
  }, [])
  const confirmDiscard = useCallback((): void => {
    const continuation = discardContinuationRef.current
    discardContinuationRef.current = undefined
    setDiscardPending(false)
    continuation?.()
  }, [])

  const start = useCallback(async (config: BattleTrialConfig): Promise<void> => {
    const current = inputRef.current
    const windows = windowsRef.current
    if (windows.size) throw new Error('已有独立试打窗口，请在该窗口重新试打，或关闭后再开始')
    if (current.projectGuard.blocked() || current.main.isDirty() || current.script.isDirty())
      throw new Error('请先保存项目，再开始独立试打')
    const startingState = current.main.getState()
    const scriptVersion = current.script.getVersion()
    const directory = current.getLocalDirectory()
    const source = directory ? fsaSource(directory) : current.projectSource
    const identity = { ...current.playIdentity }
    const handle = launchBattleTrial({
      config,
      identity,
      source,
      assertCanLaunch: async () => {
        const latest = inputRef.current
        if (
          !mountedRef.current ||
          latest.projectGuard.blocked() ||
          latest.main.isDirty() ||
          latest.script.isDirty() ||
          latest.main.getState() !== startingState ||
          latest.script.getVersion() !== scriptVersion
        )
          throw new Error('项目状态已变化，请保存后重新试打')
        if (directory) {
          const record = await resolvePlayWorkspaceRecord(identity.workspaceId, identity.projectId)
          if (!(await record.handle.isSameEntry(directory))) throw new Error('试打工作区目录已变化')
        }
        await verifySourceAuthorBaseline(latest.getAuthorBaseline(), source)
      },
      onClosed: () => windows.delete(handle),
      onResult: (result) => {
        if (mountedRef.current) inputRef.current.onResult(result)
      },
    })
    windows.add(handle)
    await handle.ready
  }, [])

  return {
    draft,
    setDraft,
    subject,
    setSubject,
    discardPending,
    requestDiscard,
    cancelDiscard,
    confirmDiscard,
    start,
  }
}
