import { useMemo } from 'react'
import { type DsControlSize, DsSelect } from './design-system/controls.js'

export interface NamedIdChoice {
  id: string
  name: string
}

export function namedIdChoiceLabel(choice: NamedIdChoice): string {
  return `${choice.name}（${choice.id}）`
}

/** 稳定引用统一选择器：作者看名称，保存不透明 id；悬空引用必须显式报警。 */
export function NamedIdPicker(props: {
  value: string
  choices: readonly NamedIdChoice[]
  kindLabel: string
  inputName: string
  onChange: (id: string) => void
  size?: DsControlSize
}) {
  const choicesById = useMemo(
    () => new Map(props.choices.map((choice) => [choice.id, choice])),
    [props.choices],
  )
  const selected = choicesById.get(props.value)
  const options = useMemo(
    () => [
      ...(!selected && props.value
        ? [
            {
              value: props.value,
              label: `未知${props.kindLabel}`,
              description: props.value,
            },
          ]
        : []),
      ...props.choices.map((choice) => ({
        value: choice.id,
        label: choice.name,
        description: choice.id,
      })),
    ],
    [props.choices, props.kindLabel, props.value, selected],
  )

  return (
    <span className="cf-named-ref-picker">
      <DsSelect
        invalid={!selected}
        size={props.size}
        data-input-name={props.inputName}
        value={props.value}
        options={options}
        searchable
        aria-label={`${props.kindLabel}（可按名称或 ID 搜索）`}
        placeholder={`搜索${props.kindLabel}名称或 ID…`}
        onValueChange={(value) => {
          if (value !== props.value) props.onChange(value)
        }}
      />
    </span>
  )
}
