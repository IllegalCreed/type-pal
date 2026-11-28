/** Edits level-up skill rules in the actor growth panel and opens the center experience chart. */
import type { ActorDef, LevelUpSkill, SkillDataMap } from '@type-pal/content'
import { memo, useMemo } from 'react'
import { UpdateLevelUpCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import {
  DsButton,
  DsDraftNumberInput,
  DsField,
  DsFieldGroup,
  DsIconButton,
  DsSelect,
} from './design-system/controls.js'

function LevelingEditorImpl(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  levelUpRows: LevelUpSkill[]
  skills: SkillDataMap
  session: EditSession
  syncToken: number
  onEditCurve: () => void
}) {
  const { actor, levelUpRows, skills, session, syncToken, onEditCurve } = props
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
  const canAddSkill = skillOptions.length > 0
  const rowOptions = useMemo(
    () =>
      levelUpRows.map((row) =>
        skills[row.skillId]
          ? skillOptions
          : [{ value: row.skillId, label: `${row.skillId}（缺失）` }, ...skillOptions],
      ),
    [levelUpRows, skillOptions, skills],
  )
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
      <DsFieldGroup>
        <DsField id="actor-level-curve-summary" label="经验曲线">
          {(field) => (
            <output id={field.id} className="hint2">
              {expTable.length
                ? `${expTable.length} 级 · 末级累计 ${expTable[expTable.length - 1]}`
                : '无曲线'}
            </output>
          )}
        </DsField>
      </DsFieldGroup>
      <DsButton onClick={onEditCurve} size="compact" variant="secondary">
        📈 编辑曲线(中区拖点)
      </DsButton>
      <div className="leveling-skill-intro">
        <strong>升级学技能</strong>
        <p className="hint2">升到该级自动习得(战后结算「练成」;等级线也画在曲线图上)</p>
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
          <DsIconButton
            label={`删除等级 ${r.level} 的学技能行`}
            icon="delete"
            variant="danger"
            onClick={() => dispatchRows(levelUpRows.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <DsButton
        data-ds-add-picker-deferred="actor/level-up-skill-append-default"
        disabled={!canAddSkill}
        title={canAddSkill ? undefined : '请先创建可习得技能'}
        onClick={() => {
          const skillId = Object.keys(skills)[0]
          if (skillId === undefined) return
          const maxLv = levelUpRows.reduce((m, r) => Math.max(m, r.level), 0)
          dispatchRows([...levelUpRows, { level: maxLv + 1, skillId }])
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
    left.syncToken === right.syncToken &&
    left.onEditCurve === right.onEditCurve,
)
