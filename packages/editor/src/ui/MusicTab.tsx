/** A7 音乐资源工作台：catalog CRUD、引用保护、MIDI 替换与同 resolver 试听。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  collectAssetReferences,
} from '@type-pal/content'
import type { AudioAssetReader } from '@type-pal/reforge'
import { useMemo, useRef, useState } from 'react'
import {
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { musicAssets, PreviewButton } from './MusicPicker.js'

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function assertMidi(file: File, bytes: ArrayBuffer): void {
  if (!file.name.toLowerCase().endsWith('.mid')) throw new Error('只允许导入 .mid 文件')
  const magic = String.fromCharCode(...new Uint8Array(bytes.slice(0, 4)))
  if (magic !== 'MThd') throw new Error(`不是有效 MIDI 文件（头标记为 ${JSON.stringify(magic)}）`)
}

function nextMusicId(catalog: AssetCatalogV1, hash: string): AssetId {
  const base = `music.authored.${hash.slice(0, 16)}`
  if (!catalog.assets[base]) return base
  for (let suffix = 2; ; suffix++) {
    const id = `${base}-${suffix}`
    if (!catalog.assets[id]) return id
  }
}

async function authoredMidiRecord(
  file: File,
  label: string | undefined,
): Promise<{ bytes: ArrayBuffer; record: AssetRecordV1 }> {
  const bytes = await file.arrayBuffer()
  assertMidi(file, bytes)
  const hash = await sha256Hex(bytes)
  return {
    bytes,
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

function NameCell(props: { assetId: AssetId; label?: string; session: EditSession }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="in"
      value={draft ?? props.label ?? ''}
      placeholder="未命名"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== (props.label ?? ''))
          props.session.dispatch(new UpdateAssetLabelCommand(props.assetId, draft))
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export function MusicTab(props: {
  catalog: AssetCatalogV1
  resolver: AudioAssetReader
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { catalog, resolver, session, tabBar } = props
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const entries = useMemo(() => musicAssets(catalog), [catalog])
  const state = session.getState()
  const references = useMemo(() => {
    const byAsset = new Map<AssetId, string[]>()
    for (const reference of collectAssetReferences({
      assets: state.manifest.assets,
      scenes: state.scenes,
      scriptChunks: state.scriptChunks,
      enemies: state.enemies,
    })) {
      const list = byAsset.get(reference.asset) ?? []
      list.push(reference.where)
      byAsset.set(reference.asset, list)
    }
    return byAsset
  }, [state.manifest.assets, state.scenes, state.scriptChunks, state.enemies])
  const shown = entries.filter(
    (entry) =>
      !filter ||
      entry.id.toLowerCase().includes(filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(filter.toLowerCase()),
  )

  const importFile = async (file: File, replaceId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = replaceId ? catalog.assets[replaceId] : undefined
      const prepared = await authoredMidiRecord(file, previous?.label)
      const id = replaceId ?? nextMusicId(catalog, prepared.record.sha256)
      session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">音乐</span>
          <span className="spacer" />
          <span className="k">{shown.length} 首</span>
        </div>
        <button type="button" className="btn" onClick={() => importRef.current?.click()}>
          ＋ 导入 MIDI
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".mid,audio/midi"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
        <input
          className="in"
          placeholder="搜索名称或 AssetId"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        {error ? <div className="cf-err">{error}</div> : null}
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          {!entries.length ? (
            <div className="insp-empty">工程中还没有音乐资源。</div>
          ) : (
            <table className="music-table asset-music-table">
              <colgroup>
                <col className="music-name-column" />
                <col className="music-id-column" />
                <col />
                <col className="music-action-column" />
              </colgroup>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>AssetId</th>
                  <th>文件</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ id, record }) => {
                  const usedAt = references.get(id) ?? []
                  return (
                    <tr key={id}>
                      <td>
                        <NameCell assetId={id} label={record.label} session={session} />
                      </td>
                      <td className="mono">{id}</td>
                      <td className="mono" title={record.path}>
                        {record.path}
                      </td>
                      <td>
                        <div className="music-actions">
                          <PreviewButton asset={id} resolver={resolver} />
                          <label className="btn" title={`替换 ${id} 的 MIDI，保持引用不变`}>
                            ↺
                            <input
                              type="file"
                              accept=".mid,audio/midi"
                              hidden
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) void importFile(file, id)
                                event.target.value = ''
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn danger"
                            title={
                              usedAt.length ? `有 ${usedAt.length} 处引用，不能删除` : `删除 ${id}`
                            }
                            aria-label={`删除 ${id}`}
                            disabled={usedAt.length > 0}
                            onClick={() => session.dispatch(new DeleteAssetCommand(id))}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
