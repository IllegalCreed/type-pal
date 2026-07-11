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
  const source = actor.battler.leveling?.expTable ?? genExpTable(15, 25, 20)
  const [table, setTable] = useState<number[]>(source)
  const [sel, setSel] = useState<number | null>(null)
  const [genFirst, setGenFirst] = useState(15)
  const [genStep, setGenStep] = useState(25)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ idx: number; moved: boolean } | null>(null)
  // 最新表镜像:pointerup 在 setState 外提交(在 updater 里 dispatch = setState during render)
  const tableRef = useRef(table)
  tableRef.current = table

  // 切角色跟数据(undo/redo 外部变更也同步:仅在非拖拽期)
  useEffect(() => {
    if (!dragRef.current) setTable(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.id, actor.battler.leveling])

  const n = table.length
  const maxY = niceCeil(Math.max(...table, 1))
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (i: number): number => PAD.l + (n <= 1 ? 0 : (i * plotW) / (n - 1))
  const y = (v: number): number => PAD.t + plotH * (1 - v / maxY)

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

  const path = useMemo(
    () => table.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, maxY, n],
  )

  const xLabelEvery = Math.max(1, Math.ceil(n / 14))
  const skillMarks = levelUpRows.filter((r) => r.level >= 0 && r.level < n)
  const monotonic = isNonDecreasing(table)

  return (
    <div className="dscroll" style={{ padding: '12px 16px' }}>
      <div className="toolbar" style={{ marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>升级曲线 · {actor.id}</span>
        <span className="hint" style={{ marginLeft: 8 }}>
          拖点调值 · 下标 = 当前级,值 = 升到下一级所需**累计**经验
        </span>
        <span className="spacer" />
        <button type="button" className="tool" onClick={onClose}>
          ← 返回精灵帧
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: 900, touchAction: 'none', display: 'block' }}
        onPointerMove={(e) => {
          const d = dragRef.current
          if (!d) return
          d.moved = true
          const v = valueAtPointer(e.clientY)
          setTable((t) => {
            const next = t.map((old, i) => (i === d.idx ? v : old))
            tableRef.current = next
            return next
          })
        }}
        onPointerUp={() => {
          const d = dragRef.current
          dragRef.current = null
          if (d?.moved) commit(tableRef.current) // 一次拖拽 = 一步撤销
        }}
      >
        <title>升级曲线(拖点编辑)</title>
        {/* Y 网格 + 刻度 */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = PAD.t + plotH * (1 - f)
          return (
            <g key={f}>
              <line x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.l - 6} y={gy + 4} textAnchor="end" fontSize={11} fill="var(--dim)">
                {Math.round(maxY * f)}
              </text>
            </g>
          )
        })}
        {/* X 刻度(等级) */}
        {table.map((_, i) =>
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
        {/* 曲线 + 可拖点 */}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {table.map((v, i) => (
          <circle
            key={`p${i}`}
            cx={x(i)}
            cy={y(v)}
            r={sel === i ? 7 : 5}
            fill={sel === i ? 'var(--accent)' : 'var(--panel3)'}
            stroke="var(--accent)"
            strokeWidth={2}
            style={{ cursor: 'ns-resize' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              dragRef.current = { idx: i, moved: false }
              setSel(i)
            }}
          />
        ))}
      </svg>

      <div className="field" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
        <label>级数</label>
        <input
          className="in mono"
          type="number"
          min={2}
          max={99}
          style={{ width: 64 }}
          value={n}
          onChange={(e) => {
            const nn = Math.max(2, Math.min(99, Math.floor(e.target.valueAsNumber) || 2))
            const next = resizeExpTable(table, nn)
            setTable(next)
            commit(next)
          }}
        />
        {sel !== null && sel < n && (
          <>
            <label>第 {sel} 级累计</label>
            <input
              className="in mono"
              type="number"
              min={0}
              style={{ width: 90 }}
              value={table[sel] ?? 0}
              onChange={(e) => {
                const v = Math.max(0, Math.floor(e.target.valueAsNumber) || 0)
                const next = table.map((old, i) => (i === sel ? v : old))
                setTable(next)
                commit(next)
              }}
            />
          </>
        )}
        <span className="sep" />
        <label>首级需</label>
        <input
          className="in mono"
          type="number"
          min={1}
          style={{ width: 64 }}
          value={genFirst}
          onChange={(e) => setGenFirst(Math.max(1, Math.floor(e.target.valueAsNumber) || 1))}
        />
        <label>每级递增</label>
        <input
          className="in mono"
          type="number"
          min={0}
          style={{ width: 64 }}
          value={genStep}
          onChange={(e) => setGenStep(Math.max(0, Math.floor(e.target.valueAsNumber) || 0))}
        />
        <button
          type="button"
          className="tool"
          onClick={() => {
            const next = genExpTable(genFirst, genStep, n)
            setTable(next)
            commit(next)
          }}
        >
          ⚡ 按增量生成
        </button>
        {!monotonic && (
          <span style={{ color: 'var(--err)' }}>⚠ 曲线有回落(后级阈值低于前级),请检查</span>
        )}
      </div>
      <p className="hint2">
        虚线 = 升级学技能的等级;拖动圆点上下调值,松手即入撤销历史;级数加长按末段增量外推。
      </p>
    </div>
  )
}
