import type { StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import {
  bakeFrame,
  decompressGzip,
  latticeCenter,
  loadStandardPalette,
  loadTilesetByPath,
  parseSpriteChunk,
  projectMapTileBlitRect,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveRelativeLatticeOffset } from '../core/map-transform.js'

interface PreviewAssets {
  palette: Palette
  frames: Map<number, RleFrame>
}

const paletteCache = new WeakMap<AssetBase, Promise<Palette>>()
const diskFrameCache = new WeakMap<AssetBase, Map<string, Promise<Map<number, RleFrame>>>>()
const blobFrameCache = new WeakMap<ArrayBuffer, Promise<Map<number, RleFrame>>>()

function cachedPalette(assetBase: AssetBase): Promise<Palette> {
  const existing = paletteCache.get(assetBase)
  if (existing) return existing
  const pending = loadStandardPalette(assetBase)
  paletteCache.set(assetBase, pending)
  return pending
}

function cachedFrames(
  assetBase: AssetBase,
  tileset: TilesetDef,
  blob: ArrayBuffer | undefined,
): Promise<Map<number, RleFrame>> {
  if (blob) {
    const existing = blobFrameCache.get(blob)
    if (existing) return existing
    const pending = decompressGzip(new Blob([blob])).then(
      (raw) => new Map(parseSpriteChunk(raw).map((frame, index) => [index, frame] as const)),
    )
    blobFrameCache.set(blob, pending)
    return pending
  }
  const byPath = diskFrameCache.get(assetBase) ?? new Map()
  diskFrameCache.set(assetBase, byPath)
  const existing = byPath.get(tileset.path)
  if (existing) return existing
  const pending = loadTilesetByPath(assetBase, tileset.path)
  byPath.set(tileset.path, pending)
  return pending
}

async function loadPreviewAssets(
  assetBase: AssetBase,
  tileset: TilesetDef,
  blob: ArrayBuffer | undefined,
): Promise<PreviewAssets> {
  const [palette, frames] = await Promise.all([
    cachedPalette(assetBase),
    cachedFrames(assetBase, tileset, blob),
  ])
  return { palette, frames }
}

const PREVIEW_ANCHOR = { row: 0, col: 0 }

export function StampPreviewCanvas(props: {
  template: StampTemplateV1
  tilesets: readonly TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  assetBase: AssetBase
}) {
  const { template, tilesets, tilesetBlobs, assetBase } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [assets, setAssets] = useState<PreviewAssets>()
  const [error, setError] = useState('')
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(() => new Set())
  const [showCollision, setShowCollision] = useState(true)
  const tileset = tilesets.find((candidate) => candidate.id === template.tilesetId)

  useEffect(() => {
    void template.id
    setHiddenSlots(new Set())
  }, [template.id])
  useEffect(() => {
    let alive = true
    setAssets(undefined)
    setError('')
    if (!tileset) {
      setError(`来源瓦片集 “${template.tilesetId}” 不存在。`)
      return
    }
    void (async () => {
      try {
        const blob = tilesetBlobs[tileset.path]
        const next = await loadPreviewAssets(assetBase, tileset, blob)
        if (alive) setAssets(next)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, template.tilesetId, tileset, tilesetBlobs])

  const visibleMembers = useMemo(() => {
    const slotOrder = new Map(template.layerSlots.map((slot, index) => [slot.id, index] as const))
    return template.visual
      .filter((member) => !hiddenSlots.has(member.layerSlotId))
      .map((member) => ({
        member,
        point: resolveRelativeLatticeOffset(PREVIEW_ANCHOR, member.offset),
      }))
      .sort(
        (left, right) =>
          (slotOrder.get(left.member.layerSlotId) ?? 0) -
            (slotOrder.get(right.member.layerSlotId) ?? 0) ||
          left.point.row - right.point.row ||
          left.point.col - right.point.col,
      )
  }, [hiddenSlots, template.layerSlots, template.visual])
  const missingTileIds = useMemo(
    () =>
      assets
        ? [
            ...new Set(
              visibleMembers.flatMap(({ member }) =>
                assets.frames.has(member.tileId) ? [] : [member.tileId],
              ),
            ),
          ].sort((left, right) => left - right)
        : [],
    [assets, visibleMembers],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !assets) return

    const members = visibleMembers.flatMap(({ member, point }) => {
      const frame = assets.frames.get(member.tileId)
      if (!frame) return []
      const rect = projectMapTileBlitRect(point, frame)
      return [{ member, frame, point, rect }]
    })
    const points = [
      ...(showCollision
        ? template.collision.map((member) =>
            resolveRelativeLatticeOffset(PREVIEW_ANCHOR, member.offset),
          )
        : []),
      PREVIEW_ANCHOR,
    ]
    let minX = Math.min(
      ...members.map(({ rect }) => rect.x),
      ...points.map((p) => latticeCenter(p).x - 18),
    )
    let maxX = Math.max(
      ...members.map(({ rect }) => rect.x + rect.width),
      ...points.map((p) => latticeCenter(p).x + 18),
    )
    let minY = Math.min(
      ...members.map(({ rect }) => rect.y),
      ...points.map((p) => latticeCenter(p).y - 10),
    )
    let maxY = Math.max(
      ...members.map(({ rect }) => rect.y + rect.height),
      ...points.map((p) => latticeCenter(p).y + 10),
    )
    const padding = 30
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding
    const naturalWidth = Math.max(96, Math.ceil(maxX - minX))
    const naturalHeight = Math.max(96, Math.ceil(maxY - minY))
    const scale = Math.min(1, 1800 / naturalWidth, 1200 / naturalHeight)
    canvas.width = Math.max(1, Math.ceil(naturalWidth * scale))
    canvas.height = Math.max(1, Math.ceil(naturalHeight * scale))
    context.imageSmoothingEnabled = false
    context.setTransform(scale, 0, 0, scale, -minX * scale, -minY * scale)
    context.clearRect(minX, minY, naturalWidth, naturalHeight)

    for (const { frame, rect } of members)
      context.drawImage(bakeFrame(frame, assets.palette), rect.x, rect.y)

    context.lineWidth = 1.5 / scale
    for (const collision of showCollision ? template.collision : []) {
      const point = resolveRelativeLatticeOffset(PREVIEW_ANCHOR, collision.offset)
      const center = latticeCenter(point)
      context.beginPath()
      context.moveTo(center.x, center.y - 7)
      context.lineTo(center.x + 14, center.y)
      context.lineTo(center.x, center.y + 7)
      context.lineTo(center.x - 14, center.y)
      context.closePath()
      context.fillStyle =
        collision.value === 0 ? 'rgba(65, 155, 255, 0.18)' : 'rgba(255, 130, 76, 0.25)'
      context.strokeStyle = collision.value === 0 ? '#6eb0ff' : '#ff945f'
      context.fill()
      context.stroke()
    }

    const anchor = latticeCenter(PREVIEW_ANCHOR)
    context.beginPath()
    context.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2)
    context.fillStyle = '#59d8ff'
    context.fill()
    context.strokeStyle = '#07131d'
    context.stroke()
  }, [assets, showCollision, template.collision, visibleMembers])

  return (
    <section className="stamp-preview-card" aria-label={`${template.name} 图章合成预览`}>
      <header className="stamp-preview-toolbar">
        <div>
          <strong>合成预览</strong>
          <span>
            {visibleMembers.length} 个可见成员 · 最高 H
            {Math.max(0, ...visibleMembers.map(({ member }) => member.height))}
          </span>
        </div>
        <span className="stamp-anchor-key">
          <i aria-hidden="true" />
          锚点
        </span>
      </header>
      <div className="stamp-preview-stage">
        {error ? (
          <div className="stamp-preview-message error">{error}</div>
        ) : assets ? (
          <canvas
            ref={canvasRef}
            className="stamp-preview-canvas"
            role="img"
            aria-label={`${template.layerSlots.length} 层、${template.visual.length} 个视觉成员、${template.collision.length} 个碰撞成员`}
          >
            {template.name}：{template.layerSlots.length} 层、{template.visual.length} 个视觉成员。
          </canvas>
        ) : (
          <div className="stamp-preview-message">正在载入瓦片预览…</div>
        )}
      </div>
      {missingTileIds.length ? (
        <p className="stamp-preview-diagnostic">
          瓦片集缺少 tileId：{missingTileIds.join('、')}；对应成员未显示。
        </p>
      ) : null}
      <fieldset className="stamp-layer-toggles">
        <legend>预览图层</legend>
        {template.layerSlots.map((slot) => {
          const visible = !hiddenSlots.has(slot.id)
          const count = template.visual.filter((member) => member.layerSlotId === slot.id).length
          return (
            <button
              key={slot.id}
              type="button"
              className={visible ? 'active' : ''}
              aria-pressed={visible}
              onClick={() =>
                setHiddenSlots((current) => {
                  const next = new Set(current)
                  if (next.has(slot.id)) next.delete(slot.id)
                  else next.add(slot.id)
                  return next
                })
              }
            >
              <i aria-hidden="true" />
              <span>{slot.name}</span>
              <small>{count}</small>
            </button>
          )
        })}
        <button
          type="button"
          className={showCollision ? 'active collision' : 'collision'}
          aria-pressed={showCollision}
          onClick={() => setShowCollision((value) => !value)}
        >
          <i aria-hidden="true" />
          <span>碰撞叠层</span>
          <small>{template.collision.length}</small>
        </button>
      </fieldset>
    </section>
  )
}

/** 图章库行内真实缩略图；palette/tileset 解码按资源缓存，数百行不会重复读文件。 */
export function StampMiniPreview(props: {
  template: StampTemplateV1
  tilesets: readonly TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  assetBase: AssetBase
}) {
  const { template, tilesets, tilesetBlobs, assetBase } = props
  const ref = useRef<HTMLCanvasElement>(null)
  const tileset = tilesets.find((candidate) => candidate.id === template.tilesetId)
  useEffect(() => {
    let alive = true
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !tileset) return
    void loadPreviewAssets(assetBase, tileset, tilesetBlobs[tileset.path]).then(
      ({ palette, frames }) => {
        if (!alive) return
        const slotOrder = new Map(
          template.layerSlots.map((slot, index) => [slot.id, index] as const),
        )
        const members = template.visual
          .flatMap((member) => {
            const frame = frames.get(member.tileId)
            if (!frame) return []
            const point = resolveRelativeLatticeOffset(PREVIEW_ANCHOR, member.offset)
            return [{ member, frame, point, rect: projectMapTileBlitRect(point, frame) }]
          })
          .sort(
            (left, right) =>
              (slotOrder.get(left.member.layerSlotId) ?? 0) -
                (slotOrder.get(right.member.layerSlotId) ?? 0) ||
              left.point.row - right.point.row ||
              left.point.col - right.point.col,
          )
        context.clearRect(0, 0, canvas.width, canvas.height)
        if (!members.length) return
        const minX = Math.min(...members.map(({ rect }) => rect.x))
        const minY = Math.min(...members.map(({ rect }) => rect.y))
        const maxX = Math.max(...members.map(({ rect }) => rect.x + rect.width))
        const maxY = Math.max(...members.map(({ rect }) => rect.y + rect.height))
        const scale = Math.min(1, 28 / Math.max(1, maxX - minX), 28 / Math.max(1, maxY - minY))
        const dx = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale
        const dy = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale
        context.imageSmoothingEnabled = false
        context.setTransform(scale, 0, 0, scale, dx, dy)
        for (const { frame, rect } of members)
          context.drawImage(bakeFrame(frame, palette), rect.x, rect.y)
      },
      () => {
        if (alive) context.clearRect(0, 0, canvas.width, canvas.height)
      },
    )
    return () => {
      alive = false
    }
  }, [assetBase, template, tileset, tilesetBlobs])
  return (
    <canvas ref={ref} width={34} height={34} role="img" aria-label={`${template.name} 缩略图`}>
      {template.name} 缩略图
    </canvas>
  )
}
