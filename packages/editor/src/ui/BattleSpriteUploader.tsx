/**
 * 战斗外观上传器(A4c,敌/我共用)—— 比行走图更简:PNG → 帧宽×帧高网格切**顺序帧**
 * (敌人动画 = 待机/施法/攻击帧数字段各自指进这条帧带,工作台既有字段可调;玩家侧建议
 * 照原版帧序)。量化贴盘 0 预览(所见即入库)→ 应用(调用方 dispatch 复合命令)。
 */
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

export function BattleSpriteUploader(props: {
  assetBase: AssetBase
  /** 应用:调用方 dispatch 复合命令(path 由调用方按 id 定死)。 */
  onApply: (blob: ArrayBuffer, frameCount: number) => void
  onCancel: () => void
}) {
  const { assetBase, onApply, onCancel } = props
  const [rgba, setRgba] = useState<{ data: Uint8Array; w: number; h: number; name: string } | null>(
    null,
  )
  const [frameW, setFrameW] = useState(64)
  const [frameH, setFrameH] = useState(64)
  const [err, setErr] = useState('')
  const [palette, setPalette] = useState<Palette | null>(null)

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

  const quantized = useMemo(() => {
    if (!rgba || !palette || frameW <= 0 || frameH <= 0) return []
    if (rgba.w % frameW !== 0 || rgba.h % frameH !== 0) return []
    try {
      return sliceAtlasGrid(rgba.data, rgba.w, rgba.h, frameW, frameH).map((t) =>
        quantizeToRleFrame(t.rgba, t.width, t.height, palette),
      )
    } catch {
      return []
    }
  }, [rgba, palette, frameW, frameH])

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
      setRgba({
        data: new Uint8Array(data.data.buffer.slice(0)),
        w: cvs.width,
        h: cvs.height,
        name: file.name,
      })
      // 缺省帧尺寸:单行猜整图高;方帧猜高
      setFrameH(cvs.height)
      setFrameW(cvs.height <= cvs.width && cvs.width % cvs.height === 0 ? cvs.height : cvs.width)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const apply = async (): Promise<void> => {
    if (quantized.length === 0) return
    try {
      const gz = await compressGzip(encodeSpriteChunk(quantized))
      const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
      onApply(buf, quantized.length)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="bsu">
      <div className="field">
        <span className="field-label">图片</span>
        <input
          type="file"
          accept="image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void pickFile(f)
          }}
        />
      </div>
      {rgba && (
        <>
          <div className="field">
            <span className="field-label">帧尺寸</span>
            <span className="size-edit">
              <input
                className="in mono"
                type="number"
                min={1}
                max={640}
                value={frameW}
                onChange={(e) => setFrameW(Math.floor(e.target.valueAsNumber) || 0)}
              />
              ×
              <input
                className="in mono"
                type="number"
                min={1}
                max={640}
                value={frameH}
                onChange={(e) => setFrameH(Math.floor(e.target.valueAsNumber) || 0)}
              />
              <span className="hint2">
                {quantized.length
                  ? `→ ${quantized.length} 帧(横排逐行切)`
                  : `图 ${rgba.w}×${rgba.h} 切不开(宽高须整除)`}
              </span>
            </span>
          </div>
          {palette && quantized.length > 0 && (
            <div className="tile-grid" style={{ maxHeight: 180 }}>
              {quantized.map((f, i) => (
                <FrameThumb key={`f${i}`} frame={f} palette={palette} idx={i} />
              ))}
            </div>
          )}
          <div className="field">
            <button
              type="button"
              className="tool"
              disabled={quantized.length === 0}
              onClick={() => void apply()}
            >
              ✓ 应用外观
            </button>
            <button type="button" className="tool" onClick={onCancel}>
              取消
            </button>
          </div>
        </>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  )
}
