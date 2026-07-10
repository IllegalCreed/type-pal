/**
 * 敌人外观/动作预览(数据模式·敌人页)。
 * 帧序列公式与引擎战斗时间线**同源**(reforge battle-anim/render):
 *   待机 = [0..idleFrames) 循环,帧时 max(1,idleAnimSpeed)×40ms
 *   施法 = [idleFrames..idleFrames+magicFrames) 循环,80ms(时间线 Delay(2))
 *   攻击 = [idleFrames+magicFrames−1 .. +attackFrames](i=0..attackFrames),帧时 max(1,actWaitFrames)×40ms
 *          attackFrames=0 → 单帧 idleFrames−1(引擎同分支)
 * anim 参数就地可编,预览即时反映;越界帧红色警示(数据配错一眼可见)。
 */
import type { EnemyDef } from '@type-pal/content'
import type { AssetBase, LoadedSprite } from '@type-pal/reforge'
import { bakeFrame, decompressGzip, loadBattleSprite, loadPalette, parseSpriteChunk } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SetEnemyBattleSpriteCommand, UpdateEnemyCommand } from '../core/commands.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import type { EditSession } from '../core/edit-session.js'

type Mode = 'idle' | 'magic' | 'attack'
const MODES: { id: Mode; label: string }[] = [
  { id: 'idle', label: '待机' },
  { id: 'magic', label: '施法' },
  { id: 'attack', label: '攻击' },
]

/** 模式 → 帧下标序列 + 每帧毫秒(引擎公式)。 */
function frameSeq(anim: EnemyDef['anim'], mode: Mode): { seq: number[]; ms: number } {
  const { idleFrames, magicFrames, attackFrames, actWaitFrames, idleAnimSpeed } = anim
  if (mode === 'idle') {
    const n = Math.max(1, idleFrames)
    return { seq: Array.from({ length: n }, (_, i) => i), ms: Math.max(1, idleAnimSpeed) * 40 }
  }
  if (mode === 'magic') {
    return {
      seq: Array.from({ length: Math.max(0, magicFrames) }, (_, i) => idleFrames + i),
      ms: 80,
    }
  }
  if (attackFrames <= 0) return { seq: [Math.max(0, idleFrames - 1)], ms: 80 }
  return {
    seq: Array.from({ length: attackFrames + 1 }, (_, i) => idleFrames + magicFrames + i - 1),
    ms: Math.max(1, actWaitFrames) * 40,
  }
}

/** 数字输入(滚轮误改防护:wheel 时失焦,同 EnemyTab 规则行)。 */
function NumIn(props: { v: number; on: (n: number) => void; w?: number; min?: number }) {
  return (
    <input
      className="in"
      type="number"
      style={{ width: props.w ?? 52 }}
      value={props.v}
      min={props.min ?? 0}
      onChange={(e) => props.on(Number(e.target.value))}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />
  )
}

export function EnemyAnimPreview(props: {
  enemy: EnemyDef
  assetBase: AssetBase
  session: EditSession
  /** 上传未保存的外观字节(A4c;键 = enemy.spritePath,内存解码优先)。 */
  blob?: ArrayBuffer
}) {
  const { enemy, assetBase, session, blob } = props
  const [baked, setBaked] = useState<HTMLCanvasElement[]>([])
  const [err, setErr] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [uploading, setUploading] = useState(false)
  const [tick, setTick] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 加载战斗精灵 + palette → 预烘全帧
  useEffect(() => {
    let alive = true
    setBaked([])
    setErr('')
    void (async () => {
      try {
        const [sp, pal]: [LoadedSprite, Awaited<ReturnType<typeof loadPalette>>] =
          await Promise.all([
            blob
              ? decompressGzip(new Blob([blob]))
                  .then(parseSpriteChunk)
                  .then((frames) => ({ frames, anchorX: 0, anchorY: 0 }))
              : loadBattleSprite(assetBase, 'enemy', enemy.spriteNum, enemy.spritePath),
            loadPalette(assetBase, 0),
          ])
        if (!alive) return
        setBaked(sp.frames.map((f) => bakeFrame(f, pal)))
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, enemy.spriteNum, enemy.spritePath, blob])

  const { seq, ms } = useMemo(() => frameSeq(enemy.anim, mode), [enemy.anim, mode])
  const outOfRange = useMemo(
    () => (baked.length ? seq.filter((i) => i < 0 || i >= baked.length) : []),
    [seq, baked.length],
  )

  // 动画推进
  useEffect(() => {
    if (!seq.length) return
    const t = setInterval(() => setTick((x) => x + 1), ms)
    return () => clearInterval(t)
  }, [ms, seq.length])

  // 绘制当前帧(底对齐居中;全帧最大包围盒定画布)
  useEffect(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !baked.length || !seq.length) return
    const maxW = Math.max(...baked.map((b) => b.width))
    const maxH = Math.max(...baked.map((b) => b.height))
    const scale = 2
    c.width = maxW * scale
    c.height = maxH * scale
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    const fi = seq[tick % seq.length]!
    const img = baked[fi]
    if (!img) return
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (c.width - w) / 2, c.height - h, w, h)
  }, [baked, seq, tick])

  const patchAnim = (k: keyof EnemyDef['anim'], v: number): void => {
    session.dispatch(new UpdateEnemyCommand(enemy.id, { anim: { ...enemy.anim, [k]: v } }))
  }
  const animFields: { k: keyof EnemyDef['anim']; l: string; hint: string }[] = [
    { k: 'idleFrames', l: '待机帧', hint: '帧 0 起循环' },
    { k: 'magicFrames', l: '施法帧', hint: '接在待机后' },
    { k: 'attackFrames', l: '攻击帧', hint: '接在施法后' },
    { k: 'actWaitFrames', l: '攻速', hint: '每攻击帧 ×40ms' },
    { k: 'idleAnimSpeed', l: '待机速', hint: '每待机帧 ×40ms' },
    { k: 'yPosOffset', l: 'Y 偏移', hint: '站位微调' },
  ]

  return (
    <div className="enemy-anim">
      <div className="ea-head">
        <span className="t">外观 · 战斗精灵</span>
        <span className="hint">精灵 #</span>
        <NumIn
          v={enemy.spriteNum}
          w={64}
          on={(n) => session.dispatch(new UpdateEnemyCommand(enemy.id, { spriteNum: n }))}
        />
        <span className="hint">{baked.length ? `${baked.length} 帧` : ''}</span>
        {enemy.spritePath && <span className="hint2" title={enemy.spritePath}>自有外观{blob ? '(未保存)' : ''}</span>}
        <button type="button" className="mini-txt" title="上传 PNG 帧带(横排逐行切),自动贴合工程主色" onClick={() => setUploading((v) => !v)}>
          ⬆ 上传外观
        </button>
      </div>
      {uploading && (
        <BattleSpriteUploader
          assetBase={assetBase}
          onApply={(buf) => {
            session.dispatch(
              new SetEnemyBattleSpriteCommand(enemy.id, `assets/battle-sprites/enemy/${enemy.id}.rle`, buf),
            )
            setUploading(false)
          }}
          onCancel={() => setUploading(false)}
        />
      )}
      {err ? (
        <div className="hint" style={{ color: 'var(--err)' }}>
          精灵加载失败: {err}
        </div>
      ) : (
        <div className="ea-body">
          <div className="ea-stage">
            <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
            <div className="ea-modes">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`tool${mode === m.id ? ' active' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'magic' && enemy.anim.magicFrames <= 0 ? (
              <span className="hint">（无施法帧:magicFrames = 0）</span>
            ) : null}
            {outOfRange.length ? (
              <span className="hint" style={{ color: 'var(--err)' }}>
                ⚠ 帧 {outOfRange.join(',')} 超出精灵范围(共 {baked.length} 帧)——检查下方帧数配置
              </span>
            ) : null}
          </div>
          <div className="ea-fields">
            {animFields.map((f) => (
              <label key={f.k} className="ea-field" title={f.hint}>
                <span>{f.l}</span>
                <NumIn
                  v={enemy.anim[f.k]}
                  min={f.k === 'yPosOffset' ? -200 : 0}
                  on={(n) => patchAnim(f.k, n)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
