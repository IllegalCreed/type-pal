/**
 * 变量总览页(数据模式·变量标签,N5)—— 全工程 flag / 数值变量清单 + 引用反向索引。
 * 每行展开引用明细(场景 · 脚本源 · 读写形态),点明细跳事件模式定位到源。
 * 迁移内容(pal)不用 flag/var(走 entityState),此页为手工内容准备 —— 空态给说明。
 */
import { useMemo, useState } from 'react'
import type { RefEntry, RefIndex } from '../core/ref-index.js'

/** 引用明细列表(变量页/物品页共用):读写徽标 · 场景 · 源 · 形态,点击跳事件模式。 */
export function RefList(props: {
  refs: RefEntry[]
  onJump: (sceneId: string, srcKey: string) => void
}) {
  return (
    <div className="ref-list">
      {props.refs.map((r, i) => {
        const jumpable = !r.srcKey.endsWith(':hostile')
        return (
          <button
            type="button"
            key={`${r.sceneId}-${r.srcKey}-${i}`}
            className="ref-row"
            disabled={!jumpable}
            title={jumpable ? '跳到事件模式该脚本源' : 'hostile 战败命令:在布置模式实体检查器编辑'}
            onClick={() => props.onJump(r.sceneId, r.srcKey)}
          >
            <span className={`rw ${r.access}`}>{r.access === 'write' ? '写' : '读'}</span>
            <span className="mono">{r.sceneId}</span>
            <span className="src">{r.srcLabel}</span>
            <span className="det mono">{r.detail}</span>
          </button>
        )
      })}
    </div>
  )
}

function VarGroup(props: {
  title: string
  map: Map<string, RefEntry[]>
  filter: string
  onJump: (sceneId: string, srcKey: string) => void
}) {
  const { title, map, filter, onJump } = props
  const [open, setOpen] = useState<string | null>(null)
  const names = useMemo(
    () => [...map.keys()].filter((n) => !filter || n.includes(filter)).sort(),
    [map, filter],
  )
  return (
    <div className="var-group">
      <h4>
        {title} <span className="hint2">{names.length} 个</span>
      </h4>
      {names.length === 0 ? (
        <div className="insp-empty">(无)</div>
      ) : (
        names.map((n) => {
          const refs = map.get(n)!
          const reads = refs.filter((r) => r.access === 'read').length
          const writes = refs.length - reads
          return (
            <div key={n} className="var-row">
              <button type="button" className="var-head" onClick={() => setOpen(open === n ? null : n)}>
                <span className="caret">{open === n ? '▾' : '▸'}</span>
                <span className="mono nm">{n}</span>
                <span className="k">
                  读 {reads} · 写 {writes}
                </span>
              </button>
              {open === n && <RefList refs={refs} onJump={onJump} />}
            </div>
          )
        })
      )}
    </div>
  )
}

export function VarsTab(props: {
  refIndex: RefIndex
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  tabBar: React.ReactNode
}) {
  const { refIndex, onJumpToEvent, tabBar } = props
  const [filter, setFilter] = useState('')
  const empty = refIndex.flags.size === 0 && refIndex.vars.size === 0
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">变量</span>
          <span className="spacer" />
          <span className="k">
            {refIndex.flags.size} flag · {refIndex.vars.size} var
          </span>
        </div>
        <input
          className="in"
          placeholder="过滤名字"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="insp-empty" style={{ marginTop: 8 }}>
          扫全工程事件脚本(进场/触发/巡逻/战败命令)建反向索引;点引用行跳事件模式。
          物品的被引用列表在「物品」页详情里。
        </div>
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          {empty ? (
            <div className="insp-empty" style={{ margin: 16 }}>
              本工程事件脚本没用 flag / 数值变量。迁移内容(原版)走
              entityState/entityStage 状态机;flag/var 是手工剧情的工具 ——
              事件里插「branch / setFlag / setVar」命令后,此页自动列出。
            </div>
          ) : (
            <>
              <VarGroup title="🚩 flag(开关)" map={refIndex.flags} filter={filter} onJump={onJumpToEvent} />
              <VarGroup title="🔢 数值变量" map={refIndex.vars} filter={filter} onJump={onJumpToEvent} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
