/**
 * 瓦片集库页(数据模式,W7B)—— 注册表一览 + 上传向导。
 *
 * 上传流(终案):选 PNG → 网格切片参数 → 量化贴盘 0 预览(D25:量化是内部机制,
 * UI 文案不出现「调色板」)→ 命名/分类 → 入库(编码原版同构 .rle + gzip,保存时落盘)。
 * 新上传与已落盘资源统一经 EditorAssetReader + AssetId 读取；record.sha256 驱动缓存失效。
 */

import type { AssetCatalogV1, AssetRecordV1, MapIndexV1, StampTemplate } from '@type-pal/content'
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
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  scanTilesetReferences,
  type TilesetReferenceScan,
  TilesetRemovalProof,
  TilesetReplacementProof,
} from '../core/tileset-references.js'
import {
  DsButton,
  DsCatalogControls,
  DsInspectorTabs,
  DsObjectHero,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsTag,
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
            <button
              type="button"
              aria-label="上一页瓦片"
              disabled={safePage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              ‹
            </button>
            <span className="mono">
              {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              aria-label="下一页瓦片"
              disabled={safePage === pageCount - 1}
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            >
              ›
            </button>
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
  stamps: readonly StampTemplate[]
  tabBar?: React.ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenMap?: (id: string) => void
  onOpenStamp?: (id: string) => void
}) {
  const {
    tilesets,
    assetCatalog,
    assetReader,
    assetBase,
    session,
    mapIndex,
    stamps,
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenMap,
    onOpenStamp,
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
  const [removalScan, setRemovalScan] = useState<TilesetReferenceScan>()
  const [replacementScan, setReplacementScan] = useState<TilesetReferenceScan>()
  const [removalScanning, setRemovalScanning] = useState(false)
  const removalScanTokenRef = useRef(0)
  const [palette, setPalette] = useState<Palette | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const tileWidthId = useId()
  const tileHeightId = useId()
  const newIdId = useId()
  const newNameId = useId()
  const newCategoryId = useId()

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

  useEffect(() => {
    void mapIndex
    void selectedId
    void session
    void stamps
    removalScanTokenRef.current += 1
    setRemovalScan(undefined)
    setRemovalScanning(false)
  }, [mapIndex, selectedId, session, stamps])

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
  const replacementOutOfRangeMaps =
    replacementScan?.mapReferences.filter((entry) => entry.maxTileId >= quantized.length) ?? []
  const replacementOutOfRangeStamps =
    replacementScan?.stampReferences.filter((entry) => entry.maxTileId >= quantized.length) ?? []

  const pickFile = async (file: File): Promise<void> => {
    setErr('')
    setReplacementScan(undefined)
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
        const oldRecord = assetCatalog.assets[target.asset]
        if (!oldRecord || oldRecord.kind !== 'tileset') throw new Error('待替换资源不在 catalog')
        const scan = await scanTilesetReferences({
          tilesetId: target.id,
          tilesetIds: tilesets
            .filter((entry) => entry.asset === target.asset)
            .map((entry) => entry.id),
          mapIndex,
          stamps,
          loadMap: (mapId) => session.ensureMapLoaded(mapId),
        })
        setReplacementScan(scan)
        const proof = TilesetReplacementProof.fromScan(scan, mapIndex, quantized.length, {
          asset: target.asset,
          previousSha256: oldRecord.sha256,
          definitions: tilesets.filter((entry) => entry.asset === target.asset),
        })
        const previousBytes = await assetReader.readBytes(target.asset, 'tileset')
        const record: AssetRecordV1 = {
          ...oldRecord,
          path,
          bytes: buf.byteLength,
          sha256: hash,
          mediaType: 'application/vnd.type-pal.rle',
          origin: { kind: 'authored' },
        }
        session.dispatch(
          new ReplaceTilesetAssetCommand(
            target.id,
            target.asset,
            record,
            buf,
            previousBytes,
            proof,
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
      setReplacementScan(undefined)
      setDraft(null)
      setSelectedId(id)
      onObjectFocus?.(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const scanRemovalReferences = async (): Promise<void> => {
    if (!selected) return
    const token = removalScanTokenRef.current + 1
    removalScanTokenRef.current = token
    setErr('')
    setRemovalScanning(true)
    setRemovalScan(undefined)
    const result = await scanTilesetReferences({
      tilesetId: selected.id,
      mapIndex,
      stamps,
      loadMap: (mapId) => session.ensureMapLoaded(mapId),
      onProgress: (progress) => {
        if (removalScanTokenRef.current === token) setRemovalScan(progress)
      },
    })
    if (removalScanTokenRef.current !== token) return
    setRemovalScan(result)
    setRemovalScanning(false)
  }

  const removeSelected = async (): Promise<void> => {
    if (!selected || !removalScan) return
    try {
      const proof = TilesetRemovalProof.fromScan(removalScan, mapIndex)
      const nextId = tilesets.find((candidate) => candidate.id !== selected.id)?.id
      const bytes =
        selectedRecord && sharedDefinitions.length === 1
          ? await assetReader.readBytes(selected.asset, 'tileset')
          : undefined
      session.dispatch(new RemoveTilesetCommand(selected.id, proof, bytes))
      setSelectedId(nextId ?? null)
      onObjectFocus?.(nextId)
      setRemovalScan(undefined)
      setErr('')
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : String(cause))
      setRemovalScan(undefined)
    }
  }

  const removalComplete = Boolean(
    removalScan?.done &&
      removalScan.failures.length === 0 &&
      removalScan.completed === removalScan.total,
  )
  const removalHasReferences = Boolean(
    removalScan && (removalScan.mapReferences.length > 0 || removalScan.stampReferences.length > 0),
  )
  const removalReferenceCount = removalScan
    ? removalScan.mapReferences.length + removalScan.stampReferences.length
    : 0
  const removalPanelState = !removalScan
    ? 'partial'
    : removalScanning
      ? 'loading'
      : removalScan.failures.length
        ? 'partial'
        : removalComplete && removalReferenceCount === 0
          ? 'empty'
          : 'ready'

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
                setReplacementScan(undefined)
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
            <button
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
            </button>
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
            <input
              ref={fileRef}
              type="file"
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
              <button
                type="button"
                className="tileset-upload-empty"
                onClick={() => fileRef.current?.click()}
              >
                <span aria-hidden="true">▦</span>
                <strong>选择一张瓦片图集</strong>
                <small>支持 PNG、WebP、GIF；导入后按网格切片。</small>
              </button>
            )}
          </div>
        ) : selected && palette ? (
          <TilesetPreview
            key={`${selected.asset}:${selectedRecord?.sha256 ?? 'missing'}`}
            def={selected}
            revision={selectedRecord?.sha256 ?? 'missing'}
            assetReader={assetReader}
            palette={palette}
          />
        ) : (
          <div className="tileset-workspace-empty">
            <span aria-hidden="true">◆</span>
            <strong>{palette ? '选择瓦片集' : '正在准备瓦片预览…'}</strong>
            <small>
              {palette ? '从左侧资源库选择，或上传新的图集。' : '正在读取工程色彩资源。'}
            </small>
          </div>
        )}
      </div>

      <aside
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
              <div className="field">
                <label className="field-label" htmlFor={tileWidthId}>
                  瓦宽
                </label>
                <input
                  id={tileWidthId}
                  className="in mono"
                  type="number"
                  min={1}
                  max={400}
                  inputMode="numeric"
                  autoComplete="off"
                  value={tileW}
                  onChange={(event) => {
                    setTileW(Math.floor(event.target.valueAsNumber) || 0)
                    setReplacementScan(undefined)
                  }}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor={tileHeightId}>
                  瓦高
                </label>
                <input
                  id={tileHeightId}
                  className="in mono"
                  type="number"
                  min={1}
                  max={400}
                  inputMode="numeric"
                  autoComplete="off"
                  value={tileH}
                  onChange={(event) => {
                    setTileH(Math.floor(event.target.valueAsNumber) || 0)
                    setReplacementScan(undefined)
                  }}
                />
              </div>
              <div className="tileset-cut-summary">
                {draft ? `将切出 ${quantized.length} 块瓦片` : '选择文件后显示切片结果'}
              </div>
            </section>
            {replaceTargetId &&
            replacementScan &&
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
                            onOpenMap
                              ? {
                                  label: '打开 ↗',
                                  onActivate: () => onOpenMap(reference.mapId),
                                }
                              : undefined
                          }
                          status={
                            onOpenMap
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
                            onOpenStamp
                              ? {
                                  label: '打开 ↗',
                                  onActivate: () => onOpenStamp(reference.id),
                                }
                              : undefined
                          }
                          status={
                            onOpenStamp
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
              <div className="field">
                <label className="field-label" htmlFor={newIdId}>
                  ID
                </label>
                <input
                  id={newIdId}
                  className="in mono"
                  autoComplete="off"
                  spellCheck={false}
                  value={newId}
                  onChange={(event) => setNewId(event.target.value)}
                  placeholder="例如 forest-set…"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor={newNameId}>
                  名称
                </label>
                <input
                  id={newNameId}
                  className="in"
                  autoComplete="off"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="例如 森林套件…"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor={newCategoryId}>
                  分类
                </label>
                <input
                  id={newCategoryId}
                  className="in"
                  autoComplete="off"
                  spellCheck={false}
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="例如 outdoor…"
                />
              </div>
            </section>
            <section className="section tileset-inspector-actions">
              <button
                type="button"
                className="tileset-primary-action"
                disabled={!draft || quantized.length === 0 || !palette}
                onClick={() => void submit()}
              >
                {replaceTargetId ? '替换瓦片集图像' : '入库瓦片集'}
              </button>
              <button
                type="button"
                className="tileset-secondary-action"
                onClick={() => {
                  setUploading(false)
                  setReplaceTargetId(undefined)
                  setReplacementScan(undefined)
                  setDraft(null)
                  setErr('')
                }}
              >
                取消上传
              </button>
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
                        <div className="field">
                          <span className="field-label">ID</span>
                          <div className="in mono tileset-readonly">{selected.id}</div>
                        </div>
                        <div className="field">
                          <span className="field-label">名称</span>
                          <input
                            className="in"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                          />
                        </div>
                        <div className="field">
                          <span className="field-label">分类</span>
                          <input
                            className="in"
                            value={editCategory}
                            onChange={(event) => setEditCategory(event.target.value)}
                          />
                        </div>
                        <div className="field tileset-path-field">
                          <span className="field-label">文件</span>
                          <div className="in mono tileset-readonly" title={selectedRecord?.path}>
                            {selectedRecord?.path ?? 'catalog 缺失'}
                          </div>
                        </div>
                        {selectedRecord && session.getState().assetBlobs[selectedRecord.path] && (
                          <div className="tileset-source-note">
                            尚未保存；保存工程后写入资产目录。
                          </div>
                        )}
                        <DsButton
                          size="compact"
                          variant="secondary"
                          disabled={!editName.trim() || !editCategory.trim()}
                          onClick={() =>
                            session.dispatch(
                              new UpdateTilesetMetadataCommand(selected.id, {
                                name: editName.trim(),
                                category: editCategory.trim(),
                              }),
                            )
                          }
                        >
                          保存名称与分类
                        </DsButton>
                      </section>
                      <section className="section">
                        <h4>组合地物</h4>
                        <p className="tileset-inspector-copy">
                          此处管理原始瓦片素材。组合模板由地图工作区的独立组合库管理，不写入瓦片图像文件。
                        </p>
                      </section>
                      <section className="section tileset-inspector-actions">
                        <DsButton
                          size="compact"
                          variant="secondary"
                          disabled={!selectedRecord}
                          onClick={() => {
                            if (
                              sharedDefinitions.length > 1 &&
                              !window.confirm(
                                `这份图像由 ${sharedDefinitions.map((entry) => entry.name).join('、')} 共同使用。替换会同时更新全部定义，是否继续？`,
                              )
                            )
                              return
                            setReplaceTargetId(selected.id)
                            setReplacementScan(undefined)
                            setUploading(true)
                            setDraft(null)
                            setNewId(selected.id)
                            setNewName(selected.name)
                            setNewCategory(selected.category)
                            setErr('')
                          }}
                        >
                          替换图像
                          {sharedDefinitions.length > 1
                            ? `（影响 ${sharedDefinitions.length} 个定义）`
                            : ''}
                        </DsButton>
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
                            : removalScan
                              ? { kind: 'at-least', value: removalReferenceCount }
                              : { kind: 'unknown' }
                        }
                        impact={{
                          kind: 'blocking',
                          description: !removalScan
                            ? '移除前必须检查全部已加载和未加载地图，以及组合模板的硬引用。'
                            : removalScan.failures.length
                              ? `${removalScan.failures.length} 张地图读取失败，已保守禁止移除。`
                              : removalScanning
                                ? `已检查 ${removalScan.completed}/${removalScan.total} 张地图。`
                                : removalReferenceCount
                                  ? '先处理地图和组合模板中的引用，再重新检查。'
                                  : '全部地图与组合模板均未引用此瓦片集。',
                        }}
                      >
                        {removalScan?.mapReferences.length ? (
                          <DsReferenceGroup
                            title="引用地图"
                            count={removalScan.mapReferences.length}
                          >
                            <DsReferenceList>
                              {removalScan.mapReferences.map((reference) => (
                                <DsReferenceRow
                                  key={reference.mapId}
                                  title={reference.mapName}
                                  detail={reference.mapId}
                                  path={reference.path}
                                  action={
                                    onOpenMap
                                      ? {
                                          label: '打开 ↗',
                                          ariaLabel: `打开地图 ${reference.mapId}`,
                                          onActivate: () => onOpenMap(reference.mapId),
                                        }
                                      : undefined
                                  }
                                  status={
                                    onOpenMap
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
                        {removalScan?.stampReferences.length ? (
                          <DsReferenceGroup
                            title="引用组合模板"
                            count={removalScan.stampReferences.length}
                          >
                            <DsReferenceList>
                              {removalScan.stampReferences.map((reference) => (
                                <DsReferenceRow
                                  key={reference.id}
                                  title={reference.name}
                                  path={reference.id}
                                  action={
                                    onOpenStamp
                                      ? {
                                          label: '打开 ↗',
                                          ariaLabel: `打开组合 ${reference.id}`,
                                          onActivate: () => onOpenStamp(reference.id),
                                        }
                                      : undefined
                                  }
                                  status={
                                    onOpenStamp
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
                      <button
                        type="button"
                        className="tileset-danger-action"
                        title="检查全工程引用后从注册表移除；操作可撤销"
                        disabled={removalScanning}
                        onClick={() =>
                          removalComplete && !removalHasReferences
                            ? void removeSelected()
                            : void scanRemovalReferences()
                        }
                      >
                        {removalScanning
                          ? `正在检查 ${removalScan?.completed ?? 0}/${removalScan?.total ?? mapIndex.maps.length}`
                          : removalComplete && !removalHasReferences
                            ? '确认移除未引用条目'
                            : removalScan
                              ? '重新检查引用'
                              : '检查引用后移除'}
                      </button>
                      {removalScan ? (
                        <button
                          type="button"
                          className="tileset-secondary-action"
                          onClick={() => {
                            removalScanTokenRef.current += 1
                            setRemovalScan(undefined)
                            setRemovalScanning(false)
                            setErr('')
                          }}
                        >
                          取消移除
                        </button>
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
      </aside>
    </>
  )
}

/** 条目预览:瓦片网格(内存字节优先,已落盘走资产加载)。 */
function TilesetPreview(props: {
  def: TilesetDef
  revision: string
  assetReader: EditorAssetReader
  palette: Palette
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
