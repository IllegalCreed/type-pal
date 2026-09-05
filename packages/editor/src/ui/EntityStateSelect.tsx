import { type DsOption, DsSelect } from './design-system/index.js'

const CANONICAL_ENTITY_STATE_OPTIONS: readonly DsOption[] = [
  {
    value: '0',
    label: '隐藏',
    description: '不显示，也不参与碰撞',
  },
  {
    value: '1',
    label: '显示，可通行',
    description: '显示实体，但不阻挡移动',
  },
  {
    value: '2',
    label: '显示，阻挡通行',
    description: '显示实体，并参与碰撞',
  },
]

function isCanonicalEntityState(value: number): value is 0 | 1 | 2 {
  return value === 0 || value === 1 || value === 2
}

export function entityStateSemanticLabel(value: number): string {
  if (value <= 0) return '隐藏'
  if (value === 1) return '显示，可通行'
  return '显示，阻挡通行'
}

export function entityStateDisplayLabel(value: number): string {
  const semantic = entityStateSemanticLabel(value)
  return isCanonicalEntityState(value) ? semantic : `${semantic}（原值 ${value}）`
}

function entityStateOptions(value: number): readonly DsOption[] {
  if (isCanonicalEntityState(value)) return CANONICAL_ENTITY_STATE_OPTIONS
  return [
    {
      value: String(value),
      label: `当前原值 ${value}（${entityStateSemanticLabel(value)}）`,
      description: '保留现有脚本的精确状态；选择其他项后改写为规范值',
    },
    ...CANONICAL_ENTITY_STATE_OPTIONS,
  ]
}

export function EntityStateSelect(props: {
  value: number
  onChange: (value: number) => void
  'aria-label'?: string
}) {
  return (
    <DsSelect
      size="compact"
      aria-label={props['aria-label'] ?? '状态'}
      value={String(props.value)}
      options={entityStateOptions(props.value)}
      onValueChange={(value) => props.onChange(Number(value))}
    />
  )
}
