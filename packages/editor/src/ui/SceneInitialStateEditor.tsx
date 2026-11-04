import type { ActorDef, GridPos, Locale, SceneDef } from '@type-pal/content'
import { useEffect, useState } from 'react'
import { entityDisplayName } from '../core/entity-display.js'
import type { PreviewEntityState, SceneInitialState } from '../core/script-preview-library.js'
import {
  DsButton,
  DsDraftNumberInput,
  DsDraftTextField,
  DsHelpTip,
  DsInspectorSection,
  DsMultiSelect,
  DsPressable,
  DsPropertyGrid,
  DsPropertyRow,
  DsSelect,
} from './design-system/index.js'

export function previewEntityName(
  entity: { id: string; label?: string; actor?: string; pos: GridPos },
  actors: Record<string, ActorDef>,
  locale: Locale,
): string {
  const name = entityDisplayName(entity, actors, locale)
  return name === entity.id
    ? `未命名角色或物件（列 ${entity.pos.col}，行 ${entity.pos.row}）`
    : name
}

export function SceneInitialStateList(props: {
  scene: SceneDef
  states: readonly SceneInitialState[]
  selected?: SceneInitialState
  selectedEntityId?: string
  actorsById: Record<string, ActorDef>
  locale: Locale
  usage: Readonly<Record<string, readonly string[]>>
  schemeUsage: Readonly<Record<string, readonly string[]>>
  missingReferences: number
  contextLabel?: string
  contextEntityId?: string
  onBack?(): void
  revision: string | number
  onSelect(id: string): void
  onSelectEntity(id: string): void
  onCreate(copy?: SceneInitialState): void
  onChange(state: SceneInitialState): void
  onDelete(id: string): void
}) {
  const selected = props.selected
  const references = selected ? (props.usage[selected.id] ?? []) : []
  const defaultReferences = selected ? (props.schemeUsage[selected.id] ?? []) : []
  const participants = [...(selected?.entities ?? [])].sort(
    (left, right) =>
      Number(right.entityId === props.contextEntityId) -
      Number(left.entityId === props.contextEntityId),
  )
  const [detailVisible, setDetailVisible] = useState(!!props.contextLabel && !!selected)
  useEffect(() => {
    if (props.contextLabel && props.selected?.id) setDetailVisible(true)
  }, [props.contextLabel, props.selected?.id])
  return (
    <div className="scene-initial-states" data-detail={detailVisible}>
      {props.contextLabel && props.onBack ? (
        <div className="initial-state-context">
          <DsButton size="compact" variant="secondary" onClick={props.onBack}>
            返回脚本详情
          </DsButton>
          <strong>{props.contextLabel}</strong>
        </div>
      ) : null}
      <div className="initial-state-columns">
        <section className="initial-state-library" aria-label="初始状态库">
          <header>
            <strong>初始状态 · {props.states.length}</strong>
            <DsButton
              size="compact"
              variant="secondary"
              icon="add"
              onClick={() => {
                setDetailVisible(true)
                props.onCreate()
              }}
            >
              新建初始状态
            </DsButton>
          </header>
          <nav className="initial-state-list" aria-label="初始状态列表">
            {props.states.map((state) => {
              const steps = props.usage[state.id]?.length ?? 0
              const defaults = props.schemeUsage[state.id]?.length ?? 0
              return (
                <DsPressable
                  key={state.id}
                  className={`initial-state-row${state.id === selected?.id ? ' active' : ''}`}
                  aria-pressed={state.id === selected?.id}
                  onClick={() => {
                    setDetailVisible(true)
                    props.onSelect(state.id)
                  }}
                >
                  <strong>{state.name}</strong>
                  <span>
                    {state.entities.length} 个角色/物件 ·{' '}
                    {steps ? `${steps} 个步骤` : defaults ? `${defaults} 个方案默认` : '未使用'}
                  </span>
                </DsPressable>
              )
            })}
          </nav>
        </section>
        <section className="initial-state-detail-pane" aria-label="初始状态详情">
          <DsButton
            className="initial-state-list-back"
            size="compact"
            variant="secondary"
            onClick={() => setDetailVisible(false)}
          >
            返回状态列表
          </DsButton>
          {selected ? (
            <>
              <div className="initial-state-details">
                <DsDraftTextField
                  label="名称"
                  layout="inline"
                  aria-label="初始状态名称"
                  size="compact"
                  draftKey={`initial-state:${selected.id}:name`}
                  syncToken={props.revision}
                  value={selected.name}
                  validate={(value) => (value.trim() ? undefined : '名称不能为空')}
                  onCommit={(name) => props.onChange({ ...selected, name: name.trim() })}
                />
                <div className="initial-state-actions">
                  <DsButton
                    size="compact"
                    variant="secondary"
                    onClick={() => props.onCreate(selected)}
                  >
                    复制
                  </DsButton>
                  <DsButton
                    size="compact"
                    variant="quiet"
                    disabled={references.length > 0 || defaultReferences.length > 0}
                    title={
                      references.length || defaultReferences.length
                        ? '仍被步骤或方案默认引用，请先更改这些选择'
                        : '删除初始状态，可撤销'
                    }
                    onClick={() => props.onDelete(selected.id)}
                  >
                    删除
                  </DsButton>
                </div>
              </div>
              <div className="initial-state-entity-heading">
                <div className="initial-state-entity-title">
                  <strong>角色与物件 · {selected.entities.length}</strong>
                  <DsHelpTip label="开场时的角色与物件">
                    只添加需要调整的角色或物件，其余沿用场景摆放。点击角色编辑位置、朝向和显隐，也可在上方画布拖动。
                  </DsHelpTip>
                </div>
                <span className="initial-state-picker">
                  <span>添加/移出</span>
                  <DsMultiSelect
                    label="添加或移出角色与物件"
                    summaryMode="count"
                    size="compact"
                    options={props.scene.entities.map((entity) => ({
                      value: entity.id,
                      label: previewEntityName(entity, props.actorsById, props.locale),
                    }))}
                    value={selected.entities.map((e) => e.entityId)}
                    onChange={(ids) =>
                      props.onChange({
                        ...selected,
                        entities: ids.map(
                          (entityId) =>
                            selected.entities.find((e) => e.entityId === entityId) ?? { entityId },
                        ),
                      })
                    }
                  />
                </span>
              </div>
              <section className="initial-state-entities" aria-label="开场时的角色与物件">
                {participants.map((entry) => {
                  const entity = props.scene.entities.find((e) => e.id === entry.entityId)
                  const pos = entry.pos ?? entity?.pos
                  const facing =
                    entry.facing ?? (entity && 'facing' in entity ? entity.facing : undefined)
                  const inherits = !Object.entries(entry).some(
                    ([key, value]) => key !== 'entityId' && value !== undefined,
                  )
                  return (
                    <DsButton
                      key={entry.entityId}
                      variant="quiet"
                      className="initial-state-entity"
                      aria-pressed={entry.entityId === props.selectedEntityId}
                      onClick={() => props.onSelectEntity(entry.entityId)}
                    >
                      <span className="initial-state-entity-summary">
                        <strong>
                          {entity
                            ? previewEntityName(entity, props.actorsById, props.locale)
                            : '已移除的角色或物件'}
                          {entry.entityId === props.contextEntityId ? ' · 当前脚本角色' : ''}
                        </strong>
                        <span>
                          {pos ? `位置 ${pos.col}, ${pos.row}, ${pos.height}` : '引用失效'}
                          {(entry.hidden ?? entity?.hidden) ? ' · 隐藏' : ' · 显示'}
                          {facing
                            ? ` · 朝向${{ up: '上', down: '下', left: '左', right: '右' }[facing]}`
                            : ''}
                          {inherits ? ' · 沿用场景默认' : ''}
                        </span>
                      </span>
                    </DsButton>
                  )
                })}
              </section>
              {!selected.entities.length ? (
                <p className="hint2">
                  从“添加或移出角色与物件”选择需要调整的对象，无需把全场景的人物都加入。
                </p>
              ) : null}

              <details className="initial-state-usage">
                <summary>
                  使用位置 · {references.length} 个步骤 · {defaultReferences.length} 个方案默认
                </summary>
                {references.length || defaultReferences.length ? (
                  <p>调整这份布置会影响以下引用。</p>
                ) : (
                  <p>尚未被脚本引用；请回到步骤或方案详情主动选择。</p>
                )}
                {references.length ? (
                  <>
                    <strong>使用此状态的步骤</strong>
                    <ul>
                      {references.map((label, index) => (
                        <li key={`${index}:${label}`}>{label}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {defaultReferences.length ? (
                  <>
                    <strong>作为这些脚本方案的默认状态</strong>
                    <ul>
                      {defaultReferences.map((label, index) => (
                        <li key={`${index}:${label}`}>{label}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {props.missingReferences ? (
                  <p>{props.missingReferences} 个引用目标已不存在，删除时一并清理。</p>
                ) : null}
              </details>
            </>
          ) : (
            <p className="hint2">
              从左侧选择或新建初始状态。新建、复制和选择不会改变任何脚本引用。
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export function SceneInitialStateInspector(props: {
  state?: SceneInitialState
  entity?: SceneDef['entities'][number]
  entityId?: string
  actorsById: Record<string, ActorDef>
  locale: Locale
  revision: string | number
  onChange(entry: PreviewEntityState): void
  onRemove(entityId: string): void
}) {
  const { state, entity, entityId } = props
  const entry = state?.entities.find((e) => e.entityId === entityId)
  if (!state)
    return (
      <DsInspectorSection title="初始状态" description="先在初始状态库中新建或选择一份状态。">
        <span />
      </DsInspectorSection>
    )
  if (!entity)
    return (
      <DsInspectorSection
        title={state.name}
        description={
          entityId ? '此角色或物件已不存在。' : '在下方开场列表或上方画布选择一个角色或物件。'
        }
      >
        {entityId ? <DsButton onClick={() => props.onRemove(entityId)}>移出状态</DsButton> : null}
      </DsInspectorSection>
    )
  const name = previewEntityName(entity, props.actorsById, props.locale)
  const prefix = `initial-state:${state.id}:${entity.id}`
  const change = (patch: Partial<PreviewEntityState>) => {
    const next = { ...entry, entityId: entity.id, ...patch }
    for (const key of Object.keys(next) as (keyof PreviewEntityState)[])
      if (next[key] === undefined) delete next[key]
    props.onChange(next)
  }
  const pos = entry?.pos ?? entity.pos
  return (
    <DsInspectorSection title="预览初始状态" description={`${state.name} / ${name}`}>
      {entry ? (
        <>
          <DsPropertyGrid>
            {(['col', 'row', 'height'] as const).map((axis) => {
              const label = { col: '列坐标', row: '行坐标', height: '高度' }[axis]
              return (
                <DsPropertyRow key={axis} label={label}>
                  <DsDraftNumberInput
                    aria-label={`初始${label}`}
                    size="compact"
                    draftKey={`${prefix}:${axis}`}
                    syncToken={props.revision}
                    step={axis === 'height' ? 1 : 0.5}
                    value={pos[axis]}
                    onCommit={(value) => {
                      if (value !== undefined) change({ pos: { ...pos, [axis]: value } })
                    }}
                  />
                </DsPropertyRow>
              )
            })}
            {!('zone' in entity) ? (
              <DsPropertyRow label="朝向">
                <DsSelect
                  aria-label="初始朝向"
                  size="compact"
                  value={entry.facing ?? 'inherit'}
                  options={[
                    { value: 'inherit', label: '场景默认' },
                    { value: 'up', label: '上' },
                    { value: 'down', label: '下' },
                    { value: 'left', label: '左' },
                    { value: 'right', label: '右' },
                  ]}
                  onValueChange={(value) =>
                    change({
                      facing:
                        value === 'up' || value === 'down' || value === 'left' || value === 'right'
                          ? value
                          : undefined,
                    })
                  }
                />
              </DsPropertyRow>
            ) : null}
            <DsPropertyRow label="显示">
              <DsSelect
                aria-label="初始显隐"
                size="compact"
                value={entry.hidden === undefined ? 'inherit' : entry.hidden ? 'hidden' : 'visible'}
                options={[
                  { value: 'inherit', label: `场景默认（${entity.hidden ? '隐藏' : '显示'}）` },
                  { value: 'visible', label: '显示' },
                  { value: 'hidden', label: '隐藏' },
                ]}
                onValueChange={(value) =>
                  change({ hidden: value === 'inherit' ? undefined : value === 'hidden' })
                }
              />
            </DsPropertyRow>
            <DsPropertyRow label="碰撞">
              <DsSelect
                aria-label="初始碰撞"
                size="compact"
                value={entry.collide === undefined ? 'inherit' : String(entry.collide)}
                options={[
                  { value: 'inherit', label: `场景默认（${entity.collide ? '挡路' : '不挡路'}）` },
                  { value: 'true', label: '挡路' },
                  { value: 'false', label: '不挡路' },
                ]}
                onValueChange={(value) =>
                  change({ collide: value === 'inherit' ? undefined : value === 'true' })
                }
              />
            </DsPropertyRow>
            <DsPropertyRow label="画序偏置">
              <DsDraftNumberInput
                aria-label="初始画序偏置"
                size="compact"
                draftKey={`${prefix}:zBias`}
                syncToken={props.revision}
                allowEmpty
                placeholder={`默认 ${entity.zBias ?? 0}`}
                value={entry.zBias}
                step={1}
                onCommit={(zBias) => change({ zBias })}
              />
            </DsPropertyRow>
          </DsPropertyGrid>
          <div className="initial-state-actions">
            <DsButton
              size="compact"
              variant="secondary"
              onClick={() => props.onChange({ entityId: entity.id })}
            >
              恢复场景默认
            </DsButton>
            <DsButton size="compact" variant="quiet" onClick={() => props.onRemove(entity.id)}>
              移出状态
            </DsButton>
          </div>
          <p className="hint2">这些属性只用于预览，不修改场景里的默认站位。</p>
        </>
      ) : (
        <>
          <p className="hint2">此角色或物件当前沿用场景默认状态。</p>
          <DsButton onClick={() => props.onChange({ entityId: entity.id })}>
            加入此初始状态
          </DsButton>
        </>
      )}
    </DsInspectorSection>
  )
}
