import type { SceneDef, WorldVariableKindV1, WorldVariableRegistryV1 } from '@type-pal/content'
import { useEffect, useState } from 'react'
import {
  DsButton,
  DsNumberInput,
  DsSelect,
  DsTextArea,
  DsTextInput,
} from './design-system/index.js'

export function Row(props: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Row 的 children 契约是表单控件，静态分析无法穿透 ReactNode。
    <label className="cf-row">
      <span className="cf-label">{props.label}</span>
      {props.children}
    </label>
  )
}

export function Num(props: {
  value: number
  onChange: (n: number) => void
  step?: number
  'aria-label'?: string
  name?: string
  autoComplete?: string
  className?: string
}) {
  return (
    <DsNumberInput
      size="compact"
      value={props.value}
      step={props.step ?? 1}
      aria-label={props['aria-label']}
      name={props.name}
      autoComplete={props.autoComplete}
      className={props.className}
      onChange={(event) => props.onChange(Number(event.target.value))}
    />
  )
}

export function Txt(props: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <DsTextInput
      size="compact"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

export function Sel<T extends string>(props: {
  value: T
  options: readonly T[]
  /** 可选显示名(与 options 同序;缺省显示 option 值本身)。 */
  labels?: readonly string[]
  onChange: (value: T) => void
}) {
  return (
    <DsSelect
      size="compact"
      value={props.value}
      options={props.options.map((value, index) => ({
        value,
        label: props.labels?.[index] ?? value,
      }))}
      onValueChange={(value) => props.onChange(value as T)}
    />
  )
}

export function WorldVariablePicker(props: {
  value: string
  kind: WorldVariableKindV1
  variables?: WorldVariableRegistryV1
  onChange: (id: string) => void
  onOpen?: (id: string) => void
}) {
  const definitions = Object.entries(props.variables ?? {})
    .filter(([, definition]) => definition.kind === props.kind)
    .sort(([aId, a], [bId, b]) => a.name.localeCompare(b.name, 'zh-CN') || aId.localeCompare(bId))
  const known = definitions.some(([id]) => id === props.value)
  const options = [
    ...(!known && props.value
      ? [{ value: props.value, label: `${props.value}（未登记）`, description: '保存前必须登记' }]
      : []),
    ...definitions.map(([id, definition]) => ({
      value: id,
      label: `${definition.name} · ${id}`,
      description: definition.description || undefined,
    })),
  ]
  return (
    <div className="cf-world-variable-picker">
      <DsSelect
        size="compact"
        value={props.value}
        options={options}
        placeholder={props.kind === 'flag' ? '选择开关' : '选择数值变量'}
        searchable
        onValueChange={props.onChange}
      />
      {props.onOpen && props.value ? (
        <DsButton size="compact" variant="quiet" onClick={() => props.onOpen?.(props.value)}>
          打开变量
        </DsButton>
      ) : null}
    </div>
  )
}

/** 实体 id 下拉(含空 = 手输)。 */
export function EntitySel(props: {
  value: string
  scene: SceneDef
  onChange: (id: string) => void
}) {
  const options = props.scene.entities.map((entity) => ({ value: entity.id, label: entity.id }))
  if (!props.scene.entities.some((entity) => entity.id === props.value))
    options.push({ value: props.value, label: `${props.value}(不在场)` })
  return (
    <DsSelect size="compact" value={props.value} options={options} onValueChange={props.onChange} />
  )
}

/** JSON 兜底编辑器。 */
export function JsonForm<TCommand extends { kind: string }>(props: {
  cmd: TCommand
  onChange: (command: TCommand) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(props.cmd, null, 2))
  const [error, setError] = useState('')
  useEffect(() => {
    setText(JSON.stringify(props.cmd, null, 2))
    setError('')
  }, [props.cmd])
  return (
    <div className="cf-json">
      <DsTextArea
        size="compact"
        monospace
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
      />
      {error ? <div className="cf-err">{error}</div> : null}
      <DsButton
        size="compact"
        onClick={() => {
          try {
            const parsed = JSON.parse(text) as TCommand
            if (
              typeof parsed !== 'object' ||
              !parsed ||
              typeof (parsed as { kind?: unknown }).kind !== 'string'
            )
              throw new Error('缺少 kind 字段')
            setError('')
            props.onChange(parsed)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
          }
        }}
      >
        应用 JSON
      </DsButton>
    </div>
  )
}
