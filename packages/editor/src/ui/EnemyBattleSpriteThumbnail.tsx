import type { BattleSpriteDef } from '@type-pal/content'
import type { AssetBase, Palette } from '@type-pal/reforge'
import {
  BattleSpriteAssetCache,
  bakeFrame,
  loadBattleSpriteDefinition,
  loadStandardPalette,
} from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'

const CATALOG_THUMBNAIL_SIZE = 36
const HERO_THUMBNAIL_SIZE = 56
const THUMBNAIL_CACHE_CAPACITY = 64

/**
 * EnemyTab shares this cache between its catalog and hero for one asset base and reader.
 * An entry is reusable within that scope while the definition, profile and frame source agree.
 */
export class EnemyBattleSpriteThumbnailCache {
  private readonly spriteCache: BattleSpriteAssetCache
  private readonly entries = new Map<string, Promise<HTMLCanvasElement | null>>()
  private paletteBase?: AssetBase
  private palettePromise?: Promise<Palette>

  constructor(private readonly capacity = THUMBNAIL_CACHE_CAPACITY) {
    this.spriteCache = new BattleSpriteAssetCache(Math.max(1, capacity))
  }

  private palette(base: AssetBase): Promise<Palette> {
    if (this.paletteBase === base && this.palettePromise) return this.palettePromise
    this.paletteBase = base
    const promise = loadStandardPalette(base).catch((error: unknown) => {
      if (this.palettePromise === promise) this.palettePromise = undefined
      throw error
    })
    this.palettePromise = promise
    return promise
  }

  load(
    base: AssetBase,
    reader: EditorAssetReader,
    definition: BattleSpriteDef,
    revision: string,
  ): Promise<HTMLCanvasElement | null> {
    if (definition.profile.kind !== 'enemy') return Promise.resolve(null)
    const frameIndex = definition.profile.idle.start
    const key = [
      reader.projectId,
      definition.id,
      definition.asset,
      revision,
      frameIndex,
      JSON.stringify(definition.profile),
    ].join('\0')
    const existing = this.entries.get(key)
    if (existing) {
      this.entries.delete(key)
      this.entries.set(key, existing)
      return existing
    }

    const loadedDefinition = loadBattleSpriteDefinition(
      this.spriteCache,
      reader,
      definition,
      'enemy',
    )
    this.spriteCache.prune(new Set([definition.asset]))

    let promise: Promise<HTMLCanvasElement | null>
    promise = Promise.all([loadedDefinition, this.palette(base)])
      .then(([loaded, palette]) => {
        const frame = loaded.sprite.frames[frameIndex]
        return frame ? bakeFrame(frame, palette) : null
      })
      .catch(() => {
        if (this.entries.get(key) === promise) this.entries.delete(key)
        return null
      })
    this.entries.set(key, promise)
    const limit = Math.max(1, this.capacity)
    while (this.entries.size > limit) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
    return promise
  }

  clear(): void {
    this.entries.clear()
    this.spriteCache.clear()
    this.paletteBase = undefined
    this.palettePromise = undefined
  }
}

export function EnemyBattleSpriteThumbnail(props: {
  definition?: BattleSpriteDef
  assetBase?: AssetBase
  assetReader: EditorAssetReader
  revision?: string
  cache: EnemyBattleSpriteThumbnailCache
  placement?: 'catalog' | 'hero'
}) {
  const { definition, assetBase, assetReader, revision, cache, placement = 'catalog' } = props
  const thumbnailSize = placement === 'hero' ? HERO_THUMBNAIL_SIZE : CATALOG_THUMBNAIL_SIZE
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          setVisible(true)
        }
      },
      { rootMargin: '120px' },
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, thumbnailSize, thumbnailSize)
    if (!visible || !assetBase || !definition || definition.profile.kind !== 'enemy' || !revision)
      return

    let alive = true
    void cache.load(assetBase, assetReader, definition, revision).then((frame) => {
      if (!alive || !frame || !canvasRef.current) return
      const target = canvasRef.current
      const targetContext = target.getContext('2d')
      if (!targetContext || frame.width <= 0 || frame.height <= 0) return
      targetContext.clearRect(0, 0, thumbnailSize, thumbnailSize)
      targetContext.imageSmoothingEnabled = false
      const scale = Math.min(thumbnailSize / frame.width, thumbnailSize / frame.height, 2)
      const width = frame.width * scale
      const height = frame.height * scale
      targetContext.drawImage(
        frame,
        (thumbnailSize - width) / 2,
        thumbnailSize - height,
        width,
        height,
      )
    })
    return () => {
      alive = false
    }
  }, [assetBase, assetReader, cache, definition, revision, thumbnailSize, visible])

  return (
    <canvas
      ref={canvasRef}
      width={thumbnailSize}
      height={thumbnailSize}
      className="sprite-thumb enemy-battle-sprite-thumbnail"
      data-placement={placement}
      tabIndex={-1}
      aria-hidden="true"
    />
  )
}
