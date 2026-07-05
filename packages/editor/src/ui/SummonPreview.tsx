/**
 * 召唤神将预览(技能编辑;2026-07-05 作者:召唤技能看不到神将)。
 * 图源 = F.MKF player 通道 chunk godId+10(与战斗预载同款);帧率 = (speed+5)×10ms
 * (与神将现身 loop 同语义)。倍速/暂停控件同 FireEffectPreview 约定。
 */
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadBattleSprite, loadPalette } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

const godCache = new Map<number, Promise<HTMLCanvasElement[] | null>>()

function loadGodFrames(assetBase: AssetBase, godId: number): Promise<HTMLCanvasElement[] | null> {
  let p = godCache.get(godId)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadBattleSprite(assetBase, 'player', godId + 10),
          loadPalette(assetBase, 0),
        ])
        if (!sprite.frames.length) return null
        return sprite.frames.map((f: Parameters<typeof bakeFrame>[0]) => bakeFrame(f, palette))
      } catch {
        return null
      }
    })()
    godCache.set(godId, p)
  }
  return p
}

const W = 200
const H = 170

export function SummonPreview(props: { assetBase: AssetBase; godId: number; speed?: number }) {
  const { assetBase, godId, speed } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null | 'loading'>('loading')
  const [rate, setRate] = useState(0.5)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    let alive = true
    setFrames('loading')
    void loadGodFrames(assetBase, godId).then((f) => {
      if (alive) setFrames(f)
    })
    return () => {
      alive = false
    }
  }, [assetBase, godId])

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length || !playing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const n = frames.length
    const stepMs = (((speed ?? 0) + 5) * 10) / rate
    // 真实编排(fight.c:3160-3181):帧 0→n-2 单向推进(各 (speed+5)×10ms)→ 定格 n-1
    // 贯穿二次法术 —— 非匀速循环。预览:定格停 1.2s 后重播,便于反复观察。
    let idx = 0
    let holdUntil = 0
    const draw = (): void => {
      const img = frames[idx]!
      ctx.clearRect(0, 0, W, H)
      ctx.imageSmoothingEnabled = false
      const scale = Math.min((W - 8) / img.width, (H - 8) / img.height, 2)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (W - w) / 2, H - 4 - h, w, h) // 底对齐(战场站位观感)
    }
    const tick = (): void => {
      draw()
      if (idx < n - 1) {
        idx++
      } else if (holdUntil === 0) {
        holdUntil = Date.now() + 1200 / rate // 定格段
      } else if (Date.now() >= holdUntil) {
        idx = 0
        holdUntil = 0 // 重播
      }
    }
    tick()
    const timer = window.setInterval(tick, stepMs)
    return () => window.clearInterval(timer)
  }, [frames, speed, rate, playing])

  return (
    <div className="fire-preview">
      <canvas ref={canvasRef} width={W} height={H} />
      {frames === 'loading' && <div className="hint2">加载神将…</div>}
      {frames === null && <div className="hint2">无神将资产(godId {godId})</div>}
      {Array.isArray(frames) && (
        <>
          <div className="fp-controls">
            <button type="button" className="mini" title={playing ? '暂停' : '播放'} onClick={() => setPlaying(!playing)}>
              {playing ? '⏸' : '▶'}
            </button>
            <select className="in fp-rate" title="预览倍速(引擎实速 = 1×)" value={String(rate)} onChange={(e) => setRate(Number(e.target.value))}>
              <option value="0.25">0.25×</option>
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
            </select>
          </div>
          <div className="hint2">
            神将 #{godId} · {frames.length} 帧 · 推进后定格(真值编排)
          </div>
        </>
      )}
    </div>
  )
}
