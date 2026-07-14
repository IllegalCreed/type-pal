/**
 * Tileset 注册表(W7B)—— 自有瓦片图集的库条目。收敛终案:量化落盘为原版同构
 * .rle(gzip 索引帧组),条目只存 id/名称/环境分类/资产路径。
 * 帧几何由 RLE 帧组自描述,无帧表；地图实例高度不属于 tileset。
 */
export interface TilesetDef {
  /** 稳定身份(库 UI/绑定键);kebab-case,不含 '/'。 */
  id: string
  name: string
  /** 环境分类(outdoor/indoor/dungeon/builtin…惯例字符串,不设枚举)。 */
  category: string
  /** 资产相对路径(.rle,gzip GOP 索引帧组)。 */
  path: string
}

function fail(path: string, msg: string): never {
  throw new Error(`${path}: ${msg}`)
}

/** 加载边界 guard:数组、id 唯一非空且不含 '/'、name/category/path 非空。 */
export function validateTilesets(value: unknown): TilesetDef[] {
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
    if (typeof r.path !== 'string' || r.path.length === 0) fail(`${p}.path`, '期望非空字符串')
    if (r.tiles !== undefined) fail(`${p}.tiles`, '已退役；高度必须写在地图格子实例上')
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      path: r.path,
    }
  })
}

/** tileset 稳定 id → 资产路径。路径直通已退役，未知 id 必须 fail-loud。 */
export function resolveTilesetPath(tilesetId: string, tilesets: readonly TilesetDef[]): string {
  const hit = tilesets.find((t) => t.id === tilesetId)
  if (hit) return hit.path
  throw new Error(`tileset "${tilesetId}" 不在注册表`)
}
