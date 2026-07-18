import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  groupAssetReferencesBySite,
  validateAssetReferenceClosure,
} from '@type-pal/content'
import { type AssetBase, loadStandardPalette } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import {
  nextAuthoredImageId,
  type PreparedImageImport,
  prepareAuthoredImage,
} from '../core/image-import.js'
import { STATIC_IMAGE_KINDS, type StaticImageKind } from '../core/static-image.js'
import { ImageAssetThumbnail, imageAssets } from './ImageAssetPicker.js'

const KIND_LABEL: Record<StaticImageKind, string> = {
  portrait: '立绘',
  face: '战斗头像',
  'item-icon': '物品图标',
  'battle-background': '战场背景',
}

const ORIGIN_LABEL: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
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

function EditableName(props: { assetId: AssetId; label?: string; session: EditSession }) {
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

function ImageWorkspacePreview(props: {
  assetId: AssetId
  kind: StaticImageKind
  reader: EditorAssetReader
  assetBase: AssetBase
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  const [size, setSize] = useState('')
  useEffect(() => {
    let alive = true
    setError('')
    setSize('')
    void Promise.all([
      props.reader.readBytes(props.assetId, props.kind),
      props.kind === 'battle-background' ? loadStandardPalette(props.assetBase) : undefined,
    ])
      .then(async ([bytes, palette]) => {
        const record = props.reader.record(props.assetId, props.kind)
        const bitmap = await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
        if (!alive) {
          bitmap.close()
          return
        }
        if (props.kind === 'battle-background' && (bitmap.width !== 320 || bitmap.height !== 200)) {
          bitmap.close()
          throw new Error(`战场背景必须是 320×200，实际 ${bitmap.width}×${bitmap.height}`)
        }
        const canvas = canvasRef.current
        if (!canvas) {
          bitmap.close()
          return
        }
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          bitmap.close()
          throw new Error('浏览器无法创建图片预览画布')
        }
        context.imageSmoothingEnabled = false
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        if (palette) {
          const image = context.getImageData(0, 0, canvas.width, canvas.height)
          for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
            const offset = pixel * 4
            const index = image.data[offset] ?? 0
            if (
              image.data[offset + 1] !== index ||
              image.data[offset + 2] !== index ||
              image.data[offset + 3] !== 255
            )
              throw new Error(`像素 ${pixel} 不是有效的工程战场背景`)
            const color = palette.colors[index] ?? [0, 0, 0]
            image.data[offset] = color[0]
            image.data[offset + 1] = color[1]
            image.data[offset + 2] = color[2]
            image.data[offset + 3] = 255
          }
          context.putImageData(image, 0, 0)
        }
        setSize(`${canvas.width} × ${canvas.height}`)
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      alive = false
    }
  }, [props.assetBase, props.assetId, props.kind, props.reader])
  return (
    <div className="image-workspace-preview">
      <canvas ref={canvasRef} className={error ? 'hidden' : undefined} />
      {error ? <div className="cf-err">{error}</div> : null}
      {size ? <span className="image-preview-size">{size}</span> : null}
    </div>
  )
}

function useBufferUrl(bytes: ArrayBuffer | undefined): string {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!bytes) {
      setUrl('')
      return () => undefined
    }
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [bytes])
  return url
}

interface PendingBattleImport {
  id: AssetId
  prepared: PreparedImageImport
  previousBytes?: ArrayBuffer
}

function BattleImportReview(props: {
  pending: PendingBattleImport
  onConfirm(): void
  onCancel(): void
}) {
  const sourceUrl = useBufferUrl(props.pending.prepared.sourceBytes)
  const effectUrl = useBufferUrl(props.pending.prepared.effectPreviewBytes)
  return (
    <div className="image-import-review" role="dialog" aria-label="战场背景色彩适配预览">
      <div className="image-import-review-head">
        <strong>确认工程色彩适配</strong>
        <span>保存的是右侧效果；运行时仍保留召唤换色能力。</span>
      </div>
      <div className="image-import-compare">
        <figure>
          {sourceUrl ? <img src={sourceUrl} alt="上传原图" /> : null}
          <figcaption>上传原图</figcaption>
        </figure>
        <figure>
          {effectUrl ? <img src={effectUrl} alt="工程内效果" /> : null}
          <figcaption>工程内效果</figcaption>
        </figure>
      </div>
      <div className="image-import-review-actions">
        <button type="button" className="btn" onClick={props.onCancel}>
          取消
        </button>
        <button type="button" className="btn primary" onClick={props.onConfirm}>
          使用适配结果
        </button>
      </div>
    </div>
  )
}

export function ImageTab(props: {
  assetBase: AssetBase
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
}) {
  const { assetBase, catalog, reader, session, tabBar, focusObjectId, onObjectFocus } = props
  const state = session.getState()
  const allReferences = useMemo(() => collectEditorAssetReferences(state), [state])
  const focusedReferenceKind = focusObjectId
    ? allReferences.find((reference) => reference.asset === focusObjectId)?.expectedKind
    : undefined
  const focusedKind = focusObjectId
    ? ((catalog.assets[focusObjectId]?.kind ?? focusedReferenceKind) as StaticImageKind | undefined)
    : undefined
  const [kind, setKind] = useState<StaticImageKind>(
    focusedKind && STATIC_IMAGE_KINDS.includes(focusedKind) ? focusedKind : 'portrait',
  )
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<AssetId | null>(focusObjectId ?? null)
  const [replaceId, setReplaceId] = useState<AssetId | undefined>()
  const [pendingBattle, setPendingBattle] = useState<PendingBattleImport | undefined>()
  const [battlePaletteColors, setBattlePaletteColors] = useState<
    readonly (readonly [number, number, number])[] | undefined
  >()
  const inputRef = useRef<HTMLInputElement>(null)
  const entries = useMemo(() => imageAssets(catalog, kind), [catalog, kind])
  const shown = entries.filter(
    (entry) =>
      !filter ||
      entry.id.toLowerCase().includes(filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(filter.toLowerCase()),
  )
  const missingFocusedId =
    focusObjectId && selectedId === focusObjectId && !catalog.assets[focusObjectId]
      ? focusObjectId
      : undefined
  const selected =
    entries.find((entry) => entry.id === selectedId) ??
    (missingFocusedId ? undefined : (shown[0] ?? entries[0]))
  const references = useMemo(() => {
    const result = new Map<AssetId, ReturnType<typeof groupAssetReferencesBySite>>()
    for (const reference of groupAssetReferencesBySite(allReferences)) {
      const list = result.get(reference.asset) ?? []
      list.push(reference)
      result.set(reference.asset, list)
    }
    return result
  }, [allReferences])
  const closureIssues = useMemo(
    () => validateAssetReferenceClosure(catalog, allReferences),
    [allReferences, catalog],
  )

  useEffect(() => {
    if (!focusObjectId) return
    const record = catalog.assets[focusObjectId]
    const targetKind = record?.kind ?? focusedReferenceKind
    if (targetKind && STATIC_IMAGE_KINDS.includes(targetKind as StaticImageKind))
      setKind(targetKind as StaticImageKind)
    setSelectedId(focusObjectId)
  }, [catalog, focusObjectId, focusedReferenceKind])
  useEffect(() => {
    if (
      !selectedId ||
      (!entries.some((entry) => entry.id === selectedId) && selectedId !== missingFocusedId)
    )
      setSelectedId(entries[0]?.id ?? null)
  }, [entries, missingFocusedId, selectedId])
  useEffect(() => {
    let alive = true
    setBattlePaletteColors(undefined)
    if (kind !== 'battle-background') return () => undefined
    void loadStandardPalette(assetBase).then(
      (palette) => {
        if (alive) setBattlePaletteColors(palette.colors)
      },
      (cause: unknown) => {
        if (alive)
          setError(
            `无法读取工程标准色彩：${cause instanceof Error ? cause.message : String(cause)}`,
          )
      },
    )
    return () => {
      alive = false
    }
  }, [assetBase, kind])

  const commitImport = (pending: PendingBattleImport): void => {
    session.dispatch(
      new UpsertAssetCommand(
        pending.id,
        pending.prepared.record,
        pending.prepared.bytes,
        pending.previousBytes,
      ),
    )
    setSelectedId(pending.id)
    onObjectFocus?.(pending.id)
    setPendingBattle(undefined)
  }

  const importFile = async (file: File, targetId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = targetId ? catalog.assets[targetId] : undefined
      if (previous && previous.kind !== kind)
        throw new Error(`不能用 ${kind} 替换 ${previous.kind} 资源`)
      const previousBytes = targetId ? await reader.readBytes(targetId, kind) : undefined
      const palette =
        kind === 'battle-background' ? await loadStandardPalette(assetBase) : undefined
      const prepared = await prepareAuthoredImage(file, kind, palette?.colors, previous?.label)
      const id = targetId ?? nextAuthoredImageId(catalog, kind, prepared.hash)
      const pending = { id, prepared, previousBytes }
      if (kind === 'battle-background') setPendingBattle(pending)
      else commitImport(pending)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedIssues = selected
    ? closureIssues.filter((issue) => issue.message.includes(`"${selected.id}"`))
    : []

  return (
    <>
      <div className="outliner data-outliner image-library-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">图像</span>
          <span className="spacer" />
          <span className="k">{shown.length} 项</span>
        </div>
        <div className="image-kind-tabs" role="tablist" aria-label="图像类型">
          {STATIC_IMAGE_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              className={kind === value ? 'active' : undefined}
              onClick={() => {
                setKind(value)
                setSelectedId(null)
              }}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="music-library-tools">
          <button
            type="button"
            className="music-import-button"
            onClick={() => inputRef.current?.click()}
          >
            ＋ 导入 PNG
          </button>
          <input
            className="in"
            aria-label="搜索图像"
            placeholder="搜索名称或 AssetId"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {error ? <div className="cf-err">{error}</div> : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".png,image/png"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file, replaceId)
            setReplaceId(undefined)
            event.target.value = ''
          }}
        />
        <div className="image-asset-list">
          {shown.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`image-asset-row${selected?.id === entry.id ? ' selected' : ''}`}
              onClick={() => {
                setSelectedId(entry.id)
                onObjectFocus?.(entry.id)
              }}
            >
              <ImageAssetThumbnail
                asset={entry.id}
                kind={kind}
                reader={reader}
                revision={entry.record.sha256}
                paletteColors={battlePaletteColors}
              />
              <span>
                <strong>{entry.record.label || entry.id}</strong>
                <small>{entry.id}</small>
              </span>
            </button>
          ))}
          {!shown.length ? <div className="insp-empty">此类型还没有图片。</div> : null}
        </div>
      </div>
      <div className="canvas-wrap data-body image-workspace">
        {pendingBattle ? (
          <BattleImportReview
            pending={pendingBattle}
            onCancel={() => setPendingBattle(undefined)}
            onConfirm={() => commitImport(pendingBattle)}
          />
        ) : missingFocusedId ? (
          <div className="cf-err image-missing-target">
            引用目标 AssetId“{missingFocusedId}”不在工程 catalog；已停留在该问题，不会跳到其他图片。
          </div>
        ) : selected ? (
          <ImageWorkspacePreview
            key={`${selected.id}:${selected.record.sha256}`}
            assetId={selected.id}
            kind={kind}
            reader={reader}
            assetBase={assetBase}
          />
        ) : (
          <div className="insp-empty">导入或选择一张{KIND_LABEL[kind]}。</div>
        )}
      </div>
      <div className="inspector music-inspector image-inspector">
        {missingFocusedId ? (
          <div className="section">
            <h4>缺失资源</h4>
            <code>{missingFocusedId}</code>
            <p className="project-copy">
              这是诊断定位到的具体引用目标。请修正引用，或用同一个 AssetId 恢复资源记录。
            </p>
          </div>
        ) : selected ? (
          <>
            <div className="insp-head">
              <div className="what">选中{KIND_LABEL[kind]}</div>
              <div className="who">{selected.record.label || '未命名'}</div>
            </div>
            <div className="section">
              <h4>资源</h4>
              <EditableName assetId={selected.id} label={selected.record.label} session={session} />
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
                <strong>{ORIGIN_LABEL[selected.record.origin.kind]}</strong>
              </div>
              <div className="music-meta-row">
                <span>大小</span>
                <strong>{formatBytes(selected.record.bytes)}</strong>
              </div>
              <div className="image-resource-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setReplaceId(selected.id)
                    inputRef.current?.click()
                  }}
                >
                  替换（保持引用）
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={selectedReferences.length > 0}
                  title={
                    selectedReferences.length
                      ? `仍有 ${selectedReferences.length} 处引用`
                      : '删除图片'
                  }
                  onClick={() => {
                    if (!window.confirm(`确认删除未被引用的图片 ${selected.id}？`)) return
                    void reader.readBytes(selected.id, kind).then(
                      (previousBytes) =>
                        session.dispatch(new DeleteAssetCommand(selected.id, previousBytes)),
                      (cause: unknown) =>
                        setError(cause instanceof Error ? cause.message : String(cause)),
                    )
                  }}
                >
                  删除
                </button>
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
                <div className="music-reference-empty">当前工程没有引用这张图片。</div>
              )}
              {selectedIssues.map((issue) => (
                <div className="cf-err" key={`${issue.code}:${issue.where}`}>
                  {issue.message}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="insp-empty">选择一张图片查看资源与引用。</div>
        )}
      </div>
    </>
  )
}
