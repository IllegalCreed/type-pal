import type { AssetId } from '@type-pal/content'
import { SfxPlayer } from '@type-pal/reforge'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  releaseEditorAudioPreview,
} from '../core/audio-preview-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'

interface PreviewSelection {
  reader: EditorAssetReader
  sound?: AssetId
  canPlay: boolean
}

interface PlaybackRequest extends EditorAudioPreviewOwner {
  selection: PreviewSelection
  player?: SfxPlayer
}

/** The selection object changes when the editor switches animation or resource versions. */
export function useFirePreviewPlayback(selection: PreviewSelection) {
  const active = useRef<PlaybackRequest | undefined>(undefined)
  const [status, setStatus] = useState<{ request: PlaybackRequest; ready: boolean }>()
  const [error, setError] = useState<{ selection: PreviewSelection; message: string }>()

  const disposeActive = useCallback(() => {
    const request = active.current
    active.current = undefined
    if (!request) return
    releaseEditorAudioPreview(request)
    void request.player?.dispose().catch((cause: unknown) => {
      console.error('关闭法术预览音效失败', cause)
    })
  }, [])

  // Invalidate before a committed change of selection can display a previous playback request.
  useLayoutEffect(
    () => () => {
      if (active.current?.selection === selection) disposeActive()
    },
    [disposeActive, selection],
  )

  const stop = useCallback(() => {
    disposeActive()
    setStatus(undefined)
  }, [disposeActive])
  const fail = useCallback(
    (cause: unknown) => {
      stop()
      setError({ selection, message: cause instanceof Error ? cause.message : String(cause) })
    },
    [selection, stop],
  )

  async function toggle(): Promise<void> {
    if (active.current) {
      stop()
      return
    }
    if (!selection.canPlay) return

    setError(undefined)
    const { reader, sound } = selection
    let request: PlaybackRequest | undefined
    try {
      if (sound) reader.record(sound, 'sound')
      const player = sound ? new SfxPlayer(reader) : undefined
      const next: PlaybackRequest = {
        selection,
        player,
        stop: () => {
          if (active.current === next) stop()
        },
      }
      request = next
      active.current = next
      setStatus({ request: next, ready: !player })
      if (player && sound) {
        claimEditorAudioPreview(next)
        await player.resume()
        if (active.current !== next) return
        await player.prepare([sound])
        if (active.current === next) setStatus({ request: next, ready: true })
      }
    } catch (cause) {
      if (!request || active.current === request) fail(cause)
    }
  }

  const current = status?.request.selection === selection ? status : undefined
  return {
    active: Boolean(current),
    playing: current?.ready === true,
    player: current?.request.player,
    error: error?.selection === selection ? error.message : '',
    toggle,
    fail,
  }
}
