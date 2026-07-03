/**
 * 精灵帧标注(C1c)—— 把角色精灵的全部帧渲成网格,按布局分组标注。
 * C1c:四向帧网格(真实精灵)+ 命名姿势展示 + 走路预览。编辑交互(框选/命名)= C1d。
 */
import { useEffect, useRef, useState } from 'react'
import { bakeFrame, deriveStepCycle, loadPalette, loadSprite } from '@type-pal/reforge'
import type { AssetBase, LoadedSprite } from '@type-pal/reforge'
import type { SpriteDef } from '@type-pal/content'

const DIRS = ['down', 'left', 'up', 'right'] as const
const DIR_LABEL: Record<string, string> = { down: '下', left: '左', up: '上', right: '右' }
const DIR_COLOR: Record<string, string> = { down: '#4c9aff', left: '#58b37a', up: '#e2b340', right: '#c792ea' }

/**
 * 把 baked 精灵帧画进统一尺寸的 <canvas>:cell = 精灵最大帧包围盒 × scale(所有帧同尺寸 → 网格整齐),
 * 每帧在 cell 内**底对齐居中**(帧大小不一也完整不裁,脚底对齐地面视觉自然)。pixelated。
 */
function FrameCell(props: { canvas: HTMLCanvasElement | undefined; maxW: number; maxH: number; scale: number }) {
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

export function SpriteFrames(props: { sprite: SpriteDef; assetBase: AssetBase }) {
  const { sprite, assetBase } = props
  const [loaded, setLoaded] = useState<LoadedSprite | null>(null)
  const [baked, setBaked] = useState<HTMLCanvasElement[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoaded(null)
    setBaked([])
    setErr('')
    void (async () => {
      try {
        const [sp, pal] = await Promise.all([loadSprite(assetBase, sprite.spriteNum), loadPalette(assetBase, 0)])
        if (!alive) return
        setLoaded(sp)
        setBaked(sp.frames.map((f) => bakeFrame(f, pal)))
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, sprite.spriteNum])

  if (err) return <div className="insp-empty" style={{ padding: 40, color: 'var(--err)' }}>精灵加载失败: {err}</div>
  if (!loaded) return <div className="insp-empty" style={{ padding: 40 }}>载入精灵 #{sprite.spriteNum}…</div>

  const total = loaded.frames.length
  // 精灵所有帧的最大包围盒 → 统一 cell 尺寸(帧大小不一也整齐;每帧底对齐居中不裁)
  const maxW = baked.length ? Math.max(...baked.map((c) => c.width)) : 1
  const maxH = baked.length ? Math.max(...baked.map((c) => c.height)) : 1
  const layout = sprite.layout
  const fpd = layout.kind === 'directional' ? layout.framesPerDir : 0
  const walkCount = fpd * 4 // 移动帧占用的帧数
  // 命名姿势用到的帧(高亮"已分配")
  const posedFrames = new Set<number>()
  for (const p of Object.values(sprite.poses ?? {})) for (const fi of p.frames) posedFrames.add(fi)
  // 未分配帧 = 非移动帧、非姿势帧
  const unassigned: number[] = []
  for (let i = walkCount; i < total; i++) if (!posedFrames.has(i)) unassigned.push(i)

  return (
    <div className="sprite-frames">
      <div className="toolbar">
        <span style={{ fontWeight: 600 }}>{sprite.label}</span>
        <span className="hint" style={{ marginLeft: 8 }}>#{sprite.spriteNum} · {total} 帧 · {layoutDesc(layout)}</span>
      </div>
      <div className="frames-scroll">
        {layout.kind === 'directional' ? (
          <>
            {DIRS.map((dir, di) => (
              <div key={dir} className="dirgroup">
                <div className="gh"><span className="chip" style={{ background: DIR_COLOR[dir] }} />{DIR_LABEL[dir]}({dir})
                  <code>帧 {di * fpd}–{di * fpd + fpd - 1} · 站立 = {di * fpd}</code></div>
                <div className="cells">
                  {Array.from({ length: fpd }, (_, fi) => {
                    const idx = di * fpd + fi
                    return (
                      <div key={idx} className={`fcell${fi === 0 ? ' stand' : ''}`} style={{ borderColor: `color-mix(in srgb, ${DIR_COLOR[dir]} 45%, var(--line))` }}>
                        <span className="fidx">{idx}</span>
                        <FrameCell canvas={baked[idx]} maxW={maxW} maxH={maxH} scale={2} />
                        <span className="ftag">{fi === 0 ? '站立' : `迈${fi}`}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="walk-preview">
              步序预览 {DIR_LABEL.down}: [{deriveStepCycle(fpd).join(', ')}] · 与引擎同源 sprite-anim
            </div>
          </>
        ) : (
          <div className="cells" style={{ flexWrap: 'wrap' }}>
            {loaded.frames.map((_, idx) => (
              <div key={idx} className="fcell"><span className="fidx">{idx}</span><FrameCell canvas={baked[idx]} maxW={maxW} maxH={maxH} scale={2} /></div>
            ))}
          </div>
        )}

        {/* 命名姿势(C1;编辑交互 C1d) */}
        <div className="posegroup">
          <div className="posehead">
            <span className="t">特殊动作 · 命名姿势</span>
            <span className="why">绝对帧号(无分方向)· 脚本按名字引用 · 编辑交互 C1d</span>
          </div>
          <div className="poselist">
            {Object.entries(sprite.poses ?? {}).map(([name, pose]) => (
              <div key={name} className="posecard">
                <b>{name}</b>
                <div className="pf">{pose.frames.map((fi) => <FrameCell key={fi} canvas={baked[fi]} maxW={maxW} maxH={maxH} scale={1.3} />)}</div>
                <span className="pmode">{pose.mode === 'loop' ? '循环' : '静态'} · 帧 {pose.frames.join(',')}</span>
              </div>
            ))}
            {Object.keys(sprite.poses ?? {}).length === 0 ? <span className="hint">（暂无命名姿势;从未分配帧框选新建 — C1d）</span> : null}
          </div>
          {unassigned.length > 0 ? (
            <div className="unassigned">
              未分配帧:{unassigned.map((i) => <span key={i} className="uf">{i}</span>)}
              <span style={{ marginLeft: 4 }}>← 特殊动作候选(施法/受击/坐…)</span>
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
  return '静物单帧'
}
