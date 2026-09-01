import {
  type AssetCatalogV1,
  mapInstanceHeight,
  mapInstanceTilesetId,
  type StampTemplate,
} from '@type-pal/content'
import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import { isLatticeInside, latticeInMapRect, pixelToLattice } from '@type-pal/reforge'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { type IsometricBrushSize, isometricBrushPoints } from '../core/isometric-brush.js'
import { floodFillIsometricTiles } from '../core/isometric-fill.js'
import type { GridPointRef, MapSelection } from '../core/map-selection.js'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  createBlankStampDraft,
  deleteStampDraftLayer,
  eraseStampDraftCollision,
  eraseStampDraftVisual,
  moveStampDraftLayerTo,
  nextStampLayerSlotId,
  openStampDraft,
  reanchorStampDraft,
  resizeStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
} from '../core/stamp-draft.js'
import {
  DsButton,
  DsCheckbox,
  DsInspectorPortal,
  DsNumberInput,
  DsPropertyGrid,
  DsPropertyRow,
  DsTextInput,
} from './design-system/index.js'
import { IsometricEditorCanvas } from './IsometricEditorCanvas.js'
import { IsometricEditorSurface } from './IsometricEditorSurface.js'
import { type IsometricEditorTool, IsometricEditorToolbar } from './IsometricEditorToolbar.js'
import { IsometricViewportStatus } from './IsometricViewportStatus.js'
import { LayerPaintContext, LayerStackControls } from './LayerStackControls.js'
import { drawMapSelectionOverlay } from './map-selection-overlay.js'
import { loadStampPreviewAssets } from './StampPreviewCanvas.js'
import { mapBoxOf, useStageSize, useViewZoomPan } from './scene-stage.js'
import { CurrentPaintTileButton, TilePalettePicker } from './TilePickerGrid.js'

interface StampEditorAssets {
  palette: Palette
  tilesets: Map<string, Map<number, RleFrame>>
}

function pointSelection(point: GridPointRef | undefined, layerId: string): MapSelection {
  return point
    ? {
        kind: 'cells',
        visualSlots: [{ ...point, layerId }],
        gridPoints: [{ ...point }],
        hitScope: 'active-layer',
      }
    : { kind: 'none' }
}

function layerTileCount(layer: StampTemplate['layers'][number]): number {
  return layer.tiles.reduce(
    (count, row) => count + row.filter((tileId) => tileId !== null).length,
    0,
  )
}

export function StampContentEditor(props: {
  template: StampTemplate
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  paletteHost?: HTMLElement | null
  propertiesHost?: HTMLElement | null
  layersHost?: HTMLElement | null
  onOpenTilePalette: () => void
  onChange: (template: StampTemplate, takeOwnership: boolean) => void
}) {
  const [draft, setDraft] = useState(() => openStampDraft(props.template))
  const [activeLayerId, setActiveLayerId] = useState(props.template.layers[0]?.id ?? '')
  const [selectedTilesetId, setSelectedTilesetId] = useState(
    props.template.tilesetRefs[0] ?? props.tilesets[0]?.id ?? '',
  )
  const [selectedTileId, setSelectedTileId] = useState(0)
  const [paintHeight, setPaintHeight] = useState(0)
  const [tool, setTool] = useState<IsometricEditorTool>(
    props.template.origin === 'migrated' ? 'pan' : 'brush',
  )
  const [brushSize, setBrushSize] = useState<IsometricBrushSize>(1)
  const [collisionPaint, setCollisionPaint] = useState<'set' | 'clear'>('set')
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [viewHeight, setViewHeight] = useState(0)
  const [focusEnabled, setFocusEnabled] = useState(true)
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set())
  const [lockedLayerIds, setLockedLayerIds] = useState<Set<string>>(() => new Set())
  const [selectedPoint, setSelectedPoint] = useState<GridPointRef>()
  const [assets, setAssets] = useState<StampEditorAssets>()
  const [error, setError] = useState('')
  const [takeOwnership, setTakeOwnership] = useState(props.template.origin !== 'migrated')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const size = useStageSize(wrapRef, 120)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const hoverRef = useRef<GridPointRef | undefined>(undefined)
  const [hoverPoint, setHoverPoint] = useState<GridPointRef>()
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | undefined>(undefined)
  const rectStartRef = useRef<GridPointRef | undefined>(undefined)
  const paintedRef = useRef<Set<string>>(new Set())
  const editingAllowed = props.template.origin !== 'migrated' || takeOwnership
  const activeLayer = draft.layers.find(({ id }) => id === activeLayerId)
  const activeLayerReadOnly =
    !editingAllowed ||
    !activeLayer ||
    hiddenLayerIds.has(activeLayerId) ||
    lockedLayerIds.has(activeLayerId)
  const ownershipDisabledReason = !editingAllowed
    ? '先接管迁移组合，才能增删或排序图层。'
    : undefined
  const deleteLayerDisabledReason = ownershipDisabledReason
    ? ownershipDisabledReason
    : draft.layers.length <= 1
      ? '至少保留一个图层。'
      : hiddenLayerIds.has(activeLayerId)
        ? '先显示当前图层，再删除。'
        : lockedLayerIds.has(activeLayerId)
          ? '先解锁当前图层，再删除。'
          : undefined
  const selectedTiles = assets?.tilesets.get(selectedTilesetId) ?? new Map<number, RleFrame>()
  const maxViewHeight = useMemo(() => {
    let max = 0
    for (const layer of draft.layers)
      for (const row of layer.heights ?? []) for (const height of row) max = Math.max(max, height)
    return Math.max(15, max + 1, viewHeight)
  }, [draft.layers, viewHeight])
  const tilesetLoads = useMemo(
    () =>
      props.tilesets.map((tileset) => ({
        tileset,
        revision: props.assetCatalog.assets[tileset.asset]?.sha256 ?? 'missing',
      })),
    [props.assetCatalog.assets, props.tilesets],
  )

  useEffect(() => {
    const next = openStampDraft(props.template)
    if (JSON.stringify(next) === JSON.stringify(draftRef.current)) return
    draftRef.current = next
    dirtyRef.current = false
    setDraft(next)
  }, [props.template])

  useEffect(() => {
    let alive = true
    setError('')
    void Promise.all(
      tilesetLoads.map(
        async ({ tileset, revision }) =>
          [
            tileset.id,
            await loadStampPreviewAssets(props.assetBase, props.assetReader, tileset, revision),
          ] as const,
      ),
    ).then(
      (entries) => {
        if (!alive) return
        const first = entries[0]?.[1]
        if (!first) {
          setError('没有可用瓦片集。')
          return
        }
        setAssets({
          palette: first.palette,
          tilesets: new Map(entries.map(([id, loaded]) => [id, loaded.frames])),
        })
      },
      (cause) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
    }
  }, [props.assetBase, props.assetReader, tilesetLoads])

  useEffect(() => {
    if (selectedTiles.size && !selectedTiles.has(selectedTileId))
      setSelectedTileId(selectedTiles.keys().next().value ?? 0)
  }, [selectedTileId, selectedTiles])

  useEffect(() => {
    if (!draft.layers.some(({ id }) => id === activeLayerId))
      setActiveLayerId(draft.layers[0]?.id ?? '')
  }, [activeLayerId, draft.layers])

  const fittedRef = useRef(false)
  useEffect(() => {
    if (!assets || fittedRef.current) return
    fittedRef.current = true
    const box = mapBoxOf(draft, undefined)
    const width = Math.max(1, box.maxX - box.minX)
    const height = Math.max(1, box.maxY - box.minY)
    const zoom = Math.max(0.25, Math.min(size.w / width, size.h / height, 3))
    setView({
      zoom,
      panX: box.minX - (size.w / zoom - width) / 2,
      panY: box.minY - (size.h / zoom - height) / 2,
    })
  }, [assets, draft, setView, size])

  const commitDraft = useCallback(
    (candidate = draftRef.current, takeOver = takeOwnership): void => {
      try {
        const available = assets
          ? new Map([...assets.tilesets].map(([id, frames]) => [id, new Set(frames.keys())]))
          : undefined
        const canonical = available ? canonicalizeStampDraft(candidate, available) : candidate
        const next =
          takeOver && canonical.origin === 'migrated'
            ? { ...canonical, origin: 'authored' as const }
            : canonical
        draftRef.current = next
        dirtyRef.current = false
        setDraft(next)
        props.onChange(next, takeOver)
        setError('')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    },
    [assets, props.onChange, takeOwnership],
  )

  const updateDraft = useCallback(
    (change: (current: StampTemplate) => StampTemplate, commit = true): void => {
      try {
        const next = change(draftRef.current)
        draftRef.current = next
        dirtyRef.current = true
        setDraft(next)
        setError('')
        if (commit) commitDraft(next)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    },
    [commitDraft],
  )

  const commitCanvasSize = (width: number, height: number): boolean => {
    try {
      const next = resizeStampDraft(draft, width, height)
      draftRef.current = next
      dirtyRef.current = true
      setDraft(next)
      setSelectedPoint((current) =>
        current && isLatticeInside(next, current) ? current : undefined,
      )
      fittedRef.current = false
      setError('')
      commitDraft(next)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return false
    }
  }

  const toWorld = (event: ReactPointerEvent<HTMLCanvasElement>): GridPointRef => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const current = viewRef.current
    return pixelToLattice(
      ((event.clientX - rect.left) * (canvas.width / rect.width)) / current.zoom + current.panX,
      ((event.clientY - rect.top) * (canvas.height / rect.height)) / current.zoom + current.panY,
    )
  }

  const paintPoint = useCallback(
    (point: GridPointRef): void => {
      if (!activeLayer || activeLayerReadOnly || !isLatticeInside(draft, point)) return
      const key = `${point.row}:${point.col}`
      if (paintedRef.current.has(key)) return
      paintedRef.current.add(key)
      if (tool === 'collision')
        updateDraft(
          (current) =>
            collisionPaint === 'set'
              ? setStampDraftCollision(current, point, 1)
              : eraseStampDraftCollision(current, point),
          false,
        )
      else if (tool === 'erase')
        updateDraft((current) => eraseStampDraftVisual(current, activeLayer.id, point), false)
      else
        updateDraft(
          (current) =>
            setStampDraftVisual(
              current,
              activeLayer.id,
              point,
              selectedTileId,
              selectedTilesetId,
              paintHeight,
            ),
          false,
        )
    },
    [
      activeLayer,
      activeLayerReadOnly,
      collisionPaint,
      draft,
      paintHeight,
      selectedTileId,
      selectedTilesetId,
      tool,
      updateDraft,
    ],
  )

  const paintBrush = (point: GridPointRef): void => {
    const points = tool === 'brush' ? isometricBrushPoints(point, brushSize) : [point]
    for (const candidate of points) paintPoint(candidate)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toWorld(event)
    hoverRef.current = point
    setHoverPoint(isLatticeInside(draft, point) ? point : undefined)
    paintedRef.current.clear()
    if (tool === 'pan') {
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      }
      return
    }
    if (!isLatticeInside(draft, point)) return
    if (tool === 'select') {
      setSelectedPoint(point)
      return
    }
    if (tool === 'eyedropper' && activeLayer) {
      const tileId = activeLayer.tiles[point.row]?.[point.col]
      const tilesetId = mapInstanceTilesetId(draft, activeLayer, point.row, point.col)
      if (tileId !== null && tileId !== undefined && tilesetId) {
        setSelectedTileId(tileId)
        setSelectedTilesetId(tilesetId)
        setPaintHeight(mapInstanceHeight(activeLayer, point.row, point.col))
        setTool('brush')
      }
      return
    }
    if (tool === 'fill' && activeLayer) {
      const points = floodFillIsometricTiles({
        start: point,
        isInside: (candidate) => isLatticeInside(draft, candidate),
        sampleAt: (candidate) => ({
          tileId: activeLayer.tiles[candidate.row]?.[candidate.col] ?? null,
          tilesetId: mapInstanceTilesetId(draft, activeLayer, candidate.row, candidate.col),
          height: mapInstanceHeight(activeLayer, candidate.row, candidate.col),
        }),
      })
      for (const candidate of points) paintPoint(candidate)
      return
    }
    if (tool === 'rect') {
      rectStartRef.current = point
      return
    }
    paintBrush(point)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const point = toWorld(event)
    const nextHover = isLatticeInside(draftRef.current, point) ? point : undefined
    if (hoverRef.current?.row !== nextHover?.row || hoverRef.current?.col !== nextHover?.col) {
      hoverRef.current = nextHover
      setHoverPoint(nextHover)
    }
    if (panRef.current) {
      const start = panRef.current
      setView({
        ...viewRef.current,
        panX: start.panX - (event.clientX - start.x) / viewRef.current.zoom,
        panY: start.panY - (event.clientY - start.y) / viewRef.current.zoom,
      })
      return
    }
    if (event.buttons === 1 && ['brush', 'erase', 'collision'].includes(tool)) paintBrush(point)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const start = rectStartRef.current
    if (start && tool === 'rect') {
      const end = toWorld(event)
      for (const point of latticeInMapRect(
        draft,
        start.col * 32 + (start.row % 2) * 16,
        start.row * 8,
        end.col * 32 + (end.row % 2) * 16,
        end.row * 8,
      ))
        paintPoint(point)
    }
    rectStartRef.current = undefined
    panRef.current = undefined
    paintedRef.current.clear()
    if (dirtyRef.current) commitDraft()
  }

  const drawOverlay = useCallback(
    (context: CanvasRenderingContext2D) => {
      const selection = pointSelection(selectedPoint, activeLayerId)
      drawMapSelectionOverlay(context, selection, view)
      const anchorSelection = pointSelection(draft.anchor, activeLayerId)
      drawMapSelectionOverlay(context, anchorSelection, view, { tone: 'preview' })
    },
    [activeLayerId, draft.anchor, selectedPoint, view],
  )

  const layerControls = (
    <LayerStackControls
      items={draft.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        detail: `${layerTileCount(layer)} 格`,
        hidden: hiddenLayerIds.has(layer.id),
        locked: lockedLayerIds.has(layer.id),
        reorderDisabled:
          !editingAllowed || hiddenLayerIds.has(layer.id) || lockedLayerIds.has(layer.id),
      }))}
      activeId={activeLayerId}
      addDisabledReason={ownershipDisabledReason}
      onSelect={setActiveLayerId}
      onAdd={() => {
        const id = nextStampLayerSlotId(draft)
        updateDraft((current) =>
          addStampDraftLayer(current, { id, name: `图层 ${current.layers.length + 1}` }),
        )
        setActiveLayerId(id)
      }}
      onDelete={() => updateDraft((current) => deleteStampDraftLayer(current, activeLayerId))}
      deleteDisabledReason={deleteLayerDisabledReason}
      onToggleVisible={(id) =>
        setHiddenLayerIds((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      onToggleLocked={(id) =>
        setLockedLayerIds((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      reorderScopeKey={`stamp:${draft.id}:layers`}
      reorderRevision={draft.layers}
      stackOrder="bottom-first"
      onReorder={(id, toIndex) =>
        updateDraft((current) => moveStampDraftLayerTo(current, id, toIndex))
      }
      footer={
        activeLayer ? (
          <LayerPaintContext
            layerName={activeLayer.name}
            focusEnabled={focusEnabled}
            viewHeight={viewHeight}
            maxViewHeight={maxViewHeight}
            rangeId="stamp-view-height"
            onToggleFocus={() => setFocusEnabled((enabled) => !enabled)}
            onViewHeightChange={setViewHeight}
          />
        ) : null
      }
    />
  )

  const properties = (
    <div className="stamp-content-properties">
      <DsPropertyGrid>
        <DsPropertyRow label="名称" labelFor="stamp-template-name">
          <DsTextInput
            id="stamp-template-name"
            size="compact"
            aria-label="组合名称"
            value={draft.name}
            disabled={!editingAllowed}
            onChange={(event) =>
              updateDraft((current) => ({ ...current, name: event.target.value }), false)
            }
            onBlur={() => dirtyRef.current && commitDraft()}
          />
        </DsPropertyRow>
        <DsPropertyRow
          label="标签"
          labelFor="stamp-template-tag"
          help="自由填写；相同标签会归入同一筛选项。"
        >
          <DsTextInput
            id="stamp-template-tag"
            size="compact"
            aria-label="组合标签"
            value={draft.category ?? ''}
            placeholder="例如：道路"
            disabled={!editingAllowed}
            onChange={(event) =>
              updateDraft((current) => ({ ...current, category: event.target.value }), false)
            }
            onBlur={() => dirtyRef.current && commitDraft()}
          />
        </DsPropertyRow>
        <DsPropertyRow
          label="画布尺寸"
          help="宽 × 高，范围 1–256；左上固定，缩小时不会裁掉现有内容或锚点。"
        >
          <div className="stamp-canvas-size-fields">
            <DsNumberInput
              key={`stamp-width:${draft.width}`}
              size="compact"
              aria-label="组合画布宽度"
              min={1}
              max={256}
              disabled={!editingAllowed}
              defaultValue={draft.width}
              onBlur={(event) => {
                const width = Math.max(
                  1,
                  Math.min(256, Math.floor(event.currentTarget.valueAsNumber)),
                )
                if (!Number.isFinite(width) || !commitCanvasSize(width, draft.height))
                  event.currentTarget.value = String(draft.width)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
            <span aria-hidden="true">×</span>
            <DsNumberInput
              key={`stamp-height:${draft.height}`}
              size="compact"
              aria-label="组合画布高度"
              min={1}
              max={256}
              disabled={!editingAllowed}
              defaultValue={draft.height}
              onBlur={(event) => {
                const height = Math.max(
                  1,
                  Math.min(256, Math.floor(event.currentTarget.valueAsNumber)),
                )
                if (!Number.isFinite(height) || !commitCanvasSize(draft.width, height))
                  event.currentTarget.value = String(draft.height)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          </div>
        </DsPropertyRow>
        <DsPropertyRow label="稳定 ID">
          <span className="mono">{draft.id}</span>
        </DsPropertyRow>
        <DsPropertyRow label="锚点">
          <span className="mono">
            r{draft.anchor.row} · c{draft.anchor.col}
          </span>
        </DsPropertyRow>
      </DsPropertyGrid>
      {props.template.origin === 'migrated' ? (
        <DsCheckbox
          label="接管为作者内容"
          checked={takeOwnership}
          onChange={(event) => {
            const checked = event.target.checked
            setTakeOwnership(checked)
            if (checked) commitDraft(draftRef.current, true)
          }}
        />
      ) : null}
    </div>
  )

  const palette = (
    <section className="stamp-tile-palette">
      {assets ? (
        <TilePalettePicker
          tilesetAriaLabel="组合绘制瓦片集"
          tilesetOptions={props.tilesets.map(({ id, name }) => ({
            value: id,
            label: `${name} · ${id}`,
          }))}
          selectedTilesetId={selectedTilesetId}
          onSelectTileset={setSelectedTilesetId}
          ariaLabel="组合瓦片列表"
          entries={[...selectedTiles.entries()].sort((left, right) => left[0] - right[0])}
          palette={assets.palette}
          selectedTileId={selectedTileId}
          onPick={(tileId) => {
            setSelectedTileId(tileId)
            setTool('brush')
          }}
        />
      ) : (
        <p className="hint2">正在载入瓦片…</p>
      )}
    </section>
  )

  const activeLayerName = activeLayer?.name ?? '未选图层'
  const toolbarHint = !editingAllowed
    ? `${activeLayerName} · 预置只读，请先接管为作者内容`
    : activeLayerReadOnly
      ? `${activeLayerName} · ${hiddenLayerIds.has(activeLayerId) ? '已隐藏' : '已锁定'} · 只读`
      : tool === 'pan'
        ? `${activeLayerName} · 平移`
        : tool === 'select'
          ? `${activeLayerName} · 选择`
          : tool === 'eyedropper'
            ? `${activeLayerName} · 取样瓦片与实例高度`
            : tool === 'collision'
              ? `${collisionPaint === 'set' ? '标记' : '清除'}碰撞`
              : `${activeLayerName} · 高度 ${paintHeight} · ${tool === 'fill' ? '填充' : tool === 'rect' ? '矩形' : tool === 'erase' ? '擦除' : '笔刷'}`

  return (
    <>
      {props.layersHost ? createPortal(layerControls, props.layersHost) : null}
      {props.propertiesHost ? (
        <DsInspectorPortal host={props.propertiesHost}>{properties}</DsInspectorPortal>
      ) : null}
      {props.paletteHost ? createPortal(palette, props.paletteHost) : null}
      <IsometricEditorSurface
        className="stamp-content-editor"
        viewportRef={wrapRef}
        toolbar={
          <IsometricEditorToolbar
            activeTool={tool}
            onToolChange={setTool}
            disabledTools={{
              brush: activeLayerReadOnly,
              rect: activeLayerReadOnly,
              fill: activeLayerReadOnly,
              erase: activeLayerReadOnly,
              collision: activeLayerReadOnly,
              eyedropper: !activeLayer,
            }}
            selectionOptions={
              <DsButton
                size="compact"
                variant="secondary"
                disabled={!editingAllowed || !selectedPoint}
                title={selectedPoint ? '将当前选中格设为组合锚点' : '先在画布中选择一个格子'}
                onClick={() =>
                  selectedPoint &&
                  updateDraft((current) => reanchorStampDraft(current, selectedPoint))
                }
              >
                设为锚点
              </DsButton>
            }
            paintTileControl={
              <CurrentPaintTileButton
                tilesetId={selectedTilesetId || undefined}
                tilesetName={props.tilesets.find(({ id }) => id === selectedTilesetId)?.name}
                tileId={selectedTileId}
                frame={selectedTiles.get(selectedTileId)}
                palette={assets?.palette}
                onOpenPicker={props.onOpenTilePalette}
              />
            }
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            paintHeight={paintHeight}
            maxPaintHeight={32}
            paintHeightDisabled={activeLayerReadOnly}
            onPaintHeightChange={setPaintHeight}
            collisionPaint={collisionPaint}
            onCollisionPaintChange={setCollisionPaint}
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            showCollision={showCollision}
            onShowCollisionChange={setShowCollision}
          />
        }
      >
        {error ? (
          <div className="stamp-error" role="alert">
            {error}
          </div>
        ) : null}
        {assets ? (
          <IsometricEditorCanvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            label="组合地图编辑画布"
            scene={{
              map: draft,
              tilesets: assets.tilesets,
              palette: assets.palette,
              view,
              showGrid,
              showCollision,
              hiddenLayerIds,
              ...(focusEnabled && activeLayer
                ? { focus: { layerId: activeLayer.id, height: viewHeight } }
                : {}),
            }}
            drawOverlay={drawOverlay}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => {
              hoverRef.current = undefined
              setHoverPoint(undefined)
            }}
            style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
          />
        ) : null}
        <IsometricViewportStatus context={toolbarHint} zoom={view.zoom} pointer={hoverPoint} />
      </IsometricEditorSurface>
    </>
  )
}

export { createBlankStampDraft }
