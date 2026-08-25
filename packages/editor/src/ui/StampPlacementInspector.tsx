import type { ProjectMap, StampTemplate } from '@type-pal/content'
import type { StampLayerMapping, StampPlacementPlan } from '../core/stamp-placement.js'
import {
  DsButton,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsSelect,
} from './design-system/index.js'

function refLabel(ref: { row: number; col: number; layerId?: string }): string {
  return `${ref.layerId ? `${ref.layerId} · ` : ''}r${ref.row}:c${ref.col}`
}

export function StampPlacementInspector(props: {
  template: StampTemplate
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
  const mappedCount = template.layers.filter((slot) => mappingBySlot.has(slot.id)).length
  const activeLayer = map.layers.find((layer) => layer.id === activeLayerId)
  const allMapped = mappedCount === template.layers.length
  const problemCount = (plan?.issues.length ?? 0) + (plan?.conflicts.length ?? 0)
  const visualCount = template.layers.reduce(
    (count, layer) =>
      count + layer.tiles.reduce((sum, row) => sum + row.filter((tile) => tile !== null).length, 0),
    0,
  )
  const collisionCount = template.collision.reduce(
    (count, row) => count + row.filter((value) => value !== null).length,
    0,
  )

  return (
    <div className="section stamp-placement-inspector">
      <div className="stamp-placement-head">
        <span className="stamp-eyebrow">待放置组合</span>
        <h4 title={`${template.name} (${template.id})`}>{template.name}</h4>
        <code>{template.id}</code>
      </div>
      <div className="stamp-placement-metrics">
        <span>
          <strong>{visualCount}</strong> 视觉格
        </span>
        <span>
          <strong>{template.layers.length}</strong> 局部层
        </span>
        <span>
          <strong>{collisionCount}</strong> 碰撞格
        </span>
      </div>
      <div className="stamp-mapping-heading">
        <strong>显式图层映射</strong>
        <span>
          {mappedCount}/{template.layers.length}
        </span>
      </div>
      <p className="hint2 stamp-mapping-copy">
        每个局部层都要明确指向稳定 layerId；改名和重排不会改变映射。
      </p>
      <div className="stamp-mapping-list">
        {template.layers.map((slot) => {
          const mapping = mappingBySlot.get(slot.id)
          const canUseActive =
            activeLayer !== undefined &&
            !hiddenLayerIds.has(activeLayer.id) &&
            !lockedLayerIds.has(activeLayer.id)
          return (
            <div key={slot.id} className={issueSlots.has(slot.id) ? 'invalid' : ''}>
              <div className="stamp-mapping-field">
                <span>
                  <strong>{slot.name}</strong>
                  <small>{slot.id}</small>
                </span>
                <DsSelect
                  value={mapping?.targetLayerId ?? ''}
                  invalid={issueSlots.has(slot.id)}
                  aria-label={`${slot.name} 的目标图层`}
                  placeholder="请选择目标层…"
                  options={[
                    { value: '', label: '未映射' },
                    ...map.layers.map((layer) => ({
                      value: layer.id,
                      label: layer.name,
                      description: [
                        layer.id,
                        hiddenLayerIds.has(layer.id) ? '已隐藏' : '',
                        lockedLayerIds.has(layer.id) ? '已锁定' : '',
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    })),
                  ]}
                  onValueChange={(value) => onMapSlot(slot.id, value)}
                />
              </div>
              <DsButton
                disabled={!canUseActive}
                onClick={() => activeLayer && onMapSlot(slot.id, activeLayer.id)}
                title={canUseActive ? `映射到活动层 ${activeLayer?.name}` : '活动层不可写'}
                size="compact"
                variant="secondary"
              >
                用活动层
              </DsButton>
            </div>
          )
        })}
      </div>
      <div
        className={`stamp-placement-status${plan?.issues.length ? ' error' : plan?.conflicts.length ? ' conflict' : plan?.canApply ? ' ready' : ''}`}
      >
        {!allMapped
          ? `还需映射 ${template.layers.length - mappedCount} 个局部层。`
          : !plan
            ? '移动到地图上查看跨层完整预览。'
            : plan.issues.length
              ? plan.issues
                  .slice(0, 3)
                  .map((item) => item.message)
                  .join('；')
              : plan.conflicts.length
                ? `${plan.conflicts.length} 处普通内容冲突；不会覆盖已有组合成员。`
                : '预览有效；点击画布或下方按钮一次原子放置。'}
      </div>
      {plan && problemCount > 0 ? (
        <DsDiagnosticPanel
          state="ready"
          count={{
            kind: 'exact',
            errors: plan.issues.length,
            warnings: plan.conflicts.length,
          }}
          summary="组合放置问题明细"
          label="组合放置问题明细"
        >
          <DsDiagnosticList>
            {plan.issues.map((item) => (
              <DsDiagnosticRow
                key={`issue:${item.code}:${item.layerSlotId ?? ''}:${item.ref ? refLabel(item.ref) : ''}:${item.ownerPlacementId ?? ''}:${item.message}`}
                severity="error"
                title={item.message}
                code={item.code}
                path={item.ref ? refLabel(item.ref) : undefined}
                statusLabel="无法定位"
              />
            ))}
            {plan.conflicts.map((item) => (
              <DsDiagnosticRow
                key={`conflict:${item.channel}:${refLabel(item.ref)}:${item.currentValue}:${item.incomingValue}`}
                severity="warning"
                title={item.channel === 'visual' ? '普通视觉冲突' : '普通碰撞冲突'}
                code={`${item.channel}-conflict`}
                path={`${refLabel(item.ref)} · ${item.currentValue} → ${item.incomingValue}`}
                statusLabel="仅提示"
              />
            ))}
          </DsDiagnosticList>
        </DsDiagnosticPanel>
      ) : null}
      {plan ? (
        <div className="stamp-placement-anchor mono">
          anchor r{plan.anchor.row}:c{plan.anchor.col} · revision {plan.mapRevision}
        </div>
      ) : null}
      <div className="stamp-placement-actions">
        <DsButton disabled={!plan?.canApply} onClick={onCommit} size="compact" variant="primary">
          放置
        </DsButton>
        {plan?.issues.length === 0 && plan.conflicts.length > 0 ? (
          <DsButton onClick={onOverwrite} size="compact" variant="danger">
            覆盖普通格并放置
          </DsButton>
        ) : null}
        <DsButton onClick={onCancel} size="compact" variant="secondary">
          退出组合工具
        </DsButton>
        {onOpenLibrary ? (
          <DsButton onClick={onOpenLibrary} size="compact" variant="secondary" icon="open">
            在库中打开
          </DsButton>
        ) : null}
      </div>
    </div>
  )
}
