import type { ActorDef, GridPos, Locale, SceneDef } from '@type-pal/content'
import { entityDisplayName } from '../core/entity-display.js'
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
  missingReferences: number
  contextLabel?: string
  contextEntityId?: string
  stepStateIds?: ReadonlySet<string>
  boundStateId?: string
  onBack?(): void
  onUseForStep?(id: string): void
  revision: string | number
  onSelect(id: string): void
  onSelectEntity(id: string): void
  onCreate(copy?: SceneInitialState): void
  onChange(state: SceneInitialState): void
  onDelete(id: string): void
}) {
  const selected = props.selected
  const references = selected ? (props.usage[selected.id] ?? []) : []
  const participants = [...(selected?.entities ?? [])].sort(
    (left, right) =>
      Number(right.entityId === props.contextEntityId) -
      Number(left.entityId === props.contextEntityId),
  )
  const participantName = (entityId: string) => {
    const entity = props.scene.entities.find((candidate) => candidate.id === entityId)
    return entity ? previewEntityName(entity, props.actorsById, props.locale) : '已移除的角色或物件'
  }
  const participantSummary = (state: SceneInitialState) => {
    const participants = [...state.entities].sort(
      (left, right) =>
        Number(right.entityId === props.contextEntityId) -
        Number(left.entityId === props.contextEntityId),
    )
    const names = participants
      .slice(0, 2)
      .map((entry) => participantName(entry.entityId))
      .join('、')
    return participants.length > 2 ? `${names}，另 ${participants.length - 2} 个` : names
  }
  const related = props.states.filter((state) => props.stepStateIds?.has(state.id))
  const other = props.states.filter((state) => !props.stepStateIds?.has(state.id))
  const renderStates = (items: readonly SceneInitialState[], label: string) => (
    <nav className="initial-state-list" aria-label={label}>
      {items.map((state) => (
        <DsPressable
          key={state.id}
          className={`initial-state-row${state.id === selected?.id ? ' active' : ''}`}
          aria-pressed={state.id === selected?.id}
          onClick={() => props.onSelect(state.id)}
        >
          <span className="initial-state-row-heading">
            <strong>{state.name}</strong>
            {state.id === props.boundStateId ? <span>当前步骤使用</span> : null}
          </span>
          <span>
            {(props.usage[state.id] ?? []).length
              ? `用于 ${props.usage[state.id]!.length} 个步骤`
              : '尚未用于脚本步骤'}
            {' · '}
            {state.entities.length ? participantSummary(state) : '尚未添加；均沿用场景默认'}
          </span>
        </DsPressable>
      ))}
    </nav>
  )
  return (
    <div className="scene-initial-states">
      {props.contextLabel ? (
        <div className="initial-state-context">
          <DsButton size="compact" variant="secondary" onClick={props.onBack}>
            返回脚本步骤
          </DsButton>
          <div>
            <span>正在编辑预览初态</span>
            <strong>{props.contextLabel}</strong>
          </div>
        </div>
      ) : null}
      <section className="initial-state-library" aria-label="预览初态">
        <header>
          <div className="script-section-heading">
            <strong className="script-section-title">可选预览初态</strong>
            <span className="script-section-count">{props.states.length} 份</span>
          </div>
          <DsButton size="compact" variant="secondary" icon="add" onClick={() => props.onCreate()}>
            新建预览初态
          </DsButton>
        </header>
        {props.stepStateIds ? (
          <>
            <strong className="script-section-title">
              {props.contextEntityId ? '当前角色使用的初态' : '当前脚本使用的初态'}
            </strong>
            {related.length ? (
              renderStates(related, '预览初态列表')
            ) : (
              <p className="hint2">尚未选择初态。可以新建，也可以展开下方其他初态后选用。</p>
            )}
            {other.length ? (
              <details
                className="initial-state-other"
                open={!!selected && !props.stepStateIds.has(selected.id)}
              >
                <summary>场景其他初态与未分配 · {other.length} 份</summary>
                {renderStates(other, '场景其他初态列表')}
              </details>
            ) : null}
          </>
        ) : (
          renderStates(props.states, '预览初态列表')
        )}
      </section>
      {selected ? (
        <>
          <div className="initial-state-details">
            <DsFieldGroup>
              <DsDraftTextField
                label="初态名称"
                aria-label="预览初态名称"
                size="compact"
                draftKey={`initial-state:${selected.id}:name`}
                syncToken={props.revision}
                value={selected.name}
                validate={(value) => (value.trim() ? undefined : '名称不能为空')}
                onCommit={(name) => props.onChange({ ...selected, name: name.trim() })}
              />
            </DsFieldGroup>
            <div className="initial-state-actions">
              {props.onUseForStep ? (
                <DsButton
                  size="compact"
                  variant="secondary"
                  disabled={selected.id === props.boundStateId}
                  onClick={() => props.onUseForStep?.(selected.id)}
                >
                  {selected.id === props.boundStateId ? '当前步骤正在使用' : '用于当前步骤'}
                </DsButton>
              ) : null}
              <DsButton size="compact" variant="secondary" onClick={() => props.onCreate(selected)}>
                复制初态
              </DsButton>
              <DsButton
                size="compact"
                variant="quiet"
                disabled={references.length > 0}
                title={
                  references.length
                    ? `已有 ${references.length} 个步骤使用此初态，请先更改这些步骤的选择`
                    : '删除初态，可撤销'
                }
                onClick={() => props.onDelete(selected.id)}
              >
                删除初态
              </DsButton>
            </div>
          </div>
          {references.length ? (
            <div className="initial-state-usage">
              <strong>{references.length > 1 ? '这些步骤共用此初态' : '使用此初态的步骤'}</strong>
              <ul>
                {references.map((label, index) => (
                  <li key={`${index}:${label}`}>{label}</li>
                ))}
              </ul>
              {references.length > 1 ? (
                <p>
                  修改会影响以上所有步骤。
                  {props.contextLabel
                    ? '只想调整当前步骤时，先复制初态，再选择“用于当前步骤”。'
                    : '如需不同的开场布置，先复制初态，再回到对应脚本步骤选择副本。'}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="initial-state-entity-heading">
            <strong>开场时的角色与物件 · {selected.entities.length}</strong>
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
          </div>
          <p className="hint2">
            一段脚本开场时，可以同时摆好多个角色与物件。只添加需要调整的对象；其余沿用场景默认。
            点击下方角色编辑位置、朝向和显隐，也可在上方画布拖动摆位。
          </p>
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
          <p className="hint2">
            上方画布已加载此初态。选择列表中的另一份只切换编辑对象，不改变步骤的选择。
            修改可撤销，随项目一起保存；复制初态不会改变其他步骤。
          </p>
          {props.missingReferences ? (
            <p className="hint2">
              {props.missingReferences} 个引用的脚本步骤已不存在，删除初态时一并清理。
            </p>
          ) : null}
        </>
      ) : (
        <p className="hint2">
          可为同一段脚本准备多份初态，例如“门口迎客前”和“回房后”。新建后添加需要摆位的角色或物件，
          再在脚本步骤选择要使用的初态。
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
      <DsInspectorSection title="初始状态" description="先在下方新建或选择一份预览初态。">
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
        {entityId ? <DsButton onClick={() => props.onRemove(entityId)}>移出初态</DsButton> : null}
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
              移出初态
            </DsButton>
          </div>
          <p className="hint2">这些属性只用于预览，不修改场景里的默认站位。</p>
        </>
      ) : (
        <>
          <p className="hint2">此角色或物件当前沿用场景默认状态。</p>
          <DsButton onClick={() => props.onChange({ entityId: entity.id })}>加入此初态</DsButton>
        </>
      )}
    </DsInspectorSection>
  )
}
