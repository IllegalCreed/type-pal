/**
 * 毒/状态编辑页(数据模式·毒标签,B10 编辑器侧)。
 * 引擎侧毒系统全数据化(tick 序列指针推进/致死配对/相克环/可解度分层),此前编辑器零入口
 * (poisons 压根不在 EditorState)—— 本页补齐:左列表;中结构化表单(基础/玩家敌人双 tick
 * 序列/关系);右侧全局关系总览(致死对对称性校验 + 相克链推导,数据错一眼看出)。
 */
import type { ItemData, PoisonCurability, PoisonDef, PoisonTick } from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import { AddPoisonCommand, UpdatePoisonCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

const CURABILITY: { v: PoisonCurability; label: string; hint: string }[] = [
  { v: 'common', label: '常规', hint: '常规解毒(灵血咒/九节菖蒲)即解' },
  { v: 'severe', label: '剧毒', hint: '仅复活类或相克可解(六大毒级)' },
  { v: 'incurable', label: '无解', hint: '谁都解不掉(无影毒/寄生,只能撑到期)' },
]
const CURABILITY_BADGE: Record<PoisonCurability, string> = {
  common: '常规',
  severe: '剧毒',
  incurable: '无解',
}

function Num(props: {
  v: number | undefined
  on: (n: number | undefined) => void
  ph?: string
  w?: number
}) {
  return (
    <input
      className="in mono ef-num"
      type="number"
      style={props.w ? { width: props.w } : undefined}
      value={props.v ?? ''}
      placeholder={props.ph}
      onChange={(e) =>
        props.on(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : undefined)
      }
      onWheel={(e) => e.currentTarget.blur()}
    />
  )
}

/** 单条 tick 的一行编辑(扣血/半血/产道具/自解)。 */
function TickRow(props: {
  tick: PoisonTick
  items: ItemData[]
  onChange: (next: PoisonTick) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  first: boolean
  last: boolean
  idx: number
}) {
  const { tick, items, onChange, onRemove, onMove, first, last, idx } = props
  // patch 语义:undefined = 删键(落盘 JSON 不留空键)
  const set = (p: Partial<PoisonTick>): void => {
    const next = { ...tick, ...p } as Record<string, unknown>
    for (const [k, v] of Object.entries(p)) if (v === undefined) delete next[k]
    onChange(next as PoisonTick)
  }
  return (
    <div className="ef-row">
      <span className="tick-no mono">{idx + 1}</span>
      <div className="ef-fields">
        <label>
          <span>扣血</span>
          <Num v={tick.hpDelta} on={(n) => set({ hpDelta: n })} />
        </label>
        <label title="无影毒式一次性半血:实扣 = min(此值, 当前HP/2+1);留空 = 无">
          <span>半血上限</span>
          <Num v={tick.halveHp} on={(n) => set({ halveHp: n })} />
        </label>
        <label title="到期给玩家一件道具(养蛊寄生产出);留空 = 无">
          <span>产道具</span>
          <select
            className="in"
            value={tick.grantItem ?? ''}
            onChange={(e) => set({ grantItem: e.target.value || undefined })}
          >
            <option value="">(无)</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cf-inline" title="本回合跑完自动移除此毒(暴扣后自除/寄生到期)">
          <input
            type="checkbox"
            checked={tick.selfCure === true}
            onChange={(e) => set({ selfCure: e.target.checked || undefined })}
          />
          自解
        </label>
      </div>
      <span className="ef-ops">
        <button
          type="button"
          className="mini"
          title="上移"
          disabled={first}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="mini"
          title="下移"
          disabled={last}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button type="button" className="mini" title="删除" onClick={onRemove}>
          ✕
        </button>
      </span>
    </div>
  )
}

/** tick 序列编辑器(玩家/敌人各一份)。 */
function TicksEditor(props: {
  title: string
  hint: string
  ticks: PoisonTick[] | undefined
  items: ItemData[]
  onChange: (next: PoisonTick[] | undefined) => void
}) {
  const { title, hint, ticks, items, onChange } = props
  const list = ticks ?? []
  const setAt = (i: number, next: PoisonTick): void => {
    const arr = [...list]
    arr[i] = next
    onChange(arr)
  }
  return (
    <div className="section">
      <h4>
        {title} <span className="hint2">{hint}</span>
      </h4>
      {list.map((t, i) => (
        <TickRow
          key={`t${i}-${list.length}`}
          tick={t}
          items={items}
          idx={i}
          first={i === 0}
          last={i === list.length - 1}
          onChange={(next) => setAt(i, next)}
          onRemove={() => {
            const arr = list.filter((_, j) => j !== i)
            onChange(arr.length ? arr : undefined) // 清空 = 删键(无 DoT)
          }}
          onMove={(dir) => {
            const j = i + dir
            const arr = [...list]
            const t2 = arr[j]!
            arr[j] = arr[i]!
            arr[i] = t2
            onChange(arr)
          }}
        />
      ))}
      <button type="button" className="tool" onClick={() => onChange([...list, { hpDelta: -10 }])}>
        ＋ 添加回合
      </button>
    </div>
  )
}

/** 全局关系总览:致死对(对称性校验)+ 相克链(单向环推导)。数据驱动,配错一眼看出。 */
function RelationOverview(props: { poisons: PoisonDef[]; onPick: (id: number) => void }) {
  const { poisons, onPick } = props
  const byId = useMemo(() => new Map(poisons.map((p) => [p.id, p])), [poisons])
  const nameOf = (id: number): string => byId.get(id)?.name ?? `?${id}`

  // 致死对:去重(A<B 归一);不对称(A 指 B 而 B 不指回)标警
  const lethalPairs: { a: number; b: number; symmetric: boolean }[] = []
  const seen = new Set<string>()
  for (const p of poisons) {
    if (p.lethalWith === undefined) continue
    const [a, b] = p.id < p.lethalWith ? [p.id, p.lethalWith] : [p.lethalWith, p.id]
    const key = `${a}-${b}`
    if (seen.has(key)) continue
    seen.add(key)
    lethalPairs.push({ a, b, symmetric: byId.get(p.lethalWith)?.lethalWith === p.id })
  }

  // 相克链:从任一带 counters 的毒沿 counters 走,直到回头/断链(环则收口标 ⟲)
  const chains: { ids: number[]; loop: boolean }[] = []
  const visited = new Set<number>()
  for (const p of poisons) {
    if (p.counters === undefined || visited.has(p.id)) continue
    const ids = [p.id]
    visited.add(p.id)
    let cur = byId.get(p.counters)
    let loop = false
    while (cur) {
      if (cur.id === ids[0]) {
        loop = true
        break
      }
      if (visited.has(cur.id)) break
      ids.push(cur.id)
      visited.add(cur.id)
      cur = cur.counters !== undefined ? byId.get(cur.counters) : undefined
    }
    chains.push({ ids, loop })
  }

  return (
    <>
      <div className="section">
        <h4>
          致死对 <span className="hint2">投掷互为暴毙;应两两对称</span>
        </h4>
        {lethalPairs.length ? (
          lethalPairs.map((pr) => (
            <div key={`${pr.a}-${pr.b}`} className="rel-line">
              <button type="button" className="rel-poison" onClick={() => onPick(pr.a)}>
                {nameOf(pr.a)}
              </button>
              <span className="rel-op">☠</span>
              <button type="button" className="rel-poison" onClick={() => onPick(pr.b)}>
                {nameOf(pr.b)}
              </button>
              {!pr.symmetric && (
                <span className="rel-warn" title="仅单向指回:另一侧 lethalWith 没指回来">
                  ⚠ 不对称
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="insp-empty">无致死配对。</div>
        )}
      </div>
      <div className="section">
        <h4>
          相克链 <span className="hint2">对己服毒沿箭头解上一环(以毒攻毒)</span>
        </h4>
        {chains.length ? (
          chains.map((c) => (
            <div key={c.ids.join('-')} className="rel-line rel-chain">
              {c.ids.map((id, i) => (
                <span key={id} className="rel-chain-node">
                  {i > 0 && <span className="rel-op">→</span>}
                  <button type="button" className="rel-poison" onClick={() => onPick(id)}>
                    {nameOf(id)}
                  </button>
                </span>
              ))}
              {c.loop && (
                <span className="rel-op" title="首尾闭环">
                  ⟲
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="insp-empty">无相克关系。</div>
        )}
      </div>
    </>
  )
}

export function PoisonTab(props: {
  poisons: PoisonDef[]
  items: ItemData[]
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  tabBar?: React.ReactNode
}) {
  const { poisons, items, session, focusObjectId, onObjectFocus, tabBar } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState<number>(poisons[0]?.id ?? 0)
  const shown = useMemo(
    () =>
      poisons.filter((p) => !filter || String(p.id).includes(filter) || p.name.includes(filter)),
    [poisons, filter],
  )
  const poison = poisons.find((p) => p.id === selId) ?? shown[0]
  const others = poisons.filter((p) => p.id !== poison?.id)
  const selectPoison = (id: number): void => {
    setSelId(id)
    onObjectFocus?.(String(id))
  }

  useEffect(() => {
    const id = Number(focusObjectId)
    if (focusObjectId && Number.isInteger(id) && poisons.some((candidate) => candidate.id === id))
      setSelId(id)
  }, [focusObjectId, poisons])

  const patch = (p: Partial<Omit<PoisonDef, 'id'>>): void => {
    if (poison) session.dispatch(new UpdatePoisonCommand(poison.id, p))
  }

  return (
    <>
      {/* 左:标签栏 + 毒列表 */}
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">毒</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{poisons.length}
          </span>
        </div>
        <input
          className="in"
          placeholder="过滤 id/名…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ margin: '0 8px 6px' }}
        />
        <div className="sprite-list">
          {shown.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`arow${p.id === poison?.id ? ' sel' : ''}`}
              onClick={() => selectPoison(p.id)}
            >
              <span className="nm">
                {p.name}
                <small>
                  {p.id} · {CURABILITY_BADGE[p.curability]}
                </small>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tool"
          style={{ margin: '6px 10px 8px', justifyContent: 'center' }}
          onClick={() => {
            const name = window.prompt('新毒名字:', '')?.trim()
            if (!name) return
            let n = 1000
            while (poisons.some((p) => p.id === n)) n++
            session.dispatch(new AddPoisonCommand(n, name))
            selectPoison(n)
          }}
        >
          ＋ 新建毒
        </button>
      </div>

      {/* 中:结构化表单(skill-form:复用技能页的 .sk-grid 紧凑网格) */}
      <div className="canvas-wrap data-body">
        {poison ? (
          <div className="et-scroll skill-form">
            <div className="section">
              <h4>基础</h4>
              <div className="sk-grid">
                <label>
                  <span className="lb">名字</span>
                  <input
                    className="in"
                    value={poison.name}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </label>
                <label title={CURABILITY.find((c) => c.v === poison.curability)?.hint}>
                  <span className="lb">可解度</span>
                  <select
                    className="in"
                    value={poison.curability}
                    onChange={(e) => patch({ curability: e.target.value as PoisonCurability })}
                  >
                    {CURABILITY.map((c) => (
                      <option key={c.v} value={c.v} title={c.hint}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label title="状态页头像染色的调色板色号;0 = 不染">
                  <span className="lb">染色#</span>
                  <Num v={poison.color} on={(n) => patch({ color: n ?? 0 })} />
                </label>
              </div>
            </div>

            <TicksEditor
              title="玩家中毒 · 逐回合"
              hint="每回合跑一格、指针前进;到尾重复末格(勾「自解」则移除)"
              ticks={poison.playerTicks}
              items={items}
              onChange={(ticks) => patch({ playerTicks: ticks })}
            />
            <TicksEditor
              title="敌人中毒 · 逐回合"
              hint="同毒对敌通常更狠(原版双档);留空 = 对敌无 DoT"
              ticks={poison.enemyTicks}
              items={items}
              onChange={(ticks) => patch({ enemyTicks: ticks })}
            />

            <div className="section">
              <h4>
                关系{' '}
                <span className="hint2">
                  致死 = 投掷到已中配对毒者当场暴毙;相克 = 对己服毒解掉所克之毒
                </span>
              </h4>
              <div className="sk-grid">
                <label>
                  <span className="lb">致死配对</span>
                  <select
                    className="in"
                    value={poison.lethalWith ?? ''}
                    onChange={(e) =>
                      patch({
                        lethalWith: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">(无)</option>
                    {others.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="lb">所克之毒</span>
                  <select
                    className="in"
                    value={poison.counters ?? ''}
                    onChange={(e) =>
                      patch({
                        counters: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">(无)</option>
                    {others.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无毒定义
          </div>
        )}
      </div>

      {/* 右:提示 + 关系总览 */}
      <div className="inspector">
        <div className="pane-h">
          <span className="t">毒 · 编辑</span>
        </div>
        <div className="insp-hint">
          全字段即改即生效(⌘Z 可回)。逐回合序列 = 指针推进:固定毒一格即可(到尾重复),
          递进毒多格递增,末格勾「自解」= 暴扣后自除/寄生到期。致死/相克吃数据,改完立即
          反映到右下总览 —— 致死对不对称会标 ⚠。
        </div>
        <RelationOverview poisons={poisons} onPick={selectPoison} />
      </div>
    </>
  )
}
