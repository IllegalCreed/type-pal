/**
 * 瓦片集库页(数据模式,W7B)—— 注册表一览 + 上传向导。
 *
 * 上传流(终案):选 PNG → 网格切片参数 → 量化贴盘 0 预览(D25:量化是内部机制,
 * UI 文案不出现「调色板」)→ 命名/分类 → 入库(编码原版同构 .rle + gzip,保存时落盘)。
 * 预览分流:新上传未保存的条目从内存字节解码;已落盘的走 loadTilesetByPath。
 */

import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  decompressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  loadTilesetByPath,
  parseSpriteChunk,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AddTilesetCommand, RemoveTilesetCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'

const FRAME_PAGE_SIZE = 128

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
  tilesetBlobs: EditorState['tilesetBlobs']
  assetBase: AssetBase
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { tilesets, tilesetBlobs, assetBase, session, tabBar } = props
  const [selectedId, setSelectedId] = useState<string | null>(tilesets[0]?.id ?? null)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tileW, setTileW] = useState(32)
  const [tileH, setTileH] = useState(16)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('outdoor')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchId = useId()
  const categoryId = useId()
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

  useEffect(() => {
    if (selectedId && tilesets.some((tileset) => tileset.id === selectedId)) return
    setSelectedId(tilesets[0]?.id ?? null)
  }, [selectedId, tilesets])

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
    const id = newId.trim()
    if (!id || id.includes('/')) {
      setErr("id 不能为空且不得含 '/'")
      return
    }
    if (tilesets.some((t) => t.id === id)) {
      setErr(`id "${id}" 已存在`)
      return
    }
    try {
      const chunk = encodeSpriteChunk(quantized)
      const gz = await compressGzip(chunk)
      const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
      session.dispatch(
        new AddTilesetCommand(
          {
            id,
            name: newName.trim() || id,
            category: newCategory.trim() || 'misc',
            path: `assets/tilesets/${id}.rle`,
          },
          buf,
        ),
      )
      setUploading(false)
      setDraft(null)
      setSelectedId(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <div className="outliner data-outliner tileset-outliner">
        {tabBar}
        <div className="pane-h tileset-library-head">
          <span className="t">瓦片集</span>
          <span className="spacer" />
          <span className="tileset-library-count">
            {shownTilesets.length}/{tilesets.length}
          </span>
          <button
            type="button"
            className="mini-txt"
            title="上传 PNG、WebP 或 GIF 图集"
            onClick={() => {
              setUploading(true)
              setDraft(null)
              setErr('')
            }}
          >
            ＋ 上传图集
          </button>
        </div>
        <div className="tileset-library-tools">
          <label className="tileset-search-field" htmlFor={searchId}>
            <span className="tileset-search-icon" aria-hidden="true" />
            <input
              id={searchId}
              className="in"
              type="search"
              aria-label="搜索瓦片集"
              autoComplete="off"
              placeholder="搜索名称或 ID…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <label className="tileset-category-filter" htmlFor={categoryId}>
            <span>分类</span>
            <select
              id={categoryId}
              className="in"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">全部分类</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            <header className="tileset-workspace-head">
              <div>
                <span className="tileset-eyebrow">导入预览</span>
                <h2>{draft?.fileName ?? '上传瓦片图集'}</h2>
                <p>选择图片后按网格切片，预览结果就是入库后的瓦片。</p>
              </div>
              <button
                type="button"
                className="tileset-file-button"
                onClick={() => fileRef.current?.click()}
              >
                {draft ? '更换文件' : '选择图集'}
              </button>
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
            </header>
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
            key={selected.id}
            def={selected}
            blob={tilesetBlobs[selected.path]}
            assetBase={assetBase}
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

      <aside className="inspector tileset-inspector">
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
                  onChange={(event) => setTileW(Math.floor(event.target.valueAsNumber) || 0)}
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
                  onChange={(event) => setTileH(Math.floor(event.target.valueAsNumber) || 0)}
                />
              </div>
              <div className="tileset-cut-summary">
                {draft ? `将切出 ${quantized.length} 块瓦片` : '选择文件后显示切片结果'}
              </div>
            </section>
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
                入库瓦片集
              </button>
              <button
                type="button"
                className="tileset-secondary-action"
                onClick={() => {
                  setUploading(false)
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
            <section className="section">
              <h4>登记信息</h4>
              <div className="field">
                <span className="field-label">ID</span>
                <div className="in mono tileset-readonly">{selected.id}</div>
              </div>
              <div className="field">
                <span className="field-label">分类</span>
                <div className="in tileset-readonly">{categoryLabel(selected.category)}</div>
              </div>
              <div className="field tileset-path-field">
                <span className="field-label">文件</span>
                <div className="in mono tileset-readonly" title={selected.path}>
                  {selected.path}
                </div>
              </div>
              {tilesetBlobs[selected.path] && (
                <div className="tileset-source-note">尚未保存；保存工程后写入资产目录。</div>
              )}
            </section>
            <section className="section">
              <h4>组合地物</h4>
              <p className="tileset-inspector-copy">
                此处管理原始瓦片素材。组合图章将由地图工作区的独立图章库管理，不写入瓦片图像文件。
              </p>
            </section>
            <section className="section tileset-inspector-actions">
              <button
                type="button"
                className="tileset-danger-action"
                title="从注册表移除；操作可撤销"
                onClick={() => {
                  setErr('')
                  try {
                    session.dispatch(new RemoveTilesetCommand(selected.id))
                    setSelectedId(null)
                  } catch (cause) {
                    setErr(cause instanceof Error ? cause.message : String(cause))
                  }
                }}
              >
                移除条目
              </button>
            </section>
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
  blob: ArrayBuffer | undefined
  assetBase: AssetBase
  palette: Palette
}) {
  const { def, blob, assetBase, palette } = props
  const [frames, setFrames] = useState<RleFrame[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (blob) {
          const raw = await decompressGzip(new Blob([blob]))
          if (alive) setFrames(parseSpriteChunk(raw))
        } else {
          const map = await loadTilesetByPath(assetBase, def.path)
          if (alive) setFrames([...map.values()])
        }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [def.path, blob, assetBase])
  return (
    <div className="tileset-workspace-scroll">
      <header className="tileset-workspace-head">
        <div>
          <span className="tileset-eyebrow">瓦片集预览</span>
          <h2>{def.name}</h2>
          <p className="mono">{def.id}</p>
        </div>
        <span className="tileset-workspace-badge">{categoryLabel(def.category)}</span>
      </header>
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
