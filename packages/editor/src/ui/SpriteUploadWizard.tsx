/**
 * 精灵上传向导(A4;2026-07-11 按作者反馈重构):
 * - **类型先行**:先选素材类型(行走图/循环动画/静物),再选文件 —— 不再"看起来只收行走图"。
 * - 行走图支持**动作帧行**:4 行走路(下/左/上/右)之后可另加 K 行特殊动作帧(接在
 *   4×N 帧之后平铺;入库后到「精灵帧」面板框选命名姿势,poses 体系 C1d)。
 * - 支持**给自有精灵追加帧带**(后补动作不必重传整图):解旧 .rle + 拼新帧 + 重编码,
 *   AppendSpriteFramesCommand 可撤销;命名同样走「精灵帧」面板。
 * 量化贴盘 0 预览(所见即入库);保存工程时落盘 assets/sprites/<id>.rle。
 */
import type { SpriteDef, SpriteLayout } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  decompressGzip,
  encodeSpriteChunk,
  loadPalette,
  loadSprite,
  parseSpriteChunk,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AddSpriteCommand, AppendSpriteFramesCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

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
      // ×2 放大展示(源仍 1:1 入库);pixelated 保点阵
      style={{ width: frame.width * 2, height: frame.height * 2, imageRendering: 'pixelated' }}
      title={`#${idx} ${frame.width}×${frame.height}`}
    />
  )
}

interface Draft {
  fileName: string
  imgW: number
  imgH: number
  rgba: Uint8Array
  srcUrl: string
}

const DIR_LABELS = ['下', '左', '上', '右'] // 行走图 4 行序(FACING_TO_DIR)

const KIND_META: { v: SpriteLayout['kind']; label: string; hint: string }[] = [
  {
    v: 'directional',
    label: '🚶 行走图',
    hint: '4 行 = 下/左/上/右 × 每向 N 帧;可另加动作帧行(挥手/施法等,入库后在「精灵帧」面板框选命名)',
  },
  { v: 'loop', label: '🔥 循环动画', hint: '单行 N 帧自循环(火把/流水/旗帜这类环境动画)' },
  { v: 'static', label: '🪑 静物', hint: '整图一帧(桌椅/罐子/招牌这类不动的物件)' },
]

export function SpriteUploadWizard(props: {
  sprites: SpriteDef[]
  assetBase: AssetBase
  session: EditSession
  /** 未保存的素材字节暂存(追加帧时旧字节从这取;磁盘尚无该文件的场合)。 */
  blobs: Record<string, ArrayBuffer>
  onDone: (newId: string | null) => void
}) {
  const { sprites, assetBase, session, blobs, onDone } = props
  const [mode, setMode] = useState<'new' | 'append'>('new')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [kind, setKind] = useState<SpriteLayout['kind']>('directional')
  const [framesPerDir, setFramesPerDir] = useState(3)
  const [actionRows, setActionRows] = useState(0)
  const [frameCount, setFrameCount] = useState(4)
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)
  // 追加模式:目标精灵 + 新帧网格
  const [appendId, setAppendId] = useState('')
  const [appendCols, setAppendCols] = useState(3)
  const [appendRows, setAppendRows] = useState(1)
  const [existing, setExisting] = useState<RleFrame[] | null>(null)

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

  // 可追加目标 = 自有精灵(有 path;原版号约定精灵不支持续帧)
  const appendables = useMemo(() => sprites.filter((s) => s.path), [sprites])
  const appendTarget = appendables.find((s) => s.id === appendId)

  // 追加模式:载入目标现有帧(未保存字节优先,否则读盘)
  useEffect(() => {
    if (mode !== 'append' || !appendTarget?.path) {
      setExisting(null)
      return
    }
    let alive = true
    setExisting(null)
    const staged = blobs[appendTarget.path]
    void (async () => {
      try {
        const frames = staged
          ? parseSpriteChunk(await decompressGzip(new Blob([staged])))
          : (await loadSprite(assetBase, appendTarget.spriteNum, appendTarget.path)).frames
        if (alive) setExisting(frames)
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [mode, appendTarget, blobs, assetBase])

  // 帧网格推导(布局 → 行列数);整除不了报错提示
  const grid = useMemo(() => {
    if (!draft) return null
    if (mode === 'append') {
      const c = Math.max(1, appendCols)
      const r = Math.max(1, appendRows)
      return draft.imgW % c === 0 && draft.imgH % r === 0
        ? { cols: c, rows: r, w: draft.imgW / c, h: draft.imgH / r }
        : null
    }
    if (kind === 'static') return { cols: 1, rows: 1, w: draft.imgW, h: draft.imgH }
    if (kind === 'loop') {
      const n = Math.max(1, frameCount)
      return draft.imgW % n === 0
        ? { cols: n, rows: 1, w: draft.imgW / n, h: draft.imgH }
        : null
    }
    const n = Math.max(1, framesPerDir)
    const rows = 4 + Math.max(0, actionRows)
    return draft.imgW % n === 0 && draft.imgH % rows === 0
      ? { cols: n, rows, w: draft.imgW / n, h: draft.imgH / rows }
      : null
  }, [draft, mode, kind, framesPerDir, actionRows, frameCount, appendCols, appendRows])

  const quantized = useMemo(() => {
    if (!draft || !palette || !grid) return []
    try {
      return sliceAtlasGrid(draft.rgba, draft.imgW, draft.imgH, grid.w, grid.h).map((t) =>
        quantizeToRleFrame(t.rgba, t.width, t.height, palette),
      )
    } catch {
      return []
    }
  }, [draft, palette, grid])

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
      setNewId((prev) => prev || base || 'sprite')
      setNewLabel((prev) => prev || base || '新精灵')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const submitNew = async (): Promise<void> => {
    if (!draft || quantized.length === 0) return
    const id = newId.trim()
    if (!id || id.includes('/')) {
      setErr("id 不能为空且不得含 '/'")
      return
    }
    if (sprites.some((s) => s.id === id)) {
      setErr(`id "${id}" 已存在`)
      return
    }
    try {
      const chunk = encodeSpriteChunk(quantized)
      const gz = await compressGzip(chunk)
      const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
      const layout: SpriteLayout =
        kind === 'directional'
          ? { kind, framesPerDir: Math.max(1, framesPerDir) }
          : kind === 'loop'
            ? { kind, frameCount: Math.max(1, frameCount) }
            : { kind: 'static' }
      const spriteNum = sprites.reduce((m, s) => Math.max(m, s.spriteNum), -1) + 1
      session.dispatch(
        new AddSpriteCommand(
          { id, spriteNum, label: newLabel.trim() || id, layout, path: `assets/sprites/${id}.rle` },
          buf,
        ),
      )
      onDone(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const submitAppend = async (): Promise<void> => {
    if (!appendTarget?.path || !existing || quantized.length === 0) return
    try {
      const chunk = encodeSpriteChunk([...existing, ...quantized])
      const gz = await compressGzip(chunk)
      const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
      session.dispatch(
        new AppendSpriteFramesCommand(appendTarget.path, blobs[appendTarget.path], buf),
      )
      onDone(appendTarget.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const kindMeta = KIND_META.find((k) => k.v === kind)

  return (
    <div className="dscroll" style={{ padding: '14px 18px' }}>
      <h3>上传精灵</h3>
      <div className="field">
        <label>模式</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={mode === 'new' ? 'tool active' : 'tool'}
            onClick={() => {
              if (mode !== 'new') setDraft(null) // 换模式清草稿(残留旧图会误导切帧)
              setMode('new')
            }}
          >
            ✨ 新建精灵
          </button>
          <button
            type="button"
            className={mode === 'append' ? 'tool active' : 'tool'}
            onClick={() => {
              if (mode !== 'append') setDraft(null)
              setMode('append')
            }}
          >
            ➕ 给现有精灵追加帧
          </button>
        </div>
      </div>

      {mode === 'new' && (
        <div className="field">
          <label>类型</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {KIND_META.map((k) => (
              <button
                type="button"
                key={k.v}
                className={kind === k.v ? 'tool active' : 'tool'}
                onClick={() => setKind(k.v)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'new' && kindMeta && <p className="hint2">{kindMeta.hint}</p>}

      {mode === 'append' && (
        <>
          <div className="field">
            <label>目标精灵</label>
            <select className="in" value={appendId} onChange={(e) => setAppendId(e.target.value)}>
              <option value="">选择…</option>
              {appendables.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label || s.id}
                </option>
              ))}
            </select>
          </div>
          <p className="hint2">
            仅自有上传的精灵可续帧;新帧接在末尾(绝对帧号续排),入库后到「精灵帧」面板
            框选命名动作。
          </p>
          {appendTarget && (
            <div className="field">
              <label>现有帧</label>
              <span className="mono">
                {existing
                  ? `${existing.length} 帧 · 首帧 ${existing[0]?.width ?? 0}×${existing[0]?.height ?? 0}`
                  : '读取中…'}
              </span>
            </div>
          )}
        </>
      )}

      {(mode === 'new' || appendTarget) && (
        <div className="field">
          <label>图片文件</label>
          <input
            type="file"
            accept="image/png,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pickFile(f)
            }}
          />
        </div>
      )}

      {draft && (
        <>
          <div className="field">
            <label>原图</label>
            <span className="mono">
              {draft.fileName} · {draft.imgW}×{draft.imgH}
            </span>
          </div>
          <img src={draft.srcUrl} alt="原图预览" className="atlas-preview" />
          {mode === 'new' && kind === 'directional' && (
            <>
              <div className="field">
                <label>每向帧数</label>
                <input
                  className="in mono"
                  type="number"
                  min={1}
                  max={16}
                  value={framesPerDir}
                  onChange={(e) => setFramesPerDir(Math.floor(e.target.valueAsNumber) || 1)}
                />
                <span className="hint2">原版走姿 3 帧(中间为立姿)</span>
              </div>
              <div className="field">
                <label>动作帧行</label>
                <input
                  className="in mono"
                  type="number"
                  min={0}
                  max={12}
                  value={actionRows}
                  onChange={(e) => setActionRows(Math.max(0, Math.floor(e.target.valueAsNumber) || 0))}
                />
                <span className="hint2">0 = 无;每行同宽,空格留透明即可</span>
              </div>
            </>
          )}
          {mode === 'new' && kind === 'loop' && (
            <div className="field">
              <label>帧数</label>
              <input
                className="in mono"
                type="number"
                min={1}
                max={64}
                value={frameCount}
                onChange={(e) => setFrameCount(Math.floor(e.target.valueAsNumber) || 1)}
              />
            </div>
          )}
          {mode === 'append' && (
            <>
              <div className="field">
                <label>切帧网格</label>
                <input
                  className="in mono"
                  type="number"
                  min={1}
                  max={16}
                  value={appendCols}
                  onChange={(e) => setAppendCols(Math.floor(e.target.valueAsNumber) || 1)}
                  style={{ width: 56 }}
                />
                <span className="hint2">列 ×</span>
                <input
                  className="in mono"
                  type="number"
                  min={1}
                  max={16}
                  value={appendRows}
                  onChange={(e) => setAppendRows(Math.floor(e.target.valueAsNumber) || 1)}
                  style={{ width: 56 }}
                />
                <span className="hint2">行</span>
              </div>
            </>
          )}
          {!grid ? (
            <div className="err">
              图片尺寸切不开:宽须整除列数,高须整除行数(行走图行数 = 4 + 动作帧行)。
            </div>
          ) : (
            <div className="field">
              <label>切帧</label>
              <span className="mono">
                {grid.cols}×{grid.rows} 帧 · 每帧 {grid.w}×{grid.h}
              </span>
            </div>
          )}
          {palette && grid && quantized.length > 0 && (
            <>
              <div className="field">
                <label>入库预览</label>
                <span className="hint2">已贴合工程主色(所见即入库,×2 展示)</span>
              </div>
              {mode === 'new' && kind === 'directional' ? (
                // 按行展示:前 4 行标 下/左/上/右,动作行标 动作 1..K
                <div>
                  {Array.from({ length: grid.rows }, (_, d) => (
                    <div key={`r${d}`} className="sprite-dir-row">
                      <span className="hint2 sprite-dir-label">
                        {d < 4 ? DIR_LABELS[d] : `动作${d - 3}`}
                      </span>
                      <div className="tile-grid">
                        {quantized.slice(d * grid.cols, (d + 1) * grid.cols).map((f, i) => (
                          <FrameThumb
                            key={`${d}-${i}`}
                            frame={f}
                            palette={palette}
                            idx={d * grid.cols + i}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tile-grid">
                  {quantized.map((f, i) => (
                    <FrameThumb
                      key={`f${i}`}
                      frame={f}
                      palette={palette}
                      idx={(mode === 'append' ? (existing?.length ?? 0) : 0) + i}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {mode === 'new' && (
            <>
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
                <label>标签</label>
                <input className="in" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              </div>
              <button
                type="button"
                className="tool"
                disabled={!grid || quantized.length === 0}
                onClick={() => void submitNew()}
              >
                ✓ 入库
              </button>
            </>
          )}
          {mode === 'append' && (
            <button
              type="button"
              className="tool"
              disabled={!grid || quantized.length === 0 || !existing}
              onClick={() => void submitAppend()}
            >
              ➕ 追加 {quantized.length} 帧(现有 {existing?.length ?? '…'} 帧之后)
            </button>
          )}
        </>
      )}
      <button type="button" className="tool" style={{ marginTop: 8 }} onClick={() => onDone(null)}>
        取消
      </button>
      {err && <div className="err">{err}</div>}
    </div>
  )
}
