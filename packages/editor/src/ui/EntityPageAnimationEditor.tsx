import type { EntityPage, SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { sortedSpriteActions } from '../core/sprite-actions.js'

export function EntityPageAnimationEditor(props: {
  page: EntityPage | undefined
  pageIndex: number
  sprite: SpriteDef | undefined
  onChange: (binding: SpriteActionBinding | undefined) => void
  onOpenAction?: (spriteId: string, actionId: string) => void
}) {
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
    <section
      className="entity-page-animation-editor"
      aria-label={`第 ${props.pageIndex + 1} 页默认动作`}
    >
      <div className="entity-page-animation-toggle">
        <label>
          <input
            type="checkbox"
            checked={!!binding}
            disabled={!props.sprite || actions.length === 0}
            onChange={(event) => (event.target.checked ? enable() : props.onChange(undefined))}
          />
          页面激活时播放预制动作
        </label>
        {!props.sprite ? (
          <small>当前实体没有可解析精灵。</small>
        ) : actions.length === 0 ? (
          <small>精灵“{props.sprite.label || props.sprite.id}”尚未定义动作。</small>
        ) : null}
      </div>

      {binding ? (
        <>
          <div className="field">
            <span className="field-label">动作</span>
            <div className="entity-page-animation-action-row">
              <select
                className="in"
                aria-label="页面默认动作"
                value={bindingValid ? binding.action : ''}
                onChange={(event) => {
                  const entry = actions.find((action) => action.id === event.target.value)
                  if (!entry || !props.sprite) return
                  props.onChange({
                    sprite: props.sprite.id,
                    action: entry.id,
                    loop: entry.action.loopFrom !== undefined,
                  })
                }}
              >
                {!bindingValid ? (
                  <option value="">
                    {binding.sprite}/{binding.action}（引用失效）
                  </option>
                ) : null}
                {actions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    动作 #{entry.index} · {entry.action.label} · {entry.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mini-txt"
                disabled={!bindingValid}
                onClick={() => bindingValid && props.onOpenAction?.(binding.sprite, binding.action)}
              >
                打开动作 ↗
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">播放</span>
            <label className="entity-page-animation-checkbox">
              <input
                type="checkbox"
                checked={binding.loop}
                onChange={(event) => patch({ loop: event.target.checked })}
              />
              循环
            </label>
          </div>
          <div className="field">
            <span className="field-label">起始相位</span>
            <div className="entity-page-animation-start">
              <input
                className="in mono"
                type="number"
                min={0}
                step={10}
                value={binding.startAtMs ?? 0}
                aria-label="动作起始相位（毫秒）"
                onChange={(event) => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return
                  const startAtMs = Math.max(0, Math.trunc(event.target.valueAsNumber))
                  patch(startAtMs === 0 ? { startAtMs: undefined } : { startAtMs })
                }}
              />
              <span>ms</span>
            </div>
          </div>
          <p className={`entity-page-animation-status${bindingValid ? '' : ' invalid'}`}>
            {bindingValid
              ? `引用 ${binding.sprite}/${binding.action}；每个场景实例拥有独立播放相位。`
              : '当前复合引用与实体精灵或动作定义不匹配，请重新选择。'}
          </p>
        </>
      ) : null}
    </section>
  )
}
