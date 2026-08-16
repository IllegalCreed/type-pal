/**
 * 精灵帧面板(C1c/C1d + A4d)—— 精灵的全部帧网格 + 命名姿势 + **帧级编辑就地做**:
 * 点任意帧 → 替换该帧(选图直接换,面板即刷新,可撤销);工具栏「＋ 追加帧」→ 选图
 * 切帧接到末尾(后补动作不回上传向导 —— 作者反馈「替换一帧还要去追加?动线太复杂」)。
 * 帧级编辑仅自有精灵(有 path);原版号约定精灵只读展示。
 */

import type { AssetRecordV1, SpriteActionDef, SpriteDef } from '@type-pal/content'
import type { AssetBase, LoadedSprite, Palette, RleFrame } from '@type-pal/reforge'
import {
  actualFrameIndex,
  bakeFrame,
  compressGzip,
  deriveStepCycle,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import { sha256Hex } from '../core/binary-signature.js'
import {
  ReplaceSpriteAssetCommand,
  type SpriteReplacementProof,
  UpdateSpriteCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { DsButton } from './design-system/controls.js'

/** 读用户选图 → RGBA(量化/切帧的公共前置)。 */
async function fileToRgba(file: File): Promise<{ rgba: Uint8Array; w: number; h: number }> {
  const bitmap = await createImageBitmap(file)
  const cvs = document.createElement('canvas')
  cvs.width = bitmap.width
  cvs.height = bitmap.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('2d context 不可用')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const data = ctx.getImageData(0, 0, cvs.width, cvs.height)
  return { rgba: new Uint8Array(data.data.buffer.slice(0)), w: cvs.width, h: cvs.height }
}

const DIRS = ['down', 'left', 'up', 'right'] as const
const DIR_LABEL: Record<string, string> = { down: '下', left: '左', up: '上', right: '右' }
const DIR_COLOR: Record<string, string> = {
  down: '#4c9aff',
  left: '#58b37a',
  up: '#e2b340',
  right: '#c792ea',
}

/**
 * 动画预览格:按帧序 order 定时轮播(walk 步序/循环/姿势共用)。
 * 节拍与引擎同源:走路 100ms/步(STEP_MS)、循环 250ms/帧(loopFrameIndex 缺省)。
 * interval 只重画 canvas 不触发 React 渲染;底对齐居中同 FrameCell。
 */
function AnimCell(props: {
  canvases: (HTMLCanvasElement | undefined)[]
  order: number[]
  msPerFrame: number
  maxW: number
  maxH: number
  scale: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { canvases, order, msPerFrame, maxW, maxH, scale } = props
  const cw = Math.max(1, Math.round(maxW * scale))
  const ch = Math.max(1, Math.round(maxH * scale))
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || order.length === 0) return
    c.width = cw
    c.height = ch
    let i = 0
    const draw = (): void => {
      ctx.clearRect(0, 0, cw, ch)
      const requested = order[i % order.length] ?? 0
      const src = canvases[actualFrameIndex(requested, canvases.length)]
      if (src) {
        ctx.imageSmoothingEnabled = false
        const w = src.width * scale
        const h = src.height * scale
        ctx.drawImage(src, (cw - w) / 2, ch - h, w, h)
      }
      i++
    }
    draw()
    const timer = setInterval(draw, Math.max(60, msPerFrame))
    return () => clearInterval(timer)
  }, [canvases, order, msPerFrame, cw, ch, scale])
  return <canvas ref={ref} className="fcell-canvas" />
}

/**
 * 把 baked 精灵帧画进统一尺寸的 <canvas>:cell = 精灵最大帧包围盒 × scale(所有帧同尺寸 → 网格整齐),
 * 每帧在 cell 内**底对齐居中**(帧大小不一也完整不裁,脚底对齐地面视觉自然)。pixelated。
 */
function FrameCell(props: {
  canvas: HTMLCanvasElement | undefined
  maxW: number
  maxH: number
  scale: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { canvas, maxW, maxH, scale } = props
  const cw = Math.max(1, Math.round(maxW * scale))
  const ch = Math.max(1, Math.round(maxH * scale))
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    c.width = cw
    c.height = ch
    ctx.clearRect(0, 0, cw, ch)
    if (!canvas) return
    ctx.imageSmoothingEnabled = false
    const w = canvas.width * scale
    const h = canvas.height * scale
    ctx.drawImage(canvas, (cw - w) / 2, ch - h, w, h) // 底对齐居中
  }, [canvas, cw, ch, scale])
  return <canvas ref={ref} className="fcell-canvas" />
}

export function SpriteFrames(props: {
  sprite: SpriteDef
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  onLayoutProof?: (proof: import('../core/commands.js').SpriteLayoutEditProof | undefined) => void
}) {
  const { sprite, assetBase, assetReader, session, onLayoutProof } = props
  const record = assetReader.record(sprite.asset, 'sprite')
  const revision = record.sha256
  const [loadedResult, setLoadedResult] = useState<{
    sprite: LoadedSprite
    revision: string
  } | null>(null)
  // React 会先用新 record 渲染、随后才运行 effect 清旧结果；revision 不同就立即视为未加载，
  // 禁止把“新 SHA + 旧帧数”拼成伪证明。
  const loaded = loadedResult?.revision === revision ? loadedResult.sprite : null
  const [baked, setBaked] = useState<HTMLCanvasElement[]>([])
  const [palette, setPalette] = useState<Palette | null>(null)
  const [err, setErr] = useState('')
  // 命名姿势框选:选中的未分配帧 + 待建姿势名/播放方式
  const [selFrames, setSelFrames] = useState<Set<number>>(new Set())
  const [poseName, setPoseName] = useState('')
  const [poseMode, setPoseMode] = useState<'once' | 'loop'>('once')
  // 帧级编辑(自有精灵):点帧选中待替换;追加帧草稿(选图后给切帧网格确认)
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null)
  const [appendDraft, setAppendDraft] = useState<{
    rgba: Uint8Array
    w: number
    h: number
    cols: number
    rows: number
  } | null>(null)
  const replaceFileRef = useRef<HTMLInputElement>(null)
  const appendFileRef = useRef<HTMLInputElement>(null)
  const consumers = session
    .getState()
    .sprites.filter((candidate) => candidate.asset === sprite.asset)
  const editable = true
  const layoutProof = loaded
    ? { asset: sprite.asset, sha256: record.sha256, actualFrameCount: loaded.frames.length }
    : undefined

  const repairConsumersForFrameCount = (
    nextCount: number,
  ): NonNullable<SpriteReplacementProof['repairs']> =>
    Object.fromEntries(
      consumers.map((candidate) => {
        const layout: SpriteDef['layout'] =
          candidate.layout.kind === 'directional'
            ? {
                kind: 'directional',
                framesPerDir: Math.min(candidate.layout.framesPerDir, Math.floor(nextCount / 4)),
              }
            : candidate.layout.kind === 'loop'
              ? {
                  ...candidate.layout,
                  frameCount: Math.min(candidate.layout.frameCount, nextCount),
                }
              : candidate.layout
        const poses = Object.fromEntries(
          Object.entries(candidate.poses ?? {}).flatMap(([actionId, action]) => {
            const steps = action.steps.filter((step) => step.frame < nextCount)
            if (!steps.length) return []
            const nextAction: SpriteActionDef = { ...action, steps }
            if (nextAction.loopFrom !== undefined && nextAction.loopFrom >= steps.length)
              delete nextAction.loopFrom
            return [[actionId, nextAction]]
          }),
        ) as Record<string, SpriteActionDef>
        return [candidate.id, { layout, ...(Object.keys(poses).length ? { poses } : {}) }]
      }),
    )

  /** 当前帧集重编码 → 更新 catalog record + pending bytes（可撤销，SHA 驱动全部预览刷新）。 */
  const commitFrames = async (frames: RleFrame[], label: string): Promise<void> => {
    if (!loaded) return
    const shrinking = frames.length < loaded.frames.length
    if (
      (consumers.length > 1 || shrinking) &&
      !window.confirm(
        shrinking
          ? `将把资源从 ${loaded.frames.length} 帧缩到 ${frames.length} 帧，并在同一可撤销事务中修正 ${consumers.length} 个消费者（${consumers.map((item) => item.label).join('、')}）的布局与姿势。是否继续？`
          : `此资源由 ${consumers.length} 个精灵定义共享（${consumers.map((item) => item.label).join('、')}）。继续会同步更新它们的图像，是否继续？`,
      )
    )
      return
    const gz = await compressGzip(encodeSpriteChunk(frames))
    const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
    const hash = await sha256Hex(buf)
    const previousBytes = await assetReader.readBytes(sprite.asset, 'sprite')
    const nextRecord: AssetRecordV1 = {
      ...record,
      path: `assets/authored/sprites/${hash}.rle`,
      bytes: buf.byteLength,
      sha256: hash,
      origin: { kind: 'authored' },
    }
    const proof: SpriteReplacementProof = {
      asset: sprite.asset,
      previousSha256: record.sha256,
      previousFrameCount: loaded.frames.length,
      nextFrameCount: frames.length,
      consumerIds: consumers.map((candidate) => candidate.id),
      ...(shrinking
        ? {
            repairs: repairConsumersForFrameCount(frames.length),
            consumerSnapshots: Object.fromEntries(
              consumers.map((candidate) => [
                candidate.id,
                {
                  layout: structuredClone(candidate.layout),
                  ...(candidate.poses ? { poses: structuredClone(candidate.poses) } : {}),
                },
              ]),
            ),
          }
        : {}),
    }
    session.dispatch(
      new ReplaceSpriteAssetCommand(
        sprite.id,
        sprite.asset,
        nextRecord,
        buf,
        previousBytes,
        proof,
        label,
      ),
    )
  }

  const doReplace = async (file: File): Promise<void> => {
    if (
      replaceIdx === null ||
      !loaded ||
      !palette ||
      replaceIdx < 0 ||
      replaceIdx >= loaded.frames.length
    )
      return
    try {
      const { rgba, w, h } = await fileToRgba(file)
      const frame = quantizeToRleFrame(rgba, w, h, palette) // 整图 = 单帧,量化贴盘
      const next = loaded.frames.map((f, i) => (i === replaceIdx ? frame : f))
      await commitFrames(next, `替换精灵帧 #${replaceIdx}`)
      setReplaceIdx(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const doRemoveLast = async (): Promise<void> => {
    if (!loaded || loaded.frames.length <= 1) return
    const nextCount = loaded.frames.length - 1
    if (
      consumers.some(
        (candidate) => candidate.layout.kind === 'directional' && Math.floor(nextCount / 4) < 1,
      )
    ) {
      setErr('方向精灵至少需要 4 帧，不能继续缩短')
      return
    }
    try {
      await commitFrames(loaded.frames.slice(0, -1), `删除精灵末帧 #${nextCount}`)
      setReplaceIdx(null)
      setSelFrames((previous) => new Set([...previous].filter((frame) => frame < nextCount)))
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error))
    }
  }

  const doAppend = async (): Promise<void> => {
    if (!appendDraft || !loaded || !palette) return
    const { rgba, w, h, cols, rows } = appendDraft
    if (w % cols !== 0 || h % rows !== 0) return
    try {
      const news = sliceAtlasGrid(rgba, w, h, w / cols, h / rows).map((t) =>
        quantizeToRleFrame(t.rgba, t.width, t.height, palette),
      )
      await commitFrames([...loaded.frames, ...news], `追加精灵帧 ×${news.length}`)
      setAppendDraft(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const toggleFrame = (i: number): void => {
    setSelFrames((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }
  const createPose = (): void => {
    const name = poseName.trim()
    if (!name || selFrames.size === 0) return
    const frames = [...selFrames].sort((a, b) => a - b)
    session.dispatch(
      new UpdateSpriteCommand(
        sprite.id,
        {
          poses: {
            ...sprite.poses,
            [name]: {
              label: name,
              steps: frames.map((frame) => ({ frame, durationMs: 250 })),
              ...(poseMode === 'loop' ? { loopFrom: 0 } : {}),
            },
          },
        },
        layoutProof,
      ),
    )
    setSelFrames(new Set())
    setPoseName('')
  }
  const deletePose = (name: string): void => {
    const rest = { ...sprite.poses }
    delete rest[name]
    session.dispatch(
      new UpdateSpriteCommand(
        sprite.id,
        { poses: Object.keys(rest).length ? rest : undefined },
        layoutProof,
      ),
    )
  }

  useEffect(() => {
    // record SHA 变化时重新读取同一 AssetId，不能只依赖稳定的语义引用。
    void revision
    let alive = true
    setLoadedResult(null)
    setBaked([])
    setErr('')
    void (async () => {
      try {
        const [sp, pal] = await Promise.all([
          loadEditorSprite(assetReader, sprite.asset),
          loadStandardPalette(assetBase),
        ])
        if (!alive) return
        setLoadedResult({ sprite: sp, revision })
        setPalette(pal)
        setBaked(sp.frames.map((f) => bakeFrame(f, pal)))
        onLayoutProof?.({
          asset: sprite.asset,
          sha256: record.sha256,
          actualFrameCount: sp.frames.length,
        })
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
      onLayoutProof?.(undefined)
    }
  }, [assetBase, assetReader, sprite.asset, revision, record.sha256, onLayoutProof])

  if (err)
    return (
      <div className="insp-empty" style={{ padding: 40, color: 'var(--err)' }}>
        精灵加载失败: {err}
      </div>
    )
  if (!loaded)
    return (
      <div className="insp-empty" style={{ padding: 40 }}>
        载入精灵 {sprite.asset}…
      </div>
    )

  const total = loaded.frames.length
  // 精灵所有帧的最大包围盒 → 统一 cell 尺寸(帧大小不一也整齐;每帧底对齐居中不裁)
  const maxW = baked.length ? Math.max(...baked.map((c) => c.width)) : 1
  const maxH = baked.length ? Math.max(...baked.map((c) => c.height)) : 1
  const layout = sprite.layout
  const fpd = layout.kind === 'directional' ? layout.framesPerDir : 0
  const walkCount = fpd * 4 // 移动帧占用的帧数
  const declaredDemand = Math.max(
    layout.kind === 'directional'
      ? layout.framesPerDir * 4
      : layout.kind === 'loop'
        ? layout.frameCount
        : 1,
    ...Object.values(sprite.poses ?? {}).flatMap((action) =>
      action.steps.map((step) => step.frame + 1),
    ),
  )
  // 命名姿势用到的帧(高亮"已分配")
  const posedFrames = new Set<number>()
  for (const action of Object.values(sprite.poses ?? {}))
    for (const step of action.steps) posedFrames.add(step.frame)
  // 未分配帧 = 非移动帧、非姿势帧
  const unassigned: number[] = []
  for (let i = walkCount; i < total; i++) if (!posedFrames.has(i)) unassigned.push(i)

  return (
    <div className="sprite-frames">
      <div className="toolbar">
        <span style={{ fontWeight: 600 }}>{sprite.label}</span>
        <span className="hint" style={{ marginLeft: 8 }}>
          {sprite.asset} · {total} 帧 · {layoutDesc(layout)}
        </span>
        {consumers.length > 1 && (
          <span className="hint" title={consumers.map((candidate) => candidate.id).join('、')}>
            共享资源 · {consumers.length} 个定义
          </span>
        )}
        {editable && (
          <>
            <span className="spacer" />
            <span className="hint">点任意帧可替换</span>
            <DsButton variant="secondary" icon="add" onClick={() => appendFileRef.current?.click()}>
              追加帧
            </DsButton>
            <DsButton
              variant="danger"
              icon="delete"
              disabled={
                total <= 1 ||
                consumers.some(
                  (candidate) =>
                    candidate.layout.kind === 'directional' && Math.floor((total - 1) / 4) < 1,
                )
              }
              title="删除末帧，并原子修复所有共享定义的布局与姿势"
              onClick={() => void doRemoveLast()}
            >
              删除末帧
            </DsButton>
            <input
              ref={appendFileRef}
              type="file"
              accept="image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                void fileToRgba(f)
                  .then((d) => setAppendDraft({ ...d, cols: 1, rows: 1 }))
                  .catch((er) => setErr(er instanceof Error ? er.message : String(er)))
              }}
            />
            <input
              ref={replaceFileRef}
              type="file"
              accept="image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void doReplace(f)
              }}
            />
          </>
        )}
      </div>
      {replaceIdx !== null && (
        <div className="pose-form">
          <span>
            替换帧 <b>#{replaceIdx}</b>:选一张图(整图作为该帧,自动贴合工程主色)
          </span>
          <DsButton variant="primary" onClick={() => replaceFileRef.current?.click()}>
            选图替换…
          </DsButton>
          <DsButton variant="secondary" onClick={() => setReplaceIdx(null)}>
            取消
          </DsButton>
        </div>
      )}
      {appendDraft && (
        <div className="pose-form">
          <span>
            追加帧:{appendDraft.w}×{appendDraft.h} 切
          </span>
          <input
            className="in mono"
            type="number"
            min={1}
            max={16}
            style={{ width: 52 }}
            value={appendDraft.cols}
            onChange={(e) =>
              setAppendDraft({
                ...appendDraft,
                cols: Math.max(1, Math.floor(e.target.valueAsNumber) || 1),
              })
            }
          />
          <span>列 ×</span>
          <input
            className="in mono"
            type="number"
            min={1}
            max={16}
            style={{ width: 52 }}
            value={appendDraft.rows}
            onChange={(e) =>
              setAppendDraft({
                ...appendDraft,
                rows: Math.max(1, Math.floor(e.target.valueAsNumber) || 1),
              })
            }
          />
          <span>行</span>
          {appendDraft.w % appendDraft.cols === 0 && appendDraft.h % appendDraft.rows === 0 ? (
            <span className="hint">
              {appendDraft.cols * appendDraft.rows} 帧 · 每帧 {appendDraft.w / appendDraft.cols}×
              {appendDraft.h / appendDraft.rows} · 接在 #{total} 起(可框选命名姿势)
            </span>
          ) : (
            <span style={{ color: 'var(--err)' }}>切不开:宽高须整除列/行</span>
          )}
          <DsButton
            variant="primary"
            disabled={
              appendDraft.w % appendDraft.cols !== 0 || appendDraft.h % appendDraft.rows !== 0
            }
            onClick={() => void doAppend()}
          >
            追加
          </DsButton>
          <DsButton variant="secondary" onClick={() => setAppendDraft(null)}>
            取消
          </DsButton>
        </div>
      )}
      <div className="frames-scroll">
        {declaredDemand > total ? (
          <div className="pose-form sprite-layout-debt" role="status">
            历史布局声明需要 {declaredDemand} 帧，资源实际 {total} 帧；缺失槽按运行时真值回退第 0
            帧，仅可缩小债务，不能替换不存在的帧。
          </div>
        ) : null}
        {layout.kind === 'directional' ? (
          <>
            {DIRS.map((dir, di) => (
              <div key={dir} className="dirgroup">
                <div className="gh">
                  <span className="chip" style={{ background: DIR_COLOR[dir] }} />
                  {DIR_LABEL[dir]}({dir})
                  <code>
                    帧 {di * fpd}–{di * fpd + fpd - 1} · 站立 = {di * fpd}
                  </code>
                </div>
                <div className="cells">
                  <div className="fcell" title="走路预览(引擎同源步序,100ms/步)">
                    <span className="fidx">▶</span>
                    <AnimCell
                      canvases={baked}
                      order={deriveStepCycle(fpd).map((p) => di * fpd + p)}
                      msPerFrame={100}
                      maxW={maxW}
                      maxH={maxH}
                      scale={2}
                    />
                    <span className="ftag">走</span>
                  </div>
                  {Array.from({ length: fpd }, (_, fi) => {
                    const idx = di * fpd + fi
                    const missing = idx >= total
                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={!editable || missing}
                        className={`fcell${fi === 0 ? ' stand' : ''}${missing ? ' frame-missing' : ''}`}
                        style={{
                          borderColor:
                            replaceIdx === idx
                              ? 'var(--accent)'
                              : `color-mix(in srgb, ${DIR_COLOR[dir]} 45%, var(--line))`,
                          ...(!missing && editable ? { cursor: 'pointer' } : {}),
                          ...(replaceIdx === idx ? { outline: '2px solid var(--accent)' } : {}),
                        }}
                        title={
                          missing
                            ? `声明帧 #${idx} 不存在；运行时回退第 0 帧`
                            : editable
                              ? `点击替换帧 #${idx}`
                              : undefined
                        }
                        onClick={() => {
                          if (!missing) setReplaceIdx(idx)
                        }}
                      >
                        <span className="fidx">{idx}</span>
                        <FrameCell
                          canvas={baked[actualFrameIndex(idx, total)]}
                          maxW={maxW}
                          maxH={maxH}
                          scale={2}
                        />
                        <span className="ftag">
                          {missing ? '缺失→0' : fi === 0 ? '站立' : `迈${fi}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {total > walkCount && (
              <div className="dirgroup">
                <div className="gh">
                  <span className="chip" style={{ background: '#a06cd5' }} />
                  动作帧
                  <code>
                    帧 {walkCount}–{total - 1} · 命名/引用走下方姿势
                  </code>
                </div>
                <div className="cells" style={{ flexWrap: 'wrap' }}>
                  {Array.from({ length: total - walkCount }, (_, k) => {
                    const idx = walkCount + k
                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={!editable}
                        className="fcell"
                        style={{
                          ...(editable ? { cursor: 'pointer' } : {}),
                          ...(replaceIdx === idx ? { outline: '2px solid var(--accent)' } : {}),
                        }}
                        title={editable ? `点击替换帧 #${idx}` : undefined}
                        onClick={() => setReplaceIdx(idx)}
                      >
                        <span className="fidx">{idx}</span>
                        <FrameCell canvas={baked[idx]} maxW={maxW} maxH={maxH} scale={2} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="walk-preview">
              步序预览 {DIR_LABEL.down}: [{deriveStepCycle(fpd).join(', ')}] · 与引擎同源
              sprite-anim
            </div>
          </>
        ) : (
          <div className="cells" style={{ flexWrap: 'wrap' }}>
            {layout.kind === 'loop' && (
              <div className="fcell" title="循环预览(引擎同源,250ms/帧)">
                <span className="fidx">▶</span>
                <AnimCell
                  canvases={baked}
                  order={Array.from({ length: layout.frameCount }, (_, i) => i)}
                  msPerFrame={250}
                  maxW={maxW}
                  maxH={maxH}
                  scale={2}
                />
                <span className="ftag">循环</span>
              </div>
            )}
            {loaded.frames.map((_, idx) => (
              <button
                type="button"
                key={idx}
                disabled={!editable}
                className="fcell"
                style={{
                  ...(editable ? { cursor: 'pointer' } : {}),
                  ...(replaceIdx === idx ? { outline: '2px solid var(--accent)' } : {}),
                }}
                title={editable ? `点击替换帧 #${idx}` : undefined}
                onClick={() => setReplaceIdx(idx)}
              >
                <span className="fidx">{idx}</span>
                <FrameCell canvas={baked[idx]} maxW={maxW} maxH={maxH} scale={2} />
              </button>
            ))}
          </div>
        )}

        {/* 命名姿势(C1d:点选未分配帧 + 命名 → 建姿势) */}
        <div className="posegroup">
          <div className="posehead">
            <span className="t">特殊动作 · 命名姿势</span>
            <span className="why">绝对帧号(无分方向)· 脚本按名字引用 · 点下方帧框选新建</span>
          </div>
          <div className="poselist">
            {Object.entries(sprite.poses ?? {}).map(([actionId, action]) => (
              <div key={actionId} className="posecard">
                <div className="pc-head">
                  <b>{action.label}</b>
                  <button
                    type="button"
                    className="pc-del"
                    title="删除动作"
                    onClick={() => deletePose(actionId)}
                  >
                    ×
                  </button>
                </div>
                <div className="pf">
                  <AnimCell
                    canvases={baked}
                    order={action.steps.map((step) => step.frame)}
                    msPerFrame={action.steps[0]?.durationMs ?? 250}
                    maxW={maxW}
                    maxH={maxH}
                    scale={1.3}
                  />
                  {action.steps.map((step, index) => (
                    <FrameCell
                      key={`${index}:${step.frame}`}
                      canvas={baked[actualFrameIndex(step.frame, total)]}
                      maxW={maxW}
                      maxH={maxH}
                      scale={1.3}
                    />
                  ))}
                </div>
                <span className="pmode">
                  ▶ {action.loopFrom === undefined ? '单次' : '循环'} · 帧{' '}
                  {action.steps.map((step) => step.frame).join(',')}
                </span>
              </div>
            ))}
            {Object.keys(sprite.poses ?? {}).length === 0 ? (
              <span className="hint">（暂无命名姿势;点下方帧框选 + 命名新建）</span>
            ) : null}
          </div>
          {unassigned.length > 0 ? (
            <div className="unassigned">
              <span>未分配帧(点选):</span>
              {unassigned.map((i) => (
                <button
                  type="button"
                  key={i}
                  className={`uf${selFrames.has(i) ? ' sel' : ''}`}
                  onClick={() => toggleFrame(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          ) : null}
          {selFrames.size > 0 ? (
            <div className="pose-form">
              <span className="pf">
                {[...selFrames]
                  .sort((a, b) => a - b)
                  .map((fi) => (
                    <FrameCell key={fi} canvas={baked[fi]} maxW={maxW} maxH={maxH} scale={1.1} />
                  ))}
              </span>
              <input
                className="in"
                placeholder="姿势名(摔倒/坐下/施法…)"
                value={poseName}
                onChange={(e) => setPoseName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPose()}
              />
              <select
                className="in"
                value={poseMode}
                onChange={(e) => setPoseMode(e.target.value as 'once' | 'loop')}
              >
                <option value="once">单次</option>
                <option value="loop">循环</option>
              </select>
              <DsButton variant="primary" onClick={createPose} disabled={!poseName.trim()}>
                建姿势 · 帧 {[...selFrames].sort((a, b) => a - b).join(',')}
              </DsButton>
              <DsButton variant="secondary" onClick={() => setSelFrames(new Set())}>
                取消
              </DsButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function layoutDesc(l: SpriteDef['layout']): string {
  if (l.kind === 'directional') return `行走 4 向 × ${l.framesPerDir}`
  if (l.kind === 'loop') return `循环 ${l.frameCount} 帧`
  return '默认定格 #0'
}
