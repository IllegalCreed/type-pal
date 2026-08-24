import { DsPressable } from './design-system/index.js'
import {
  type AssetCatalogV1,
  mapInstanceHeight,
  mapInstanceTilesetId,
  type StampTemplate,
} from '@type-pal/content'
import type {
  AssetBase,
  Palette,
  RleFrame,
  TilesetDef,
  TilesetFrameRegistry,
} from '@type-pal/reforge'
import {
  bakeFrame,
  latticeCenter,
  loadStandardPalette,
  loadTilesetAsset,
  projectMapTileBlitRect,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'

export interface StampPreviewAssets {
  palette: Palette
  frames: Map<number, RleFrame>
  tilesets: TilesetFrameRegistry
}

const paletteCache = new WeakMap<AssetBase, Promise<Palette>>()
const frameCache = new WeakMap<EditorAssetReader, Map<string, Promise<Map<number, RleFrame>>>>()

function cachedPalette(assetBase: AssetBase): Promise<Palette> {
  const existing = paletteCache.get(assetBase)
  if (existing) return existing
  const pending = loadStandardPalette(assetBase)
  paletteCache.set(assetBase, pending)
  return pending
}

function cachedFrames(
  assetReader: EditorAssetReader,
  tileset: TilesetDef,
  revision: string,
): Promise<Map<number, RleFrame>> {
  const byRevision = frameCache.get(assetReader) ?? new Map()
  frameCache.set(assetReader, byRevision)
  const key = `${tileset.asset}:${revision}`
  const existing = byRevision.get(key)
  if (existing) return existing
  const pending = loadTilesetAsset(assetReader, tileset.asset)
  byRevision.set(key, pending)
  return pending
}

export async function loadStampPreviewAssets(
  assetBase: AssetBase,
  assetReader: EditorAssetReader,
  tileset: TilesetDef,
  revision: string,
): Promise<StampPreviewAssets> {
  const [palette, frames] = await Promise.all([
    cachedPalette(assetBase),
    cachedFrames(assetReader, tileset, revision),
  ])
  return { palette, frames, tilesets: new Map([[tileset.id, frames]]) }
}

async function loadTemplateAssets(options: {
  template: StampTemplate
  tilesets: readonly TilesetDef[]
  assetReader: EditorAssetReader
  assetCatalog: AssetCatalogV1
  assetBase: AssetBase
}): Promise<StampPreviewAssets> {
  const definitions = options.template.tilesetRefs.map((id) => {
    const definition = options.tilesets.find((candidate) => candidate.id === id)
    if (!definition) throw new Error(`来源瓦片集“${id}”不存在。`)
    return definition
  })
  const [palette, entries] = await Promise.all([
    cachedPalette(options.assetBase),
    Promise.all(
      definitions.map(
        async (definition) =>
          [
            definition.id,
            await cachedFrames(
              options.assetReader,
              definition,
              options.assetCatalog.assets[definition.asset]?.sha256 ?? 'missing',
            ),
          ] as const,
      ),
    ),
  ])
  const registry = new Map(entries)
  return {
    palette,
    frames: registry.get(options.template.tilesetRefs[0] ?? '') ?? new Map(),
    tilesets: registry,
  }
}

interface PreviewMember {
  layerId: string
  layerIndex: number
  row: number
  col: number
  tileId: number
  tilesetId: string
  height: number
  frame: RleFrame
  rect: ReturnType<typeof projectMapTileBlitRect>
}

function previewMembers(
  template: StampTemplate,
  assets: StampPreviewAssets,
  hiddenLayerIds: ReadonlySet<string>,
): PreviewMember[] {
  return template.layers
    .flatMap((layer, layerIndex) => {
      if (hiddenLayerIds.has(layer.id)) return []
      const members: PreviewMember[] = []
      for (let row = 0; row < template.height * 2; row++)
        for (let col = 0; col < template.width; col++) {
          const tileId = layer.tiles[row]?.[col]
          if (tileId === null || tileId === undefined) continue
          const tilesetId = mapInstanceTilesetId(template, layer, row, col)
          const frame = tilesetId ? assets.tilesets.get(tilesetId)?.get(tileId) : undefined
          if (!tilesetId || !frame) continue
          members.push({
            layerId: layer.id,
            layerIndex,
            row,
            col,
            tileId,
            tilesetId,
            height: mapInstanceHeight(layer, row, col),
            frame,
            rect: projectMapTileBlitRect({ row, col }, frame),
          })
        }
      return members
    })
    .sort(
      (left, right) =>
        left.layerIndex - right.layerIndex || left.row - right.row || left.col - right.col,
    )
}

function collisionMembers(
  template: StampTemplate,
): Array<{ row: number; col: number; value: number }> {
  const members: Array<{ row: number; col: number; value: number }> = []
  for (let row = 0; row < template.height * 2; row++)
    for (let col = 0; col < template.width; col++) {
      const value = template.collision[row]?.[col]
      if (value !== null && value !== undefined) members.push({ row, col, value })
    }
  return members
}

function drawPreview(
  canvas: HTMLCanvasElement,
  template: StampTemplate,
  assets: StampPreviewAssets,
  hiddenLayerIds: ReadonlySet<string>,
  showCollision: boolean,
  target: { width: number; height: number },
): void {
  const context = canvas.getContext('2d')
  if (!context) return
  const members = previewMembers(template, assets, hiddenLayerIds)
  const collisions = showCollision ? collisionMembers(template) : []
  const anchor = latticeCenter(template.anchor)
  const points = [...collisions.map(latticeCenter), anchor]
  let minX = Math.min(...members.map(({ rect }) => rect.x), ...points.map(({ x }) => x - 18))
  let minY = Math.min(...members.map(({ rect }) => rect.y), ...points.map(({ y }) => y - 10))
  let maxX = Math.max(
    ...members.map(({ rect }) => rect.x + rect.width),
    ...points.map(({ x }) => x + 18),
  )
  let maxY = Math.max(
    ...members.map(({ rect }) => rect.y + rect.height),
    ...points.map(({ y }) => y + 10),
  )
  if (!Number.isFinite(minX)) minX = minY = 0
  if (!Number.isFinite(maxX)) maxX = maxY = 1
  const padding = 18
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding
  const naturalWidth = Math.max(1, maxX - minX)
  const naturalHeight = Math.max(1, maxY - minY)
  const scale = Math.min(target.width / naturalWidth, target.height / naturalHeight, 2)
  canvas.width = target.width
  canvas.height = target.height
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(
    scale,
    0,
    0,
    scale,
    (target.width - naturalWidth * scale) / 2 - minX * scale,
    (target.height - naturalHeight * scale) / 2 - minY * scale,
  )
  for (const member of members)
    context.drawImage(bakeFrame(member.frame, assets.palette), member.rect.x, member.rect.y)
  if (showCollision)
    for (const collision of collisions) {
      const center = latticeCenter(collision)
      context.beginPath()
      context.moveTo(center.x, center.y - 7)
      context.lineTo(center.x + 14, center.y)
      context.lineTo(center.x, center.y + 7)
      context.lineTo(center.x - 14, center.y)
      context.closePath()
      context.fillStyle = collision.value === 0 ? 'rgba(65,155,255,.18)' : 'rgba(255,130,76,.25)'
      context.strokeStyle = collision.value === 0 ? '#6eb0ff' : '#ff945f'
      context.fill()
      context.stroke()
    }
  context.beginPath()
  context.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2)
  context.fillStyle = '#59d8ff'
  context.fill()
  context.strokeStyle = '#07131d'
  context.stroke()
}

function useTemplateAssets(props: {
  template: StampTemplate
  tilesets: readonly TilesetDef[]
  assetReader: EditorAssetReader
  assetCatalog: AssetCatalogV1
  assetBase: AssetBase
}): { assets?: StampPreviewAssets; error: string } {
  const { template, tilesets, assetReader, assetCatalog, assetBase } = props
  const [assets, setAssets] = useState<StampPreviewAssets>()
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setAssets(undefined)
    setError('')
    void loadTemplateAssets({ template, tilesets, assetReader, assetCatalog, assetBase }).then(
      (value) => {
        if (alive) setAssets(value)
      },
      (cause) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
    }
  }, [assetBase, assetCatalog, assetReader, template, tilesets])
  return { assets, error }
}

export function StampPreviewCanvas(props: {
  template: StampTemplate
  tilesets: readonly TilesetDef[]
  assetReader: EditorAssetReader
  assetCatalog: AssetCatalogV1
  assetBase: AssetBase
}) {
  const { template } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set())
  const [showCollision, setShowCollision] = useState(true)
  const { assets, error } = useTemplateAssets(props)
  const visibleMembers = useMemo(
    () => (assets ? previewMembers(template, assets, hiddenLayerIds) : []),
    [assets, hiddenLayerIds, template],
  )
  const visualCount = useMemo(
    () =>
      template.layers.reduce(
        (count, layer) =>
          count +
          layer.tiles.reduce((sum, row) => sum + row.filter((tileId) => tileId !== null).length, 0),
        0,
      ),
    [template.layers],
  )
  const missingTiles = useMemo(() => {
    if (!assets) return []
    const missing = new Set<string>()
    for (const layer of template.layers) {
      if (hiddenLayerIds.has(layer.id)) continue
      for (let row = 0; row < template.height * 2; row++)
        for (let col = 0; col < template.width; col++) {
          const tileId = layer.tiles[row]?.[col]
          if (tileId === null || tileId === undefined) continue
          const tilesetId = mapInstanceTilesetId(template, layer, row, col)
          if (!tilesetId || !assets.tilesets.get(tilesetId)?.has(tileId))
            missing.add(`${tilesetId ?? '未知来源'} #${tileId}`)
        }
    }
    return [...missing].sort()
  }, [assets, hiddenLayerIds, template])
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && assets)
      drawPreview(canvas, template, assets, hiddenLayerIds, showCollision, {
        width: 900,
        height: 520,
      })
  }, [assets, hiddenLayerIds, showCollision, template])
  return (
    <section className="stamp-preview-card" aria-label={`${template.name} 组合预览`}>
      <header className="stamp-preview-toolbar">
        <div>
          <strong>合成预览</strong>
          <span>
            {visibleMembers.length} 个可见成员 · 最高相对 H
            {Math.max(0, ...visibleMembers.map(({ height }) => height))}
          </span>
        </div>
        <span className="stamp-anchor-key">
          <i aria-hidden="true" />
          锚点
        </span>
      </header>
      <div className="stamp-preview-stage">
        {error ? <div className="stamp-preview-message error">{error}</div> : null}
        {!error && !assets ? <div className="stamp-preview-message">正在载入瓦片预览…</div> : null}
        {!error && assets ? (
          <canvas
            ref={canvasRef}
            className="stamp-preview-canvas"
            role="img"
            aria-label={`${template.layers.length} 层、${visualCount} 个视觉成员组合预览`}
          />
        ) : null}
      </div>
      {missingTiles.length ? (
        <p className="stamp-preview-message error">瓦片资源缺失：{missingTiles.join('、')}</p>
      ) : null}
      <fieldset className="stamp-layer-toggles">
        <legend>预览图层</legend>
        {template.layers.map((layer) => {
          const visible = !hiddenLayerIds.has(layer.id)
          const count = layer.tiles.reduce(
            (sum, row) => sum + row.filter((tile) => tile !== null).length,
            0,
          )
          return (
            <DsPressable
              key={layer.id}
              type="button"
              className={visible ? 'active' : ''}
              aria-pressed={visible}
              onClick={() =>
                setHiddenLayerIds((current) => {
                  const next = new Set(current)
                  if (next.has(layer.id)) next.delete(layer.id)
                  else next.add(layer.id)
                  return next
                })
              }
            >
              <i aria-hidden="true" />
              <span>{layer.name}</span>
              <small>{count}</small>
            </DsPressable>
          )
        })}
        <DsPressable
          type="button"
          className={showCollision ? 'active collision' : 'collision'}
          aria-pressed={showCollision}
          onClick={() => setShowCollision((value) => !value)}
        >
          <i aria-hidden="true" />
          <span>碰撞叠层</span>
          <small>{collisionMembers(template).length}</small>
        </DsPressable>
      </fieldset>
    </section>
  )
}

export function StampMiniPreview(props: {
  template: StampTemplate
  tilesets: readonly TilesetDef[]
  assetReader: EditorAssetReader
  assetCatalog: AssetCatalogV1
  assetBase: AssetBase
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { assets } = useTemplateAssets(props)
  useEffect(() => {
    if (ref.current && assets)
      drawPreview(ref.current, props.template, assets, new Set(), false, { width: 34, height: 34 })
  }, [assets, props.template])
  return (
    <canvas
      ref={ref}
      width={34}
      height={34}
      role="img"
      aria-label={`${props.template.name} 缩略图`}
    />
  )
}
