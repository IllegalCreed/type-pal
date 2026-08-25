/**
 * 升级曲线编辑器(C6;作者反馈「一大堆数没站在用户角度」重做)—— 占用中区的宽幅可视化:
 * - 曲线图上**直接拖点**调值(纵向,整数 ≥0);一次拖拽 = 一步撤销(UpdateActorCommand);
 * - 点选后底部数字精调;级数可增减(延续末段增量补齐);
 * - 「按增量生成」:首级所需 + 每级递增 → 累计曲线(原版表即「每级需求线性递增」的累计形);
 * - 升级学技能的等级在图上打标;曲线非递减被破坏时红字提醒。
 * 检查器侧只留摘要 + 入口按钮(LevelingEditor)。
 */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { DsButton, DsDraftNumberInput, DsNumberInput } from './design-system/index.js'

/** 生成累计经验表:table[0]=0;第 i 级需求 = first + step×(i−1),向后累计。 */
export function genExpTable(first: number, step: number, n: number): number[] {
  const out = [0]
  for (let i = 1; i < n; i++) out.push(out[i - 1]! + Math.max(0, first + step * (i - 1)))
  return out
}

/** 调整级数:加长按末段增量外推(无末段增量则 +首值/+1),缩短截断。 */
export function resizeExpTable(table: number[], n: number): number[] {
  const next = table.slice(0, Math.max(1, n))
  while (next.length < n) {
    const len = next.length
    const delta =
      len >= 2 ? Math.max(0, next[len - 1]! - next[len - 2]!) : Math.max(1, next[0] ?? 1)
    next.push((next[len - 1] ?? 0) + delta)
  }
  return next
}

export function isNonDecreasing(table: number[]): boolean {
  for (let i = 1; i < table.length; i++) if (table[i]! < table[i - 1]!) return false
  return true
}

/** Y 轴量程取整(1/2/5 × 10^k 的「好看」上限)。 */
function niceCeil(v: number): number {
  if (v <= 10) return 10
  const mag = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 5, 10]) if (v <= m * mag) return m * mag
  return 10 * mag
}

const W = 780
const H = 320
const PAD = { l: 52, r: 18, t: 16, b: 34 }

export function LevelCurveEditor(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  levelUpRows: LevelUpSkill[]
  skills: SkillDataMap
  session: EditSession
  onClose: () => void
}) {
  const { actor, levelUpRows, skills, session, onClose } = props
  const syncToken = session.getHistoryVersion()
  const source = useMemo(
    () => actor.battler.leveling?.expTable ?? genExpTable(15, 25, 20),
    [actor.battler.leveling?.expTable],
  )
  const [table, setTable] = useState<number[]>(source)
  const [sel, setSel] = useState<number | null>(null)
  const [genFirst, setGenFirst] = useState(15)
  const [genStep, setGenStep] = useState(25)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ idx: number; moved: boolean } | null>(null)
  // 横向视窗(级数区间;null = 全览)。滚轮以光标为锚缩放,拖空白平移(作者:100 级太密)
  const [view, setView] = useState<{ s: number; e: number } | null>(null)
  const panRef = useRef<{ startLevel: number; s: number; e: number } | null>(null)
  // 最新表镜像:pointerup 在 setState 外提交(在 updater 里 dispatch = setState during render)
  const tableRef = useRef(table)
  tableRef.current = table

  // 切角色跟数据(undo/redo 外部变更也同步:仅在非拖拽期)
  useEffect(() => {
    if (!dragRef.current) setTable(source)
  }, [source])

  const n = table.length
  const maxY = niceCeil(Math.max(...table, 1))
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const vs = view?.s ?? 0
  const ve = view?.e ?? Math.max(1, n - 1)
  const span = Math.max(1, ve - vs)
  const x = (i: number): number => PAD.l + ((i - vs) * plotW) / span
  const y = (v: number): number => PAD.t + plotH * (1 - v / maxY)
  /** 指针 X → 级数(浮点;缩放锚点/平移用)。 */
  const levelAtPointer = (clientX: number): number => {
    const svg = svgRef.current
    if (!svg) return vs
    const rect = svg.getBoundingClientRect()
    const px = ((clientX - rect.left) * W) / rect.width
    return vs + ((px - PAD.l) / plotW) * span
  }
  const clampView = (s: number, e: number): { s: number; e: number } | null => {
    const sp = Math.min(Math.max(e - s, 6), Math.max(1, n - 1))
    const ns = Math.max(0, Math.min(s, n - 1 - sp))
    return sp >= n - 1 ? null : { s: ns, e: ns + sp }
  }

  // 滚轮缩放须非 passive 才能 preventDefault(React onWheel 是 passive)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // 触控板横滑 = 平移
        const dl = (e.deltaX / plotW) * span
        setView(clampView(vs + dl, ve + dl))
        return
      }
      const anchor = levelAtPointer(e.clientX)
      const factor = e.deltaY > 0 ? 1.25 : 0.8
      const nsSpan = span * factor
      const ns = anchor - (anchor - vs) * (nsSpan / span)
      setView(clampView(ns, ns + nsSpan))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  })

  const commit = (next: number[]): void => {
    const cur = actor.battler.leveling?.expTable ?? []
    if (next.length === cur.length && next.every((v, i) => v === cur[i])) return
    session.dispatch(
      new UpdateActorCommand(actor.id, {
        battler: { ...actor.battler, leveling: { expTable: next } },
      }),
    )
  }

  /** 指针 Y → 表值(viewBox 坐标换算;整数,钳 [0, maxY])。 */
  const valueAtPointer = (clientY: number): number => {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const py = ((clientY - rect.top) * H) / rect.height
    const v = ((PAD.t + plotH - py) / plotH) * maxY
    return Math.max(0, Math.round(v))
  }

  // 只渲染视窗内的点/线段(各留一颗溢出点保线条连续)
  const iFrom = Math.max(0, Math.floor(vs) - 1)
  const iTo = Math.min(n - 1, Math.ceil(ve) + 1)
  let path = ''
  for (let i = iFrom; i <= iTo; i++)
    path += `${i === iFrom ? 'M' : 'L'}${x(i).toFixed(1)},${y(table[i] ?? 0).toFixed(1)} `

  const xLabelEvery = Math.max(1, Math.ceil(span / 14))
  const skillMarks = levelUpRows.filter((r) => r.level >= iFrom && r.level <= iTo)
  const monotonic = isNonDecreasing(table)
  const visIdxs = Array.from({ length: iTo - iFrom + 1 }, (_, k) => iFrom + k)

  return (
    <div className="dscroll level-curve-editor">
      <div className="toolbar level-curve-toolbar">
        <span className="level-curve-title">升级曲线 · {actor.id}</span>
        <span className="hint level-curve-hint">拖点调值 · 滚轮横向缩放 · 拖空白平移</span>
        <span className="spacer" />
        {view && (
          <>
            <span className="hint">
              L{Math.round(vs)}–{Math.round(ve)}
            </span>
            <DsButton onClick={() => setView(null)} size="compact" variant="secondary">
              🔍 全览
            </DsButton>
          </>
        )}
        <DsButton onClick={onClose} size="compact" variant="secondary" icon="chevron-left">
          返回精灵帧
        </DsButton>
      </div>

      <svg
        ref={svgRef}
        className="level-curve-chart"
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={(e) => {
          // 空白处按下 = 平移(点上的 pointerdown 已 stopPropagation)
          if (dragRef.current) return
          panRef.current = { startLevel: levelAtPointer(e.clientX), s: vs, e: ve }
          ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = dragRef.current
          if (d) {
            d.moved = true
            const v = valueAtPointer(e.clientY)
            setTable((t) => {
              const next = t.map((old, i) => (i === d.idx ? v : old))
              tableRef.current = next
              return next
            })
            return
          }
          const p = panRef.current
          if (p && view) {
            // 以按下时的级锚点平移(全览态无处可移)
            const cur =
              vs +
              (((e.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0)) *
                (W / (svgRef.current?.getBoundingClientRect().width ?? W)) -
                PAD.l) /
                plotW) *
                (p.e - p.s)
            const dl = p.startLevel - cur
            setView(clampView(p.s + dl, p.e + dl))
          }
        }}
        onPointerUp={() => {
          const d = dragRef.current
          dragRef.current = null
          panRef.current = null
          if (d?.moved) commit(tableRef.current) // 一次拖拽 = 一步撤销
        }}
      >
        <title>升级曲线(拖点编辑)</title>
        {/* Y 网格 + 刻度 */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = PAD.t + plotH * (1 - f)
          return (
            <g key={f}>
              <line
                x1={PAD.l}
                y1={gy}
                x2={W - PAD.r}
                y2={gy}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text x={PAD.l - 6} y={gy + 4} textAnchor="end" fontSize={11} fill="var(--dim)">
                {Math.round(maxY * f)}
              </text>
            </g>
          )
        })}
        {/* X 刻度(等级,仅视窗内) */}
        {visIdxs.map((i) =>
          i % xLabelEvery === 0 ? (
            <text
              key={`x${i}`}
              x={x(i)}
              y={H - PAD.b + 16}
              textAnchor="middle"
              fontSize={11}
              fill="var(--dim)"
            >
              {i}
            </text>
          ) : null,
        )}
        {/* 学技能标记 */}
        {skillMarks.map((r, k) => (
          <g key={`m${r.level}-${k}`}>
            <line
              x1={x(r.level)}
              y1={PAD.t}
              x2={x(r.level)}
              y2={H - PAD.b}
              stroke="var(--accent)"
              strokeDasharray="3 4"
              opacity={0.5}
            />
            <text
              x={x(r.level) + 3}
              y={PAD.t + 12 + (k % 3) * 12}
              fontSize={10}
              fill="var(--accent)"
            >
              {skills[r.skillId]?.name ?? r.skillId}
            </text>
          </g>
        ))}
        {/* 曲线 + 可拖点(仅视窗内;点密时半径随缩放放大) */}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {visIdxs.map((i) => (
          <circle
            className="level-curve-point"
            key={`p${i}`}
            cx={x(i)}
            cy={y(table[i]!)}
            r={sel === i ? 7 : 5}
            fill={sel === i ? 'var(--accent)' : 'var(--panel3)'}
            stroke="var(--accent)"
            strokeWidth={2}
            onPointerDown={(e) => {
              e.stopPropagation() // 别触发空白平移
              e.currentTarget.setPointerCapture(e.pointerId)
              dragRef.current = { idx: i, moved: false }
              setSel(i)
            }}
          />
        ))}
      </svg>

      <div className="field level-curve-fields">
        <span className="field-label">级数</span>
        <span className="level-curve-input level-curve-input--short">
          <DsDraftNumberInput
            draftKey={`actor:${actor.id}:leveling:level-count`}
            syncToken={syncToken}
            min={2}
            max={99}
            integer
            normalize={Math.trunc}
            value={n}
            onCommit={(value) => {
              const nn = Math.max(2, Math.min(99, value ?? 2))
              if (nn === n) return
              const next = resizeExpTable(table, nn)
              setTable(next)
              commit(next)
            }}
          />
        </span>
        {sel !== null && sel < n && (
          <>
            <span className="field-label">第 {sel} 级累计</span>
            <span className="level-curve-input level-curve-input--long">
              <DsDraftNumberInput
                draftKey={`actor:${actor.id}:leveling:exp-table:${sel}`}
                syncToken={syncToken}
                min={0}
                integer
                normalize={Math.trunc}
                value={table[sel] ?? 0}
                onCommit={(value) => {
                  const v = Math.max(0, value ?? 0)
                  if (v === table[sel]) return
                  const next = table.map((old, i) => (i === sel ? v : old))
                  setTable(next)
                  commit(next)
                }}
              />
            </span>
          </>
        )}
        <span className="sep" />
        <span className="field-label">首级需</span>
        <DsNumberInput
          className="level-curve-input level-curve-input--short"
          min={1}
          value={genFirst}
          onChange={(e) => setGenFirst(Math.max(1, Math.floor(e.target.valueAsNumber) || 1))}
        />
        <span className="field-label">每级递增</span>
        <DsNumberInput
          className="level-curve-input level-curve-input--short"
          min={0}
          value={genStep}
          onChange={(e) => setGenStep(Math.max(0, Math.floor(e.target.valueAsNumber) || 0))}
        />
        <DsButton
          onClick={() => {
            const next = genExpTable(genFirst, genStep, n)
            setTable(next)
            commit(next)
          }}
          size="compact"
          variant="secondary"
        >
          ⚡ 按增量生成
        </DsButton>
        {!monotonic && (
          <span className="level-curve-warning">⚠ 曲线有回落(后级阈值低于前级),请检查</span>
        )}
      </div>
      <p className="hint2">
        虚线 = 升级学技能的等级;拖动圆点上下调值,松手即入撤销历史;级数加长按末段增量外推。
      </p>
    </div>
  )
}
