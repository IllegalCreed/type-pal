import type { BattleSpriteDef, BattleSpriteProfileKind } from '@type-pal/content'
import {
  DsControlGroup,
  type DsControlSize,
  DsIconButton,
  DsSelect,
} from './design-system/controls.js'

export function BattleSpritePicker(props: {
  id?: string
  value?: string
  definitions: readonly BattleSpriteDef[]
  kind: BattleSpriteProfileKind
  onChange: (id: string) => void
  onOpenDefinition?: (id: string) => void
  ariaLabel?: string
  allowUnset?: boolean
  unsetLabel?: string
  size?: DsControlSize
}) {
  const compatible = props.definitions.filter((entry) => entry.profile.kind === props.kind)
  const selected = props.value
    ? props.definitions.find((entry) => entry.id === props.value)
    : undefined
  const missing = !!props.value && !selected
  const incompatible = !!selected && selected.profile.kind !== props.kind
  return (
    <DsControlGroup
      className="linked-control"
      control={
        <DsSelect
          id={props.id}
          value={props.value ?? ''}
          size={props.size}
          aria-label={props.ariaLabel ?? '战斗精灵定义'}
          invalid={missing || incompatible}
          onValueChange={props.onChange}
          options={[
            ...(props.allowUnset
              ? [{ value: '', label: props.unsetLabel ?? '（不改战斗形象）' }]
              : []),
            ...(missing && props.value
              ? [{ value: props.value, label: `缺失：${props.value}` }]
              : []),
            ...(incompatible && selected
              ? [
                  {
                    value: selected.id,
                    label: `不兼容：${selected.label} · 实际 ${selected.profile.kind}`,
                  },
                ]
              : []),
            ...(!props.allowUnset && !props.value && compatible.length === 0
              ? [{ value: '', label: `暂无 ${props.kind} 定义` }]
              : []),
            ...compatible.map((entry) => ({
              value: entry.id,
              label: `${entry.label} · ${entry.id}`,
            })),
          ]}
        />
      }
      actions={
        <DsIconButton
          variant="secondary"
          size={props.size}
          icon="open"
          label={`打开战斗精灵 ${props.value ?? ''}`}
          disabled={!selected || !props.onOpenDefinition}
          onClick={() => props.value && props.onOpenDefinition?.(props.value)}
        />
      }
    />
  )
}
