import { type IsometricMapContent, validateIsometricMapContent } from './project-map.js'

/** 可复用局部等距地图；heights 是相对放置基面的高度。 */
export interface StampTemplate extends IsometricMapContent<number | null> {
  id: string
  name: string
  category?: string
  origin: 'authored' | 'migrated'
  /** 局部 surface 内的稳定放置锚点；允许锚在空格。 */
  anchor: { row: number; col: number }
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${path}: 期望非空字符串`)
  return value
}

function nonNegativeInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(`${path}: 期望非负安全整数`)
  return value as number
}

/** 加载边界 guard；模板与地图直接复用同一份 canonical content validator。 */
export function validateStampTemplates(value: unknown): StampTemplate[] {
  if (!Array.isArray(value)) throw new Error('stamps: 期望数组')
  const templateIds = new Set<string>()
  return value.map((entry, index): StampTemplate => {
    const path = `stamps[${index}]`
    const raw = recordAt(entry, path)
    const id = nonEmptyString(raw.id, `${path}.id`)
    if (id.includes('/')) throw new Error(`${path}.id: id 不得含 '/'`)
    if (templateIds.has(id)) throw new Error(`${path}.id: 重复 id "${id}"`)
    templateIds.add(id)
    const name = nonEmptyString(raw.name, `${path}.name`)
    const category =
      raw.category === undefined ? undefined : nonEmptyString(raw.category, `${path}.category`)
    if (raw.origin !== 'authored' && raw.origin !== 'migrated')
      throw new Error(`${path}.origin: 期望 authored 或 migrated`)
    const anchorRaw = recordAt(raw.anchor, `${path}.anchor`)
    const content = validateIsometricMapContent(raw, { path, collision: 'nullable' })
    const anchor = {
      row: nonNegativeInt(anchorRaw.row, `${path}.anchor.row`),
      col: nonNegativeInt(anchorRaw.col, `${path}.anchor.col`),
    }
    if (anchor.row >= content.height * 2 || anchor.col >= content.width)
      throw new Error(`${path}.anchor: 锚点超出局部 surface`)
    if (
      !content.layers.some((layer) => layer.tiles.some((row) => row.some((tile) => tile !== null)))
    )
      throw new Error(`${path}: 组合必须至少包含一个视觉瓦片实例`)

    return {
      id,
      name,
      ...(category === undefined ? {} : { category }),
      origin: raw.origin,
      anchor,
      ...content,
    }
  })
}

/** 独立模板表的确定性格式化入口；加载和编辑器保存共用同一规范化顺序。 */
export function formatStampTemplates(value: readonly StampTemplate[]): string {
  return `${JSON.stringify(validateStampTemplates(value), null, 2)}\n`
}

export function parseStampTemplates(text: string): StampTemplate[] {
  return validateStampTemplates(JSON.parse(text) as unknown)
}
