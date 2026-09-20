import { lookupText } from '@type-pal/content'
import { type BattleTrialConfig, collectBattleTrialIssues } from '@type-pal/reforge'
import { useState } from 'react'
import { emptyBattleSimulatorLibrary } from '../core/battle-simulator-library.js'
import {
  applyTrialSubject,
  type BattleSimulatorDraft,
  type BattleTrialSubject,
  emptyTrialPlan,
  resolveTrialDraft,
  trialCatalog,
} from '../core/battle-simulator-state.js'
import type { EditorState } from '../core/edit-session.js'
import { DsButton, DsFieldGroup, DsSelectField } from './design-system/controls.js'
import { DsDialog } from './design-system/overlays.js'
import './battle-simulator.css'

export function BattleTrialDialog(props: {
  subject: BattleTrialSubject | undefined
  state: EditorState
  projectDirty: boolean
  onClose: () => void
  onSave: () => void
  onDetail: (draft: BattleSimulatorDraft) => void
  onStart: (config: BattleTrialConfig) => Promise<void>
}) {
  const [planId, setPlanId] = useState(() =>
      props.state.battleSimulator?.plans.length === 1
        ? (props.state.battleSimulator.plans[0]?.id ?? '')
        : '',
    ),
    [actorId, setActorId] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const library = props.state.battleSimulator ?? emptyBattleSimulatorLibrary()
  if (!props.subject) return null
  const subject = props.subject
  const named = library.plans.find((plan) => plan.id === planId)
  const base = named?.config ?? emptyTrialPlan(props.state)
  let members: Array<{ actorId: string }> = []
  try {
    members = resolveTrialDraft(library, base).party.members
  } catch {}
  const caster = actorId || (members.length === 1 ? members[0]!.actorId : '')
  const detail = () => {
    try {
      if (planId && !named) throw new Error('所选方案已不存在')
      const deferSkill = subject.kind === 'skill' && !caster
      const plan = deferSkill
        ? structuredClone(base)
        : applyTrialSubject(base, library, props.state, subject, caster)
      props.onDetail({
        label: `${named?.name ?? '临时方案'} · 本场`,
        plan,
        changed: true,
        ...(deferSkill ? { subject } : {}),
      })
      props.onClose()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }
  const start = async () => {
    try {
      if (!named) throw new Error('请选择完整试打方案，或进入详细配置')
      setBusy(true)
      const config = resolveTrialDraft(
        library,
        applyTrialSubject(base, library, props.state, subject, caster),
      )
      const issue = collectBattleTrialIssues(config, trialCatalog(props.state)).find(
        (issue) => issue.severity === 'error',
      )
      if (issue) throw new Error(issue.message)
      await props.onStart(config)
      props.onClose()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  const title =
    subject.kind === 'skill'
      ? '战斗中试放'
      : subject.kind === 'enemy-team'
        ? '敌队试打'
        : '敌人试打'
  const summary =
    subject.kind === 'skill'
      ? `仅本场为所选队员加入技能 ${props.state.skills.find((skill) => skill.id === subject.id)?.name ?? subject.id}；不自动补真气。`
      : subject.kind === 'enemy-team'
        ? `仅本场替换为敌队 ${subject.id}。`
        : `仅本场以敌人 ${subject.id} 组成单敌编队。`
  return (
    <DsDialog
      open
      title={title}
      onClose={props.onClose}
      description="选择完整方案，再带入当前对象；不会改原方案或预设。"
      footer={
        <>
          <DsButton onClick={props.onClose}>取消</DsButton>
          <DsButton disabled={busy} onClick={detail}>
            到模拟器详细配置
          </DsButton>
          <DsButton
            variant="primary"
            busy={busy}
            disabled={props.projectDirty || !named || (subject.kind === 'skill' && !caster)}
            onClick={() => void start()}
          >
            开始试打
          </DsButton>
        </>
      }
    >
      <div className="trial-dialog-content">
        <DsFieldGroup>
          <DsSelectField
            label="试打方案"
            value={planId}
            placeholder="选择方案"
            options={library.plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            onValueChange={(id) => {
              setPlanId(id)
              setActorId('')
            }}
          />
          {subject.kind === 'skill' && (
            <DsSelectField
              label="施放队员"
              value={caster}
              placeholder="选择本方案的队员"
              options={members.map((member) => ({
                value: member.actorId,
                label: lookupText(
                  props.state.actors.find((actor) => actor.id === member.actorId)?.name ??
                    member.actorId,
                  props.state.locale,
                ),
              }))}
              onValueChange={setActorId}
            />
          )}
        </DsFieldGroup>
        <p>{summary}</p>
        {!library.plans.length && (
          <p>还没有试打方案。进入详细配置即可准备本场，不必先建四份预设。</p>
        )}
        {props.projectDirty && (
          <div className="trial-actions">
            <span>项目有未保存改动。</span>
            <DsButton onClick={props.onSave}>保存项目</DsButton>
          </div>
        )}
        {notice && (
          <p role="alert" className="trial-error">
            {notice}
          </p>
        )}
      </div>
    </DsDialog>
  )
}
