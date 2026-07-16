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
import { useEffect, useMemo, useRef, useState } from 'react'
import { AddTilesetCommand, RemoveTilesetCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'

/** 瓦片帧网格预览(bake 后贴 canvas;量化预览与条目详情共用)。 */
function FrameGrid(props: { frames: RleFrame[]; palette: Palette; cap?: number }) {
  const { frames, palette, cap = 128 } = props
  const shown = frames.slice(0, cap)
  return (
    <div className="tile-grid">
      {shown.map((f, i) => (
        <span key={`${i}:${f.width}x${f.height}`} className="tile-pick">
          <button type="button" disabled>
            <FrameThumb frame={f} palette={palette} idx={i} />
          </button>
        </span>
      ))}
      {frames.length > cap && (
        <span className="hint2">
          …共 {frames.length} 块(预览前 {cap})
        </span>
      )}
    </div>
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
  return (
    <canvas
      ref={ref}
      className="tile-cell"
      width={frame.width}
      height={frame.height}
      title={`#${idx} ${frame.width}×${frame.height}`}
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tileW, setTileW] = useState(32)
  const [tileH, setTileH] = useState(16)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('outdoor')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const selected = tilesets.find((t) => t.id === selectedId) ?? null

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
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">瓦片集</span>
          <span className="spacer" />
          <button
            type="button"
            className="mini-txt"
            title="上传 PNG 图集,切片并自动贴合工程主色风格"
            onClick={() => {
              setUploading(true)
              setSelectedId(null)
              setDraft(null)
              setErr('')
            }}
          >
            ＋ 上传图集
          </button>
        </div>
        <div className="tree">
          {tilesets.length === 0 && <div className="hint2 pad">尚无条目;「＋ 上传图集」入库。</div>}
          {tilesets.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`row${selectedId === t.id ? ' sel' : ''}`}
              onClick={() => {
                setSelectedId(t.id)
                setUploading(false)
              }}
            >
              <span className="ico">🧱</span>
              <span className="nm">{t.name}</span>
              <span className="tag">{t.category}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="center dpane">
        {uploading ? (
          <div className="dscroll">
            <h3>上传图集</h3>
            <p className="hint2">
              选 PNG → 按网格切片 → 自动贴合工程主色风格(全彩会被近似到原版同一色系)→ 入库。
              套件型素材(可平铺瓦 + 过渡件)复用率最高;整图切片仅适合一次性地标。
            </p>
            <div className="field">
              <span className="field-label">图集文件</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void pickFile(f)
                }}
              />
            </div>
            {draft && (
              <>
                <div className="field">
                  <span className="field-label">原图</span>
                  <span className="mono">
                    {draft.fileName} · {draft.imgW}×{draft.imgH}
                  </span>
                </div>
                <img src={draft.srcUrl} alt="原图预览" className="atlas-preview" />
                <div className="field">
                  <span className="field-label">切片尺寸</span>
                  <span className="size-edit">
                    <input
                      className="in mono"
                      type="number"
                      min={1}
                      max={400}
                      value={tileW}
                      title="瓦宽(px);原版菱形瓦 32"
                      onChange={(e) => setTileW(Math.floor(e.target.valueAsNumber) || 0)}
                    />
                    ×
                    <input
                      className="in mono"
                      type="number"
                      min={1}
                      max={400}
                      value={tileH}
                      title="瓦高(px);原版菱形瓦 15,可含高物更高"
                      onChange={(e) => setTileH(Math.floor(e.target.valueAsNumber) || 0)}
                    />
                    <span className="hint2">→ 切出 {quantized.length} 块</span>
                  </span>
                </div>
                {palette && quantized.length > 0 && (
                  <>
                    <div className="field">
                      <span className="field-label">入库预览</span>
                      <span className="hint2">已贴合工程主色(所见即入库)</span>
                    </div>
                    <FrameGrid frames={quantized} palette={palette} />
                  </>
                )}
                <div className="field">
                  <span className="field-label">ID</span>
                  <input
                    className="in mono"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="kebab-case,唯一"
                  />
                </div>
                <div className="field">
                  <span className="field-label">名称</span>
                  <input
                    className="in"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <span className="field-label">分类</span>
                  <input
                    className="in"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="outdoor / indoor / dungeon …"
                  />
                </div>
                <button type="button" className="tool" onClick={() => void submit()}>
                  ✓ 入库
                </button>
              </>
            )}
            {err && <div className="err">{err}</div>}
          </div>
        ) : selected && palette ? (
          <TilesetDetail
            key={selected.id}
            def={selected}
            blob={tilesetBlobs[selected.path]}
            assetBase={assetBase}
            palette={palette}
            onRemove={() => {
              session.dispatch(new RemoveTilesetCommand(selected.id))
              setSelectedId(null)
            }}
          />
        ) : (
          <div className="dscroll">
            <p className="hint2 pad">左侧选择瓦片集，或上传新图集。</p>
            {err && <div className="err">{err}</div>}
          </div>
        )}
      </div>
    </>
  )
}

/** 条目详情:元信息 + 瓦片网格(内存字节优先,已落盘走资产加载)。 */
function TilesetDetail(props: {
  def: TilesetDef
  blob: ArrayBuffer | undefined
  assetBase: AssetBase
  palette: Palette
  onRemove: () => void
}) {
  const { def, blob, assetBase, palette, onRemove } = props
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
    <div className="dscroll">
      <h3>{def.name}</h3>
      <div className="field">
        <span className="field-label">ID</span>
        <span className="mono">{def.id}</span>
      </div>
      <div className="field">
        <span className="field-label">分类</span>
        <span className="mono">{def.category}</span>
      </div>
      <div className="field">
        <span className="field-label">文件</span>
        <span className="mono map-file">{def.path}</span>
      </div>
      {blob && <p className="hint2">(新上传,保存工程后落盘)</p>}
      {frames ? (
        <>
          <div className="field">
            <span className="field-label">瓦片</span>
            <span className="mono">{frames.length} 块</span>
          </div>
          <FrameGrid frames={frames} palette={palette} />
        </>
      ) : err ? (
        <div className="err">{err}</div>
      ) : (
        <p className="hint2">载入中…</p>
      )}
      <button type="button" className="tool danger" onClick={onRemove}>
        🗑 移除条目
      </button>
    </div>
  )
}
