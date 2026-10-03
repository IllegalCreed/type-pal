import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  AuthorCommand,
  AuthorCondition,
  AuthorSceneDef,
  AuthorScriptFlow,
  BattleFieldDef,
  BattleSpriteDef,
  Command,
  EnemyTeamDef,
  EntityAddress,
  FlowCursor,
  Locale,
  SceneDef,
  SceneIndexV1,
  ScriptCondition,
  ShopDef,
  SpriteDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  type AuthorCommandChildKey,
  type AuthorCommandPath,
  authorLoopAncestors,
  collectAuthorLoopIds,
  copyAuthorCommandAt,
  formatAuthorCommandPath,
  getAuthorCommandAt,
  insertAuthorCommandAfter,
  mapAuthorCommandTree,
  moveAuthorCommandToIndex,
  parseAuthorCommandPath,
  removeAuthorCommandAt,
  updateAuthorCommandAt,
} from '../core/author-command-edit.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { entityDisplayLabel } from '../core/entity-display.js'
import { effectiveTriggerRange } from '../core/entity-placement.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import type { ScriptCommandLocator, ScriptEditorState } from '../core/script-editor.js'
import { previewFlowCursor, previewStepLabel } from '../core/script-flow-preview.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { BattleFieldPicker } from './BattleFieldPicker.js'
import { CommandForm, WorldVariablePicker } from './CommandForm.js'
import { createAuthorCommandFormBridge } from './command-form-contract.js'
import {
  DsButton,
  DsCheckbox,
  DsDialog,
  DsDraftTextInput,
  DsField,
  DsHelpTip,
  DsIconButton,
  DsNumberInput,
  DsPressable,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsSelect,
  DsTextArea,
  DsTextInput,
  DsWorkbenchSection,
  useDsReorderKeys,
} from './design-system/index.js'
import { ENTITY_FACING_OPTIONS } from './EntityFacingHelp.js'
import { EntityStateSelect } from './EntityStateSelect.js'
import { musicAssets } from './MusicPicker.js'
import { describeScriptCommand, describeScriptCondition } from './ScriptTree.js'
import { soundAssets } from './SoundPicker.js'

type AuthorHostileBehavior = NonNullable<AuthorSceneDef['entities'][number]['hostile']>

function CanonicalField(props: {
  label: string
  children: ReactElement<{
    id?: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }>
  className?: string
}) {
  return (
    <DsField label={props.label} className={props.className}>
      {(field) => cloneElement(props.children, field)}
    </DsField>
  )
}

export type EditorCommandScope =
  | { kind: 'flow'; currentStep: string; steps: readonly { id: string; label?: string }[] }
  | { kind: 'script' | 'prepare' }

export interface CanonicalScriptEditorContext {
  commandScope?: EditorCommandScope
  enclosingLoops?: readonly { id?: string; label?: string }[]
  loopIds?: readonly string[]
  state: ScriptEditorState
  currentSceneId?: string
  shellScenes: SceneDef[]
  sceneIndex?: SceneIndexV1
  locale: Locale
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  references: ScriptReferenceCatalog
  worldVariables?: WorldVariableRegistryV1
  assetBase?: AssetBase
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  battleFields?: readonly BattleFieldDef[]
  enemyTeams?: readonly EnemyTeamDef[]
  sprites?: readonly SpriteDef[]
  ambiences?: AmbienceDef[]
  shops?: ShopDef[]
  hasImplicitSelf?: boolean
  currentEntityId?: string
  onOpenScript?: (id: string) => void
  onOpenWorldVariable?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenBattleField?: (id: number) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  onOpenEntity?: (address: EntityAddress) => void
}

function sceneDisplayLabel(sceneIndex: SceneIndexV1 | undefined, sceneId: string): string {
  const asset = sceneIndex?.scenes.find((candidate) => candidate.id === sceneId)
  return asset ? `${asset.name} · ${sceneId}` : sceneId
}

export interface ScriptSchemeReferencePresentation {
  key: string
  label: string
  reference: ProjectReferenceEdge
}

export function nextGeneratedScriptSchemeId(ids: readonly string[], prefix = 'scheme'): string {
  const occupied = new Set(ids)
  let index = 1
  let id = `${prefix}-${index}`
  while (occupied.has(id)) id = `${prefix}-${++index}`
  return id
}

export function CanonicalScriptDialog(props: {
  title: string
  children: ReactNode
  onClose: () => void
  className?:
    | 'canonical-flow-settings-dialog'
    | 'canonical-hostile-script-dialog'
    | 'canonical-shared-script-create-dialog'
    | 'canonical-stage-create-dialog'
    | 'canonical-stage-delete-dialog'
    | 'script-scheme-create-dialog'
    | 'script-scheme-details-dialog'
  footer?: ReactNode
}) {
  const bodyClassName =
    props.className === 'canonical-flow-settings-dialog'
      ? 'canonical-script-modal-body canonical-flow-settings-dialog'
      : props.className === 'canonical-hostile-script-dialog'
        ? 'canonical-script-modal-body canonical-hostile-script-dialog'
        : props.className === 'canonical-shared-script-create-dialog'
          ? 'canonical-script-modal-body canonical-shared-script-create-dialog'
          : props.className === 'canonical-stage-create-dialog'
            ? 'canonical-script-modal-body canonical-stage-create-dialog'
            : props.className === 'canonical-stage-delete-dialog'
              ? 'canonical-script-modal-body canonical-stage-delete-dialog'
              : props.className === 'script-scheme-create-dialog'
                ? 'canonical-script-modal-body script-scheme-create-dialog'
                : props.className === 'script-scheme-details-dialog'
                  ? 'canonical-script-modal-body script-scheme-details-dialog'
                  : 'canonical-script-modal-body'
  return (
    <DsDialog
      open
      title={props.title}
      onClose={props.onClose}
      footer={
        props.footer ? (
          <div className="canonical-script-modal-footer">{props.footer}</div>
        ) : undefined
      }
    >
      <div className={bodyClassName}>{props.children}</div>
    </DsDialog>
  )
}

export interface ScriptSchemeStripOption {
  id: string
  label: string
  flow: AuthorScriptFlow
  isDefault?: boolean
}

export function ScriptSchemeStrip(props: {
  title: string
  options: readonly ScriptSchemeStripOption[]
  selectedId: string
  onSelect: (id: string) => void
  onDetails: (id: string) => void
  onCreate: () => void
  reorder: {
    kind: 'behavior' | 'hook'
    scopeKey: string
    revision: unknown
    onReorder: (intent: DsReorderIntent) => void
  }
}) {
  const cards = (
    <nav className="script-scheme-card-list" aria-label="脚本方案列表">
      {props.options.map((option) => (
        <DsReorderItem itemKey={option.id} key={option.id}>
          <div className={`script-scheme-card${option.id === props.selectedId ? ' active' : ''}`}>
            <DsPressable
              className="script-scheme-card-select"
              aria-pressed={option.id === props.selectedId}
              onClick={() => props.onSelect(option.id)}
            >
              <strong>{option.label}</strong>
              <span>{`${option.flow.stages.length} 个步骤`}</span>
              {option.isDefault ? <small>默认方案</small> : null}
            </DsPressable>
            <span className="script-scheme-card-actions">
              <DsButton
                size="compact"
                variant="quiet"
                className="script-scheme-card-details"
                aria-label={`打开“${option.label}”的方案详情`}
                onClick={() => props.onDetails(option.id)}
              >
                方案详情
              </DsButton>
              <DsReorderMoveButton itemKey={option.id} direction="backward" />
              <DsReorderMoveButton itemKey={option.id} direction="forward" />
            </span>
          </div>
        </DsReorderItem>
      ))}
    </nav>
  )
  return (
    <section className="script-scheme-strip" aria-label={`${props.title}方案`}>
      <header>
        <div className="script-section-heading">
          <strong className="script-section-title">脚本方案</strong>
          <span className="script-section-count">{props.options.length} 个方案</span>
          <DsHelpTip label="脚本方案">
            同一脚本入口可以有多套方案。每套方案拥有独立的执行步骤和正文；剧情指令切换方案时，
            会整套切换。
          </DsHelpTip>
        </div>
        <DsButton size="compact" variant="secondary" icon="add" onClick={props.onCreate}>
          新建方案
        </DsButton>
      </header>
      {props.reorder.kind === 'behavior' ? (
        <DsReorderCollection
          adoptionId="story/entity-behavior-schemes"
          scopeKey={props.reorder.scopeKey}
          entries={props.options.map((option) => ({ key: option.id, label: option.label }))}
          revision={props.reorder.revision}
          orientation="horizontal"
          onReorder={props.reorder.onReorder}
        >
          {cards}
        </DsReorderCollection>
      ) : (
        <DsReorderCollection
          adoptionId="story/scene-hook-variants"
          scopeKey={props.reorder.scopeKey}
          entries={props.options.map((option) => ({ key: option.id, label: option.label }))}
          revision={props.reorder.revision}
          orientation="horizontal"
          onReorder={props.reorder.onReorder}
        >
          {cards}
        </DsReorderCollection>
      )}
    </section>
  )
}

export function ScriptSchemeDetailsDialog(props: {
  selectedName: string
  references: readonly ScriptSchemeReferencePresentation[]
  referencesKnown: boolean
  onClose: () => void
  onSave: (name: string, isDefault: boolean | undefined) => boolean
  onDelete: () => void
  defaultControl?: {
    isDefault: boolean
    activeCopy: string
    inactiveCopy: string
  }
  onOpenReference?: (reference: ProjectReferenceEdge) => void
}) {
  const [nameDraft, setNameDraft] = useState(props.selectedName)
  const [defaultDraft, setDefaultDraft] = useState(props.defaultControl?.isDefault ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameInputId = useId()
  const deleteBlocked = !props.referencesKnown || props.references.length > 0
  const deleteBlockedReason = !props.referencesKnown
    ? '引用仍在检查，暂不能删除。'
    : props.references.length
      ? '这套方案仍在使用中，请先处理上方列出的引用。'
      : undefined

  useEffect(() => setNameDraft(props.selectedName), [props.selectedName])
  useEffect(
    () => setDefaultDraft(props.defaultControl?.isDefault ?? false),
    [props.defaultControl?.isDefault],
  )

  const save = (): void => {
    const name = nameDraft.trim()
    if (!name) return
    const defaultValue = props.defaultControl ? defaultDraft : undefined
    const unchanged =
      name === props.selectedName &&
      (!props.defaultControl || defaultDraft === props.defaultControl.isDefault)
    if (!unchanged && !props.onSave(name, defaultValue)) return
    props.onClose()
  }

  return (
    <CanonicalScriptDialog
      title={`${props.selectedName} · 方案详情`}
      className="script-scheme-details-dialog"
      onClose={props.onClose}
      footer={
        confirmDelete ? (
          <>
            <span className="script-scheme-footer-warning">此操作会删除全部步骤和正文。</span>
            <span className="spacer" />
            <DsButton size="compact" variant="secondary" onClick={() => setConfirmDelete(false)}>
              取消删除
            </DsButton>
            <DsButton
              size="compact"
              variant="danger"
              disabled={deleteBlocked}
              title={deleteBlockedReason}
              onClick={() => {
                if (!deleteBlocked) props.onDelete()
              }}
            >
              确认删除方案
            </DsButton>
          </>
        ) : (
          <>
            <DsButton
              size="compact"
              variant="danger"
              className="script-scheme-delete"
              disabled={deleteBlocked}
              title={deleteBlockedReason}
              onClick={() => setConfirmDelete(true)}
            >
              删除方案
            </DsButton>
            <span className="spacer" />
            <DsButton size="compact" variant="secondary" onClick={props.onClose}>
              取消
            </DsButton>
            <DsButton size="compact" variant="primary" disabled={!nameDraft.trim()} onClick={save}>
              保存
            </DsButton>
          </>
        )
      }
    >
      <section className="script-scheme-details-section">
        <div className="script-scheme-name-field">
          <header className="canonical-dialog-field-heading">
            <label htmlFor={nameInputId}>方案名称</label>
            <DsHelpTip label="脚本方案">
              这是一套完整脚本。切换方案时，它拥有的执行步骤、出现前准备和正文会一起切换。
            </DsHelpTip>
          </header>
          <DsTextInput
            size="compact"
            id={nameInputId}
            name="scheme-name"
            autoComplete="off"
            aria-label="方案名称"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              save()
            }}
          />
        </div>

        {props.defaultControl ? (
          <div className="script-scheme-default-control">
            <strong>{defaultDraft ? '默认方案' : '非默认方案'}</strong>
            <div className="script-scheme-default-action">
              <DsHelpTip label="默认方案">
                {defaultDraft ? props.defaultControl.activeCopy : props.defaultControl.inactiveCopy}
              </DsHelpTip>
              <DsButton
                size="compact"
                variant="secondary"
                aria-pressed={defaultDraft}
                onClick={() => setDefaultDraft((current) => !current)}
              >
                {defaultDraft ? '取消默认' : '设为默认方案'}
              </DsButton>
            </div>
          </div>
        ) : null}

        <div className="script-scheme-usage">
          <header className="canonical-dialog-field-heading">
            <strong>使用位置</strong>
            <DsHelpTip label="使用位置">
              页面或脚本指令可能正在使用这套方案。先改掉这些位置，才能安全删除方案。
            </DsHelpTip>
          </header>
          {!props.referencesKnown ? (
            <p>引用正在检查；完成前不能删除这套方案。</p>
          ) : props.references.length ? (
            <>
              <p>当前有 {props.references.length} 处正在使用这个方案，因此暂时不能删除。</p>
              <ul aria-label="方案使用位置">
                {props.references.map((reference) => (
                  <li key={reference.key}>
                    {props.onOpenReference ? (
                      <DsButton
                        size="compact"
                        variant="quiet"
                        icon="open"
                        aria-label={`打开引用：${reference.label}`}
                        onClick={() => props.onOpenReference?.(reference.reference)}
                      >
                        <span>{reference.label}</span>
                        <small aria-hidden="true">打开</small>
                      </DsButton>
                    ) : (
                      <span>{reference.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>当前没有其他地方使用这个方案，可以删除。</p>
          )}
        </div>

        {confirmDelete ? (
          <div className="script-scheme-delete-confirm" role="alert">
            <p>
              删除“{props.selectedName}”及其全部执行步骤和正文？删除后仍可使用编辑器的撤销恢复。
            </p>
          </div>
        ) : null}
      </section>
    </CanonicalScriptDialog>
  )
}

export function ScriptSchemeCreateDialog(props: {
  title: string
  first: boolean
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [newName, setNewName] = useState('')
  const nameInputId = useId()

  return (
    <CanonicalScriptDialog
      title={`${props.title} · 新建方案`}
      className="script-scheme-create-dialog"
      onClose={props.onClose}
    >
      <form
        className="script-scheme-create-form"
        onSubmit={(event) => {
          event.preventDefault()
          const name = newName.trim()
          if (!name) return
          props.onCreate(name)
        }}
      >
        <div className="script-scheme-name-field">
          <header className="canonical-dialog-field-heading">
            <label htmlFor={nameInputId}>方案名称</label>
            <DsHelpTip label="新建脚本方案">
              {props.first
                ? '创建这个脚本入口的第一套方案。'
                : '新方案从空白内容开始，已有方案不会受到影响。'}
            </DsHelpTip>
          </header>
          <DsTextInput
            size="compact"
            id={nameInputId}
            name="new-scheme-name"
            autoComplete="off"
            aria-label="新方案名称"
            placeholder="例如：初次交谈…"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <div className="script-scheme-create-actions">
          <DsButton size="compact" variant="secondary" onClick={props.onClose}>
            取消
          </DsButton>
          <DsButton size="compact" type="submit" variant="primary" disabled={!newName.trim()}>
            创建空白方案
          </DsButton>
        </div>
      </form>
    </CanonicalScriptDialog>
  )
}

interface DescribedCommand {
  icon: string
  label: string
  detail?: string
  children: Array<{
    key: AuthorCommandChildKey
    label: string
    body: readonly AuthorCommand[]
  }>
}

export const AUTHOR_COMMAND_PRESENTATION_ = {
  addVar: ['🔢', '增减数值'],
  animEntity: ['🎞', '推进实体动画'],
  applyActorCondition: ['🩺', '施加角色当前状态'],
  branch: ['🔀', '条件分支'],
  callScript: ['↪', '调用共享脚本'],
  cameraPan: ['🎥', '镜头平移'],
  cameraSnap: ['🎥', '镜头定位或回正'],
  chasePlayer: ['👣', '追逐玩家'],
  clearActorCondition: ['🩹', '清除角色当前状态'],
  clearDialog: ['🧹', '清除对话框'],
  clearFrameAnimation: ['🧹', '清除帧动画画面'],
  confirm: ['❓', '是/否询问'],
  dialog: ['💬', '对话'],
  ditherScreen: ['▦', '逐像素渐变'],
  endBattle: ['🏁', '结束战斗'],
  fade: ['🌓', '淡入或淡出'],
  fleeBattle: ['🏃', '敌人逃离战斗'],
  gameOver: ['💀', '战败流程'],
  giveItem: ['🎁', '获得物品'],
  giveMoney: ['💰', '增减金钱'],
  halveMoney: ['💸', '金钱减半'],
  holdScreen: ['⬛', '保持黑屏'],
  increaseHpMp: ['❤', '恢复或扣除全队生命法力'],
  learnSkill: ['📖', '学会技能'],
  loadLastSave: ['📂', '读取最近存档'],
  loadScene: ['🚪', '切换场景'],
  loop: ['🔁', '条件循环'],
  loseItem: ['📤', '失去物品'],
  mountParty: ['🛶', '队伍乘上载具'],
  moveEntity: ['🚶', '实体走到'],
  moveParty: ['🚶', '队伍走到'],
  nudgeEntity: ['↔', '实体像素位移'],
  nudgeParty: ['↔', '队伍像素位移'],
  openShop: ['🏪', '打开商店'],
  playEntityAction: ['▶', '播放实体动作'],
  playFrameAnimation: ['🎞', '播放帧动画'],
  playMusic: ['🎵', '播放音乐'],
  playSound: ['🔊', '播放音效'],
  playVideo: ['🎬', '播放视频'],
  quitToTitle: ['🏁', '返回标题画面'],
  releaseEntity: ['🔓', '归还实体控制'],
  revealScreen: ['🌅', '恢复画面'],
  revivePartyAll: ['✨', '复活全队'],
  ride: ['⛵', '载具移动'],
  selectEntityBehavior: ['🔗', '切换实体脚本'],
  runEntityTrigger: ['▶', '执行实体交互方案'],
  selectEntityPage: ['📄', '切换实体页面'],
  selectSceneHooks: ['📜', '切换场景脚本'],
  setActorAppearance: ['🎭', '更换角色形象'],
  setActorSprite: ['🎭', '更换角色精灵'],
  setAmbience: ['🌗', '切换场景氛围'],
  setEntityFacing: ['🧭', '实体转向'],
  setEntityFrame: ['🎞', '设置实体画面帧'],
  setEntityLayer: ['📐', '设置实体图层'],
  setEntityPos: ['📍', '设置实体位置'],
  setEntityPosRelParty: ['📍', '实体相对队伍定位'],
  setEntityState: ['👁', '设置实体显隐与碰撞'],
  setEntityTriggerActivation: ['🖱', '设置实体触发方式'],
  setFlag: ['🚩', '设置剧情开关'],
  setFollowers: ['👥', '设置编外跟随者'],
  setMultiEntityState: ['👁', '批量设置实体状态'],
  setParty: ['👥', '调整队伍成员'],
  setPartyFacing: ['🧭', '队伍转向或摆姿势'],
  setSceneMapOverride: ['🗺', '更换场景地图'],
  setScreenWave: ['🌊', '设置屏幕波动'],
  setVar: ['🔢', '设置数值'],
  shakeScreen: ['📳', '震动屏幕'],
  startBattle: ['⚔', '开始战斗'],
  stepEntity: ['👣', '实体走一步'],
  stopEntityAction: ['⏹', '停止实体动作'],
  stopMusic: ['⏹', '停止音乐'],
  finishStep: ['⛔', '结束本次执行'],
  returnScript: ['↩', '返回调用处'],
  repeat: ['🔁', '重复指定次数'],
  breakLoop: ['↪', '退出当前循环'],
  continueLoop: ['🔄', '开始下一轮'],
  takeEntity: ['🔒', '接管实体控制'],
  teleportOut: ['🌀', '使用传送出口'],
  teleportParty: ['📍', '队伍瞬移'],
  toggleDayNight: ['🌗', '切换昼夜'],
  unequip: ['🔓', '卸下装备'],
  unmountParty: ['🚶', '离开载具'],
  suspendEntity: ['⏸', '暂停实体'],
  hideEntity: ['🙈', '隐藏实体'],
  restoreEntity: ['↩', '恢复实体'],
  removeEntity: ['⛔', '移除实体'],
  wait: ['⏱', '等待'],
} as const satisfies Record<AuthorCommand['kind'], readonly [icon: string, label: string]>

function addressLabel(address: EntityAddress, context?: CanonicalScriptEditorContext): string {
  if (!context) return `${address.scene}/${address.entity}`
  // 普通属性来自主会话，正文来自脚本会话；改名/清名不等保存重开。
  const scene =
    context.shellScenes.find((candidate) => candidate.id === address.scene) ??
    context.state.scenes.find((candidate) => candidate.id === address.scene)
  const entity = scene?.entities.find((candidate) => candidate.id === address.entity)
  const name = entity
    ? entityDisplayLabel(entity, context.actors, context.locale)
    : `实体 ${address.entity}`
  return address.scene === context?.currentSceneId ? name : `${address.scene} / ${name}`
}

function conditionLabel(
  condition: AuthorCondition,
  context?: CanonicalScriptEditorContext,
): string {
  switch (condition.kind) {
    case 'entityState':
      return `${addressLabel(condition.target, context)} 状态 = ${condition.is}`
    case 'entityInScene':
      return `${addressLabel(condition.target, context)} 在场`
    case 'entitiesNear':
      return `${addressLabel(condition.from, context)} 与 ${addressLabel(condition.to, context)} 距离小于 ${condition.range} 格`
    case 'facingEntity':
      return `面向实体 ${addressLabel(condition.target, context)}${condition.range !== undefined ? `（${condition.range} 格内）` : ''}`
    case 'all':
      return condition.of.map((child) => conditionLabel(child, context)).join(' 且 ')
    case 'any':
      return condition.of.map((child) => conditionLabel(child, context)).join(' 或 ')
    case 'not':
      return `非（${conditionLabel(condition.cond, context)}）`
    default:
      // 实体复合地址留在作者层；其它条件复用同一中文引用/门槛摘要，不另造简化展示。
      return describeScriptCondition(
        condition,
        context?.locale ?? {},
        context?.references ?? {
          choices: () => [],
          has: () => false,
          label: (_kind, id) => id,
        },
      )
  }
}

function commandChildren(command: AuthorCommand): DescribedCommand['children'] {
  switch (command.kind) {
    case 'branch':
      return [
        { key: 'then', label: '满足条件', body: command.then },
        { key: 'else', label: '不满足条件', body: command.else ?? [] },
      ]
    case 'loop':
    case 'repeat':
      return [{ key: 'body', label: '循环正文', body: command.body }]
    case 'confirm':
      return [
        { key: 'onYes', label: '选择“是”', body: command.onYes },
        { key: 'onNo', label: '选择“否”', body: command.onNo },
      ]
    case 'startBattle':
      return [
        { key: 'onLose', label: '战败', body: command.onLose ?? [] },
        { key: 'onFlee', label: '逃跑', body: command.onFlee ?? [] },
      ]
    case 'teleportOut':
      return [{ key: 'onFail', label: '无法传送', body: command.onFail ?? [] }]
    default:
      return []
  }
}

function presentationCondition(condition: AuthorCondition): ScriptCondition {
  switch (condition.kind) {
    case 'entityState':
    case 'entityInScene':
    case 'facingEntity': {
      const { target, ...rest } = condition
      return { ...rest, entity: target.entity } as ScriptCondition
    }
    case 'entitiesNear':
      return {
        kind: condition.kind,
        from: condition.from.entity,
        to: condition.to.entity,
        range: condition.range,
      }
    case 'all':
    case 'any':
      return { ...condition, of: condition.of.map(presentationCondition) }
    case 'not':
      return { ...condition, cond: presentationCondition(condition.cond) }
    default:
      return structuredClone(condition)
  }
}

function presentationCommand(command: AuthorCommand): Command | undefined {
  switch (command.kind) {
    case 'suspendEntity':
    case 'hideEntity':
    case 'restoreEntity':
    case 'removeEntity':
      return undefined
    case 'setEntityState':
      return { kind: command.kind, entity: command.target.entity, state: command.state }
    case 'setMultiEntityState':
      return {
        kind: command.kind,
        entities: command.targets.map((target) => target.entity),
        state: command.state,
      }
    case 'setEntityPos':
      return { kind: command.kind, entity: command.target.entity, pos: command.pos }
    case 'setEntityPosRelParty':
      return {
        kind: command.kind,
        entity: command.target.entity,
        dcol: command.dcol,
        drow: command.drow,
      }
    case 'setEntityLayer':
      return { kind: command.kind, entity: command.target.entity, layer: command.layer }
    case 'setEntityFacing':
      return { kind: command.kind, entity: command.target.entity, facing: command.facing }
    case 'setEntityFrame':
      return { kind: command.kind, entity: command.target.entity, frame: command.frame }
    case 'playEntityAction':
      return {
        ...command,
        entity: command.target.entity,
        target: undefined,
      } as Command
    case 'stopEntityAction':
      return { kind: command.kind, entity: command.target.entity, reset: command.reset }
    case 'moveEntity':
      return {
        kind: command.kind,
        entity: command.target.entity,
        to: command.to,
        speed: command.speed,
      }
    case 'stepEntity':
      return { kind: command.kind, entity: command.target.entity, dir: command.dir }
    case 'animEntity':
      return { kind: command.kind, entity: command.target.entity }
    case 'nudgeEntity':
      return {
        kind: command.kind,
        entity: command.target.entity,
        dx: command.dx,
        dy: command.dy,
      }
    case 'takeEntity':
      return { kind: command.kind, entity: command.target.entity }
    case 'releaseEntity':
      return {
        kind: command.kind,
        ...(command.target ? { entity: command.target.entity } : {}),
      }
    case 'mountParty':
      return {
        kind: command.kind,
        entity: command.target.entity,
        ...(command.dx === undefined ? {} : { dx: command.dx }),
        ...(command.dy === undefined ? {} : { dy: command.dy }),
      }
    case 'ride':
      return {
        kind: command.kind,
        entity: command.target.entity,
        to: command.to,
        speed: command.speed,
      }
    case 'startBattle':
      return { ...command, onLose: [], onFlee: [] }
    case 'teleportOut':
      return { kind: command.kind, onFail: [] }
    case 'confirm':
      return undefined
    case 'branch':
      return {
        kind: command.kind,
        cond: presentationCondition(command.cond),
        then: [],
        else: [],
      }
    case 'callScript':
      return {
        kind: command.kind,
        ref: { chunk: 'shared', id: command.script },
        ...(command.self ? { self: command.self.entity } : {}),
      }
    case 'setEntityTriggerActivation':
      return {
        kind: 'setEntityTriggerMode',
        entity: command.target.entity,
        ...(command.selection.kind === 'use'
          ? {
              on: command.selection.value.on,
              ...(command.selection.value.range === undefined
                ? {}
                : { range: command.selection.value.range }),
            }
          : {}),
      }
    case 'loop':
    case 'repeat':
    case 'finishStep':
    case 'returnScript':
    case 'breakLoop':
    case 'continueLoop':
    case 'selectEntityBehavior':
    case 'runEntityTrigger':
    case 'selectEntityPage':
    case 'selectSceneHooks':
      return undefined
    default:
      return command as Command
  }
}

export function describeCanonicalCommand(
  command: AuthorCommand,
  context?: CanonicalScriptEditorContext,
): DescribedCommand {
  const children = commandChildren(command)
  switch (command.kind) {
    case 'runEntityTrigger':
      return {
        icon: '▶',
        label: `${addressLabel(command.target, context)} 执行交互方案`,
        detail: '等执行完成后继续 · 当前场景演出；切场、战斗在调用返回后编排',
        children,
      }
    case 'branch':
      return { icon: '🔀', label: `如果 ${conditionLabel(command.cond, context)}`, children }
    case 'loop':
      return {
        icon: '🔁',
        label:
          command.mode === 'forever'
            ? '持续循环'
            : `${command.mode === 'while' ? '当' : '直到'} ${conditionLabel(command.cond, context)}`,
        children,
      }
    case 'repeat':
      return { icon: '🔁', label: `重复 ${command.count} 次`, children }
    case 'confirm':
      return { icon: '❓', label: '是/否询问', children }
    case 'finishStep': {
      const scope = context?.commandScope
      const step = command.next.kind === 'stage' ? command.next.stage : undefined
      const target =
        scope?.kind === 'flow' ? scope.steps.find((candidate) => candidate.id === step) : undefined
      return {
        icon: '⛔',
        label: '结束本次执行',
        detail:
          command.next.kind === 'complete'
            ? '本方案完成，不再执行'
            : command.next.kind === 'stay'
              ? '下次仍执行当前步骤'
              : `下次进入${target?.label ?? step}`,
        children,
      }
    }
    case 'returnScript':
      return { icon: '↩', label: '返回调用处', children }
    case 'breakLoop':
      return { icon: '↪', label: '退出当前循环', children }
    case 'continueLoop':
      return {
        icon: '🔄',
        label: '开始下一轮',
        detail: command.loop
          ? (context?.enclosingLoops?.find((loop) => loop.id === command.loop)?.label ??
            command.loop)
          : '当前循环',
        children,
      }
    case 'selectEntityBehavior':
      return {
        icon: '🔗',
        label: `${addressLabel(command.target, context)} 切换${command.channel === 'trigger' ? '交互脚本' : '自动行为'}`,
        detail: `${
          command.selection.kind === 'use'
            ? (context?.state.scenes
                .find((scene) => scene.id === command.target.scene)
                ?.entities.find((entity) => entity.id === command.target.entity)?.behaviors?.[
                command.channel
              ]?.[command.selection.value]?.label ?? `方案 ${command.selection.value}（未解析）`)
            : command.selection.kind === 'disabled'
              ? '关闭'
              : '恢复页面默认方案'
        }`,
        children,
      }
    case 'selectEntityPage':
      return {
        icon: '📄',
        label: `${addressLabel(command.target, context)} 切换实体页面`,
        detail:
          command.selection.kind === 'use'
            ? (context?.state.scenes
                .find((scene) => scene.id === command.target.scene)
                ?.entities.find((entity) => entity.id === command.target.entity)
                ?.pages?.find(
                  (page) => command.selection.kind === 'use' && page.id === command.selection.value,
                )?.label ?? `页面 ${command.selection.value}（未解析）`)
            : '恢复默认页面',
        children,
      }
    case 'setEntityTriggerActivation':
      return {
        icon: '🖱',
        label: `${addressLabel(command.target, context)} 设置触发方式`,
        detail:
          command.selection.kind === 'use'
            ? `${command.selection.value.on === 'interact' ? '主动交互' : '靠近触发'} · ${effectiveTriggerRange(command.selection.value)} 格内`
            : command.selection.kind === 'disabled'
              ? '禁用'
              : '恢复页面默认触发',
        children,
      }
    case 'callScript':
      return {
        icon: '↪',
        label: '调用共享脚本',
        detail:
          context?.state.sharedScripts[command.script]?.name ?? `脚本 ${command.script}（未解析）`,
        children,
      }
    case 'moveEntity':
    case 'ride':
    case 'moveParty':
      return {
        icon: command.kind === 'ride' ? '🛶' : '🚶',
        label:
          command.kind === 'moveParty'
            ? '队伍走到'
            : `${addressLabel(command.target, context)} ${command.kind === 'ride' ? '载队伍到' : '走到'}`,
        detail: `(${command.to.col}, ${command.to.row}) · ${{ slow: '慢走', normal: '正常', fast: '快走', run: '跑步' }[command.speed]}${command.to.height ? ` · 高度 ${command.to.height}` : ''}`,
        children,
      }
    case 'setEntityFacing':
    case 'setPartyFacing':
    case 'stepEntity': {
      const dir = command.kind === 'stepEntity' ? command.dir : command.facing
      const facing = ENTITY_FACING_OPTIONS.find((option) => option.value === dir)
      return {
        icon: command.kind === 'stepEntity' ? '👣' : '🧭',
        label:
          command.kind === 'setPartyFacing'
            ? '队伍转向'
            : `${addressLabel(command.target, context)} ${command.kind === 'stepEntity' ? '走一步' : '转向'}`,
        detail: facing ? `${facing.label} · ${facing.description}` : dir,
        children,
      }
    }
    case 'selectSceneHooks':
      return {
        icon: '📜',
        label: `${command.scene} 切换场景脚本`,
        detail: (['onEnter', 'onTeleport'] as const)
          .flatMap((slot) => {
            const selection = command.selection[slot]
            if (!selection) return []
            const label =
              selection.kind === 'use'
                ? (context?.state.scenes.find((scene) => scene.id === command.scene)?.hooks?.[slot]
                    ?.variants[selection.value]?.label ?? `方案 ${selection.value}（未解析）`)
                : selection.kind === 'disabled'
                  ? '关闭'
                  : '恢复默认方案'
            return `${slot === 'onEnter' ? '进场' : '传送出口'}：${label}`
          })
          .join(' · '),
        children,
      }
    case 'suspendEntity':
      return {
        icon: '⏸',
        label: `暂停 ${addressLabel(command.target, context)}`,
        detail: `${command.ticks} tick`,
        children,
      }
    case 'hideEntity':
      return {
        icon: '🙈',
        label: `隐藏 ${addressLabel(command.target, context)}`,
        detail: `${command.ticks} tick 后允许离屏恢复`,
        children,
      }
    case 'restoreEntity':
      return { icon: '↩', label: `恢复 ${addressLabel(command.target, context)}`, children }
    case 'removeEntity':
      return { icon: '⛔', label: `移除 ${addressLabel(command.target, context)}`, children }
  }
  const presentation = presentationCommand(command)
  if (presentation && (context || command.kind !== 'dialog')) {
    const description = describeScriptCommand(
      presentation,
      context?.locale ?? {},
      context?.shellScenes,
      context?.references ?? {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
      context?.actors,
      (id) =>
        addressLabel(
          'target' in command &&
            command.target &&
            typeof command.target === 'object' &&
            'scene' in command.target
            ? command.target
            : { scene: context?.currentSceneId ?? '', entity: id },
          context,
        ),
    )
    return {
      icon: description.icon,
      label: description.label,
      detail:
        command.kind === 'dialog'
          ? `${{ top: '顶部', bottom: '底部', narration: '旁白', center: '居中' }[command.cue.slot ?? 'bottom']}${command.cue.identity.kind !== 'narration' && command.cue.identity.portrait ? ' · 显示立绘' : ''}${command.cue.autoAdvance ? ' · 自动继续' : ''}`
          : description.detail,
      children,
    }
  }
  if (command.kind === 'dialog')
    return {
      icon: '💬',
      label: command.cue.rows.map((row) => row.text).join(' / ') || '空对话',
      detail:
        command.cue.identity.kind === 'actor'
          ? (command.cue.identity.speakerOverride ?? command.cue.identity.actor)
          : command.cue.identity.kind === 'unbound'
            ? command.cue.identity.speaker
            : undefined,
      children,
    }
  const [icon, label] = AUTHOR_COMMAND_PRESENTATION_[command.kind]
  return { icon, label, children }
}

function commandPathAfterInsert(path: AuthorCommandPath): string {
  const last = path.at(-1)
  if (typeof last !== 'number') return formatAuthorCommandPath(path)
  return formatAuthorCommandPath([...path.slice(0, -1), last + 1])
}

function CommandRows(props: {
  body: readonly AuthorCommand[]
  parentPath: AuthorCommandPath
  context?: CanonicalScriptEditorContext
  selectedPath?: string
  referenceFocusPath?: string
  referenceFocusRevision?: number
  reorderScopeKey: string
  reorderDisabled?: boolean
  showEmptyAction?: boolean
  onSelect: (path: string) => void
  onEdit: (path: string) => void
  onInsert: (path: string) => void
  onCopy: (path: string) => void
  onReorder: (parentPath: AuthorCommandPath, intent: DsReorderIntent) => boolean
  onRemove: (path: string) => void
}) {
  const reorderKeys = useDsReorderKeys(props.body)
  if (!props.body.length && props.showEmptyAction === false)
    return (
      <p className="canonical-script-editor-empty">当前脚本还没有指令；请使用右上角“添加指令”。</p>
    )
  if (!props.body.length)
    return (
      <DsButton
        size="compact"
        variant="secondary"
        icon="add"
        className="canonical-script-empty-add"
        onClick={() => props.onInsert(formatAuthorCommandPath([...props.parentPath, -1]))}
      >
        添加第一条指令
      </DsButton>
    )
  return (
    <DsReorderCollection
      adoptionId="script/canonical-siblings"
      scopeKey={`${props.reorderScopeKey}:${formatAuthorCommandPath(props.parentPath) || 'root'}`}
      entries={props.body.map((command, index) => ({
        key: reorderKeys.keys[index]!,
        label: describeCanonicalCommand(command, props.context).label,
      }))}
      revision={props.body}
      disabled={props.reorderDisabled}
      onReorder={(intent) => {
        const changed = props.onReorder(props.parentPath, intent)
        if (changed) reorderKeys.move(intent)
        return changed
      }}
    >
      <div className="canonical-command-list" role="tree">
        {props.body.map((command, index) => {
          const path = formatAuthorCommandPath([...props.parentPath, index])
          const reorderKey = reorderKeys.keys[index]!
          const description = describeCanonicalCommand(command, props.context)
          const referenceFocusClass =
            props.referenceFocusPath === path && props.referenceFocusRevision !== undefined
              ? ` reference-focus-${Math.abs(props.referenceFocusRevision) % 2 === 0 ? 'even' : 'odd'}`
              : ''
          return (
            <div className="canonical-command-node" key={reorderKey}>
              <DsReorderItem itemKey={reorderKey} role="none">
                <div
                  role="treeitem"
                  className={`cmd-row${props.selectedPath === path ? ' sel' : ''}${referenceFocusClass}`}
                  data-command-path={path}
                  tabIndex={0}
                  onClick={() => props.onSelect(path)}
                  onDoubleClick={() => props.onEdit(path)}
                  onKeyDown={(event) => {
                    if (event.currentTarget !== event.target) return
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    props.onSelect(path)
                  }}
                >
                  <span className="cmd-ico">{description.icon}</span>
                  <span className="cmd-label">{description.label}</span>
                  {description.detail ? (
                    <span className="cmd-detail">{description.detail}</span>
                  ) : null}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: 只挡住行选择，内部按钮可键盘操作。 */}
                  <span
                    className="canonical-script-row-actions"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <DsIconButton
                      label="编辑"
                      icon="edit"
                      size="compact"
                      onClick={() => props.onEdit(path)}
                    />
                    <DsIconButton
                      label="在此后插入"
                      icon="add"
                      size="compact"
                      onClick={() => props.onInsert(path)}
                    />
                    <DsIconButton
                      label="复制"
                      icon="copy"
                      size="compact"
                      onClick={() => props.onCopy(path)}
                    />
                    <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                    <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                    <DsIconButton
                      label="删除"
                      icon="delete"
                      size="compact"
                      variant="danger"
                      onClick={() => props.onRemove(path)}
                    />
                  </span>
                </div>
              </DsReorderItem>
              {description.children.map((child) => (
                <section className="canonical-command-child" key={child.key}>
                  <header className="canonical-command-child__header">
                    <span className="canonical-command-child__label">{child.label}</span>
                    <span className="canonical-command-child__count">{child.body.length} 条</span>
                  </header>
                  <CommandRows
                    body={child.body}
                    parentPath={[...props.parentPath, index, child.key]}
                    context={
                      props.context && (command.kind === 'loop' || command.kind === 'repeat')
                        ? {
                            ...props.context,
                            enclosingLoops: [
                              ...(props.context.enclosingLoops ?? []),
                              { id: command.id, label: command.label },
                            ],
                          }
                        : props.context
                    }
                    selectedPath={props.selectedPath}
                    referenceFocusPath={props.referenceFocusPath}
                    referenceFocusRevision={props.referenceFocusRevision}
                    reorderScopeKey={props.reorderScopeKey}
                    reorderDisabled={props.reorderDisabled}
                    onSelect={props.onSelect}
                    onEdit={props.onEdit}
                    onInsert={props.onInsert}
                    onCopy={props.onCopy}
                    onReorder={props.onReorder}
                    onRemove={props.onRemove}
                  />
                </section>
              ))}
            </div>
          )
        })}
      </div>
    </DsReorderCollection>
  )
}

function remapSiblingPath(
  path: string | undefined,
  parentPath: AuthorCommandPath,
  fromIndex: number,
  toIndex: number,
): string | undefined {
  if (!path) return path
  const parsed = parseAuthorCommandPath(path)
  if (
    parsed.length <= parentPath.length ||
    !parentPath.every((segment, index) => parsed[index] === segment)
  )
    return path
  const siblingIndex = parsed[parentPath.length]
  if (typeof siblingIndex !== 'number') return path
  const nextIndex =
    siblingIndex === fromIndex
      ? toIndex
      : fromIndex < toIndex && siblingIndex > fromIndex && siblingIndex <= toIndex
        ? siblingIndex - 1
        : fromIndex > toIndex && siblingIndex >= toIndex && siblingIndex < fromIndex
          ? siblingIndex + 1
          : siblingIndex
  if (nextIndex === siblingIndex) return path
  return formatAuthorCommandPath([
    ...parsed.slice(0, parentPath.length),
    nextIndex,
    ...parsed.slice(parentPath.length + 1),
  ])
}

function defaultCondition(kind: AuthorCondition['kind'], target?: EntityAddress): AuthorCondition {
  switch (kind) {
    case 'flag':
      return { kind, flag: 'my-flag', is: true }
    case 'var':
      return { kind, var: 'my-var', op: '==', value: 0 }
    case 'currentScene':
      return { kind, scene: 'scene' }
    case 'entityState':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' }, is: 1 }
    case 'entityInScene':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' } }
    case 'entitiesNear':
      return {
        kind,
        from: target ?? { scene: 'scene', entity: 'entity' },
        to: target ?? { scene: 'scene', entity: 'entity' },
        range: 0.5,
      }
    case 'facingEntity':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' }, range: 1 }
    case 'chance':
      return { kind, percent: 50 }
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      return { kind, itemId: 'item', atLeast: 1 }
    case 'allFullHp':
      return { kind }
    case 'hasMoney':
      return { kind, atLeast: 0 }
    case 'inParty':
      return { kind, actorId: 'actor' }
    case 'all':
    case 'any':
      return { kind, of: [{ kind: 'flag', flag: 'my-flag', is: true }] }
    case 'not':
      return { kind, cond: { kind: 'flag', flag: 'my-flag', is: true } }
  }
}

type ScriptEditorEntity = ScriptEditorState['scenes'][number]['entities'][number]

function entitySupportsFacing(entity: ScriptEditorEntity): boolean {
  return 'actor' in entity || 'sprite' in entity
}

function EntityAddressEditor(props: {
  value: EntityAddress
  state?: ScriptEditorState
  sceneIndex?: SceneIndexV1
  displayContext?: CanonicalScriptEditorContext
  entityFilter?: (entity: ScriptEditorEntity) => boolean
  onChange: (value: EntityAddress) => void
  onOpen?: (value: EntityAddress) => void
}) {
  const scenes = props.state?.scenes ?? []
  const scene = scenes.find((candidate) => candidate.id === props.value.scene)
  const acceptsEntity = props.entityFilter ?? (() => true)
  const selectableScenes = props.entityFilter
    ? scenes.filter((candidate) => candidate.entities.some(acceptsEntity))
    : scenes
  const selectableEntities = scene?.entities.filter(acceptsEntity) ?? []
  const currentEntity = scene?.entities.find((candidate) => candidate.id === props.value.entity)
  const sceneIsSelectable = selectableScenes.some((candidate) => candidate.id === scene?.id)
  const entityIsSelectable = selectableEntities.some(
    (candidate) => candidate.id === props.value.entity,
  )
  return (
    <div className="canonical-address-editor">
      <div className="canonical-address-field">
        <span>场景</span>
        {scenes.length ? (
          <DsSelect
            size="compact"
            aria-label="场景"
            value={props.value.scene}
            options={[
              ...(!scene || !sceneIsSelectable
                ? [
                    {
                      value: props.value.scene,
                      label: !scene
                        ? `${props.value.scene}（引用失效）`
                        : `${props.value.scene}（没有可转向实体）`,
                      disabled: true,
                    },
                  ]
                : []),
              ...selectableScenes.map((candidate) => ({
                value: candidate.id,
                label: sceneDisplayLabel(props.sceneIndex, candidate.id),
              })),
            ]}
            onValueChange={(sceneId) => {
              const nextScene = selectableScenes.find((candidate) => candidate.id === sceneId)
              props.onChange({
                scene: sceneId,
                entity: nextScene?.entities.find(acceptsEntity)?.id ?? props.value.entity,
              })
            }}
          />
        ) : (
          <DsTextInput
            size="compact"
            aria-label="场景"
            value={props.value.scene}
            onChange={(event) => props.onChange({ ...props.value, scene: event.target.value })}
          />
        )}
      </div>
      <div className="canonical-address-field">
        <span>实体</span>
        {scene ? (
          <DsSelect
            size="compact"
            aria-label="实体"
            value={props.value.entity}
            options={[
              ...(!currentEntity || !entityIsSelectable
                ? [
                    {
                      value: props.value.entity,
                      label: !currentEntity
                        ? `${props.value.entity}（引用失效）`
                        : `${props.value.entity}（不支持朝向）`,
                      disabled: true,
                    },
                  ]
                : []),
              ...selectableEntities.map((candidate) => ({
                value: candidate.id,
                label: props.displayContext
                  ? addressLabel({ scene: scene.id, entity: candidate.id }, props.displayContext)
                  : entityDisplayLabel(candidate),
              })),
            ]}
            disabled={selectableEntities.length === 0}
            onValueChange={(entity) => props.onChange({ ...props.value, entity })}
          />
        ) : (
          <DsTextInput
            size="compact"
            aria-label="实体"
            value={props.value.entity}
            onChange={(event) => props.onChange({ ...props.value, entity: event.target.value })}
          />
        )}
      </div>
      {props.onOpen ? (
        <DsButton
          size="compact"
          variant="secondary"
          className="canonical-address-open"
          disabled={!currentEntity}
          onClick={() => props.onOpen?.(props.value)}
        >
          {props.displayContext
            ? `定位 ${addressLabel(props.value, props.displayContext)}`
            : `定位 ${props.value.entity}`}
        </DsButton>
      ) : null}
    </div>
  )
}

function ConditionEditor(props: {
  value: AuthorCondition
  state?: ScriptEditorState
  sceneIndex?: SceneIndexV1
  displayContext?: CanonicalScriptEditorContext
  references?: ScriptReferenceCatalog
  worldVariables?: WorldVariableRegistryV1
  onOpenWorldVariable?: (id: string) => void
  onChange: (condition: AuthorCondition) => void
}) {
  const sceneFieldId = useId()
  const patch = (value: Record<string, unknown>): void =>
    props.onChange({ ...props.value, ...value } as AuthorCondition)
  const currentScene = props.value.kind === 'currentScene' ? props.value : undefined
  const target =
    props.value.kind === 'entityState' ||
    props.value.kind === 'entityInScene' ||
    props.value.kind === 'facingEntity'
      ? props.value.target
      : undefined
  const firstTarget = props.state?.scenes[0]?.entities[0]
    ? {
        scene: props.state.scenes[0]!.id,
        entity: props.state.scenes[0]!.entities[0]!.id,
      }
    : undefined
  return (
    <div className="canonical-condition-editor">
      <CanonicalField label="条件">
        <DsSelect
          size="compact"
          value={props.value.kind}
          options={[
            ['flag', '开关'],
            ['var', '数值'],
            ['currentScene', '当前场景'],
            ['chance', '概率'],
            ['hasItem', '背包持有物品'],
            ['ownsItem', '拥有物品'],
            ['itemEquipped', '已装备物品'],
            ['entityState', '实体状态'],
            ['entityInScene', '实体在场'],
            ['entitiesNear', '两个实体靠近'],
            ['facingEntity', '面向实体'],
            ['allFullHp', '全队满血'],
            ['hasMoney', '金钱'],
            ['inParty', '队伍成员'],
            ['all', '全部满足'],
            ['any', '任一满足'],
            ['not', '取反'],
          ].map(([value, label]) => ({ value: value!, label: label! }))}
          onValueChange={(kind) =>
            props.onChange(defaultCondition(kind as AuthorCondition['kind'], target ?? firstTarget))
          }
        />
      </CanonicalField>
      {props.value.kind === 'flag' ? (
        <>
          <CanonicalField label="开关 id">
            <WorldVariablePicker
              value={props.value.flag}
              kind="flag"
              variables={props.worldVariables}
              onChange={(flag) => patch({ flag })}
              onOpen={props.onOpenWorldVariable}
            />
          </CanonicalField>
          <CanonicalField label="期望">
            <DsSelect
              size="compact"
              value={props.value.is ? 'true' : 'false'}
              options={[
                { value: 'true', label: '为真' },
                { value: 'false', label: '为假' },
              ]}
              onValueChange={(value) => patch({ is: value === 'true' })}
            />
          </CanonicalField>
        </>
      ) : null}
      {props.value.kind === 'var' ? (
        <>
          <CanonicalField label="数值 id">
            <WorldVariablePicker
              value={props.value.var}
              kind="number"
              variables={props.worldVariables}
              onChange={(variable) => patch({ var: variable })}
              onOpen={props.onOpenWorldVariable}
            />
          </CanonicalField>
          <CanonicalField label="比较">
            <DsSelect
              size="compact"
              value={props.value.op}
              options={['==', '!=', '>=', '<=', '>', '<'].map((op) => ({
                value: op,
                label: op,
              }))}
              onValueChange={(op) =>
                patch({
                  op: op as Extract<AuthorCondition, { kind: 'var' }>['op'],
                })
              }
            />
          </CanonicalField>
          <CanonicalField label="值">
            <DsNumberInput
              size="compact"
              value={props.value.value}
              onChange={(event) => patch({ value: Number(event.target.value) })}
            />
          </CanonicalField>
        </>
      ) : null}
      {currentScene ? (
        <label htmlFor={sceneFieldId}>
          <span>场景</span>
          {props.state?.scenes.length ? (
            <DsSelect
              size="compact"
              id={sceneFieldId}
              value={currentScene.scene}
              options={[
                ...(!props.state.scenes.some((scene) => scene.id === currentScene.scene)
                  ? [{ value: currentScene.scene, label: `${currentScene.scene}（引用失效）` }]
                  : []),
                ...props.state.scenes.map((scene) => ({
                  value: scene.id,
                  label: sceneDisplayLabel(props.sceneIndex, scene.id),
                })),
              ]}
              onValueChange={(scene) => patch({ scene })}
            />
          ) : (
            <DsTextInput
              size="compact"
              id={sceneFieldId}
              value={currentScene.scene}
              onChange={(event) => patch({ scene: event.target.value })}
            />
          )}
        </label>
      ) : null}
      {props.value.kind === 'chance' ? (
        <CanonicalField label="概率 %">
          <DsNumberInput
            size="compact"
            min={0}
            max={100}
            value={props.value.percent}
            onChange={(event) =>
              patch({ percent: Math.max(0, Math.min(100, Number(event.target.value))) })
            }
          />
        </CanonicalField>
      ) : null}
      {props.value.kind === 'hasItem' ||
      props.value.kind === 'ownsItem' ||
      props.value.kind === 'itemEquipped' ? (
        <>
          <CanonicalField label="物品">
            <DsSelect
              size="compact"
              value={props.value.itemId}
              options={[
                ...(!props.references?.has('item', props.value.itemId)
                  ? [{ value: props.value.itemId, label: props.value.itemId }]
                  : []),
                ...(props.references?.choices('item').map((choice) => ({
                  value: choice.id,
                  label: `${choice.name} · ${choice.id}`,
                })) ?? []),
              ]}
              onValueChange={(itemId) => patch({ itemId })}
            />
          </CanonicalField>
          <CanonicalField label="至少">
            <DsNumberInput
              size="compact"
              min={1}
              value={props.value.atLeast ?? 1}
              onChange={(event) => patch({ atLeast: Math.max(1, Number(event.target.value) || 1) })}
            />
          </CanonicalField>
        </>
      ) : null}
      {target ? (
        <EntityAddressEditor
          value={target}
          state={props.state}
          sceneIndex={props.sceneIndex}
          displayContext={props.displayContext}
          onChange={(next) => patch({ target: next })}
        />
      ) : null}
      {props.value.kind === 'entitiesNear' ? (
        <>
          <CanonicalField label="起点实体">
            <EntityAddressEditor
              value={props.value.from}
              state={props.state}
              sceneIndex={props.sceneIndex}
              displayContext={props.displayContext}
              onChange={(from) => patch({ from })}
              onOpen={props.displayContext?.onOpenEntity}
            />
          </CanonicalField>
          <CanonicalField label="目标实体">
            <EntityAddressEditor
              value={props.value.to}
              state={props.state}
              sceneIndex={props.sceneIndex}
              displayContext={props.displayContext}
              onChange={(to) => patch({ to })}
              onOpen={props.displayContext?.onOpenEntity}
            />
          </CanonicalField>
          <CanonicalField label="距离小于（格）">
            <DsNumberInput
              size="compact"
              min={0}
              step={0.25}
              value={props.value.range}
              onChange={(event) => patch({ range: Math.max(0, Number(event.target.value)) })}
            />
          </CanonicalField>
        </>
      ) : null}
      {props.value.kind === 'entityState' ? (
        <CanonicalField label="状态">
          <DsNumberInput
            size="compact"
            value={props.value.is}
            onChange={(event) => patch({ is: Number(event.target.value) })}
          />
        </CanonicalField>
      ) : null}
      {props.value.kind === 'facingEntity' ? (
        <CanonicalField label="距离">
          <DsNumberInput
            size="compact"
            min={0}
            value={props.value.range ?? 1}
            onChange={(event) => patch({ range: Math.max(0, Number(event.target.value)) })}
          />
        </CanonicalField>
      ) : null}
      {props.value.kind === 'inParty' ? (
        <CanonicalField label="队员">
          <DsSelect
            size="compact"
            value={props.value.actorId}
            options={[
              ...(!props.references?.has('actor', props.value.actorId)
                ? [
                    {
                      value: props.value.actorId,
                      label: `${props.value.actorId}（引用失效）`,
                      disabled: true,
                    },
                  ]
                : []),
              ...(props.references?.choices('actor').map((actor) => ({
                value: actor.id,
                label: `${actor.name}（${actor.id}）`,
              })) ?? []),
            ]}
            onValueChange={(actorId) => patch({ actorId })}
          />
        </CanonicalField>
      ) : null}
      {props.value.kind === 'all' || props.value.kind === 'any' ? (
        <div className="canonical-condition-nested">
          {props.value.of.map((condition, index) => (
            <ConditionEditor
              key={index}
              value={condition}
              state={props.state}
              sceneIndex={props.sceneIndex}
              displayContext={props.displayContext}
              references={props.references}
              worldVariables={props.worldVariables}
              onOpenWorldVariable={props.onOpenWorldVariable}
              onChange={(next) => {
                const compound = props.value as Extract<AuthorCondition, { kind: 'all' | 'any' }>
                const of = [...compound.of]
                of[index] = next
                props.onChange({ ...compound, of })
              }}
            />
          ))}
          <DsButton
            size="compact"
            variant="secondary"
            icon="add"
            onClick={() => {
              const compound = props.value as Extract<AuthorCondition, { kind: 'all' | 'any' }>
              props.onChange({
                ...compound,
                of: [...compound.of, { kind: 'flag', flag: 'my-flag', is: true }],
              })
            }}
          >
            添加条件
          </DsButton>
        </div>
      ) : null}
      {props.value.kind === 'not' ? (
        <ConditionEditor
          value={props.value.cond}
          state={props.state}
          sceneIndex={props.sceneIndex}
          displayContext={props.displayContext}
          references={props.references}
          worldVariables={props.worldVariables}
          onOpenWorldVariable={props.onOpenWorldVariable}
          onChange={(cond) =>
            props.onChange({
              ...(props.value as Extract<AuthorCondition, { kind: 'not' }>),
              cond,
            })
          }
        />
      ) : null}
    </div>
  )
}

const PRIMITIVE_FIELD_LABELS: Readonly<Record<string, string>> = {
  var: '数值名称',
  delta: '增减量',
  range: '生效距离',
  floating: '追击时忽略地形与阻挡实体',
  asset: '资源',
  startFrame: '起始帧',
  endFrame: '结束帧',
  frameRate: '每秒帧数',
  initialFadeInMs: '首帧淡入（毫秒）',
  tenths: '恢复生命（十分之几）',
  mapId: '地图',
  level: '强度',
  progression: '变化速度',
  frames: '持续帧数',
  ticks: '持续时间（tick）',
  ms: '持续时间（毫秒）',
  role: '角色序号',
  state: '状态',
  seconds: '重新出现等待（秒）',
  dcol: '横向格偏移',
  drow: '纵向格偏移',
  layer: '图层',
  facing: '朝向',
  frame: '画面帧',
  sprite: '精灵',
  action: '动作',
  loop: '循环播放',
  startAtMs: '从第几毫秒开始',
  wait: '等待动作播放完',
  reset: '恢复页面默认动作',
  speed: '移动速度',
  dir: '方向',
  dx: '横向像素偏移',
  dy: '纵向像素偏移',
  channel: '脚本类型',
}

function primitiveField(
  command: AuthorCommand,
  key: string,
  value: string | number | boolean | undefined,
  onChange: (command: AuthorCommand) => void,
) {
  if (value === undefined) return null
  const label = PRIMITIVE_FIELD_LABELS[key] ?? key
  if (typeof value === 'boolean')
    return (
      <DsCheckbox
        key={key}
        size="compact"
        label={label}
        checked={value}
        onChange={(event) => onChange({ ...command, [key]: event.target.checked } as AuthorCommand)}
      />
    )
  if (key === 'facing' || key === 'dir')
    return (
      <CanonicalField key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'down', label: '向下' },
            { value: 'left', label: '向左' },
            { value: 'up', label: '向上' },
            { value: 'right', label: '向右' },
          ]}
          onValueChange={(nextValue) => onChange({ ...command, [key]: nextValue } as AuthorCommand)}
        />
      </CanonicalField>
    )
  if (key === 'speed')
    return (
      <CanonicalField key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'slow', label: '慢速' },
            { value: 'normal', label: '正常' },
            { value: 'fast', label: '快速' },
            { value: 'run', label: '奔跑' },
          ]}
          onValueChange={(nextValue) => onChange({ ...command, [key]: nextValue } as AuthorCommand)}
        />
      </CanonicalField>
    )
  if (key === 'channel')
    return (
      <CanonicalField key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'trigger', label: '交互脚本' },
            { value: 'auto', label: '自动行为' },
          ]}
          onValueChange={(channel) =>
            onChange({
              ...command,
              [key]: channel,
            } as AuthorCommand)
          }
        />
      </CanonicalField>
    )
  return (
    <CanonicalField key={key} label={label}>
      {typeof value === 'number' ? (
        <DsNumberInput
          size="compact"
          value={value}
          onChange={(event) =>
            onChange({ ...command, [key]: Number(event.target.value) } as AuthorCommand)
          }
        />
      ) : (
        <DsTextInput
          size="compact"
          value={value}
          onChange={(event) => onChange({ ...command, [key]: event.target.value } as AuthorCommand)}
        />
      )}
    </CanonicalField>
  )
}

function CanonicalCommandForm(props: {
  command: AuthorCommand
  context?: CanonicalScriptEditorContext
  reorderScopeKey?: string
  onChange: (command: AuthorCommand) => void
}) {
  const command = props.command
  const context = props.context
  const commandFormBridge = context ? createAuthorCommandFormBridge(command) : undefined
  if (commandFormBridge && context) {
    const scene =
      context.shellScenes.find((candidate) => candidate.id === context.currentSceneId) ??
      context.shellScenes[0]
    if (scene)
      return (
        <CommandForm
          reorderScopeKey={props.reorderScopeKey}
          cmd={commandFormBridge.command}
          scene={scene}
          locale={context.locale}
          assetCatalog={context.assetCatalog}
          audioResolver={context.audioResolver}
          assetReader={context.assetReader}
          scenes={context.shellScenes}
          assetBase={context.assetBase}
          actors={context.actors}
          battleSprites={context.battleSprites}
          sprites={context.sprites}
          ambiences={context.ambiences}
          shops={context.shops}
          references={context.references}
          worldVariables={context.worldVariables}
          onOpenWorldVariable={context.onOpenWorldVariable}
          hasImplicitSelf={context.hasImplicitSelf}
          showRawJson={false}
          onOpenSound={context.onOpenSound}
          onOpenImage={context.onOpenImage}
          onOpenBattleSprite={context.onOpenBattleSprite}
          onOpenSpriteAction={context.onOpenSpriteAction}
          onChange={(next) => props.onChange(commandFormBridge.commit(next))}
        />
      )
  }

  if (command.kind === 'finishStep') {
    const scope = context?.commandScope
    if (scope?.kind !== 'flow') return <p className="hint">结束步骤只能用于方案的步骤正文。</p>
    const selectedStage = command.next.kind === 'stage' ? command.next.stage : undefined
    const value = command.next.kind === 'stage' ? `stage:${command.next.stage}` : command.next.kind
    return (
      <CanonicalField label="结束本次执行后">
        <DsSelect
          size="compact"
          value={value}
          options={[
            { value: 'stay', label: '下次仍执行当前步骤' },
            { value: 'complete', label: '本方案完成，不再执行' },
            ...scope.steps.map((step) => ({
              value: `stage:${step.id}`,
              label: `下次进入${step.label ?? step.id}`,
            })),
            ...(selectedStage && !scope.steps.some((step) => step.id === selectedStage)
              ? [{ value, label: '目标步骤不存在（请重新选择）' }]
              : []),
          ]}
          onValueChange={(value) =>
            props.onChange({
              ...command,
              next:
                value === 'stay'
                  ? { kind: 'stay' }
                  : value === 'complete'
                    ? { kind: 'complete' }
                    : { kind: 'stage', stage: value.slice(6) },
            })
          }
        />
      </CanonicalField>
    )
  }

  if (command.kind === 'continueLoop')
    return (
      <CanonicalField label="开始下一轮">
        <DsSelect
          size="compact"
          value={command.loop ?? ''}
          options={[
            { value: '', label: '当前循环' },
            ...(context?.enclosingLoops ?? []).flatMap((loop) =>
              loop.id ? [{ value: loop.id, label: loop.label ?? loop.id }] : [],
            ),
            ...(command.loop &&
            !(context?.enclosingLoops ?? []).some((loop) => loop.id === command.loop)
              ? [{ value: command.loop, label: '目标不是当前外层循环（请重新选择）' }]
              : []),
          ]}
          onValueChange={(loop) => props.onChange({ ...command, loop: loop || undefined })}
        />
      </CanonicalField>
    )

  if (command.kind === 'branch' || command.kind === 'loop' || command.kind === 'repeat')
    return (
      <div className="canonical-command-form-fields">
        {command.kind === 'loop' || command.kind === 'repeat' ? (
          <CanonicalField label="循环名称（供内层指令选择）">
            <DsTextInput
              size="compact"
              value={command.label ?? ''}
              placeholder="例如：重新尝试挑选姿态"
              onChange={(event) => {
                const label = event.target.value
                let id = command.id
                if (label.trim() && !id) {
                  let suffix = 1
                  const ids = new Set(context?.loopIds ?? [])
                  while (ids.has(`loop-${suffix}`)) suffix++
                  id = `loop-${suffix}`
                }
                props.onChange({ ...command, ...(id ? { id } : {}), label: label || undefined })
              }}
            />
          </CanonicalField>
        ) : null}
        {command.kind === 'repeat' ? (
          <CanonicalField label="重复次数">
            <DsNumberInput
              size="compact"
              min={1}
              step={1}
              value={command.count}
              onChange={(event) =>
                props.onChange({ ...command, count: Number(event.target.value) })
              }
            />
          </CanonicalField>
        ) : null}
        {command.kind === 'loop' ? (
          <CanonicalField label="循环方式">
            <DsSelect
              size="compact"
              value={command.mode}
              options={[
                { value: 'while', label: '条件成立时重复' },
                { value: 'until', label: '直到条件成立' },
                { value: 'forever', label: '持续循环' },
              ]}
              onValueChange={(mode) => {
                if (mode !== 'while' && mode !== 'until' && mode !== 'forever') return
                const { kind: _kind, mode: _mode, body, id, label } = command
                props.onChange(
                  mode === 'forever'
                    ? { kind: 'loop', mode, body, id, label }
                    : {
                        kind: 'loop',
                        mode,
                        body,
                        id,
                        label,
                        cond:
                          command.mode === 'forever'
                            ? { kind: 'flag', flag: 'my-flag', is: true }
                            : command.cond,
                      },
                )
              }}
            />
          </CanonicalField>
        ) : null}
        {command.kind === 'branch' || (command.kind === 'loop' && command.mode !== 'forever') ? (
          <ConditionEditor
            value={command.cond}
            state={context?.state}
            sceneIndex={context?.sceneIndex}
            displayContext={context}
            references={context?.references}
            worldVariables={context?.worldVariables}
            onOpenWorldVariable={context?.onOpenWorldVariable}
            onChange={(cond) => props.onChange({ ...command, cond })}
          />
        ) : null}
        <p className="hint">
          分支和循环正文在左侧树中编辑。持续循环需要等待或耗时动作；退出循环请使用明确的退出指令。
        </p>
      </div>
    )

  if (command.kind === 'callScript') {
    const scripts = Object.entries(context?.state.sharedScripts ?? {})
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="共享脚本">
          <DsSelect
            size="compact"
            value={command.script}
            options={[
              ...(!context?.state.sharedScripts[command.script]
                ? [{ value: command.script, label: `${command.script}（引用失效）` }]
                : []),
              ...scripts.map(([id, script]) => ({
                value: id,
                label: `${script.name} · ${id}`,
              })),
            ]}
            onValueChange={(script) => props.onChange({ ...command, script })}
          />
        </CanonicalField>
        <DsButton
          size="compact"
          variant="secondary"
          icon="open"
          onClick={() => context?.onOpenScript?.(command.script)}
        >
          打开共享脚本
        </DsButton>
        {command.self ? (
          <>
            <span className="field-label">脚本作用实体</span>
            <EntityAddressEditor
              value={command.self}
              state={context?.state}
              sceneIndex={context?.sceneIndex}
              displayContext={context}
              onChange={(self) => props.onChange({ ...command, self })}
            />
            <DsButton
              size="compact"
              variant="secondary"
              onClick={() => props.onChange({ ...command, self: undefined })}
            >
              使用当前实体
            </DsButton>
          </>
        ) : (
          <DsButton
            size="compact"
            variant="secondary"
            icon="add"
            onClick={() => {
              const scene =
                context?.state.scenes.find(
                  (candidate) => candidate.id === context.currentSceneId,
                ) ?? context?.state.scenes[0]
              const entity =
                scene?.entities.find((candidate) => candidate.id === context?.currentEntityId) ??
                scene?.entities[0]
              if (scene && entity)
                props.onChange({ ...command, self: { scene: scene.id, entity: entity.id } })
            }}
          >
            指定另一个作用实体
          </DsButton>
        )}
      </div>
    )
  }

  if (command.kind === 'cameraSnap')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="镜头位置">
          <DsSelect
            size="compact"
            value={command.to ? 'position' : 'follow'}
            options={[
              { value: 'follow', label: '回到队伍并继续跟随' },
              { value: 'position', label: '定位到指定格子' },
            ]}
            onValueChange={(mode) =>
              props.onChange({
                ...command,
                to: mode === 'position' ? { col: 0, row: 0, height: 0 } : undefined,
              })
            }
          />
        </CanonicalField>
        {command.to ? (
          <div className="canonical-grid-editor">
            <CanonicalField label="横向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to!, col: Number(event.target.value) },
                  })
                }
              />
            </CanonicalField>
            <CanonicalField label="纵向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to!, row: Number(event.target.value) },
                  })
                }
              />
            </CanonicalField>
          </div>
        ) : null}
      </div>
    )

  if (command.kind === 'playVideo' || command.kind === 'playFrameAnimation') {
    const expectedKind = command.kind === 'playVideo' ? 'video' : 'frame-animation'
    const assets = Object.entries(context?.assetCatalog.assets ?? {})
      .filter(([, record]) => record.kind === expectedKind)
      .map(([id]) => id)
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label={command.kind === 'playVideo' ? '视频' : '帧动画'}>
          {assets.length ? (
            <DsSelect
              size="compact"
              value={command.asset}
              options={[
                ...(!assets.includes(command.asset)
                  ? [{ value: command.asset, label: `${command.asset}（引用失效）` }]
                  : []),
                ...assets.map((asset) => ({ value: asset, label: asset })),
              ]}
              onValueChange={(asset) => props.onChange({ ...command, asset })}
            />
          ) : (
            <DsTextInput
              size="compact"
              value={command.asset}
              onChange={(event) => props.onChange({ ...command, asset: event.target.value })}
            />
          )}
        </CanonicalField>
        {command.kind === 'playFrameAnimation' ? (
          <div className="canonical-grid-editor">
            {(['startFrame', 'endFrame', 'frameRate', 'initialFadeInMs'] as const).map((key) => (
              <CanonicalField key={key} label={PRIMITIVE_FIELD_LABELS[key]!}>
                <DsNumberInput
                  size="compact"
                  value={command[key] ?? ''}
                  onChange={(event) =>
                    props.onChange({
                      ...command,
                      [key]: event.target.value === '' ? undefined : Number(event.target.value),
                    })
                  }
                />
              </CanonicalField>
            ))}
            <DsCheckbox
              label="播放后保留末帧"
              checked={command.holdLastFrame ?? false}
              onChange={(event) =>
                props.onChange({ ...command, holdLastFrame: event.target.checked })
              }
            />
          </div>
        ) : null}
      </div>
    )
  }

  if (command.kind === 'chasePlayer')
    return (
      <div className="canonical-command-form-fields">
        <div className="canonical-grid-editor">
          <CanonicalField label="开始追逐的格数">
            <DsNumberInput
              size="compact"
              min={0}
              value={command.range ?? ''}
              placeholder="不限距离"
              onChange={(event) =>
                props.onChange({
                  ...command,
                  range: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
            />
          </CanonicalField>
          <CanonicalField label="移动速度">
            <DsNumberInput
              size="compact"
              min={0}
              value={command.speed ?? ''}
              placeholder="默认速度"
              onChange={(event) =>
                props.onChange({
                  ...command,
                  speed: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
            />
          </CanonicalField>
        </div>
        <DsCheckbox
          size="compact"
          label="追击时忽略地形与阻挡实体"
          checked={command.floating ?? false}
          onChange={(event) =>
            props.onChange({ ...command, floating: event.target.checked || undefined })
          }
        />
      </div>
    )

  if (command.kind === 'endBattle')
    return (
      <CanonicalField label="结束结果" className="canonical-command-form-fields">
        <DsSelect
          size="compact"
          value={command.result}
          options={[
            { value: 'terminate', label: '直接结束，不发奖励' },
            { value: 'won', label: '判定玩家胜利' },
            { value: 'lost', label: '判定玩家战败' },
          ]}
          onValueChange={(result) =>
            props.onChange({
              ...command,
              result: result as typeof command.result,
            })
          }
        />
      </CanonicalField>
    )

  if (command.kind === 'increaseHpMp')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="恢复量（负数表示扣除）">
          <DsNumberInput
            size="compact"
            value={command.delta}
            onChange={(event) => props.onChange({ ...command, delta: Number(event.target.value) })}
          />
        </CanonicalField>
        <CanonicalField label="作用资源">
          <DsSelect
            size="compact"
            value={command.pools ?? 'both'}
            options={[
              { value: 'both', label: '生命与法力' },
              { value: 'hp', label: '仅生命' },
              { value: 'mp', label: '仅法力' },
            ]}
            onValueChange={(pools) =>
              props.onChange({
                ...command,
                pools: pools === 'both' ? undefined : (pools as 'hp' | 'mp'),
              })
            }
          />
        </CanonicalField>
      </div>
    )

  if (command.kind === 'unequip')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="角色序号">
          <DsNumberInput
            size="compact"
            min={0}
            value={command.role}
            onChange={(event) => props.onChange({ ...command, role: Number(event.target.value) })}
          />
        </CanonicalField>
        <CanonicalField label="装备位置">
          <DsSelect
            size="compact"
            value={String(command.slot)}
            options={[
              { value: 'all', label: '全部装备' },
              ...[0, 1, 2, 3, 4, 5].map((slot) => ({
                value: String(slot),
                label: `位置 ${slot + 1}`,
              })),
            ]}
            onValueChange={(slot) =>
              props.onChange({
                ...command,
                slot: slot === 'all' ? 'all' : Number(slot),
              })
            }
          />
        </CanonicalField>
      </div>
    )

  if (command.kind === 'setFollowers' || command.kind === 'quitToTitle') {
    const values = command.kind === 'setFollowers' ? command.sprites : (command.videos ?? [])
    return (
      <CanonicalField
        label={
          command.kind === 'setFollowers'
            ? '跟随者精灵（每行一个，留空表示清除）'
            : '返回标题前播放的视频（每行一个，可留空）'
        }
        className="canonical-command-form-fields"
      >
        <DsTextArea
          size="compact"
          value={values.join('\n')}
          onChange={(event) => {
            const next = event.target.value
              .split('\n')
              .map((value) => value.trim())
              .filter(Boolean)
            props.onChange(
              command.kind === 'setFollowers'
                ? { ...command, sprites: next }
                : { ...command, videos: next.length ? next : undefined },
            )
          }}
        />
      </CanonicalField>
    )
  }

  if (command.kind === 'setSceneMapOverride')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="场景">
          <DsSelect
            size="compact"
            value={command.scene ?? ''}
            options={[
              { value: '', label: '当前场景' },
              ...(context?.state.scenes.map((scene) => ({
                value: scene.id,
                label: sceneDisplayLabel(context.sceneIndex, scene.id),
              })) ?? []),
            ]}
            onValueChange={(scene) => props.onChange({ ...command, scene: scene || undefined })}
          />
        </CanonicalField>
        <CanonicalField label="地图 id">
          <DsTextInput
            size="compact"
            value={command.mapId}
            onChange={(event) => props.onChange({ ...command, mapId: event.target.value })}
          />
        </CanonicalField>
      </div>
    )

  if (
    command.kind === 'fleeBattle' ||
    command.kind === 'gameOver' ||
    command.kind === 'halveMoney' ||
    command.kind === 'loadLastSave' ||
    command.kind === 'stopMusic' ||
    command.kind === 'returnScript' ||
    command.kind === 'breakLoop' ||
    command.kind === 'unmountParty'
  )
    return <p className="hint">这条指令没有需要设置的参数。</p>

  if (
    command.kind === 'setEntityState' ||
    command.kind === 'setEntityPos' ||
    command.kind === 'setEntityPosRelParty' ||
    command.kind === 'setEntityLayer' ||
    command.kind === 'setEntityFacing' ||
    command.kind === 'setEntityFrame' ||
    command.kind === 'playEntityAction' ||
    command.kind === 'stopEntityAction' ||
    command.kind === 'moveEntity' ||
    command.kind === 'stepEntity' ||
    command.kind === 'animEntity' ||
    command.kind === 'nudgeEntity' ||
    command.kind === 'takeEntity' ||
    command.kind === 'mountParty' ||
    command.kind === 'ride' ||
    command.kind === 'suspendEntity' ||
    command.kind === 'hideEntity' ||
    command.kind === 'restoreEntity' ||
    command.kind === 'removeEntity' ||
    command.kind === 'selectEntityBehavior' ||
    command.kind === 'runEntityTrigger' ||
    command.kind === 'selectEntityPage' ||
    command.kind === 'setEntityTriggerActivation'
  ) {
    const target = command.target
    const ignored = new Set([
      'kind',
      'target',
      'selection',
      'to',
      'pos',
      ...(command.kind === 'setEntityState' ? ['state'] : []),
    ])
    const triggerActivation =
      command.kind === 'setEntityTriggerActivation' && command.selection.kind === 'use'
        ? command.selection.value
        : undefined
    return (
      <div className="canonical-command-form-fields">
        {target ? (
          <EntityAddressEditor
            value={target}
            state={context?.state}
            sceneIndex={context?.sceneIndex}
            displayContext={context}
            entityFilter={command.kind === 'setEntityFacing' ? entitySupportsFacing : undefined}
            onChange={(next) => props.onChange({ ...command, target: next } as AuthorCommand)}
          />
        ) : (
          <div className="hint">未指定目标：使用当前 self。</div>
        )}
        {command.kind === 'runEntityTrigger' ? (
          <p className="hint">
            执行当前已选中的交互方案与步骤，等执行完成后继续。仅当前场景演出；切场、战斗在调用返回后编排。
          </p>
        ) : null}
        {command.kind === 'setEntityState' ? (
          <CanonicalField label="状态">
            <EntityStateSelect
              value={command.state}
              onChange={(state) => props.onChange({ ...command, state })}
            />
          </CanonicalField>
        ) : null}
        {'to' in command && command.to ? (
          <div className="canonical-grid-editor">
            <CanonicalField label="横向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, col: Number(event.target.value) },
                  } as AuthorCommand)
                }
              />
            </CanonicalField>
            <CanonicalField label="纵向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, row: Number(event.target.value) },
                  } as AuthorCommand)
                }
              />
            </CanonicalField>
          </div>
        ) : null}
        {'pos' in command && command.pos ? (
          <div className="canonical-grid-editor">
            <CanonicalField label="横向格坐标">
              <DsNumberInput
                size="compact"
                value={command.pos.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, col: Number(event.target.value) },
                  } as AuthorCommand)
                }
              />
            </CanonicalField>
            <CanonicalField label="纵向格坐标">
              <DsNumberInput
                size="compact"
                value={command.pos.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, row: Number(event.target.value) },
                  } as AuthorCommand)
                }
              />
            </CanonicalField>
          </div>
        ) : null}
        {Object.entries(command)
          .filter(
            ([key, value]) =>
              !ignored.has(key) &&
              (typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'),
          )
          .map(([key, value]) =>
            primitiveField(command, key, value as string | number | boolean, props.onChange),
          )}
        {command.kind === 'selectEntityBehavior' ? (
          <CanonicalField label="选择">
            <DsSelect
              size="compact"
              value={
                command.selection.kind === 'use'
                  ? `use:${command.selection.value}`
                  : command.selection.kind
              }
              options={[
                { value: 'inherit', label: '继承' },
                { value: 'disabled', label: '显式禁用' },
                ...Object.entries(
                  context?.state.scenes
                    .find((scene) => scene.id === command.target.scene)
                    ?.entities.find((entity) => entity.id === command.target.entity)?.behaviors?.[
                    command.channel
                  ] ?? {},
                ).map(([id, behavior]) => ({
                  value: `use:${id}`,
                  label: `${behavior.label} · ${id}`,
                })),
              ]}
              onValueChange={(value) => {
                props.onChange({
                  ...command,
                  selection: value.startsWith('use:')
                    ? { kind: 'use', value: value.slice(4) }
                    : { kind: value as 'inherit' | 'disabled' },
                })
              }}
            />
          </CanonicalField>
        ) : null}
        {command.kind === 'selectEntityPage' ? (
          <CanonicalField label="页面选择">
            <DsSelect
              size="compact"
              value={
                command.selection.kind === 'use'
                  ? `use:${command.selection.value}`
                  : command.selection.kind
              }
              options={[
                { value: 'inherit', label: '继承当前页面' },
                ...(context?.state.scenes
                  .find((scene) => scene.id === command.target.scene)
                  ?.entities.find((entity) => entity.id === command.target.entity)
                  ?.pages?.map((page) => ({
                    value: `use:${page.id}`,
                    label: `${page.label} · ${page.id}`,
                  })) ?? []),
              ]}
              onValueChange={(value) =>
                props.onChange({
                  ...command,
                  selection: value.startsWith('use:')
                    ? { kind: 'use', value: value.slice(4) }
                    : { kind: 'inherit' },
                })
              }
            />
          </CanonicalField>
        ) : null}
        {command.kind === 'setEntityTriggerActivation' ? (
          <>
            <CanonicalField label="触发方式来源">
              <DsSelect
                size="compact"
                value={command.selection.kind}
                options={[
                  { value: 'inherit', label: '继承页面定义' },
                  { value: 'disabled', label: '显式禁用触发' },
                  { value: 'use', label: '使用自定义方式' },
                ]}
                onValueChange={(value) => {
                  const kind = value as 'inherit' | 'disabled' | 'use'
                  props.onChange({
                    ...command,
                    selection:
                      kind === 'use'
                        ? { kind: 'use', value: { on: 'interact', range: 1 } }
                        : { kind },
                  })
                }}
              />
            </CanonicalField>
            {triggerActivation ? (
              <div className="canonical-grid-editor">
                <CanonicalField label="方式">
                  <DsSelect
                    size="compact"
                    value={triggerActivation.on}
                    options={[
                      { value: 'interact', label: '交互' },
                      { value: 'touch', label: '触碰' },
                    ]}
                    onValueChange={(on) =>
                      props.onChange({
                        ...command,
                        selection: {
                          kind: 'use',
                          value: {
                            ...triggerActivation,
                            on: on as 'interact' | 'touch',
                          },
                        },
                      })
                    }
                  />
                </CanonicalField>
                <CanonicalField label="距离">
                  <DsNumberInput
                    size="compact"
                    min={0}
                    value={triggerActivation.range ?? ''}
                    onChange={(event) =>
                      props.onChange({
                        ...command,
                        selection: {
                          kind: 'use',
                          value: {
                            ...triggerActivation,
                            range:
                              event.target.value === ''
                                ? undefined
                                : Math.max(0, Number(event.target.value)),
                          },
                        },
                      })
                    }
                  />
                </CanonicalField>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  if (command.kind === 'setMultiEntityState')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="状态">
          <EntityStateSelect
            value={command.state}
            onChange={(state) => props.onChange({ ...command, state })}
          />
        </CanonicalField>
        {command.targets.map((target, index) => (
          <EntityAddressEditor
            key={`${target.scene}/${target.entity}/${index}`}
            value={target}
            state={context?.state}
            sceneIndex={context?.sceneIndex}
            displayContext={context}
            onChange={(next) => {
              const targets = [...command.targets]
              targets[index] = next
              props.onChange({ ...command, targets })
            }}
          />
        ))}
      </div>
    )

  if (command.kind === 'confirm')
    return (
      <p className="hint">
        同意与拒绝的指令在左侧子块中编辑；分支结束后继续下方指令。需要提前结束时，请明确添加结束指令。
      </p>
    )

  if (command.kind === 'startBattle')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="敌队">
          <DsSelect
            value={command.enemyTeamId}
            options={(props.context?.enemyTeams ?? []).map((team) => ({
              value: team.id,
              label: team.id,
            }))}
            invalid={!props.context?.enemyTeams?.some((team) => team.id === command.enemyTeamId)}
            onValueChange={(enemyTeamId) => props.onChange({ ...command, enemyTeamId })}
          />
        </CanonicalField>
        <div className="canonical-picker-field">
          <span>战场</span>
          <BattleFieldPicker
            value={command.fieldId}
            fields={props.context?.battleFields ?? []}
            unsetLabel="跟随当前场景默认战场"
            ariaLabel="开战指令战场"
            onOpen={props.context?.onOpenBattleField}
            onChange={(fieldId) => props.onChange({ ...command, fieldId })}
          />
        </div>
        <DsCheckbox
          size="compact"
          label="自动战斗"
          checked={command.auto ?? false}
          onChange={(event) =>
            props.onChange({ ...command, auto: event.target.checked || undefined })
          }
        />
        <DsCheckbox
          size="compact"
          label="Boss"
          checked={command.boss ?? false}
          onChange={(event) =>
            props.onChange({ ...command, boss: event.target.checked || undefined })
          }
        />
        <p className="hint">战败与逃跑分支在左侧树中编辑。</p>
      </div>
    )

  if (command.kind === 'selectSceneHooks') {
    const scene = context?.state.scenes.find((candidate) => candidate.id === command.scene)
    return (
      <div className="canonical-command-form-fields">
        <CanonicalField label="场景">
          <DsSelect
            size="compact"
            value={command.scene}
            options={
              context?.state.scenes.map((candidate) => ({
                value: candidate.id,
                label: sceneDisplayLabel(context.sceneIndex, candidate.id),
              })) ?? []
            }
            onValueChange={(scene) => props.onChange({ ...command, scene })}
          />
        </CanonicalField>
        {(['onEnter', 'onTeleport'] as const).map((slot) => {
          const selection = command.selection[slot]
          const variants = scene?.hooks?.[slot]?.variants ?? {}
          const value =
            selection?.kind === 'use' ? `use:${selection.value}` : (selection?.kind ?? '__omit')
          return (
            <CanonicalField key={slot} label={slot === 'onEnter' ? '进入场景' : '传送出口'}>
              <DsSelect
                size="compact"
                value={value}
                options={[
                  { value: '__omit', label: '不修改此槽' },
                  { value: 'inherit', label: '恢复继承' },
                  { value: 'disabled', label: '显式禁用' },
                  ...Object.entries(variants).map(([id, hook]) => ({
                    value: `use:${id}`,
                    label: `${hook.label} · ${id}`,
                  })),
                ]}
                onValueChange={(raw) => {
                  const next = { ...command.selection }
                  if (raw === '__omit') {
                    delete next[slot]
                    if (Object.keys(next).length === 0) return
                  } else
                    next[slot] = raw.startsWith('use:')
                      ? { kind: 'use', value: raw.slice(4) }
                      : { kind: raw as 'inherit' | 'disabled' }
                  props.onChange({ ...command, selection: next })
                }}
              />
            </CanonicalField>
          )
        })}
        <p className="hint">
          分别选择该场景之后要使用的进场方案和传送出口方案；这里只切换整套方案，不复制或修改方案内容。
        </p>
      </div>
    )
  }

  if (!context && command.kind === 'dialog')
    return (
      <CanonicalField label="对话正文（每行一行）" className="canonical-dialog-fallback">
        <DsTextArea
          size="compact"
          value={command.cue.rows.map((row) => row.text).join('\n')}
          onChange={(event) =>
            props.onChange({
              ...command,
              cue: {
                ...command.cue,
                rows: event.target.value.split('\n').map((text) => ({ text })),
              },
            })
          }
        />
      </CanonicalField>
    )

  return (
    <div className="canonical-command-form-fields">
      {Object.entries(command)
        .filter(
          ([key, value]) =>
            key !== 'kind' &&
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'),
        )
        .map(([key, value]) =>
          primitiveField(command, key, value as string | number | boolean, props.onChange),
        )}
      <p className="hint">结构子块在左侧树中编辑。</p>
    </div>
  )
}

interface InsertionChoice {
  label: string
  commands: AuthorCommand[]
  kind?: AuthorCommand['kind']
  unavailableReason?: string
}

interface InsertionGroup {
  title: string
  choices: InsertionChoice[]
}

function visitCommandExamples(
  commands: readonly AuthorCommand[],
  examples: Map<AuthorCommand['kind'], AuthorCommand>,
): void {
  for (const command of commands) {
    if (!examples.has(command.kind)) examples.set(command.kind, structuredClone(command))
    for (const child of commandChildren(command)) visitCommandExamples(child.body, examples)
  }
}

function projectCommandExamples(state: ScriptEditorState): AuthorCommand[] {
  const examples = new Map<AuthorCommand['kind'], AuthorCommand>()
  for (const scene of state.scenes) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const behavior of Object.values(entity.behaviors?.[channel] ?? {})) {
          for (const stage of behavior.flow.stages) {
            visitCommandExamples(stage.entry?.prepare ?? [], examples)
            visitCommandExamples(stage.body, examples)
          }
        }
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const hook of Object.values(scene.hooks?.[slot]?.variants ?? {})) {
        for (const stage of hook.flow.stages) {
          visitCommandExamples(stage.entry?.prepare ?? [], examples)
          visitCommandExamples(stage.body, examples)
        }
      }
  }
  for (const script of Object.values(state.sharedScripts))
    visitCommandExamples(script.body, examples)
  for (const item of state.items)
    for (const effect of item.use?.effects ?? [])
      if (effect.kind === 'itemPrivateScript') visitCommandExamples(effect.script.body, examples)
  return [...examples.values()]
}

function cleanInsertionExample(
  command: AuthorCommand,
  target: EntityAddress | undefined,
  sceneId: string | undefined,
): AuthorCommand {
  let next = structuredClone(command)
  switch (next.kind) {
    case 'branch':
      next = { ...next, then: [], else: [] }
      break
    case 'loop':
    case 'repeat':
      next = { ...next, body: [] }
      break
    case 'confirm':
      next = { ...next, onYes: [], onNo: [] }
      break
    case 'startBattle':
      next = { ...next, onLose: [], onFlee: [] }
      break
    case 'teleportOut':
      next = { ...next, onFail: [] }
      break
    case 'setMultiEntityState':
      if (target) next = { ...next, targets: [target] }
      break
    case 'selectSceneHooks':
      if (sceneId) next = { ...next, scene: sceneId }
      break
    case 'loadScene':
      if (sceneId) next = { ...next, scene: sceneId }
      break
  }
  if (target && 'target' in next && next.target) next = { ...next, target } as AuthorCommand
  return next
}

function fallbackInsertionChoice(
  kind: AuthorCommand['kind'],
  context: CanonicalScriptEditorContext | undefined,
  target: EntityAddress | undefined,
): InsertionChoice {
  const [icon, label] = AUTHOR_COMMAND_PRESENTATION_[kind]
  const unavailable = (reason: string): InsertionChoice => ({
    kind,
    label: `${icon} ${label}`,
    commands: [],
    unavailableReason: reason,
  })
  const enabled = (command: AuthorCommand): InsertionChoice => ({
    kind,
    label: `${icon} ${label}`,
    commands: [command],
  })

  switch (kind) {
    case 'applyActorCondition': {
      const actor = Object.values(context?.actors ?? {}).find((candidate) => candidate.battler)?.id
      const poisonId = Number(context?.references.choices('poison')[0]?.id)
      return actor
        ? enabled({
            kind,
            actor,
            condition:
              Number.isSafeInteger(poisonId) && poisonId > 0
                ? { kind: 'poison', poisonId }
                : { kind: 'status', status: 'protect', turns: 7 },
          })
        : unavailable('请先创建可参战角色')
    }
    case 'callScript': {
      const script = Object.keys(context?.state.sharedScripts ?? {})[0]
      return script
        ? enabled({ kind, script })
        : unavailable('请先在“剧情 → 脚本库”创建一个可复用脚本')
    }
    case 'runEntityTrigger':
      return target ? enabled({ kind, target }) : unavailable('请先选择当前场景实体')
    case 'clearActorCondition': {
      const actor = Object.values(context?.actors ?? {}).find((candidate) => candidate.battler)?.id
      const poisonId = Number(context?.references.choices('poison')[0]?.id)
      return actor
        ? enabled({
            kind,
            actor,
            condition:
              Number.isSafeInteger(poisonId) && poisonId > 0
                ? { kind: 'poison', poisonId }
                : { kind: 'status', status: 'protect' },
          })
        : unavailable('请先创建可参战角色')
    }
    case 'endBattle':
      return enabled({ kind, result: 'terminate' })
    case 'fleeBattle':
      return enabled({ kind })
    case 'gameOver':
      return enabled({ kind })
    case 'playEntityAction': {
      const sprite = context?.sprites?.find(
        (candidate) => Object.keys(candidate.poses ?? {}).length > 0,
      )
      const action = sprite ? Object.keys(sprite.poses ?? {})[0] : undefined
      return target && sprite && action
        ? enabled({
            kind,
            target,
            sprite: sprite.id,
            action,
            loop: false,
            wait: true,
          })
        : unavailable('请先选择实体，并在精灵库中创建一个可播放动作')
    }
    case 'playVideo': {
      const asset = Object.entries(context?.assetCatalog.assets ?? {}).find(
        ([, record]) => record.kind === 'video',
      )?.[0]
      return asset ? enabled({ kind, asset }) : unavailable('请先在资源库导入一个视频')
    }
    case 'releaseEntity':
      return enabled({ kind, ...(target ? { target } : {}) })
    case 'suspendEntity':
      return target ? enabled({ kind, target, ticks: 1 }) : unavailable('请先选择一个场景实体')
    case 'hideEntity':
      return target ? enabled({ kind, target, ticks: 1 }) : unavailable('请先选择一个场景实体')
    case 'restoreEntity':
      return target ? enabled({ kind, target }) : unavailable('请先选择一个场景实体')
    case 'removeEntity':
      return target ? enabled({ kind, target }) : unavailable('请先选择一个场景实体')
    case 'selectEntityPage':
      return target
        ? enabled({ kind, target, selection: { kind: 'inherit' } })
        : unavailable('请先选择一个场景实体')
    case 'stopEntityAction':
      return target ? enabled({ kind, target, reset: true }) : unavailable('请先选择一个场景实体')
    case 'takeEntity':
      return target ? enabled({ kind, target }) : unavailable('请先选择一个场景实体')
    case 'unmountParty':
      return enabled({ kind })
    case 'clearFrameAnimation':
      return enabled({ kind })
    default:
      return unavailable('当前项目没有这种指令的可复用样例')
  }
}

function insertionGroups(context?: CanonicalScriptEditorContext): InsertionGroup[] {
  const allowed = (kind: AuthorCommand['kind']): boolean =>
    kind === 'finishStep'
      ? context?.commandScope?.kind === 'flow'
      : kind === 'returnScript'
        ? (context?.commandScope?.kind ?? 'script') === 'script'
        : kind === 'breakLoop' || kind === 'continueLoop'
          ? Boolean(context?.enclosingLoops?.length)
          : true
  const item = context?.references.choices('item')[0]?.id
  const shared = Object.keys(context?.state.sharedScripts ?? {})[0]
  const music = context ? musicAssets(context.assetCatalog)[0]?.id : undefined
  const sound = context ? soundAssets(context.assetCatalog)[0]?.id : undefined
  const currentScene =
    context?.state.scenes.find((scene) => scene.id === context.currentSceneId) ??
    context?.state.scenes[0]
  const entity =
    currentScene?.entities.find((candidate) => candidate.id === context?.currentEntityId) ??
    currentScene?.entities[0]
  const target = currentScene && entity ? { scene: currentScene.id, entity: entity.id } : undefined
  const facingTarget = target && entity && entitySupportsFacing(entity) ? target : undefined
  const pos = entity?.pos ?? currentScene?.entry.pos ?? { col: 0, row: 0, height: 0 }
  const groups: InsertionGroup[] = [
    {
      title: '常用指令',
      choices: [
        {
          label: '💬 对话',
          commands: [
            {
              kind: 'dialog',
              cue: { identity: { kind: 'narration' }, rows: [{ text: '(新对话)' }] },
            },
          ],
        },
        { label: '⏱ 等待', commands: [{ kind: 'wait', ms: 200 }] },
        {
          label: '🚶 队伍走到',
          commands: [{ kind: 'moveParty', to: { ...pos }, speed: 'normal' }],
        },
        {
          label: '📍 队伍瞬移',
          commands: [{ kind: 'teleportParty', pos: { ...pos } }],
        },
        {
          label: '🧭 队伍转向',
          commands: [{ kind: 'setPartyFacing', facing: 'down' }],
        },
        ...(target
          ? [
              {
                label: '🚶 实体走到',
                commands: [
                  { kind: 'moveEntity', target, to: { ...pos }, speed: 'normal' },
                ] as AuthorCommand[],
              },
              {
                label: '👁 实体显隐',
                commands: [{ kind: 'setEntityState', target, state: 1 }] as AuthorCommand[],
              },
              ...(facingTarget
                ? [
                    {
                      label: '🧭 实体转向',
                      commands: [
                        { kind: 'setEntityFacing', target: facingTarget, facing: 'down' },
                      ] as AuthorCommand[],
                    },
                  ]
                : []),
            ]
          : []),
        { label: '🌓 淡入/淡出', commands: [{ kind: 'fade', dir: 'out', ms: 300 }] },
        ...(music
          ? [
              {
                label: '🎵 播放音乐',
                commands: [{ kind: 'playMusic', asset: music }],
              } as InsertionChoice,
            ]
          : []),
        ...(sound
          ? [
              {
                label: '🔊 播放音效',
                commands: [{ kind: 'playSound', asset: sound }],
              } as InsertionChoice,
            ]
          : []),
        { label: '⏹ 停止音乐', commands: [{ kind: 'stopMusic' }] },
        ...(currentScene
          ? [
              {
                label: '🚪 切换场景',
                commands: [{ kind: 'loadScene', scene: currentScene.id }],
              } as InsertionChoice,
            ]
          : []),
        {
          label: '⚔ 开始战斗',
          commands: [{ kind: 'startBattle', enemyTeamId: 'team-0' }],
        },
      ],
    },
    {
      title: '实体状态',
      choices: target
        ? [
            { label: '⏸ 暂停实体', commands: [{ kind: 'suspendEntity', target, ticks: 1 }] },
            { label: '🙈 隐藏实体', commands: [{ kind: 'hideEntity', target, ticks: 1 }] },
            { label: '↩ 恢复实体', commands: [{ kind: 'restoreEntity', target }] },
            { label: '⛔ 移除实体', commands: [{ kind: 'removeEntity', target }] },
          ]
        : [],
    },
    {
      title: '剧情逻辑与资源',
      choices: [
        {
          label: '🚩 设置剧情开关',
          commands: [{ kind: 'setFlag', flag: 'my-flag', value: true }],
        },
        {
          label: '🔢 设置数值',
          commands: [{ kind: 'setVar', var: 'my-var', value: 1 }],
        },
        {
          label: '🔢 增减数值',
          commands: [{ kind: 'addVar', var: 'my-var', delta: 1 }],
        },
        {
          label: '🔀 条件分支',
          commands: [
            {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'my-flag', is: true },
              then: [],
              else: [],
            },
          ],
        },
        {
          label: '🔁 条件循环',
          commands: [
            {
              kind: 'loop',
              mode: 'while',
              cond: { kind: 'flag', flag: 'my-flag', is: true },
              body: [],
            },
          ],
        },
        { label: '❓ 是/否询问', commands: [{ kind: 'confirm', onYes: [], onNo: [] }] },
        { label: '🔁 重复指定次数', commands: [{ kind: 'repeat', count: 2, body: [] }] },
        { label: '⛔ 结束本次执行', commands: [{ kind: 'finishStep', next: { kind: 'stay' } }] },
        { label: '↩ 返回调用处', commands: [{ kind: 'returnScript' }] },
        { label: '↪ 退出当前循环', commands: [{ kind: 'breakLoop' }] },
        { label: '🔄 开始下一轮', commands: [{ kind: 'continueLoop' }] },
        ...(item
          ? [
              {
                label: '🎁 获得物品',
                commands: [{ kind: 'giveItem', itemId: item }],
              } as InsertionChoice,
              {
                label: '📤 失去物品',
                commands: [{ kind: 'loseItem', itemId: item }],
              } as InsertionChoice,
            ]
          : []),
        { label: '💰 增减金钱', commands: [{ kind: 'giveMoney', delta: 100 }] },
        ...(shared
          ? [
              {
                label: '↪ 调用共享脚本',
                commands: [{ kind: 'callScript', script: shared }],
              } as InsertionChoice,
            ]
          : []),
      ],
    },
    {
      title: '常用事件模板（插入后仍是普通指令，可逐条修改）',
      choices: [
        ...(target && item
          ? [
              ...(facingTarget
                ? [
                    {
                      label: '📦 宝箱：开盖并给物品',
                      commands: [
                        { kind: 'setEntityFacing', target: facingTarget, facing: 'down' },
                        { kind: 'setEntityFrame', target: facingTarget, frame: 1 },
                        { kind: 'dialog', cue: { rows: [{ text: '(得到物品！)' }] } },
                        { kind: 'giveItem', itemId: item },
                      ],
                    } as InsertionChoice,
                  ]
                : []),
              {
                label: '🌿 地上道具：拾取后消失',
                commands: [
                  { kind: 'dialog', cue: { rows: [{ text: '(得到物品！)' }] } },
                  { kind: 'giveItem', itemId: item },
                  { kind: 'setEntityState', target, state: 0 },
                ],
              } as InsertionChoice,
            ]
          : []),
        ...(facingTarget
          ? [
              {
                label: '🗣 NPC 搭话',
                commands: [
                  { kind: 'setEntityFacing', target: facingTarget, facing: 'down' },
                  { kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } },
                ],
              } as InsertionChoice,
              {
                label: '🚶 来回巡逻',
                commands: [
                  {
                    kind: 'moveEntity',
                    target: facingTarget,
                    to: { ...pos, col: pos.col + 4 },
                    speed: 'slow',
                  },
                  { kind: 'wait', ms: 400 },
                  {
                    kind: 'moveEntity',
                    target: facingTarget,
                    to: { ...pos },
                    speed: 'slow',
                  },
                  { kind: 'wait', ms: 400 },
                ],
              } as InsertionChoice,
              {
                label: '👀 四向张望',
                commands: (['down', 'left', 'up', 'right'] as const).flatMap((facing) => [
                  { kind: 'setEntityFacing', target: facingTarget, facing },
                  { kind: 'setEntityFrame', target: facingTarget, frame: 0 },
                  { kind: 'wait', ms: 600 },
                ]),
              } as InsertionChoice,
            ]
          : []),
        {
          label: '🎥 跨房间镜头',
          commands: [
            { kind: 'moveParty', to: { ...pos }, speed: 'normal' },
            { kind: 'cameraPan', dx: 16, dy: 8, frames: 20 },
            { kind: 'teleportParty', pos: { ...pos } },
            { kind: 'cameraSnap' },
            { kind: 'moveParty', to: { ...pos }, speed: 'normal' },
          ],
        },
      ],
    },
  ]
  const represented = new Set(
    groups.flatMap((group) =>
      group.choices.flatMap((choice) => choice.commands.map((command) => command.kind)),
    ),
  )
  const examples = new Map(
    (context ? projectCommandExamples(context.state) : []).map((command) => [
      command.kind,
      command,
    ]),
  )
  const more = (Object.keys(AUTHOR_COMMAND_PRESENTATION_) as AuthorCommand['kind'][])
    .filter(
      (kind) =>
        allowed(kind) && !represented.has(kind) && kind !== 'holdScreen' && kind !== 'revealScreen',
    )
    .map((kind) => {
      if (kind === 'setEntityFacing' && !facingTarget)
        return {
          kind,
          label: '🧭 实体转向',
          commands: [],
          unavailableReason: '触发区没有朝向；请先选择一个可见实体',
        } satisfies InsertionChoice
      const command = examples.get(kind)
      if (!command) return fallbackInsertionChoice(kind, context, target)
      const [icon, label] = AUTHOR_COMMAND_PRESENTATION_[kind]
      return {
        kind,
        label: `${icon} ${label}`,
        commands: [cleanInsertionExample(command, target, currentScene?.id)] as AuthorCommand[],
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  if (more.length)
    groups.push({
      title: '更多指令',
      choices: more,
    })
  return groups
    .map((group) => ({
      ...group,
      choices: group.choices.filter((choice) =>
        choice.commands.every((command) => allowed(command.kind)),
      ),
    }))
    .filter((group) => group.choices.length > 0)
}

function insertCommandsAfter(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  commands: readonly AuthorCommand[],
): { body: AuthorCommand[]; selectedPath: string } {
  let nextBody = [...body]
  let cursor = path
  for (const command of commands) {
    nextBody = insertAuthorCommandAfter(nextBody, cursor, structuredClone(command))
    cursor = parseAuthorCommandPath(commandPathAfterInsert(cursor))
  }
  return { body: nextBody, selectedPath: formatAuthorCommandPath(cursor) }
}

export function CanonicalScriptBodyEditor(props: {
  body: readonly AuthorCommand[]
  onChange: (body: AuthorCommand[]) => void
  context?: CanonicalScriptEditorContext
  onError?: (message: string) => void
  label?: string
  focusCommandPath?: string
  focusRevision?: number
  reorderScopeKey?: string
  presentation?: 'plain' | 'workbench'
}) {
  const fallbackReorderScope = useId()
  const editorRef = useRef<HTMLElement>(null)
  const lastAppliedFocusRevisionRef = useRef<number | undefined>(undefined)
  const lastSeenBodyRef = useRef(props.body)
  const lastSeenBodyFingerprintRef = useRef(JSON.stringify(props.body))
  const locallyExpectedBodyFingerprintRef = useRef<string | undefined>(undefined)
  const [selectedPath, setSelectedPath] = useState<string>()
  const [externalIdentityEpoch, setExternalIdentityEpoch] = useState(0)
  const [editingDraft, setEditingDraft] = useState<{
    path: string
    sourceBody: readonly AuthorCommand[]
    command: AuthorCommand
  }>()
  const editingPath = editingDraft?.path
  const [insertPath, setInsertPath] = useState<string>()
  const [insertSearch, setInsertSearch] = useState('')
  const editing = editingDraft?.command
  const loopIds = useMemo(() => collectAuthorLoopIds(props.body), [props.body])
  const insertionContext = props.context
    ? {
        ...props.context,
        loopIds,
        enclosingLoops: authorLoopAncestors(props.body, parseAuthorCommandPath(insertPath ?? '')),
      }
    : undefined
  const editingContext = props.context
    ? {
        ...props.context,
        loopIds,
        enclosingLoops: authorLoopAncestors(props.body, parseAuthorCommandPath(editingPath ?? '')),
      }
    : undefined
  const groups = insertionGroups(insertionContext)
  const visibleGroups = useMemo(() => {
    const query = insertSearch.trim().toLocaleLowerCase()
    if (!query) return groups
    return groups
      .map((group) => ({
        ...group,
        choices: group.choices.filter((choice) => choice.label.toLocaleLowerCase().includes(query)),
      }))
      .filter((group) => group.choices.length)
  }, [groups, insertSearch])

  useEffect(() => {
    if (lastSeenBodyRef.current !== props.body) {
      const fingerprint = JSON.stringify(props.body)
      const bodyChanged = lastSeenBodyFingerprintRef.current !== fingerprint
      const locallyOwned = locallyExpectedBodyFingerprintRef.current === fingerprint
      const previousSelected = selectedPath
        ? getAuthorCommandAt(lastSeenBodyRef.current, parseAuthorCommandPath(selectedPath))
        : undefined
      const nextSelected = selectedPath
        ? getAuthorCommandAt(props.body, parseAuthorCommandPath(selectedPath))
        : undefined
      const selectedIdentityChanged =
        selectedPath !== undefined &&
        JSON.stringify(previousSelected) !== JSON.stringify(nextSelected)
      lastSeenBodyRef.current = props.body
      lastSeenBodyFingerprintRef.current = fingerprint
      if (locallyOwned) locallyExpectedBodyFingerprintRef.current = undefined
      if (bodyChanged && !locallyOwned) {
        if (selectedIdentityChanged) setSelectedPath(undefined)
        setEditingDraft(undefined)
        setInsertPath(undefined)
        const explicitFocusPending =
          props.focusRevision !== undefined &&
          lastAppliedFocusRevisionRef.current !== props.focusRevision
        if (!explicitFocusPending) setExternalIdentityEpoch((epoch) => epoch + 1)
        return
      }
    }
    if (selectedPath && !getAuthorCommandAt(props.body, parseAuthorCommandPath(selectedPath)))
      setSelectedPath(undefined)
    if (
      editingDraft &&
      (editingDraft.sourceBody !== props.body ||
        !getAuthorCommandAt(props.body, parseAuthorCommandPath(editingDraft.path)))
    )
      setEditingDraft(undefined)
  }, [props.body, selectedPath, editingDraft, props.focusRevision])

  useEffect(() => {
    if (props.focusRevision === undefined || props.focusCommandPath === undefined) return
    if (lastAppliedFocusRevisionRef.current === props.focusRevision) return
    lastAppliedFocusRevisionRef.current = props.focusRevision
    let command: AuthorCommand | undefined
    try {
      command = getAuthorCommandAt(props.body, parseAuthorCommandPath(props.focusCommandPath))
    } catch {
      command = undefined
    }
    if (!command) {
      props.onError?.('引用位置已变化，请重新打开方案详情。')
      return
    }
    setSelectedPath(props.focusCommandPath)
    window.requestAnimationFrame(() => {
      if (lastAppliedFocusRevisionRef.current !== props.focusRevision) return
      const row = [
        ...(editorRef.current?.querySelectorAll<HTMLElement>('[data-command-path]') ?? []),
      ].find((candidate) => candidate.dataset.commandPath === props.focusCommandPath)
      row?.scrollIntoView({ block: 'center', inline: 'nearest' })
      row?.focus({ preventScroll: true })
    })
    // 不取消这一帧：跨页面定位后，外壳可能因测量宽度立刻重渲染并替换 body 引用；
    // editorRef 始终读取最新 DOM，revision 检查会淘汰真正过期的定位请求。
  }, [props.body, props.focusCommandPath, props.focusRevision, props.onError])

  const commit = (body: AuthorCommand[]): boolean => {
    try {
      locallyExpectedBodyFingerprintRef.current = JSON.stringify(body)
      props.onChange(body)
      return true
    } catch (error) {
      locallyExpectedBodyFingerprintRef.current = undefined
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  const editorLabel = props.label ?? '脚本正文'
  const openInsertAtEnd = (): void => {
    setInsertPath(formatAuthorCommandPath([props.body.length ? props.body.length - 1 : -1]))
  }
  const headerActions = (
    <>
      <span className="canonical-script-editor-summary">
        {props.body.length} 条顶层指令 · 双击指令可编辑
      </span>
      <DsButton size="compact" variant="secondary" icon="add" onClick={openInsertAtEnd}>
        添加指令
      </DsButton>
    </>
  )
  const editor = (
    <section
      ref={editorRef}
      className={`canonical-script-editor${
        props.presentation === 'workbench' ? ' canonical-script-editor--embedded' : ''
      }`}
      aria-label={props.label ?? '脚本正文编辑器'}
    >
      {props.presentation !== 'workbench' ? (
        <header className="canonical-script-editor-heading">
          <strong>{editorLabel}</strong>
          <div>{headerActions}</div>
        </header>
      ) : null}
      <div className="canonical-script-editor-layout">
        <div className="canonical-script-tree">
          <CommandRows
            key={externalIdentityEpoch}
            body={props.body}
            parentPath={[]}
            context={props.context}
            selectedPath={selectedPath}
            referenceFocusPath={props.focusCommandPath}
            referenceFocusRevision={props.focusRevision}
            reorderScopeKey={props.reorderScopeKey ?? `canonical:${fallbackReorderScope}`}
            reorderDisabled={Boolean(editingDraft || insertPath)}
            showEmptyAction={props.presentation !== 'workbench'}
            onSelect={(path) => {
              setSelectedPath(path)
            }}
            onEdit={(path) => {
              setSelectedPath(path)
              const command = getAuthorCommandAt(props.body, parseAuthorCommandPath(path))
              if (!command) return
              setEditingDraft({
                path,
                sourceBody: props.body,
                command: structuredClone(command),
              })
              setInsertPath(undefined)
            }}
            onInsert={(path) => {
              setSelectedPath(path)
              setEditingDraft(undefined)
              setInsertPath(path)
            }}
            onCopy={(path) => {
              const parsed = parseAuthorCommandPath(path)
              if (commit(copyAuthorCommandAt(props.body, parsed)))
                setSelectedPath(commandPathAfterInsert(parsed))
            }}
            onReorder={(parentPath, intent) => {
              const path = [...parentPath, intent.fromIndex]
              const next = moveAuthorCommandToIndex(props.body, path, intent.toIndex)
              if (next === props.body || !commit(next)) return false
              setSelectedPath((current) =>
                remapSiblingPath(current, parentPath, intent.fromIndex, intent.toIndex),
              )
              return true
            }}
            onRemove={(path) => {
              if (commit(removeAuthorCommandAt(props.body, parseAuthorCommandPath(path)))) {
                setSelectedPath(undefined)
                setEditingDraft(undefined)
              }
            }}
          />
        </div>
      </div>

      {insertPath ? (
        <CanonicalScriptDialog title="添加指令" onClose={() => setInsertPath(undefined)}>
          <div className="canonical-script-insert-dialog">
            <p className="canonical-script-modal-copy">
              选择一条指令或常用事件模板。新内容会插在当前指令之后。
            </p>
            <DsTextInput
              size="compact"
              type="search"
              aria-label="搜索可插入指令"
              placeholder="搜索指令或事件模板…"
              value={insertSearch}
              onChange={(event) => setInsertSearch(event.target.value)}
            />
            {visibleGroups.map((group) => (
              <section key={group.title}>
                <div className="cf-group">{group.title}</div>
                <div className="cf-insert">
                  {group.choices.map((choice, index) => (
                    <DsButton
                      size="compact"
                      variant="secondary"
                      key={`${choice.label}:${index}`}
                      data-command-kinds={
                        choice.commands.map((command) => command.kind).join(',') || choice.kind
                      }
                      disabled={Boolean(choice.unavailableReason)}
                      title={choice.unavailableReason}
                      onClick={() => {
                        if (choice.unavailableReason) return
                        const result = insertCommandsAfter(
                          props.body,
                          parseAuthorCommandPath(insertPath),
                          choice.commands,
                        )
                        if (commit(result.body)) {
                          setSelectedPath(result.selectedPath)
                          setInsertPath(undefined)
                          setInsertSearch('')
                        }
                      }}
                    >
                      <span>{choice.label}</span>
                      {choice.unavailableReason ? <small>{choice.unavailableReason}</small> : null}
                    </DsButton>
                  ))}
                </div>
              </section>
            ))}
            {!visibleGroups.length ? (
              <p className="canonical-script-editor-empty">没有匹配的指令。</p>
            ) : null}
          </div>
        </CanonicalScriptDialog>
      ) : null}

      {editing && editingPath ? (
        <CanonicalScriptDialog
          title={`编辑：${describeCanonicalCommand(editing, props.context).label}`}
          onClose={() => setEditingDraft(undefined)}
          footer={
            <DsButton
              size="compact"
              variant="primary"
              onClick={() => {
                const path = parseAuthorCommandPath(editingPath)
                const source = getAuthorCommandAt(props.body, path)
                if (JSON.stringify(source) === JSON.stringify(editing)) {
                  setEditingDraft(undefined)
                  return
                }
                if (commit(updateAuthorCommandAt(props.body, path, editing)))
                  setEditingDraft(undefined)
              }}
            >
              完成
            </DsButton>
          }
        >
          <CanonicalCommandForm
            command={editing}
            context={editingContext}
            reorderScopeKey={`canonical:${editingPath}`}
            onChange={(command) =>
              setEditingDraft((current) =>
                current && current.path === editingPath ? { ...current, command } : current,
              )
            }
          />
        </CanonicalScriptDialog>
      ) : null}
    </section>
  )
  return props.presentation === 'workbench' ? (
    <DsWorkbenchSection title={editorLabel} actions={headerActions} contentLayout="list">
      {editor}
    </DsWorkbenchSection>
  ) : (
    editor
  )
}

export function CanonicalHostileOnLoseEditor(props: {
  value: AuthorHostileBehavior['onLose']
  onChange: (value: AuthorHostileBehavior['onLose']) => void
  context?: CanonicalScriptEditorContext
  focusCommandPath?: string
  focusRevision?: number
  onError?: (message: string) => void
}) {
  const [open, setOpen] = useState(false)
  const body = Array.isArray(props.value) ? props.value : undefined
  const custom = body !== undefined

  useEffect(() => {
    if (props.focusRevision !== undefined && custom) setOpen(true)
  }, [custom, props.focusRevision])

  return (
    <>
      <section className="canonical-hostile-script">
        <header>
          <strong>战败后脚本</strong>
          <span>{body ? `${body.length} 条指令` : '游戏结束'}</span>
        </header>
        <div>
          <DsSelect
            size="compact"
            aria-label="战败后的处理"
            value={custom ? 'custom' : 'gameOver'}
            options={[
              { value: 'gameOver', label: '游戏结束（默认）' },
              { value: 'custom', label: '运行自定义脚本' },
            ]}
            onValueChange={(mode) => {
              if (mode === 'custom') {
                props.onChange([])
                setOpen(true)
                return
              }
              props.onChange('gameOver')
              setOpen(false)
            }}
          />
          <DsButton
            size="compact"
            variant="secondary"
            disabled={!custom}
            onClick={() => setOpen(true)}
          >
            编辑脚本
          </DsButton>
        </div>
      </section>

      {open && body ? (
        <CanonicalScriptDialog
          title="战败后脚本"
          className="canonical-hostile-script-dialog"
          onClose={() => setOpen(false)}
          footer={
            <DsButton size="compact" variant="primary" onClick={() => setOpen(false)}>
              完成
            </DsButton>
          }
        >
          <CanonicalScriptBodyEditor
            label="战败后脚本正文"
            body={body}
            context={props.context}
            focusCommandPath={props.focusCommandPath}
            focusRevision={props.focusRevision}
            onError={props.onError}
            onChange={props.onChange}
          />
        </CanonicalScriptDialog>
      ) : null}
    </>
  )
}

function CanonicalFlowBodyTabs(props: {
  prepare?: readonly AuthorCommand[]
  body: readonly AuthorCommand[]
  bodyLabel: string
  context?: CanonicalScriptEditorContext
  onError?: (message: string) => void
  onPrepareChange?: (prepare: AuthorCommand[]) => void
  onBodyChange: (body: AuthorCommand[]) => void
  focusSection?: 'prepare' | 'body'
  focusCommandPath?: string
  focusRevision?: number
}) {
  const [tab, setTab] = useState<'prepare' | 'body'>('body')
  const tabsetId = useId()
  const prepareTabId = `${tabsetId}-prepare-tab`
  const bodyTabId = `${tabsetId}-body-tab`
  const panelId = `${tabsetId}-panel`

  useEffect(() => {
    if (props.prepare === undefined && tab === 'prepare') setTab('body')
  }, [props.prepare, tab])

  useEffect(() => {
    if (props.focusRevision !== undefined && props.focusSection) setTab(props.focusSection)
  }, [props.focusRevision, props.focusSection])

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const tabs = [
      ...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ]
    const currentIndex = tabs.indexOf(event.currentTarget)
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    const nextTab = nextIndex === 0 ? 'prepare' : 'body'
    setTab(nextTab)
    tabs[nextIndex]?.focus()
  }

  if (props.prepare === undefined)
    return (
      <CanonicalScriptBodyEditor
        label={props.bodyLabel}
        body={props.body}
        context={props.context}
        onError={props.onError}
        onChange={props.onBodyChange}
        focusCommandPath={props.focusCommandPath}
        focusRevision={props.focusRevision}
      />
    )

  return (
    <div className="canonical-flow-body">
      <div className="canonical-flow-body-tabs" role="tablist" aria-label="脚本内容">
        <DsButton
          size="compact"
          variant={tab === 'prepare' ? 'primary' : 'quiet'}
          id={prepareTabId}
          role="tab"
          aria-selected={tab === 'prepare'}
          aria-controls={panelId}
          tabIndex={tab === 'prepare' ? 0 : -1}
          onClick={() => setTab('prepare')}
          onKeyDown={onTabKeyDown}
        >
          画面出现前
          <small>{props.prepare.length} 条</small>
        </DsButton>
        <DsButton
          size="compact"
          variant={tab === 'body' ? 'primary' : 'quiet'}
          id={bodyTabId}
          role="tab"
          aria-selected={tab === 'body'}
          aria-controls={panelId}
          tabIndex={tab === 'body' ? 0 : -1}
          onClick={() => setTab('body')}
          onKeyDown={onTabKeyDown}
        >
          脚本正文
          <small>{props.body.length} 条</small>
        </DsButton>
      </div>
      <div
        id={panelId}
        className="canonical-flow-body-panel"
        role="tabpanel"
        aria-labelledby={tab === 'prepare' ? prepareTabId : bodyTabId}
      >
        {tab === 'prepare' ? (
          <CanonicalScriptBodyEditor
            label="画面出现前的准备"
            body={props.prepare}
            context={
              props.context
                ? { ...props.context, commandScope: { kind: 'prepare' }, enclosingLoops: [] }
                : undefined
            }
            onError={props.onError}
            onChange={(prepare) => props.onPrepareChange?.(prepare)}
            focusCommandPath={props.focusSection === 'prepare' ? props.focusCommandPath : undefined}
            focusRevision={props.focusSection === 'prepare' ? props.focusRevision : undefined}
          />
        ) : (
          <CanonicalScriptBodyEditor
            label={props.bodyLabel}
            body={props.body}
            context={props.context}
            onError={props.onError}
            onChange={props.onBodyChange}
            focusCommandPath={props.focusSection === 'body' ? props.focusCommandPath : undefined}
            focusRevision={props.focusSection === 'body' ? props.focusRevision : undefined}
          />
        )}
      </div>
    </div>
  )
}

type TriggerStageFlow = Extract<AuthorScriptFlow, { kind: 'stages' }>

export function removeTriggerStage(
  flow: TriggerStageFlow,
  stageId: string,
  replacementId: string,
): TriggerStageFlow {
  if (flow.stages.length <= 1) throw new Error('每套方案至少需要保留一个步骤')
  if (stageId === replacementId) throw new Error('接替步骤不能是待删除步骤')
  if (!flow.stages.some((stage) => stage.id === stageId))
    throw new Error(`待删除步骤不存在：${stageId}`)
  if (!flow.stages.some((stage) => stage.id === replacementId))
    throw new Error(`接替步骤不存在：${replacementId}`)
  return {
    ...flow,
    initial: flow.initial === stageId ? replacementId : flow.initial,
    stages: flow.stages
      .filter((stage) => stage.id !== stageId)
      .map((stage) => ({
        ...stage,
        ...(stage.next === stageId ? { next: replacementId } : {}),
        body: mapAuthorCommandTree(stage.body, (command) =>
          command.kind === 'finishStep' &&
          command.next.kind === 'stage' &&
          command.next.stage === stageId
            ? { ...command, next: { kind: 'stage', stage: replacementId } }
            : command,
        ),
      })),
  }
}

export function CanonicalScriptFlowEditor(props: {
  flow: AuthorScriptFlow
  previewCursor?: FlowCursor
  onSelectPreviewCursor?: (cursor: FlowCursor) => void
  onChange: (flow: AuthorScriptFlow) => boolean
  ownerLabel?: string
  context?: CanonicalScriptEditorContext
  onError?: (message: string) => void
  focusLocator?: ScriptCommandLocator
  focusRevision?: number
}) {
  const ids = props.flow.stages.map((stage) => stage.id)
  const initialId = props.flow.initial
  const [localSelectedId, setLocalSelectedId] = useState(initialId)
  const cursor = previewFlowCursor(props.flow, props.previewCursor)
  const selectedId = props.previewCursor
    ? cursor.kind === 'stage'
      ? cursor.stage
      : initialId
    : ids.includes(localSelectedId)
      ? localSelectedId
      : initialId
  const onSelectPreviewCursor = props.onSelectPreviewCursor
  const setSelectedId = useCallback(
    (id: string) => {
      setLocalSelectedId(id)
      onSelectPreviewCursor?.({ kind: 'stage', stage: id })
    },
    [onSelectPreviewCursor],
  )
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkNewStage, setLinkNewStage] = useState(true)
  const stageNextSelectId = useId()
  const stageNameInputId = useId()
  const lastAppliedFlowFocusRevisionRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (ids.includes(selectedId)) return
    setSelectedId(initialId)
  }, [ids, initialId, selectedId, setSelectedId])
  useEffect(() => {
    const container = props.focusLocator?.container
    if (props.focusRevision === undefined || !container) return
    if (lastAppliedFlowFocusRevisionRef.current === props.focusRevision) return
    lastAppliedFlowFocusRevisionRef.current = props.focusRevision
    if (container.kind === 'step') {
      if (props.flow.stages.some((stage) => stage.id === container.stepId))
        setSelectedId(container.stepId)
      return
    }
  }, [props.flow, props.focusLocator, props.focusRevision, setSelectedId])

  const flow = props.flow
  const stage = flow.stages.find((candidate) => candidate.id === selectedId) ?? flow.stages[0]
  const hasMultipleStages = flow.stages.length > 1
  const stageIndex = stage ? flow.stages.findIndex((candidate) => candidate.id === stage.id) : -1
  const stageLabel = (id: string): string => {
    return previewStepLabel(flow, { kind: 'stage', stage: id })
  }
  const stageNextLabel = (candidate: (typeof flow.stages)[number]): string =>
    typeof candidate.next === 'object'
      ? '本方案完成，不再执行'
      : candidate.next
        ? `下次进入${stageLabel(candidate.next)}`
        : '下次仍执行当前步骤'
  const stageChoice = (id: string): string => JSON.stringify(['stage', id])
  const replacement =
    stage && hasMultipleStages
      ? (flow.stages[stageIndex + 1] ?? flow.stages[stageIndex - 1])
      : undefined
  const addStage = (): void => {
    let index = flow.stages.length + 1
    let id = `stage-${index}`
    while (ids.includes(id)) id = `stage-${++index}`
    const stages = flow.stages.map((candidate) =>
      linkNewStage && stage && candidate.id === stage.id ? { ...candidate, next: id } : candidate,
    )
    const applied = props.onChange({
      ...flow,
      stages: [...stages, { id, body: [] }],
    })
    if (applied === false) return
    setSelectedId(id)
    setCreateOpen(false)
  }
  const deleteStage = (): void => {
    if (!stage || !replacement) return
    const applied = props.onChange(removeTriggerStage(flow, stage.id, replacement.id))
    if (applied === false) return
    setSelectedId(replacement.id)
    setDeleteOpen(false)
  }
  return (
    <section className="canonical-flow-editor">
      <header className="canonical-flow-explanation">
        <div className="script-section-heading">
          <strong className="script-section-title">步骤列表</strong>
          <span className="script-section-count canonical-flow-count">
            {flow.stages.length} 个步骤
          </span>
          <DsHelpTip label="步骤列表">
            每套方案由步骤和指令组成。每次运行只执行当前步骤；步骤详情可指定下次重复、进入另一步骤，或完成本方案。
          </DsHelpTip>
        </div>
        <div className="canonical-flow-actions">
          <DsButton
            size="compact"
            variant="secondary"
            icon="add"
            onClick={() => {
              setLinkNewStage(true)
              setCreateOpen(true)
            }}
          >
            新建步骤
          </DsButton>
        </div>
      </header>
      <nav className="canonical-stage-tabs" aria-label="执行步骤">
        {flow.stages.map((candidate, index) => (
          <div
            key={candidate.id}
            className={`canonical-stage-card${candidate.id === stage?.id ? ' active' : ''}`}
          >
            <DsPressable
              className="canonical-stage-card-select"
              aria-pressed={candidate.id === stage?.id}
              aria-label={`${stageLabel(candidate.id)}，${candidate.body.length} 条指令，${candidate.id === flow.initial ? '首次运行，' : ''}${stageNextLabel(candidate)}`}
              onClick={() => setSelectedId(candidate.id)}
            >
              <span className="canonical-stage-card-heading">
                <strong>步骤 {index + 1}</strong>
                <span>{candidate.body.length} 条指令</span>
              </span>
              {candidate.label ? (
                <span className="canonical-stage-card-name">{candidate.label}</span>
              ) : null}
              <small>
                {candidate.id === flow.initial ? <span>首次运行</span> : null}
                <span>{stageNextLabel(candidate)}</span>
              </small>
            </DsPressable>
            <DsButton
              size="compact"
              variant="quiet"
              className="canonical-stage-card-details"
              aria-label={`打开“${stageLabel(candidate.id)}”详情`}
              onClick={() => {
                setSelectedId(candidate.id)
                setDetailsOpen(true)
              }}
            >
              步骤详情
            </DsButton>
          </div>
        ))}
      </nav>
      {stage ? (
        <CanonicalFlowBodyTabs
          key={stage.id}
          prepare={stage.entry?.prepare}
          body={stage.body}
          bodyLabel={hasMultipleStages ? `${stageLabel(stage.id)} · 脚本正文` : '脚本正文'}
          context={
            props.context
              ? {
                  ...props.context,
                  commandScope: { kind: 'flow', currentStep: stage.id, steps: flow.stages },
                  enclosingLoops: [],
                }
              : undefined
          }
          onError={props.onError}
          focusSection={
            props.focusLocator?.container.kind === 'step' &&
            props.focusLocator.container.stepId === stage.id
              ? props.focusLocator.container.section
              : undefined
          }
          focusCommandPath={
            props.focusLocator?.container.kind === 'step' &&
            props.focusLocator.container.stepId === stage.id
              ? props.focusLocator.commandPath
              : undefined
          }
          focusRevision={
            props.focusLocator?.container.kind === 'step' &&
            props.focusLocator.container.stepId === stage.id
              ? props.focusRevision
              : undefined
          }
          onPrepareChange={
            stage.entry
              ? (prepare) =>
                  props.onChange({
                    ...flow,
                    stages: flow.stages.map((candidate) =>
                      candidate.id === stage.id
                        ? { ...candidate, entry: { ...stage.entry!, prepare } }
                        : candidate,
                    ),
                  })
              : undefined
          }
          onBodyChange={(body) =>
            props.onChange({
              ...flow,
              stages: flow.stages.map((candidate) =>
                candidate.id === stage.id ? { ...candidate, body } : candidate,
              ),
            })
          }
        />
      ) : null}
      {stage && detailsOpen ? (
        <CanonicalScriptDialog
          title={`${stageLabel(stage.id)} · 详情`}
          className="canonical-flow-settings-dialog"
          onClose={() => setDetailsOpen(false)}
          footer={
            <>
              <DsButton
                size="compact"
                variant="danger"
                disabled={!hasMultipleStages}
                title={hasMultipleStages ? undefined : '每套方案至少需要保留一个步骤。'}
                onClick={() => {
                  setDetailsOpen(false)
                  setDeleteOpen(true)
                }}
              >
                删除步骤
              </DsButton>
              {!hasMultipleStages ? (
                <span className="canonical-stage-delete-note">每套方案至少需要保留一个步骤。</span>
              ) : null}
              <span className="spacer" />
              <DsButton size="compact" variant="secondary" onClick={() => setDetailsOpen(false)}>
                关闭
              </DsButton>
            </>
          }
        >
          <div className="canonical-flow-settings-fields">
            <section className="canonical-flow-setting">
              <DsField
                id={stageNameInputId}
                label="步骤名称"
                help={{
                  label: '步骤名称',
                  content:
                    '说明这一轮执行什么，例如“首次交谈”或“提醒去厨房”。只修改显示名称，不改变步骤编号、运行去向或游戏行为；留空表示尚未命名。',
                }}
              >
                <DsDraftTextInput
                  size="compact"
                  id={stageNameInputId}
                  aria-label="步骤名称"
                  placeholder="例如：走到房门并进房"
                  draftKey={`canonical-flow:${props.ownerLabel}:${stage.id}:label`}
                  syncToken={props.focusRevision}
                  value={stage.label ?? ''}
                  onCommit={(value) => {
                    const label = value.trim()
                    if (label === (stage.label ?? '')) return true
                    return props.onChange({
                      ...flow,
                      stages: flow.stages.map((candidate) => {
                        if (candidate.id !== stage.id) return candidate
                        const updated = { ...candidate }
                        if (label) updated.label = label
                        else delete updated.label
                        return updated
                      }),
                    })
                  }}
                />
              </DsField>
            </section>
            <section className="canonical-flow-setting">
              <header className="canonical-dialog-field-heading">
                <strong>起始步骤</strong>
                <DsHelpTip label="起始步骤">
                  每套脚本方案只能有一个起始步骤。切换到这套方案后，第一次运行会从这里开始。
                </DsHelpTip>
              </header>
              <div className="canonical-stage-initial-setting">
                <span>
                  {flow.initial === stage.id ? '当前步骤是起始步骤' : '当前步骤不是起始步骤'}
                </span>
                {flow.initial !== stage.id ? (
                  <DsButton
                    size="compact"
                    variant="secondary"
                    onClick={() => props.onChange({ ...flow, initial: stage.id })}
                  >
                    设为起始步骤
                  </DsButton>
                ) : null}
              </div>
            </section>
            <section className="canonical-flow-setting">
              <header className="canonical-dialog-field-heading">
                <label htmlFor={stageNextSelectId}>下次运行</label>
                <DsHelpTip label="下次运行">
                  当前步骤跑完后，可以重复、进入下一步骤，或完成本方案并不再执行。真正切换到另一方案再回来时，才会从起始步骤重新运行。
                </DsHelpTip>
              </header>
              <DsSelect
                size="compact"
                id={stageNextSelectId}
                value={
                  typeof stage.next === 'object'
                    ? 'complete'
                    : stage.next
                      ? stageChoice(stage.next)
                      : ''
                }
                options={[
                  { value: '', label: '仍执行当前步骤' },
                  { value: 'complete', label: '本方案完成，不再执行' },
                  ...flow.stages
                    .filter((candidate) => candidate.id !== stage.id)
                    .map((candidate) => ({
                      value: stageChoice(candidate.id),
                      label: `进入${stageLabel(candidate.id)}`,
                    })),
                ]}
                onValueChange={(nextStageId) => {
                  const stages = flow.stages.map((candidate) =>
                    candidate.id === stage.id
                      ? {
                          ...candidate,
                          next:
                            nextStageId === 'complete'
                              ? { kind: 'complete' as const }
                              : flow.stages.find((target) => stageChoice(target.id) === nextStageId)
                                  ?.id,
                        }
                      : candidate,
                  )
                  props.onChange({ ...flow, stages })
                }}
              />
            </section>
          </div>
        </CanonicalScriptDialog>
      ) : null}
      {stage && createOpen ? (
        <CanonicalScriptDialog
          title="新建执行步骤"
          className="canonical-stage-create-dialog"
          onClose={() => setCreateOpen(false)}
        >
          <div className="canonical-stage-create-form">
            <div className="canonical-modal-context">
              <span>所属方案：{props.ownerLabel ?? '当前脚本'}</span>
              <DsHelpTip label="新建步骤">
                新步骤拥有独立的出现前准备和脚本正文，只会加入当前脚本方案。
              </DsHelpTip>
            </div>
            <DsCheckbox
              size="compact"
              label={`创建后，将“${stageLabel(stage.id)}”的下次运行改为新步骤`}
              checked={linkNewStage}
              onChange={(event) => setLinkNewStage(event.target.checked)}
            />
            {linkNewStage && stage.next ? (
              <p className="canonical-stage-create-warning">
                当前去向“{stageNextLabel(stage)}”会改为新步骤。
              </p>
            ) : null}
            <div className="script-scheme-create-actions">
              <DsButton size="compact" variant="secondary" onClick={() => setCreateOpen(false)}>
                取消
              </DsButton>
              <DsButton size="compact" variant="primary" onClick={addStage}>
                创建步骤
              </DsButton>
            </div>
          </div>
        </CanonicalScriptDialog>
      ) : null}
      {stage && replacement && deleteOpen ? (
        <CanonicalScriptDialog
          title={`删除${stageLabel(stage.id)}？`}
          className="canonical-stage-delete-dialog"
          onClose={() => setDeleteOpen(false)}
        >
          <div className="canonical-stage-delete-confirm" role="alert">
            <p>
              将删除这个步骤的 {stage.body.length} 条正文指令
              {stage.entry?.prepare.length
                ? `和 ${stage.entry.prepare.length} 条画面出现前准备`
                : ''}
              。
            </p>
            <p>
              {flow.initial === stage.id ? `起始步骤将改为${stageLabel(replacement.id)}。` : ''}
              其他指向这个步骤的去向将改为{stageLabel(replacement.id)}。
            </p>
            <p>删除后仍可使用编辑器的撤销恢复。</p>
            <div className="script-scheme-create-actions">
              <DsButton size="compact" variant="secondary" onClick={() => setDeleteOpen(false)}>
                取消
              </DsButton>
              <DsButton size="compact" variant="danger" onClick={deleteStage}>
                确认删除步骤
              </DsButton>
            </div>
          </div>
        </CanonicalScriptDialog>
      ) : null}
    </section>
  )
}
