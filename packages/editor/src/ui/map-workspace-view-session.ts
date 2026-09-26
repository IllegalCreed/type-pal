import type { LatticePos } from '@type-pal/reforge'
import { useCallback, useState } from 'react'
import type { IsometricBrushSize } from '../core/isometric-brush.js'

export type MapTool =
  | 'pan'
  | 'select'
  | 'stamp'
  | 'eyedropper'
  | 'brush'
  | 'rect'
  | 'fill'
  | 'erase'
  | 'collision'
export type CollisionPaint = 'set' | 'clear'
export type MapInspectorTab = 'properties' | 'draw' | 'references'

/** Owns map-workspace view preferences and tool-palette state, never project content. */
export function useMapWorkspaceViewSession(initialTilesetId: string) {
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [tool, setTool] = useState<MapTool>('pan')
  const [inspectorTab, setInspectorTab] = useState<MapInspectorTab>('properties')
  const [drawPanelVisited, setDrawPanelVisited] = useState(false)
  const [activeStampId, setActiveStampId] = useState<string>()
  const [stampHoverAnchor, setStampHoverAnchor] = useState<LatticePos>()
  const [recentStampIds, setRecentStampIds] = useState<string[]>([])
  const [collisionPaint, setCollisionPaint] = useState<CollisionPaint>('set')
  const [selectedTile, setSelectedTile] = useState(0)
  const [selectedTilesetId, setSelectedTilesetId] = useState(initialTilesetId)
  const [paintHeight, setPaintHeight] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)
  const [brushSize, setBrushSize] = useState<IsometricBrushSize>(1)
  const [focusEnabled, setFocusEnabled] = useState(true)
  const [activeLayerId, setActiveLayerId] = useState('floor')
  const [stampDialogOpen, setStampDialogOpen] = useState(false)

  const resetSession = useCallback((): void => {
    setTool('pan')
    setInspectorTab('properties')
    setDrawPanelVisited(false)
    setActiveStampId(undefined)
    setStampHoverAnchor(undefined)
    setRecentStampIds([])
    setStampDialogOpen(false)
  }, [])

  const clearInvalidStamp = useCallback((): void => {
    setActiveStampId(undefined)
    setStampHoverAnchor(undefined)
    setTool((current) => (current === 'stamp' ? 'select' : current))
  }, [])

  const sampleTile = useCallback(
    (sample: { tileId: number; tilesetId?: string; height: number }): void => {
      setSelectedTile(sample.tileId)
      if (sample.tilesetId) setSelectedTilesetId(sample.tilesetId)
      setPaintHeight(sample.height)
      setViewHeight(sample.height)
      setTool('brush')
    },
    [],
  )

  return {
    showGrid,
    setShowGrid,
    showCollision,
    setShowCollision,
    tool,
    setTool,
    inspectorTab,
    setInspectorTab,
    drawPanelVisited,
    setDrawPanelVisited,
    activeStampId,
    setActiveStampId,
    stampHoverAnchor,
    setStampHoverAnchor,
    recentStampIds,
    setRecentStampIds,
    collisionPaint,
    setCollisionPaint,
    selectedTile,
    setSelectedTile,
    selectedTilesetId,
    setSelectedTilesetId,
    paintHeight,
    setPaintHeight,
    viewHeight,
    setViewHeight,
    brushSize,
    setBrushSize,
    focusEnabled,
    setFocusEnabled,
    activeLayerId,
    setActiveLayerId,
    stampDialogOpen,
    setStampDialogOpen,
    resetSession,
    clearInvalidStamp,
    sampleTile,
  }
}
