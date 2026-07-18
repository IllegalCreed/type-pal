import type { StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import { memo, useMemo, useState } from 'react'
import { StampMiniPreview } from './StampPreviewCanvas.js'

const INITIAL_LIMIT = 60

export const MapStampPalette = memo(function MapStampPalette(props: {
  stamps: readonly StampTemplateV1[]
  tilesetId: string
  tilesets: readonly TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  assetBase: AssetBase
  activeStampId?: string
  recentStampIds: readonly string[]
  onPick: (id: string) => void
  onOpenLibrary?: () => void
}) {
  const {
    stamps,
    tilesetId,
    tilesets,
    tilesetBlobs,
    assetBase,
    activeStampId,
    recentStampIds,
    onPick,
    onOpenLibrary,
  } = props
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [limit, setLimit] = useState(INITIAL_LIMIT)
  const categories = useMemo(
    () => [...new Set(stamps.flatMap((stamp) => (stamp.category ? [stamp.category] : [])))].sort(),
    [stamps],
  )
  const recentRank = useMemo(
    () => new Map(recentStampIds.map((id, index) => [id, index] as const)),
    [recentStampIds],
  )
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return stamps
      .filter(
        (stamp) =>
          (category === 'all' || stamp.category === category) &&
          (!needle ||
            stamp.name.toLocaleLowerCase().includes(needle) ||
            stamp.id.toLocaleLowerCase().includes(needle)),
      )
      .sort((left, right) => {
        const leftCompatible = left.tilesetId === tilesetId ? 0 : 1
        const rightCompatible = right.tilesetId === tilesetId ? 0 : 1
        return (
          leftCompatible - rightCompatible ||
          (recentRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (recentRank.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'zh-CN') ||
          left.id.localeCompare(right.id)
        )
      })
  }, [category, query, recentRank, stamps, tilesetId])

  return (
    <section className="map-stamp-palette" aria-label="地图图章模板">
      <div className="map-stamp-filters">
        <input
          className="in"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setLimit(INITIAL_LIMIT)
          }}
          placeholder="搜索图章"
          aria-label="搜索地图图章"
        />
        <select
          className="in"
          value={category}
          aria-label="筛选图章分类"
          onChange={(event) => {
            setCategory(event.target.value)
            setLimit(INITIAL_LIMIT)
          }}
        >
          <option value="all">全部分类</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {shown.length ? (
        <div className="map-stamp-grid">
          {shown.slice(0, limit).map((stamp) => {
            const compatible = stamp.tilesetId === tilesetId
            return (
              <button
                key={stamp.id}
                type="button"
                className={`map-stamp-card${stamp.id === activeStampId ? ' selected' : ''}`}
                disabled={!compatible}
                aria-pressed={stamp.id === activeStampId}
                onClick={() => onPick(stamp.id)}
                title={
                  compatible
                    ? `${stamp.name} (${stamp.id})`
                    : `来源瓦片集 ${stamp.tilesetId} 与当前地图 ${tilesetId} 不同`
                }
              >
                <span className="map-stamp-thumb" aria-hidden="true">
                  <StampMiniPreview
                    template={stamp}
                    tilesets={tilesets}
                    tilesetBlobs={tilesetBlobs}
                    assetBase={assetBase}
                  />
                </span>
                <span className="map-stamp-copy">
                  <strong>{stamp.name}</strong>
                  <small>
                    {stamp.layerSlots.length} 层 · {stamp.visual.length} 格
                  </small>
                </span>
                {recentRank.has(stamp.id) ? <span className="map-stamp-recent">最近</span> : null}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="map-stamp-empty">
          <strong>没有匹配图章</strong>
          <span>可从地图选区保存，或到图章库管理模板。</span>
        </div>
      )}
      <div className="map-stamp-palette-actions">
        {shown.length > limit ? (
          <button type="button" className="mini" onClick={() => setLimit((value) => value + 60)}>
            再显示 60 个
          </button>
        ) : null}
        <span className="spacer" />
        {onOpenLibrary ? (
          <button type="button" className="mini" onClick={onOpenLibrary}>
            管理图章 ↗
          </button>
        ) : null}
      </div>
    </section>
  )
})
