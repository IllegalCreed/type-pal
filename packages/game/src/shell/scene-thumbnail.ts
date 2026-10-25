import type { Palette, Tilemap } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import { loadTilesetBlob } from '../assets/tileset-blob.js'
import { drawTilemap, repairTilemapSeams } from '../present/draw-tilemap.js'
import { createFramebuffer } from '../present/framebuffer.js'

/** One renderer per application: shared successful URLs and inflight work outlive individual views. */
export function createSceneThumbnailRenderer(
  palette: Palette,
): (sceneId: number, mapNum?: number, outW?: number) => Promise<string | null> {
  const BASE = '/extracted'
  // ── dev picker与生产小地图共用的离屏缩略图──────────────────────────────────
  // 标准64×128地图先画2080×2080 framebuffer;picker默认输出宽96,小地图caller传640。
  // 按mapNum/outW缓存和dedup,并发上限2;本地解码tileset blob,成功后只留dataURL。
  // 不写gameplay的tileImagesBySceneId/sceneAssetsCache；补缝只作用于本次离屏缓冲。
  const THUMB_TILE_W = 32
  const THUMB_TILE_H = 16
  const THUMB_OUT_W = 96
  const thumbCache = new Map<string, string>() // `${mapNum}_${outW}` → dataURL(仅缓存成功)
  const thumbInflight = new Map<string, Promise<string | null>>()
  let thumbActive = 0
  const thumbWaiters: (() => void)[] = []
  const THUMB_CONCURRENCY = 2
  const acquireThumb = async (): Promise<void> => {
    if (thumbActive < THUMB_CONCURRENCY) {
      thumbActive++
      return
    }
    await new Promise<void>((res) => thumbWaiters.push(res)) // 槽位由 release 转移,不再自增
  }
  const releaseThumb = (): void => {
    const w = thumbWaiters.shift()
    if (w) w()
    else thumbActive--
  }

  async function renderMapThumbnail(
    mapNum: number,
    outW: number = THUMB_OUT_W,
  ): Promise<string | null> {
    const tilemapJson = await fetch(`${BASE}/data/tilemap/${mapNum}.json`).then((r) => {
      if (!r.ok) throw new Error(`tilemap-${mapNum}.json fetch failed (${r.status})`)
      return r.json() as Promise<Tilemap>
    })
    // tileset blob 解码 → 本地 transient Map(渲染后即弃)。
    const tileImgs = await loadTilesetBlob(`${BASE}/data/${tilemapJson.tileset}`)
    // 整张 map 渲染:留小边距(fence/sub-row 落在 -16/-8),camera 偏移让左上 tile 进画。
    const bufW = (tilemapJson.width + 1) * THUMB_TILE_W
    const bufH = (tilemapJson.height + 2) * THUMB_TILE_H
    const tfb = createFramebuffer(bufW, bufH)
    const seamCoverage = new Uint8Array(bufW * bufH)
    const camera = { x: -THUMB_TILE_W / 2, y: -THUMB_TILE_H }
    const tiles = { get: (i: number): IndexedImage | undefined => tileImgs.get(i) }
    drawTilemap(tfb, tilemapJson, tiles, camera, 0, seamCoverage)
    drawTilemap(tfb, tilemapJson, tiles, camera, 1, seamCoverage)
    repairTilemapSeams(tfb, seamCoverage)
    // full canvas→按outW等比缩放→dataURL。借用启动palette,不读取实时gs.palette。
    const full = document.createElement('canvas')
    full.width = bufW
    full.height = bufH
    const fctx = full.getContext('2d')
    if (!fctx) return null
    fctx.putImageData(tfb.toImageData(palette), 0, 0)
    const scale = outW / bufW
    const thumb = document.createElement('canvas')
    thumb.width = outW
    thumb.height = Math.max(1, Math.round(bufH * scale))
    const tctx = thumb.getContext('2d')
    if (!tctx) return null
    tctx.imageSmoothingEnabled = true
    tctx.imageSmoothingQuality = 'high'
    tctx.drawImage(full, 0, 0, thumb.width, thumb.height)
    return thumb.toDataURL('image/png')
  }

  const renderSceneThumbnail = async (
    sceneId: number,
    mapNum?: number,
    outW: number = THUMB_OUT_W, // dev picker默认96;生产小地图caller传640
  ): Promise<string | null> => {
    let map = mapNum
    if (map === undefined) {
      // scene-jumps 多数带 mapNum;缺则 fetch scene json 拿。
      const sj = await fetch(`${BASE}/data/scene/${sceneId}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<{ mapNum: number }>) : null))
        .catch(() => null)
      map = sj?.mapNum
    }
    if (map === undefined) return null
    const cacheKey = `${map}_${outW}` // 同地图按输出宽度分开缓存(picker96/小地图640)
    const cached = thumbCache.get(cacheKey)
    if (cached) return cached
    const inflight = thumbInflight.get(cacheKey)
    if (inflight) return inflight
    const mapNumResolved = map
    const p = (async (): Promise<string | null> => {
      await acquireThumb()
      try {
        const url = await renderMapThumbnail(mapNumResolved, outW)
        if (url) thumbCache.set(cacheKey, url)
        return url
      } catch (e) {
        console.warn(`[dev-panel] 缩略图渲染失败 map ${mapNumResolved}:`, e)
        return null
      } finally {
        releaseThumb()
        thumbInflight.delete(cacheKey)
      }
    })()
    thumbInflight.set(cacheKey, p)
    return p
  }

  return renderSceneThumbnail
}
