/**
 * FIRE 法术特效实时预览(技能编辑,2026-07-05 作者拍板)。
 * 帧源 = loadFireSprite(FIRE.MKF 招式精灵,0 号板 bake);播放语义对齐引擎考证:
 * 帧时长 (speed+5)×10ms、fireDelay 为循环起点、音效在循环点播。参数改动即重启。
 * 完整战斗语境(施法者/飞行/命中)待引擎 B5 召唤·变身动画补齐后上。
 */
import type { AssetId, SkillAnimation } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadFireSprite, loadStandardPalette, type SfxPlayer } from '@type-pal/reforge'
import { useEffect, useId, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsButton, DsField, DsSelect } from './design-system/controls.js'
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

function drawPreviewFrame(context: CanvasRenderingContext2D, image: HTMLCanvasElement): void {
  context.clearRect(0, 0, W, H)
  context.imageSmoothingEnabled = false
  const scale = Math.min((W - 8) / image.width, (H - 8) / image.height, 3)
  const width = image.width * scale
  const height = image.height * scale
  context.drawImage(image, (W - width) / 2, (H - height) / 2, width, height)
}

export function FireEffectPreview(props: {
  assetBase: AssetBase
  anim: SkillAnimation
  assetReader: EditorAssetReader
}) {
  const { assetBase, anim, assetReader } = props
  const rateId = useId()
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
      drawPreviewFrame(ctx, img)
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

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length || playing) return
    const context = canvasRef.current?.getContext('2d')
    const firstFrame = frames[0]
    if (context && firstFrame) drawPreviewFrame(context, firstFrame)
  }, [frames, playing])

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
    <figure className="fire-preview">
      <div className="fire-preview__viewport">
        {frames === 'loading' ? (
          <div className="fire-preview__state" role="status" aria-live="polite">
            正在加载 FIRE #{anim.effectSprite}…
          </div>
        ) : null}
        {frames === null ? (
          <div className="fire-preview__state" role="status">
            <strong>无法加载 FIRE #{anim.effectSprite}</strong>
            <span>请修改特效号或检查工程资源。</span>
          </div>
        ) : null}
        {Array.isArray(frames) ? (
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            role="img"
            aria-label={`FIRE ${anim.effectSprite} 特效预览`}
          />
        ) : null}
      </div>
      {Array.isArray(frames) && (
        <>
          <fieldset className="fp-controls">
            <legend className="ds-visually-hidden">特效预览控制</legend>
            <DsButton
              size="compact"
              variant={playing ? 'primary' : 'secondary'}
              aria-label={playing ? '暂停 FIRE 特效预览' : '播放 FIRE 特效预览'}
              onClick={() => void togglePlayback()}
            >
              {playing ? '暂停' : '播放'}
            </DsButton>
            <DsField id={rateId} label="速度" layout="inline" className="fp-rate-field">
              <DsSelect
                id={rateId}
                size="compact"
                aria-label="FIRE 特效预览倍速"
                value={String(rate)}
                options={[
                  { value: '0.25', label: '0.25×' },
                  { value: '0.5', label: '0.5×' },
                  { value: '1', label: '1×' },
                ]}
                onValueChange={(value) => setRate(Number(value))}
              />
            </DsField>
          </fieldset>
          {audioError ? <div className="cf-err">{audioError}</div> : null}
          <figcaption className="hint2">
            #{anim.effectSprite} · {frames.length} 帧 · 实速 {((anim.speed ?? 0) + 5) * 10}ms/帧
          </figcaption>
        </>
      )}
    </figure>
  )
}
