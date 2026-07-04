/**
 * 升级编辑(C6 编辑器侧)—— 角色模式「升级」区:
 * - expTable 经验曲线(actor.battler.leveling;textarea 数字串失焦提交,UpdateActorCommand)
 * - 升级学技能行(skills.json 的 levelUp[actorId];level + 技能下拉,UpdateLevelUpCommand)
 */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { useState } from 'react'
import { UpdateActorCommand, UpdateLevelUpCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

/** 解析经验曲线文本:逗号/空白分隔非负整数;含非法 token 返回 null(不落盘)。 */
export function parseExpTable(text: string): number[] | null {
  const tokens = text.split(/[\s,]+/).filter(Boolean)
  const out: number[] = []
  for (const t of tokens) {
    const n = Number(t)
    if (!Number.isInteger(n) || n < 0) return null
    out.push(n)
  }
  return out
}

export function LevelingEditor(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  levelUpRows: LevelUpSkill[]
  skills: SkillDataMap
  session: EditSession
}) {
  const { actor, levelUpRows, skills, session } = props
  const [open, setOpen] = useState(false)
  const [expErr, setExpErr] = useState(false)
  const expTable = actor.battler.leveling?.expTable ?? []
  const skillIds = Object.keys(skills)

  const dispatchRows = (rows: LevelUpSkill[]): void => {
    session.dispatch(
      new UpdateLevelUpCommand(actor.id, [...rows].sort((a, b) => a.level - b.level)),
    )
  }

  if (!open) {
    return (
      <div className="section">
        <button type="button" className="collapsed as-btn" onClick={() => setOpen(true)}>
          ▸ 升级{' '}
          <span style={{ color: 'var(--faint)' }}>
            {expTable.length ? `expTable ${expTable.length} 级` : '无曲线'} · 学技能{' '}
            {levelUpRows.length} 行
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="section">
      <button type="button" className="collapsed as-btn" onClick={() => setOpen(false)}>
        ▾ 升级
      </button>
      <div className="field">
        <label>经验曲线</label>
        <div className="hint2">
          升到 L+1 级需累计经验(下标 = 当前级);逗号/空白分隔,{expTable.length} 级
          {expErr ? <span style={{ color: 'var(--err)' }}> · 含非法数字,未保存</span> : null}
        </div>
      </div>
      <textarea
        className="in cf-ta exp-ta"
        key={`${actor.id}-exp`}
        defaultValue={expTable.join(', ')}
        spellCheck={false}
        onBlur={(e) => {
          const parsed = parseExpTable(e.target.value)
          if (!parsed) {
            setExpErr(true)
            return
          }
          setExpErr(false)
          const same = parsed.length === expTable.length && parsed.every((n, i) => n === expTable[i])
          if (same) return
          session.dispatch(
            new UpdateActorCommand(actor.id, {
              battler: {
                ...actor.battler,
                ...(parsed.length ? { leveling: { expTable: parsed } } : {}),
              },
            }),
          )
        }}
      />
      <div className="field" style={{ marginTop: 6 }}>
        <label>升级学技能</label>
        <div className="hint2">升到该级自动习得(战后结算「练成」)</div>
      </div>
      {levelUpRows.map((r, i) => (
        <div className="pt-row" key={`${r.level}-${r.skillId}-${i}`}>
          <input
            className="in mono entry-n"
            type="number"
            title="等级"
            value={r.level}
            onChange={(e) => {
              if (!Number.isFinite(e.target.valueAsNumber)) return
              const rows = [...levelUpRows]
              rows[i] = { ...r, level: e.target.valueAsNumber }
              dispatchRows(rows)
            }}
            onWheel={(e) => e.currentTarget.blur()}
          />
          <select
            className="in"
            value={r.skillId}
            onChange={(e) => {
              const rows = [...levelUpRows]
              rows[i] = { ...r, skillId: e.target.value }
              dispatchRows(rows)
            }}
          >
            {!skillIds.includes(r.skillId) && <option value={r.skillId}>{r.skillId} (缺)</option>}
            {skillIds.map((sid) => (
              <option key={sid} value={sid}>
                {skills[sid]?.name ?? sid}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mini"
            title="删除此行"
            onClick={() => dispatchRows(levelUpRows.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="tool"
        onClick={() => {
          const maxLv = levelUpRows.reduce((m, r) => Math.max(m, r.level), 0)
          dispatchRows([...levelUpRows, { level: maxLv + 1, skillId: skillIds[0] ?? '' }])
        }}
      >
        ＋ 添加学技能行
      </button>
    </div>
  )
}
