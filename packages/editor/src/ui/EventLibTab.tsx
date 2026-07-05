/**
 * 事件库 = 指令手册(opcode 库;2026-07-05 作者定义:「能查询都有哪些可用的 opcode」)。
 * 43 种脚本指令目录:分组/参数/语义/原版 opcode 对照 + 搜索。
 * ⚠ 不放「已编事件链」列表(作者拍板:事件在场景中配置,属场景上下文,不是数据表;
 * 场景内事件的编辑与检索随 Step2「场景内嵌脚本编辑」走)。
 */
import { useMemo, useState } from 'react'
import { COMMAND_CATALOG } from '../core/command-catalog.js'

export function EventLibTab(props: { tabBar?: React.ReactNode }) {
  const { tabBar } = props
  const [filter, setFilter] = useState('')
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
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">事件库 · 指令手册</span>
          <span className="spacer" />
          <span className="k">{COMMAND_CATALOG.length} 指令</span>
        </div>
        <input
          className="in"
          placeholder="搜指令 名/kind/原版op…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="insp-empty" style={{ marginTop: 8 }}>
          全部可用脚本指令的参考手册(参数/语义/原版 opcode 对照);在事件模式「插入」
          使用它们。事件本身在场景中配置。
        </div>
      </div>
      <div className="canvas-wrap data-body">
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
      </div>
    </>
  )
}
