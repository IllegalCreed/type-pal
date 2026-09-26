import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  decodeEditorLocation,
  type EditorLocation,
  type EditorModuleId,
  editorLocationHref,
  normalizeEditorLocation,
  sameEditorLocation,
} from './editor-navigation.js'

export interface StoredEditorNavigation {
  last?: EditorLocation
  modules?: Partial<Record<EditorModuleId, EditorLocation>>
  scroll?: Record<string, EditorScrollPosition>
}

export interface EditorScrollPosition {
  outliner: number
  center: number
  inspector: number
}

export type EditorNavigationHistoryMode = 'push' | 'replace' | 'none'

export interface EditorNavigationSession {
  bodyRef: RefObject<HTMLDivElement | null>
  location: EditorLocation
  locationRef: RefObject<EditorLocation>
  apply(input: EditorLocation, historyMode?: EditorNavigationHistoryMode): void
}

export function editorNavigationStorageKey(workspaceId: string): string {
  return `type-pal:editor:navigation:${workspaceId}`
}

export function readStoredEditorNavigation(workspaceId: string): StoredEditorNavigation {
  try {
    const raw = window.localStorage.getItem(editorNavigationStorageKey(workspaceId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredEditorNavigation
    const modules = Object.fromEntries(
      Object.entries(parsed.modules ?? {}).map(([id, location]) => [
        id,
        normalizeEditorLocation(location),
      ]),
    ) as Partial<Record<EditorModuleId, EditorLocation>>
    return {
      ...(parsed.last ? { last: normalizeEditorLocation(parsed.last) } : {}),
      modules,
      scroll: parsed.scroll ?? {},
    }
  } catch {
    return {}
  }
}

export function initialEditorLocation(stored: StoredEditorNavigation): EditorLocation {
  const params = new URLSearchParams(window.location.search)
  if (params.has('module') || params.has('page') || params.has('object'))
    return decodeEditorLocation(window.location.search)
  return normalizeEditorLocation(stored.last)
}

export function editorScrollKey(location: EditorLocation): string {
  return `${location.module}:${location.subpage}`
}

/** Owns URL/history, per-workspace persistence, per-module memory and three-column scroll restore. */
export function useEditorNavigationSession(input: {
  workspaceId: string
  onPageChanged(): void
}): EditorNavigationSession {
  const { workspaceId, onPageChanged } = input
  const bodyRef = useRef<HTMLDivElement>(null)
  const storedNavigationRef = useRef(readStoredEditorNavigation(workspaceId))
  const [location, setLocation] = useState<EditorLocation>(() =>
    initialEditorLocation(storedNavigationRef.current),
  )
  const locationRef = useRef(location)
  const [moduleLocations, setModuleLocations] = useState<
    Partial<Record<EditorModuleId, EditorLocation>>
  >(() => ({ ...storedNavigationRef.current.modules, [location.module]: location }))
  const moduleLocationsRef = useRef(moduleLocations)
  const scrollPositionsRef = useRef(storedNavigationRef.current.scroll ?? {})
  const storageKey = editorNavigationStorageKey(workspaceId)

  const persist = useCallback(
    (last: EditorLocation): void => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            last,
            modules: moduleLocationsRef.current,
            scroll: scrollPositionsRef.current,
          } satisfies StoredEditorNavigation),
        )
      } catch {
        // Privacy mode or disabled storage: URL and current in-memory state remain authoritative.
      }
    },
    [storageKey],
  )

  const captureScroll = useCallback((current: EditorLocation): void => {
    const body = bodyRef.current
    if (!body) return
    const columns = navigationColumns(body)
    scrollPositionsRef.current[editorScrollKey(current)] = {
      outliner: columns.outliner?.scrollTop ?? 0,
      center: columns.center?.scrollTop ?? 0,
      inspector: columns.inspector?.scrollTop ?? 0,
    }
  }, [])

  const apply = useCallback(
    (raw: EditorLocation, historyMode: EditorNavigationHistoryMode = 'push'): void => {
      const next = normalizeEditorLocation(raw)
      const current = locationRef.current
      const pageChanged = current.module !== next.module || current.subpage !== next.subpage
      if (pageChanged) {
        captureScroll(current)
        onPageChanged()
      }
      if (!sameEditorLocation(current, next)) {
        locationRef.current = next
        setLocation(next)
        const nextModules = { ...moduleLocationsRef.current, [next.module]: next }
        moduleLocationsRef.current = nextModules
        setModuleLocations(nextModules)
      }
      persist(next)
      if (historyMode === 'none') return
      const href = editorLocationHref(next, window.location.href)
      if (historyMode === 'push') window.history.pushState({ editorLocation: next }, '', href)
      else window.history.replaceState({ editorLocation: next }, '', href)
    },
    [captureScroll, onPageChanged, persist],
  )

  useEffect(() => {
    window.history.replaceState(
      { editorLocation: locationRef.current },
      '',
      editorLocationHref(locationRef.current, window.location.href),
    )
    persist(locationRef.current)
  }, [persist])

  useEffect(() => {
    const onPopState = (): void => apply(decodeEditorLocation(window.location.search), 'none')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [apply])

  const activeScrollKey = editorScrollKey(location)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = scrollPositionsRef.current[activeScrollKey]
      const body = bodyRef.current
      if (!saved || !body) return
      const columns = navigationColumns(body)
      if (columns.outliner) columns.outliner.scrollTop = saved.outliner
      if (columns.center) columns.center.scrollTop = saved.center
      if (columns.inspector) columns.inspector.scrollTop = saved.inspector
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeScrollKey])

  return { bodyRef, location, locationRef, apply }
}

function navigationColumns(body: HTMLDivElement): {
  outliner: HTMLElement | null
  center: HTMLElement | null
  inspector: HTMLElement | null
} {
  return {
    outliner: body.querySelector<HTMLElement>(':scope > .outliner'),
    center: body.querySelector<HTMLElement>(':scope > .center, :scope > .data-body'),
    inspector: body.querySelector<HTMLElement>(':scope > .inspector'),
  }
}
