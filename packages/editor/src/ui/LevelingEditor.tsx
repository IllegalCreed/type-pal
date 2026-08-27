/**
 * 升级编辑(C6 编辑器侧)—— 角色模式「升级」区(检查器窄栏只放**摘要 + 入口**;
 * 经验曲线本体在中区宽幅 LevelCurveEditor 拖点编辑 —— 作者:「一大堆数没站在用户角度」):
 * - 经验曲线摘要行 + 「📈 编辑曲线」按钮(中区打开)
 * - 升级学技能行(skills.json 的 levelUp[actorId];level + 技能下拉,UpdateLevelUpCommand)
 */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { memo, useMemo } from 'react'
import { UpdateLevelUpCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { DsButton, DsDraftNumberInput, DsSelect } from './design-system/controls.js'

function LevelingEditorImpl(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  levelUpRows: LevelUpSkill[]
  skills: SkillDataMap
  session: EditSession
  onEditCurve: () => void
}) {
  const { actor, levelUpRows, skills, session, onEditCurve } = props
  const expTable = actor.battler.leveling?.expTable ?? []
  const skillOptions = useMemo(
    () =>
      Object.entries(skills).map(([skillId, skill]) => ({
        value: skillId,
        label: skill?.name ?? skillId,
        description: skillId,
      })),
    [skills],
  )
  const skillIds = useMemo(() => skillOptions.map((option) => option.value), [skillOptions])
  const rowOptions = useMemo(
    () =>
      levelUpRows.map((row) =>
        skills[row.skillId]
          ? skillOptions
          : [{ value: row.skillId, label: `${row.skillId}（缺失）` }, ...skillOptions],
      ),
    [levelUpRows, skillOptions, skills],
  )
  const syncToken = session.getHistoryVersion()

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
      <DsButton onClick={onEditCurve} size="compact" variant="secondary">
        📈 编辑曲线(中区拖点)
      </DsButton>
      <div className="field leveling-skill-field">
        <span className="field-label">升级学技能</span>
        <div className="hint2">升到该级自动习得(战后结算「练成」;等级线也画在曲线图上)</div>
      </div>
      {levelUpRows.map((r, i) => (
        <div className="pt-row" key={`${r.level}-${r.skillId}-${i}`}>
          <span className="entry-n">
            <DsDraftNumberInput
              title="等级"
              draftKey={`actor:${actor.id}:level-up:${i}:level`}
              syncToken={syncToken}
              value={r.level}
              onCommit={(level) => {
                if (level === undefined || level === r.level) return
                const rows = [...levelUpRows]
                rows[i] = { ...r, level }
                dispatchRows(rows)
              }}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </span>
          <DsSelect
            aria-label={`等级 ${r.level} 学习的技能`}
            value={r.skillId}
            options={rowOptions[i] ?? skillOptions}
            onValueChange={(value) => {
              const rows = [...levelUpRows]
              rows[i] = { ...r, skillId: value }
              dispatchRows(rows)
            }}
          />
          <DsButton
            title="删除此行"
            onClick={() => dispatchRows(levelUpRows.filter((_, j) => j !== i))}
            size="compact"
            variant="secondary"
          >
            ✕
          </DsButton>
        </div>
      ))}
      <DsButton
        data-ds-add-picker-deferred="actor/level-up-skill-append-default"
        onClick={() => {
          const maxLv = levelUpRows.reduce((m, r) => Math.max(m, r.level), 0)
          dispatchRows([...levelUpRows, { level: maxLv + 1, skillId: skillIds[0] ?? '' }])
        }}
        size="compact"
        variant="secondary"
      >
        ＋ 添加学技能行
      </DsButton>
    </div>
  )
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export const LevelingEditor = memo(
  LevelingEditorImpl,
  (left, right) =>
    left.actor.id === right.actor.id &&
    sameNumbers(
      left.actor.battler.leveling?.expTable ?? [],
      right.actor.battler.leveling?.expTable ?? [],
    ) &&
    left.levelUpRows === right.levelUpRows &&
    left.skills === right.skills &&
    left.session === right.session &&
    left.onEditCurve === right.onEditCurve,
)
