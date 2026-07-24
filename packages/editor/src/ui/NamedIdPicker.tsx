import { useEffect, useId, useMemo, useState } from 'react'

export interface NamedIdChoice {
  id: string
  name: string
}

export function namedIdChoiceLabel(choice: NamedIdChoice): string {
  return `${choice.name}（${choice.id}）`
}

function findNamedIdChoice(
  choices: readonly NamedIdChoice[],
  input: string,
): NamedIdChoice | undefined {
  const value = input.trim()
  const exactLabel = choices.find((choice) => namedIdChoiceLabel(choice) === value)
  if (exactLabel) return exactLabel

  const exactId = choices.find((choice) => choice.id === value)
  if (exactId) return exactId

  const byName = choices.filter((choice) => choice.name === value)
  return byName.length === 1 ? byName[0] : undefined
}

/** 稳定引用统一选择器：作者看名称，保存不透明 id；悬空引用必须显式报警。 */
export function NamedIdPicker(props: {
  value: string
  choices: readonly NamedIdChoice[]
  kindLabel: string
  inputName: string
  onChange: (id: string) => void
}) {
  const listId = useId()
  const choicesById = useMemo(
    () => new Map(props.choices.map((choice) => [choice.id, choice])),
    [props.choices],
  )
  const selected = choicesById.get(props.value)
  const selectedLabel = selected
    ? namedIdChoiceLabel(selected)
    : `未知${props.kindLabel}（${props.value}）`
  const [input, setInput] = useState(selectedLabel)

  useEffect(() => {
    setInput(selectedLabel)
  }, [selectedLabel])

  const choose = (rawValue: string): void => {
    setInput(rawValue)
    const choice = findNamedIdChoice(props.choices, rawValue)
    if (!choice) return
    setInput(namedIdChoiceLabel(choice))
    if (choice.id !== props.value) props.onChange(choice.id)
  }

  return (
    <span className="cf-named-ref-picker">
      <input
        className={`in cf-named-ref-input${selected ? '' : ' missing'}`}
        type="search"
        name={props.inputName}
        list={listId}
        value={input}
        autoComplete="off"
        spellCheck={false}
        aria-label={`${props.kindLabel}（可按名称或 ID 搜索）`}
        placeholder={`搜索${props.kindLabel}名称或 ID…`}
        onChange={(event) => choose(event.target.value)}
        onBlur={() => setInput(selectedLabel)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setInput(selectedLabel)
            event.currentTarget.blur()
          }
          if (event.key === 'Enter') {
            const choice = findNamedIdChoice(props.choices, event.currentTarget.value)
            if (!choice) return
            event.preventDefault()
            choose(namedIdChoiceLabel(choice))
          }
        }}
      />
      <datalist id={listId}>
        {props.choices.map((choice) => (
          <option key={choice.id} value={namedIdChoiceLabel(choice)} />
        ))}
      </datalist>
    </span>
  )
}
