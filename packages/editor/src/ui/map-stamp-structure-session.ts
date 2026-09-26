import type { ProjectMap } from '@type-pal/reforge'
import { useCallback, useRef, useState } from 'react'
import type { StampStructureOperation } from '../core/stamp-lifecycle.js'

export interface StampStructureIntent {
  operation: StampStructureOperation
  mapRevision: number
  map: ProjectMap
  placementIds: string[]
}

/** Owns the stale-snapshot confirmation lifecycle for destructive stamp structure operations. */
export function useMapStampStructureSession() {
  const [intent, setIntent] = useState<StampStructureIntent>()
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const open = useCallback((next: StampStructureIntent, returnFocus: HTMLElement): void => {
    returnFocusRef.current = returnFocus
    setIntent(next)
  }, [])
  const refresh = useCallback(
    (snapshot: Omit<StampStructureIntent, 'operation'>): void =>
      setIntent((current) => (current ? { ...current, ...snapshot } : current)),
    [],
  )
  const close = useCallback((): void => setIntent(undefined), [])
  const reset = useCallback((): void => {
    setIntent(undefined)
    returnFocusRef.current = null
  }, [])

  return { intent, returnFocusRef, open, refresh, close, reset }
}
