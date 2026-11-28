import type { AssetId } from '@type-pal/content'
import { useEffect, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { mp4HasAudioTrack } from '../core/video-metadata.js'

export interface VideoMetadata {
  width: number
  height: number
  duration: number
  audio: 'yes' | 'no' | 'unknown'
}

export function VideoAssetPreview(props: {
  assetId: AssetId
  mediaType: string
  reader: Pick<EditorAssetReader, 'readBytes'>
  onMetadata(metadata?: VideoMetadata): void
}) {
  const { assetId, mediaType, reader, onMetadata } = props
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [containerAudio, setContainerAudio] = useState<'yes' | 'no' | 'unknown'>('unknown')
  useEffect(() => {
    let alive = true
    let objectUrl = ''
    setUrl('')
    setError('')
    setContainerAudio('unknown')
    onMetadata(undefined)
    void (async () => {
      const bytes = await reader.readBytes(assetId, 'video')
      if (!alive) return
      const parsedAudio = mp4HasAudioTrack(new Uint8Array(bytes))
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mediaType }))
      setContainerAudio(parsedAudio === true ? 'yes' : parsedAudio === false ? 'no' : 'unknown')
      setUrl(objectUrl)
    })().catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId, mediaType, onMetadata, reader])

  return (
    <div className="cutscene-video-workspace">
      <div className="cutscene-video-stage">
        {url ? (
          // biome-ignore lint/a11y/useMediaCaption: 这是作者素材原样预览，字幕由剧情脚本而非视频资产承载。
          <video
            key={url}
            src={url}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const element: HTMLVideoElement & {
                audioTracks?: { length: number }
                mozHasAudio?: boolean
                webkitAudioDecodedByteCount?: number
              } = event.currentTarget
              const audio = element.audioTracks
                ? element.audioTracks.length > 0
                  ? 'yes'
                  : 'no'
                : element.mozHasAudio || (element.webkitAudioDecodedByteCount ?? 0) > 0
                  ? 'yes'
                  : containerAudio
              onMetadata({
                width: element.videoWidth,
                height: element.videoHeight,
                duration: element.duration,
                audio,
              })
            }}
          />
        ) : error ? (
          <div className="cf-err">{error}</div>
        ) : (
          <div className="insp-empty">正在读取视频…</div>
        )}
      </div>
    </div>
  )
}
