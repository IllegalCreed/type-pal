/**
 * FIRE 法术特效实时预览(技能编辑,2026-07-05 作者拍板)。
 * 帧源 = loadFireSprite(FIRE.MKF 招式精灵,0 号板 bake);播放语义对齐引擎考证:
 * 帧时长 (speed+5)×10ms、fireDelay 为循环起点、音效在循环点播。参数改动即重启。
 * 完整战斗语境(施法者/飞行/命中)待引擎 B5 召唤·变身动画补齐后上。
 */
import type { AssetId, SkillAnimation } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadFireSprite, loadStandardPalette, type SfxPlayer } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { prepareSoundPreview } from './SoundPicker.js'

const fireCache = new Map<number, Promise<HTMLCanvasElement[] | null>>()

function loadFrames(assetBase: AssetBase, chunk: number): Promise<HTMLCanvasElement[] | null> {
  let p = fireCache.get(chunk)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadFireSprite(assetBase, chunk),
          loadStandardPalette(assetBase),
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

const W = 200
const H = 170

export function FireEffectPreview(props: {
  assetBase: AssetBase
  anim: SkillAnimation
  assetReader: EditorAssetReader
}) {
  const { assetBase, anim, assetReader } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null | 'loading'>('loading')
  // 音效准备必须发生在用户手势中；准备完成后才起动动画，不做迟到补播。
  const [rate, setRate] = useState(0.5) // 默认半速(编辑时看清帧)
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const sfxRef = useRef<SfxPlayer | null>(null)
  const preparedSoundRef = useRef<AssetId | undefined>(undefined)
  const preparedReaderRef = useRef<EditorAssetReader | null>(null)

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
    if (!Array.isArray(frames) || !frames.length || !playing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const n = frames.length
    const fireDelay = Math.min(anim.fireDelay ?? 0, n - 1)
    const stepMs = (((anim.speed ?? 0) + 5) * 10) / rate // 倍速:rate 0.5 = 半速
    let idx = 0
    let disposed = false
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
      // 音效:引擎语义 (i−fireDelay)%(n−fireDelay)===0 循环点播;单实例复位重播,画帧同 tick = 同步
      const span = n - fireDelay
      if (anim.sound && span > 0 && idx >= fireDelay && (idx - fireDelay) % span === 0) {
        if (preparedSoundRef.current !== anim.sound || preparedReaderRef.current !== assetReader) {
          setPlaying(false)
          return
        }
        try {
          sfxRef.current?.play(anim.sound)
        } catch (cause) {
          setAudioError(cause instanceof Error ? cause.message : String(cause))
          setPlaying(false)
        }
      }
      idx = idx + 1 >= n ? fireDelay : idx + 1 // 到尾回循环起点(预览无限循环)
    }
    tick()
    const timer = window.setInterval(tick, stepMs)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [frames, anim.speed, anim.fireDelay, anim.sound, assetReader, rate, playing])

  const togglePlayback = async (): Promise<void> => {
    if (playing) {
      setPlaying(false)
      return
    }
    setAudioError('')
    try {
      sfxRef.current = anim.sound ? await prepareSoundPreview(assetReader, anim.sound) : null
      preparedSoundRef.current = anim.sound
      preparedReaderRef.current = assetReader
      setPlaying(true)
    } catch (cause) {
      setAudioError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <div className="fire-preview">
      <canvas ref={canvasRef} width={W} height={H} />
      {frames === 'loading' && <div className="hint2">加载特效…</div>}
      {frames === null && <div className="hint2">无特效资产(#{anim.effectSprite})</div>}
      {Array.isArray(frames) && (
        <>
          <div className="fp-controls">
            <button
              type="button"
              className="mini"
              title={playing ? '暂停' : '播放'}
              onClick={() => void togglePlayback()}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <select
              className="in fp-rate"
              title="预览倍速(引擎实速 = 1×)"
              value={String(rate)}
              onChange={(e) => setRate(Number(e.target.value))}
            >
              <option value="0.25">0.25×</option>
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
            </select>
          </div>
          {audioError ? <div className="cf-err">{audioError}</div> : null}
          <div className="hint2">
            #{anim.effectSprite} · {frames.length} 帧 · 实速 {((anim.speed ?? 0) + 5) * 10}ms/帧
          </div>
        </>
      )}
    </div>
  )
}
