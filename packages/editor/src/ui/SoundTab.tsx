/** A7-1 音效资源工作台：WAV catalog CRUD、typed 引用保护与单项 await 试听。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  groupAssetReferencesBySite,
  validateAssetReferenceClosure,
} from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import { SoundPreviewButton, soundAssets } from './SoundPicker.js'

const ORIGIN_LABELS: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
  'legacy-migrated': '原版迁移',
  authored: '工程创作',
  generated: '生成资源',
  licensed: '授权资源',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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

function ReplaceSoundButton(props: { assetId: AssetId; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        className="music-action-button music-replace-button"
        title={`替换 ${props.assetId}，保持引用不变`}
        aria-label={`替换 ${props.assetId}，保持引用不变`}
        onClick={(event) => {
          event.stopPropagation()
          inputRef.current?.click()
        }}
      >
        <span aria-hidden="true">↺</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".wav,audio/wav"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) props.onFile(file)
          event.target.value = ''
        }}
      />
    </>
  )
}

export function SoundTab(props: {
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
}) {
  const { catalog, reader, session, tabBar, focusObjectId, onObjectFocus } = props
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const entries = useMemo(() => soundAssets(catalog), [catalog])
  const state = session.getState()
  const allReferences = useMemo(() => collectEditorAssetReferences(state), [state])
  const references = useMemo(() => {
    const byAsset = new Map<AssetId, ReturnType<typeof groupAssetReferencesBySite>>()
    for (const reference of groupAssetReferencesBySite(allReferences)) {
      const list = byAsset.get(reference.asset) ?? []
      list.push(reference)
      byAsset.set(reference.asset, list)
    }
    return byAsset
  }, [allReferences])
  const closureIssues = useMemo(
    () => validateAssetReferenceClosure(catalog, allReferences),
    [allReferences, catalog],
  )
  const shown = entries.filter(
    (entry) =>
      !filter ||
      entry.id.toLowerCase().includes(filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(filter.toLowerCase()),
  )
  const [selectedId, setSelectedId] = useState<AssetId | null>(
    focusObjectId ?? entries[0]?.id ?? null,
  )
  useEffect(() => {
    if (focusObjectId && entries.some((entry) => entry.id === focusObjectId))
      setSelectedId(focusObjectId)
  }, [entries, focusObjectId])
  useEffect(() => {
    if (selectedId && !entries.some((entry) => entry.id === selectedId))
      setSelectedId(entries[0]?.id ?? null)
  }, [entries, selectedId])
  const selected = entries.find((entry) => entry.id === selectedId) ?? shown[0] ?? entries[0]
  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedIssues = selected
    ? closureIssues.filter((issue) => issue.message.includes(`"${selected.id}"`))
    : []

  const importFile = async (file: File, replaceId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = replaceId ? catalog.assets[replaceId] : undefined
      const previousBytes = replaceId ? await reader.readBytes(replaceId, 'sound') : undefined
      const prepared = await authoredWaveRecord(file, previous?.label)
      const id = replaceId ?? authoredSoundId(prepared.hash)
      session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, previousBytes))
      setSelectedId(id)
      onObjectFocus?.(id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">音效</span>
          <span className="spacer" />
          <span className="k">{shown.length} 项</span>
        </div>
        <div className="music-library-tools">
          <button
            type="button"
            className="music-import-button"
            onClick={() => importRef.current?.click()}
          >
            <span className="music-import-icon" aria-hidden="true" />
            导入 WAV
          </button>
          <div className="music-search-field">
            <span className="music-search-icon" aria-hidden="true" />
            <input
              className="in"
              aria-label="搜索音效"
              placeholder="搜索名称或 AssetId"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          {error ? <div className="cf-err">{error}</div> : null}
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".wav,audio/wav"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          {!entries.length ? (
            <div className="insp-empty">工程中还没有音效资源。</div>
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
                    <tr
                      key={id}
                      className={selected?.id === id ? 'selected' : undefined}
                      onClick={() => {
                        setSelectedId(id)
                        onObjectFocus?.(id)
                      }}
                    >
                      <td>
                        <NameCell assetId={id} label={record.label} session={session} />
                      </td>
                      <td className="mono">{id}</td>
                      <td className="mono" title={record.path}>
                        {record.path}
                      </td>
                      <td>
                        <div className="music-actions">
                          <SoundPreviewButton asset={id} reader={reader} />
                          <ReplaceSoundButton
                            assetId={id}
                            onFile={(file) => void importFile(file, id)}
                          />
                          <button
                            type="button"
                            className="music-action-button music-delete-button"
                            title={
                              usedAt.length ? `有 ${usedAt.length} 处引用，不能删除` : `删除 ${id}`
                            }
                            aria-label={`删除 ${id}`}
                            disabled={usedAt.length > 0}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (!window.confirm(`确认删除未被引用的音效 ${id}？`)) return
                              void reader
                                .readBytes(id, 'sound')
                                .then((previousBytes) =>
                                  session.dispatch(new DeleteAssetCommand(id, previousBytes)),
                                )
                                .catch((cause: unknown) =>
                                  setError(cause instanceof Error ? cause.message : String(cause)),
                                )
                            }}
                          >
                            <span className="music-delete-icon" aria-hidden="true" />
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
      <div className="inspector music-inspector">
        {selected ? (
          <>
            <div className="insp-head">
              <div className="what">选中音效</div>
              <div className="who">{selected.record.label || '未命名'}</div>
            </div>
            <div className="section">
              <h4>资源</h4>
              <div className="music-meta-row">
                <span>AssetId</span>
                <code>{selected.id}</code>
              </div>
              <div className="music-meta-row">
                <span>文件</span>
                <code>{selected.record.path}</code>
              </div>
              <div className="music-meta-row">
                <span>来源</span>
                <strong>{ORIGIN_LABELS[selected.record.origin.kind]}</strong>
              </div>
              <div className="music-meta-row">
                <span>大小</span>
                <strong>{formatBytes(selected.record.bytes)}</strong>
              </div>
            </div>
            <div className="section music-reference-section">
              <h4>
                引用 <span className="hint2">{selectedReferences.length} 处</span>
              </h4>
              {selectedReferences.length ? (
                <div className="music-reference-list">
                  {selectedReferences.map((reference) => (
                    <div
                      className="music-reference-item"
                      key={`${reference.site}:${reference.asset}`}
                    >
                      <strong>{reference.site}</strong>
                      <span>{reference.occurrences} 次</span>
                      <code title={reference.where}>{reference.where}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="music-reference-empty">当前工程没有引用这个音效。</div>
              )}
              {selectedIssues.map((issue) => (
                <div className="cf-err" key={`${issue.code}:${issue.where}`}>
                  {issue.message}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="insp-empty">选择一个音效查看资源与引用。</div>
        )}
      </div>
    </>
  )
}
