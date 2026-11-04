import type { ActorDef, GridPos, Locale, SceneDef } from '@type-pal/content'
import { entityDisplayName } from '../core/entity-display.js'
import type { PreviewEntityState, ScriptPreviewState } from '../core/script-preview-library.js'
import {
  DsButton,
  DsDraftNumberInput,
  DsInspectorSection,
  DsPropertyGrid,
  DsPropertyRow,
  DsSelect,
} from './design-system/index.js'

export function previewEntityName(
  entity: { id: string; label?: string; actor?: string; pos: GridPos },
  actors: Record<string, ActorDef>,
  locale: Locale,
): string {
  return entity.label || (entity.actor && actors[entity.actor])
    ? entityDisplayName(entity, actors, locale)
    : `未命名对象 · ${entity.id}`
}

export function SceneInitialStateInspector(props: {
  state?: ScriptPreviewState
  sceneId: string
  entity?: SceneDef['entities'][number]
  entityId?: string
  actorsById: Record<string, ActorDef>
  locale: Locale
  revision: string | number
  onChange(entry: PreviewEntityState): void
  onRemove(entityId: string): void
}) {
  const { state, entity, entityId } = props
  const entry = state?.scenes
    .find((slice) => slice.sceneId === props.sceneId)
    ?.entities.find((e) => e.entityId === entityId)
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
          entityId ? '此角色或物件已不存在。' : '在角色与物件列表或画布选择一个角色或物件。'
        }
      >
        {entityId ? <DsButton onClick={() => props.onRemove(entityId)}>移出状态</DsButton> : null}
      </DsInspectorSection>
    )
  const name = previewEntityName(entity, props.actorsById, props.locale)
  const prefix = `initial-state:${state.id}:${props.sceneId}:${entity.id}`
  const change = (patch: Partial<PreviewEntityState>) => {
    const next = { ...entry, entityId: entity.id, ...patch }
    for (const key of Object.keys(next) as (keyof PreviewEntityState)[])
      if (next[key] === undefined) delete next[key]
    props.onChange(next)
  }
  const pos = entry?.pos ?? entity.pos
  return (
    <>
      <DsInspectorSection
        title="预览初始状态"
        description={`${state.name} / ${name}${entry ? '' : ' · 沿用场景默认状态'}`}
      >
        {entry ? (
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
        ) : (
          <DsButton onClick={() => props.onChange({ entityId: entity.id })}>
            加入此初始状态
          </DsButton>
        )}
      </DsInspectorSection>
      {entry ? (
        <DsInspectorSection
          title="配置操作"
          description="这些属性只用于预览，不修改场景里的默认站位。"
        >
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
        </DsInspectorSection>
      ) : null}
    </>
  )
}
