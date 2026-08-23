import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type AssetReferenceSite,
} from '@type-pal/content'
import { createMidiPreviewTransport } from '@type-pal/reforge'
import type { EditSession, EditorState } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import {
  asAudioWorkbenchTransport,
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
} from './AudioAssetWorkbench.js'

const ROLE_LABELS: Readonly<Record<string, string>> = {
  'manifest.assets.roles.audio.openingMenuMusic': '标题菜单音乐（新的故事 / 旧的回忆）',
  'manifest.assets.roles.audio.defaultBattleMusic': '默认战斗音乐',
  'manifest.assets.roles.audio.bossVictoryMusic': '特殊战胜利结算音乐',
  'manifest.assets.roles.audio.normalVictoryMusic': '普通战斗胜利音乐',
}

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

function describeMusicReference(
  reference: AssetReferenceSite,
  state: EditorState,
): { title: string; kind: string } {
  const roleLabel = ROLE_LABELS[reference.where]
  if (roleLabel) return { title: roleLabel, kind: '项目清单' }

  const sceneMatch = /^scenes\[(\d+)](.*)$/.exec(reference.where)
  if (sceneMatch) {
    const sceneId = state.scenes[Number(sceneMatch[1])]?.id ?? `#${sceneMatch[1]}`
    const tail = sceneMatch[2] ?? ''
    if (tail === '.music') return { title: `场景 ${sceneId}`, kind: '场景背景音乐' }
    if (tail === '.battleMusic') return { title: `场景 ${sceneId}`, kind: '场景战斗音乐' }
    if (tail.endsWith('.music')) return { title: `场景 ${sceneId}`, kind: '战斗指令音乐' }
    return { title: `场景 ${sceneId}`, kind: '脚本播放音乐' }
  }

  const chunkMatch = /^scriptChunks\[(\d+)](.*)$/.exec(reference.where)
  if (chunkMatch) {
    const chunkId = Object.keys(state.scriptChunks)[Number(chunkMatch[1])] ?? `#${chunkMatch[1]}`
    return {
      title: `脚本块 ${chunkId}`,
      kind: reference.where.endsWith('.music') ? '战斗指令音乐' : '脚本播放音乐',
    }
  }

  const enemyMatch = /^enemies\[(\d+)]/.exec(reference.where)
  if (enemyMatch) {
    const enemyId = state.enemies?.[Number(enemyMatch[1])]?.id ?? `#${enemyMatch[1]}`
    return { title: `敌人 ${enemyId}`, kind: '敌人演出音乐' }
  }
  return { title: reference.site, kind: '音乐引用' }
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
  describeReference: describeMusicReference,
}

export function MusicTab(props: {
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
  currentAuthor?: ScriptEditorState
  getCurrentAuthor?: () => ScriptEditorState | undefined
}) {
  return <AudioAssetWorkbench {...props} strategy={MUSIC_STRATEGY} />
}
