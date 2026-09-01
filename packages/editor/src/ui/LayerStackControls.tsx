import { type ReactNode, useId } from 'react'
import {
  DsActionGroup,
  DsButton,
  DsControlGroup,
  DsField,
  DsIconButton,
  DsPressable,
  DsRangeInput,
  DsTag,
} from './design-system/index.js'
import { DsReorderCollection, DsReorderItem, DsReorderMoveButton } from './design-system/reorder.js'

export interface LayerStackControlItem {
  id: string
  name: string
  detail?: ReactNode
  hidden?: boolean
  locked?: boolean
  reorderDisabled?: boolean
}

/** 地图与组合编辑器共用的当前绘制层级与显示高度上下文。 */
export function LayerPaintContext(props: {
  layerName: string
  focusEnabled: boolean
  viewHeight: number
  maxViewHeight: number
  rangeId?: string
  onToggleFocus: () => void
  onViewHeightChange: (height: number) => void
}) {
  const generatedRangeId = useId()
  const rangeId = props.rangeId ?? generatedRangeId

  return (
    <section className="map-paint-context" aria-label="绘制层级">
      <div className="map-paint-context__head">
        <div className="map-paint-context__title">
          <span className="t">绘制层级</span>
          <span title={props.layerName}>{props.layerName}</span>
        </div>
        <DsButton
          size="compact"
          variant="quiet"
          onClick={props.onToggleFocus}
          title={props.focusEnabled ? '关闭聚焦，全部正常显示' : '开启聚焦，其他瓦片变暗'}
          aria-label={props.focusEnabled ? '关闭其他图层聚焦' : '聚焦当前图层和高度'}
          aria-pressed={props.focusEnabled}
        >
          {props.focusEnabled ? '只看当前' : '聚焦当前'}
        </DsButton>
      </div>
      <DsField id={rangeId} label="显示高度" layout="inline" className="map-paint-context__control">
        {(field) => (
          <DsControlGroup
            control={
              <DsRangeInput
                {...field}
                min={0}
                max={props.maxViewHeight}
                step={1}
                value={props.viewHeight}
                onChange={(event) => props.onViewHeightChange(Number(event.currentTarget.value))}
              />
            }
            actions={
              <output htmlFor={rangeId} aria-live="polite">
                {props.viewHeight}
              </output>
            }
          />
        )}
      </DsField>
    </section>
  )
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
  reorderScopeKey: string
  reorderRevision: unknown
  stackOrder: 'top-first' | 'bottom-first'
  onReorder: (id: string, visualToIndex: number) => boolean | void
  addDisabledReason?: string
  deleteDisabledReason?: string
  footer?: ReactNode
}) {
  const addReasonId = useId()
  const deleteReasonId = useId()
  const activeLayer = props.items.find((layer) => layer.id === props.activeId)
  const sharedDisabledReason =
    props.addDisabledReason && props.addDisabledReason === props.deleteDisabledReason
      ? props.addDisabledReason
      : undefined
  const addDescriptionId = props.addDisabledReason ? addReasonId : undefined
  const deleteDescriptionId = props.deleteDisabledReason
    ? sharedDisabledReason
      ? addReasonId
      : deleteReasonId
    : undefined

  return (
    <section className="layer-stack-controls" aria-label="图层">
      <div className="pane-h map-layer-panel__header">
        <span className="t">图层</span>
        <DsTag tone="neutral">{props.items.length} 层</DsTag>
        <span className="spacer" />
        <DsActionGroup density="compact" className="map-layer-header-actions">
          <DsIconButton
            variant="secondary"
            icon="add"
            onClick={props.onAdd}
            disabled={Boolean(props.addDisabledReason)}
            aria-describedby={addDescriptionId}
            label="新增图层"
          />
          <DsIconButton
            variant="danger"
            icon="delete"
            onClick={props.onDelete}
            disabled={Boolean(props.deleteDisabledReason)}
            aria-describedby={deleteDescriptionId}
            label={activeLayer ? `删除选中图层：${activeLayer.name}` : '删除选中图层'}
          />
        </DsActionGroup>
      </div>
      {sharedDisabledReason ? (
        <p className="layer-stack-disabled-reason" id={addReasonId}>
          {sharedDisabledReason}
        </p>
      ) : (
        <>
          {props.addDisabledReason ? (
            <p className="layer-stack-disabled-reason" id={addReasonId}>
              {props.addDisabledReason}
            </p>
          ) : null}
          {props.deleteDisabledReason ? (
            <p className="layer-stack-disabled-reason" id={deleteReasonId}>
              {props.deleteDisabledReason}
            </p>
          ) : null}
        </>
      )}
      <DsReorderCollection
        adoptionId="map/layer-stack"
        scopeKey={props.reorderScopeKey}
        entries={props.items.map((layer) => ({
          key: layer.id,
          label: layer.name,
          disabled: layer.reorderDisabled ?? layer.locked,
        }))}
        revision={props.reorderRevision}
        onReorder={(intent) => {
          const source = props.items[intent.fromIndex]
          if (!source) return false
          return props.onReorder(source.id, intent.toIndex)
        }}
      >
        <div className="map-layer-list">
          {props.items.map((layer) => (
            <DsReorderItem itemKey={layer.id} key={layer.id}>
              <div className={`map-layer-row${layer.id === props.activeId ? ' sel' : ''}`}>
                <DsActionGroup density="compact" className="layer-state-actions">
                  <DsIconButton
                    variant="quiet"
                    icon={layer.hidden ? 'eye-off' : 'eye'}
                    onClick={() => props.onToggleVisible(layer.id)}
                    label={`图层可见：${layer.name}`}
                    aria-pressed={!layer.hidden}
                  />
                  <DsIconButton
                    variant="quiet"
                    icon={layer.locked ? 'lock' : 'unlock'}
                    onClick={() => props.onToggleLocked(layer.id)}
                    label={`图层锁定：${layer.name}`}
                    aria-pressed={layer.locked}
                  />
                </DsActionGroup>
                <DsPressable
                  type="button"
                  className="layer-name"
                  onClick={() => props.onSelect(layer.id)}
                  title={`${layer.name} (${layer.id})`}
                  data-layer-id={layer.id}
                  aria-label={`选择图层：${layer.name}（${layer.id}）`}
                  aria-pressed={layer.id === props.activeId}
                >
                  <span>{layer.name}</span>
                  {layer.detail ? <small>{layer.detail}</small> : null}
                </DsPressable>
                {layer.id === props.activeId ? (
                  <DsActionGroup density="compact" className="layer-order">
                    <DsReorderMoveButton
                      itemKey={layer.id}
                      direction={props.stackOrder === 'top-first' ? 'backward' : 'forward'}
                      label={`上移图层：${layer.name}`}
                    />
                    <DsReorderMoveButton
                      itemKey={layer.id}
                      direction={props.stackOrder === 'top-first' ? 'forward' : 'backward'}
                      label={`下移图层：${layer.name}`}
                    />
                  </DsActionGroup>
                ) : null}
              </div>
            </DsReorderItem>
          ))}
        </div>
      </DsReorderCollection>
      {props.footer}
    </section>
  )
}
