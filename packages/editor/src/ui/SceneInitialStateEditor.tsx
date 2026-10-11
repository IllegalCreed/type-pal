import type { ActorDef, Locale, SceneDef } from '@type-pal/content'
import { entityDisplayLabel } from '../core/entity-display.js'
import type { PreviewEntityState, SceneInitialState } from '../core/script-preview-library.js'
import {
  DsButton,
  DsDraftNumberInput,
  DsDraftTextField,
  DsFieldGroup,
  DsInspectorSection,
  DsMultiSelect,
  DsPressable,
  DsPropertyGrid,
  DsPropertyRow,
  DsSelect,
} from './design-system/index.js'

export function SceneInitialStateList(props: {
  scene: SceneDef
  states: readonly SceneInitialState[]
  selected?: SceneInitialState
  selectedEntityId?: string
  actorsById: Record<string, ActorDef>
  locale: Locale
  references: number
  missingReferences: number
  revision: string | number
  onSelect(id: string): void
  onSelectEntity(id: string): void
  onCreate(copy?: SceneInitialState): void
  onChange(state: SceneInitialState): void
  onDelete(id: string): void
}) {
  const selected = props.selected
  return (
    <div className="scene-initial-states">
      <section className="script-scheme-strip" aria-label="初始状态方案">
        <header>
          <div className="script-section-heading">
            <strong className="script-section-title">状态方案</strong>
            <span className="script-section-count">{props.states.length} 个方案</span>
          </div>
          <DsButton size="compact" variant="secondary" icon="add" onClick={() => props.onCreate()}>
            新建状态方案
          </DsButton>
        </header>
        <nav className="script-scheme-card-list initial-state-cards" aria-label="状态方案列表">
          {props.states.map((state) => (
            <div
              key={state.id}
              className={`script-scheme-card${state.id === selected?.id ? ' active' : ''}`}
            >
              <DsPressable
                className="script-scheme-card-select"
                aria-pressed={state.id === selected?.id}
                onClick={() => props.onSelect(state.id)}
              >
                <strong>{state.name}</strong>
                <span>{state.entities.length} 个实体</span>
              </DsPressable>
            </div>
          ))}
        </nav>
      </section>
      {selected ? (
        <>
          <div className="initial-state-details">
            <DsFieldGroup>
              <DsDraftTextField
                label="方案名称"
                aria-label="初始状态方案名称"
                size="compact"
                draftKey={`initial-state:${selected.id}:name`}
                syncToken={props.revision}
                value={selected.name}
                validate={(value) => (value.trim() ? undefined : '名称不能为空')}
                onCommit={(name) => props.onChange({ ...selected, name: name.trim() })}
              />
            </DsFieldGroup>
            <div className="initial-state-actions">
              <DsButton size="compact" variant="secondary" onClick={() => props.onCreate(selected)}>
                复制方案
              </DsButton>
              <DsButton
                size="compact"
                variant="quiet"
                disabled={props.references > 0}
                title={
                  props.references
                    ? `已有 ${props.references} 个步骤使用此方案，请先更改这些步骤的选择`
                    : '删除方案，可撤销'
                }
                onClick={() => props.onDelete(selected.id)}
              >
                删除方案
              </DsButton>
            </div>
          </div>
          <div className="initial-state-entity-heading">
            <strong>包含实体 · {selected.entities.length}</strong>
            <DsMultiSelect
              label="管理方案实体"
              summaryMode="count"
              size="compact"
              options={props.scene.entities.map((entity) => ({
                value: entity.id,
                label: entityDisplayLabel(entity, props.actorsById, props.locale),
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
          </div>
          <section className="initial-state-entities" aria-label="方案实体列表">
            {selected.entities.map((entry) => {
              const entity = props.scene.entities.find((e) => e.id === entry.entityId)
              const pos = entry.pos ?? entity?.pos
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
                        ? entityDisplayLabel(entity, props.actorsById, props.locale)
                        : `${entry.entityId}（实体已不存在）`}
                    </strong>
                    <span>
                      {pos ? `位置 ${pos.col}, ${pos.row}, ${pos.height}` : '引用失效'}
                      {(entry.hidden ?? entity?.hidden) ? ' · 隐藏' : ''}
                    </span>
                  </span>
                </DsButton>
              )
            })}
          </section>
          {!selected.entities.length ? (
            <p className="hint2">
              从“管理方案实体”添加 NPC，再在右侧编辑属性或在上方画布拖动站位。
            </p>
          ) : null}
          <p className="hint2">
            上方画布已加载此方案。未配置的实体使用场景默认状态。
            {props.references ? `此方案供 ${props.references} 个步骤共用。` : ''}
            修改可撤销，随项目一起保存。
          </p>
          {props.missingReferences ? (
            <p className="hint2">
              {props.missingReferences} 个引用的脚本步骤已不存在，删除方案时一并清理。
            </p>
          ) : null}
        </>
      ) : (
        <p className="hint2">
          新建一套初始状态，添加需要摆位的实体。选中方案后，上方场景立即显示这套状态。
        </p>
      )}
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
      <DsInspectorSection title="初始状态" description="先在下方新建或选择一套状态方案。">
        <span />
      </DsInspectorSection>
    )
  if (!entity)
    return (
      <DsInspectorSection
        title={state.name}
        description={
          entityId ? `实体 ${entityId} 已不存在。` : '在下方实体列表或上方画布选择一个实体。'
        }
      >
        {entityId ? <DsButton onClick={() => props.onRemove(entityId)}>移出方案</DsButton> : null}
      </DsInspectorSection>
    )
  const name = entityDisplayLabel(entity, props.actorsById, props.locale)
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
              移出方案
            </DsButton>
          </div>
          <p className="hint2">这些属性只用于预览，不修改场景里的默认实体。</p>
        </>
      ) : (
        <>
          <p className="hint2">此实体当前沿用场景默认状态。</p>
          <DsButton onClick={() => props.onChange({ entityId: entity.id })}>加入此方案</DsButton>
        </>
      )}
    </DsInspectorSection>
  )
}
