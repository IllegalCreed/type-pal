import { mapInstanceHeight, type ProjectMap } from '@type-pal/reforge'
import { useMemo } from 'react'
import type { ProjectMapPatch } from '../core/map-patch.js'
import type { GridPointRef, StampGroupCellSelection, VisualSlotRef } from '../core/map-selection.js'
import { buildStampPlacementIndex } from '../core/stamp-ownership.js'

export interface StampPlacementSelectionInspectorProps {
  map: ProjectMap
  placementIds: readonly string[]
  activeLayerId: string
  hiddenLayerIds: ReadonlySet<string>
  lockedLayerIds: ReadonlySet<string>
  editingPlacementId?: string
  editingSelection?: StampGroupCellSelection
  notice?: { kind: 'info' | 'error'; message: string }
  onEnterEdit: (placementId: string) => void
  onExitEdit: () => void
  onUngroup: (placementIds: readonly string[]) => void
  onOpenSource?: (stampId?: string) => void
  onEdit: (input: {
    placementId: string
    patch: ProjectMapPatch
    removeVisualSlots?: readonly VisualSlotRef[]
    removeGridPoints?: readonly GridPointRef[]
    label: string
  }) => void
  onValidationError: (message: string) => void
}

function mixedValue(values: readonly number[]): number | '' {
  return values.length > 0 && values.every((value) => value === values[0]) ? values[0]! : ''
}

export function StampPlacementSelectionInspector(props: StampPlacementSelectionInspectorProps) {
  const {
    map,
    placementIds,
    activeLayerId,
    hiddenLayerIds,
    lockedLayerIds,
    editingPlacementId,
    editingSelection,
    notice,
    onEnterEdit,
    onExitEdit,
    onUngroup,
    onOpenSource,
    onEdit,
    onValidationError,
  } = props
  const index = useMemo(() => buildStampPlacementIndex(map), [map])
  const placements = placementIds.flatMap((id) => {
    const placement = index.byId.get(id)
    return placement ? [placement] : []
  })
  const single = placements.length === 1 ? placements[0] : undefined
  const editing = editingPlacementId ? index.byId.get(editingPlacementId) : undefined
  const layerCounts = new Map<string, number>()
  for (const placement of placements)
    for (const ref of placement.visualSlots)
      layerCounts.set(ref.layerId, (layerCounts.get(ref.layerId) ?? 0) + 1)
  const allLayerIds = [...layerCounts.keys()]
  const blockedLayerIds = allLayerIds.filter(
    (id) => hiddenLayerIds.has(id) || lockedLayerIds.has(id),
  )
  const activeLayer = map.layers.find((layer) => layer.id === activeLayerId)
  const selectedVisualKeys = new Set(
    editingSelection?.kind === 'cells'
      ? editingSelection.visualSlots.map((ref) => `${ref.layerId}:${ref.row}:${ref.col}`)
      : [],
  )
  const selectedGridKeys = new Set(
    editingSelection?.kind === 'cells'
      ? editingSelection.gridPoints.map((ref) => `${ref.row}:${ref.col}`)
      : [],
  )
  const activeVisual =
    editing?.visualSlots.filter(
      (ref) =>
        ref.layerId === activeLayerId &&
        selectedVisualKeys.has(`${ref.layerId}:${ref.row}:${ref.col}`),
    ) ?? []
  const selectedGridPoints =
    editing?.gridPoints.filter((ref) => selectedGridKeys.has(`${ref.row}:${ref.col}`)) ?? []
  const activeTiles = activeVisual.flatMap((ref) => {
    const value = activeLayer?.tiles[ref.row]?.[ref.col]
    return value === null || value === undefined ? [] : [value]
  })
  const activeHeights = activeVisual.flatMap((ref) => {
    if (!activeLayer || activeLayer.depthMode !== 'height') return []
    return [mapInstanceHeight(activeLayer, ref.row, ref.col)]
  })
  const collisionValues =
    selectedGridPoints.flatMap((ref) => {
      const value = map.collision[ref.row]?.[ref.col]
      return value === undefined ? [] : [value]
    }) ?? []
  const activeReadOnly =
    !activeLayer || hiddenLayerIds.has(activeLayerId) || lockedLayerIds.has(activeLayerId)
  const collisionBlockedLayerIds = [
    ...new Set(editing?.visualSlots.map((ref) => ref.layerId) ?? []),
  ].filter(
    (layerId) =>
      !map.layers.some((layer) => layer.id === layerId) ||
      hiddenLayerIds.has(layerId) ||
      lockedLayerIds.has(layerId),
  )
  const collisionReadOnly = collisionBlockedLayerIds.length > 0

  const parseNonNegative = (raw: string, field: string): number | undefined => {
    if (!raw.trim()) return undefined
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) {
      onValidationError(`${field} 必须是非负整数。`)
      return undefined
    }
    return value
  }

  if (!editing) {
    const visualCount = placements.reduce((sum, placement) => sum + placement.visualSlots.length, 0)
    const collisionCount = placements.reduce(
      (sum, placement) => sum + placement.gridPoints.length,
      0,
    )
    return (
      <>
        <div className="insp-head stamp-group-selection-head">
          <div className="what">图章放置组</div>
          <div className="who">
            {placements.length} 组 · {visualCount} 个视觉成员 · {collisionCount} 个碰撞成员
          </div>
        </div>
        <div className="section stamp-group-summary">
          <h4>{single?.sourceStampName ?? (single ? '未命名放置组' : '多组选择')}</h4>
          {single ? (
            <>
              <div className="field">
                <span className="field-label">组 ID</span>
                <code title={single.id}>{single.id}</code>
              </div>
              <div className="field">
                <span className="field-label">锚点</span>
                <span className="mono">
                  r{single.anchor.row}:c{single.anchor.col}
                </span>
              </div>
              <div className="field">
                <span className="field-label">来源</span>
                <span title={single.sourceStampId}>{single.sourceStampId ?? '来源模板已删除'}</span>
              </div>
            </>
          ) : null}
          <div className="stamp-group-layer-list">
            {[...layerCounts].map(([layerId, count]) => {
              const layer = map.layers.find((candidate) => candidate.id === layerId)
              return (
                <span key={layerId} className={blockedLayerIds.includes(layerId) ? 'blocked' : ''}>
                  {hiddenLayerIds.has(layerId) ? '◌' : lockedLayerIds.has(layerId) ? '🔒' : '◇'}{' '}
                  {layer?.name ?? layerId} · {count}
                </span>
              )
            })}
          </div>
          {blockedLayerIds.length > 0 ? (
            <p className="map-selection-warning">
              ⚠ 整组操作涉及 {blockedLayerIds.length} 个隐藏或锁定图层，当前只读。
            </p>
          ) : null}
        </div>
        <div className="section stamp-group-actions">
          <button
            type="button"
            className="stamp-primary-action"
            disabled={!single}
            title={single ? 'Enter / 双击也可进入' : '多组选区不能同时进入组内'}
            onClick={() => single && onEnterEdit(single.id)}
          >
            进入组内编辑
          </button>
          <button
            type="button"
            className="stamp-secondary-action"
            disabled={placements.length === 0 || blockedLayerIds.length > 0}
            onClick={() => onUngroup(placements.map((placement) => placement.id))}
          >
            解组（保留地图内容）
          </button>
          {single && onOpenSource ? (
            <button
              type="button"
              className="stamp-secondary-action"
              onClick={() => onOpenSource(single.sourceStampId)}
            >
              在图章库中定位 ↗
            </button>
          ) : null}
        </div>
        <div className={`map-selection-notice${notice?.kind === 'error' ? ' error' : ''}`}>
          {notice?.message ?? '点击任一可写成员会选中完整跨层放置组。'}
        </div>
      </>
    )
  }

  const edit = (
    patch: ProjectMapPatch,
    label: string,
    extras: {
      removeVisualSlots?: readonly VisualSlotRef[]
      removeGridPoints?: readonly GridPointRef[]
    } = {},
  ) => onEdit({ placementId: editing.id, patch, label, ...extras })

  return (
    <>
      <div className="insp-head stamp-group-selection-head editing">
        <div className="what">放置组 / {editing.sourceStampName ?? editing.id}</div>
        <div className="who">活动层：{activeLayer?.name ?? activeLayerId} · Esc 退出组内</div>
        <button type="button" className="mini" onClick={onExitEdit}>
          退出组内
        </button>
      </div>
      <div className="section stamp-group-edit-summary">
        <h4>当前层成员</h4>
        <div className="field">
          <span className="field-label">视觉</span>
          <span>
            当前层选中 {activeVisual.length} 个（整组 {editing.visualSlots.length} 个）
          </span>
        </div>
        <p>
          选择工具可在组内单选或框选成员；切换活动层不会把修改传播到其他层。Ctrl/⌘+A 恢复全组选中。
        </p>
        {activeReadOnly ? (
          <p className="map-selection-warning">⚠ 当前活动层隐藏、锁定或不存在，组内只读。</p>
        ) : null}
      </div>
      <div className="section stamp-group-edit-fields">
        <h4>视觉成员</h4>
        <div className="field map-selection-field">
          <span className="field-label">tileId</span>
          <input
            key={`group-tile:${editing.id}:${activeLayerId}:${mixedValue(activeTiles)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={mixedValue(activeTiles)}
            placeholder={activeTiles.length ? '混合' : '本层无成员'}
            disabled={activeReadOnly || activeVisual.length === 0}
            aria-label="组内当前层 tileId"
            onBlur={(event) => {
              const value = parseNonNegative(event.currentTarget.value, 'tileId')
              if (value === undefined) return
              edit(
                {
                  visual: activeVisual.map((ref) => ({ channel: 'tileId', ref, value })),
                  collision: [],
                },
                `组内当前层瓦片设为 #${value}`,
              )
            }}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>
        <div className="field map-selection-field">
          <span className="field-label">高度</span>
          <input
            key={`group-height:${editing.id}:${activeLayerId}:${mixedValue(activeHeights)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={mixedValue(activeHeights)}
            placeholder={activeHeights.length ? '混合' : '无高度成员'}
            disabled={activeReadOnly || activeHeights.length === 0}
            aria-label="组内当前层实例高度"
            onBlur={(event) => {
              const value = parseNonNegative(event.currentTarget.value, '高度')
              if (value === undefined) return
              edit(
                {
                  visual: activeVisual.map((ref) => ({ channel: 'height', ref, value })),
                  collision: [],
                },
                `组内当前层高度设为 ${value}`,
              )
            }}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>
        <button
          type="button"
          className="tool danger map-inline-action"
          disabled={
            activeReadOnly ||
            activeVisual.length === 0 ||
            activeVisual.length === editing.visualSlots.length
          }
          title={
            activeVisual.length === editing.visualSlots.length
              ? '不能擦除整组最后的视觉成员；请删除整组或先解组'
              : '清空值并从组 identity 移除'
          }
          onClick={() =>
            edit({ visual: [], collision: [] }, '擦除组内当前层视觉成员', {
              removeVisualSlots: activeVisual,
            })
          }
        >
          擦除当前层选中成员
        </button>
      </div>
      <div className="section stamp-group-edit-fields">
        <h4>
          碰撞成员{' '}
          <span className="b2">
            选中 {selectedGridPoints.length}/{editing.gridPoints.length} · 值 0 仍属于组
          </span>
        </h4>
        <div className="field map-selection-field">
          <span className="field-label">collision</span>
          <input
            key={`group-collision:${editing.id}:${mixedValue(collisionValues)}`}
            className="in mono"
            type="number"
            min={0}
            defaultValue={mixedValue(collisionValues)}
            placeholder={collisionValues.length ? '混合' : '无成员'}
            disabled={collisionReadOnly || selectedGridPoints.length === 0}
            aria-label="组内碰撞值"
            onBlur={(event) => {
              const value = parseNonNegative(event.currentTarget.value, 'collision')
              if (value === undefined) return
              edit(
                {
                  visual: [],
                  collision: selectedGridPoints.map((ref) => ({ ref, value })),
                },
                `组内碰撞设为 ${value}`,
              )
            }}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>
        <button
          type="button"
          className="tool map-inline-action"
          disabled={collisionReadOnly || selectedGridPoints.length === 0}
          title="只移除组身份；当前碰撞值保持不变"
          onClick={() =>
            edit({ visual: [], collision: [] }, '移出组内碰撞成员', {
              removeGridPoints: selectedGridPoints,
            })
          }
        >
          移出碰撞成员（保留值）
        </button>
        {collisionReadOnly ? (
          <p className="map-selection-warning">
            ⚠ 碰撞属于完整放置组；组涉及的所有视觉层可写后才能修改。
          </p>
        ) : null}
      </div>
      <div className={`map-selection-notice${notice?.kind === 'error' ? ' error' : ''}`}>
        {notice?.message ?? '组内修改只作用于当前放置组；每次提交是一笔撤销。'}
      </div>
    </>
  )
}
