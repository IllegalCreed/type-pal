/**
 * 精灵上传向导(A4,数据模式·精灵库)—— 作者自有行走图/静物/循环动画入库。
 * 流程照 W7B 瓦片集:选 PNG → 布局参数切帧 → 量化贴盘 0 预览(所见即入库)→ 命名 →
 * AddSpriteCommand(注册表 + .rle 字节暂存,保存时落盘 assets/sprites/<id>.rle)。
 *
 * 切帧约定(行走图):**4 行 = 下/左/上/右**(引擎 FACING_TO_DIR 序)× 每向 N 列;
 * 帧序 = dir*framesPerDir+frame,恰为按行切片的自然序。循环 = 单行 N 帧;静物 = 整图 1 帧。
 */
import type { SpriteDef, SpriteLayout } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  encodeSpriteChunk,
  loadPalette,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AddSpriteCommand } from '../core/commands.js'
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

export function SpriteUploadWizard(props: {
  sprites: SpriteDef[]
  assetBase: AssetBase
  session: EditSession
  onDone: (newId: string | null) => void
}) {
  const { sprites, assetBase, session, onDone } = props
  const [draft, setDraft] = useState<Draft | null>(null)
  const [kind, setKind] = useState<SpriteLayout['kind']>('directional')
  const [framesPerDir, setFramesPerDir] = useState(3)
  const [frameCount, setFrameCount] = useState(4)
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)

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

  // 帧网格推导(布局 → 行列数);整除不了报错提示
  const grid = useMemo(() => {
    if (!draft) return null
    if (kind === 'static') return { cols: 1, rows: 1, w: draft.imgW, h: draft.imgH }
    if (kind === 'loop') {
      const n = Math.max(1, frameCount)
      return draft.imgW % n === 0
        ? { cols: n, rows: 1, w: draft.imgW / n, h: draft.imgH }
        : null
    }
    const n = Math.max(1, framesPerDir)
    return draft.imgW % n === 0 && draft.imgH % 4 === 0
      ? { cols: n, rows: 4, w: draft.imgW / n, h: draft.imgH / 4 }
      : null
  }, [draft, kind, framesPerDir, frameCount])

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
      setNewId(base || 'sprite')
      setNewLabel(base || '新精灵')
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

  return (
    <div className="dscroll" style={{ padding: '14px 18px' }}>
      <h3>上传精灵</h3>
      <p className="hint2">
        选 PNG → 按布局切帧 → 自动贴合工程主色风格 → 入库。行走图按 <b>4 行 = 下/左/上/右</b>
        (每行 N 帧)排;循环动画单行排帧;静物整图一帧。保存工程后落盘。
      </p>
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
            <label>布局</label>
            <select className="in" value={kind} onChange={(e) => setKind(e.target.value as SpriteLayout['kind'])}>
              <option value="directional">🚶 行走(4 向)</option>
              <option value="static">🪑 静物(单帧)</option>
              <option value="loop">🔥 循环动画</option>
            </select>
          </div>
          {kind === 'directional' && (
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
          )}
          {kind === 'loop' && (
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
          {!grid ? (
            <div className="err">
              图片尺寸切不开:行走需宽整除每向帧数、高整除 4;循环需宽整除帧数。
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
                <span className="hint2">已贴合工程主色(所见即入库)</span>
              </div>
              {kind === 'directional' ? (
                // 按向分行展示,行首标 下/左/上/右
                <div>
                  {DIR_LABELS.map((dl, d) => (
                    <div key={dl} className="sprite-dir-row">
                      <span className="hint2 sprite-dir-label">{dl}</span>
                      <div className="tile-grid">
                        {quantized.slice(d * grid.cols, (d + 1) * grid.cols).map((f, i) => (
                          <FrameThumb key={`${d}-${i}`} frame={f} palette={palette} idx={d * grid.cols + i} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tile-grid">
                  {quantized.map((f, i) => (
                    <FrameThumb key={`f${i}`} frame={f} palette={palette} idx={i} />
                  ))}
                </div>
              )}
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
            <label>标签</label>
            <input className="in" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <button type="button" className="tool" disabled={!grid || quantized.length === 0} onClick={() => void submit()}>
            ✓ 入库
          </button>
        </>
      )}
      <button type="button" className="tool" style={{ marginTop: 8 }} onClick={() => onDone(null)}>
        取消
      </button>
      {err && <div className="err">{err}</div>}
    </div>
  )
}
