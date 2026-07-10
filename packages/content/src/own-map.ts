/** 自有地图 v1：可变尺寸、N 个视觉层、独立碰撞层。 */
export interface OwnMapLayer {
  /** 稳定身份；重排图层不改变 id。 */
  id: string
  name: string
  /** 该层瓦片是否参与角色遮挡深度排序。 */
  occlude: boolean
  /** 错排菱形 lattice：[2 * map.height] 行 × [map.width] 列。 */
  tiles: (number | null)[][]
}

export interface OwnMap {
  version: 1
  /** 旧 cell 矩形的逻辑尺寸；lattice 实际有 2 * height 行。 */
  width: number
  height: number
  tileset: string
  /** 数组顺序就是 z 序；身份必须使用 layer.id。 */
  layers: OwnMapLayer[]
  /** 与视觉层同 lattice 尺寸；0 可通行，非 0 阻挡/预留地形类型。 */
  collision: number[][]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 仅用于旧 Tilemap / OwnMap v1 联合的快速分流；完整数据仍须过 validateOwnMap。 */
export function isOwnMap(value: unknown): value is OwnMap {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.layers) &&
    Array.isArray(value.collision)
  )
}

function requirePositiveInt(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${path}: 期望正整数`)
  return value as number
}

function validateMatrix<T>(
  value: unknown,
  rows: number,
  cols: number,
  path: string,
  validateCell: (cell: unknown, path: string) => T,
): T[][] {
  if (!Array.isArray(value) || value.length !== rows) throw new Error(`${path}: 期望 ${rows} 行`)
  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== cols)
      throw new Error(`${path}[${rowIndex}]: 期望 ${cols} 列`)
    return row.map((cell, colIndex) => validateCell(cell, `${path}[${rowIndex}][${colIndex}]`))
  })
}

/** 加载边界的完整 guard；返回原对象，失败时给出可定位的字段路径。 */
export function validateOwnMap(value: unknown): OwnMap {
  if (!isRecord(value)) throw new Error('ownMap: 期望对象')
  if (value.version !== 1)
    throw new Error(`ownMap.version: 仅支持 1，收到 ${String(value.version)}`)

  const width = requirePositiveInt(value.width, 'ownMap.width')
  const height = requirePositiveInt(value.height, 'ownMap.height')
  if (typeof value.tileset !== 'string' || value.tileset.length === 0)
    throw new Error('ownMap.tileset: 期望非空字符串')
  if (!Array.isArray(value.layers) || value.layers.length === 0)
    throw new Error('ownMap.layers: 至少需要一个视觉层')

  const ids = new Set<string>()
  const rows = height * 2
  const layers: OwnMapLayer[] = value.layers.map((raw, index) => {
    const path = `ownMap.layers[${index}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    if (typeof raw.id !== 'string' || raw.id.length === 0)
      throw new Error(`${path}.id: 期望非空字符串`)
    if (ids.has(raw.id)) throw new Error(`${path}.id: 重复的稳定 id "${raw.id}"`)
    ids.add(raw.id)
    if (typeof raw.name !== 'string' || raw.name.length === 0)
      throw new Error(`${path}.name: 期望非空字符串`)
    if (typeof raw.occlude !== 'boolean') throw new Error(`${path}.occlude: 期望 boolean`)
    const tiles = validateMatrix(raw.tiles, rows, width, `${path}.tiles`, (cell, cellPath) => {
      if (cell === null) return null
      if (!Number.isInteger(cell) || (cell as number) < 0)
        throw new Error(`${cellPath}: 期望非负整数 tileId 或 null`)
      return cell as number
    })
    return { id: raw.id, name: raw.name, occlude: raw.occlude, tiles }
  })

  const collision = validateMatrix(
    value.collision,
    rows,
    width,
    'ownMap.collision',
    (cell, path) => {
      if (!Number.isInteger(cell) || (cell as number) < 0) throw new Error(`${path}: 期望非负整数`)
      return cell as number
    },
  )

  return {
    version: 1,
    width,
    height,
    tileset: value.tileset,
    layers,
    collision,
  }
}
