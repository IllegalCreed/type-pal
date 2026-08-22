import {
  mapInstanceHeight,
  type Palette,
  type ProjectMap,
  type TilesetFrameRegistry,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectMapPatch } from '../core/map-patch.js'
import type { MapSelection } from '../core/map-selection.js'
import { summarizeMapSelection } from '../core/map-selection.js'
import { DsControlGroup, DsIconButton, DsNumberInput, DsSelect } from './design-system/controls.js'
import { DsInspectorSection, DsPropertyGrid, DsPropertyRow } from './design-system/recipes.js'
import { MapContentSelectionPreview } from './MapContentSelectionPreview.js'

export interface MapSelectionInspectorProps {
  map: ProjectMap
  selection: Extract<MapSelection, { kind: 'cells' }>
  activeLayerId: string
  hiddenLayerIds: ReadonlySet<string>
  lockedLayerIds: ReadonlySet<string>
  tilesets?: TilesetFrameRegistry
  palette?: Palette
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
    tilesets,
    palette,
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
  const selectedTileIds = useMemo(
    () =>
      selection.visualSlots.flatMap((ref) => {
        const layer = layerById.get(ref.layerId)
        const tileId = layer?.tiles[ref.row]?.[ref.col]
        return tileId === null || tileId === undefined ? [] : [tileId]
      }),
    [selection.visualSlots, layerById],
  )
  const selectionPreviewTitle =
    selectedTileIds.length === 1
      ? `所选瓦片 #${selectedTileIds[0]}`
      : selectedTileIds.length > 1
        ? `所选内容 · ${selectedTileIds.length} 个瓦片实例`
        : '所选格点'
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
  const targetLayerName = layerById.get(effectiveTargetLayerId)?.name ?? effectiveTargetLayerId
  const eligibleHeightRefs = useMemo(
    () =>
      selection.visualSlots.filter((ref) => {
        const layer = layerById.get(ref.layerId)
        return layer?.tiles[ref.row]?.[ref.col] != null
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
          return [
            { channel: 'tileId' as const, ref, value: null },
            { channel: 'tilesetId' as const, ref, value: null },
            { channel: 'height' as const, ref, value: 0 },
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
      <DsInspectorSection
        className="map-selection-head"
        title="地图内容选区"
        description={`${summary.visualInstanceCount} 个视觉实例 · ${summary.gridPointCount} 个格点`}
        actions={
          <DsIconButton
            icon="close"
            label="清空地图选区"
            shortcut="Esc"
            size="compact"
            disabled={Boolean(editingBlockedReason)}
            onClick={onClearSelection}
          />
        }
      >
        <MapContentSelectionPreview
          map={map}
          visualSlots={selection.visualSlots}
          tilesets={tilesets}
          palette={palette}
          title={selectionPreviewTitle}
          subtitle={selectedLayers.map((layer) => layer.name).join('、') || '无视觉层'}
        />
        <DsPropertyGrid className="map-selection-summary">
          <DsPropertyRow label="槽位">
            <span className="mono">
              {summary.visualSlotCount}（空 {summary.emptySlotCount}）
            </span>
          </DsPropertyRow>
          <DsPropertyRow label="图层">
            {selectedLayers.map((layer) => layer.name).join('、') || '无视觉层'}
          </DsPropertyRow>
          {bounds ? (
            <DsPropertyRow label="范围">
              <span className="mono">
                r{bounds.minRow}:c{bounds.minCol} → r{bounds.maxRow}:c{bounds.maxCol}
              </span>
            </DsPropertyRow>
          ) : null}
        </DsPropertyGrid>
        {warning ? <p className="map-selection-warning">⚠ {warning}</p> : null}
      </DsInspectorSection>

      <DsInspectorSection title="视觉实例" description="分通道修改所选瓦片">
        <DsPropertyGrid>
          <DsPropertyRow
            label="瓦片"
            labelFor="map-selection-tile-id"
            help={
              fieldError?.field === 'tileId' ? (
                <span id="map-tile-field-error" className="map-field-error" role="alert">
                  {fieldError.message}
                </span>
              ) : undefined
            }
          >
            <DsControlGroup
              control={
                <DsNumberInput
                  id="map-selection-tile-id"
                  key={`tile:${mixedLabel(summary.tileId)}`}
                  min={0}
                  size="compact"
                  defaultValue={
                    summary.tileId.kind === 'single' && summary.tileId.value !== null
                      ? summary.tileId.value
                      : ''
                  }
                  placeholder={mixedLabel(summary.tileId)}
                  disabled={writeDisabled || selection.visualSlots.length === 0}
                  aria-label="选区 tileId"
                  invalid={fieldError?.field === 'tileId'}
                  aria-describedby={
                    fieldError?.field === 'tileId' ? 'map-tile-field-error' : undefined
                  }
                  onBlur={(event) => applyTileId(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              }
              actions={
                <DsIconButton
                  icon="delete"
                  label="清空所选视觉实例"
                  variant="danger"
                  size="compact"
                  disabled={writeDisabled || selection.visualSlots.length === 0}
                  onClick={clearTiles}
                />
              }
            />
          </DsPropertyRow>

          <DsPropertyRow
            label="高度"
            labelFor="map-selection-height"
            help={
              fieldError?.field === 'height' ? (
                <span id="map-height-field-error" className="map-field-error" role="alert">
                  {fieldError.message}
                </span>
              ) : skippedHeight ? (
                `仅修改有瓦片的实例；跳过 ${skippedHeight} 个空槽`
              ) : (
                '仅修改有瓦片的实例'
              )
            }
          >
            <DsControlGroup
              control={
                <DsNumberInput
                  id="map-selection-height"
                  key={`height:${mixedLabel(summary.height)}`}
                  min={0}
                  size="compact"
                  defaultValue={summary.height.kind === 'single' ? summary.height.value : ''}
                  placeholder={mixedLabel(summary.height)}
                  disabled={writeDisabled || eligibleHeightRefs.length === 0}
                  aria-label="选区实例高度"
                  invalid={fieldError?.field === 'height'}
                  aria-describedby={
                    fieldError?.field === 'height' ? 'map-height-field-error' : undefined
                  }
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
              }
              actions={
                <>
                  <DsIconButton
                    icon="chevron-down"
                    label="高度减 1"
                    size="compact"
                    disabled={writeDisabled || eligibleHeightRefs.length === 0}
                    onClick={() => applyHeight((height) => height - 1, '选区高度 -1')}
                  />
                  <DsIconButton
                    icon="chevron-up"
                    label="高度加 1"
                    size="compact"
                    disabled={writeDisabled || eligibleHeightRefs.length === 0}
                    onClick={() => applyHeight((height) => height + 1, '选区高度 +1')}
                  />
                </>
              }
            />
          </DsPropertyRow>

          <DsPropertyRow label="图层" labelFor="map-selection-target-layer">
            <DsControlGroup
              control={
                <DsSelect
                  id="map-selection-target-layer"
                  value={effectiveTargetLayerId}
                  size="compact"
                  aria-label="选区目标图层"
                  disabled={writeDisabled || summary.visualInstanceCount === 0}
                  options={map.layers.map((layer) => ({
                    value: layer.id,
                    label: layer.name,
                    description: layer.id,
                    disabled: hiddenLayerIds.has(layer.id) || lockedLayerIds.has(layer.id),
                  }))}
                  onValueChange={setTargetLayerId}
                />
              }
              actions={
                <DsIconButton
                  icon="chevron-right"
                  label={`移动到图层：${targetLayerName}`}
                  size="compact"
                  disabled={
                    writeDisabled ||
                    summary.visualInstanceCount === 0 ||
                    !effectiveTargetLayerId ||
                    targetLayerUnavailable
                  }
                  onClick={() => onMoveToLayer(effectiveTargetLayerId)}
                />
              }
            />
          </DsPropertyRow>
        </DsPropertyGrid>
      </DsInspectorSection>

      <DsInspectorSection title="格点 / 碰撞" description="碰撞值独立于视觉层">
        <DsPropertyGrid>
          <DsPropertyRow
            label="碰撞值"
            labelFor="map-selection-collision"
            help={
              fieldError?.field === 'collision' ? (
                <span id="map-collision-field-error" className="map-field-error" role="alert">
                  {fieldError.message}
                </span>
              ) : undefined
            }
          >
            <DsNumberInput
              id="map-selection-collision"
              key={`collision:${mixedLabel(summary.collision)}`}
              min={0}
              size="compact"
              defaultValue={summary.collision.kind === 'single' ? summary.collision.value : ''}
              placeholder={mixedLabel(summary.collision)}
              disabled={writeDisabled || selection.gridPoints.length === 0}
              aria-label="选区 collision"
              invalid={fieldError?.field === 'collision'}
              aria-describedby={
                fieldError?.field === 'collision' ? 'map-collision-field-error' : undefined
              }
              onBlur={(event) => applyCollision(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          </DsPropertyRow>
        </DsPropertyGrid>
      </DsInspectorSection>

      {notice ? (
        <div
          className={`map-selection-notice${notice.kind === 'error' ? ' error' : ''}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.message}
        </div>
      ) : null}
    </>
  )
}
