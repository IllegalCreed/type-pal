/**
 * 技能编辑页(数据模式·技能标签)—— 此前是空壳标签(2026-07-05 审计断点 #6),现补齐。
 * 左:技能列表(过滤 id/名);中:基础字段(名字/说明/战外可用)+ cost/target/effects/
 * animation 走 JSON 兜底(同 ItemTab/EnemyTab 哲学:全数据可编不留死角)。
 */
import type { SkillData } from '@type-pal/content'
import { useMemo, useState } from 'react'
import { UpdateSkillCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

export function SkillTab(props: {
  skills: SkillData[]
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { skills, session, tabBar } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(skills[0]?.id ?? '')
  const shown = useMemo(
    () => skills.filter((s) => !filter || s.id.includes(filter) || s.name.includes(filter)),
    [skills, filter],
  )
  const skill = skills.find((s) => s.id === selId) ?? shown[0]
  const patch = (p: Partial<Omit<SkillData, 'id'>>): void => {
    if (skill) session.dispatch(new UpdateSkillCommand(skill.id, p))
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">技能</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{skills.length}
          </span>
        </div>
        <input
          className="in"
          placeholder="过滤 id/名…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="sprite-list">
          {shown.map((s) => (
            <button
              type="button"
              key={s.id}
              className={`arow${s.id === skill?.id ? ' sel' : ''}`}
              onClick={() => setSelId(s.id)}
            >
              <span className="nm">
                {s.name}
                <span className="meta"> {s.id}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="canvas-wrap data-body">
        {skill ? (
          <div className="et-scroll">
            <div className="section">
              <h4>基础</h4>
              <div className="field">
                <label>名字</label>
                <input
                  className="in"
                  value={skill.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>战外可用</label>
                <div>
                  <input
                    type="checkbox"
                    checked={skill.usableOutsideBattle}
                    onChange={(e) => patch({ usableOutsideBattle: e.target.checked })}
                  />{' '}
                  大世界仙术菜单可放(疗伤类)
                </div>
              </div>
              <div className="field">
                <label>说明</label>
                <textarea
                  className="in cf-ta"
                  key={`${skill.id}-desc`}
                  defaultValue={skill.desc}
                  onBlur={(e) => {
                    if (e.target.value !== skill.desc) patch({ desc: e.target.value })
                  }}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="section">
              <h4>
                消耗 / 目标 / 效果 / 动画
                <span className="hint2">(JSON 兜底;结构见 content/skill.ts)</span>
              </h4>
              <textarea
                className="in cf-ta it-ta it-ta-tall"
                key={`${skill.id}-spec`}
                defaultValue={JSON.stringify(
                  {
                    cost: skill.cost,
                    target: skill.target,
                    effects: skill.effects,
                    animation: skill.animation,
                  },
                  null,
                  2,
                )}
                onBlur={(e) => {
                  try {
                    const v = JSON.parse(e.target.value) as Pick<
                      SkillData,
                      'cost' | 'target' | 'effects' | 'animation'
                    >
                    patch({
                      cost: v.cost,
                      target: v.target,
                      effects: v.effects,
                      animation: v.animation,
                    })
                  } catch {
                    /* 解析失败不落盘;失焦保持原文供修 */
                  }
                }}
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无技能
          </div>
        )}
      </div>
      <div className="inspector">
        <div className="pane-h">
          <span className="t">技能 · 编辑</span>
        </div>
        <div className="insp-hint">
          名字/说明/战外可用即改即生效(撤销可回);消耗/目标/效果/动画走 JSON——改完
          💾 保存,战斗/菜单立即消费。升级学技能表在「角色」模式的升级区编辑。
        </div>
      </div>
    </>
  )
}
