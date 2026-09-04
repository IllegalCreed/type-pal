/**
 * 瓦片集库页(数据模式,W7B)—— 注册表一览 + 上传向导。
 *
 * 上传流(终案):选 PNG → 网格切片参数 → 量化贴盘 0 预览(D25:量化是内部机制,
 * UI 文案不出现「调色板」)→ 命名/分类 → 入库(编码原版同构 .rle + gzip,保存时落盘)。
 * 新上传与已落盘资源统一经 EditorAssetReader + AssetId 读取；record.sha256 驱动缓存失效。
 */

import type { AssetCatalogV1, AssetRecordV1, MapIndexV1 } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  loadTilesetAsset,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import {
  TilesetRemovalProof,
  TilesetReplacementProof,
  tilesetUsageReferences,
} from '../core/tileset-references.js'
import {
  DsButton,
  DsCatalogControls,
  DsFileInput,
  DsInspectorHost,
  DsInspectorTabs,
  DsNumberInput,
  DsObjectHero,
  DsPressable,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadonlyValue,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsTag,
  DsTextInput,
} from './design-system/index.js'

const FRAME_PAGE_SIZE = 128

type TilesetInspectorTab = 'resource' | 'references'

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  builtin: '内置',
  outdoor: '户外',
  indoor: '室内',
  dungeon: '迷宫',
  misc: '其他',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

/** 瓦片帧网格预览(bake 后贴 canvas;量化预览与条目详情共用)。 */
function FrameGrid(props: { frames: readonly RleFrame[]; palette: Palette; startIndex?: number }) {
  const { frames, palette, startIndex = 0 } = props
  return (
    <ul className="tileset-frame-grid" aria-label="瓦片帧预览">
      {frames.map((f, i) => (
        <li
          key={`${startIndex + i}:${f.width}x${f.height}`}
          className="tileset-frame"
          title={`#${startIndex + i} · ${f.width}×${f.height}`}
        >
          <FrameThumb frame={f} palette={palette} idx={startIndex + i} />
          <span className="tileset-frame-index">#{startIndex + i}</span>
        </li>
      ))}
    </ul>
  )
}

function PagedFrameGrid(props: { frames: readonly RleFrame[]; palette: Palette }) {
  const { frames, palette } = props
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(frames.length / FRAME_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * FRAME_PAGE_SIZE
  const end = Math.min(start + FRAME_PAGE_SIZE, frames.length)

  return (
    <section className="tileset-preview-panel" aria-label="瓦片预览">
      <div className="tileset-preview-bar">
        <div>
          <strong>瓦片预览</strong>
          <span className="tileset-preview-range">
            {frames.length === 0 ? '0 块' : `${start + 1}–${end} / ${frames.length} 块`}
          </span>
        </div>
        {pageCount > 1 && (
          <nav className="tileset-page-actions" aria-label="瓦片预览分页">
            <DsPressable
              type="button"
              aria-label="上一页瓦片"
              disabled={safePage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              ‹
            </DsPressable>
            <span className="mono">
              {safePage + 1}/{pageCount}
            </span>
            <DsPressable
              type="button"
              aria-label="下一页瓦片"
              disabled={safePage === pageCount - 1}
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            >
              ›
            </DsPressable>
          </nav>
        )}
      </div>
      <FrameGrid frames={frames.slice(start, end)} palette={palette} startIndex={start} />
    </section>
  )
}

function FrameThumb(props: { frame: RleFrame; palette: Palette; idx: number }) {
  const { frame, palette, idx } = props
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !ref.current) return
    ctx.clearRect(0, 0, ref.current.width, ref.current.height)
    ctx.drawImage(bakeFrame(frame, palette), 0, 0)
  }, [frame, palette])
  const scale = Math.min(2, 48 / Math.max(frame.width, frame.height))
  return (
    <canvas
      ref={ref}
      className="tileset-frame-canvas"
      width={frame.width}
      height={frame.height}
      style={{
        width: Math.max(1, Math.round(frame.width * scale)),
        height: Math.max(1, Math.round(frame.height * scale)),
      }}
      aria-label={`瓦片 ${idx}，${frame.width}×${frame.height}`}
    />
  )
}

/** 上传向导内部态。 */
interface Draft {
  fileName: string
  imgW: number
  imgH: number
  rgba: Uint8Array
  /** 原图预览用 dataURL(直接来自文件,不经量化)。 */
  srcUrl: string
}

export function TilesetTab(props: {
  tilesets: TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  session: EditSession
  mapIndex: MapIndexV1
  tabBar?: React.ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenReference?: (reference: ProjectReferenceEdge) => void
}) {
  const {
    tilesets,
    assetCatalog,
    assetReader,
    assetBase,
    session,
    mapIndex,
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenReference,
  } = props
  const [selectedId, setSelectedId] = useState<string | null>(
    focusObjectId ?? tilesets[0]?.id ?? null,
  )
  const [uploading, setUploading] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<TilesetInspectorTab>('resource')
  const [replaceTargetId, setReplaceTargetId] = useState<string>()
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tileW, setTileW] = useState(32)
  const [tileH, setTileH] = useState(16)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('outdoor')
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const tileWidthId = useId()
  const tileHeightId = useId()
  const newIdId = useId()
  const newNameId = useId()
  const newCategoryId = useId()
  const editNameId = useId()
  const editCategoryId = useId()

  useEffect(() => {
    let alive = true
    loadStandardPalette(assetBase)
      .then((p) => {
        if (alive) setPalette(p)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [assetBase])

  const categories = useMemo(
    () => [...new Set(tilesets.map((tileset) => tileset.category))].sort(),
    [tilesets],
  )
  const shownTilesets = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase()
    return tilesets.filter(
      (tileset) =>
        (categoryFilter === 'all' || tileset.category === categoryFilter) &&
        (!query ||
          tileset.name.toLocaleLowerCase().includes(query) ||
          tileset.id.toLocaleLowerCase().includes(query)),
    )
  }, [categoryFilter, filter, tilesets])
  const selected = tilesets.find((t) => t.id === selectedId) ?? null
  const selectedRecord = selected ? assetCatalog.assets[selected.asset] : undefined
  const sharedDefinitions = selected
    ? tilesets.filter((candidate) => candidate.asset === selected.asset)
    : []

  const commitMetadataField = (field: 'name' | 'category'): void => {
    if (!selected) return
    const current = session.getState().tilesets?.find((tileset) => tileset.id === selected.id)
    if (!current) return
    const setDraftValue = field === 'name' ? setEditName : setEditCategory
    const next = (field === 'name' ? editName : editCategory).trim()
    if (!next) {
      setDraftValue(current[field])
      return
    }
    setDraftValue(next)
    if (next === current[field]) return
    session.dispatch(new UpdateTilesetMetadataCommand(selected.id, { [field]: next }))
  }

  useEffect(() => {
    setEditName(selected?.name ?? '')
    setEditCategory(selected?.category ?? '')
  }, [selected])

  useEffect(() => {
    if (focusObjectId === undefined) return
    setSelectedId(focusObjectId)
    setUploading(false)
    setErr('')
  }, [focusObjectId])

  useEffect(() => {
    if (selectedId && tilesets.some((tileset) => tileset.id === selectedId)) return
    const nextId = tilesets[0]?.id ?? null
    setSelectedId(nextId)
    onObjectFocus?.(nextId ?? undefined)
  }, [onObjectFocus, selectedId, tilesets])

  const subscribeMapReferences = useCallback(
    (listener: () => void) => session.subscribeMapReferences(listener),
    [session],
  )
  const readMapReferenceVersion = useCallback(() => session.getMapReferenceVersion(), [session])
  useSyncExternalStore(subscribeMapReferences, readMapReferenceVersion, readMapReferenceVersion)
  const mapReferenceBatch = session.getMapReferenceBatch()
  useEffect(() => {
    if (!mapReferenceBatch.done && !mapReferenceBatch.running)
      void session.ensureMapReferencesIndexed()
  }, [mapReferenceBatch.done, mapReferenceBatch.running, session])
  const selectedReferences = selected ? tilesetUsageReferences(mapReferenceBatch, selected.id) : []
  const removalMapReferences = selectedReferences.filter(
    (reference) => reference.source.owner.kind === 'map',
  )
  const removalStampReferences = selectedReferences.filter(
    (reference) => reference.source.owner.kind === 'stamp',
  )

  // 量化预览帧(draft + 参数变化即重算;纯函数,同色缓存后毫秒级)
  const quantized = useMemo(() => {
    if (!draft || !palette || tileW <= 0 || tileH <= 0) return []
    try {
      return sliceAtlasGrid(draft.rgba, draft.imgW, draft.imgH, tileW, tileH).map((t) =>
        quantizeToRleFrame(t.rgba, t.width, t.height, palette),
      )
    } catch {
      return []
    }
  }, [draft, palette, tileW, tileH])
  const replacementTilesetIds = new Set(sharedDefinitions.map((entry) => entry.id))
  const replacementReferences = sharedDefinitions.flatMap((entry) =>
    tilesetUsageReferences(mapReferenceBatch, entry.id),
  )
  const replacementOutOfRangeMaps = mapReferenceBatch.facts.flatMap((fact) =>
    fact.tilesetIds.flatMap((tilesetId) => {
      const maxTileId = fact.maxTileIdByTileset[tilesetId] ?? -1
      if (!replacementTilesetIds.has(tilesetId) || maxTileId < quantized.length) return []
      return [
        {
          mapId: fact.mapId,
          mapName: mapIndex.maps.find((entry) => entry.id === fact.mapId)?.name ?? fact.mapId,
          maxTileId,
          reference: replacementReferences.find(
            (reference) =>
              reference.target.kind === 'tileset' &&
              reference.target.id === tilesetId &&
              reference.source.owner.kind === 'map' &&
              reference.source.owner.id === fact.mapId,
          ),
        },
      ]
    }),
  )
  const replacementOutOfRangeStamps = mapReferenceBatch.stampFacts.flatMap((stamp) =>
    stamp.tilesetIds.flatMap((tilesetId) => {
      const maxTileId = stamp.maxTileIdByTileset[tilesetId] ?? -1
      if (!replacementTilesetIds.has(tilesetId) || maxTileId < quantized.length) return []
      return [
        {
          id: stamp.stampId,
          name: stamp.stampName,
          maxTileId,
          reference: replacementReferences.find(
            (reference) =>
              reference.target.kind === 'tileset' &&
              reference.target.id === tilesetId &&
              reference.source.owner.kind === 'stamp' &&
              reference.source.owner.id === stamp.stampId,
          ),
        },
      ]
    }),
  )

  const pickFile = async (file: File): Promise<void> => {
    setErr('')
    try {
      const bitmap = await createImageBitmap(file)
      const cvs = document.createElement('canvas')
      cvs.width = bitmap.width
      cvs.height = bitmap.height
      const ctx = cvs.getContext('2d')
      if (!ctx) throw new Error('2d context 不可用')
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const data = ctx.getImageData(0, 0, cvs.width, cvs.height)
      const base = file.name
        .replace(/\.[^.]*$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
      setDraft({
        fileName: file.name,
        imgW: cvs.width,
        imgH: cvs.height,
        rgba: new Uint8Array(data.data.buffer.slice(0)),
        srcUrl: cvs.toDataURL(),
      })
      setNewId(base || 'tileset')
      setNewName(base || '新瓦片集')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const submit = async (): Promise<void> => {
    if (!draft || quantized.length === 0) return
    const replaceTarget = replaceTargetId
      ? tilesets.find((entry) => entry.id === replaceTargetId)
      : undefined
    const id = replaceTarget?.id ?? newId.trim()
    if (!id || id.includes('/')) {
      setErr("id 不能为空且不得含 '/'")
      return
    }
    if (!replaceTargetId && tilesets.some((t) => t.id === id)) {
      setErr(`id "${id}" 已存在`)
      return
    }
    try {
      const chunk = encodeSpriteChunk(quantized)
      const gz = await compressGzip(chunk)
      const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
      const hash = await sha256Hex(buf)
      const path = `assets/authored/tilesets/${hash}.rle`
      if (replaceTargetId) {
        const target = replaceTarget
        if (!target) throw new Error('待替换瓦片集已不存在')
        const capturedAsset = target.asset
        const oldRecord = assetCatalog.assets[capturedAsset]
        if (!oldRecord || oldRecord.kind !== 'tileset') throw new Error('待替换资源不在 catalog')
        const previousBytes = await assetReader.readBytes(target.asset, 'tileset')
        const previousBytesSha256 = await sha256Hex(previousBytes)
        const batch = await session.ensureMapReferencesIndexed({ retryFailures: true })
        const liveState = session.getState()
        const liveTarget = liveState.tilesets?.find((entry) => entry.id === target.id)
        const liveRecord = liveTarget ? liveState.assetCatalog.assets[liveTarget.asset] : undefined
        if (
          liveTarget?.asset !== capturedAsset ||
          liveRecord?.kind !== 'tileset' ||
          liveRecord.sha256 !== previousBytesSha256
        )
          throw new Error('待替换瓦片集或源资源已变化；请重新选择文件。')
        const liveDefinitions = (liveState.tilesets ?? []).filter(
          (entry) => entry.asset === capturedAsset,
        )
        const proof = TilesetReplacementProof.fromBatch(batch, target.id, quantized.length, {
          asset: capturedAsset,
          previousRecord: liveRecord,
          definitions: liveDefinitions,
        })
        const record: AssetRecordV1 = {
          ...liveRecord,
          path,
          bytes: buf.byteLength,
          sha256: hash,
          mediaType: 'application/vnd.type-pal.rle',
          origin: { kind: 'authored' },
        }
        session.dispatch(
          new ReplaceTilesetAssetCommand(
            target.id,
            capturedAsset,
            record,
            buf,
            previousBytes,
            proof,
            (state) => session.getCurrentMapReferenceBatch(state),
          ),
        )
      } else {
        let asset = `tileset.${id}`
        for (let suffix = 2; assetCatalog.assets[asset]; suffix++) asset = `tileset.${id}.${suffix}`
        const record: AssetRecordV1 = {
          kind: 'tileset',
          path,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: buf.byteLength,
          sha256: hash,
          label: `瓦片集 ${id}`,
          origin: { kind: 'authored' },
        }
        session.dispatch(
          new AddTilesetCommand(
            {
              id,
              name: newName.trim() || id,
              category: newCategory.trim() || 'misc',
              asset,
            },
            record,
            buf,
          ),
        )
      }
      setUploading(false)
      setReplaceTargetId(undefined)
      setDraft(null)
      setSelectedId(id)
      onObjectFocus?.(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const scanRemovalReferences = async (): Promise<void> => {
    if (!selected) return
    setErr('')
    try {
      await session.ensureMapReferencesIndexed({ retryFailures: true })
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const removeSelected = async (): Promise<void> => {
    if (!selected) return
    try {
      const capturedAsset = selected.asset
      const capturedRecord = selectedRecord
      if (!capturedRecord) throw new Error('瓦片集源资源已不存在。')
      const bytes = await assetReader.readBytes(capturedAsset, 'tileset')
      const bytesSha256 = await sha256Hex(bytes)
      const batch = await session.ensureMapReferencesIndexed({ retryFailures: true })
      const liveState = session.getState()
      const proof = TilesetRemovalProof.fromBatch(batch, liveState, selected.id)
      if (proof.asset !== capturedAsset || proof.recordSha256 !== bytesSha256)
        throw new Error('瓦片集或源资源已变化；请重新检查后移除。')
      const nextId = liveState.tilesets?.find((candidate) => candidate.id !== selected.id)?.id
      session.dispatch(
        new RemoveTilesetCommand(
          selected.id,
          proof,
          (state) => session.getCurrentMapReferenceBatch(state),
          bytes,
        ),
      )
      setSelectedId(nextId ?? null)
      onObjectFocus?.(nextId)
      setErr('')
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const removalComplete = Boolean(
    mapReferenceBatch.done &&
      mapReferenceBatch.failures.length === 0 &&
      mapReferenceBatch.completed === mapReferenceBatch.total,
  )
  const removalHasReferences = selectedReferences.length > 0
  const removalReferenceCount = selectedReferences.length
  const removalPanelState = mapReferenceBatch.running
    ? 'loading'
    : mapReferenceBatch.failures.length || !removalComplete
      ? 'partial'
      : removalReferenceCount === 0
        ? 'empty'
        : 'ready'

  const beginSelectedReplacement = (): void => {
    if (!selected || !selectedRecord) return
    if (
      sharedDefinitions.length > 1 &&
      !window.confirm(
        `这份图像由 ${sharedDefinitions.map((entry) => entry.name).join('、')} 共同使用。替换会同时更新全部定义，是否继续？`,
      )
    )
      return
    setReplaceTargetId(selected.id)
    setUploading(true)
    setDraft(null)
    setNewId(selected.id)
    setNewName(selected.name)
    setNewCategory(selected.category)
    setErr('')
  }

  const runRemovalLifecycle = (): void => {
    setInspectorTab('references')
    if (removalComplete && !removalHasReferences) void removeSelected()
    else if (!removalComplete) void scanRemovalReferences()
  }

  return (
    <>
      <div className="outliner data-outliner tileset-outliner">
        {tabBar}
        <DsCatalogControls
          title="瓦片集"
          count={tilesets.length}
          unit="项"
          actions={[
            {
              id: 'upload-tileset',
              label: '上传 PNG、WebP 或 GIF 图集',
              icon: 'add',
              onClick: () => {
                setUploading(true)
                setReplaceTargetId(undefined)
                setDraft(null)
                setErr('')
              },
            },
          ]}
          search={{
            'aria-label': '搜索瓦片集',
            autoComplete: 'off',
            placeholder: '搜索名称或 ID…',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
          filters={
            <DsSelect
              size="compact"
              aria-label="筛选瓦片集分类"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { value: 'all', label: '全部分类' },
                ...categories.map((category) => ({
                  value: category,
                  label: categoryLabel(category),
                })),
              ]}
            />
          }
        />
        <fieldset className="tileset-library-list" aria-label="瓦片集列表">
          {tilesets.length === 0 ? (
            <div className="tileset-list-empty">尚无瓦片集，上传图集后即可在地图中使用。</div>
          ) : shownTilesets.length === 0 ? (
            <div className="tileset-list-empty">没有匹配的瓦片集。</div>
          ) : null}
          {shownTilesets.map((tileset) => (
            <DsPressable
              key={tileset.id}
              type="button"
              className={`tileset-library-row${!uploading && selectedId === tileset.id ? ' selected' : ''}`}
              aria-pressed={!uploading && selectedId === tileset.id}
              onClick={() => {
                setSelectedId(tileset.id)
                onObjectFocus?.(tileset.id)
                setUploading(false)
                setErr('')
              }}
            >
              <span className="tileset-library-icon" aria-hidden="true">
                ◆
              </span>
              <span className="tileset-library-copy">
                <strong>{tileset.name}</strong>
                <span className="mono">{tileset.id}</span>
              </span>
              <span className="tileset-category-badge" title={tileset.category}>
                {categoryLabel(tileset.category)}
              </span>
            </DsPressable>
          ))}
        </fieldset>
      </div>

      <div className="center tileset-center">
        {uploading ? (
          <div className="tileset-workspace-scroll">
            <DsObjectHero
              eyebrow="导入预览"
              title={draft?.fileName ?? '上传瓦片图集'}
              summary="选择图片后按网格切片，预览结果就是入库后的瓦片。"
              actions={
                <DsButton variant="secondary" onClick={() => fileRef.current?.click()}>
                  {draft ? '更换文件' : '选择图集'}
                </DsButton>
              }
            />
            <DsFileInput
              ref={fileRef}
              accept="image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void pickFile(file)
                event.target.value = ''
              }}
            />
            {draft ? (
              <>
                <div className="tileset-atlas-card">
                  <div className="tileset-preview-bar">
                    <div>
                      <strong>原始图集</strong>
                      <span className="tileset-preview-range mono">
                        {draft.imgW}×{draft.imgH}
                      </span>
                    </div>
                  </div>
                  <div className="tileset-atlas-stage">
                    <img
                      src={draft.srcUrl}
                      alt={`${draft.fileName} 原图预览`}
                      className="atlas-preview"
                      width={draft.imgW}
                      height={draft.imgH}
                    />
                  </div>
                </div>
                {palette && quantized.length > 0 && (
                  <PagedFrameGrid frames={quantized} palette={palette} />
                )}
              </>
            ) : (
              <DsPressable
                type="button"
                className="tileset-upload-empty"
                onClick={() => fileRef.current?.click()}
              >
                <span aria-hidden="true">▦</span>
                <strong>选择一张瓦片图集</strong>
                <small>支持 PNG、WebP、GIF；导入后按网格切片。</small>
              </DsPressable>
            )}
          </div>
        ) : selected && palette ? (
          <TilesetPreview
            key={`${selected.asset}:${selectedRecord?.sha256 ?? 'missing'}`}
            def={selected}
            revision={selectedRecord?.sha256 ?? 'missing'}
            assetReader={assetReader}
            palette={palette}
            actions={
              <>
                <DsButton size="compact" variant="secondary" onClick={beginSelectedReplacement}>
                  替换图像
                </DsButton>
                <DsButton
                  size="compact"
                  variant="danger"
                  busy={mapReferenceBatch.running}
                  title="检查全项目引用后从注册表移除；操作可撤销"
                  onClick={runRemovalLifecycle}
                >
                  {removalComplete && !removalHasReferences
                    ? '确认移除'
                    : removalComplete
                      ? `查看 ${removalReferenceCount} 处阻断引用`
                      : mapReferenceBatch.completed > 0
                        ? '重新检查引用'
                        : '检查引用'}
                </DsButton>
              </>
            }
          />
        ) : (
          <div className="tileset-workspace-empty">
            <span aria-hidden="true">◆</span>
            <strong>{palette ? '选择瓦片集' : '正在准备瓦片预览…'}</strong>
            <small>
              {palette ? '从左侧资源库选择，或上传新的图集。' : '正在读取项目色彩资源。'}
            </small>
          </div>
        )}
      </div>

      <DsInspectorHost
        as="aside"
        className={`inspector tileset-inspector${
          !uploading && selected ? ' inspector--tabbed' : ''
        }`}
      >
        {uploading ? (
          <>
            <div className="insp-head">
              <div className="what">上传瓦片集</div>
              <div className="who">切片与登记</div>
            </div>
            <section className="section">
              <h4>切片</h4>
              <DsPropertyGrid>
                <DsPropertyRow label="瓦宽" labelFor={tileWidthId}>
                  <DsNumberInput
                    id={tileWidthId}
                    size="compact"
                    min={1}
                    max={400}
                    inputMode="numeric"
                    autoComplete="off"
                    value={tileW}
                    onChange={(event) => {
                      setTileW(Math.floor(event.target.valueAsNumber) || 0)
                    }}
                  />
                </DsPropertyRow>
                <DsPropertyRow label="瓦高" labelFor={tileHeightId}>
                  <DsNumberInput
                    id={tileHeightId}
                    size="compact"
                    min={1}
                    max={400}
                    inputMode="numeric"
                    autoComplete="off"
                    value={tileH}
                    onChange={(event) => {
                      setTileH(Math.floor(event.target.valueAsNumber) || 0)
                    }}
                  />
                </DsPropertyRow>
              </DsPropertyGrid>
              <div className="tileset-cut-summary">
                {draft ? `将切出 ${quantized.length} 块瓦片` : '选择文件后显示切片结果'}
              </div>
            </section>
            {replaceTargetId &&
            draft &&
            quantized.length > 0 &&
            removalComplete &&
            (replacementOutOfRangeMaps.length > 0 || replacementOutOfRangeStamps.length > 0) ? (
              <section className="section tileset-removal-check" aria-label="替换越界引用">
                <h4>无法缩减帧数</h4>
                <p className="tileset-removal-warning" role="alert">
                  新图集只有 {quantized.length} 帧。以下对象仍引用更大的瓦片编号，请先修正后重试。
                </p>
                {replacementOutOfRangeMaps.length > 0 ? (
                  <DsReferenceGroup title="引用地图" count={replacementOutOfRangeMaps.length}>
                    <DsReferenceList>
                      {replacementOutOfRangeMaps.map((reference) => (
                        <DsReferenceRow
                          key={reference.mapId}
                          title={reference.mapName}
                          detail={`${reference.mapId} · #${reference.maxTileId}`}
                          action={
                            onOpenReference && reference.reference
                              ? {
                                  label: '打开',
                                  onActivate: () => onOpenReference(reference.reference!),
                                }
                              : undefined
                          }
                          status={
                            onOpenReference && reference.reference
                              ? undefined
                              : {
                                  label: '暂不可定位',
                                  reason: '当前宿主没有提供地图定位能力。',
                                  tone: 'warning',
                                }
                          }
                        />
                      ))}
                    </DsReferenceList>
                  </DsReferenceGroup>
                ) : null}
                {replacementOutOfRangeStamps.length > 0 ? (
                  <DsReferenceGroup title="引用组合模板" count={replacementOutOfRangeStamps.length}>
                    <DsReferenceList>
                      {replacementOutOfRangeStamps.map((reference) => (
                        <DsReferenceRow
                          key={reference.id}
                          title={reference.name}
                          detail={`${reference.id} · #${reference.maxTileId}`}
                          action={
                            onOpenReference && reference.reference
                              ? {
                                  label: '打开',
                                  onActivate: () => onOpenReference(reference.reference!),
                                }
                              : undefined
                          }
                          status={
                            onOpenReference && reference.reference
                              ? undefined
                              : {
                                  label: '暂不可定位',
                                  reason: '当前宿主没有提供组合模板定位能力。',
                                  tone: 'warning',
                                }
                          }
                        />
                      ))}
                    </DsReferenceList>
                  </DsReferenceGroup>
                ) : null}
              </section>
            ) : null}
            <section className="section">
              <h4>登记</h4>
              <DsPropertyGrid>
                <DsPropertyRow label="ID" labelFor={newIdId}>
                  <DsTextInput
                    id={newIdId}
                    size="compact"
                    autoComplete="off"
                    spellCheck={false}
                    value={newId}
                    onChange={(event) => setNewId(event.target.value)}
                    placeholder="例如 forest-set…"
                    monospace
                  />
                </DsPropertyRow>
                <DsPropertyRow label="名称" labelFor={newNameId}>
                  <DsTextInput
                    id={newNameId}
                    size="compact"
                    autoComplete="off"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="例如 森林套件…"
                  />
                </DsPropertyRow>
                <DsPropertyRow label="分类" labelFor={newCategoryId}>
                  <DsTextInput
                    id={newCategoryId}
                    size="compact"
                    autoComplete="off"
                    spellCheck={false}
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="例如 outdoor…"
                  />
                </DsPropertyRow>
              </DsPropertyGrid>
            </section>
            <section className="section tileset-inspector-actions">
              <DsPressable
                type="button"
                className="tileset-primary-action"
                disabled={!draft || quantized.length === 0 || !palette}
                onClick={() => void submit()}
              >
                {replaceTargetId ? '替换瓦片集图像' : '入库瓦片集'}
              </DsPressable>
              <DsPressable
                type="button"
                className="tileset-secondary-action"
                onClick={() => {
                  setUploading(false)
                  setReplaceTargetId(undefined)
                  setDraft(null)
                  setErr('')
                }}
              >
                取消上传
              </DsPressable>
            </section>
          </>
        ) : selected ? (
          <>
            <div className="insp-head">
              <div className="what">选中瓦片集</div>
              <div className="who">{selected.name}</div>
            </div>
            <DsInspectorTabs
              id="tileset-inspector"
              label="瓦片集检查器"
              activeId={inspectorTab}
              onChange={(id) => setInspectorTab(id as TilesetInspectorTab)}
              items={[
                {
                  id: 'resource',
                  label: '资源',
                  panel: (
                    <>
                      <section className="section">
                        <h4>登记信息</h4>
                        <DsPropertyGrid>
                          <DsPropertyRow label="ID">
                            <DsReadonlyValue as="div" className="tileset-readonly" monospace>
                              {selected.id}
                            </DsReadonlyValue>
                          </DsPropertyRow>
                          <DsPropertyRow label="名称" labelFor={editNameId}>
                            <DsTextInput
                              id={editNameId}
                              size="compact"
                              aria-label="瓦片集名称"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              onBlur={() => commitMetadataField('name')}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur()
                              }}
                            />
                          </DsPropertyRow>
                          <DsPropertyRow label="分类" labelFor={editCategoryId}>
                            <DsTextInput
                              id={editCategoryId}
                              size="compact"
                              aria-label="瓦片集分类"
                              value={editCategory}
                              onChange={(event) => setEditCategory(event.target.value)}
                              onBlur={() => commitMetadataField('category')}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur()
                              }}
                            />
                          </DsPropertyRow>
                          <DsPropertyRow label="文件">
                            <DsReadonlyValue
                              as="div"
                              className="tileset-readonly"
                              monospace
                              title={selectedRecord?.path}
                            >
                              {selectedRecord?.path ?? 'catalog 缺失'}
                            </DsReadonlyValue>
                          </DsPropertyRow>
                        </DsPropertyGrid>
                        {selectedRecord && session.getState().assetBlobs[selectedRecord.path] && (
                          <div className="tileset-source-note">
                            尚未保存；保存项目后写入资产目录。
                          </div>
                        )}
                      </section>
                      <section className="section">
                        <h4>组合地物</h4>
                        <p className="tileset-inspector-copy">
                          此处管理原始瓦片素材。组合模板由地图工作区的独立组合库管理，不写入瓦片图像文件。
                        </p>
                      </section>
                    </>
                  ),
                },
                {
                  id: 'references',
                  label: '引用',
                  count: removalComplete ? removalReferenceCount : undefined,
                  panel: (
                    <section className="section tileset-inspector-actions">
                      <DsReferencePanel
                        state={removalPanelState}
                        count={
                          removalComplete
                            ? { kind: 'exact', value: removalReferenceCount }
                            : { kind: 'at-least', value: removalReferenceCount }
                        }
                        impact={{
                          kind: 'blocking',
                          description: mapReferenceBatch.failures.length
                            ? `${mapReferenceBatch.failures.length} 张地图读取失败，已保守禁止移除。`
                            : mapReferenceBatch.running
                              ? `已检查 ${mapReferenceBatch.completed}/${mapReferenceBatch.total} 张地图。`
                              : !removalComplete
                                ? '移除前必须检查全部已加载和未加载地图，以及组合模板的硬引用。'
                                : removalReferenceCount
                                  ? '先处理地图和组合模板中的引用，再重新检查。'
                                  : '全部地图与组合模板均未引用此瓦片集。',
                        }}
                      >
                        {removalMapReferences.length ? (
                          <DsReferenceGroup title="引用地图" count={removalMapReferences.length}>
                            <DsReferenceList>
                              {removalMapReferences.map((reference) => (
                                <DsReferenceRow
                                  key={reference.id}
                                  title={reference.source.label}
                                  detail={reference.detail}
                                  path={reference.where}
                                  action={
                                    onOpenReference
                                      ? {
                                          label: '打开',
                                          ariaLabel: `打开${reference.source.label}`,
                                          onActivate: () => onOpenReference(reference),
                                        }
                                      : undefined
                                  }
                                  status={
                                    onOpenReference
                                      ? undefined
                                      : {
                                          label: '暂不可定位',
                                          reason: '当前宿主没有提供地图定位能力。',
                                          tone: 'warning',
                                        }
                                  }
                                />
                              ))}
                            </DsReferenceList>
                          </DsReferenceGroup>
                        ) : null}
                        {removalStampReferences.length ? (
                          <DsReferenceGroup
                            title="引用组合模板"
                            count={removalStampReferences.length}
                          >
                            <DsReferenceList>
                              {removalStampReferences.map((reference) => (
                                <DsReferenceRow
                                  key={reference.id}
                                  title={reference.source.label}
                                  detail={reference.detail}
                                  path={reference.where}
                                  action={
                                    onOpenReference
                                      ? {
                                          label: '打开',
                                          ariaLabel: `打开${reference.source.label}`,
                                          onActivate: () => onOpenReference(reference),
                                        }
                                      : undefined
                                  }
                                  status={
                                    onOpenReference
                                      ? undefined
                                      : {
                                          label: '暂不可定位',
                                          reason: '当前宿主没有提供组合模板定位能力。',
                                          tone: 'warning',
                                        }
                                  }
                                />
                              ))}
                            </DsReferenceList>
                          </DsReferenceGroup>
                        ) : null}
                      </DsReferencePanel>
                      {!removalComplete ? (
                        <DsPressable
                          type="button"
                          className="tileset-secondary-action"
                          disabled={mapReferenceBatch.running}
                          onClick={() => void scanRemovalReferences()}
                        >
                          {mapReferenceBatch.failures.length ? '重试扫描' : '继续扫描'}
                        </DsPressable>
                      ) : null}
                    </section>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className="insp-empty">选择瓦片集后查看登记信息。</div>
        )}
        {err && (
          <div className="tileset-error" role="alert">
            {err}
          </div>
        )}
      </DsInspectorHost>
    </>
  )
}

/** 条目预览:瓦片网格(内存字节优先,已落盘走资产加载)。 */
function TilesetPreview(props: {
  def: TilesetDef
  revision: string
  assetReader: EditorAssetReader
  palette: Palette
  actions?: ReactNode
}) {
  const { def, revision, assetReader, palette } = props
  const [frames, setFrames] = useState<RleFrame[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    const loadRevision = revision
    setFrames(null)
    setErr('')
    void (async () => {
      try {
        const map = await loadTilesetAsset(assetReader, def.asset)
        if (alive && assetReader.record(def.asset, 'tileset').sha256 === loadRevision)
          setFrames([...map.values()])
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetReader, def.asset, revision])
  return (
    <div className="tileset-workspace-scroll">
      <DsObjectHero
        eyebrow="瓦片集预览"
        title={def.name}
        objectId={def.id}
        meta={<DsTag tone="neutral">{categoryLabel(def.category)}</DsTag>}
        actions={props.actions}
      />
      {frames ? (
        <PagedFrameGrid frames={frames} palette={palette} />
      ) : err ? (
        <div className="tileset-preview-error" role="alert">
          {err}
        </div>
      ) : (
        <div className="tileset-preview-loading">正在载入瓦片…</div>
      )}
    </div>
  )
}
