import type { AssetCatalogV1, StampTemplate } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import { memo, useMemo, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsButton, DsSelect, DsTextInput, DsPressable } from './design-system/index.js'
import { StampMiniPreview } from './StampPreviewCanvas.js'

const INITIAL_LIMIT = 60

export const MapStampPalette = memo(function MapStampPalette(props: {
  stamps: readonly StampTemplate[]
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  activeStampId?: string
  recentStampIds: readonly string[]
  onPick: (id: string) => void
  onOpenLibrary?: () => void
}) {
  const {
    stamps,
    tilesets,
    assetCatalog,
    assetReader,
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
      .sort(
        (left, right) =>
          (recentRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (recentRank.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'zh-CN') ||
          left.id.localeCompare(right.id),
      )
  }, [category, query, recentRank, stamps])

  return (
    <section className="map-stamp-palette" aria-label="地图组合模板">
      <div className="map-stamp-filters">
        <DsTextInput
          size="compact"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setLimit(INITIAL_LIMIT)
          }}
          placeholder="搜索组合…"
          aria-label="搜索地图组合"
        />
        <DsSelect
          size="compact"
          searchable={false}
          value={category}
          aria-label="筛选组合分类"
          options={[
            { value: 'all', label: '全部分类' },
            ...categories.map((value) => ({ value, label: value })),
          ]}
          onValueChange={(value) => {
            setCategory(value)
            setLimit(INITIAL_LIMIT)
          }}
        />
      </div>
      {shown.length ? (
        <div className="map-stamp-grid">
          {shown.slice(0, limit).map((stamp) => {
            const visualCount = stamp.layers.reduce(
              (count, layer) =>
                count +
                layer.tiles.reduce(
                  (sum, row) => sum + row.filter((tile) => tile !== null).length,
                  0,
                ),
              0,
            )
            return (
              <DsPressable
                key={stamp.id}
                type="button"
                className={`map-stamp-card${stamp.id === activeStampId ? ' selected' : ''}`}
                aria-pressed={stamp.id === activeStampId}
                onClick={() => onPick(stamp.id)}
                title={`${stamp.name} (${stamp.id})`}
              >
                <span className="map-stamp-thumb" aria-hidden="true">
                  <StampMiniPreview
                    template={stamp}
                    tilesets={tilesets}
                    assetCatalog={assetCatalog}
                    assetReader={assetReader}
                    assetBase={assetBase}
                  />
                </span>
                <span className="map-stamp-copy">
                  <strong>{stamp.name}</strong>
                  <small>
                    {stamp.layers.length} 层 · {visualCount} 格
                  </small>
                </span>
                {recentRank.has(stamp.id) ? <span className="map-stamp-recent">最近</span> : null}
              </DsPressable>
            )
          })}
        </div>
      ) : (
        <div className="map-stamp-empty">
          <strong>没有匹配组合</strong>
          <span>可从地图选区保存，或到组合库管理模板。</span>
        </div>
      )}
      <div className="map-stamp-palette-actions">
        {shown.length > limit ? (
          <DsButton size="compact" variant="quiet" onClick={() => setLimit((value) => value + 60)}>
            再显示 60 个
          </DsButton>
        ) : null}
        <span className="spacer" />
        {onOpenLibrary ? (
          <DsButton size="compact" variant="secondary" icon="open" onClick={onOpenLibrary}>
            管理组合
          </DsButton>
        ) : null}
      </div>
    </section>
  )
})
