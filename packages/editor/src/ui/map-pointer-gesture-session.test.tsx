// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, test, vi } from 'vitest'
import type { MapSelection } from '../core/map-selection.js'
import mapModeSource from './MapMode.tsx?raw'
import {
  MapPointerGestureSession,
  type MapSelectionDrag,
  useMapPointerGestureSession,
} from './map-pointer-gesture-session.js'

const selection = (col: number): MapSelection => ({
  kind: 'cells',
  visualSlots: [{ layerId: 'floor', row: 0, col }],
  gridPoints: [],
  hitScope: 'active-layer',
})

const drag = (pointerId = 4): MapSelectionDrag => ({
  scope: 'map',
  pointerId,
  startClient: { x: 1, y: 2 },
  startWorld: { wx: 3, wy: 4 },
  mode: 'replace',
  base: selection(1),
  dragging: false,
})

describe('map pointer gesture session ownership', () => {
  test('MapMode delegates transient pointer resources to one session owner', () => {
    expect(mapModeSource.match(/useMapPointerGestureSession\(\{/g)).toHaveLength(1)
    expect(mapModeSource).not.toMatch(
      /\b(?:strokeRef|selectionDragRef|selectionPreviewRef|paintingRef|rectAnchorRef|panRef|hoverRef|coordinateHoverRef|cancelPointerInteractionRef)\b/,
    )
    expect(mapModeSource).toContain('onPointerCancel={cancelPointerInteraction}')
    expect(mapModeSource).toContain('if (pointerGesture.isActive()) cancelPointerInteraction()')
  })

  test('a painting stroke replaces duplicate cells and can be consumed exactly once', () => {
    const session = new MapPointerGestureSession()
    session.beginPainting({ row: 0, col: 0 })
    session.rememberStroke('tile:floor:0:0', {
      kind: 'tile',
      edit: { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    })
    session.rememberStroke('tile:floor:0:0', {
      kind: 'tile',
      edit: { layerId: 'floor', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
    })

    expect(session.rectAnchor()).toEqual({ row: 0, col: 0 })
    expect(session.finishPainting()).toEqual([
      {
        kind: 'tile',
        edit: { layerId: 'floor', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
      },
    ])
    expect(session.finishPainting()).toBeUndefined()
    expect(session.strokeItems()).toEqual([])
  })

  test('selection completion rejects another pointer and atomically consumes the preview', () => {
    const session = new MapPointerGestureSession()
    session.beginSelectionDrag(drag())
    expect(session.updateSelectionDrag(9, { x: 100, y: 100 })).toBeNull()
    expect(session.updateSelectionDrag(4, { x: 1, y: 2 })?.dragging).toBe(false)
    expect(session.updateSelectionDrag(4, { x: 100, y: 100 })?.dragging).toBe(true)
    session.setSelectionPreview(selection(2))

    expect(session.finishSelectionDrag(9)).toBeUndefined()
    expect(session.selectionDrag()?.pointerId).toBe(4)
    expect(session.finishSelectionDrag(4)).toEqual({
      drag: { ...drag(), dragging: true },
      selection: selection(2),
    })
    expect(session.selectionDrag()).toBeNull()
    expect(session.finishSelectionDrag(4)).toBeUndefined()
  })

  test('cancel synchronously clears selection, paint and pan without returning edits', () => {
    const session = new MapPointerGestureSession()
    session.beginSelectionDrag(drag())
    session.setSelectionPreview(selection(2))
    session.beginPainting()
    session.rememberStroke('collision:0:0', {
      kind: 'collision',
      edit: { row: 0, col: 0, value: 1 },
    })
    session.beginPan({ sx: 1, sy: 2, panX: 3, panY: 4 })

    expect(session.cancel()).toEqual({ paintPreviewInvalidated: true })
    expect(session.isActive()).toBe(false)
    expect(session.selectionDrag()).toBeNull()
    expect(session.strokeItems()).toEqual([])
    expect(session.pan()).toBeNull()
  })

  test('reset may preserve the sampled coordinate while always releasing active gestures', () => {
    const session = new MapPointerGestureSession()
    session.setHover({ row: 1, col: 2 })
    session.setCoordinateHover({ row: 3, col: 4 })
    session.beginPan({ sx: 1, sy: 2, panX: 3, panY: 4 })

    session.reset({ preserveCoordinateHover: true })
    expect(session.hover()).toBeNull()
    expect(session.coordinateHover()).toEqual({ row: 3, col: 4 })
    expect(session.isActive()).toBe(false)

    session.reset()
    expect(session.coordinateHover()).toBeNull()
  })

  test('the hook owns blur cancellation, preview state and repaint notifications', async () => {
    const onPaintPreviewInvalidated = vi.fn()
    const onInteractionInvalidated = vi.fn()
    let current: ReturnType<typeof useMapPointerGestureSession> | undefined
    const host = document.createElement('div')
    const root = createRoot(host)
    function Harness() {
      current = useMapPointerGestureSession({
        onPaintPreviewInvalidated,
        onInteractionInvalidated,
      })
      return null
    }
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    await act(async () => root.render(<Harness />))

    act(() => {
      current!.runtime.beginPainting()
      current!.runtime.rememberStroke('collision:0:0', {
        kind: 'collision',
        edit: { row: 0, col: 0, value: 1 },
      })
      current!.runtime.beginSelectionDrag(drag())
      current!.setSelectionPreview(selection(2))
      window.dispatchEvent(new Event('blur'))
    })

    expect(current!.selectionPreview).toBeUndefined()
    expect(current!.runtime.isActive()).toBe(false)
    expect(onPaintPreviewInvalidated).toHaveBeenCalledTimes(1)
    expect(onInteractionInvalidated).toHaveBeenCalledTimes(1)
    await act(async () => root.unmount())
    window.dispatchEvent(new Event('blur'))
    expect(onInteractionInvalidated).toHaveBeenCalledTimes(1)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
  })
})
