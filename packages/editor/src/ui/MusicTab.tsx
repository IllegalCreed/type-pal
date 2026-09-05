import { type AssetCatalogV1, type AssetId, type AssetRecordV1 } from '@type-pal/content'
import { createMidiPreviewTransport } from '@type-pal/reforge'
import type { EditorAssetDiagnostic } from '../core/asset-diagnostics.js'
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

export function assertMidi(file: Pick<File, 'name'>, bytes: ArrayBuffer): void {
  if (!file.name.toLowerCase().endsWith('.mid')) throw new Error('只允许导入 .mid 文件')
  const magic = String.fromCharCode(...new Uint8Array(bytes.slice(0, 4)))
  if (magic !== 'MThd') throw new Error(`不是有效 MIDI 文件（头标记为 ${JSON.stringify(magic)}）`)
}

export function nextMusicId(catalog: AssetCatalogV1, hash: string): AssetId {
  const base = `music.authored.${hash.slice(0, 16)}`
  if (!catalog.assets[base]) return base
  for (let suffix = 2; ; suffix++) {
    const id = `${base}-${suffix}`
    if (!catalog.assets[id]) return id
  }
}

export async function authoredMidiRecord(
  file: File,
  label: string | undefined,
): Promise<{ bytes: ArrayBuffer; hash: string; record: AssetRecordV1 }> {
  const bytes = await file.arrayBuffer()
  assertMidi(file, bytes)
  const hash = await sha256Hex(bytes)
  return {
    bytes,
    hash,
    record: {
      kind: 'music',
      path: `assets/authored/${hash}.mid`,
      mediaType: 'audio/midi',
      bytes: bytes.byteLength,
      sha256: hash,
      label: label || file.name.replace(/\.mid$/i, ''),
      origin: { kind: 'authored', ref: file.name },
    },
  }
}

const MUSIC_STRATEGY: AudioAssetWorkbenchStrategy = {
  kind: 'music',
  title: '音乐',
  unit: '首',
  formatLabel: 'MIDI',
  importLabel: '导入 MIDI',
  accept: '.mid,audio/midi',
  emptyLabel: '项目中还没有音乐资源。',
  prepareImport: authoredMidiRecord,
  allocateId: nextMusicId,
  createTransport: (reader) => asAudioWorkbenchTransport(createMidiPreviewTransport(reader)),
}

export function MusicTab(props: {
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
  return <AudioAssetWorkbench {...props} strategy={MUSIC_STRATEGY} />
}
