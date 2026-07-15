/**
 * 精灵缩略图(放置 palette / 检查器;2026-07-05 作者:「光看名字不清楚是什么」)。
 * 懒加载:进入视口才 loadSprite(579 精灵全量拉图太重);bake 结果模块级缓存(跨行复用)。
 * 0 号调色板 bake(编辑器缩略不追场景准色,同 BattleFieldPicker 约定)。
 * A4 自有上传:path 双轨 + 未保存字节(blob)内存解码优先(磁盘尚无此文件)。
 */
import type { AssetBase } from '@type-pal/reforge'
import {
  bakeFrame,
  decompressGzip,
  loadPalette,
  loadSprite,
  parseSpriteChunk,
} from '@type-pal/reforge'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const thumbCache = new Map<string, Promise<HTMLCanvasElement | null>>()

function loadThumb(
  assetBase: AssetBase,
  spriteNum: number,
  frameIndex: number,
  path?: string,
  blob?: ArrayBuffer,
): Promise<HTMLCanvasElement | null> {
  // blob(新上传未保存)不进缓存:保存后走磁盘路径,缓存键仍按 num(上传条目 num 唯一)
  if (blob) {
    return (async () => {
      try {
        const [frames, palette] = await Promise.all([
          decompressGzip(new Blob([blob])).then(parseSpriteChunk),
          loadPalette(assetBase, 0),
        ])
        const f = frames[frameIndex] ?? frames[0]
        return f ? bakeFrame(f, palette) : null
      } catch {
        return null
      }
    })()
  }
  const cacheKey = `${assetBase.root}\0${assetBase.sprites}\0${path ?? ''}\0${spriteNum}\0${frameIndex}`
  let p = thumbCache.get(cacheKey)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadSprite(assetBase, spriteNum, path),
          loadPalette(assetBase, 0),
        ])
        const f = sprite.frames[frameIndex] ?? sprite.frames[0]
        if (!f) return null
        return bakeFrame(f, palette)
      } catch {
        return null // 缺图静默(工程无此精灵资产)
      }
    })()
    thumbCache.set(cacheKey, p)
  }
  return p
}

export function SpriteThumb(props: {
  assetBase: AssetBase
  spriteNum: number
  size?: number
  /** 要预览的帧;越界时回退首帧。 */
  frameIndex?: number
  /** 自有上传精灵的 .rle 路径(缺省走原版号约定)。 */
  path?: string
  /** 新上传未保存的字节(内存解码优先)。 */
  blob?: ArrayBuffer
  /** palette 行保留脚底锚点;独立预览/查看器使用几何居中。 */
  align?: 'bottom' | 'center'
  /** 放大上限;默认缩略图最多 2×,查看器可提高。 */
  maxScale?: number
}) {
  const {
    assetBase,
    spriteNum,
    size = 36,
    frameIndex = 0,
    path,
    blob,
    align = 'bottom',
    maxScale = 2,
  } = props
  const hostRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  // 懒加载:进视口才拉
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true)
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let alive = true
    void loadThumb(assetBase, spriteNum, frameIndex, path, blob).then((baked) => {
      if (!alive || !hostRef.current) return
      const ctx = hostRef.current.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      if (!baked) return
      ctx.imageSmoothingEnabled = false
      // 等比缩放塞进方格;palette 默认脚底锚定,独立查看器改用几何居中。
      const scale = Math.min(size / baked.width, size / baked.height, maxScale)
      const w = baked.width * scale
      const h = baked.height * scale
      const y = align === 'center' ? (size - h) / 2 : size - h
      ctx.drawImage(baked, (size - w) / 2, y, w, h)
    })
    return () => {
      alive = false
    }
  }, [visible, assetBase, spriteNum, size, frameIndex, path, blob, align, maxScale])

  return (
    <canvas
      ref={hostRef}
      width={size}
      height={size}
      className="sprite-thumb"
      role="img"
      aria-label={`精灵 #${spriteNum} 预览`}
    />
  )
}

/** 检查器使用的模态精灵查看器:黑底、像素整数放大、原帧居中。 */
export function SpriteImageViewer(props: {
  assetBase: AssetBase
  spriteNum: number
  frameIndex?: number
  path?: string
  blob?: ArrayBuffer
  label: string
  onClose: () => void
}) {
  const { assetBase, spriteNum, frameIndex = 0, path, blob, label, onClose } = props
  const [zoom, setZoom] = useState(4)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    closeRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="sprite-image-viewer"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="sprite-image-viewer-header">
        <div className="sprite-image-viewer-title">
          <strong id={titleId}>{label}</strong>
          <span>
            #{spriteNum} · 帧 {frameIndex}
          </span>
        </div>
        <fieldset className="sprite-image-viewer-tools">
          <legend className="sprite-image-viewer-tools-label">图片缩放</legend>
          <button
            type="button"
            className="sprite-image-viewer-tool"
            aria-label="缩小"
            title="缩小"
            disabled={zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 1))}
          >
            <span className="sprite-viewer-minus" aria-hidden="true" />
          </button>
          <output className="sprite-image-viewer-zoom" aria-live="polite">
            {zoom}×
          </output>
          <button
            type="button"
            className="sprite-image-viewer-tool"
            aria-label="放大"
            title="放大"
            disabled={zoom >= 12}
            onClick={() => setZoom((value) => Math.min(12, value + 1))}
          >
            <span className="sprite-viewer-plus" aria-hidden="true" />
          </button>
          <button
            ref={closeRef}
            type="button"
            className="sprite-image-viewer-tool close"
            aria-label="关闭图片查看器"
            title="关闭"
            onClick={onClose}
          >
            <span className="sprite-viewer-close" aria-hidden="true" />
          </button>
        </fieldset>
      </header>
      <div className="sprite-image-viewer-stage">
        <SpriteThumb
          assetBase={assetBase}
          spriteNum={spriteNum}
          frameIndex={frameIndex}
          size={512}
          path={path}
          blob={blob}
          align="center"
          maxScale={zoom}
        />
      </div>
    </dialog>,
    document.body,
  )
}
