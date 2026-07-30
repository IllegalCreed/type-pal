import type { BattleSpriteDef, BattleSpriteProfileKind } from '@type-pal/content'

export function BattleSpritePicker(props: {
  value?: string
  definitions: readonly BattleSpriteDef[]
  kind: BattleSpriteProfileKind
  onChange: (id: string) => void
  onOpenDefinition?: (id: string) => void
  ariaLabel?: string
  allowUnset?: boolean
  unsetLabel?: string
}) {
  const compatible = props.definitions.filter((entry) => entry.profile.kind === props.kind)
  const selected = props.value
    ? props.definitions.find((entry) => entry.id === props.value)
    : undefined
  const missing = !!props.value && !selected
  const incompatible = !!selected && selected.profile.kind !== props.kind
  return (
    <div className="linked-control">
      <select
        className={`in${missing || incompatible ? ' invalid' : ''}`}
        value={props.value ?? ''}
        aria-label={props.ariaLabel ?? '战斗精灵定义'}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.allowUnset && <option value="">{props.unsetLabel ?? '（不改战斗形象）'}</option>}
        {missing && <option value={props.value}>缺失：{props.value}</option>}
        {incompatible && (
          <option value={selected.id}>
            不兼容：{selected.label} · 实际 {selected.profile.kind}
          </option>
        )}
        {!props.allowUnset && !props.value && compatible.length === 0 && (
          <option value="">暂无 {props.kind} 定义</option>
        )}
        {compatible.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label} · {entry.id}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="linked-value-open"
        title="在战斗精灵库中打开"
        aria-label={`打开战斗精灵 ${props.value ?? ''}`}
        disabled={!selected || !props.onOpenDefinition}
        onClick={() => props.value && props.onOpenDefinition?.(props.value)}
      >
        ↗
      </button>
    </div>
  )
}
