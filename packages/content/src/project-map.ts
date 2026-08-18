/** 地图与组合共享的等距视觉层。高度和瓦片来源都属于格子实例。 */
export interface IsometricMapLayer {
  /** 稳定身份；重排图层不改变 id。 */
  id: string
  name: string
  /** 错排菱形 lattice：[2 * content.height] 行 × [content.width] 列。 */
  tiles: (number | null)[][]
  /** 与 tiles 同形；非空值是 content.tilesetRefs 的稳定下标。 */
  sources: (number | null)[][]
  /** 同位置瓦片实例的实际/相对高度；全 0 时省略。 */
  heights?: number[][]
}

/** 地图与组合唯一的 canonical 等距内容值对象。 */
export interface IsometricMapContent<CollisionCell extends number | null = number> {
  /** 旧 cell 矩形的逻辑尺寸；lattice 实际有 2 * height 行。 */
  width: number
  height: number
  /** 本内容引用的稳定瓦片集 id；按字典序排列，sources 只保存其下标。 */
  tilesetRefs: string[]
  /** 数组顺序是 z/tie-break；身份必须使用 layer.id。 */
  layers: IsometricMapLayer[]
  /** 地图为全 number；组合用 null 表示不参与放置，0 表示显式可通行。 */
  collision: CollisionCell[][]
}

/** 一次组合放置实际拥有的视觉槽；只保存身份，不复制实例值。 */
export interface StampPlacementVisualSlotV1 {
  layerId: string
  row: number
  col: number
}

/** 一次组合放置实际拥有的独立碰撞格点；值仍只存在 collision 矩阵。 */
export interface StampPlacementGridPointV1 {
  row: number
  col: number
}

/** 地图局部、非链接的组合放置身份。sourceStamp* 仅供作者识别。 */
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
  stampPlacements: StampPlacementGroupV1[]
}

/** 当前唯一地图格式；运行时只消费等距内容，authoring 仅服务编辑器。 */
export interface ProjectMap extends IsometricMapContent<number> {
  version: 4
  authoring?: ProjectMapAuthoringV1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requirePositiveInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new Error(`${path}: 期望正安全整数`)
  return value as number
}

function requireNonNegativeInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(`${path}: 期望非负安全整数`)
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

function validateTilesetRefs(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`${path}: 至少需要一个瓦片集来源`)
  const refs = value.map((entry, index) => requireNonEmptyString(entry, `${path}[${index}]`))
  const canonical = [...new Set(refs)].sort(compareText)
  if (canonical.length !== refs.length) throw new Error(`${path}: 不得包含重复瓦片集 id`)
  if (canonical.some((entry, index) => entry !== refs[index]))
    throw new Error(`${path}: 必须按稳定 id 字典序排列`)
  return refs
}

export interface ValidateIsometricMapContentOptions {
  path: string
  collision: 'dense' | 'nullable'
}

export function validateIsometricMapContent(
  value: unknown,
  options: ValidateIsometricMapContentOptions & { collision: 'dense' },
): IsometricMapContent<number>
export function validateIsometricMapContent(
  value: unknown,
  options: ValidateIsometricMapContentOptions & { collision: 'nullable' },
): IsometricMapContent<number | null>
export function validateIsometricMapContent(
  value: unknown,
  options: ValidateIsometricMapContentOptions,
): IsometricMapContent<number | null> {
  if (!isRecord(value)) throw new Error(`${options.path}: 期望对象`)
  const width = requirePositiveInt(value.width, `${options.path}.width`)
  const height = requirePositiveInt(value.height, `${options.path}.height`)
  const rows = height * 2
  const tilesetRefs = validateTilesetRefs(value.tilesetRefs, `${options.path}.tilesetRefs`)
  if (!Array.isArray(value.layers) || value.layers.length === 0)
    throw new Error(`${options.path}.layers: 至少需要一个视觉层`)

  const ids = new Set<string>()
  const layers = value.layers.map((entry, index): IsometricMapLayer => {
    const path = `${options.path}.layers[${index}]`
    if (!isRecord(entry)) throw new Error(`${path}: 期望对象`)
    const id = requireNonEmptyString(entry.id, `${path}.id`)
    if (ids.has(id)) throw new Error(`${path}.id: 重复的稳定 id "${id}"`)
    ids.add(id)
    const name = requireNonEmptyString(entry.name, `${path}.name`)
    const tiles = validateMatrix(entry.tiles, rows, width, `${path}.tiles`, (cell, cellPath) => {
      if (cell === null) return null
      return requireNonNegativeInt(cell, `${cellPath} tileId`)
    })
    // 单来源内容的 sources 全由 tiles 唯一决定，canonical JSON 可像全零 heights 一样省略冗余矩阵。
    // validator 始终物化完整矩阵，编辑/渲染/patch 因而只有一个内存模型。
    const sources =
      entry.sources === undefined
        ? (() => {
            if (tilesetRefs.length !== 1)
              throw new Error(`${path}.sources: 多来源内容必须保存逐格来源矩阵`)
            return tiles.map((row) => row.map((tile) => (tile === null ? null : 0)))
          })()
        : validateMatrix(entry.sources, rows, width, `${path}.sources`, (cell, cellPath) => {
            if (cell === null) return null
            const source = requireNonNegativeInt(cell, cellPath)
            if (source >= tilesetRefs.length)
              throw new Error(`${cellPath}: 来源下标 ${source} 超出 tilesetRefs`)
            return source
          })
    const heights =
      entry.heights === undefined
        ? undefined
        : validateMatrix(entry.heights, rows, width, `${path}.heights`, requireNonNegativeInt)
    let hasNonZeroHeight = false
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < width; col++) {
        const tile = tiles[row]?.[col]
        const source = sources[row]?.[col]
        if ((tile === null) !== (source === null))
          throw new Error(`${path}.sources[${row}][${col}]: tiles/sources 必须同时为空或同时非空`)
        const instanceHeight = heights?.[row]?.[col] ?? 0
        if (tile === null && instanceHeight !== 0)
          throw new Error(`${path}.heights[${row}][${col}]: 空瓦片高度必须为 0`)
        if (instanceHeight !== 0) hasNonZeroHeight = true
      }
    }
    return { id, name, tiles, sources, ...(hasNonZeroHeight && heights ? { heights } : {}) }
  })

  const collision = validateMatrix(
    value.collision,
    rows,
    width,
    `${options.path}.collision`,
    (cell, cellPath) => {
      if (options.collision === 'nullable' && cell === null) return null
      return requireNonNegativeInt(cell, cellPath)
    },
  )
  return { width, height, tilesetRefs, layers, collision }
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

function validateProjectMapAuthoring(
  value: unknown,
  map: IsometricMapContent<number>,
): ProjectMapAuthoringV1 | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new Error('projectMap.authoring: 期望对象')
  if (value.version !== 1)
    throw new Error(`projectMap.authoring.version: 仅支持 1，收到 ${String(value.version)}`)
  if (!Array.isArray(value.stampPlacements) || value.stampPlacements.length === 0)
    throw new Error('projectMap.authoring.stampPlacements: authoring 必须包含至少一个放置组')

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

export function isProjectMap(value: unknown): value is ProjectMap {
  return isRecord(value) && value.version === 4 && Array.isArray(value.layers)
}

/** 当前 canonical 单版本加载边界；旧开发版本一律 fail-loud。 */
export function validateProjectMap(value: unknown): ProjectMap {
  if (!isRecord(value)) throw new Error('projectMap: 期望对象')
  if (value.version !== 4)
    throw new Error(`projectMap.version: 仅支持当前版本 4，收到 ${String(value.version)}`)
  const content = validateIsometricMapContent(value, { path: 'projectMap', collision: 'dense' })
  const authoring = validateProjectMapAuthoring(value.authoring, content)
  return { version: 4, ...content, ...(authoring ? { authoring } : {}) }
}

/** 缺省高度统一返回 0。 */
export function mapInstanceHeight(layer: IsometricMapLayer, row: number, col: number): number {
  return layer.heights?.[row]?.[col] ?? 0
}

/** 解析非空瓦片实例的稳定来源；空实例返回 undefined。 */
export function mapInstanceTilesetId(
  content: Pick<IsometricMapContent<number | null>, 'tilesetRefs'>,
  layer: IsometricMapLayer,
  row: number,
  col: number,
): string | undefined {
  const source = layer.sources[row]?.[col]
  return source === null || source === undefined ? undefined : content.tilesetRefs[source]
}

function formatMatrix(matrix: readonly (readonly unknown[])[], indent: string): string {
  const rows = matrix.map((row) => `${indent}${JSON.stringify(row)}`)
  return `[\n${rows.join(',\n')}\n${indent.slice(0, -2)}]`
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

/** 地图专用确定性序列化：dense 矩阵逐行紧凑，来源表和矩阵保持 lockstep。 */
export function formatProjectMap(value: ProjectMap): string {
  const map = validateProjectMap(value)
  const layerBlocks = map.layers.map((layer) => {
    const implicitSingleSource =
      map.tilesetRefs.length === 1 &&
      layer.tiles.every((row, rowIndex) =>
        row.every((tile, colIndex) =>
          tile === null
            ? layer.sources[rowIndex]?.[colIndex] === null
            : layer.sources[rowIndex]?.[colIndex] === 0,
        ),
      )
    const fields = [
      `      "id": ${JSON.stringify(layer.id)}`,
      `      "name": ${JSON.stringify(layer.name)}`,
      `      "tiles": ${formatMatrix(layer.tiles, '        ')}`,
      ...(implicitSingleSource
        ? []
        : [`      "sources": ${formatMatrix(layer.sources, '        ')}`]),
    ]
    if (layer.heights) fields.push(`      "heights": ${formatMatrix(layer.heights, '        ')}`)
    return `    {\n${fields.join(',\n')}\n    }`
  })
  const fields = [
    `  "version": 4`,
    `  "width": ${map.width}`,
    `  "height": ${map.height}`,
    `  "tilesetRefs": ${JSON.stringify(map.tilesetRefs)}`,
    `  "layers": [\n${layerBlocks.join(',\n')}\n  ]`,
    `  "collision": ${formatMatrix(map.collision, '    ')}`,
  ]
  if (map.authoring) fields.push(formatAuthoring(map.authoring))
  return `{\n${fields.join(',\n')}\n}\n`
}

export function parseProjectMap(text: string): ProjectMap {
  return validateProjectMap(JSON.parse(text) as unknown)
}
