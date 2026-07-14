/** 工程地图库索引。地图稳定身份与 JSON 存储路径严格分离。 */
export interface MapAssetDefV1 {
  id: string
  name: string
  path: string
}

export interface MapIndexV1 {
  version: 1
  maps: MapAssetDefV1[]
}

export const MAP_INDEX_PATH = 'content/maps/index.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 作者态稳定 id。 */
export function isMapAssetId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
}

/** 工程相对 JSON 路径规范化；绝对路径、反斜杠和 `..` 一律 fail-loud。 */
export function normalizeMapAssetPath(value: string): string {
  const input = value.trim()
  if (!input || input.startsWith('/') || input.includes('\\') || /^[a-zA-Z]+:/.test(input))
    throw new Error(`map path: 期望工程相对路径，收到 "${value}"`)
  const parts: string[] = []
  for (const part of input.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') throw new Error(`map path: 禁止 ".."（${value}）`)
    parts.push(part)
  }
  const normalized = parts.join('/')
  if (!normalized.endsWith('.json')) throw new Error(`map path: 必须指向 .json（${value}）`)
  return normalized
}

export function validateMapIndex(value: unknown): MapIndexV1 {
  if (!isRecord(value)) throw new Error('mapIndex: 期望对象')
  if (value.version !== 1)
    throw new Error(`mapIndex.version: 仅支持 1，收到 ${String(value.version)}`)
  if (!Array.isArray(value.maps)) throw new Error('mapIndex.maps: 期望数组')
  const ids = new Set<string>()
  const paths = new Set<string>()
  const maps = value.maps.map((raw, index): MapAssetDefV1 => {
    const where = `mapIndex.maps[${index}]`
    if (!isRecord(raw)) throw new Error(`${where}: 期望对象`)
    if (!isMapAssetId(raw.id)) throw new Error(`${where}.id: 非法稳定 id "${String(raw.id)}"`)
    if (ids.has(raw.id)) throw new Error(`${where}.id: 重复 "${raw.id}"`)
    ids.add(raw.id)
    if (typeof raw.name !== 'string' || !raw.name.trim())
      throw new Error(`${where}.name: 期望非空字符串`)
    if (typeof raw.path !== 'string') throw new Error(`${where}.path: 期望字符串`)
    const path = normalizeMapAssetPath(raw.path)
    if (path === MAP_INDEX_PATH) throw new Error(`${where}.path: 不得覆盖 map index 自身`)
    if (paths.has(path)) throw new Error(`${where}.path: 规范化后重复 "${path}"`)
    paths.add(path)
    return { id: raw.id, name: raw.name.trim(), path }
  })
  return { version: 1, maps }
}

export function mapAssetById(index: MapIndexV1, id: string): MapAssetDefV1 | undefined {
  return index.maps.find((asset) => asset.id === id)
}

function authorMapIdBase(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '') || 'map'
  )
}

export function mapIdStem(path: string): string {
  const file = (normalizeMapAssetPath(path).split('/').at(-1) ?? 'map.json').replace(/\.json$/i, '')
  return authorMapIdBase(file)
}

export function nextMapAssetId(index: MapIndexV1, preferred: string): string {
  const base = authorMapIdBase(preferred)
  const ids = new Set(index.maps.map((asset) => asset.id))
  if (!ids.has(base)) return base
  let suffix = 2
  while (ids.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

/** 同时避开稳定 id 与默认 JSON path 冲突，供所有“新建/复制地图”入口共用。 */
export function nextMapAssetIdentity(
  index: MapIndexV1,
  preferred: string,
): Pick<MapAssetDefV1, 'id' | 'path'> {
  const paths = new Set(index.maps.map((asset) => normalizeMapAssetPath(asset.path)))
  let attempt = preferred
  let suffix = 2
  for (;;) {
    const id = nextMapAssetId(index, attempt)
    const path = `content/maps/${id}.json`
    if (!paths.has(path)) return { id, path }
    attempt = `${preferred}-${suffix++}`
  }
}
