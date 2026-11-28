/** Owns the center chart's viewport and pending gestures. EditSession owns the saved thresholds. */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import {
  generateExperienceCurve,
  isExperienceCurveNonDecreasing,
  resizeExperienceCurve,
} from '../core/experience-curve.js'
import {
  DsButton,
  DsDraftNumberField,
  DsNumberField,
  DsNumberFieldGrid,
} from './design-system/index.js'

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

type LevelWindow = { start: number; end: number }

type ChartGesture =
  | {
      kind: 'point'
      pointerId: number
      target: SVGCircleElement
      index: number
      source: number[]
      historyVersion: number
      draft?: number[]
    }
  | {
      kind: 'pan'
      pointerId: number
      origin: LevelWindow
      anchor: number
    }

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
    () => actor.battler.leveling?.expTable ?? generateExperienceCurve(15, 25, 20),
    [actor.battler.leveling?.expTable],
  )
  const [table, setTable] = useState<number[]>(source)
  const [sel, setSel] = useState<number | null>(null)
  const [genFirst, setGenFirst] = useState(15)
  const [genStep, setGenStep] = useState(25)
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<ChartGesture | null>(null)
  const [view, setView] = useState<LevelWindow | null>(null)

  useEffect(() => {
    const gesture = gestureRef.current
    if (gesture?.kind === 'point') {
      if (gesture.historyVersion === syncToken && gesture.source === source) return
      gestureRef.current = null
      if (gesture.target.hasPointerCapture(gesture.pointerId))
        gesture.target.releasePointerCapture(gesture.pointerId)
    }
    setTable(source)
  }, [source, syncToken])

  const n = table.length
  const maxY = niceCeil(Math.max(...table, 1))
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const clampView = (s: number, e: number): LevelWindow | null => {
    const sp = Math.min(Math.max(e - s, 6), Math.max(1, n - 1))
    const ns = Math.max(0, Math.min(s, n - 1 - sp))
    return sp >= n - 1 ? null : { start: ns, end: ns + sp }
  }
  // Undo or resize can shorten the curve while the previous view starts beyond its end.
  const visibleWindow = view ? clampView(view.start, view.end) : null
  const vs = visibleWindow?.start ?? 0
  const ve = visibleWindow?.end ?? Math.max(1, n - 1)
  const span = Math.max(1, ve - vs)
  const x = (i: number): number => PAD.l + ((i - vs) * plotW) / span
  const y = (v: number): number => PAD.t + plotH * (1 - v / maxY)
  const levelAtPointer = (clientX: number, start = vs, width = span): number => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect?.width) return start
    const px = ((clientX - rect.left) * W) / rect.width
    return start + ((px - PAD.l) / plotW) * width
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

  /** Clamp below zero. Dragging above the plot can extend the visible Y range. */
  const valueAtPointer = (clientY: number): number => {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const py = ((clientY - rect.top) * H) / rect.height
    const v = ((PAD.t + plotH - py) / plotH) * maxY
    return Math.max(0, Math.round(v))
  }

  const finishGesture = (pointerId: number, cancelled: boolean): void => {
    const gesture = gestureRef.current
    if (gesture?.pointerId !== pointerId) return
    gestureRef.current = null
    if (gesture.kind !== 'point') return
    if (cancelled || gesture.historyVersion !== session.getHistoryVersion()) {
      setTable(source)
      return
    }
    if (gesture.draft) commit(gesture.draft)
  }

  // 只渲染视窗内的点/线段(各留一颗溢出点保线条连续)
  const iFrom = Math.max(0, Math.floor(vs) - 1)
  const iTo = Math.min(n - 1, Math.ceil(ve) + 1)
  let path = ''
  for (let i = iFrom; i <= iTo; i++)
    path += `${i === iFrom ? 'M' : 'L'}${x(i).toFixed(1)},${y(table[i] ?? 0).toFixed(1)} `

  const xLabelEvery = Math.max(1, Math.ceil(span / 14))
  const skillMarks = levelUpRows.filter((r) => r.level >= iFrom && r.level <= iTo)
  const monotonic = isExperienceCurveNonDecreasing(table)
  const visIdxs = Array.from({ length: iTo - iFrom + 1 }, (_, k) => iFrom + k)

  return (
    <div className="dscroll level-curve-editor">
      <div className="toolbar level-curve-toolbar">
        <span className="level-curve-title">升级曲线 · {actor.id}</span>
        <span className="hint level-curve-hint">拖点调值 · 滚轮横向缩放 · 拖空白平移</span>
        <span className="spacer" />
        {visibleWindow && (
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
          if (gestureRef.current || !visibleWindow) return
          e.currentTarget.setPointerCapture(e.pointerId)
          gestureRef.current = {
            kind: 'pan',
            pointerId: e.pointerId,
            origin: visibleWindow,
            anchor: levelAtPointer(e.clientX),
          }
        }}
        onPointerMove={(e) => {
          const gesture = gestureRef.current
          if (gesture?.pointerId !== e.pointerId) return
          if (gesture.kind === 'point') {
            const value = valueAtPointer(e.clientY)
            gesture.draft = source.map((entry, index) => (index === gesture.index ? value : entry))
            setTable(gesture.draft)
            return
          }
          const { start, end } = gesture.origin
          const delta = gesture.anchor - levelAtPointer(e.clientX, start, end - start)
          setView(clampView(start + delta, end + delta))
        }}
        onPointerUp={(e) => finishGesture(e.pointerId, false)}
        onPointerCancel={(e) => finishGesture(e.pointerId, true)}
        onLostPointerCapture={(e) => finishGesture(e.pointerId, true)}
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
              e.stopPropagation()
              if (gestureRef.current) return
              e.currentTarget.setPointerCapture(e.pointerId)
              gestureRef.current = {
                kind: 'point',
                pointerId: e.pointerId,
                target: e.currentTarget,
                index: i,
                source,
                historyVersion: syncToken,
              }
              setSel(i)
            }}
          />
        ))}
      </svg>

      <DsNumberFieldGrid className="level-curve-fields">
        <DsDraftNumberField
          id="level-curve-count"
          label="级数"
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
            const next = resizeExperienceCurve(table, nn)
            setTable(next)
            commit(next)
          }}
        />
        {sel !== null && sel < n && (
          <DsDraftNumberField
            id="level-curve-selected-total"
            label={`第 ${sel} 级累计`}
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
        )}
        <DsNumberField
          id="level-curve-generator-first"
          label="首级需"
          min={1}
          integer
          value={genFirst}
          onChange={(e) => setGenFirst(Math.max(1, Math.floor(e.target.valueAsNumber) || 1))}
        />
        <DsNumberField
          id="level-curve-generator-step"
          label="每级递增"
          min={0}
          integer
          value={genStep}
          onChange={(e) => setGenStep(Math.max(0, Math.floor(e.target.valueAsNumber) || 0))}
        />
      </DsNumberFieldGrid>
      <DsButton
        onClick={() => {
          const next = generateExperienceCurve(genFirst, genStep, n)
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
      <p className="hint2">
        虚线 = 升级学技能的等级;拖动圆点上下调值,松手即入撤销历史;级数加长按末段增量外推。
      </p>
    </div>
  )
}
