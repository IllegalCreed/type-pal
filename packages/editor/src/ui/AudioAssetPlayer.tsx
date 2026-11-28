import type { AssetId } from '@type-pal/content'
import type { MidiNoteActivity } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioPreviewCache } from '../core/audio-preview-cache.js'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  releaseEditorAudioPreview,
} from '../core/audio-preview-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { PcmPeaks } from '../core/pcm-preview-peaks.js'
import { DsIconButton, DsRangeInput, DsStatus, DsTag } from './design-system/index.js'
import { useOwnedAudioTransport } from './use-owned-audio-transport.js'

export type AudioTimeline = MidiNoteActivity | PcmPeaks

export interface AudioWorkbenchTransport {
  load(asset: AssetId, cacheKey?: string, cachedTimeline?: AudioTimeline): Promise<AudioTimeline>
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(seconds: number): void
  snapshot(): { currentTime: number; duration: number; paused: boolean }
  dispose(): void
}

function formatTime(seconds: number, showSubseconds = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  if (showSubseconds) {
    const hundredths = Math.round(safe * 100)
    const minutes = Math.floor(hundredths / 6000)
    const remainder = (hundredths % 6000) / 100
    return `${minutes}:${remainder.toFixed(2).padStart(5, '0')}`
  }
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${Math.floor(safe % 60)
    .toString()
    .padStart(2, '0')}`
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

function AudioTimelineGraphic(props: { timeline?: AudioTimeline; progress: number }) {
  const timeline = props.timeline
  if (!timeline) return <div className="audio-timeline__empty">选择资源后读取时间轴。</div>
  const progressX = Math.max(0, Math.min(1, props.progress)) * 160
  return (
    <div className="audio-timeline__graphic">
      <svg viewBox="0 0 160 64" preserveAspectRatio="none" aria-hidden="true">
        {timeline.kind === 'note-activity'
          ? timeline.buckets.map((value, index) => (
              <rect
                key={index}
                x={(index / timeline.buckets.length) * 160}
                y={32 - value * 28}
                width={Math.max(0.5, 160 / timeline.buckets.length - 0.25)}
                height={value * 56}
                rx="0.25"
              />
            ))
          : timeline.maximums.map((maximum, index) => {
              const minimum = timeline.minimums[index] ?? 0
              const y1 = 32 - maximum * 28
              const y2 = 32 - minimum * 28
              return (
                <line
                  key={index}
                  x1={(index / timeline.maximums.length) * 160}
                  x2={(index / timeline.maximums.length) * 160}
                  y1={y1}
                  y2={y2}
                />
              )
            })}
        <line className="audio-timeline__progress" x1={progressX} x2={progressX} y1="0" y2="64" />
      </svg>
      <DsTag tone="neutral">{timeline.kind === 'note-activity' ? '音符活动' : 'PCM 波形'}</DsTag>
    </div>
  )
}

export function AudioAssetPlayer(props: {
  assetId: AssetId
  sha256: string
  reader: EditorAssetReader
  kind: 'music' | 'sound'
  title: string
  createTransport(reader: EditorAssetReader): AudioWorkbenchTransport
}) {
  const transport = useMemo(
    () => props.createTransport(props.reader),
    [props.createTransport, props.reader],
  )
  const generationRef = useRef(0)
  const playRequestRef = useRef(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: each project owns an isolated decoded-analysis cache.
  const analysisCache = useMemo(
    () => new AudioPreviewCache<AudioTimeline>(16),
    [props.reader.projectId],
  )
  const [timeline, setTimeline] = useState<AudioTimeline>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [clock, setClock] = useState({ currentTime: 0, duration: 0, paused: true })
  const previewOwner = useMemo<EditorAudioPreviewOwner>(
    () => ({
      stop() {
        playRequestRef.current++
        transport.stop()
        setPlaying(false)
        setClock(transport.snapshot())
      },
    }),
    [transport],
  )
  const identity = `${props.reader.projectId}\0${props.assetId}\0${props.sha256}`

  useEffect(() => {
    const generation = ++generationRef.current
    playRequestRef.current++
    releaseEditorAudioPreview(previewOwner)
    transport.stop()
    setPlaying(false)
    setClock({ currentTime: 0, duration: 0, paused: true })
    const cached = analysisCache.get(identity)
    setTimeline(cached)
    setStatus('loading')
    setError('')
    const load = (retryCanceledInflight: boolean): void => {
      const cachedTimeline = analysisCache.get(identity)
      const loading = cachedTimeline
        ? transport.load(props.assetId, identity, cachedTimeline)
        : analysisCache.load(identity, () => transport.load(props.assetId, identity))
      void loading
        .then((result) => {
          if (generation !== generationRef.current) return
          setTimeline(result)
          setClock(transport.snapshot())
          setStatus('ready')
        })
        .catch((cause: unknown) => {
          if (generation !== generationRef.current) return
          if (isAbortError(cause) && retryCanceledInflight) {
            load(false)
            return
          }
          if (isAbortError(cause)) return
          setStatus('error')
          setError(cause instanceof Error ? cause.message : String(cause))
        })
    }
    load(true)
    return () => {
      generationRef.current++
      playRequestRef.current++
      releaseEditorAudioPreview(previewOwner)
      transport.stop()
    }
  }, [analysisCache, identity, previewOwner, props.assetId, transport])

  useOwnedAudioTransport(transport)
  useEffect(() => () => analysisCache.clear(), [analysisCache])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const updateClock = () => {
      if (document.visibilityState === 'hidden') {
        frame = 0
        return
      }
      const next = transport.snapshot()
      setClock(next)
      if (next.paused) {
        setPlaying(false)
        releaseEditorAudioPreview(previewOwner)
        return
      }
      frame = window.requestAnimationFrame(updateClock)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
        return
      }
      if (!frame) frame = window.requestAnimationFrame(updateClock)
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [playing, previewOwner, transport])

  const seek = (value: number): void => {
    playRequestRef.current++
    transport.seek(value)
    setClock(transport.snapshot())
  }

  const duration = timeline?.duration ?? clock.duration
  const progress = duration > 0 ? Math.max(0, Math.min(1, clock.currentTime / duration)) : 0
  const showSubseconds = duration > 0 && duration < 1
  return (
    <div className="audio-player" data-audio-kind={props.kind}>
      <AudioTimelineGraphic timeline={timeline} progress={progress} />
      <DsRangeInput
        className="audio-timeline__range"
        type="range"
        aria-label={`${props.title}试听进度`}
        aria-valuetext={`${formatTime(clock.currentTime, showSubseconds)} / ${formatTime(duration, showSubseconds)}`}
        min={0}
        max={1}
        step={0.001}
        value={progress}
        disabled={status !== 'ready' || duration <= 0}
        onChange={(event) => seek(Number(event.target.value) * duration)}
      />
      <div className="audio-player__transport">
        <DsIconButton
          icon={playing ? 'pause' : 'play'}
          label={playing ? '暂停' : '播放'}
          variant="secondary"
          disabled={status !== 'ready'}
          onClick={() => {
            if (playing) {
              playRequestRef.current++
              transport.pause()
              setPlaying(false)
              setClock(transport.snapshot())
              releaseEditorAudioPreview(previewOwner)
              return
            }
            setError('')
            const request = ++playRequestRef.current
            claimEditorAudioPreview(previewOwner)
            void transport
              .play()
              .then(() => {
                if (request !== playRequestRef.current) return
                setPlaying(true)
                setClock(transport.snapshot())
              })
              .catch((cause: unknown) => {
                if (request !== playRequestRef.current || isAbortError(cause)) return
                releaseEditorAudioPreview(previewOwner)
                setError(cause instanceof Error ? cause.message : String(cause))
              })
          }}
        />
        <DsIconButton
          icon="stop"
          label="停止"
          variant="secondary"
          disabled={status === 'loading'}
          onClick={() => {
            playRequestRef.current++
            transport.stop()
            setPlaying(false)
            setClock(transport.snapshot())
            releaseEditorAudioPreview(previewOwner)
          }}
        />
        <output className="audio-player__time" aria-live="off">
          {formatTime(clock.currentTime, showSubseconds)} / {formatTime(duration, showSubseconds)}
        </output>
        <span className="audio-player__spacer" />
        <span className="audio-player__state">
          {status === 'loading'
            ? '正在读取…'
            : status === 'error'
              ? '读取失败'
              : playing
                ? '正在播放'
                : '就绪'}
        </span>
      </div>
      {error ? <DsStatus tone="error">{error}</DsStatus> : null}
    </div>
  )
}
