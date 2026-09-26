import { describe, expect, test } from 'vitest'
import type { MapCellClipboard } from '../core/map-transform.js'
import type { StampGroupClipboard } from '../core/stamp-group-transform.js'
import mapModeSource from './MapMode.tsx?raw'
import {
  initialMapTransformSessionState,
  isStampGroupTransform,
  type MapTransformIntent,
  mapTransformSessionReducer,
} from './map-transform-session.js'

const cells: MapCellClipboard = {
  kind: 'cells',
  sourceMapId: 'map-a',
  sourceAnchor: { row: 1, col: 2 },
  hitScope: 'active-layer',
  visual: [],
  collision: { kind: 'excluded' },
}

const stamps: StampGroupClipboard = {
  kind: 'stamp-placements',
  identity: 'copy',
  sourceMapId: 'map-a',
  sourceAnchor: { row: 1, col: 2 },
  sourceTilesetIds: [],
  placements: [],
}

const paste = (clipboard: MapCellClipboard | StampGroupClipboard = cells): MapTransformIntent => ({
  kind: 'paste',
  clipboard,
  anchor: { row: 1, col: 2 },
  layerMappings: [],
})

describe('map transform session ownership', () => {
  test('MapMode composes the transform session while retaining the existing selection reducer', () => {
    expect(mapModeSource.match(/useMapTransformSession\(\)/g)).toHaveLength(1)
    expect(mapModeSource).not.toMatch(
      /\b(?:setTransformIntent|setTransformTargetLocked|setTransformOverwriteIntent|setClipboard)\b/,
    )
    expect(mapModeSource).toContain('mapWorkspaceReducer')
    expect(mapModeSource).toContain('complete: completeTransform')
  })

  test('begin and complete atomically own preview, lock and overwrite state', () => {
    const intent = paste()
    const begun = mapTransformSessionReducer(initialMapTransformSessionState, {
      type: 'begin',
      intent,
      targetLocked: false,
    })
    const locked = mapTransformSessionReducer(begun, { type: 'lock-target', intent })
    const overwrite = mapTransformSessionReducer(locked, { type: 'request-overwrite', intent })
    expect(overwrite).toMatchObject({ intent, targetLocked: true, overwriteIntent: intent })
    expect(mapTransformSessionReducer(overwrite, { type: 'complete' })).toEqual(
      initialMapTransformSessionState,
    )
  })

  test('returning from overwrite preserves the preview while unlocking adjustment', () => {
    const intent = paste()
    const state = mapTransformSessionReducer(
      { ...initialMapTransformSessionState, intent, targetLocked: true, overwriteIntent: intent },
      { type: 'return-to-adjustment' },
    )
    expect(state).toEqual({
      ...initialMapTransformSessionState,
      intent,
      targetLocked: false,
      overwriteIntent: undefined,
    })
  })

  test('map reset retains cell clipboard but releases stamp identities and every preview', () => {
    const cellState = mapTransformSessionReducer(
      { ...initialMapTransformSessionState, clipboard: cells, intent: paste(), targetLocked: true },
      { type: 'reset-map' },
    )
    expect(cellState.clipboard).toBe(cells)
    expect(cellState.intent).toBeUndefined()
    expect(cellState.targetLocked).toBe(false)

    const stampState = mapTransformSessionReducer(
      { ...cellState, clipboard: stamps, intent: paste(stamps), targetLocked: true },
      { type: 'reset-map' },
    )
    expect(stampState.clipboard).toBeUndefined()
    expect(stampState.intent).toBeUndefined()
  })

  test('session reset clears project-bound clipboard and previews without changing collision policy', () => {
    const dirty = {
      ...initialMapTransformSessionState,
      includeCollision: true,
      clipboard: cells,
      intent: paste(),
      targetLocked: true,
    }
    expect(mapTransformSessionReducer(dirty, { type: 'reset-session' })).toEqual({
      ...initialMapTransformSessionState,
      includeCollision: true,
    })
  })

  test('anchor updates remain adjustable while a nudge freezes the new target', () => {
    const begun = mapTransformSessionReducer(initialMapTransformSessionState, {
      type: 'begin',
      intent: paste(),
      targetLocked: false,
    })
    const hovered = mapTransformSessionReducer(begun, {
      type: 'update-anchor',
      anchor: { row: 3, col: 4 },
    })
    expect(hovered.intent?.anchor).toEqual({ row: 3, col: 4 })
    expect(hovered.targetLocked).toBe(false)
    const nudged = mapTransformSessionReducer(hovered, { type: 'nudge', direction: 'right' })
    expect(nudged.intent?.anchor).not.toEqual(hovered.intent?.anchor)
    expect(nudged.targetLocked).toBe(true)
  })

  test('stamp-group classification follows clipboard or selected placements without guessing', () => {
    expect(isStampGroupTransform(paste())).toBe(false)
    expect(isStampGroupTransform(paste(stamps))).toBe(true)
    expect(
      isStampGroupTransform({
        kind: 'move',
        selection: { kind: 'stamp-placements', placementIds: ['p1'] },
        anchor: { row: 0, col: 0 },
        includeCollision: true,
        layerMappings: [],
      }),
    ).toBe(true)
  })
})
