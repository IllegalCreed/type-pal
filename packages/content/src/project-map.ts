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

interface ProjectMapBase {
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

/** 一次图章放置实际拥有的视觉槽；只保存身份，不复制 tile/height 值。 */
export interface StampPlacementVisualSlotV1 {
  layerId: string
  row: number
  col: number
}

/** 一次图章放置实际拥有的独立碰撞格点；值仍只存在 collision 矩阵。 */
export interface StampPlacementGridPointV1 {
  row: number
  col: number
}

/**
 * 地图局部、非链接的图章放置身份。
 * sourceStamp* 仅供作者识别；模板删除或修改不得改变此组成员。
 */
export interface StampPlacementGroupV1 {
  id: string
  sourceStampId?: string
  sourceStampName?: string
  anchor: StampPlacementGridPointV1
  visualSlots: StampPlacementVisualSlotV1[]
  gridPoints: StampPlacementGridPointV1[]
}

export interface ProjectMapAuthoringV1 {
  version: 1
  /** v3 中必须非空；删除最后一组时地图应同时降回 v2。 */
  stampPlacements: StampPlacementGroupV1[]
}

/** 无图章放置组的作者态地图；禁止携带 authoring。 */
export interface ProjectMapV2 extends ProjectMapBase {
  version: 2
  authoring?: never
}

/** 有非空图章放置组的作者态地图；运行时仍只消费 ProjectMapBase。 */
export interface ProjectMapV3 extends ProjectMapBase {
  version: 3
  authoring: ProjectMapAuthoringV1
}

/** 工程唯一地图联合格式。v2/v3 共用同一套普通矩阵。 */
export type ProjectMap = ProjectMapV2 | ProjectMapV3

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isProjectMapV2(value: unknown): value is ProjectMapV2 {
  return (
    isRecord(value) &&
    value.version === 2 &&
    !('authoring' in value) &&
    Array.isArray(value.layers) &&
    Array.isArray(value.collision)
  )
}

export function isProjectMapV3(value: unknown): value is ProjectMapV3 {
  return (
    isRecord(value) &&
    value.version === 3 &&
    isRecord(value.authoring) &&
    value.authoring.version === 1 &&
    Array.isArray(value.authoring.stampPlacements) &&
    Array.isArray(value.layers) &&
    Array.isArray(value.collision)
  )
}

export function isProjectMap(value: unknown): value is ProjectMap {
  return isProjectMapV2(value) || isProjectMapV3(value)
}

function requirePositiveInt(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${path}: 期望正整数`)
  return value as number
}

function requireNonNegativeInt(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${path}: 期望非负整数`)
  return value as number
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${path}: 期望非空字符串`)
  return value
}

function compareText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
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
  return validateMatrix(value, rows, cols, path, requireNonNegativeInt)
}

function validateProjectMapBase(value: Record<string, unknown>): ProjectMapBase {
  const width = requirePositiveInt(value.width, 'projectMap.width')
  const height = requirePositiveInt(value.height, 'projectMap.height')
  const tilesetId = requireNonEmptyString(value.tilesetId, 'projectMap.tilesetId')
  if (!Array.isArray(value.layers) || value.layers.length === 0)
    throw new Error('projectMap.layers: 至少需要一个视觉层')

  const ids = new Set<string>()
  const rows = height * 2
  const layers: MapLayerV2[] = value.layers.map((raw, index) => {
    const path = `projectMap.layers[${index}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    const id = requireNonEmptyString(raw.id, `${path}.id`)
    if (ids.has(id)) throw new Error(`${path}.id: 重复的稳定 id "${id}"`)
    ids.add(id)
    const name = requireNonEmptyString(raw.name, `${path}.name`)
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

    const layer = { id, name, depthMode: raw.depthMode, tiles }
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
    requireNonNegativeInt,
  )
  return { width, height, tilesetId, layers, collision }
}

function validatePoint(
  value: unknown,
  path: string,
  width: number,
  rows: number,
): StampPlacementGridPointV1 {
  if (!isRecord(value)) throw new Error(`${path}: 期望对象`)
  const row = requireNonNegativeInt(value.row, `${path}.row`)
  const col = requireNonNegativeInt(value.col, `${path}.col`)
  if (row >= rows || col >= width) throw new Error(`${path}: 坐标 (${row},${col}) 超出地图边界`)
  return { row, col }
}

function validateProjectMapAuthoring(value: unknown, map: ProjectMapBase): ProjectMapAuthoringV1 {
  if (!isRecord(value)) throw new Error('projectMap.authoring: 期望对象')
  if (value.version !== 1)
    throw new Error(`projectMap.authoring.version: 仅支持 1，收到 ${String(value.version)}`)
  if (!Array.isArray(value.stampPlacements) || value.stampPlacements.length === 0)
    throw new Error('projectMap.authoring.stampPlacements: v3 必须包含至少一个放置组')

  const layerById = new Map(map.layers.map((layer) => [layer.id, layer]))
  const placementIds = new Set<string>()
  const visualOwners = new Map<string, string>()
  const collisionOwners = new Map<string, string>()
  const rows = map.height * 2
  const stampPlacements = value.stampPlacements
    .map((raw, index): StampPlacementGroupV1 => {
      const path = `projectMap.authoring.stampPlacements[${index}]`
      if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
      const id = requireNonEmptyString(raw.id, `${path}.id`)
      if (placementIds.has(id)) throw new Error(`${path}.id: 重复放置组 id "${id}"`)
      placementIds.add(id)
      const sourceStampId =
        raw.sourceStampId === undefined
          ? undefined
          : requireNonEmptyString(raw.sourceStampId, `${path}.sourceStampId`)
      const sourceStampName =
        raw.sourceStampName === undefined
          ? undefined
          : requireNonEmptyString(raw.sourceStampName, `${path}.sourceStampName`)
      const anchor = validatePoint(raw.anchor, `${path}.anchor`, map.width, rows)
      if (!Array.isArray(raw.visualSlots) || raw.visualSlots.length === 0)
        throw new Error(`${path}.visualSlots: 放置组必须至少拥有一个视觉槽`)
      if (!Array.isArray(raw.gridPoints)) throw new Error(`${path}.gridPoints: 期望数组`)

      const localVisual = new Set<string>()
      const visualSlots = raw.visualSlots
        .map((entry, memberIndex): StampPlacementVisualSlotV1 => {
          const memberPath = `${path}.visualSlots[${memberIndex}]`
          if (!isRecord(entry)) throw new Error(`${memberPath}: 期望对象`)
          const layerId = requireNonEmptyString(entry.layerId, `${memberPath}.layerId`)
          const layer = layerById.get(layerId)
          if (!layer) throw new Error(`${memberPath}.layerId: 图层 "${layerId}" 不存在`)
          const point = validatePoint(entry, memberPath, map.width, rows)
          if (layer.tiles[point.row]?.[point.col] === null)
            throw new Error(`${memberPath}: 放置组视觉成员不得指向空瓦片`)
          const key = JSON.stringify([layerId, point.row, point.col])
          if (localVisual.has(key)) throw new Error(`${memberPath}: 组内重复视觉槽`)
          localVisual.add(key)
          const owner = visualOwners.get(key)
          if (owner) throw new Error(`${memberPath}: 视觉槽已属于放置组 "${owner}"`)
          visualOwners.set(key, id)
          return { layerId, ...point }
        })
        .sort(
          (left, right) =>
            compareText(left.layerId, right.layerId) ||
            left.row - right.row ||
            left.col - right.col,
        )

      const localCollision = new Set<string>()
      const gridPoints = raw.gridPoints
        .map((entry, memberIndex): StampPlacementGridPointV1 => {
          const memberPath = `${path}.gridPoints[${memberIndex}]`
          const point = validatePoint(entry, memberPath, map.width, rows)
          const key = JSON.stringify([point.row, point.col])
          if (localCollision.has(key)) throw new Error(`${memberPath}: 组内重复碰撞格点`)
          localCollision.add(key)
          const owner = collisionOwners.get(key)
          if (owner) throw new Error(`${memberPath}: 碰撞格点已属于放置组 "${owner}"`)
          collisionOwners.set(key, id)
          return point
        })
        .sort((left, right) => left.row - right.row || left.col - right.col)

      return {
        id,
        ...(sourceStampId === undefined ? {} : { sourceStampId }),
        ...(sourceStampName === undefined ? {} : { sourceStampName }),
        anchor,
        visualSlots,
        gridPoints,
      }
    })
    .sort((left, right) => compareText(left.id, right.id))
  return { version: 1, stampPlacements }
}

/** v2 专用 guard；旧调用方继续得到精确 v2，不会吞掉 v3 authoring。 */
export function validateProjectMapV2(value: unknown): ProjectMapV2 {
  if (!isRecord(value)) throw new Error('projectMap: 期望对象')
  if (value.version !== 2)
    throw new Error(`projectMap.version: 仅支持 2，收到 ${String(value.version)}`)
  if ('authoring' in value) throw new Error('projectMap.authoring: version 2 禁止携带作者态')
  return { version: 2, ...validateProjectMapBase(value) }
}

export function validateProjectMapV3(value: unknown): ProjectMapV3 {
  if (!isRecord(value)) throw new Error('projectMap: 期望对象')
  if (value.version !== 3)
    throw new Error(`projectMap.version: 仅支持 3，收到 ${String(value.version)}`)
  const base = validateProjectMapBase(value)
  const authoring = validateProjectMapAuthoring(value.authoring, base)
  return { version: 3, ...base, authoring }
}

/** v2/v3 联合加载边界；未知版本一律 fail-loud。 */
export function validateProjectMap(value: unknown): ProjectMap {
  if (!isRecord(value)) throw new Error('projectMap: 期望对象')
  if (value.version === 2) return validateProjectMapV2(value)
  if (value.version === 3) return validateProjectMapV3(value)
  throw new Error(`projectMap.version: 仅支持 2 或 3，收到 ${String(value.version)}`)
}

/** flat 层省略 heights 时统一返回 0。 */
export function mapInstanceHeight(layer: MapLayerV2, row: number, col: number): number {
  return layer.heights?.[row]?.[col] ?? 0
}

function formatMatrix(matrix: readonly (readonly unknown[])[], indent: string): string {
  const rows = matrix.map((row) => `${indent}${JSON.stringify(row)}`)
  return `[\n${rows.join(',\n')}\n${indent.slice(0, -2)}]`
}

function formatProjectMapBase(map: ProjectMap): string[] {
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
  return [
    `  "version": ${map.version}`,
    `  "width": ${map.width}`,
    `  "height": ${map.height}`,
    `  "tilesetId": ${JSON.stringify(map.tilesetId)}`,
    `  "layers": [\n${layerBlocks.join(',\n')}\n  ]`,
    `  "collision": ${formatMatrix(map.collision, '    ')}`,
  ]
}

function formatAuthoring(authoring: ProjectMapAuthoringV1): string {
  const placements = authoring.stampPlacements.map((placement) => {
    const fields = [
      `        "id": ${JSON.stringify(placement.id)}`,
      ...(placement.sourceStampId === undefined
        ? []
        : [`        "sourceStampId": ${JSON.stringify(placement.sourceStampId)}`]),
      ...(placement.sourceStampName === undefined
        ? []
        : [`        "sourceStampName": ${JSON.stringify(placement.sourceStampName)}`]),
      `        "anchor": ${JSON.stringify(placement.anchor)}`,
      `        "visualSlots": ${JSON.stringify(placement.visualSlots)}`,
      `        "gridPoints": ${JSON.stringify(placement.gridPoints)}`,
    ]
    return `      {\n${fields.join(',\n')}\n      }`
  })
  return `  "authoring": {\n    "version": 1,\n    "stampPlacements": [\n${placements.join(',\n')}\n    ]\n  }`
}

/**
 * 地图专用确定性序列化：对象结构保留缩进，dense 矩阵每行一行，作者态成员每组一行。
 * migrate/editor 必须共用本函数，避免无意义格式 diff 与 pretty JSON 体积膨胀。
 */
export function formatProjectMap(value: ProjectMap): string {
  const map = validateProjectMap(value)
  const fields = formatProjectMapBase(map)
  if (map.version === 3) fields.push(formatAuthoring(map.authoring))
  return `{\n${fields.join(',\n')}\n}\n`
}

/** v2 兼容格式化入口；传入 v3 在类型和运行时都不会静默降级。 */
export function formatProjectMapV2(value: ProjectMapV2): string {
  return formatProjectMap(validateProjectMapV2(value))
}

export function parseProjectMap(text: string): ProjectMap {
  return validateProjectMap(JSON.parse(text) as unknown)
}

export function parseProjectMapV2(text: string): ProjectMapV2 {
  return validateProjectMapV2(JSON.parse(text) as unknown)
}
