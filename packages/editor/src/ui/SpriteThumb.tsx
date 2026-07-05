/**
 * 精灵缩略图(放置 palette / 检查器;2026-07-05 作者:「光看名字不清楚是什么」)。
 * 懒加载:进入视口才 loadSprite(579 精灵全量拉图太重);bake 结果模块级缓存(跨行复用)。
 * 0 号调色板 bake(编辑器缩略不追场景准色,同 BattleFieldPicker 约定)。
 */
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadPalette, loadSprite } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

const thumbCache = new Map<number, Promise<HTMLCanvasElement | null>>()

function loadThumb(assetBase: AssetBase, spriteNum: number): Promise<HTMLCanvasElement | null> {
  let p = thumbCache.get(spriteNum)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadSprite(assetBase, spriteNum),
          loadPalette(assetBase, 0),
        ])
        const f = sprite.frames[0]
        if (!f) return null
        return bakeFrame(f, palette)
      } catch {
        return null // 缺图静默(工程无此精灵资产)
      }
    })()
    thumbCache.set(spriteNum, p)
  }
  return p
}

export function SpriteThumb(props: { assetBase: AssetBase; spriteNum: number; size?: number }) {
  const { assetBase, spriteNum, size = 36 } = props
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
    void loadThumb(assetBase, spriteNum).then((baked) => {
      if (!alive || !hostRef.current) return
      const ctx = hostRef.current.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      if (!baked) return
      ctx.imageSmoothingEnabled = false
      // 等比缩放塞进方格,底对齐居中(精灵锚点习惯)
      const scale = Math.min(size / baked.width, size / baked.height, 2)
      const w = baked.width * scale
      const h = baked.height * scale
      ctx.drawImage(baked, (size - w) / 2, size - h, w, h)
    })
    return () => {
      alive = false
    }
  }, [visible, assetBase, spriteNum, size])

  return <canvas ref={hostRef} width={size} height={size} className="sprite-thumb" />
}
