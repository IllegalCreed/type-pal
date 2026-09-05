import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type {
  EditorDerivedStore,
  EditorDerivedStoreSnapshot,
} from '../core/editor-derived-store.js'
import type { ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'

export type SessionSelectorEquality<T> = (left: T, right: T) => boolean

export interface EditSessionSelectorSnapshot {
  state: EditorState
  version: number
  historyVersion: number
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
}

export interface ScriptEditSessionSelectorSnapshot {
  state: ScriptEditorState
  version: number
  historyVersion: number
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
}

interface VersionedSession {
  getVersion(): number
  subscribe(listener: () => void): () => void
}

/**
 * `useSyncExternalStoreWithSelector` semantics without adding another state owner.
 * A session notify still reaches every subscriber, but an equal selection preserves
 * the committed reference and therefore does not reconcile that consumer subtree.
 */
function useVersionedSessionSelector<Session extends VersionedSession, Snapshot, Selection>(
  session: Session,
  read: (session: Session, version: number) => Snapshot,
  selector: (snapshot: Snapshot) => Selection,
  isEqual: SessionSelectorEquality<Selection>,
): Selection {
  const committedRef = useRef<{ session: Session; value: Selection } | undefined>(undefined)
  const subscribe = useCallback((listener: () => void) => session.subscribe(listener), [session])
  const getSelection = useMemo(() => {
    let hasMemo = false
    let memoVersion = 0
    let memoSelection!: Selection

    return (): Selection => {
      const nextVersion = session.getVersion()
      if (hasMemo && memoVersion === nextVersion) return memoSelection

      const nextSelection = selector(read(session, nextVersion))
      if (!hasMemo) {
        hasMemo = true
        memoVersion = nextVersion
        const committed = committedRef.current
        memoSelection =
          committed?.session === session && isEqual(committed.value, nextSelection)
            ? committed.value
            : nextSelection
        return memoSelection
      }

      memoVersion = nextVersion
      if (!isEqual(memoSelection, nextSelection)) memoSelection = nextSelection
      return memoSelection
    }
  }, [isEqual, read, selector, session])
  const selection = useSyncExternalStore(subscribe, getSelection, getSelection)

  useEffect(() => {
    committedRef.current = { session, value: selection }
  }, [selection, session])

  return selection
}

const readEditSession = (session: EditSession, version: number): EditSessionSelectorSnapshot => ({
  state: session.getState(),
  version,
  historyVersion: session.getHistoryVersion(),
  dirty: session.isDirty(),
  canUndo: session.canUndo(),
  canRedo: session.canRedo(),
})

const readScriptEditSession = (
  session: ScriptEditSession,
  version: number,
): ScriptEditSessionSelectorSnapshot => ({
  // Render consumers must use the immutable snapshot. `getState()` clones the canonical tree.
  state: session.getStateSnapshot(),
  version,
  historyVersion: session.getHistoryVersion(),
  dirty: session.isDirty(),
  canUndo: session.canUndo(),
  canRedo: session.canRedo(),
})

export function useEditSessionSelector<Selection>(
  session: EditSession,
  selector: (snapshot: EditSessionSelectorSnapshot) => Selection,
  isEqual: SessionSelectorEquality<Selection> = Object.is,
): Selection {
  return useVersionedSessionSelector(session, readEditSession, selector, isEqual)
}

export function useScriptEditSessionSelector<Selection>(
  session: ScriptEditSession,
  selector: (snapshot: ScriptEditSessionSelectorSnapshot) => Selection,
  isEqual: SessionSelectorEquality<Selection> = Object.is,
): Selection {
  return useVersionedSessionSelector(session, readScriptEditSession, selector, isEqual)
}

export function useEditorDerivedSelector<Selection>(
  store: EditorDerivedStore,
  selector: (snapshot: EditorDerivedStoreSnapshot) => Selection,
  isEqual: SessionSelectorEquality<Selection> = Object.is,
): Selection {
  const committedRef = useRef<{ store: EditorDerivedStore; value: Selection } | undefined>(
    undefined,
  )
  const getSelection = useMemo(() => {
    let memoSnapshot: EditorDerivedStoreSnapshot | undefined
    let memoSelection!: Selection
    return (): Selection => {
      const nextSnapshot = store.getSnapshot()
      if (memoSnapshot === nextSnapshot) return memoSelection
      const nextSelection = selector(nextSnapshot)
      memoSnapshot = nextSnapshot
      if (memoSelection !== undefined && isEqual(memoSelection, nextSelection)) return memoSelection
      const committed = committedRef.current
      memoSelection =
        committed?.store === store && isEqual(committed.value, nextSelection)
          ? committed.value
          : nextSelection
      return memoSelection
    }
  }, [isEqual, selector, store])
  const selection = useSyncExternalStore(store.subscribe, getSelection, getSelection)

  useEffect(() => {
    committedRef.current = { store, value: selection }
  }, [selection, store])

  return selection
}

/**
 * Reference/delete affordances are diagnostic consumers, not command feedback. Publish their
 * worker status after the command's first paint so a stale/current badge cannot delay field commit
 * feedback; the worker itself still starts immediately and the status remains well inside 100ms.
 */
export function useEditorDerivedSnapshotAfterPaint(
  store: EditorDerivedStore,
): EditorDerivedStoreSnapshot {
  const [published, setPublished] = useState(() => ({ store, snapshot: store.getSnapshot() }))
  const current = published.store === store ? published.snapshot : store.getSnapshot()

  useEffect(() => {
    setPublished({ store, snapshot: store.getSnapshot() })
    let frame: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const publish = (): void => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (timer !== undefined) clearTimeout(timer)
      const commit = (): void => {
        frame = undefined
        timer = undefined
        const snapshot = store.getSnapshot()
        setPublished((previous) =>
          previous.store === store && previous.snapshot === snapshot
            ? previous
            : { store, snapshot },
        )
      }
      if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(commit)
      else timer = setTimeout(commit, 0)
    }
    const unsubscribe = store.subscribe(publish)
    return () => {
      unsubscribe()
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [store])

  return current
}

export function shallowSelectorArrayEqual(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  )
}
