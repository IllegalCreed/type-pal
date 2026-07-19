import type { AssetCatalogV1, AssetId } from './asset.js'

/**
 * Tileset 注册表(W7B/A7-3T)—— 瓦片图集的领域条目。量化落盘为原版同构
 * .rle(gzip 索引帧组)，物理路径只存在 asset catalog。
 * 帧几何由 RLE 帧组自描述,无帧表；地图实例高度不属于 tileset。
 */
export interface TilesetDef {
  /** 稳定身份(库 UI/绑定键);kebab-case,不含 '/'。 */
  id: string
  name: string
  /** 环境分类(outdoor/indoor/dungeon/builtin…惯例字符串,不设枚举)。 */
  category: string
  /** 唯一二进制 AssetId；地图/图章仍引用本定义的稳定 id。 */
  asset: AssetId
}

function fail(path: string, msg: string): never {
  throw new Error(`${path}: ${msg}`)
}

/** 加载边界 guard:数组、id 唯一非空且不含 '/'、name/category/asset 非空。 */
export function validateTilesets(value: unknown, catalog?: AssetCatalogV1): TilesetDef[] {
  if (!Array.isArray(value)) fail('tilesets', '期望数组')
  const ids = new Set<string>()
  return value.map((raw, i) => {
    const p = `tilesets[${i}]`
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(p, '期望对象')
    const r = raw as Record<string, unknown>
    if (typeof r.id !== 'string' || r.id.length === 0) fail(`${p}.id`, '期望非空字符串')
    if (r.id.includes('/')) fail(`${p}.id`, "id 不得含 '/'(与路径形态判别)")
    if (ids.has(r.id)) fail(`${p}.id`, `重复 id "${r.id}"`)
    ids.add(r.id)
    if (typeof r.name !== 'string' || r.name.length === 0) fail(`${p}.name`, '期望非空字符串')
    if (typeof r.category !== 'string' || r.category.length === 0)
      fail(`${p}.category`, '期望非空字符串')
    if ('path' in r) fail(`${p}.path`, '已退役；物理路径只能来自 assets/index.json')
    if (typeof r.asset !== 'string' || r.asset.trim().length === 0)
      fail(`${p}.asset`, '期望非空 AssetId')
    if (r.tiles !== undefined) fail(`${p}.tiles`, '已退役；高度必须写在地图格子实例上')
    const asset = r.asset
    if (catalog) {
      const record = catalog.assets[asset]
      if (!record) fail(`${p}.asset`, `AssetId "${asset}" 不在 catalog`)
      if (record.kind !== 'tileset')
        fail(`${p}.asset`, `AssetId "${asset}" 期望 tileset，实际 ${record.kind}`)
    }
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      asset,
    }
  })
}

/** tileset 稳定 id → 唯一二进制 AssetId。未知 id 必须 fail-loud。 */
export function resolveTilesetAsset(tilesetId: string, tilesets: readonly TilesetDef[]): string {
  const hit = tilesets.find((t) => t.id === tilesetId)
  if (hit) return hit.asset
  throw new Error(`tileset "${tilesetId}" 不在注册表`)
}
