import type { EntityPage, SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { sortedSpriteActions } from '../core/sprite-actions.js'
import { DsButton, DsCheckbox, DsDraftNumberInput, DsSelect } from './design-system/controls.js'
import { DsPropertyGrid, DsPropertyRow } from './design-system/recipes.js'

interface EntityPageAnimationFieldsProps {
  page: EntityPage | undefined
  sprite: SpriteDef | undefined
  onChange: (binding: SpriteActionBinding | undefined) => void
  onOpenAction?: (spriteId: string, actionId: string) => void
  draftScope?: string
  syncToken?: string | number
}

/**
 * 实体页属性网格中的动作字段。布局由外层 DsPropertyGrid 统一持有，避免嵌套网格产生另一套行距。
 */
export function EntityPageAnimationFields(props: EntityPageAnimationFieldsProps) {
  const actions = sortedSpriteActions(props.sprite)
  const binding = props.page?.animation
  const selected = actions.find((entry) => entry.id === binding?.action)
  const target = selected ?? actions[0]
  const bindingValid = !!(binding && props.sprite && binding.sprite === props.sprite.id && selected)

  const enable = (): void => {
    if (!props.sprite || !target) return
    props.onChange({
      sprite: props.sprite.id,
      action: target.id,
      loop: target.action.loopFrom !== undefined,
    })
  }

  const patch = (next: Partial<SpriteActionBinding>): void => {
    if (!props.sprite || !target) return
    props.onChange({
      sprite: props.sprite.id,
      action: bindingValid ? binding.action : target.id,
      loop: bindingValid ? binding.loop : target.action.loopFrom !== undefined,
      ...(bindingValid && binding.startAtMs !== undefined ? { startAtMs: binding.startAtMs } : {}),
      ...next,
    })
  }

  return (
    <>
      <DsPropertyRow
        label="预制动作"
        help={
          !props.sprite
            ? '当前实体没有可解析精灵。'
            : actions.length === 0
              ? `精灵“${props.sprite.label || props.sprite.id}”尚未定义动作。`
              : undefined
        }
      >
        <DsCheckbox
          size="compact"
          label="页面激活时播放预制动作"
          checked={!!binding}
          disabled={!props.sprite || actions.length === 0}
          onChange={(event) => (event.target.checked ? enable() : props.onChange(undefined))}
        />
      </DsPropertyRow>

      {binding ? (
        <>
          <DsPropertyRow
            label="动作"
            help={
              <span className={bindingValid ? undefined : 'entity-page-animation-status--invalid'}>
                {bindingValid
                  ? `引用 ${binding.sprite}/${binding.action}；每个场景实例拥有独立播放相位。`
                  : '当前复合引用与实体精灵或动作定义不匹配，请重新选择。'}
              </span>
            }
          >
            <div className="entity-page-animation-action-row">
              <DsSelect
                size="compact"
                aria-label="页面默认动作"
                value={bindingValid ? binding.action : ''}
                options={[
                  ...(!bindingValid
                    ? [
                        {
                          value: '',
                          label: `${binding.sprite}/${binding.action}（引用失效）`,
                        },
                      ]
                    : []),
                  ...actions.map((entry) => ({
                    value: entry.id,
                    label: `动作 #${entry.index} · ${entry.action.label}`,
                    description: entry.id,
                  })),
                ]}
                onValueChange={(value) => {
                  const entry = actions.find((action) => action.id === value)
                  if (!entry || !props.sprite) return
                  props.onChange({
                    sprite: props.sprite.id,
                    action: entry.id,
                    loop: entry.action.loopFrom !== undefined,
                  })
                }}
              />
              <DsButton
                size="compact"
                variant="secondary"
                icon="open"
                disabled={!bindingValid}
                onClick={() => bindingValid && props.onOpenAction?.(binding.sprite, binding.action)}
              >
                打开动作
              </DsButton>
            </div>
          </DsPropertyRow>
          <DsPropertyRow label="播放">
            <DsCheckbox
              size="compact"
              label="循环"
              checked={binding.loop}
              onChange={(event) => patch({ loop: event.target.checked })}
            />
          </DsPropertyRow>
          <DsPropertyRow label="起始相位">
            <div className="entity-page-animation-start">
              <DsDraftNumberInput
                size="compact"
                draftKey={`${props.draftScope ?? 'entity-page-animation'}:startAtMs`}
                syncToken={props.syncToken}
                min={0}
                step={10}
                integer
                value={binding.startAtMs ?? 0}
                aria-label="动作起始相位（毫秒）"
                onCommit={(value) => {
                  if (value === undefined) return
                  const startAtMs = Math.max(0, Math.trunc(value))
                  patch(startAtMs === 0 ? { startAtMs: undefined } : { startAtMs })
                }}
              />
              <span>ms</span>
            </div>
          </DsPropertyRow>
        </>
      ) : null}
    </>
  )
}

/** 独立使用时仍提供完整的共享属性网格。 */
export function EntityPageAnimationEditor(
  props: EntityPageAnimationFieldsProps & { pageIndex: number },
) {
  return (
    <section aria-label={`第 ${props.pageIndex + 1} 页默认动作`}>
      <DsPropertyGrid>
        <EntityPageAnimationFields
          page={props.page}
          sprite={props.sprite}
          onChange={props.onChange}
          onOpenAction={props.onOpenAction}
          draftScope={props.draftScope ?? `entity-page-animation:${props.pageIndex}`}
          syncToken={props.syncToken}
        />
      </DsPropertyGrid>
    </section>
  )
}
