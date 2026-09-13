import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { EditSession } from '../core/edit-session.js'
import { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import type { ScriptEditSession } from '../core/script-editor.js'

export function useProjectLeaveGuard(main: EditSession, script: ScriptEditSession) {
  const guard = useMemo(() => new ProjectLeaveGuard(main, script), [main, script])
  useEffect(() => {
    const disconnect = guard.connect()
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (!guard.shouldWarnBeforeUnload()) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      disconnect()
    }
  }, [guard])
  const snapshot = useSyncExternalStore(guard.subscribe, guard.getSnapshot, guard.getSnapshot)
  return { guard, ...snapshot }
}
