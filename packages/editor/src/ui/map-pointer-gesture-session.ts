import type { LatticePos, ProjectMapCollisionEdit, ProjectMapTileEdit } from '@type-pal/reforge'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isMapSelectionDrag,
  type MapSelection,
  type SelectionChangeMode,
} from '../core/map-selection.js'

export type MapStrokeEdit =
  | { kind: 'tile'; edit: ProjectMapTileEdit }
  | { kind: 'collision'; edit: ProjectMapCollisionEdit }

export interface MapSelectionDrag {
  scope: 'map' | 'stamp-group'
  pointerId: number
  startClient: { x: number; y: number }
  startWorld: { wx: number; wy: number }
  mode: SelectionChangeMode
  base: MapSelection
  placementId?: string
  dragging: boolean
}

export interface MapPanGesture {
  sx: number
  sy: number
  panX: number
  panY: number
}

export interface MapPointerCancelResult {
  paintPreviewInvalidated: boolean
}

/** Owns the synchronous, transient state of one map-canvas pointer interaction. */
export class MapPointerGestureSession {
  readonly #strokes = new Map<string, MapStrokeEdit>()
  #hover: LatticePos | null = null
  #coordinateHover: LatticePos | null = null
  #pan: MapPanGesture | null = null
  #painting = false
  #rectAnchor: LatticePos | null = null
  #selectionDrag: MapSelectionDrag | null = null
  #selectionPreview: MapSelection | undefined

  strokeItems(): MapStrokeEdit[] {
    return [...this.#strokes.values()]
  }

  rememberStroke(key: string, edit: MapStrokeEdit): void {
    this.#strokes.set(key, edit)
  }

  clearStroke(): void {
    this.#strokes.clear()
  }

  beginPainting(rectAnchor: LatticePos | null = null): void {
    this.#painting = true
    this.#rectAnchor = rectAnchor
  }

  isPainting(): boolean {
    return this.#painting
  }

  rectAnchor(): LatticePos | null {
    return this.#rectAnchor
  }

  finishPainting(): MapStrokeEdit[] | undefined {
    if (!this.#painting) return undefined
    const edits = this.strokeItems()
    this.#painting = false
    this.#rectAnchor = null
    this.#strokes.clear()
    return edits
  }

  beginPan(pan: MapPanGesture): void {
    this.#pan = pan
  }

  pan(): MapPanGesture | null {
    return this.#pan
  }

  endPan(): void {
    this.#pan = null
  }

  beginSelectionDrag(drag: MapSelectionDrag): void {
    this.#selectionDrag = { ...drag }
  }

  selectionDrag(): Readonly<MapSelectionDrag> | null {
    return this.#selectionDrag
  }

  updateSelectionDrag(
    pointerId: number,
    currentClient: { x: number; y: number },
  ): Readonly<MapSelectionDrag> | null {
    const drag = this.#selectionDrag
    if (!drag || drag.pointerId !== pointerId) return null
    if (!drag.dragging && isMapSelectionDrag(drag.startClient, currentClient))
      this.#selectionDrag = { ...drag, dragging: true }
    return this.#selectionDrag
  }

  setSelectionPreview(selection: MapSelection | undefined): void {
    this.#selectionPreview = selection
  }

  finishSelectionDrag(
    pointerId: number,
  ): { drag: MapSelectionDrag; selection: MapSelection } | undefined {
    const drag = this.#selectionDrag
    if (!drag || drag.pointerId !== pointerId) return undefined
    const selection = this.#selectionPreview ?? drag.base
    this.#selectionDrag = null
    this.#selectionPreview = undefined
    return { drag: { ...drag }, selection }
  }

  hover(): LatticePos | null {
    return this.#hover
  }

  setHover(point: LatticePos | null): void {
    this.#hover = point
  }

  coordinateHover(): LatticePos | null {
    return this.#coordinateHover
  }

  setCoordinateHover(point: LatticePos | null): boolean {
    const previous = this.#coordinateHover
    if (previous?.row === point?.row && previous?.col === point?.col) return false
    this.#coordinateHover = point
    return true
  }

  isActive(): boolean {
    return this.#selectionDrag !== null || this.#painting || this.#pan !== null
  }

  cancel(): MapPointerCancelResult {
    const paintPreviewInvalidated = this.#painting || this.#strokes.size > 0
    this.#selectionDrag = null
    this.#selectionPreview = undefined
    this.#painting = false
    this.#rectAnchor = null
    this.#strokes.clear()
    this.#pan = null
    return { paintPreviewInvalidated }
  }

  reset(options: { preserveCoordinateHover?: boolean } = {}): void {
    this.cancel()
    this.#hover = null
    if (!options.preserveCoordinateHover) this.#coordinateHover = null
  }
}

export function useMapPointerGestureSession(callbacks: {
  onPaintPreviewInvalidated: () => void
  onInteractionInvalidated: () => void
}) {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const runtimeRef = useRef<MapPointerGestureSession | null>(null)
  if (!runtimeRef.current) runtimeRef.current = new MapPointerGestureSession()
  const runtime = runtimeRef.current
  const [selectionPreview, setSelectionPreviewState] = useState<MapSelection>()
  const [hoverPoint, setHoverPoint] = useState<LatticePos | null>(null)

  const setSelectionPreview = useCallback(
    (selection: MapSelection | undefined): void => {
      runtime.setSelectionPreview(selection)
      setSelectionPreviewState(selection)
    },
    [runtime],
  )

  const cancel = useCallback((): void => {
    const result = runtime.cancel()
    setSelectionPreviewState(undefined)
    if (result.paintPreviewInvalidated) callbacksRef.current.onPaintPreviewInvalidated()
    callbacksRef.current.onInteractionInvalidated()
  }, [runtime])

  const reset = useCallback(
    (options: { preserveCoordinateHover?: boolean } = {}): void => {
      runtime.reset(options)
      setSelectionPreviewState(undefined)
      if (!options.preserveCoordinateHover) setHoverPoint(null)
    },
    [runtime],
  )

  const updateCoordinateHover = useCallback(
    (point: LatticePos | null): void => {
      if (runtime.setCoordinateHover(point)) setHoverPoint(point)
    },
    [runtime],
  )

  useEffect(() => {
    const onBlur = (): void => cancel()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [cancel])

  return {
    runtime,
    selectionPreview,
    hoverPoint,
    setSelectionPreview,
    cancel,
    reset,
    updateCoordinateHover,
  }
}
