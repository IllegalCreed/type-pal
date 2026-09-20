import { lookupText } from '@type-pal/content'
import {
  type BattleTrialConfig,
  collectBattleTrialIssues,
  parseTrialBag,
  parseTrialEnemies,
  parseTrialParty,
} from '@type-pal/reforge'
import { useEffect, useMemo, useState } from 'react'
import {
  battleSimulatorDependentPlans,
  deleteBattleSimulatorRecord,
  putBattleSimulatorRecord,
  SetBattleSimulatorLibraryCommand,
  type SimulatorDirectory,
} from '../core/battle-simulator-commands.js'
import {
  emptyBattleSimulatorLibrary,
  type TrialPlan,
  type TrialPreset,
} from '../core/battle-simulator-library.js'
import {
  applyTrialSubject,
  type BattleSimulatorDraft,
  collectSimulatorLibraryIssues,
  emptyTrialPlan,
  resolveTrialDraft,
  trialCatalog,
} from '../core/battle-simulator-state.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import { TrialBagEditor, TrialEnemiesEditor, TrialPartyEditor } from './BattleSimulatorForms.js'
import {
  DsButton,
  DsCheckbox,
  DsDraftNumberField,
  DsDraftTextAreaField,
  DsDraftTextField,
  DsEmptyState,
  DsFieldGroup,
  DsSelectField,
  DsTag,
} from './design-system/controls.js'
import { DsDialog } from './design-system/overlays.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsInlineComposer,
  DsObjectHero,
  DsObjectWorkspace,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import './battle-simulator.css'

export const SIMULATOR_LABELS = {
  plans: '试打方案',
  allies: '我方预设',
  enemies: '敌方预设',
  bags: '背包预设',
} as const
export interface BattleSimulatorWorkbenchProps {
  directory: SimulatorDirectory
  state: EditorState
  session: EditSession
  objectId?: string
  onObjectFocus: (id: string | undefined) => void
  draft: BattleSimulatorDraft | undefined
  onDraftChange: (draft: BattleSimulatorDraft | undefined) => void
  onStart: (config: BattleTrialConfig) => Promise<void>
  projectDirty: boolean
  onSave: () => void
}
export function BattleSimulatorWorkbench(props: BattleSimulatorWorkbenchProps) {
  const { state, session, directory, onObjectFocus, draft, onDraftChange } = props
  const library = state.battleSimulator ?? emptyBattleSimulatorLibrary()
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const [pendingActor, setPendingActor] = useState('')
  const replacementScope = useMemo(
    () => ({ state, draft, directory, objectId: props.objectId }),
    [state, draft, directory, props.objectId],
  )
  const [replacement, setReplacement] = useState<{
    scope: typeof replacementScope
    draft: BattleSimulatorDraft
  }>()
  useEffect(() => {
    if (replacement && replacement.scope !== replacementScope) setReplacement(undefined)
  }, [replacement, replacementScope])
  const [deleting, setDeleting] = useState<
    { directory: SimulatorDirectory; id: string; plans: string[] } | undefined
  >()
  const isDraft = directory === 'plans' && !props.objectId && !!draft
  const rows = library[directory]
  const selected = props.objectId
    ? rows.find((row) => row.id === props.objectId)
    : isDraft
      ? undefined
      : rows[0]
  const record: TrialPreset<unknown> | undefined = isDraft
    ? {
        id: 'current-trial',
        name: draft.label,
        description: '仅本场临时配置，尚未另存为命名方案',
        config: draft.plan,
      }
    : selected
  const allIssues = useMemo(
    () =>
      collectSimulatorLibraryIssues(state.battleSimulator ?? emptyBattleSimulatorLibrary(), state),
    [state],
  )
  const act = (operation: () => void) => {
    try {
      operation()
      setNotice('')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
      return false
    }
  }
  const update = (next: TrialPreset<unknown>) => {
    if (isDraft) {
      onDraftChange({ ...draft, label: next.name, plan: next.config as TrialPlan, changed: true })
      return
    }
    act(() =>
      session.dispatch(
        new SetBattleSimulatorLibraryCommand(
          putBattleSimulatorRecord(session.getState().battleSimulator, directory, next),
        ),
      ),
    )
  }
  const updateConfig = (config: unknown) => {
    if (record) update({ ...record, config })
  }
  const add = (copy = false) =>
    act(() => {
      const id = crypto.randomUUID()
      const config =
        copy && record
          ? structuredClone(record.config)
          : directory === 'plans'
            ? emptyTrialPlan(state)
            : directory === 'allies'
              ? { members: [] }
              : directory === 'enemies'
                ? { kind: 'slots', slots: [null, null, null, null, null] }
                : { items: [] }
      session.dispatch(
        new SetBattleSimulatorLibraryCommand(
          putBattleSimulatorRecord(session.getState().battleSimulator, directory, {
            id,
            name: copy && record ? `${record.name} 副本` : `新${SIMULATOR_LABELS[directory]}`,
            description: '',
            config,
          }),
        ),
      )
      onObjectFocus(id)
    })
  const makeDraft = () => {
    onDraftChange({ label: '本场临时方案', plan: emptyTrialPlan(state), changed: false })
    onObjectFocus(undefined)
  }
  const plan =
    directory === 'plans'
      ? isDraft
        ? draft.plan
        : library.plans.find((row) => row.id === record?.id)?.config
      : undefined
  let resolved: BattleTrialConfig | undefined,
    planError = ''
  if (plan) {
    try {
      resolved = resolveTrialDraft(library, plan)
    } catch (error) {
      planError = error instanceof Error ? error.message : String(error)
    }
  }
  const issues = resolved
    ? collectBattleTrialIssues(resolved, trialCatalog(state))
    : record && !planError
      ? allIssues.filter((issue) => issue.directory === directory && issue.recordId === record.id)
      : []
  const start = async () => {
    if (!plan || busy) return
    try {
      const fresh = resolveTrialDraft(
        session.getState().battleSimulator ?? emptyBattleSimulatorLibrary(),
        plan,
      )
      const error = collectBattleTrialIssues(fresh, trialCatalog(session.getState())).find(
        (issue) => issue.severity === 'error',
      )
      if (error) throw new Error(error.message)
      setBusy(true)
      setNotice('')
      await props.onStart(fresh)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  const temporary = (next: TrialPlan) => {
    const nextDraft = {
      label: record ? `${record.name} · 本场` : '本场临时方案',
      plan: next,
      changed: true,
    }
    if (draft?.changed && !isDraft) {
      setReplacement({ scope: replacementScope, draft: nextDraft })
      return
    }
    onDraftChange(nextDraft)
    onObjectFocus(undefined)
  }
  const fieldKey = `simulator:${directory}:${record?.id ?? 'empty'}`
  return (
    <>
      <DsCatalogWorkspace
        label={SIMULATOR_LABELS[directory]}
        className="outliner data-outliner"
        header={
          <DsCatalogControls
            title={SIMULATOR_LABELS[directory]}
            count={rows.length}
            unit="份"
            actions={[{ id: 'new-trial-record', label: '新建', icon: 'add', onClick: () => add() }]}
          />
        }
      >
        {directory === 'plans' && (
          <DsCatalogRow
            title="本场临时方案"
            meta={draft ? '可继续调整' : '无需先保存命名预设'}
            selected={isDraft}
            onClick={() => (draft ? onObjectFocus(undefined) : makeDraft())}
          />
        )}
        {rows.map((row) => (
          <DsCatalogRow
            key={row.id}
            title={row.name}
            selected={!isDraft && row.id === record?.id}
            meta={
              allIssues.some(
                (issue) =>
                  issue.directory === directory &&
                  issue.recordId === row.id &&
                  issue.severity === 'error',
              )
                ? '配置待完善'
                : undefined
            }
            onClick={() => onObjectFocus(row.id)}
          />
        ))}
      </DsCatalogWorkspace>
      <div className="canvas-wrap data-body simulator-workbench">
        <DsObjectWorkspace
          label={SIMULATOR_LABELS[directory]}
          hero={
            record ? (
              <DsObjectHero
                eyebrow="战斗模拟器"
                title={record.name}
                summary={
                  isDraft
                    ? '本场变化不写回原方案、预设或角色定义。'
                    : '测试配置随项目保存；不保存战斗消耗、奖励或进度。'
                }
                meta={
                  <DsTag tone={isDraft ? 'warning' : 'neutral'}>
                    {isDraft ? '仅本场' : '命名配置'}
                  </DsTag>
                }
                actions={
                  <>
                    {isDraft ? (
                      <DsButton
                        onClick={() =>
                          act(() => {
                            const id = crypto.randomUUID()
                            session.dispatch(
                              new SetBattleSimulatorLibraryCommand(
                                putBattleSimulatorRecord(
                                  session.getState().battleSimulator,
                                  'plans',
                                  { ...record, id, name: record.name.replace(/ · 本场$/, '') },
                                ),
                              ),
                            )
                            onDraftChange(undefined)
                            onObjectFocus(id)
                          })
                        }
                      >
                        另存为方案
                      </DsButton>
                    ) : (
                      <DsButton onClick={() => add(true)}>复制</DsButton>
                    )}
                    {!isDraft && (
                      <DsButton
                        variant="danger"
                        onClick={() =>
                          setDeleting({
                            directory,
                            id: record.id,
                            plans: battleSimulatorDependentPlans(library, directory, record.id),
                          })
                        }
                      >
                        删除
                      </DsButton>
                    )}
                    {isDraft && (
                      <DsButton
                        onClick={() => {
                          onDraftChange(undefined)
                          onObjectFocus(library.plans[0]?.id)
                        }}
                      >
                        丢弃临时调整
                      </DsButton>
                    )}
                  </>
                }
              />
            ) : undefined
          }
        >
          {notice && (
            <p role="alert" className="trial-error">
              {notice}
            </p>
          )}
          {!record ? (
            <DsEmptyState
              title={`尚无${SIMULATOR_LABELS[directory]}`}
              description="创建可复用配置，或从试打方案直接配置本场。"
              action={<DsButton onClick={() => add()}>新建</DsButton>}
            />
          ) : (
            <>
              <DsFieldGroup className="trial-metadata-fields">
                <DsDraftTextField
                  label="名称"
                  draftKey={`${fieldKey}:name`}
                  value={record.name}
                  validate={(name) => (name.trim() ? undefined : '名称不能为空')}
                  onCommit={(name) => update({ ...record, name })}
                />
                {!isDraft && (
                  <DsDraftTextAreaField
                    label="说明"
                    draftKey={`${fieldKey}:description`}
                    value={record.description}
                    onCommit={(description) => update({ ...record, description })}
                  />
                )}
              </DsFieldGroup>
              {(planError || issues.length > 0) && (
                <section className="trial-issues" aria-label="配置检查">
                  {planError && <p role="alert">{planError}</p>}
                  {issues.map((issue, i) => (
                    <p
                      key={`${issue.path}:${i}`}
                      className={issue.severity === 'error' ? 'trial-error' : 'hint2'}
                    >
                      {issue.message}
                      <small>（{issue.path}）</small>
                    </p>
                  ))}
                </section>
              )}
              {directory === 'allies' && (
                <TrialPartyEditor
                  value={parseTrialParty(record.config)}
                  onChange={updateConfig}
                  state={state}
                  scope={fieldKey}
                />
              )}
              {directory === 'enemies' && (
                <TrialEnemiesEditor
                  value={parseTrialEnemies(record.config)}
                  onChange={updateConfig}
                  state={state}
                />
              )}
              {directory === 'bags' && (
                <TrialBagEditor
                  value={parseTrialBag(record.config)}
                  onChange={updateConfig}
                  state={state}
                  scope={fieldKey}
                />
              )}
              {plan && (
                <>
                  {isDraft && draft.subject?.kind === 'skill' && (
                    <DsWorkbenchSection
                      title="加入待试技能"
                      description={`当前技能：${state.skills.find((skill) => skill.id === draft.subject?.id)?.name ?? draft.subject.id}。配置队伍后，明确选择施放队员；不会自动补真气。`}
                    >
                      <DsInlineComposer
                        className="trial-inline-entry"
                        density="default"
                        control={
                          <DsSelectField
                            label="施放队员"
                            value={pendingActor}
                            placeholder="选择本场队员"
                            options={(resolved?.party.members ?? []).map((member) => ({
                              value: member.actorId,
                              label: lookupText(
                                state.actors.find((actor) => actor.id === member.actorId)?.name ??
                                  member.actorId,
                                state.locale,
                              ),
                            }))}
                            onValueChange={setPendingActor}
                          />
                        }
                        action={
                          <DsButton
                            disabled={!pendingActor}
                            onClick={() =>
                              act(() => {
                                if (!draft.subject) return
                                const next = applyTrialSubject(
                                  plan,
                                  library,
                                  session.getState(),
                                  draft.subject,
                                  pendingActor,
                                )
                                onDraftChange({ label: draft.label, plan: next, changed: true })
                              })
                            }
                          >
                            加入当前技能
                          </DsButton>
                        }
                      />
                    </DsWorkbenchSection>
                  )}
                  <DsWorkbenchSection
                    title="配置来源"
                    description="可引用命名预设，也可直接在本方案内配置，不要求先创建四份记录。"
                  >
                    <div className="trial-config-columns">
                      {(['party', 'enemies', 'bag'] as const).map((key) => {
                        const source = plan[key],
                          table =
                            key === 'party'
                              ? library.allies
                              : key === 'enemies'
                                ? library.enemies
                                : library.bags
                        return (
                          <DsFieldGroup key={key}>
                            <DsSelectField
                              label={key === 'party' ? '我方' : key === 'enemies' ? '敌方' : '背包'}
                              value={
                                source.kind === 'inline' ? 'inline' : `preset:${source.presetId}`
                              }
                              options={[
                                { value: 'inline', label: '在本方案内配置' },
                                ...table.map((row) => ({
                                  value: `preset:${row.id}`,
                                  label: row.name,
                                })),
                              ]}
                              onValueChange={(choice) => {
                                const config =
                                  choice === 'inline'
                                    ? (resolved?.[key] ??
                                      (key === 'party'
                                        ? { members: [] }
                                        : key === 'enemies'
                                          ? { kind: 'slots', slots: [null, null, null, null, null] }
                                          : { items: [] }))
                                    : undefined
                                updateConfig({
                                  ...plan,
                                  [key]:
                                    choice === 'inline'
                                      ? { kind: 'inline', config }
                                      : { kind: 'preset', presetId: choice.slice(7) },
                                })
                              }}
                            />
                          </DsFieldGroup>
                        )
                      })}
                    </div>
                    {plan.party.kind === 'inline' && (
                      <TrialPartyEditor
                        value={plan.party.config}
                        onChange={(config) =>
                          updateConfig({ ...plan, party: { kind: 'inline', config } })
                        }
                        state={state}
                        scope={`${fieldKey}:inline-party`}
                      />
                    )}
                    {plan.enemies.kind === 'inline' && (
                      <TrialEnemiesEditor
                        value={plan.enemies.config}
                        onChange={(config) =>
                          updateConfig({ ...plan, enemies: { kind: 'inline', config } })
                        }
                        state={state}
                      />
                    )}
                    {plan.bag.kind === 'inline' && (
                      <TrialBagEditor
                        value={plan.bag.config}
                        onChange={(config) =>
                          updateConfig({ ...plan, bag: { kind: 'inline', config } })
                        }
                        state={state}
                        scope={`${fieldKey}:inline-bag`}
                      />
                    )}
                  </DsWorkbenchSection>
                  <DsWorkbenchSection title="本场条件">
                    <div className="trial-config-columns">
                      <DsFieldGroup>
                        <DsSelectField
                          label="战场"
                          value={String(plan.fieldId)}
                          placeholder="选择战场"
                          options={(state.battleFields ?? []).map((field) => ({
                            value: String(field.id),
                            label: field.name ?? `战场 ${field.id}`,
                          }))}
                          onValueChange={(id) => updateConfig({ ...plan, fieldId: Number(id) })}
                        />
                      </DsFieldGroup>
                      <DsFieldGroup>
                        <DsSelectField
                          label="战斗音乐"
                          value={
                            plan.music.kind === 'asset'
                              ? `asset:${plan.music.assetId}`
                              : plan.music.kind
                          }
                          options={[
                            { value: 'default', label: '使用项目默认' },
                            { value: 'silent', label: '静音' },
                            ...Object.entries(state.assetCatalog.assets)
                              .filter(([, r]) => r.kind === 'music')
                              .map(([id, r]) => ({ value: `asset:${id}`, label: r.label ?? id })),
                          ]}
                          onValueChange={(value) =>
                            updateConfig({
                              ...plan,
                              music: value.startsWith('asset:')
                                ? { kind: 'asset', assetId: value.slice(6) }
                                : { kind: value === 'silent' ? 'silent' : 'default' },
                            })
                          }
                        />
                      </DsFieldGroup>
                    </div>
                    <DsFieldGroup>
                      <DsDraftNumberField
                        label="测试金钱"
                        draftKey={`${fieldKey}:money`}
                        value={plan.money}
                        integer
                        min={0}
                        max={Number.MAX_SAFE_INTEGER}
                        onCommit={(money) => updateConfig({ ...plan, money: money ?? 0 })}
                      />
                      <DsCheckbox
                        label="自动战斗"
                        checked={plan.auto}
                        onChange={(event) =>
                          updateConfig({ ...plan, auto: event.currentTarget.checked })
                        }
                      />
                      <DsCheckbox
                        label="首领战（不能逃跑）"
                        checked={plan.boss}
                        onChange={(event) =>
                          updateConfig({ ...plan, boss: event.currentTarget.checked })
                        }
                      />
                    </DsFieldGroup>
                  </DsWorkbenchSection>
                  <DsWorkbenchSection
                    title={isDraft ? '本场临时调整' : '本场覆写'}
                    description="调整不反写引用的预设。保存方案只保存这里的明确覆写，不保存战斗后的状态。"
                    actions={
                      !isDraft ? (
                        <DsButton onClick={() => temporary(structuredClone(plan))}>
                          建立本场临时副本
                        </DsButton>
                      ) : undefined
                    }
                  >
                    <div className="trial-actions">
                      {(['party', 'enemies', 'bag'] as const).map((key) => (
                        <DsButton
                          key={key}
                          disabled={!resolved}
                          onClick={() => {
                            if (!resolved) return
                            const next = {
                              ...plan,
                              overrides: {
                                ...plan.overrides,
                                [key]: structuredClone(resolved[key]),
                              },
                            }
                            if (isDraft) updateConfig(next)
                            else temporary(next)
                          }}
                        >
                          调整{key === 'party' ? '我方' : key === 'enemies' ? '敌方' : '背包'}
                        </DsButton>
                      ))}
                    </div>
                    {(['party', 'enemies', 'bag'] as const)
                      .filter((key) => plan.overrides[key] !== undefined)
                      .map((key) => (
                        <section key={key} className="trial-override">
                          <div className="trial-actions">
                            <strong>
                              {key === 'party' ? '我方' : key === 'enemies' ? '敌方' : '背包'}覆写
                            </strong>
                            <DsButton
                              onClick={() => {
                                const overrides = { ...plan.overrides }
                                delete overrides[key]
                                updateConfig({ ...plan, overrides })
                              }}
                            >
                              恢复所选配置
                            </DsButton>
                          </div>
                          {key === 'party' && plan.overrides.party && (
                            <TrialPartyEditor
                              value={plan.overrides.party}
                              onChange={(party) =>
                                updateConfig({ ...plan, overrides: { ...plan.overrides, party } })
                              }
                              state={state}
                              scope={`${fieldKey}:party-override`}
                            />
                          )}
                          {key === 'enemies' && plan.overrides.enemies && (
                            <TrialEnemiesEditor
                              value={plan.overrides.enemies}
                              onChange={(enemies) =>
                                updateConfig({ ...plan, overrides: { ...plan.overrides, enemies } })
                              }
                              state={state}
                            />
                          )}
                          {key === 'bag' && plan.overrides.bag && (
                            <TrialBagEditor
                              value={plan.overrides.bag}
                              onChange={(bag) =>
                                updateConfig({ ...plan, overrides: { ...plan.overrides, bag } })
                              }
                              state={state}
                              scope={`${fieldKey}:bag-override`}
                            />
                          )}
                        </section>
                      ))}
                  </DsWorkbenchSection>
                  <div className="trial-actions">
                    {props.projectDirty && (
                      <>
                        <span>项目有未保存改动，请先保存。</span>
                        <DsButton onClick={props.onSave}>保存项目</DsButton>
                      </>
                    )}
                    <DsButton
                      variant="primary"
                      busy={busy}
                      disabled={
                        props.projectDirty ||
                        !!planError ||
                        issues.some((issue) => issue.severity === 'error') ||
                        (isDraft && !!draft.subject)
                      }
                      onClick={() => void start()}
                    >
                      开始试打
                    </DsButton>
                  </div>
                </>
              )}
            </>
          )}
        </DsObjectWorkspace>
      </div>
      {replacement?.scope === replacementScope && (
        <DsDialog
          open
          role="alertdialog"
          title="替换本场临时配置？"
          onClose={() => setReplacement(undefined)}
          footer={
            <>
              <DsButton onClick={() => setReplacement(undefined)}>取消</DsButton>
              <DsButton
                variant="danger"
                onClick={() => {
                  onDraftChange(replacement.draft)
                  onObjectFocus(undefined)
                  setReplacement(undefined)
                }}
              >
                放弃旧调整并替换
              </DsButton>
            </>
          }
        >
          <p>已有未另存的本场临时调整。替换会丢弃旧调整；命名方案和预设不受影响。</p>
        </DsDialog>
      )}
      {deleting && (
        <DsDialog
          open
          role="alertdialog"
          title="删除测试配置"
          onClose={() => setDeleting(undefined)}
          footer={
            <>
              <DsButton onClick={() => setDeleting(undefined)}>取消</DsButton>
              <DsButton
                variant="danger"
                onClick={() => {
                  if (!deleting) return
                  const request = deleting
                  if (
                    act(() =>
                      session.dispatch(
                        new SetBattleSimulatorLibraryCommand(
                          deleteBattleSimulatorRecord(
                            session.getState().battleSimulator ?? emptyBattleSimulatorLibrary(),
                            request.directory,
                            request.id,
                            request.plans,
                          ),
                        ),
                      ),
                    )
                  ) {
                    setDeleting(undefined)
                    onObjectFocus(undefined)
                  }
                }}
              >
                确认删除
              </DsButton>
            </>
          }
        >
          <p>
            {deleting?.plans.length
              ? `以下试打方案将失效，可修复或撤销删除：${deleting.plans.map((id) => library.plans.find((plan) => plan.id === id)?.name ?? id).join('、')}`
              : '删除后可撤销；不删除角色、敌人或物品定义。'}
          </p>
        </DsDialog>
      )}
    </>
  )
}
