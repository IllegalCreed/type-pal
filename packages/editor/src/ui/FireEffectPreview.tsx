/**
 * FIRE 法术特效实时预览(技能编辑,2026-07-05 作者拍板)。
 * 帧源 = loadFireSprite(FIRE.MKF 招式精灵,0 号板 bake);播放语义对齐引擎考证:
 * 帧时长 (speed+5)×10ms、fireDelay 为循环起点、音效在循环点播。参数改动即重启。
 * 完整战斗语境(施法者/飞行/命中)待引擎 B5 召唤·变身动画补齐后上。
 */
import type { SkillAnimation } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadFireSprite, loadPalette } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

const fireCache = new Map<number, Promise<HTMLCanvasElement[] | null>>()

function loadFrames(assetBase: AssetBase, chunk: number): Promise<HTMLCanvasElement[] | null> {
  let p = fireCache.get(chunk)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadFireSprite(assetBase, chunk),
          loadPalette(assetBase, 0),
        ])
        if (!sprite.frames.length) return null
        return sprite.frames.map((f: Parameters<typeof bakeFrame>[0]) => bakeFrame(f, palette))
      } catch {
        return null
      }
    })()
    fireCache.set(chunk, p)
  }
  return p
}

const W = 180
const H = 150

export function FireEffectPreview(props: { assetBase: AssetBase; anim: SkillAnimation }) {
  const { assetBase, anim } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null | 'loading'>('loading')

  useEffect(() => {
    let alive = true
    setFrames('loading')
    void loadFrames(assetBase, anim.effectSprite).then((f) => {
      if (alive) setFrames(f)
    })
    return () => {
      alive = false
    }
  }, [assetBase, anim.effectSprite])

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const n = frames.length
    const fireDelay = Math.min(anim.fireDelay ?? 0, n - 1)
    const stepMs = ((anim.speed ?? 0) + 5) * 10
    let idx = 0
    let disposed = false
    const soundUrl =
      anim.sound !== undefined && anim.sound > 0
        ? `${assetBase.sounds}/${anim.sound}.wav`
        : null
    const draw = (): void => {
      const img = frames[idx]!
      ctx.clearRect(0, 0, W, H)
      ctx.imageSmoothingEnabled = false
      const scale = Math.min((W - 8) / img.width, (H - 8) / img.height, 3)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
    }
    const tick = (): void => {
      if (disposed) return
      draw()
      // 音效:引擎语义 (i−fireDelay)%(n−fireDelay)===0 循环点播
      const span = n - fireDelay
      if (soundUrl && span > 0 && idx >= fireDelay && (idx - fireDelay) % span === 0) {
        const a = new Audio(soundUrl)
        a.volume = 0.5
        void a.play().catch(() => {})
      }
      idx = idx + 1 >= n ? fireDelay : idx + 1 // 到尾回循环起点(预览无限循环)
    }
    tick()
    const timer = window.setInterval(tick, stepMs)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [frames, anim.speed, anim.fireDelay, anim.sound, assetBase.sounds])

  return (
    <div className="fire-preview">
      <canvas ref={canvasRef} width={W} height={H} />
      {frames === 'loading' && <div className="hint2">加载特效…</div>}
      {frames === null && <div className="hint2">无特效资产(#{anim.effectSprite})</div>}
      {Array.isArray(frames) && (
        <div className="hint2">
          #{anim.effectSprite} · {frames.length} 帧 · {((anim.speed ?? 0) + 5) * 10}ms/帧
        </div>
      )}
    </div>
  )
}
