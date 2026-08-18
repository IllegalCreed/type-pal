import type { AssetCatalogV1, StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import {
  Canvas2DRenderer,
  isLatticeInside,
  latticeCenter,
  latticeInMapRect,
  pixelToLattice,
} from '@type-pal/reforge'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  type IsometricBrushSize,
  isometricBrushPoints,
} from '../core/isometric-brush.js'
import { floodFillIsometricTiles } from '../core/isometric-fill.js'
import type { GridPointRef } from '../core/map-selection.js'
import { nudgeIsometricLattice } from '../core/map-transform.js'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  deleteStampDraftLayer,
  eraseStampDraftCollision,
  eraseStampDraftVisual,
  moveStampDraftLayer,
  moveStampDraftSelection,
  nextStampLayerSlotId,
  openStampDraft,
  reanchorStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
  stampDraftPoint,
  stampDraftPointKey,
  updateStampDraftLayer,
} from '../core/stamp-draft.js'
import { stampDraftMapAdapter } from '../core/stamp-draft-map.js'
import {
  DsButton,
  DsCheckbox,
  DsDialog,
  DsIconButton,
  DsSelect,
  DsTextInput,
} from './design-system/index.js'
import { IsometricEditorCanvas } from './IsometricEditorCanvas.js'
import { IsometricEditorSurface } from './IsometricEditorSurface.js'
import { type IsometricEditorTool, IsometricEditorToolbar } from './IsometricEditorToolbar.js'
import {
  drawIsometricMapBase,
  type IsometricMapBaseCache,
} from './isometric-map-render.js'
import { LayerStackControls } from './LayerStackControls.js'
import { drawMapSelectionOverlay } from './map-selection-overlay.js'
import { loadStampPreviewAssets, type StampPreviewAssets } from './StampPreviewCanvas.js'
import { mapBoxOf, useStageSize, useViewZoomPan } from './scene-stage.js'
import { TilePickerGrid } from './TilePickerGrid.js'

function parsePointKey(key: string): GridPointRef {
  const [row, col] = key.split(':').map(Number)
  return { row: row!, col: col! }
}

export function StampContentEditor(props: {
  template: StampTemplateV1
  mode: 'create' | 'edit'
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  paletteHost?: HTMLElement | null
  propertiesHost?: HTMLElement | null
  layersHost?: HTMLElement | null
  onSave: (template: StampTemplateV1, takeOwnership: boolean) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [baseline] = useState(() => openStampDraft(props.template))
  const [draft, setDraft] = useState(() => openStampDraft(props.template))
  const [activeSlotId, setActiveSlotId] = useState(props.template.layerSlots[0]?.id ?? '')
  const [tool, setTool] = useState<IsometricEditorTool>('brush')
  const [selectedTileId, setSelectedTileId] = useState(props.template.visual[0]?.tileId ?? 0)
  const [height, setHeight] = useState(props.template.visual[0]?.height ?? 0)
  const [collisionValue, setCollisionValue] = useState(1)
  const [collisionPaint, setCollisionPaint] = useState<'set' | 'clear'>('set')
  const [includeCollision, setIncludeCollision] = useState(true)
  const [brushSize, setBrushSize] = useState<IsometricBrushSize>(1)
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [panning, setPanning] = useState(false)
  const [paintTick, setPaintTick] = useState(0)
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(() => new Set())
  const [assets, setAssets] = useState<StampPreviewAssets>()
  const [assetError, setAssetError] = useState('')
  const [error, setError] = useState('')
  const [tileQuery, setTileQuery] = useState('')
  const [tileLimit, setTileLimit] = useState(120)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string>()
  const [hiddenSlotIds, setHiddenSlotIds] = useState<Set<string>>(() => new Set())
  const [lockedSlotIds, setLockedSlotIds] = useState<Set<string>>(() => new Set())
  const [takeoverOpen, setTakeoverOpen] = useState(false)
  const stageCanvasRef = useRef<HTMLCanvasElement>(null)
  const stageWrapRef = useRef<HTMLDivElement>(null)
  const stageSize = useStageSize(stageWrapRef, 120)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef: stageCanvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const hoverPointRef = useRef<GridPointRef | undefined>(undefined)
  const baseCanvasCacheRef = useRef<IsometricMapBaseCache | undefined>(undefined)
  const rendererRef = useRef<
    | {
        context: CanvasRenderingContext2D
        assets: StampPreviewAssets
        renderer: Canvas2DRenderer
      }
    | undefined
  >(undefined)
  const fittedRef = useRef(false)
  const paintedPointRef = useRef<string | undefined>(undefined)
  const rectStartPointRef = useRef<GridPointRef | undefined>(undefined)
  const panStartRef = useRef<
    | {
        clientX: number
        clientY: number
        panX: number
        panY: number
      }
    | undefined
  >(undefined)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const tileset = props.tilesets.find((candidate) => candidate.id === draft.tilesetId)
  const revision = tileset
    ? (props.assetCatalog.assets[tileset.asset]?.sha256 ?? 'missing')
    : 'missing'
  const activeSlot = draft.layerSlots.find((slot) => slot.id === activeSlotId)
  const activeSlotHidden = hiddenSlotIds.has(activeSlotId)
  const activeSlotLocked = lockedSlotIds.has(activeSlotId)
  const draftMap = useMemo(() => stampDraftMapAdapter(draft), [draft])

  useEffect(() => props.onDirtyChange?.(dirty), [dirty, props.onDirtyChange])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (activeSlot?.depthMode === 'flat') setHeight(0)
  }, [activeSlot?.depthMode])
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection belongs to the active layer identity and resets when it changes.
  useEffect(() => {
    setSelectedPointKeys(new Set())
  }, [activeSlotId])

  useEffect(() => {
    let alive = true
    setAssets(undefined)
    setAssetError('')
    if (!tileset) {
      setAssetError(`来源瓦片集 “${draft.tilesetId}” 不存在。`)
      return
    }
    void loadStampPreviewAssets(props.assetBase, props.assetReader, tileset, revision).then(
      (next) => {
        if (!alive) return
        setAssets(next)
        if (next.frames.size === 0) {
          setAssetError(`瓦片集 “${draft.tilesetId}” 没有可用瓦片。`)
        }
      },
      (cause) => {
        if (alive) setAssetError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
    }
  }, [
    draft.tilesetId,
    props.assetBase,
    props.assetReader,
    revision,
    tileset,
  ])

  useEffect(() => {
    const firstTileId = [...(assets?.frames.keys() ?? [])].sort((left, right) => left - right)[0]
    if (firstTileId === undefined) return
    setSelectedTileId((current) => (assets?.frames.has(current) ? current : firstTileId))
    if (props.mode === 'create' && draft.visual.length === 0 && activeSlotId)
      setDraft((current) =>
        current.visual.length
          ? current
          : setStampDraftVisual(current, activeSlotId, { row: 0, col: 0 }, firstTileId, 0),
      )
  }, [activeSlotId, assets, draft.visual.length, props.mode])

  const update = (produce: (current: StampTemplateV1) => StampTemplateV1): void => {
    try {
      setDraft((current) => produce(current))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const selectedPoints = useMemo(
    () => [...selectedPointKeys].map(parsePointKey),
    [selectedPointKeys],
  )
  const activeVisualByPoint = useMemo(
    () =>
      new Map(
        draft.visual
          .filter((member) => member.layerSlotId === activeSlotId && !activeSlotHidden)
          .map((member) => [stampDraftPointKey(stampDraftPoint(member.offset)), member] as const),
      ),
    [activeSlotHidden, activeSlotId, draft.visual],
  )
  const isDraftPointInside = (point: GridPointRef): boolean =>
    isLatticeInside(draftMap.map, draftMap.toMapPoint(point))
  const tileEntries = useMemo(() => {
    const needle = tileQuery.trim()
    return [...(assets?.frames.entries() ?? [])]
      .filter(([tileId]) => !needle || String(tileId).includes(needle))
      .sort((left, right) => left[0] - right[0])
  }, [assets, tileQuery])

  const paintVisualPoints = (points: readonly GridPointRef[]): void =>
    update((current) =>
      points.reduce(
        (next, point) =>
          setStampDraftVisual(
            next,
            activeSlotId,
            point,
            selectedTileId,
            activeSlot?.depthMode === 'height' ? height : 0,
          ),
        current,
      ),
    )

  const fillVisualAt = (point: GridPointRef): void => {
    const seed = activeVisualByPoint.get(stampDraftPointKey(point))
    const replacementHeight = activeSlot?.depthMode === 'height' ? height : 0
    if (seed?.tileId === selectedTileId && (seed?.height ?? 0) === replacementHeight) return
    const filled = floodFillIsometricTiles({
      start: point,
      isInside: isDraftPointInside,
      sampleAt: (candidate) => {
        const member = activeVisualByPoint.get(stampDraftPointKey(candidate))
        return member
          ? { tileId: member.tileId, height: member.height }
          : { tileId: null, height: 0 }
      },
    })
    paintVisualPoints(filled)
  }

  const handleCell = (point: GridPointRef): void => {
    if (tool === 'pan' || tool === 'rect') return
    const key = stampDraftPointKey(point)
    if (tool === 'select') {
      setSelectedPointKeys((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      return
    }
    if (tool === 'collision') {
      update((current) =>
        collisionPaint === 'clear'
          ? eraseStampDraftCollision(current, point)
          : setStampDraftCollision(current, point, collisionValue),
      )
      return
    }
    if (activeSlotHidden || activeSlotLocked) {
      setError(activeSlotHidden ? '当前视觉层已隐藏，请先显示后再编辑。' : '当前视觉层已锁定。')
      return
    }
    if (!activeSlotId) {
      setError('请先选择一个视觉层。')
      return
    }
    if (tool === 'eyedropper') {
      const member = activeVisualByPoint.get(key)
      if (!member) {
        setError('当前格没有可取样的瓦片。')
        return
      }
      setSelectedTileId(member.tileId)
      setHeight(member.height)
      setError('')
      return
    }
    if (tool === 'fill') {
      fillVisualAt(point)
      return
    }
    if (tool === 'brush') {
      paintVisualPoints(
        isometricBrushPoints(point, brushSize).filter(isDraftPointInside),
      )
      return
    }
    update((current) =>
      tool === 'erase'
        ? eraseStampDraftVisual(current, activeSlotId, point)
        : setStampDraftVisual(
            current,
            activeSlotId,
            point,
            selectedTileId,
            activeSlot?.depthMode === 'height' ? height : 0,
          ),
    )
  }

  const paintVisualRect = (start: GridPointRef, end: GridPointRef): void => {
    if (!activeSlotId || activeSlotHidden || activeSlotLocked) {
      setError(
        !activeSlotId
          ? '请先选择一个视觉层。'
          : activeSlotHidden
            ? '当前视觉层已隐藏，请先显示后再编辑。'
            : '当前视觉层已锁定。',
      )
      return
    }
    const startCenter = latticeCenter(draftMap.toMapPoint(start))
    const endCenter = latticeCenter(draftMap.toMapPoint(end))
    paintVisualPoints(
      latticeInMapRect(
        draftMap.map,
        startCenter.x,
        startCenter.y,
        endCenter.x,
        endCenter.y,
      ).map(draftMap.toDraftPoint),
    )
  }

  const moveSelection = (direction: 'up' | 'down' | 'left' | 'right'): void => {
    if (!selectedPoints.length) {
      setError('请先用“选择”工具选中一个或多个格子。')
      return
    }
    update((current) => {
      let next = moveStampDraftSelection(
        current,
        { kind: 'visual', layerSlotId: activeSlotId },
        selectedPoints,
        direction,
      )
      if (includeCollision)
        next = moveStampDraftSelection(next, { kind: 'collision' }, selectedPoints, direction)
      return next
    })
    setSelectedPointKeys(
      new Set(
        selectedPoints.map((point) => stampDraftPointKey(nudgeIsometricLattice(point, direction))),
      ),
    )
  }

  const pointFromStagePointer = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): GridPointRef | undefined => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return undefined
    const current = viewRef.current
    const worldX =
      ((event.clientX - rect.left) * (canvas.width / rect.width)) / current.zoom + current.panX
    const worldY =
      ((event.clientY - rect.top) * (canvas.height / rect.height)) / current.zoom + current.panY
    const point = pixelToLattice(worldX, worldY)
    return isLatticeInside(draftMap.map, point) ? draftMap.toDraftPoint(point) : undefined
  }

  const setStageHover = (point: GridPointRef | undefined): void => {
    const previous = hoverPointRef.current
    if (previous?.row === point?.row && previous?.col === point?.col) return
    hoverPointRef.current = point
    setPaintTick((tick) => tick + 1)
  }

  useEffect(() => {
    if (!assets || fittedRef.current) return
    fittedRef.current = true
    const box = mapBoxOf(draftMap.map, undefined)
    const width = Math.max(1, box.maxX - box.minX)
    const height = Math.max(1, box.maxY - box.minY)
    const zoom = Math.max(0.05, Math.min(stageSize.w / width, stageSize.h / height, 3))
    setView({
      zoom,
      panX: box.minX - (stageSize.w / zoom - width) / 2,
      panY: box.minY - (stageSize.h / zoom - height) / 2,
    })
  }, [assets, draftMap.map, setView, stageSize])

  useEffect(() => {
    void stageSize
    void paintTick
    const canvas = stageCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !assets) return
    // Lightweight component-test contexts intentionally omit the native back-reference.
    if (!(context as CanvasRenderingContext2D & { canvas?: HTMLCanvasElement }).canvas) return
    if (rendererRef.current?.context !== context || rendererRef.current.assets !== assets)
      rendererRef.current = {
        context,
        assets,
        renderer: new Canvas2DRenderer(context, assets.palette, assets.frames),
      }
    const renderer = rendererRef.current.renderer
    baseCanvasCacheRef.current = drawIsometricMapBase(
      context,
      {
        map: draftMap.map,
        assets: { renderer, tiles: assets.frames },
        view,
        showGrid,
        showCollision,
        hiddenLayerIds: hiddenSlotIds,
        ...(activeSlotId ? { focus: { layerId: activeSlotId } } : {}),
      },
      baseCanvasCacheRef.current,
    )

    const selectedMapPoints = [...selectedPointKeys].map((key) =>
      draftMap.toMapPoint(parsePointKey(key)),
    )
    drawMapSelectionOverlay(
      context,
      {
        kind: 'cells',
        visualSlots: [],
        gridPoints: selectedMapPoints,
        hitScope: 'active-layer',
      },
      view,
    )

    const drawDiamond = (
      point: GridPointRef,
      colors: { fill?: string; stroke: string },
      lineWidth = 1.5,
    ): void => {
      const center = latticeCenter(point)
      const cx = (center.x - view.panX) * view.zoom
      const cy = (center.y - view.panY) * view.zoom
      const rx = 16 * view.zoom
      const ry = 8 * view.zoom
      context.beginPath()
      context.moveTo(cx, cy - ry)
      context.lineTo(cx + rx, cy)
      context.lineTo(cx, cy + ry)
      context.lineTo(cx - rx, cy)
      context.closePath()
      if (colors.fill) {
        context.fillStyle = colors.fill
        context.fill()
      }
      context.strokeStyle = colors.stroke
      context.lineWidth = lineWidth
      context.stroke()
    }

    if (showCollision)
      for (const collision of draft.collision) {
        if (collision.value !== 0) continue
        drawDiamond(draftMap.toMapPoint(stampDraftPoint(collision.offset)), {
          fill: 'rgba(65, 155, 255, 0.18)',
          stroke: '#6eb0ff',
        })
      }

    const hoverPoint = hoverPointRef.current
    if (tool === 'brush' && hoverPoint)
      for (const point of isometricBrushPoints(hoverPoint, brushSize).filter(isDraftPointInside))
        drawDiamond(draftMap.toMapPoint(point), { stroke: 'rgba(255,255,255,0.92)' })

    const anchor = latticeCenter(draftMap.anchor)
    const anchorX = (anchor.x - view.panX) * view.zoom
    const anchorY = (anchor.y - view.panY) * view.zoom
    context.beginPath()
    context.arc(anchorX, anchorY, Math.max(3.5, 3.5 * view.zoom), 0, Math.PI * 2)
    context.fillStyle = '#59d8ff'
    context.fill()
    context.strokeStyle = '#07131d'
    context.lineWidth = 1
    context.stroke()
  }, [
    activeSlotId,
    assets,
    brushSize,
    draft.collision,
    draftMap,
    hiddenSlotIds,
    paintTick,
    selectedPointKeys,
    showCollision,
    showGrid,
    stageSize,
    tool,
    view,
  ])

  const save = (takeOwnership: boolean): void => {
    try {
      if (!assets) throw new Error(assetError || '瓦片集尚未载入，暂时不能保存。')
      const canonical = canonicalizeStampDraft(
        {
          ...draft,
          origin: baseline.origin === 'migrated' ? 'authored' : draft.origin,
        },
        new Set(assets.frames.keys()),
      )
      props.onSave(canonical, takeOwnership)
      setError('')
      setTakeoverOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setTakeoverOpen(false)
    }
  }

  const tilePalette = (
    <section className="stamp-draft-palette" aria-label="组合瓦片面板">
      <header>
        <div>
          <strong>选择瓦片</strong>
          <span>
            {assets ? `${assets.frames.size} 块 · 当前 #${selectedTileId}` : '正在载入瓦片…'}
          </span>
        </div>
        <DsTextInput
          size="compact"
          aria-label="筛选组合瓦片"
          placeholder="筛选 tileId…"
          value={tileQuery}
          onChange={(event) => {
            setTileQuery(event.target.value)
            setTileLimit(120)
          }}
        />
      </header>
      {assets ? (
        <TilePickerGrid
          ariaLabel="组合瓦片列表"
          entries={tileEntries.slice(0, tileLimit)}
          palette={assets.palette}
          selectedTileId={selectedTileId}
          onPick={(tileId) => {
            setSelectedTileId(tileId)
            setTool('brush')
          }}
        />
      ) : (
        <p className="hint2 map-panel-empty">正在载入瓦片…</p>
      )}
      {tileEntries.length > tileLimit ? (
        <DsButton size="compact" onClick={() => setTileLimit((current) => current + 120)}>
          再显示 120 个
        </DsButton>
      ) : null}
    </section>
  )
  const metadataFields = (
    <div className="stamp-content-editor__metadata">
      <DsTextInput
        size="compact"
        aria-label="组合名称"
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
      />
      <DsTextInput
        size="compact"
        aria-label="组合分类"
        placeholder="未分类"
        value={draft.category ?? ''}
        onChange={(event) =>
          setDraft((current) => ({ ...current, category: event.target.value || undefined }))
        }
      />
      <p className="hint2">组合内容保存后只影响未来放置；地图中的既有组合保持快照。</p>
      <div className="stamp-template-actions">
        <DsButton
          onClick={() => {
            if (props.mode === 'create') {
              props.onCancel()
              return
            }
            setDraft(baseline)
            setSelectedPointKeys(new Set())
            setError('')
          }}
          disabled={props.mode === 'edit' && !dirty}
        >
          {props.mode === 'create' ? '取消新建' : '恢复已保存'}
        </DsButton>
        <DsButton
          variant="primary"
          icon="save"
          disabled={!dirty && props.mode === 'edit'}
          onClick={() => (baseline.origin === 'migrated' ? setTakeoverOpen(true) : save(false))}
        >
          保存组合
        </DsButton>
      </div>
    </div>
  )
  const maxDraftHeight = Math.max(8, ...draft.visual.map((member) => member.height))
  const layerStack = (
    <LayerStackControls
      items={[...draft.layerSlots].reverse().map((slot) => {
        const index = draft.layerSlots.findIndex((candidate) => candidate.id === slot.id)
        const count = draft.visual.filter((member) => member.layerSlotId === slot.id).length
        return {
          id: slot.id,
          name: slot.name,
          detail: `${count} 格 · ${slot.id}`,
          hidden: hiddenSlotIds.has(slot.id),
          locked: lockedSlotIds.has(slot.id),
          canMoveUp: index < draft.layerSlots.length - 1,
          canMoveDown: index > 0,
        }
      })}
      activeId={activeSlotId}
      onSelect={(id) => {
        setActiveSlotId(id)
      }}
      onAdd={() => {
        const id = nextStampLayerSlotId(draft)
        update((current) =>
          addStampDraftLayer(current, {
            id,
            name: `图层 ${current.layerSlots.length + 1}`,
            depthMode: 'height',
          }),
        )
        setActiveSlotId(id)
        setTool('brush')
      }}
      onDelete={() => {
        if (activeSlotId) setPendingDeleteSlotId(activeSlotId)
      }}
      deleteDisabled={draft.layerSlots.length <= 1 || activeSlotLocked}
      onToggleVisible={(id) =>
        setHiddenSlotIds((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      onToggleLocked={(id) =>
        setLockedSlotIds((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      onMove={(id, direction) =>
        update((current) => moveStampDraftLayer(current, id, direction === 'up' ? 1 : -1))
      }
      footer={
        activeSlot ? (
          <section className="map-paint-context stamp-layer-context" aria-label="图层属性">
            <div className="stamp-layer-editor-fields">
              <DsTextInput
                size="compact"
                aria-label={`图层 ${activeSlot.id} 名称`}
                value={activeSlot.name}
                onChange={(event) =>
                  update((current) =>
                    updateStampDraftLayer(current, activeSlot.id, { name: event.target.value }),
                  )
                }
              />
              <DsSelect
                size="compact"
                aria-label={`图层 ${activeSlot.id} 高度模式`}
                value={activeSlot.depthMode}
                options={[
                  { value: 'flat', label: '平面层' },
                  { value: 'height', label: '高度层' },
                ]}
                onValueChange={(value) =>
                  update((current) =>
                    updateStampDraftLayer(current, activeSlot.id, {
                      depthMode: value as 'flat' | 'height',
                    }),
                  )
                }
              />
            </div>
          </section>
        ) : undefined
      }
    />
  )

  return (
    <div className="stamp-content-editor" data-dirty={dirty || undefined}>
      {error || assetError ? (
        <div className="stamp-content-editor__error" role="alert">
          {error || assetError}
        </div>
      ) : null}

      {props.propertiesHost === undefined
        ? metadataFields
        : props.propertiesHost
          ? createPortal(metadataFields, props.propertiesHost)
          : null}

      {props.layersHost === undefined
        ? layerStack
        : props.layersHost
          ? createPortal(layerStack, props.layersHost)
          : null}

      {props.paletteHost === undefined
        ? tilePalette
        : props.paletteHost
          ? createPortal(tilePalette, props.paletteHost)
          : null}

      <IsometricEditorSurface
        className="stamp-draft-workbench"
        toolbarClassName="stamp-draft-toolbar"
        viewportRef={stageWrapRef}
        toolbar={
          <IsometricEditorToolbar
            activeTool={tool}
            selectionAriaLabel="选择组合内容"
            onToolChange={(nextTool) => {
              setTool(nextTool)
              if (nextTool === 'pan') setSelectedPointKeys(new Set())
            }}
            disabledTools={{
              eyedropper: !activeSlot || activeSlotHidden || activeSlotLocked,
              brush: !activeSlot || activeSlotHidden || activeSlotLocked,
              rect: !activeSlot || activeSlotHidden || activeSlotLocked,
              fill: !activeSlot || activeSlotHidden || activeSlotLocked,
              erase: !activeSlot || activeSlotHidden || activeSlotLocked,
            }}
            selectionOptions={
              <DsCheckbox
                size="compact"
                label="包含碰撞"
                title="移动选中格时同时移动碰撞值"
                checked={includeCollision}
                onChange={(event) => setIncludeCollision(event.target.checked)}
              />
            }
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            paintHeight={activeSlot?.depthMode === 'height' ? height : 0}
            maxPaintHeight={maxDraftHeight}
            paintHeightDisabled={!activeSlot || activeSlot.depthMode === 'flat' || activeSlotLocked}
            onPaintHeightChange={setHeight}
            collisionPaint={collisionPaint}
            onCollisionPaintChange={setCollisionPaint}
            collisionOptions={
              <DsSelect
                size="compact"
                aria-label="碰撞标记值"
                value={String(collisionValue)}
                options={[
                  { value: '0', label: '0 · 显式可通行' },
                  { value: '1', label: '1 · 阻挡' },
                ]}
                onValueChange={(value) => setCollisionValue(Number(value))}
              />
            }
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            showCollision={showCollision}
            onShowCollisionChange={setShowCollision}
          />
        }
        viewportClassName="stamp-draft-stage-scroll"
        footer={
          <footer className="stamp-draft-selection-bar">
            <span>
              {selectedPoints.length
                ? `已选 ${selectedPoints.length} 格`
                : '选择格子后可移动或设为锚点'}
            </span>
            <div>
              <DsIconButton
                size="compact"
                label="向左上移动"
                icon="chevron-left"
                onClick={() => moveSelection('left')}
              />
              <DsIconButton
                size="compact"
                label="向右上移动"
                icon="chevron-up"
                onClick={() => moveSelection('up')}
              />
              <DsIconButton
                size="compact"
                label="向左下移动"
                icon="chevron-down"
                onClick={() => moveSelection('down')}
              />
              <DsIconButton
                size="compact"
                label="向右下移动"
                icon="chevron-right"
                onClick={() => moveSelection('right')}
              />
              <DsButton
                size="compact"
                disabled={selectedPoints.length !== 1}
                onClick={() => {
                  update((current) => reanchorStampDraft(current, selectedPoints[0]!))
                  setSelectedPointKeys(new Set(['0:0']))
                }}
              >
                设为锚点
              </DsButton>
            </div>
          </footer>
        }
      >
        <IsometricEditorCanvas
          ref={stageCanvasRef}
          label="组合局部地图编辑画布"
          className="stamp-draft-stage"
          width={stageSize.w}
          height={stageSize.h}
          style={{
            width: '100%',
            height: '100%',
            cursor: panning
              ? 'grabbing'
              : tool === 'pan'
                ? 'grab'
                : tool === 'select'
                  ? 'default'
                  : tool === 'eyedropper'
                    ? 'copy'
                    : 'crosshair',
          }}
          onPointerDown={(event) => {
            if (tool === 'pan') {
              event.currentTarget.setPointerCapture(event.pointerId)
              const current = viewRef.current
              panStartRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
                panX: current.panX,
                panY: current.panY,
              }
              setPanning(true)
              return
            }
            const point = pointFromStagePointer(event)
            if (!point) return
            setStageHover(point)
            event.currentTarget.setPointerCapture(event.pointerId)
            if (tool === 'rect') {
              rectStartPointRef.current = point
              return
            }
            paintedPointRef.current = stampDraftPointKey(point)
            handleCell(point)
          }}
          onPointerMove={(event) => {
            const panStart = panStartRef.current
            if (tool === 'pan' && panStart && event.buttons & 1) {
              const rect = event.currentTarget.getBoundingClientRect()
              const scale =
                event.currentTarget.width / rect.width / Math.max(0.01, viewRef.current.zoom)
              setView((current) => ({
                ...current,
                panX: panStart.panX - (event.clientX - panStart.clientX) * scale,
                panY: panStart.panY - (event.clientY - panStart.clientY) * scale,
              }))
              return
            }
            const point = pointFromStagePointer(event)
            setStageHover(point)
            if (
              !(event.buttons & 1) ||
              tool === 'select' ||
              tool === 'eyedropper' ||
              tool === 'fill' ||
              tool === 'rect'
            )
              return
            if (!point) return
            const key = stampDraftPointKey(point)
            if (paintedPointRef.current === key) return
            paintedPointRef.current = key
            handleCell(point)
          }}
          onPointerUp={(event) => {
            if (tool === 'rect' && rectStartPointRef.current) {
              const end = pointFromStagePointer(event)
              if (end) paintVisualRect(rectStartPointRef.current, end)
            }
            paintedPointRef.current = undefined
            rectStartPointRef.current = undefined
            panStartRef.current = undefined
            setPanning(false)
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => {
            paintedPointRef.current = undefined
            rectStartPointRef.current = undefined
            panStartRef.current = undefined
            setPanning(false)
          }}
          onPointerLeave={() => setStageHover(undefined)}
          onContextMenu={(event) => event.preventDefault()}
        />
      </IsometricEditorSurface>

      {pendingDeleteSlotId ? (
        <DsDialog
          open
          title="删除视觉层？"
          description="该层的全部瓦片成员会从当前草稿移除；保存前仍可取消整个编辑。"
          onClose={() => setPendingDeleteSlotId(undefined)}
          footer={
            <>
              <DsButton onClick={() => setPendingDeleteSlotId(undefined)}>取消</DsButton>
              <DsButton
                variant="danger"
                onClick={() => {
                  const slotId = pendingDeleteSlotId
                  update((current) => deleteStampDraftLayer(current, slotId))
                  setPendingDeleteSlotId(undefined)
                  const next = draft.layerSlots.find((slot) => slot.id !== slotId)
                  if (next) setActiveSlotId(next.id)
                }}
              >
                删除图层
              </DsButton>
            </>
          }
        >
          <p>
            将删除“{draft.layerSlots.find((slot) => slot.id === pendingDeleteSlotId)?.name}”及其中的{' '}
            {draft.visual.filter((member) => member.layerSlotId === pendingDeleteSlotId).length}{' '}
            个成员。
          </p>
        </DsDialog>
      ) : null}

      {takeoverOpen ? (
        <DsDialog
          open
          title="接管预置组合？"
          description="确认保存后整项转为作者内容，迁移不再覆盖；撤销可恢复。"
          onClose={() => setTakeoverOpen(false)}
          footer={
            <>
              <DsButton onClick={() => setTakeoverOpen(false)}>取消</DsButton>
              <DsButton variant="primary" onClick={() => save(true)}>
                接管并保存
              </DsButton>
            </>
          }
        >
          <p>既有地图放置组仍是快照，不会随模板更新。</p>
        </DsDialog>
      ) : null}
    </div>
  )
}
