import {
  type AcquisitionEmptyFeedback,
  type AuthorAcquisitionFlow,
  type AuthorDialogueCue,
  type AuthorGrantRewardCommand,
  type AuthorScriptFlow,
  acquisitionPreviewStages,
  checkAcquisitionFlow,
  expandAcquisitionFlow,
  type FlowCursor,
  ITEM_ACQUISITION_RECIPES,
  type ItemReward,
  type RewardNotice,
  resolveDialogueRowText,
} from '@type-pal/content'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { DialogueCommandForm } from './command-form-dialogue.js'
import {
  DsActionGroup,
  DsAddPickerDialog,
  DsButton,
  DsDialog,
  DsDraftNumberField,
  DsField,
  DsFieldGroup,
  DsIconButton,
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelectField,
  DsWorkbenchSection,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'
import { ENTITY_FACING_OPTIONS } from './EntityFacingHelp.js'
import type { CanonicalScriptEditorContext } from './ScriptEditor.js'
import { SoundPicker } from './SoundPicker.js'

export function rewardSummary(
  rewards: readonly ItemReward[],
  context?: CanonicalScriptEditorContext,
): string {
  return rewards
    .map((reward) =>
      reward.kind === 'money'
        ? `${reward.amount} 文钱`
        : `${context?.references.label('item', reward.itemId) ?? reward.itemId} × ${reward.count}`,
    )
    .join('、')
}

export function createAcquisitionFlow(
  recipe: AuthorAcquisitionFlow['recipe'],
  firstItemId?: string,
): AuthorAcquisitionFlow {
  const shared = {
    kind: 'acquisition' as const,
    rewards: [
      firstItemId
        ? { kind: 'item' as const, itemId: firstItemId, count: 1 }
        : { kind: 'money' as const, amount: 1 },
    ],
    notice: { kind: 'standard' as const, timing: 'before' as const },
  }
  const available = { id: 'available', label: '首次领取' }
  if (recipe === 'builtin/item/pickup') return { ...shared, recipe, stages: { available } }
  const stages = { available, collected: { id: 'collected', label: '已经取走' } }
  const empty = { kind: 'silent' as const }
  return recipe === 'builtin/item/chest'
    ? { ...shared, recipe, stages, empty, opening: { facing: 'down', frame: 1 } }
    : { ...shared, recipe, stages, afterCollect: 'repeat', empty }
}

/** Shared by the whole trigger recipe and the inline story reward command. */
function RewardList(props: {
  rewards: ItemReward[]
  context: CanonicalScriptEditorContext
  scopeKey: string
  onChange: (rewards: ItemReward[]) => void
}) {
  const keys = useDsReorderKeys(props.rewards)
  const choices = props.context.references.choices('item')
  const update = (index: number, reward: ItemReward) =>
    props.onChange(props.rewards.map((entry, at) => (at === index ? reward : entry)))
  return (
    <DsWorkbenchSection
      title="领取内容"
      contentLayout="list"
      actions={
        <DsActionGroup density="default">
          <DsAddPickerDialog
            adoptionId="script/item-rewards"
            title="添加奖励物品"
            triggerLabel="添加物品"
            confirmLabel="添加物品"
            options={choices.map((item) => ({
              id: item.id,
              label: item.name,
              description: item.id,
            }))}
            scopeKey={props.scopeKey}
            revision={props.rewards}
            emptyMessage="还没有物品，请先到物品库创建。"
            onConfirm={(itemId) =>
              props.onChange([...props.rewards, { kind: 'item', itemId, count: 1 }])
            }
          />
          <DsButton
            variant="secondary"
            icon="add"
            onClick={() => props.onChange([...props.rewards, { kind: 'money', amount: 1 }])}
          >
            添加金钱
          </DsButton>
        </DsActionGroup>
      }
    >
      <DsReorderCollection
        adoptionId="script/item-rewards"
        scopeKey={props.scopeKey}
        entries={props.rewards.map((reward, index) => ({
          key: keys.keys[index]!,
          label: rewardSummary([reward], props.context),
        }))}
        revision={props.rewards}
        onReorder={(intent) => {
          const next = reorderDsItems(props.rewards, intent, 'insert', sameDsSerializableValue)
          if (next === props.rewards) return false
          keys.move(intent)
          props.onChange([...next])
          return true
        }}
      >
        <div className="acquisition-reward-list">
          {props.rewards.map((reward, index) => {
            const key = keys.keys[index]!
            return (
              <DsReorderItem itemKey={key} key={key}>
                <DsRepeatRow density="default" className="acquisition-reward-row">
                  <div className="acquisition-reward-fields">
                    {reward.kind === 'item' ? (
                      <DsSelectField
                        label="物品"
                        layout="stacked"
                        aria-label={`奖励 ${index + 1} 物品`}
                        value={reward.itemId}
                        options={[
                          ...(!choices.some((item) => item.id === reward.itemId)
                            ? [{ value: reward.itemId, label: `未找到物品 · ${reward.itemId}` }]
                            : []),
                          ...choices.map((item) => ({
                            value: item.id,
                            label: item.name,
                            description: item.id,
                          })),
                        ]}
                        onValueChange={(itemId) => update(index, { ...reward, itemId })}
                      />
                    ) : (
                      <span className="acquisition-reward-kind">金钱</span>
                    )}
                    <DsDraftNumberField
                      fieldClassName="acquisition-reward-count"
                      label={reward.kind === 'item' ? '数量' : '文钱'}
                      layout="stacked"
                      aria-label={`奖励 ${index + 1} ${reward.kind === 'item' ? '数量' : '文钱'}`}
                      name={`reward-${index + 1}-amount`}
                      autoComplete="off"
                      draftKey={`${props.scopeKey}:${key}`}
                      syncToken={JSON.stringify(props.rewards)}
                      min={1}
                      max={Number.MAX_SAFE_INTEGER}
                      step={1}
                      integer
                      enforceRange
                      value={reward.kind === 'item' ? reward.count : reward.amount}
                      onCommit={(amount) =>
                        amount === undefined
                          ? false
                          : update(
                              index,
                              reward.kind === 'item'
                                ? { ...reward, count: amount }
                                : { ...reward, amount },
                            )
                      }
                    />
                  </div>
                  <DsActionGroup density="default" className="acquisition-reward-actions">
                    <DsReorderMoveButton itemKey={key} direction="backward" />
                    <DsReorderMoveButton itemKey={key} direction="forward" />
                    <DsIconButton
                      icon="delete"
                      variant="danger"
                      label={`删除奖励 ${index + 1}`}
                      disabled={props.rewards.length <= 1}
                      title={props.rewards.length <= 1 ? '至少保留一项奖励' : undefined}
                      onClick={() => props.onChange(props.rewards.filter((_, at) => at !== index))}
                    />
                  </DsActionGroup>
                </DsRepeatRow>
              </DsReorderItem>
            )
          })}
        </div>
      </DsReorderCollection>
    </DsWorkbenchSection>
  )
}

function NoticeTextButton(props: {
  cue: AuthorDialogueCue
  label: string
  context: CanonicalScriptEditorContext
  scopeKey: string
  onChange: (cue: AuthorDialogueCue) => void
}) {
  const [draft, setDraft] = useState<{ source: AuthorDialogueCue; cue: AuthorDialogueCue }>()
  useEffect(() => {
    if (draft && draft.source !== props.cue) setDraft(undefined)
  }, [draft, props.cue])
  return (
    <div className="acquisition-notice-text">
      <p>
        {props.cue.rows.map((row) => resolveDialogueRowText(row, props.context.locale)).join(' / ')}
      </p>
      <DsButton
        variant="secondary"
        onClick={() => setDraft({ source: props.cue, cue: structuredClone(props.cue) })}
      >
        {props.label}
      </DsButton>
      {draft ? (
        <DsDialog
          open
          title={props.label}
          onClose={() => setDraft(undefined)}
          footer={
            <DsActionGroup density="default">
              <DsButton variant="secondary" onClick={() => setDraft(undefined)}>
                取消
              </DsButton>
              <DsButton
                variant="primary"
                onClick={() => {
                  props.onChange(draft.cue)
                  setDraft(undefined)
                }}
              >
                应用文字
              </DsButton>
            </DsActionGroup>
          }
        >
          <div className="canonical-script-modal-body">
            <DialogueCommandForm
              command={{ kind: 'dialog', cue: draft.cue }}
              locale={props.context.locale}
              assetCatalog={props.context.assetCatalog}
              assetReader={props.context.assetReader}
              actors={props.context.actors}
              onOpenImage={props.context.onOpenImage}
              showRawJson={false}
              reorderScopeKey={`${props.scopeKey}:notice`}
              onChange={(command) => {
                if (command.kind === 'dialog' && 'identity' in command.cue)
                  setDraft({ ...draft, cue: command.cue })
              }}
            />
          </div>
        </DsDialog>
      ) : null}
    </div>
  )
}

const defaultCue = (): AuthorDialogueCue => ({
  identity: { kind: 'narration' },
  rows: [{ text: '获得了物品。' }],
})

export function GrantRewardFields(props: {
  value: Pick<AuthorGrantRewardCommand, 'rewards' | 'notice'>
  context: CanonicalScriptEditorContext
  scopeKey: string
  onChange: (value: Pick<AuthorGrantRewardCommand, 'rewards' | 'notice'>) => void
}) {
  const notice = props.value.notice
  const changeNotice = (next: RewardNotice) => props.onChange({ ...props.value, notice: next })
  return (
    <div className="acquisition-fields">
      <RewardList
        rewards={props.value.rewards}
        context={props.context}
        scopeKey={`${props.scopeKey}:rewards`}
        onChange={(rewards) => props.onChange({ ...props.value, rewards })}
      />
      <DsWorkbenchSection title="领取提示">
        <DsFieldGroup>
          <DsSelectField
            label="提示方式"
            value={notice.kind}
            options={[
              { value: 'standard', label: '按领取内容显示' },
              { value: 'custom', label: '自定文字' },
              { value: 'silent', label: '不显示提示' },
            ]}
            onValueChange={(kind) =>
              kind !== notice.kind &&
              changeNotice(
                kind === 'silent'
                  ? { kind }
                  : kind === 'custom'
                    ? {
                        kind,
                        timing: notice.kind === 'silent' ? 'before' : notice.timing,
                        cue: defaultCue(),
                      }
                    : {
                        kind: 'standard',
                        timing: notice.kind === 'silent' ? 'before' : notice.timing,
                      },
              )
            }
          />
          {notice.kind !== 'silent' ? (
            <DsSelectField
              label="提示时机"
              value={notice.timing}
              options={[
                { value: 'before', label: '确认提示后领取' },
                { value: 'after', label: '领取后显示提示' },
              ]}
              onValueChange={(timing) =>
                changeNotice({ ...notice, timing: timing === 'after' ? 'after' : 'before' })
              }
            />
          ) : null}
        </DsFieldGroup>
        {notice.kind === 'custom' ? (
          <NoticeTextButton
            cue={notice.cue}
            label="编辑领取文字"
            context={props.context}
            scopeKey={props.scopeKey}
            onChange={(cue) => changeNotice({ ...notice, cue })}
          />
        ) : null}
        {notice.kind === 'standard' ? (
          <p className="acquisition-hint">
            提示会使用物品名称和领取数量：{rewardSummary(props.value.rewards, props.context)}。
          </p>
        ) : null}
      </DsWorkbenchSection>
    </div>
  )
}

export function AcquisitionFields(props: {
  flow: AuthorAcquisitionFlow
  context: CanonicalScriptEditorContext
  scopeKey: string
  onChange: (flow: AuthorAcquisitionFlow) => void
}) {
  const flow = props.flow
  const changeEmpty = (empty: AcquisitionEmptyFeedback) => {
    if (
      flow.recipe === 'builtin/item/chest' ||
      (flow.recipe === 'builtin/item/search' && flow.afterCollect === 'repeat')
    )
      props.onChange({ ...flow, empty })
  }
  return (
    <div className="acquisition-fields">
      <GrantRewardFields
        value={flow}
        context={props.context}
        scopeKey={props.scopeKey}
        onChange={(value) => props.onChange({ ...flow, ...value })}
      />
      {flow.recipe === 'builtin/item/chest' ? (
        <DsWorkbenchSection title="开盖表现">
          <DsFieldGroup>
            <DsSelectField
              label="开盖朝向"
              value={flow.opening.facing}
              options={ENTITY_FACING_OPTIONS}
              onValueChange={(facing) => {
                if (facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right')
                  props.onChange({ ...flow, opening: { ...flow.opening, facing } })
              }}
            />
            <DsDraftNumberField
              label="开盖帧"
              aria-label="开盖帧"
              name="chest-opening-frame"
              autoComplete="off"
              draftKey={`${props.scopeKey}:frame`}
              syncToken={JSON.stringify(flow)}
              min={0}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              integer
              enforceRange
              value={flow.opening.frame}
              onCommit={(frame) =>
                frame === undefined
                  ? false
                  : props.onChange({ ...flow, opening: { ...flow.opening, frame } })
              }
            />
            <DsField label="开盖音效">
              {(field) => (
                <SoundPicker
                  id={field.id}
                  value={flow.opening.sound}
                  allowUnset
                  catalog={props.context.assetCatalog}
                  reader={props.context.assetReader}
                  ariaLabel="开盖音效"
                  onOpenAsset={props.context.onOpenSound}
                  onChange={(sound) =>
                    props.onChange({ ...flow, opening: { ...flow.opening, sound } })
                  }
                />
              )}
            </DsField>
          </DsFieldGroup>
        </DsWorkbenchSection>
      ) : flow.recipe === 'builtin/item/pickup' ? (
        <DsWorkbenchSection
          title="拾取表现"
          description="交互开始时先隐藏地面物品，再显示提示和发放奖励。领取后本方案完成。"
        >
          <DsFieldGroup>
            <DsField label="拾取音效">
              {(field) => (
                <SoundPicker
                  id={field.id}
                  value={flow.sound}
                  allowUnset
                  catalog={props.context.assetCatalog}
                  reader={props.context.assetReader}
                  ariaLabel="拾取音效"
                  onOpenAsset={props.context.onOpenSound}
                  onChange={(sound) => props.onChange({ ...flow, sound })}
                />
              )}
            </DsField>
          </DsFieldGroup>
        </DsWorkbenchSection>
      ) : null}
      {flow.recipe === 'builtin/item/search' ? (
        <DsWorkbenchSection title="搜刮表现">
          <DsFieldGroup>
            <DsField label="搜刮音效">
              {(field) => (
                <SoundPicker
                  id={field.id}
                  value={flow.sound}
                  allowUnset
                  catalog={props.context.assetCatalog}
                  reader={props.context.assetReader}
                  ariaLabel="搜刮音效"
                  onOpenAsset={props.context.onOpenSound}
                  onChange={(sound) => props.onChange({ ...flow, sound })}
                />
              )}
            </DsField>
            <DsSelectField
              label="领取之后"
              value={flow.afterCollect}
              options={[
                { value: 'repeat', label: '仍可调查，使用空置反馈' },
                { value: 'disable', label: '停用搜刮点' },
              ]}
              onValueChange={(value) => {
                if (value === flow.afterCollect) return
                if (value === 'repeat')
                  props.onChange({ ...flow, afterCollect: 'repeat', empty: { kind: 'silent' } })
                else {
                  const { kind, recipe, rewards, notice, stages, sound } = flow
                  props.onChange({
                    kind,
                    recipe,
                    rewards,
                    notice,
                    stages,
                    ...(sound ? { sound } : {}),
                    afterCollect: 'disable',
                  })
                }
              }}
            />
          </DsFieldGroup>
        </DsWorkbenchSection>
      ) : null}
      {flow.recipe === 'builtin/item/chest' ||
      (flow.recipe === 'builtin/item/search' && flow.afterCollect === 'repeat') ? (
        <DsWorkbenchSection
          title="再次调查"
          description="只领取一次；之后再次调查时使用下面的反馈。"
        >
          <DsFieldGroup>
            <DsSelectField
              label="空置反馈"
              value={flow.empty.kind}
              options={[
                { value: 'silent', label: '不显示提示' },
                { value: 'custom', label: '自定文字' },
              ]}
              onValueChange={(kind) =>
                kind !== flow.empty.kind &&
                changeEmpty(
                  kind === 'custom'
                    ? {
                        kind,
                        cue: {
                          identity: { kind: 'narration' },
                          rows: [{ text: '这里已经没有东西了。' }],
                        },
                      }
                    : { kind: 'silent' },
                )
              }
            />
          </DsFieldGroup>
          {flow.empty.kind === 'custom' ? (
            <NoticeTextButton
              cue={flow.empty.cue}
              label="编辑空置文字"
              context={props.context}
              scopeKey={`${props.scopeKey}:empty`}
              onChange={(cue) => changeEmpty({ kind: 'custom', cue })}
            />
          ) : null}
        </DsWorkbenchSection>
      ) : null}
    </div>
  )
}

export function AcquisitionFlowEditor(props: {
  flow: AuthorAcquisitionFlow
  context?: CanonicalScriptEditorContext
  ownerLabel?: string
  previewCursor?: FlowCursor
  onSelectPreviewCursor?: (cursor: FlowCursor) => void
  renderStepPreview?: (stageId: string, close: () => void) => ReactNode
  detailsRequest?: { stageId: string; revision: number }
  onChange: (flow: AuthorScriptFlow) => boolean
  onError?: (message: string) => void
}) {
  const stages = acquisitionPreviewStages(props.flow)
  const [selectedStage, setSelectedStage] = useState(stages[0]!.id)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detachOpen, setDetachOpen] = useState(false)
  const appliedRequest = useRef<number | undefined>(undefined)
  const activeStage =
    props.previewCursor?.kind === 'stage' ? props.previewCursor.stage : selectedStage
  const selected = stages.find((stage) => stage.id === activeStage) ?? stages[0]!
  const selectStage = (id: string) => {
    setSelectedStage(id)
    props.onSelectPreviewCursor?.({ kind: 'stage', stage: id })
  }
  useEffect(() => {
    const request = props.detailsRequest
    if (!request || request.revision === appliedRequest.current) return
    appliedRequest.current = request.revision
    if (!stages.some((stage) => stage.id === request.stageId)) return
    setSelectedStage(request.stageId)
    props.onSelectPreviewCursor?.({ kind: 'stage', stage: request.stageId })
    setDetailsOpen(true)
  }, [props.detailsRequest, props.onSelectPreviewCursor, stages])
  const context = props.context
  if (!context) return <p>请从实体的交互脚本打开此取物流程。</p>
  return (
    <section
      className="acquisition-flow-editor"
      aria-label={ITEM_ACQUISITION_RECIPES[props.flow.recipe]}
    >
      <DsWorkbenchSection
        title={ITEM_ACQUISITION_RECIPES[props.flow.recipe]}
        description="共享取物流程 · 修改下面的参数后，仍可回到这里继续编辑。"
        actions={
          <DsButton variant="secondary" onClick={() => setDetachOpen(true)}>
            展开为普通脚本
          </DsButton>
        }
      >
        <div className="acquisition-preview-row">
          <DsSelectField
            label="预览轮次"
            value={selected.id}
            options={stages.map((stage, index) => ({
              value: stage.id,
              label: index === 0 ? '首次领取' : '已经取走后再次调查',
            }))}
            onValueChange={selectStage}
          />
          {props.renderStepPreview ? (
            <DsButton variant="secondary" onClick={() => setDetailsOpen(true)}>
              此步骤的预览初始状态
            </DsButton>
          ) : null}
        </div>
      </DsWorkbenchSection>
      <AcquisitionFields
        flow={props.flow}
        context={context}
        scopeKey={props.ownerLabel ?? 'acquisition'}
        onChange={(flow) => props.onChange(flow)}
      />
      {detailsOpen ? (
        <DsDialog
          open
          title={`${selected.label ?? '取物步骤'} · 预览初始状态`}
          onClose={() => setDetailsOpen(false)}
        >
          {props.renderStepPreview?.(selected.id, () => setDetailsOpen(false))}
        </DsDialog>
      ) : null}
      {detachOpen ? (
        <DsDialog
          open
          title="展开为普通脚本"
          onClose={() => setDetachOpen(false)}
          footer={
            <DsActionGroup density="default">
              <DsButton variant="secondary" onClick={() => setDetachOpen(false)}>
                取消
              </DsButton>
              <DsButton
                variant="primary"
                onClick={() => {
                  try {
                    if (!context.currentSceneId || !context.currentEntityId)
                      throw new Error('无法确定当前取物实体，请重新打开交互脚本。')
                    checkAcquisitionFlow(props.flow, '取物流程')
                    if (
                      props.onChange(
                        expandAcquisitionFlow(
                          props.flow,
                          { scene: context.currentSceneId, entity: context.currentEntityId },
                          context.state.items,
                        ),
                      )
                    )
                      setDetachOpen(false)
                  } catch (error) {
                    props.onError?.(error instanceof Error ? error.message : String(error))
                  }
                }}
              >
                确认展开
              </DsButton>
            </DsActionGroup>
          }
        >
          <p>
            将“{ITEM_ACQUISITION_RECIPES[props.flow.recipe]}
            ”变为普通步骤和指令，保留现有领取、重复调查和预览初始状态绑定。之后按普通脚本编辑，不再显示取物参数表单。
          </p>
          <p>可以通过撤销恢复这份共享取物流程。</p>
        </DsDialog>
      ) : null}
    </section>
  )
}
