import type { AssetId } from '@type-pal/content'
import { type AudioAssetReader, createBgmPlayer } from '@type-pal/reforge'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  releaseEditorAudioPreview,
} from './audio-preview-session.js'

let preview:
  | {
      reader: AudioAssetReader
      player: ReturnType<typeof createBgmPlayer>
    }
  | undefined
let playingAsset: AssetId | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function stopMusicPreview(): void {
  preview?.player.stop()
  playingAsset = null
  notify()
}

const musicPreviewOwner: EditorAudioPreviewOwner = { stop: stopMusicPreview }

function stopPreview(): void {
  stopMusicPreview()
  releaseEditorAudioPreview(musicPreviewOwner)
}

/** Project replacement ends the worklet and context, including any pending initialization. */
export async function disposeMusicPreview(reader?: AudioAssetReader): Promise<void> {
  const current = preview
  if (!current || (reader && current.reader !== reader)) return
  preview = undefined
  playingAsset = null
  releaseEditorAudioPreview(musicPreviewOwner)
  notify()
  try {
    await current.player.dispose()
  } catch (cause) {
    console.error('关闭音乐试听失败', cause)
  }
}

export function toggleMusicPreview(reader: AudioAssetReader, asset: AssetId): void {
  if (preview?.reader === reader && playingAsset === asset) {
    stopPreview()
    return
  }
  if (preview?.reader !== reader) {
    void disposeMusicPreview()
    preview = { reader, player: createBgmPlayer(reader) }
  }
  claimEditorAudioPreview(musicPreviewOwner)
  try {
    preview.player.play(asset, true)
  } catch (error) {
    releaseEditorAudioPreview(musicPreviewOwner)
    throw error
  }
  playingAsset = asset
  notify()
}

export function subscribeMusicPreview(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function playingMusicFor(reader: AudioAssetReader): AssetId | null {
  return preview?.reader === reader ? playingAsset : null
}
