import type { ReactNode } from 'react'
import { DsIconButton, DsTag } from './design-system/index.js'

export interface LayerStackControlItem {
  id: string
  name: string
  detail?: ReactNode
  hidden?: boolean
  locked?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
}

/**
 * 地图与组合编辑器共用的图层栈。领域页面只提供稳定 ID 与 draft/map 操作，
 * 选中、显隐、锁定、排序及增删的可见交互必须保持一致。
 */
export function LayerStackControls(props: {
  items: readonly LayerStackControlItem[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: () => void
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  addDisabled?: boolean
  deleteDisabled?: boolean
  footer?: ReactNode
}) {
  return (
    <section className="layer-stack-controls" aria-label="图层">
      <div className="pane-h map-layer-panel__header">
        <span className="t">图层</span>
        <DsTag tone="neutral">{props.items.length} 层</DsTag>
        <span className="spacer" />
        <DsIconButton
          size="compact"
          variant="secondary"
          icon="add"
          onClick={props.onAdd}
          disabled={props.addDisabled}
          label="新增图层"
        />
        <DsIconButton
          size="compact"
          variant="danger"
          icon="delete"
          onClick={props.onDelete}
          disabled={props.deleteDisabled}
          label="删除选中图层"
        />
      </div>
      <div className="map-layer-list">
        {props.items.map((layer) => (
          <div
            key={layer.id}
            className={`map-layer-row${layer.id === props.activeId ? ' sel' : ''}`}
          >
            <DsIconButton
              size="compact"
              variant="quiet"
              icon={layer.hidden ? 'eye-off' : 'eye'}
              onClick={() => props.onToggleVisible(layer.id)}
              label={layer.hidden ? '显示图层' : '隐藏图层'}
              aria-pressed={!layer.hidden}
            />
            <DsIconButton
              size="compact"
              variant="quiet"
              icon={layer.locked ? 'lock' : 'unlock'}
              onClick={() => props.onToggleLocked(layer.id)}
              label={layer.locked ? '解锁图层' : '锁定图层'}
              aria-pressed={layer.locked}
            />
            <button
              type="button"
              className="layer-name"
              onClick={() => props.onSelect(layer.id)}
              title={`${layer.name} (${layer.id})`}
              aria-pressed={layer.id === props.activeId}
            >
              <span>{layer.name}</span>
              {layer.detail ? <small>{layer.detail}</small> : null}
            </button>
            {layer.id === props.activeId ? (
              <span className="layer-order">
                <DsIconButton
                  size="compact"
                  variant="secondary"
                  icon="chevron-up"
                  onClick={() => props.onMove(layer.id, 'up')}
                  disabled={!layer.canMoveUp || layer.locked}
                  label="上移图层"
                />
                <DsIconButton
                  size="compact"
                  variant="secondary"
                  icon="chevron-down"
                  onClick={() => props.onMove(layer.id, 'down')}
                  disabled={!layer.canMoveDown || layer.locked}
                  label="下移图层"
                />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {props.footer}
    </section>
  )
}
