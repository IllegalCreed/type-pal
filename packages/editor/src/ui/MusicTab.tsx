/** A7 音乐资源工作台：catalog CRUD、引用保护、MIDI 替换与同 resolver 试听。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type AssetReferenceSite,
  groupAssetReferencesBySite,
} from '@type-pal/content'
import type { AudioAssetReader } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import {
  DsCatalogControls,
  DsInspectorTabs,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
} from './design-system/index.js'
import { musicAssets, PreviewButton } from './MusicPicker.js'

const ROLE_LABELS: Readonly<Record<string, string>> = {
  'manifest.assets.roles.audio.openingMenuMusic': '标题菜单音乐（新的故事 / 旧的回忆）',
  'manifest.assets.roles.audio.defaultBattleMusic': '默认战斗音乐',
  'manifest.assets.roles.audio.bossVictoryMusic': '特殊战胜利结算音乐',
  'manifest.assets.roles.audio.normalVictoryMusic': '普通战斗胜利音乐',
}

const ORIGIN_LABELS: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
  'legacy-migrated': '原版迁移',
  authored: '工程创作',
  generated: '生成资源',
  licensed: '授权资源',
}

type MusicInspectorTab = 'resource' | 'references'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
}) {
  const { catalog, resolver, session, tabBar, focusObjectId, onObjectFocus } = props
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [inspectorTab, setInspectorTab] = useState<MusicInspectorTab>('resource')
  const importRef = useRef<HTMLInputElement>(null)
  const entries = useMemo(() => musicAssets(catalog), [catalog])
  const state = session.getState()
  const references = useMemo(() => {
    const byAsset = new Map<AssetId, AssetReferenceSite[]>()
    for (const reference of groupAssetReferencesBySite(collectEditorAssetReferences(state))) {
      const list = byAsset.get(reference.asset) ?? []
      list.push(reference)
      byAsset.set(reference.asset, list)
    }
    return byAsset
  }, [state])
  const shown = entries.filter(
    (entry) =>
      !filter ||
      entry.id.toLowerCase().includes(filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(filter.toLowerCase()),
  )
  const [selectedId, setSelectedId] = useState<AssetId | null>(
    focusObjectId && entries.some((entry) => entry.id === focusObjectId)
      ? focusObjectId
      : (entries[0]?.id ?? null),
  )
  useEffect(() => {
    if (focusObjectId && entries.some((entry) => entry.id === focusObjectId))
      setSelectedId(focusObjectId)
  }, [entries, focusObjectId])
  const selected = entries.find((entry) => entry.id === selectedId) ?? shown[0] ?? entries[0]
  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedReferenceCount = selectedReferences.reduce(
    (total, reference) => total + reference.occurrences,
    0,
  )
  const scriptChunkIds = Object.keys(state.scriptChunks)

  const describeReference = (where: string): { kind: string; owner: string } => {
    const roleLabel = ROLE_LABELS[where]
    if (roleLabel) return { kind: roleLabel, owner: '工程清单' }

    const sceneMatch = /^scenes\[(\d+)](.*)$/.exec(where)
    if (sceneMatch) {
      const sceneId = state.scenes[Number(sceneMatch[1])]?.id ?? `#${sceneMatch[1]}`
      const tail = sceneMatch[2] ?? ''
      if (tail === '.music') return { kind: '场景背景音乐', owner: `场景 ${sceneId}` }
      if (tail === '.battleMusic') return { kind: '场景战斗音乐', owner: `场景 ${sceneId}` }
      if (tail.endsWith('.music')) return { kind: '战斗指令音乐', owner: `场景 ${sceneId}` }
      return { kind: '脚本播放音乐', owner: `场景 ${sceneId}` }
    }

    const chunkMatch = /^scriptChunks\[(\d+)](.*)$/.exec(where)
    if (chunkMatch) {
      const chunkId = scriptChunkIds[Number(chunkMatch[1])] ?? `#${chunkMatch[1]}`
      return {
        kind: where.endsWith('.music') ? '战斗指令音乐' : '脚本播放音乐',
        owner: `脚本块 ${chunkId}`,
      }
    }

    const enemyMatch = /^enemies\[(\d+)](.*)$/.exec(where)
    if (enemyMatch) {
      const enemyId = state.enemies?.[Number(enemyMatch[1])]?.id ?? `#${enemyMatch[1]}`
      return { kind: '敌人演出音乐', owner: `敌人 ${enemyId}` }
    }

    return { kind: '音乐引用', owner: where }
  }

  const importFile = async (file: File, replaceId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = replaceId ? catalog.assets[replaceId] : undefined
      const previousBytes = replaceId ? await resolver.readBytes(replaceId) : undefined
      const prepared = await authoredMidiRecord(file, previous?.label)
      const id = replaceId ?? nextMusicId(catalog, prepared.record.sha256)
      session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, previousBytes))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <DsCatalogControls
          title="音乐"
          count={shown.length}
          unit="首"
          actions={[
            {
              id: 'import-music',
              label: '导入 MIDI',
              icon: 'add',
              onClick: () => importRef.current?.click(),
            },
          ]}
          search={{
            'aria-label': '搜索音乐',
            placeholder: '搜索名称或 AssetId',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        {error ? <div className="cf-err">{error}</div> : null}
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
                          <PreviewButton asset={id} resolver={resolver} />
                          <label
                            className="music-action-button music-replace-button"
                            title={`替换 ${id} 的 MIDI，保持引用不变`}
                          >
                            <span aria-hidden="true">↺</span>
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
                            className="music-action-button music-delete-button"
                            title={
                              usedAt.length ? `有 ${usedAt.length} 处引用，不能删除` : `删除 ${id}`
                            }
                            aria-label={`删除 ${id}`}
                            disabled={usedAt.length > 0}
                            onClick={() => {
                              if (!window.confirm(`确认删除未被引用的音乐 ${id}？`)) return
                              void resolver
                                .readBytes(id)
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
      <div className="inspector inspector--tabbed music-inspector">
        {selected ? (
          <>
            <div className="insp-head">
              <div className="what">选中音乐</div>
              <div className="who">{selected.record.label || '未命名'}</div>
            </div>
            <DsInspectorTabs
              id="music-inspector"
              label="音乐检查器"
              activeId={inspectorTab}
              onChange={(id) => setInspectorTab(id as MusicInspectorTab)}
              items={[
                {
                  id: 'resource',
                  label: '资源',
                  panel: (
                    <div className="section">
                      <h4>资源信息</h4>
                      <div className="music-meta-row">
                        <span>AssetId</span>
                        <code title={selected.id}>{selected.id}</code>
                      </div>
                      <div className="music-meta-row">
                        <span>文件</span>
                        <code title={selected.record.path}>{selected.record.path}</code>
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
                  ),
                },
                {
                  id: 'references',
                  label: '引用',
                  count: selectedReferenceCount,
                  panel: (
                    <div className="section asset-reference-section">
                      <DsReferencePanel
                        state={selectedReferenceCount ? 'ready' : 'empty'}
                        count={{ kind: 'exact', value: selectedReferenceCount }}
                        impact={{
                          kind: 'blocking',
                          description: selectedReferenceCount
                            ? '替换音乐会保留这些引用；解除全部引用后才能删除。'
                            : '当前工程没有引用这首音乐。',
                        }}
                      >
                        {selectedReferences.length ? (
                          <DsReferenceList>
                            {selectedReferences.map((reference) => {
                              const description = describeReference(reference.where)
                              return (
                                <DsReferenceRow
                                  key={`${reference.site}:${reference.where}`}
                                  title={description.owner}
                                  path={reference.where}
                                  labels={[{ label: description.kind }]}
                                  occurrenceCount={reference.occurrences}
                                  status={{
                                    label: '只读',
                                    reason: '音乐引用暂不支持从资源页精确定位。',
                                  }}
                                />
                              )
                            })}
                          </DsReferenceList>
                        ) : null}
                      </DsReferencePanel>
                    </div>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className="insp-empty">选择一首音乐查看资源与引用。</div>
        )}
      </div>
    </>
  )
}
