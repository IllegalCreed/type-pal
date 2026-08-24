/**
 * 精灵上传向导(A4;2026-07-11 按作者反馈两轮收口):
 * - **只管新建**:导入源帧容器，并同时建立一个初始用途定义；用途不是源资源分类。
 * - 行走图支持**动作帧行**:4 行走路(下/左/上/右)之后可另加 K 行特殊动作帧
 *   (接在 4×N 帧之后平铺;入库后到中间帧工作区框选命名姿势,poses 体系 C1d)。
 * - 帧级编辑(替换某帧/追加帧带)**不在这里** —— 在中间帧工作区就地做
 *   (作者:「替换一帧还要回上传选追加?动线太复杂」)。
 * 量化贴盘 0 预览(所见即入库);保存项目时落盘 assets/authored/sprites/<content-hash>.rle。
 */
import type { AssetRecordV1, SpriteDef, SpriteLayout } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame } from '@type-pal/reforge'
import {
  bakeFrame,
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sha256Hex } from '../core/binary-signature.js'
import { AddSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { DsButton, DsFilePicker, DsNumberInput, DsTextInput } from './design-system/index.js'

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
    label: '🚶 四向行走',
    hint: '4 行 = 下/左/上/右 × 每向 N 帧;可另加动作帧行(挥手/施法等,入库后在中间帧工作区框选命名)',
  },
  { v: 'loop', label: '🔥 自动循环', hint: '建立定义级自动循环；单行 N 帧依次播放' },
  {
    v: 'static',
    label: '📌 默认定格',
    hint: '建立默认显示 #0 的用途；之后仍可向源容器追加帧，供命名动作或场景脚本使用',
  },
]

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
  const [actionRows, setActionRows] = useState(0)
  const [frameCount, setFrameCount] = useState(4)
  const [sourceCols, setSourceCols] = useState(1)
  const [sourceRows, setSourceRows] = useState(1)
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

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

  // 帧网格推导(布局 → 行列数);整除不了报错提示
  const grid = useMemo(() => {
    if (!draft) return null
    if (kind === 'static') {
      const cols = Math.max(1, sourceCols)
      const rows = Math.max(1, sourceRows)
      return draft.imgW % cols === 0 && draft.imgH % rows === 0
        ? { cols, rows, w: draft.imgW / cols, h: draft.imgH / rows }
        : null
    }
    if (kind === 'loop') {
      const n = Math.max(1, frameCount)
      return draft.imgW % n === 0 ? { cols: n, rows: 1, w: draft.imgW / n, h: draft.imgH } : null
    }
    const n = Math.max(1, framesPerDir)
    const rows = 4 + Math.max(0, actionRows)
    return draft.imgW % n === 0 && draft.imgH % rows === 0
      ? { cols: n, rows, w: draft.imgW / n, h: draft.imgH / rows }
      : null
  }, [draft, kind, framesPerDir, actionRows, frameCount, sourceCols, sourceRows])

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
    if (submittingRef.current) return
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
      setNewId((prev) => prev || base || 'sprite')
      setNewLabel((prev) => prev || base || '新精灵')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const submit = async (): Promise<void> => {
    if (submittingRef.current || !draft || quantized.length === 0) return
    const id = newId.trim()
    if (!id || id.includes('/')) {
      setErr("id 不能为空且不得含 '/'")
      return
    }
    if (sprites.some((s) => s.id === id)) {
      setErr(`id "${id}" 已存在`)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setErr('')
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
      const hash = await sha256Hex(buf)
      const state = session.getState()
      const shared = Object.entries(state.assetCatalog.assets).find(
        ([, record]) => record.kind === 'sprite' && record.sha256 === hash,
      )
      let asset = shared?.[0] ?? `sprite.${id}`
      if (!shared)
        for (let suffix = 2; state.assetCatalog.assets[asset]; suffix++)
          asset = `sprite.${id}.${suffix}`
      const record: AssetRecordV1 = shared?.[1] ?? {
        kind: 'sprite',
        path: `assets/authored/sprites/${hash}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: buf.byteLength,
        sha256: hash,
        label: `精灵资源 ${newLabel.trim() || id}`,
        origin: { kind: 'authored' },
      }
      session.dispatch(
        new AddSpriteCommand({ id, asset, label: newLabel.trim() || id, layout }, record, buf),
      )
      onDone(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const kindMeta = KIND_META.find((k) => k.v === kind)

  return (
    <div className="dscroll sprite-upload-wizard" aria-busy={submitting}>
      <h3>导入大世界精灵</h3>
      <p className="sprite-upload-intro">
        导入一组源帧，并建立一个初始用途定义。同一源帧资源之后可以继续添加其它用途。
      </p>
      <div className="field">
        <span className="field-label">初始用途</span>
        <div className="sprite-upload-kind-options">
          {KIND_META.map((k) => (
            <DsButton
              key={k.v}
              size="compact"
              variant={kind === k.v ? 'primary' : 'secondary'}
              aria-pressed={kind === k.v}
              disabled={submitting}
              onClick={() => setKind(k.v)}
            >
              {k.label}
            </DsButton>
          ))}
        </div>
      </div>
      {kindMeta && <p className="hint2">{kindMeta.hint}</p>}
      <p className="hint2">替换某一帧 / 给已有精灵补帧 → 选中精灵后在中间帧工作区就地做。</p>

      <div className="field">
        <span className="field-label">图片文件</span>
        <DsFilePicker
          label="选择图片…"
          description="PNG / WebP / GIF"
          accept="image/png,image/webp,image/gif"
          disabled={submitting}
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
          {kind === 'directional' && (
            <>
              <div className="field">
                <span className="field-label">每向帧数</span>
                <DsNumberInput
                  min={1}
                  max={16}
                  disabled={submitting}
                  value={framesPerDir}
                  onChange={(e) => setFramesPerDir(Math.floor(e.target.valueAsNumber) || 1)}
                />
                <span className="hint2">原版走姿 3 帧(中间为立姿)</span>
              </div>
              <div className="field">
                <span className="field-label">动作帧行</span>
                <DsNumberInput
                  min={0}
                  max={12}
                  disabled={submitting}
                  value={actionRows}
                  onChange={(e) =>
                    setActionRows(Math.max(0, Math.floor(e.target.valueAsNumber) || 0))
                  }
                />
                <span className="hint2">0 = 无;每行同宽,空格留透明即可</span>
              </div>
            </>
          )}
          {kind === 'loop' && (
            <div className="field">
              <span className="field-label">帧数</span>
              <DsNumberInput
                min={1}
                max={64}
                disabled={submitting}
                value={frameCount}
                onChange={(e) => setFrameCount(Math.floor(e.target.valueAsNumber) || 1)}
              />
            </div>
          )}
          {kind === 'static' && (
            <div className="sprite-source-grid-fields">
              <label>
                <span>源帧列数</span>
                <DsNumberInput
                  min={1}
                  max={64}
                  disabled={submitting}
                  value={sourceCols}
                  onChange={(event) =>
                    setSourceCols(Math.max(1, Math.floor(event.target.valueAsNumber) || 1))
                  }
                />
              </label>
              <label>
                <span>源帧行数</span>
                <DsNumberInput
                  min={1}
                  max={64}
                  disabled={submitting}
                  value={sourceRows}
                  onChange={(event) =>
                    setSourceRows(Math.max(1, Math.floor(event.target.valueAsNumber) || 1))
                  }
                />
              </label>
              <p className="hint2">
                这里只决定原图如何切成源帧；初始用途仍默认显示 #0，其它帧可交给动作或场景脚本。
              </p>
            </div>
          )}
          {!grid ? (
            <div className="err">图片尺寸无法按当前行列切分；请调整帧数、列数或行数。</div>
          ) : (
            <div className="field">
              <span className="field-label">切帧</span>
              <span className="mono">
                {grid.cols}×{grid.rows} 帧 · 每帧 {grid.w}×{grid.h}
              </span>
            </div>
          )}
          {palette && grid && quantized.length > 0 && (
            <>
              <div className="field">
                <span className="field-label">入库预览</span>
                <span className="hint2">已贴合项目主色(所见即入库,×2 展示)</span>
              </div>
              {kind === 'directional' ? (
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
                    <FrameThumb key={`f${i}`} frame={f} palette={palette} idx={i} />
                  ))}
                </div>
              )}
            </>
          )}
          <div className="field">
            <span className="field-label">ID</span>
            <DsTextInput
              disabled={submitting}
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="kebab-case,唯一"
              monospace
            />
          </div>
          <div className="field">
            <span className="field-label">标签</span>
            <DsTextInput
              disabled={submitting}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <DsButton
            className="sprite-upload-submit"
            disabled={submitting || !grid || quantized.length === 0}
            onClick={() => void submit()}
            size="compact"
            variant="secondary"
          >
            {submitting ? '处理中…' : '✓ 入库'}
          </DsButton>
        </>
      )}
      <DsButton
        className="sprite-upload-cancel"
        disabled={submitting}
        onClick={() => {
          if (!submittingRef.current) onDone(null)
        }}
        size="compact"
        variant="secondary"
      >
        取消
      </DsButton>
      {err && <div className="err">{err}</div>}
    </div>
  )
}
