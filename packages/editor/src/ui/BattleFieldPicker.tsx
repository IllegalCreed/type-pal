import { type BattleFieldDef, DEFAULT_BATTLE_FIELD_ID } from '@type-pal/content'
import { DsControlGroup, DsIconButton, DsSelect } from './design-system/controls.js'

function battleFieldLabel(field: BattleFieldDef): string {
  const id = String(field.id).padStart(3, '0')
  return field.name ? `${field.name} · #${id}` : `战场 #${id}`
}

export function BattleFieldPicker(props: {
  id?: string
  value: number | undefined
  fields: readonly BattleFieldDef[]
  unsetLabel: string
  ariaLabel: string
  onChange: (value: number | undefined) => void
  onOpen?: (fieldId: number) => void
}) {
  const known = props.value === undefined || props.fields.some((field) => field.id === props.value)
  const options = [
    { value: '', label: props.unsetLabel },
    ...(!known && props.value !== undefined
      ? [{ value: String(props.value), label: `战场 #${props.value}（缺失）` }]
      : []),
    ...[...props.fields]
      .sort((left, right) => left.id - right.id)
      .map((field) => ({
        value: String(field.id),
        label: `${battleFieldLabel(field)}${field.id === DEFAULT_BATTLE_FIELD_ID ? ' · 项目默认' : ''}`,
      })),
  ]
  return (
    <DsControlGroup
      className="linked-control battle-field-picker"
      control={
        <DsSelect
          id={props.id}
          aria-label={props.ariaLabel}
          invalid={!known}
          value={props.value == null ? '' : String(props.value)}
          options={options}
          onValueChange={(value) =>
            props.onChange(value === '' ? undefined : Number(value))
          }
        />
      }
      actions={
        props.value !== undefined && props.onOpen ? (
          <DsIconButton
            variant="secondary"
            icon="open"
            label={`打开战场 ${props.value}`}
            onClick={() => props.onOpen?.(props.value!)}
          />
        ) : undefined
      }
    />
  )
}
