import { mapInstanceHeight, type ProjectMapV2 } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectMapPatch } from '../core/map-patch.js'
import type { MapSelection } from '../core/map-selection.js'
import { summarizeMapSelection } from '../core/map-selection.js'

export interface MapSelectionInspectorProps {
  map: ProjectMapV2
  selection: Extract<MapSelection, { kind: 'cells' }>
  activeLayerId: string
  hiddenLayerIds: ReadonlySet<string>
  lockedLayerIds: ReadonlySet<string>
  editingBlockedReason?: string
  notice?: { kind: 'info' | 'error'; message: string }
  onPatch: (patch: ProjectMapPatch, requiredLayerIds: readonly string[], label: string) => void
  onValidationError: (message: string) => void
  onMoveToLayer: (targetLayerId: string) => void
  onClearSelection: () => void
}

function mixedLabel(value: ReturnType<typeof summarizeMapSelection>['tileId']): string {
  if (value.kind === 'mixed') return '混合'
  if (value.kind === 'empty') return '无值'
  return value.value === null ? '空' : String(value.value)
}

export function MapSelectionInspector(props: MapSelectionInspectorProps) {
  const {
    map,
    selection,
    activeLayerId,
    hiddenLayerIds,
    lockedLayerIds,
    editingBlockedReason,
    notice,
    onPatch,
    onValidationError,
    onMoveToLayer,
    onClearSelection,
  } = props
  const summary = useMemo(() => summarizeMapSelection(selection, map), [selection, map])
  const [targetLayerId, setTargetLayerId] = useState(activeLayerId)
  const [fieldError, setFieldError] = useState<
    { field: 'tileId' | 'height' | 'collision'; message: string } | undefined
  >()
  const previousSelection = useRef(selection)
  useEffect(() => {
    if (previousSelection.current === selection) return
    previousSelection.current = selection
    setFieldError(undefined)
  }, [selection])
  const layerById = useMemo(
    () => new Map(map.layers.map((layer) => [layer.id, layer] as const)),
    [map],
  )
  const selectedLayers = useMemo(
    () => summary.layerIds.map((id) => layerById.get(id)).filter((layer) => layer !== undefined),
    [summary.layerIds, layerById],
  )
  const selectedHidden = selectedLayers.filter((layer) => hiddenLayerIds.has(layer.id))
  const selectedLocked = selectedLayers.filter((layer) => lockedLayerIds.has(layer.id))
  useEffect(() => setTargetLayerId(activeLayerId), [activeLayerId])
  const activeHidden = hiddenLayerIds.has(activeLayerId)
  const activeLocked = lockedLayerIds.has(activeLayerId)
  const writeDisabled =
    Boolean(editingBlockedReason) ||
    activeHidden ||
    activeLocked ||
    selectedHidden.length > 0 ||
    selectedLocked.length > 0
  const requiredLayerIds = summary.layerIds.length ? summary.layerIds : [activeLayerId]
  const effectiveTargetLayerId = layerById.has(targetLayerId) ? targetLayerId : activeLayerId
  const targetLayerUnavailable =
    !layerById.has(effectiveTargetLayerId) ||
    hiddenLayerIds.has(effectiveTargetLayerId) ||
    lockedLayerIds.has(effectiveTargetLayerId)
  const eligibleHeightRefs = useMemo(
    () =>
      selection.visualSlots.filter((ref) => {
        const layer = layerById.get(ref.layerId)
        return layer?.depthMode === 'height' && layer.tiles[ref.row]?.[ref.col] != null
      }),
    [selection.visualSlots, layerById],
  )
  const skippedHeight = selection.visualSlots.length - eligibleHeightRefs.length
  const bounds = summary.bounds
  const warning = editingBlockedReason
    ? editingBlockedReason
    : activeHidden
      ? '当前活动层已隐藏；请显式显示或切换图层后再修改。'
      : activeLocked
        ? '当前活动层已锁定；请显式解锁或切换图层后再修改。'
        : selectedHidden.length
          ? `选区含 ${selectedHidden.length} 个隐藏层成员，整笔修改已禁用。`
          : selectedLocked.length
            ? `选区含 ${selectedLocked.length} 个锁定层成员，整笔修改已禁用。`
            : undefined

  const applyTileId = (raw: string): void => {
    if (!raw.trim()) {
      setFieldError(undefined)
      return
    }
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) {
      const message = 'tileId 必须是非负整数。'
      setFieldError({ field: 'tileId', message })
      onValidationError(message)
      return
    }
    setFieldError(undefined)
    onPatch(
      {
        visual: selection.visualSlots.map((ref) => ({ channel: 'tileId', ref, value })),
        collision: [],
      },
      requiredLayerIds,
      `选区瓦片设为 #${value}`,
    )
  }

  const clearTiles = (): void => {
    onPatch(
      {
        visual: selection.visualSlots.flatMap((ref) => {
          const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
          return [
            { channel: 'tileId' as const, ref, value: null },
            ...(layer?.depthMode === 'height'
              ? [{ channel: 'height' as const, ref, value: 0 }]
              : []),
          ]
        }),
        collision: [],
      },
      requiredLayerIds,
      '清空选区视觉实例',
    )
  }

  const applyHeight = (value: number | ((current: number) => number), label: string): void => {
    setFieldError(undefined)
    onPatch(
      {
        visual: eligibleHeightRefs.map((ref) => {
          const layer = map.layers.find((candidate) => candidate.id === ref.layerId)!
          const current = mapInstanceHeight(layer, ref.row, ref.col)
          const next = typeof value === 'function' ? value(current) : value
          return { channel: 'height' as const, ref, value: Math.max(0, Math.floor(next)) }
        }),
        collision: [],
      },
      requiredLayerIds,
      label,
    )
  }

  const applyCollision = (raw: string): void => {
    if (!raw.trim()) {
      setFieldError(undefined)
      return
    }
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) {
      const message = 'collision 必须是非负整数。'
      setFieldError({ field: 'collision', message })
      onValidationError(message)
      return
    }
    setFieldError(undefined)
    onPatch(
      {
        visual: [],
        collision: selection.gridPoints.map((ref) => ({ ref, value })),
      },
      [activeLayerId],
      `选区碰撞设为 ${value}`,
    )
  }

  return (
    <>
      <div className="insp-head map-selection-head">
        <div className="what">地图内容选区</div>
        <div className="who">
          {summary.visualInstanceCount} 个视觉实例 · {summary.gridPointCount} 个格点
        </div>
        <button
          type="button"
          className="mini"
          disabled={Boolean(editingBlockedReason)}
          onClick={onClearSelection}
          title={editingBlockedReason ?? '清空选区 (Esc)'}
        >
          清空
        </button>
      </div>
      <div className="section map-selection-summary">
        <h4>摘要</h4>
        <div className="field">
          <span className="field-label">槽位</span>
          <span className="mono">
            {summary.visualSlotCount}（空 {summary.emptySlotCount}）
          </span>
        </div>
        <div className="field">
          <span className="field-label">图层</span>
          <span>{selectedLayers.map((layer) => layer.name).join('、') || '无视觉层'}</span>
        </div>
        {bounds ? (
          <div className="field">
            <span className="field-label">范围</span>
            <span className="mono">
              r{bounds.minRow}:c{bounds.minCol} → r{bounds.maxRow}:c{bounds.maxCol}
            </span>
          </div>
        ) : null}
        {warning ? <p className="map-selection-warning">⚠ {warning}</p> : null}
      </div>
      <div className="section">
        <h4>
          视觉实例 <span className="b2">分通道修改</span>
        </h4>
        <div className="field map-selection-field">
          <span className="field-label">tileId</span>
          <input
            key={`tile:${mixedLabel(summary.tileId)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={
              summary.tileId.kind === 'single' && summary.tileId.value !== null
                ? summary.tileId.value
                : ''
            }
            placeholder={mixedLabel(summary.tileId)}
            disabled={writeDisabled || selection.visualSlots.length === 0}
            aria-label="选区 tileId"
            aria-invalid={fieldError?.field === 'tileId'}
            aria-describedby={fieldError?.field === 'tileId' ? 'map-tile-field-error' : undefined}
            onBlur={(event) => applyTileId(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {fieldError?.field === 'tileId' ? (
            <span id="map-tile-field-error" className="map-field-error">
              {fieldError.message}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="tool map-inline-action"
          disabled={writeDisabled || selection.visualSlots.length === 0}
          onClick={clearTiles}
        >
          清空视觉实例
        </button>
        <div className="field map-selection-field">
          <span className="field-label">高度</span>
          <input
            key={`height:${mixedLabel(summary.height)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={summary.height.kind === 'single' ? summary.height.value : ''}
            placeholder={mixedLabel(summary.height)}
            disabled={writeDisabled || eligibleHeightRefs.length === 0}
            aria-label="选区实例高度"
            aria-invalid={fieldError?.field === 'height'}
            aria-describedby={fieldError?.field === 'height' ? 'map-height-field-error' : undefined}
            onBlur={(event) => {
              if (!event.currentTarget.value.trim()) {
                setFieldError(undefined)
                return
              }
              const value = Number(event.currentTarget.value)
              if (!Number.isInteger(value) || value < 0) {
                const message = '高度必须是非负整数。'
                setFieldError({ field: 'height', message })
                onValidationError(message)
                return
              }
              applyHeight(value, `选区高度设为 ${value}`)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {fieldError?.field === 'height' ? (
            <span id="map-height-field-error" className="map-field-error">
              {fieldError.message}
            </span>
          ) : null}
        </div>
        <div className="map-step-actions">
          <button
            type="button"
            className="mini"
            disabled={writeDisabled || eligibleHeightRefs.length === 0}
            onClick={() => applyHeight((height) => height - 1, '选区高度 -1')}
          >
            −1
          </button>
          <button
            type="button"
            className="mini"
            disabled={writeDisabled || eligibleHeightRefs.length === 0}
            onClick={() => applyHeight((height) => height + 1, '选区高度 +1')}
          >
            ＋1
          </button>
          <span className="hint2">
            {skippedHeight ? `跳过 ${skippedHeight} 个空槽/平面实例` : '仅改实例高度'}
          </span>
        </div>
        <div className="field map-selection-field">
          <span className="field-label">移到层</span>
          <select
            className="in"
            value={effectiveTargetLayerId}
            aria-label="选区目标图层"
            disabled={writeDisabled || summary.visualInstanceCount === 0}
            onChange={(event) => setTargetLayerId(event.target.value)}
          >
            {map.layers.map((layer) => (
              <option
                key={layer.id}
                value={layer.id}
                disabled={hiddenLayerIds.has(layer.id) || lockedLayerIds.has(layer.id)}
              >
                {layer.name} · {layer.depthMode === 'height' ? '高度' : '平面'}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="tool map-inline-action"
          disabled={
            writeDisabled ||
            summary.visualInstanceCount === 0 ||
            !effectiveTargetLayerId ||
            targetLayerUnavailable
          }
          onClick={() => onMoveToLayer(effectiveTargetLayerId)}
        >
          移动到目标层…
        </button>
      </div>
      <div className="section">
        <h4>
          格点 / 碰撞 <span className="b2">独立于视觉层</span>
        </h4>
        <div className="field map-selection-field">
          <span className="field-label">collision</span>
          <input
            key={`collision:${mixedLabel(summary.collision)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={summary.collision.kind === 'single' ? summary.collision.value : ''}
            placeholder={mixedLabel(summary.collision)}
            disabled={writeDisabled || selection.gridPoints.length === 0}
            aria-label="选区 collision"
            aria-invalid={fieldError?.field === 'collision'}
            aria-describedby={
              fieldError?.field === 'collision' ? 'map-collision-field-error' : undefined
            }
            onBlur={(event) => applyCollision(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {fieldError?.field === 'collision' ? (
            <span id="map-collision-field-error" className="map-field-error">
              {fieldError.message}
            </span>
          ) : null}
        </div>
      </div>
      <div className={`map-selection-notice${notice?.kind === 'error' ? ' error' : ''}`}>
        {notice?.message ?? '修改只作用于指定通道；每次提交是一笔撤销。'}
      </div>
    </>
  )
}
