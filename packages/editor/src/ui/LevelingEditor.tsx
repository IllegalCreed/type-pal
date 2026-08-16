/**
 * 升级编辑(C6 编辑器侧)—— 角色模式「升级」区(检查器窄栏只放**摘要 + 入口**;
 * 经验曲线本体在中区宽幅 LevelCurveEditor 拖点编辑 —— 作者:「一大堆数没站在用户角度」):
 * - 经验曲线摘要行 + 「📈 编辑曲线」按钮(中区打开)
 * - 升级学技能行(skills.json 的 levelUp[actorId];level + 技能下拉,UpdateLevelUpCommand)
 */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { UpdateLevelUpCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

export function LevelingEditor(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  levelUpRows: LevelUpSkill[]
  skills: SkillDataMap
  session: EditSession
  onEditCurve: () => void
}) {
  const { actor, levelUpRows, skills, session, onEditCurve } = props
  const expTable = actor.battler.leveling?.expTable ?? []
  const skillIds = Object.keys(skills)

  const dispatchRows = (rows: LevelUpSkill[]): void => {
    session.dispatch(
      new UpdateLevelUpCommand(
        actor.id,
        [...rows].sort((a, b) => a.level - b.level),
      ),
    )
  }

  return (
    <div className="actor-leveling-editor">
      <div className="field">
        <span className="field-label">经验曲线</span>
        <span className="hint2">
          {expTable.length
            ? `${expTable.length} 级 · 末级累计 ${expTable[expTable.length - 1]}`
            : '无曲线'}
        </span>
      </div>
      <button type="button" className="tool" onClick={onEditCurve}>
        📈 编辑曲线(中区拖点)
      </button>
      <div className="field" style={{ marginTop: 6 }}>
        <span className="field-label">升级学技能</span>
        <div className="hint2">升到该级自动习得(战后结算「练成」;等级线也画在曲线图上)</div>
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
