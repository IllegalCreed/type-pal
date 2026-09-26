// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, test } from 'vitest'
import mapModeSource from './MapMode.tsx?raw'
import { type MapTool, useMapWorkspaceViewSession } from './map-workspace-view-session.js'

let current: ReturnType<typeof useMapWorkspaceViewSession> | undefined
let root: ReturnType<typeof createRoot> | undefined

function Harness() {
  current = useMapWorkspaceViewSession('tiles-a')
  return null
}

async function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = createRoot(document.createElement('div'))
  await act(async () => root!.render(<Harness />))
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  root = undefined
  current = undefined
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
})

describe('map workspace view session ownership', () => {
  test('MapMode has one view owner and no duplicate view preference state declarations', () => {
    expect(mapModeSource.match(/useMapWorkspaceViewSession\(/g)).toHaveLength(1)
    for (const state of [
      'showGrid',
      'showCollision',
      'tool',
      'inspectorTab',
      'selectedTile',
      'selectedTilesetId',
      'paintHeight',
      'viewHeight',
      'brushSize',
      'focusEnabled',
      'activeLayerId',
    ])
      expect(mapModeSource).not.toMatch(new RegExp(`const \\[${state},\\s*set`))
  })

  test('session reset releases project-bound tool and stamp state but preserves view preferences', async () => {
    await mount()
    act(() => {
      current!.setTool('stamp')
      current!.setInspectorTab('draw')
      current!.setDrawPanelVisited(true)
      current!.setActiveStampId('stamp-a')
      current!.setStampHoverAnchor({ row: 2, col: 3 })
      current!.setRecentStampIds(['stamp-a'])
      current!.setShowGrid(false)
      current!.setViewHeight(4)
      current!.resetSession()
    })
    expect(current).toMatchObject({
      tool: 'pan',
      inspectorTab: 'properties',
      drawPanelVisited: false,
      activeStampId: undefined,
      stampHoverAnchor: undefined,
      recentStampIds: [],
      showGrid: false,
      viewHeight: 4,
    })
  })

  test('invalid stamp cleanup exits only the stamp tool', async () => {
    await mount()
    for (const tool of ['stamp', 'brush'] satisfies MapTool[]) {
      act(() => {
        current!.setTool(tool)
        current!.setActiveStampId('missing')
        current!.setStampHoverAnchor({ row: 1, col: 1 })
        current!.clearInvalidStamp()
      })
      expect(current!.activeStampId).toBeUndefined()
      expect(current!.stampHoverAnchor).toBeUndefined()
      expect(current!.tool).toBe(tool === 'stamp' ? 'select' : tool)
    }
  })

  test('eyedropper sampling updates tile source, both heights and the brush tool atomically', async () => {
    await mount()
    act(() => current!.sampleTile({ tileId: 7, tilesetId: 'tiles-b', height: 3 }))
    expect(current).toMatchObject({
      selectedTile: 7,
      selectedTilesetId: 'tiles-b',
      paintHeight: 3,
      viewHeight: 3,
      tool: 'brush',
    })
  })
})
