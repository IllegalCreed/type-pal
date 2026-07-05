/**
 * 变身精灵预览(trance 效果行;2026-07-05 作者:变身精灵裸数字没帧)。
 * 图源 = battle-sprite/player 通道 chunk N(变身 = 换玩家战斗精灵,梦蛇 5 = 蛇形);
 * 全帧循环播(战斗待机观感)。
 */
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadBattleSprite, loadPalette } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

const cache = new Map<number, Promise<HTMLCanvasElement[] | null>>()

function load(assetBase: AssetBase, chunk: number): Promise<HTMLCanvasElement[] | null> {
  let p = cache.get(chunk)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadBattleSprite(assetBase, 'player', chunk),
          loadPalette(assetBase, 0),
        ])
        if (!sprite.frames.length) return null
        return sprite.frames.map((f: Parameters<typeof bakeFrame>[0]) => bakeFrame(f, palette))
      } catch {
        return null
      }
    })()
    cache.set(chunk, p)
  }
  return p
}

const W = 160
const H = 140

export function TrancePreview(props: { assetBase: AssetBase; sprite: number }) {
  const { assetBase, sprite } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null | 'loading'>('loading')

  useEffect(() => {
    let alive = true
    setFrames('loading')
    void load(assetBase, sprite).then((f) => {
      if (alive) setFrames(f)
    })
    return () => {
      alive = false
    }
  }, [assetBase, sprite])

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let idx = 0
    const tick = (): void => {
      const img = frames[idx]!
      ctx.clearRect(0, 0, W, H)
      ctx.imageSmoothingEnabled = false
      const scale = Math.min((W - 8) / img.width, (H - 8) / img.height, 2)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (W - w) / 2, H - 4 - h, w, h)
      idx = (idx + 1) % frames.length
    }
    tick()
    const timer = window.setInterval(tick, 200) // 待机循环节拍(5 帧/s 观感)
    return () => window.clearInterval(timer)
  }, [frames])

  return (
    <div className="fire-preview ef-inline-preview">
      <canvas ref={canvasRef} width={W} height={H} />
      {frames === 'loading' && <div className="hint2">加载精灵…</div>}
      {frames === null && <div className="hint2">无战斗精灵(#{sprite})</div>}
      {Array.isArray(frames) && (
        <div className="hint2">战斗精灵 #{sprite} · {frames.length} 帧循环</div>
      )}
    </div>
  )
}
