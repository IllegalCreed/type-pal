/**
 * 事件库(数据模式,2026-07-05 作者定调 Step1)—— 全工程事件源可查询列表:
 * 场景 / 源(进场·触发·巡逻) / 触发方式 / 段·命令数,过滤 + 点击跳事件模式编辑。
 * Step2(立项):场景模式内嵌脚本编辑,独立事件模式退役 —— 见 editor-audit。
 */
import type { Command, SceneDef, ScriptStage } from '@type-pal/content'
import { useMemo, useState } from 'react'
import { COMMAND_CATALOG } from '../core/command-catalog.js'

interface EventRow {
  sceneId: string
  srcKey: string
  kindIcon: string
  kindLabel: string
  stages: number
  commands: number
}

/** 浅计命令数(不递归 branch 子命令 —— 列表量级感,非精确统计)。 */
function countCmds(stages: readonly ScriptStage[]): number {
  let n = 0
  for (const st of stages) n += (st.body as Command[]).length
  return n
}

function collectRows(scenes: readonly SceneDef[]): EventRow[] {
  const rows: EventRow[] = []
  for (const s of scenes) {
    if (s.onEnter?.length)
      rows.push({
        sceneId: s.id,
        srcKey: '__onEnter__',
        kindIcon: '🚩',
        kindLabel: '进场',
        stages: s.onEnter.length,
        commands: countCmds(s.onEnter),
      })
    for (const e of s.entities) {
      const page = e.pages?.[0]
      if (page?.trigger)
        rows.push({
          sceneId: s.id,
          srcKey: `${e.id}:trigger`,
          kindIcon: '🔗',
          kindLabel: `${e.id} · ${page.trigger.on === 'interact' ? '交互' : '触碰'}`,
          stages: page.trigger.stages.length,
          commands: countCmds(page.trigger.stages),
        })
      if (page?.auto)
        rows.push({
          sceneId: s.id,
          srcKey: `${e.id}:auto`,
          kindIcon: '🔁',
          kindLabel: `${e.id} · 巡逻`,
          stages: page.auto.stages.length,
          commands: countCmds(page.auto.stages),
        })
    }
  }
  return rows
}

/** 指令手册视图:43 种可用命令的目录(kind/参数/语义/原版 op 对照)。 */
function CatalogView(props: { filter: string }) {
  const { filter } = props
  const groups = useMemo(() => {
    const g = new Map<string, typeof COMMAND_CATALOG>()
    for (const c of COMMAND_CATALOG) {
      if (
        filter &&
        !c.name.includes(filter) &&
        !c.kind.toLowerCase().includes(filter.toLowerCase()) &&
        !(c.origin ?? '').toLowerCase().includes(filter.toLowerCase())
      )
        continue
      const list = g.get(c.group) ?? []
      list.push(c)
      g.set(c.group, list)
    }
    return g
  }, [filter])
  return (
    <div className="et-scroll catalog">
      {[...groups.entries()].map(([group, items]) => (
        <div key={group} className="section">
          <h4>{group}</h4>
          {items.map((c) => (
            <div key={c.kind} className="cat-row">
              <div className="cat-head">
                <span className="ico">{c.icon}</span>
                <b>{c.name}</b>
                <code className="mono">{c.kind}</code>
                {c.origin && <span className="cat-origin">原版 {c.origin}</span>}
              </div>
              <div className="cat-desc">{c.desc}</div>
              {c.params.length > 0 && (
                <div className="cat-params">
                  {c.params.map(([nm, d]) => (
                    <span key={nm}>
                      <code>{nm}</code> {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function EventLibTab(props: {
  scenes: SceneDef[]
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  tabBar?: React.ReactNode
}) {
  const { scenes, onJumpToEvent, tabBar } = props
  const [view, setView] = useState<'catalog' | 'overview'>('catalog')
  const [filter, setFilter] = useState('')
  const rows = useMemo(() => collectRows(scenes), [scenes])
  const shown = useMemo(
    () =>
      rows.filter(
        (r) => !filter || r.sceneId.includes(filter) || r.kindLabel.includes(filter),
      ),
    [rows, filter],
  )
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">事件库</span>
          <span className="spacer" />
          <span className="k">
            {view === 'catalog' ? `${COMMAND_CATALOG.length} 指令` : `${shown.length}/${rows.length}`}
          </span>
        </div>
        <div className="kind-filter">
          <button
            type="button"
            className={`kchip${view === 'catalog' ? ' on' : ''}`}
            onClick={() => setView('catalog')}
          >
            📖 指令手册
          </button>
          <button
            type="button"
            className={`kchip${view === 'overview' ? ' on' : ''}`}
            onClick={() => setView('overview')}
          >
            🗂 事件总览
          </button>
        </div>
        <input
          className="in"
          placeholder={view === 'catalog' ? '搜指令 名/kind/原版op…' : '过滤 场景/实体…'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="insp-empty" style={{ marginTop: 8 }}>
          {view === 'catalog'
            ? '全部可用脚本指令的参考手册(参数/语义/原版 opcode 对照);在事件模式「插入」使用它们。'
            : '全工程已编事件源一览(进场/触发/巡逻),点行跳事件模式编辑。'}
        </div>
      </div>
      <div className="canvas-wrap data-body">
        {view === 'catalog' ? (
          <CatalogView filter={filter} />
        ) : (
          <div className="et-scroll">
            <table className="music-table evlib-table">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>场景</th>
                  <th>源</th>
                  <th style={{ width: 48 }}>段</th>
                  <th style={{ width: 56 }}>命令</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={`${r.sceneId}-${r.srcKey}`}
                    className="evlib-row"
                    onClick={() => onJumpToEvent(r.sceneId, r.srcKey)}
                    title="跳事件模式编辑"
                  >
                    <td className="mono">{r.sceneId}</td>
                    <td>
                      {r.kindIcon} {r.kindLabel}
                    </td>
                    <td className="mono">{r.stages}</td>
                    <td className="mono">{r.commands}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
