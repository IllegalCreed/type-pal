/**
 * 瓦片集库页(数据模式,W7B)—— 注册表一览 + 上传向导。
 *
 * 上传流(终案):选 PNG → 网格切片参数 → 量化贴盘 0 预览(D25:量化是内部机制,
 * UI 文案不出现「调色板」)→ 命名/分类 → 入库(编码原版同构 .rle + gzip,保存时落盘)。
 * 预览分流:新上传未保存的条目从内存字节解码;已落盘的走 loadTilesetByPath。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  decompressGzip,
  encodeSpriteChunk,
  loadPalette,
  loadTilesetByPath,
  parseSpriteChunk,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { AddTilesetCommand, RemoveTilesetCommand, UpdateTilesetTileHeightCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'

/** 瓦片帧网格预览(bake 后贴 canvas;量化预览与条目详情共用)。 */
function FrameGrid(props: {
  frames: RleFrame[]
  palette: Palette
  cap?: number
  /** 可选点选(详情页标高度用;量化预览不传 = 纯展示)。 */
  selectedIdx?: number | null
  onPick?: (idx: number) => void
  /** 角标:瓦片高度标注(idx → height;详情页显示)。 */
  badges?: ReadonlyMap<number, number>
}) {
  const { frames, palette, cap = 128, selectedIdx, onPick, badges } = props
  const shown = frames.slice(0, cap)
  return (
    <div className="tile-grid">
      {shown.map((f, i) => (
        <span key={`${i}:${f.width}x${f.height}`} className={`tile-pick${selectedIdx === i ? ' sel' : ''}`}>
          <span
            role={onPick ? 'button' : undefined}
            onClick={onPick ? () => onPick(i) : undefined}
            onKeyDown={onPick ? (e) => e.key === 'Enter' && onPick(i) : undefined}
            tabIndex={onPick ? 0 : undefined}
          >
            <FrameThumb frame={f} palette={palette} idx={i} />
          </span>
          {badges?.has(i) && <span className="tile-badge" title="遮挡格高">{badges.get(i)}</span>}
        </span>
      ))}
      {frames.length > cap && <span className="hint2">…共 {frames.length} 块(预览前 {cap})</span>}
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
    loadPalette(assetBase, 0)
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
      const base = file.name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
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
              <label>图集文件</label>
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
                  <label>原图</label>
                  <span className="mono">
                    {draft.fileName} · {draft.imgW}×{draft.imgH}
                  </span>
                </div>
                <img src={draft.srcUrl} alt="原图预览" className="atlas-preview" />
                <div className="field">
                  <label>切片尺寸</label>
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
                      <label>入库预览</label>
                      <span className="hint2">已贴合工程主色(所见即入库)</span>
                    </div>
                    <FrameGrid frames={quantized} palette={palette} />
                  </>
                )}
                <div className="field">
                  <label>ID</label>
                  <input
                    className="in mono"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="kebab-case,唯一"
                  />
                </div>
                <div className="field">
                  <label>名称</label>
                  <input className="in" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="field">
                  <label>分类</label>
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
            session={session}
            onRemove={() => {
              session.dispatch(new RemoveTilesetCommand(selected.id))
              setSelectedId(null)
            }}
          />
        ) : (
          <div className="dscroll">
            <p className="hint2 pad">
              左侧选条目看瓦片;「＋ 上传图集」入库新素材。原版地图借用的 tileset 不在此列
              (它们随复用地图走,不占库位)。
            </p>
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
  session: EditSession
  onRemove: () => void
}) {
  const { def, blob, assetBase, palette, session, onRemove } = props
  const [frames, setFrames] = useState<RleFrame[] | null>(null)
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const heights = new Map<number, number>()
  def.tiles?.forEach((m, i) => {
    if (m.height !== undefined) heights.set(i, m.height)
  })
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
        <label>ID</label>
        <span className="mono">{def.id}</span>
      </div>
      <div className="field">
        <label>分类</label>
        <span className="mono">{def.category}</span>
      </div>
      <div className="field">
        <label>文件</label>
        <span className="mono map-file">{def.path}</span>
      </div>
      {blob && <p className="hint2">(新上传,保存工程后落盘)</p>}
      {frames ? (
        <>
          <div className="field">
            <label>瓦片</label>
            <span className="mono">{frames.length} 块</span>
            <span className="hint2">点瓦标遮挡高度,单位=半格8px(一格高家具=2;三格高墙:墙脚2/墙身4/墙顶6;0=纯地面不遮挡;不标=1)</span>
          </div>
          <FrameGrid
            frames={frames}
            palette={palette}
            selectedIdx={selIdx}
            onPick={(i) => setSelIdx(i)}
            badges={heights}
          />
          {selIdx !== null && (
            <div className="field">
              <label>#{selIdx} 高度</label>
              <input
                key={`h:${selIdx}:${heights.get(selIdx) ?? ''}`}
                className="in mono"
                type="number"
                min={0}
                max={15}
                placeholder="1(缺省)"
                defaultValue={heights.get(selIdx) ?? ''}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  const v = raw === '' ? undefined : Math.max(0, Math.min(15, Math.floor(Number(raw))))
                  if (v !== heights.get(selIdx))
                    session.dispatch(new UpdateTilesetTileHeightCommand(def.id, selIdx, v))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
              />
            </div>
          )}
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
