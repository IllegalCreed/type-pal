/** Standalone FIRE frames and a repeating cue for the editor's animation controls. */
import {
  type AssetId,
  palMagicEffectSpriteAssetId,
  type SkillAnimation,
  skillAnimationFrameDurationMs,
} from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { bakeFrame, loadFireSprite, loadStandardPalette } from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsButton, DsField, DsSelect } from './design-system/controls.js'
import { useFirePreviewPlayback } from './use-fire-preview-playback.js'

const fireCache = new WeakMap<AssetBase, Map<string, Promise<HTMLCanvasElement[] | null>>>()

function fireRevision(assetBase: AssetBase, chunk: number): string {
  try {
    const resolver = assetBase.assetResolver
    const colorAsset = resolver.assetForRole('visual.standardColorTable')
    return JSON.stringify([
      resolver.record(palMagicEffectSpriteAssetId(chunk), 'effect-sprite'),
      colorAsset,
      resolver.record(colorAsset, 'color-table'),
    ])
  } catch {
    // Missing records remain a normal unavailable preview; a later valid record changes this key.
    return 'unavailable'
  }
}

function loadFrames(
  assetBase: AssetBase,
  chunk: number,
  revision: string,
): Promise<HTMLCanvasElement[] | null> {
  let cache = fireCache.get(assetBase)
  if (!cache) {
    cache = new Map()
    fireCache.set(assetBase, cache)
  }
  const key = `${chunk}\0${revision}`
  let p = cache.get(key)
  if (!p) {
    p = (async () => {
      try {
        const [sprite, palette] = await Promise.all([
          loadFireSprite(assetBase, chunk),
          loadStandardPalette(assetBase),
        ])
        if (!sprite.frames.length) return null
        return sprite.frames.map((frame) => bakeFrame(frame, palette))
      } catch {
        return null
      }
    })().then((frames) => {
      if (frames === null && cache.get(key) === p) cache.delete(key)
      return frames
    })
    cache.set(key, p)
  }
  return p
}

const W = 200
const H = 170
const MAX_BROWSER_INTERVAL_MS = 2_147_483_647

function soundRevision(reader: EditorAssetReader, sound: AssetId | undefined): string | undefined {
  if (!sound) return undefined
  try {
    return reader.record(sound, 'sound').sha256
  } catch {
    // The play action reports the catalog error when the author requests the sound.
    return undefined
  }
}

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
  previewScope?: string
}) {
  const { assetBase, anim, assetReader, previewScope } = props
  const effectSprite = anim.effectSprite
  const revision = fireRevision(assetBase, effectSprite)
  const rateId = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null | 'loading'>('loading')
  const [rate, setRate] = useState(0.5) // 默认半速(编辑时看清帧)
  const frameDurationMs = skillAnimationFrameDurationMs(anim.speed)
  const intervalMs = frameDurationMs / rate
  const loopStart = anim.fireDelay ?? 0
  const timingError =
    !Number.isSafeInteger(loopStart) || loopStart < 0
      ? '循环起点必须为非负整数。'
      : !Number.isFinite(intervalMs) || intervalMs <= 0
        ? '帧时长必须为正的有限数。'
        : intervalMs > MAX_BROWSER_INTERVAL_MS
          ? '当前倍速的帧时长超出浏览器限值。'
          : ''
  const canPlay = timingError === ''
  const sound = anim.sound
  const soundSha = soundRevision(assetReader, sound)
  const selection = useMemo(
    () => ({
      reader: assetReader,
      sound,
      soundSha,
      assetBase,
      effectSprite,
      revision,
      previewScope,
      canPlay,
    }),
    [assetReader, sound, soundSha, assetBase, effectSprite, revision, previewScope, canPlay],
  )
  const {
    active,
    playing,
    player,
    error: audioError,
    toggle,
    fail,
  } = useFirePreviewPlayback(selection)

  useEffect(() => {
    let alive = true
    setFrames('loading')
    void loadFrames(assetBase, effectSprite, revision).then((resolvedFrames) => {
      if (alive) setFrames(resolvedFrames)
    })
    return () => {
      alive = false
    }
  }, [assetBase, effectSprite, revision])

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length || !playing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const n = frames.length
    const fireDelay = Math.min(loopStart, n - 1)
    let index = 0
    let disposed = false
    const tick = (): void => {
      if (disposed) return
      const image = frames[index]
      if (!image) return
      drawPreviewFrame(ctx, image)
      // Cue the sound on the loop-start frame. The player owns any still-playing source.
      if (sound && index === fireDelay) {
        try {
          player?.play(sound)
        } catch (cause) {
          fail(cause)
          return
        }
      }
      index = index + 1 >= n ? fireDelay : index + 1
    }
    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [frames, intervalMs, loopStart, sound, playing, player, fail])

  useEffect(() => {
    if (!Array.isArray(frames) || !frames.length || playing) return
    const context = canvasRef.current?.getContext('2d')
    const firstFrame = frames[0]
    if (context && firstFrame) drawPreviewFrame(context, firstFrame)
  }, [frames, playing])

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
            <span>请修改特效号或检查项目资源。</span>
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
              variant={active ? 'primary' : 'secondary'}
              aria-label={active ? '暂停 FIRE 特效预览' : '播放 FIRE 特效预览'}
              disabled={!canPlay}
              onClick={() => void toggle()}
            >
              {active ? '暂停' : '播放'}
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
          {timingError || audioError ? (
            <div className="cf-err" role="status">
              {timingError || audioError}
            </div>
          ) : null}
          <figcaption className="hint2">
            #{anim.effectSprite} · {frames.length} 帧 · 实速 {frameDurationMs}ms/帧
          </figcaption>
        </>
      )}
    </figure>
  )
}
