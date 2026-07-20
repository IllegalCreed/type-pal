import type { Palette, ProjectMap, RleFrame } from '@type-pal/reforge'
import { bakeFrame, projectMapTileBlitRect } from '@type-pal/reforge'
import { useEffect, useMemo, useRef } from 'react'
import type { VisualSlotRef } from '../core/map-selection.js'

export interface MapContentSelectionPreviewProps {
  map: ProjectMap
  visualSlots: readonly VisualSlotRef[]
  tiles?: ReadonlyMap<number, RleFrame>
  palette?: Palette
  title: string
  subtitle: string
}

/**
 * 直接从当前地图矩阵绘制所选视觉实例。
 *
 * 组合 placement 不是 linked prefab，模板可能已删除或已被修改；因此这里不能拿来源模板冒充
 * 当前选中内容，必须读取 placement 成员指向的实际 tileId，再按地图图层顺序合成。
 */
export function MapContentSelectionPreview(props: MapContentSelectionPreviewProps) {
  const { map, visualSlots, tiles, palette, title, subtitle } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const values = useMemo(() => {
    const layerOrder = new Map(map.layers.map((layer, index) => [layer.id, index] as const))
    return visualSlots
      .flatMap((ref) => {
        const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
        const tileId = layer?.tiles[ref.row]?.[ref.col]
        return layer && tileId !== null && tileId !== undefined
          ? [{ ref, tileId, layerIndex: layerOrder.get(layer.id) ?? 0 }]
          : []
      })
      .sort(
        (left, right) =>
          left.layerIndex - right.layerIndex ||
          left.ref.row - right.ref.row ||
          left.ref.col - right.ref.col,
      )
  }, [map, visualSlots])
  const missingTileIds = useMemo(
    () =>
      tiles
        ? [...new Set(values.flatMap(({ tileId }) => (tiles.has(tileId) ? [] : [tileId])))].sort(
            (left, right) => left - right,
          )
        : [],
    [tiles, values],
  )
  const layout = useMemo(() => {
    if (!tiles) return undefined
    const members = values.flatMap((value) => {
      const frame = tiles.get(value.tileId)
      if (!frame) return []
      return [{ ...value, frame, rect: projectMapTileBlitRect(value.ref, frame) }]
    })
    if (!members.length) return undefined
    const padding = 12
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const { rect } of members) {
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding
    const naturalWidth = Math.max(1, maxX - minX)
    const naturalHeight = Math.max(1, maxY - minY)
    const scale = Math.min(2, 220 / naturalWidth, 140 / naturalHeight)
    return {
      members,
      minX,
      minY,
      naturalWidth,
      naturalHeight,
      scale,
      width: Math.max(1, Math.ceil(naturalWidth * scale)),
      height: Math.max(1, Math.ceil(naturalHeight * scale)),
    }
  }, [tiles, values])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !layout || !palette) return
    canvas.width = layout.width
    canvas.height = layout.height
    context.imageSmoothingEnabled = false
    context.setTransform(
      layout.scale,
      0,
      0,
      layout.scale,
      -layout.minX * layout.scale,
      -layout.minY * layout.scale,
    )
    context.clearRect(layout.minX, layout.minY, layout.naturalWidth, layout.naturalHeight)
    const bakedFrames = new Map<number, ReturnType<typeof bakeFrame>>()
    for (const { tileId, frame, rect } of layout.members) {
      let baked = bakedFrames.get(tileId)
      if (!baked) {
        baked = bakeFrame(frame, palette)
        bakedFrames.set(tileId, baked)
      }
      context.drawImage(baked, rect.x, rect.y)
    }
  }, [layout, palette])

  return (
    <section className="map-content-selection-preview" aria-label={`${title}预览`}>
      <header>
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <small>{values.length} 个视觉实例</small>
      </header>
      <div className="map-content-selection-preview-stage">
        {values.length === 0 ? (
          <span>选区没有非空瓦片</span>
        ) : !tiles || !palette ? (
          <span>正在载入所选内容…</span>
        ) : layout ? (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${title}：${values.length} 个实际地图瓦片实例`}
          >
            {title}：{values.length} 个实际地图瓦片实例
          </canvas>
        ) : (
          <span>所选瓦片帧不可用</span>
        )}
      </div>
      {missingTileIds.length ? <p>瓦片集缺少 tileId：{missingTileIds.join('、')}</p> : null}
    </section>
  )
}
