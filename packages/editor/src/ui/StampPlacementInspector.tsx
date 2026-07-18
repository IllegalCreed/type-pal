import type { ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { StampLayerMapping, StampPlacementPlan } from '../core/stamp-placement.js'

function refLabel(ref: { row: number; col: number; layerId?: string }): string {
  return `${ref.layerId ? `${ref.layerId} · ` : ''}r${ref.row}:c${ref.col}`
}

export function StampPlacementInspector(props: {
  template: StampTemplateV1
  map: ProjectMap
  mappings: readonly StampLayerMapping[]
  plan?: StampPlacementPlan
  activeLayerId: string
  hiddenLayerIds: ReadonlySet<string>
  lockedLayerIds: ReadonlySet<string>
  onMapSlot: (slotId: string, layerId: string) => void
  onCommit: () => void
  onOverwrite: () => void
  onCancel: () => void
  onOpenLibrary?: () => void
}) {
  const {
    template,
    map,
    mappings,
    plan,
    activeLayerId,
    hiddenLayerIds,
    lockedLayerIds,
    onMapSlot,
    onCommit,
    onOverwrite,
    onCancel,
    onOpenLibrary,
  } = props
  const mappingBySlot = new Map(mappings.map((mapping) => [mapping.layerSlotId, mapping]))
  const issueSlots = new Set(
    plan?.issues.flatMap((item) => (item.layerSlotId ? [item.layerSlotId] : [])),
  )
  const mappedCount = template.layerSlots.filter((slot) => mappingBySlot.has(slot.id)).length
  const activeLayer = map.layers.find((layer) => layer.id === activeLayerId)
  const allMapped = mappedCount === template.layerSlots.length
  const problemCount = (plan?.issues.length ?? 0) + (plan?.conflicts.length ?? 0)

  return (
    <div className="section stamp-placement-inspector">
      <div className="stamp-placement-head">
        <span className="stamp-eyebrow">待放置图章</span>
        <h4 title={`${template.name} (${template.id})`}>{template.name}</h4>
        <code>{template.id}</code>
      </div>
      <div className="stamp-placement-metrics">
        <span>
          <strong>{template.visual.length}</strong> 视觉格
        </span>
        <span>
          <strong>{template.layerSlots.length}</strong> 局部层
        </span>
        <span>
          <strong>{template.collision.length}</strong> 碰撞格
        </span>
      </div>
      <div className="stamp-mapping-heading">
        <strong>显式图层映射</strong>
        <span>
          {mappedCount}/{template.layerSlots.length}
        </span>
      </div>
      <p className="hint2 stamp-mapping-copy">
        每个局部层都要明确指向稳定 layerId；改名和重排不会改变映射。
      </p>
      <div className="stamp-mapping-list">
        {template.layerSlots.map((slot) => {
          const mapping = mappingBySlot.get(slot.id)
          const canUseActive =
            activeLayer?.depthMode === slot.depthMode &&
            !hiddenLayerIds.has(activeLayer.id) &&
            !lockedLayerIds.has(activeLayer.id)
          return (
            <div key={slot.id} className={issueSlots.has(slot.id) ? 'invalid' : ''}>
              <label>
                <span>
                  <strong>{slot.name}</strong>
                  <small>
                    {slot.depthMode === 'height' ? '高度层' : '平面层'} · {slot.id}
                  </small>
                </span>
                <select
                  className="in"
                  value={mapping?.targetLayerId ?? ''}
                  aria-invalid={issueSlots.has(slot.id)}
                  aria-label={`${slot.name} 的目标图层`}
                  onChange={(event) => onMapSlot(slot.id, event.target.value)}
                >
                  <option value="">请选择目标层…</option>
                  {map.layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name} · {layer.id} · {layer.depthMode === 'height' ? '高度' : '平面'}
                      {hiddenLayerIds.has(layer.id) ? ' · 已隐藏' : ''}
                      {lockedLayerIds.has(layer.id) ? ' · 已锁定' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="mini"
                disabled={!canUseActive}
                onClick={() => activeLayer && onMapSlot(slot.id, activeLayer.id)}
                title={
                  canUseActive ? `映射到活动层 ${activeLayer?.name}` : '活动层深度不兼容或不可写'
                }
              >
                用活动层
              </button>
            </div>
          )
        })}
      </div>
      <div
        className={`stamp-placement-status${plan?.issues.length ? ' error' : plan?.conflicts.length ? ' conflict' : plan?.canApply ? ' ready' : ''}`}
      >
        {!allMapped
          ? `还需映射 ${template.layerSlots.length - mappedCount} 个局部层。`
          : !plan
            ? '移动到地图上查看跨层完整预览。'
            : plan.issues.length
              ? plan.issues
                  .slice(0, 3)
                  .map((item) => item.message)
                  .join('；')
              : plan.conflicts.length
                ? `${plan.conflicts.length} 处普通内容冲突；不会覆盖已有图章成员。`
                : '预览有效；点击画布或下方按钮一次原子放置。'}
      </div>
      {plan && problemCount > 0 ? (
        <section className="stamp-placement-problems" aria-label="图章放置问题明细">
          <div className="stamp-placement-problems-head">
            <strong>问题明细</strong>
            <span>{problemCount}</span>
          </div>
          <ul>
            {plan.issues.map((item, index) => (
              <li key={`issue:${item.code}:${index}`} className="error">
                <strong>错误 · {item.code}</strong>
                <span>{item.message}</span>
                {item.ref ? <code>{refLabel(item.ref)}</code> : null}
              </li>
            ))}
            {plan.conflicts.map((item, index) => (
              <li
                key={`conflict:${item.channel}:${refLabel(item.ref)}:${index}`}
                className="conflict"
              >
                <strong>{item.channel === 'visual' ? '普通视觉' : '普通碰撞'}</strong>
                <span>{refLabel(item.ref)}</span>
                <code>
                  {item.currentValue} → {item.incomingValue}
                </code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {plan ? (
        <div className="stamp-placement-anchor mono">
          anchor r{plan.anchor.row}:c{plan.anchor.col} · revision {plan.mapRevision}
        </div>
      ) : null}
      <div className="stamp-placement-actions">
        <button type="button" className="tool active" disabled={!plan?.canApply} onClick={onCommit}>
          放置
        </button>
        {plan?.issues.length === 0 && plan.conflicts.length > 0 ? (
          <button type="button" className="tool danger" onClick={onOverwrite}>
            覆盖普通格并放置
          </button>
        ) : null}
        <button type="button" className="tool" onClick={onCancel}>
          退出图章工具
        </button>
        {onOpenLibrary ? (
          <button type="button" className="tool" onClick={onOpenLibrary}>
            在库中打开 ↗
          </button>
        ) : null}
      </div>
    </div>
  )
}
