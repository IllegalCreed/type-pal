import type { AssetId, AssetKind } from '@type-pal/content'
import { createMidiPreviewTransport } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createWavPreviewTransport } from '../core/audio-preview.js'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  isEditorAudioPreviewOwner,
  releaseEditorAudioPreview,
} from '../core/audio-preview-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsIconButton } from './design-system/index.js'

export type PreviewableProjectAudioKind = Extract<AssetKind, 'music' | 'sound'>

export interface ProjectAudioPreviewTransport {
  load(asset: AssetId, cacheKey?: string): Promise<unknown>
  play(): Promise<void>
  stop(): void
  snapshot(): { paused: boolean }
  dispose(): void
}

export type ProjectAudioPreviewTransportFactory = (
  kind: PreviewableProjectAudioKind,
  reader: EditorAssetReader,
) => ProjectAudioPreviewTransport

export const createProjectAudioPreviewTransport: ProjectAudioPreviewTransportFactory = (
  kind,
  reader,
) => (kind === 'music' ? createMidiPreviewTransport(reader) : createWavPreviewTransport(reader))

export function ProjectAudioPreviewButton(props: {
  asset: AssetId
  label: string
  kind: PreviewableProjectAudioKind
  cacheKey: string
  reader: EditorAssetReader
  createTransport?: ProjectAudioPreviewTransportFactory
}) {
  const createTransport = props.createTransport ?? createProjectAudioPreviewTransport
  const transport = useMemo(
    () => createTransport(props.kind, props.reader),
    [createTransport, props.kind, props.reader],
  )
  const transportLifecycleRef = useRef<
    { transport: ProjectAudioPreviewTransport; token: object } | undefined
  >(undefined)
  const requestRef = useRef(0)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [error, setError] = useState('')
  const owner = useMemo<EditorAudioPreviewOwner>(
    () => ({
      stop() {
        requestRef.current++
        transport.stop()
        setState('idle')
      },
    }),
    [transport],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: asset/cache identity changes must invalidate a stable kind/reader transport.
  useEffect(() => {
    requestRef.current++
    transport.stop()
    releaseEditorAudioPreview(owner)
    setState('idle')
    setError('')
  }, [owner, props.asset, props.cacheKey, transport])

  useEffect(() => {
    const previous = transportLifecycleRef.current
    if (previous && previous.transport !== transport) previous.transport.dispose()
    const token = {}
    transportLifecycleRef.current = { transport, token }
    return () => {
      requestRef.current++
      releaseEditorAudioPreview(owner)
      queueMicrotask(() => {
        if (transportLifecycleRef.current?.token !== token) return
        transport.dispose()
        transportLifecycleRef.current = undefined
      })
    }
  }, [owner, transport])

  useEffect(() => {
    if (state !== 'playing') return
    const timer = window.setInterval(() => {
      if (!isEditorAudioPreviewOwner(owner) || !transport.snapshot().paused) return
      requestRef.current++
      releaseEditorAudioPreview(owner)
      setState('idle')
    }, 100)
    return () => window.clearInterval(timer)
  }, [owner, state, transport])

  const stop = (): void => {
    owner.stop()
    releaseEditorAudioPreview(owner)
  }
  const play = (): void => {
    const request = ++requestRef.current
    setError('')
    claimEditorAudioPreview(owner)
    setState('loading')
    void transport
      .load(props.asset, props.cacheKey)
      .then(async () => {
        if (request !== requestRef.current || !isEditorAudioPreviewOwner(owner)) return
        await transport.play()
        if (request !== requestRef.current || !isEditorAudioPreviewOwner(owner)) return
        setState('playing')
      })
      .catch((cause: unknown) => {
        if (request !== requestRef.current) return
        releaseEditorAudioPreview(owner)
        transport.stop()
        setState('error')
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }

  const active = state === 'loading' || state === 'playing'
  return (
    <span className="project-audio-preview">
      <DsIconButton
        variant="secondary"
        icon={active ? 'stop' : 'play'}
        label={active ? `停止试听 ${props.label}` : `试听 ${props.label}`}
        aria-pressed={active}
        aria-busy={state === 'loading' || undefined}
        onClick={active ? stop : play}
      />
      {error ? (
        <span className="project-role-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}
