import type { AssetId } from '@type-pal/content'
import { SfxPlayer } from '@type-pal/reforge'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  isEditorAudioPreviewOwner,
  releaseEditorAudioPreview,
  stopEditorAudioPreview,
} from './audio-preview-session.js'
import type { EditorAssetReader } from './editor-asset-reader.js'

interface SoundPreviewSession {
  reader: EditorAssetReader
  player: SfxPlayer
  fingerprints: Map<AssetId, string>
}

let preview: SoundPreviewSession | undefined
let previewRequest = 0
const soundPreviewOwner: EditorAudioPreviewOwner = {
  stop() {
    previewRequest++
    void disposeSoundPlayer().catch(reportDisposalFailure)
  },
}

function reportDisposalFailure(cause: unknown): void {
  console.error('关闭音效试听失败', cause)
}

async function disposeSoundPlayer(): Promise<void> {
  const current = preview
  preview = undefined
  await current?.player.dispose()
}

async function sessionFor(reader: EditorAssetReader): Promise<SoundPreviewSession> {
  const current = preview
  if (current?.reader === reader) return current
  const next = { reader, player: new SfxPlayer(reader), fingerprints: new Map<AssetId, string>() }
  preview = next
  await current?.player.dispose()
  return next
}

function assertCurrentPreview(current: SoundPreviewSession): void {
  if (preview !== current) throw new DOMException('音效试听选择已变化', 'AbortError')
}

export async function prepareSoundPreview(
  reader: EditorAssetReader,
  asset: AssetId,
): Promise<SfxPlayer> {
  const record = reader.record(asset, 'sound')
  const current = await sessionFor(reader)
  assertCurrentPreview(current)
  const { player, fingerprints } = current
  const previous = fingerprints.get(asset)
  if (previous !== undefined && previous !== record.sha256) player.invalidate(asset)
  fingerprints.set(asset, record.sha256)
  await player.resume()
  assertCurrentPreview(current)
  await player.prepare([asset])
  assertCurrentPreview(current)
  return player
}

export async function previewSound(reader: EditorAssetReader, asset: AssetId): Promise<void> {
  // SfxPlayer 允许多个 active source；同一个 picker owner 重新 claim 不会自动 stop。
  // 因此每次新试听都先结束全局旧 owner，并用 request 隔离仍在 prepare 的旧资源。
  stopEditorAudioPreview()
  const request = ++previewRequest
  claimEditorAudioPreview(soundPreviewOwner)
  try {
    const player = await prepareSoundPreview(reader, asset)
    if (request !== previewRequest || !isEditorAudioPreviewOwner(soundPreviewOwner)) return
    player.play(asset)
  } catch (error) {
    if (request !== previewRequest || !isEditorAudioPreviewOwner(soundPreviewOwner)) return
    releaseEditorAudioPreview(soundPreviewOwner)
    throw error
  }
}

export async function disposeSoundPreview(reader?: EditorAssetReader): Promise<void> {
  if (reader && preview?.reader !== reader) return
  previewRequest++
  releaseEditorAudioPreview(soundPreviewOwner)
  await disposeSoundPlayer().catch(reportDisposalFailure)
}
