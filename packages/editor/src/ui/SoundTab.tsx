import type { AssetCatalogV1, AssetId, AssetRecordV1 } from '@type-pal/content'
import type { EditorAssetDiagnostic } from '../core/asset-diagnostics.js'
import { createWavPreviewTransport } from '../core/audio-preview.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import {
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
  asAudioWorkbenchTransport,
} from './AudioAssetWorkbench.js'

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function assertWave(file: Pick<File, 'name'>, bytes: ArrayBuffer): void {
  if (!file.name.toLowerCase().endsWith('.wav')) throw new Error('只允许导入 .wav 文件')
  const view = new Uint8Array(bytes)
  const tag = (offset: number): string => String.fromCharCode(...view.subarray(offset, offset + 4))
  if (view.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error('不是有效 WAV 文件（必须同时包含 RIFF 与 WAVE 头）')
}

export async function authoredWaveRecord(
  file: File,
  label: string | undefined,
): Promise<{ bytes: ArrayBuffer; hash: string; record: AssetRecordV1 }> {
  const bytes = await file.arrayBuffer()
  assertWave(file, bytes)
  const hash = await sha256Hex(bytes)
  return {
    bytes,
    hash,
    record: {
      kind: 'sound',
      path: `assets/authored/${hash}.wav`,
      mediaType: 'audio/wav',
      bytes: bytes.byteLength,
      sha256: hash,
      label: label || file.name.replace(/\.wav$/i, ''),
      origin: { kind: 'authored', ref: file.name },
    },
  }
}

export function authoredSoundId(hash: string): AssetId {
  return `sound.authored.${hash.slice(0, 16)}`
}

const SOUND_STRATEGY: AudioAssetWorkbenchStrategy = {
  kind: 'sound',
  title: '音效',
  unit: '项',
  formatLabel: 'WAV',
  importLabel: '导入 WAV',
  accept: '.wav,audio/wav',
  emptyLabel: '项目中还没有音效资源。',
  prepareImport: authoredWaveRecord,
  allocateId: (_catalog, hash) => authoredSoundId(hash),
  createTransport: (reader) => asAudioWorkbenchTransport(createWavPreviewTransport(reader)),
}

export function SoundTab(props: {
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
  assetDiagnostics: readonly EditorAssetDiagnostic[]
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
  onOpenReference?: (reference: ProjectReferenceEdge) => void
}) {
  return <AudioAssetWorkbench {...props} strategy={SOUND_STRATEGY} />
}
