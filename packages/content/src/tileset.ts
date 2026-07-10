/**
 * Tileset 注册表(W7B)—— 自有瓦片图集的库条目。收敛终案:量化落盘为原版同构
 * .rle(gzip 索引帧组),条目只存 id/名称/环境分类/资产路径 + per-tile 元数据留字段;
 * 帧几何由 RLE 帧组自描述,无帧表。原版借用暂存路径(id 不含 '/',路径必含,天然可判别)。
 */
export interface TilesetDef {
  /** 稳定身份(库 UI/绑定键);kebab-case,不含 '/'。 */
  id: string
  name: string
  /** 环境分类(outdoor/indoor/dungeon/builtin…惯例字符串,不设枚举)。 */
  category: string
  /** 资产相对路径(.rle,gzip GOP 索引帧组)。 */
  path: string
  /** per-tile 元数据(下标 = 瓦片索引;height 遮挡格高,W7D 渲染缺省 1)。留字段。 */
  tiles?: { height?: number }[]
}

function fail(path: string, msg: string): never {
  throw new Error(`${path}: ${msg}`)
}

/** 加载边界 guard:数组、id 唯一非空且不含 '/'、name/category/path 非空、tiles 形状。 */
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
    let tiles: TilesetDef['tiles']
    if (r.tiles !== undefined) {
      if (!Array.isArray(r.tiles)) fail(`${p}.tiles`, '期望数组')
      tiles = r.tiles.map((t, j) => {
        if (typeof t !== 'object' || t === null) fail(`${p}.tiles[${j}]`, '期望对象')
        const h = (t as Record<string, unknown>).height
        if (h !== undefined && (!Number.isInteger(h) || (h as number) < 0))
          fail(`${p}.tiles[${j}].height`, '期望非负整数')
        return h === undefined ? {} : { height: h as number }
      })
    }
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      path: r.path,
      ...(tiles ? { tiles } : {}),
    }
  })
}

/** tileset 引用解析:注册表命中 id → 条目 path;未命中且含 '/' → 视为资产路径(原版借用);否则报错。 */
export function resolveTilesetPath(ref: string, tilesets: readonly TilesetDef[]): string {
  const hit = tilesets.find((t) => t.id === ref)
  if (hit) return hit.path
  if (ref.includes('/')) return ref
  throw new Error(`tileset "${ref}" 不在注册表且非路径形态`)
}
