/** 地图视觉层。高度属于格子实例，不属于 tileset 或 tileId。 */
export interface MapLayerV2 {
  /** 稳定身份；重排图层不改变 id。 */
  id: string
  name: string
  /** flat 只铺底；height 参与角色遮挡深度排序。 */
  depthMode: 'flat' | 'height'
  /** 错排菱形 lattice：[2 * map.height] 行 × [map.width] 列。 */
  tiles: (number | null)[][]
  /** 同位置瓦片实例的遮挡高度。flat 层可省略，等价于全 0。 */
  heights?: number[][]
}

/** 工程唯一的作者态地图格式。 */
export interface ProjectMapV2 {
  version: 2
  /** 旧 cell 矩形的逻辑尺寸；lattice 实际有 2 * height 行。 */
  width: number
  height: number
  /** 稳定 tileset 注册 id，不接受资产路径。 */
  tilesetId: string
  /** 数组顺序就是 z 序；身份必须使用 layer.id。 */
  layers: MapLayerV2[]
  /** 与视觉层同 lattice 尺寸；0 可通行，非 0 阻挡/预留地形类型。 */
  collision: number[][]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isProjectMapV2(value: unknown): value is ProjectMapV2 {
  return (
    isRecord(value) &&
    value.version === 2 &&
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

function validateHeightMatrix(
  value: unknown,
  rows: number,
  cols: number,
  path: string,
): number[][] {
  return validateMatrix(value, rows, cols, path, (cell, cellPath) => {
    if (!Number.isInteger(cell) || (cell as number) < 0)
      throw new Error(`${cellPath}: 期望非负整数高度`)
    return cell as number
  })
}

/** 加载边界完整 guard；返回规范化对象，flat 层的全零 heights 会被省略。 */
export function validateProjectMapV2(value: unknown): ProjectMapV2 {
  if (!isRecord(value)) throw new Error('projectMap: 期望对象')
  if (value.version !== 2)
    throw new Error(`projectMap.version: 仅支持 2，收到 ${String(value.version)}`)

  const width = requirePositiveInt(value.width, 'projectMap.width')
  const height = requirePositiveInt(value.height, 'projectMap.height')
  if (typeof value.tilesetId !== 'string' || value.tilesetId.length === 0)
    throw new Error('projectMap.tilesetId: 期望非空字符串')
  if (!Array.isArray(value.layers) || value.layers.length === 0)
    throw new Error('projectMap.layers: 至少需要一个视觉层')

  const ids = new Set<string>()
  const rows = height * 2
  const layers: MapLayerV2[] = value.layers.map((raw, index) => {
    const path = `projectMap.layers[${index}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    if (typeof raw.id !== 'string' || raw.id.length === 0)
      throw new Error(`${path}.id: 期望非空字符串`)
    if (ids.has(raw.id)) throw new Error(`${path}.id: 重复的稳定 id "${raw.id}"`)
    ids.add(raw.id)
    if (typeof raw.name !== 'string' || raw.name.length === 0)
      throw new Error(`${path}.name: 期望非空字符串`)
    if (raw.depthMode !== 'flat' && raw.depthMode !== 'height')
      throw new Error(`${path}.depthMode: 期望 flat 或 height`)
    const tiles = validateMatrix(raw.tiles, rows, width, `${path}.tiles`, (cell, cellPath) => {
      if (cell === null) return null
      if (!Number.isInteger(cell) || (cell as number) < 0)
        throw new Error(`${cellPath}: 期望非负整数 tileId 或 null`)
      return cell as number
    })

    if (raw.depthMode === 'height' && raw.heights === undefined)
      throw new Error(`${path}.heights: height 层必须提供实例高度矩阵`)
    const heights =
      raw.heights === undefined
        ? undefined
        : validateHeightMatrix(raw.heights, rows, width, `${path}.heights`)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < width; col++) {
        const instanceHeight = heights?.[row]?.[col] ?? 0
        if (tiles[row]?.[col] === null && instanceHeight !== 0)
          throw new Error(`${path}.heights[${row}][${col}]: 空瓦片高度必须为 0`)
        if (raw.depthMode === 'flat' && instanceHeight !== 0)
          throw new Error(`${path}.heights[${row}][${col}]: flat 层高度必须为 0`)
      }
    }

    const layer = {
      id: raw.id,
      name: raw.name,
      depthMode: raw.depthMode,
      tiles,
    }
    if (raw.depthMode === 'height') {
      if (!heights) throw new Error(`${path}.heights: height 层必须提供实例高度矩阵`)
      return { ...layer, depthMode: 'height', heights }
    }
    return { ...layer, depthMode: 'flat' }
  })

  const collision = validateMatrix(
    value.collision,
    rows,
    width,
    'projectMap.collision',
    (cell, path) => {
      if (!Number.isInteger(cell) || (cell as number) < 0) throw new Error(`${path}: 期望非负整数`)
      return cell as number
    },
  )

  return { version: 2, width, height, tilesetId: value.tilesetId, layers, collision }
}

/** flat 层省略 heights 时统一返回 0。 */
export function mapInstanceHeight(layer: MapLayerV2, row: number, col: number): number {
  return layer.heights?.[row]?.[col] ?? 0
}

function formatMatrix(matrix: readonly (readonly unknown[])[], indent: string): string {
  const rows = matrix.map((row) => `${indent}${JSON.stringify(row)}`)
  return `[
${rows.join(',\n')}
${indent.slice(0, -2)}]`
}

/**
 * 地图专用确定性序列化：对象结构保留缩进，dense 矩阵每行一行。
 * migrate/editor 必须共用本函数，避免无意义格式 diff 与 pretty JSON 体积膨胀。
 */
export function formatProjectMapV2(value: ProjectMapV2): string {
  const map = validateProjectMapV2(value)
  const layerBlocks = map.layers.map((layer) => {
    const fields = [
      `      "id": ${JSON.stringify(layer.id)}`,
      `      "name": ${JSON.stringify(layer.name)}`,
      `      "depthMode": ${JSON.stringify(layer.depthMode)}`,
      `      "tiles": ${formatMatrix(layer.tiles, '        ')}`,
    ]
    if (layer.heights) fields.push(`      "heights": ${formatMatrix(layer.heights, '        ')}`)
    return `    {\n${fields.join(',\n')}\n    }`
  })
  return `{
  "version": 2,
  "width": ${map.width},
  "height": ${map.height},
  "tilesetId": ${JSON.stringify(map.tilesetId)},
  "layers": [
${layerBlocks.join(',\n')}
  ],
  "collision": ${formatMatrix(map.collision, '    ')}
}
`
}

export function parseProjectMapV2(text: string): ProjectMapV2 {
  return validateProjectMapV2(JSON.parse(text) as unknown)
}
