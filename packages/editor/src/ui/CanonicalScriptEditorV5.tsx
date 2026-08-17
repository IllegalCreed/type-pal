import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  AuthorCommandV5,
  AuthorConditionV5,
  BattleFieldDef,
  BattleSpriteDef,
  Command,
  EnemyTeamDef,
  EntityAddress,
  HostileBehaviorV5,
  Locale,
  SceneDef,
  ScriptCondition,
  ScriptFlowV5,
  ShopDef,
  SpriteDef,
  StateTransitionV5,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  type AuthorCommandChildKeyV5,
  type AuthorCommandPathV5,
  formatAuthorCommandPathV5,
  getAuthorCommandAtV5,
  insertAuthorCommandAfterV5,
  moveAuthorCommandAtV5,
  parseAuthorCommandPathV5,
  removeAuthorCommandAtV5,
  updateAuthorCommandAtV5,
} from '../core/author-command-edit-v5.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import type {
  CanonicalScriptReferenceV5,
  ScriptEditorStateV5,
  ScriptV5CommandLocatorV5,
} from '../core/script-v5-editor.js'
import { stateTransitionExecutionLabelV5 } from '../core/script-v5-editor.js'
import { BattleFieldPicker } from './BattleFieldPicker.js'
import { CommandForm, WorldVariablePicker } from './CommandForm.js'
import {
  DsButton,
  DsCheckbox,
  DsDialog,
  DsField,
  DsIconButton,
  DsNumberInput,
  DsSelect,
  DsTextArea,
  DsTextInput,
} from './design-system/index.js'
import { musicAssets } from './MusicPicker.js'
import { describeScriptCommand } from './ScriptTree.js'
import { soundAssets } from './SoundPicker.js'

function CanonicalFieldV5(props: {
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

export interface CanonicalScriptEditorContextV5 {
  state: ScriptEditorStateV5
  currentSceneId?: string
  shellScenes: SceneDef[]
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
}

export interface ScriptSchemeReferencePresentationV5 {
  key: string
  label: string
  reference: CanonicalScriptReferenceV5
}

export function nextGeneratedScriptSchemeIdV5(ids: readonly string[], prefix = 'scheme'): string {
  const occupied = new Set(ids)
  let index = 1
  let id = `${prefix}-${index}`
  while (occupied.has(id)) id = `${prefix}-${++index}`
  return id
}

export function CanonicalScriptDialogV5(props: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
  footer?: ReactNode
}) {
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
      <div className={`canonical-script-modal-body${props.className ? ` ${props.className}` : ''}`}>
        {props.children}
      </div>
    </DsDialog>
  )
}

export function CanonicalHelpTipV5(props: { label: string; children: ReactNode }) {
  const tooltipId = useId()
  const [dismissed, setDismissed] = useState(false)

  return (
    <span className={`canonical-help-tip${dismissed ? ' dismissed' : ''}`}>
      <DsButton
        size="compact"
        variant="quiet"
        aria-label={`${props.label}说明`}
        aria-describedby={tooltipId}
        onMouseEnter={() => setDismissed(false)}
        onMouseLeave={() => setDismissed(false)}
        onFocus={() => setDismissed(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          setDismissed(true)
        }}
      >
        ?
      </DsButton>
      <span id={tooltipId} role="tooltip">
        {props.children}
      </span>
    </span>
  )
}

export interface ScriptSchemeStripOptionV5 {
  id: string
  label: string
  flow: ScriptFlowV5
  isDefault?: boolean
}

export function ScriptSchemeStripV5(props: {
  title: string
  options: readonly ScriptSchemeStripOptionV5[]
  selectedId: string
  onSelect: (id: string) => void
  onDetails: (id: string) => void
  onCreate: () => void
}) {
  return (
    <section className="script-scheme-strip" aria-label={`${props.title}方案`}>
      <header>
        <div className="script-section-heading">
          <strong className="script-section-title">脚本方案</strong>
          <span className="script-section-count">{props.options.length} 个方案</span>
          <CanonicalHelpTipV5 label="脚本方案">
            同一脚本入口可以有多套方案。每套方案拥有独立的执行步骤和正文；剧情指令切换方案时，
            会整套切换。
          </CanonicalHelpTipV5>
        </div>
        <DsButton size="compact" variant="secondary" icon="add" onClick={props.onCreate}>
          新建方案
        </DsButton>
      </header>
      <nav aria-label="脚本方案列表">
        {props.options.map((option) => (
          <div
            key={option.id}
            className={`script-scheme-card${option.id === props.selectedId ? ' active' : ''}`}
          >
            <DsButton
              size="compact"
              variant={option.id === props.selectedId ? 'primary' : 'secondary'}
              className="script-scheme-card-select"
              aria-pressed={option.id === props.selectedId}
              onClick={() => props.onSelect(option.id)}
            >
              <strong>{option.label}</strong>
              <span>
                {option.flow.kind === 'stages'
                  ? `${option.flow.stages.length} 个步骤`
                  : '连续流程（高级）'}
              </span>
              {option.isDefault ? <small>默认方案</small> : null}
            </DsButton>
            <DsButton
              size="compact"
              variant="quiet"
              className="script-scheme-card-details"
              aria-label={`打开“${option.label}”的方案详情`}
              onClick={() => props.onDetails(option.id)}
            >
              方案详情
            </DsButton>
          </div>
        ))}
      </nav>
    </section>
  )
}

export function ScriptSchemeDetailsDialogV5(props: {
  selectedName: string
  references: readonly ScriptSchemeReferencePresentationV5[]
  onClose: () => void
  onSave: (name: string, isDefault: boolean | undefined) => boolean
  onDelete: () => void
  defaultControl?: {
    isDefault: boolean
    activeCopy: string
    inactiveCopy: string
  }
  onOpenReference?: (reference: CanonicalScriptReferenceV5) => void
}) {
  const [nameDraft, setNameDraft] = useState(props.selectedName)
  const [defaultDraft, setDefaultDraft] = useState(props.defaultControl?.isDefault ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameInputId = useId()

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
    <CanonicalScriptDialogV5
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
            <DsButton size="compact" variant="danger" onClick={props.onDelete}>
              确认删除方案
            </DsButton>
          </>
        ) : (
          <>
            <DsButton
              size="compact"
              variant="danger"
              className="script-scheme-delete"
              disabled={props.references.length > 0}
              title={
                props.references.length ? '这套方案仍在使用中，请先处理上方列出的引用。' : undefined
              }
              onClick={() => setConfirmDelete(true)}
            >
              删除方案…
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
            <CanonicalHelpTipV5 label="脚本方案">
              这是一套完整脚本。切换方案时，它拥有的执行步骤、出现前准备和正文会一起切换。
            </CanonicalHelpTipV5>
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
              <CanonicalHelpTipV5 label="默认方案">
                {defaultDraft ? props.defaultControl.activeCopy : props.defaultControl.inactiveCopy}
              </CanonicalHelpTipV5>
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
            <CanonicalHelpTipV5 label="使用位置">
              页面或脚本指令可能正在使用这套方案。先改掉这些位置，才能安全删除方案。
            </CanonicalHelpTipV5>
          </header>
          {props.references.length ? (
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
                        <small aria-hidden="true">打开 ↗</small>
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
    </CanonicalScriptDialogV5>
  )
}

export function ScriptSchemeCreateDialogV5(props: {
  title: string
  first: boolean
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [newName, setNewName] = useState('')
  const nameInputId = useId()

  return (
    <CanonicalScriptDialogV5
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
            <CanonicalHelpTipV5 label="新建脚本方案">
              {props.first
                ? '创建这个脚本入口的第一套方案。'
                : '新方案从空白内容开始，已有方案不会受到影响。'}
            </CanonicalHelpTipV5>
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
    </CanonicalScriptDialogV5>
  )
}

interface DescribedCommandV5 {
  icon: string
  label: string
  detail?: string
  children: Array<{
    key: AuthorCommandChildKeyV5
    label: string
    body: readonly AuthorCommandV5[]
  }>
}

export const AUTHOR_COMMAND_PRESENTATION_V5 = {
  addVar: ['🔢', '增减数值'],
  animEntity: ['🎞', '推进实体动画'],
  branch: ['🔀', '条件分支'],
  callScript: ['↪', '调用共享脚本'],
  cameraPan: ['🎥', '镜头平移'],
  cameraSnap: ['🎥', '镜头定位或回正'],
  chasePlayer: ['👣', '追逐玩家'],
  clearDialog: ['🧹', '清除对话框'],
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
  stopScript: ['⛔', '终止本次脚本'],
  takeEntity: ['🔒', '接管实体控制'],
  teleportOut: ['🌀', '使用传送出口'],
  teleportParty: ['📍', '队伍瞬移'],
  toggleDayNight: ['🌗', '切换昼夜'],
  unequip: ['🔓', '卸下装备'],
  unmountParty: ['🚶', '离开载具'],
  vanishEntity: ['⊘', '实体暂时消失'],
  wait: ['⏱', '等待'],
} as const satisfies Record<AuthorCommandV5['kind'], readonly [icon: string, label: string]>

function addressLabel(address: EntityAddress): string {
  return `${address.scene}/${address.entity}`
}

function conditionLabel(condition: AuthorConditionV5): string {
  switch (condition.kind) {
    case 'flag':
      return `${condition.flag} ${condition.is ? '为真' : '为假'}`
    case 'var':
      return `${condition.var} ${condition.op} ${condition.value}`
    case 'currentScene':
      return `当前场景是 ${condition.scene}`
    case 'entityState':
      return `${addressLabel(condition.target)} 状态 = ${condition.is}`
    case 'entityInScene':
      return `${addressLabel(condition.target)} 在场`
    case 'facingEntity':
      return `面向 ${addressLabel(condition.target)}`
    case 'chance':
      return `${condition.percent}% 概率`
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      return `${condition.kind} ${condition.itemId}`
    case 'allFullHp':
      return '全队满血'
    case 'hasMoney':
      return `金钱 ≥ ${condition.atLeast}`
    case 'inParty':
      return `队伍包含 ${condition.actorId}`
    case 'all':
      return condition.of.map(conditionLabel).join(' 且 ')
    case 'any':
      return condition.of.map(conditionLabel).join(' 或 ')
    case 'not':
      return `非（${conditionLabel(condition.cond)}）`
  }
}

function commandChildren(command: AuthorCommandV5): DescribedCommandV5['children'] {
  switch (command.kind) {
    case 'branch':
      return [
        { key: 'then', label: '满足条件', body: command.then },
        { key: 'else', label: '不满足条件', body: command.else ?? [] },
      ]
    case 'loop':
      return [{ key: 'body', label: '循环正文', body: command.body }]
    case 'confirm':
      return [{ key: 'onNo', label: '选择“否”', body: command.onNo }]
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

function legacyConditionV5(condition: AuthorConditionV5): ScriptCondition {
  switch (condition.kind) {
    case 'entityState':
    case 'entityInScene':
    case 'facingEntity': {
      const { target, ...rest } = condition
      return { ...rest, entity: target.entity } as ScriptCondition
    }
    case 'all':
    case 'any':
      return { ...condition, of: condition.of.map(legacyConditionV5) }
    case 'not':
      return { ...condition, cond: legacyConditionV5(condition.cond) }
    default:
      return structuredClone(condition)
  }
}

function legacyPresentationCommandV5(command: AuthorCommandV5): Command | undefined {
  switch (command.kind) {
    case 'vanishEntity':
      return {
        kind: 'vanishEntity',
        ...(command.target ? { entity: command.target.entity } : {}),
        ...(command.seconds === undefined ? {} : { seconds: command.seconds }),
      }
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
      return { kind: command.kind, onNo: [] }
    case 'branch':
      return {
        kind: command.kind,
        cond: legacyConditionV5(command.cond),
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
    case 'selectEntityBehavior':
    case 'selectEntityPage':
    case 'selectSceneHooks':
      return undefined
    default:
      return command as Command
  }
}

function describeCommand(
  command: AuthorCommandV5,
  context?: CanonicalScriptEditorContextV5,
): DescribedCommandV5 {
  const children = commandChildren(command)
  switch (command.kind) {
    case 'loop':
      return {
        icon: '🔁',
        label: `${command.mode === 'while' ? '当' : '直到'} ${conditionLabel(command.cond)}`,
        detail: `每轮让步 · 最多 ${command.maxIterations} 次`,
        children,
      }
    case 'selectEntityBehavior':
      return {
        icon: '🔗',
        label: `${addressLabel(command.target)} 切换${command.channel === 'trigger' ? '交互脚本' : '自动行为'}`,
        detail: `${
          command.selection.kind === 'use'
            ? command.selection.value
            : command.selection.kind === 'disabled'
              ? '显式禁用'
              : '继承'
        }${
          command.cursorHandoff
            ? ` · 接续 ${command.cursorHandoff.fromBehavior} 的运行进度（${command.cursorHandoff.cases.length} 项）`
            : ''
        }`,
        children,
      }
    case 'selectEntityPage':
      return {
        icon: '📄',
        label: `${addressLabel(command.target)} 切换实体页面`,
        detail: command.selection.kind === 'use' ? command.selection.value : '继承',
        children,
      }
    case 'setEntityTriggerActivation':
      return {
        icon: '🖱',
        label: `${addressLabel(command.target)} 设置触发方式`,
        detail:
          command.selection.kind === 'use'
            ? `${command.selection.value.on}${command.selection.value.range ?? ''}`
            : command.selection.kind === 'disabled'
              ? '禁用'
              : '继承',
        children,
      }
    case 'selectSceneHooks':
      return { icon: '📜', label: `${command.scene} 切换场景脚本`, children }
  }
  const legacy = legacyPresentationCommandV5(command)
  if (legacy && (context || command.kind !== 'dialog')) {
    const description = describeScriptCommand(
      legacy,
      context?.locale ?? {},
      context?.shellScenes,
      context?.references ?? {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
      context?.actors,
    )
    return {
      icon: description.icon,
      label: description.label,
      detail: description.detail,
      children,
    }
  }
  if (command.kind === 'dialog')
    return {
      icon: '💬',
      label: command.cue.rows.map((row) => row.text).join(' / ') || '空对话',
      detail: command.cue.speaker,
      children,
    }
  const [icon, label] = AUTHOR_COMMAND_PRESENTATION_V5[command.kind]
  return { icon, label, children }
}

function commandPathAfterInsert(path: AuthorCommandPathV5): string {
  const last = path.at(-1)
  if (typeof last !== 'number') return formatAuthorCommandPathV5(path)
  return formatAuthorCommandPathV5([...path.slice(0, -1), last + 1])
}

function CommandRowsV5(props: {
  body: readonly AuthorCommandV5[]
  parentPath: AuthorCommandPathV5
  context?: CanonicalScriptEditorContextV5
  selectedPath?: string
  referenceFocusPath?: string
  referenceFocusRevision?: number
  onSelect: (path: string) => void
  onEdit: (path: string) => void
  onInsert: (path: string) => void
  onMove: (path: string, direction: -1 | 1) => void
  onRemove: (path: string) => void
}) {
  if (!props.body.length)
    return (
      <DsButton
        size="compact"
        variant="secondary"
        icon="add"
        className="canonical-script-empty-add"
        onClick={() => props.onInsert(formatAuthorCommandPathV5([...props.parentPath, -1]))}
      >
        ＋ 添加第一条指令
      </DsButton>
    )
  return (
    <div className="canonical-command-list" role="tree">
      {props.body.map((command, index) => {
        const path = formatAuthorCommandPathV5([...props.parentPath, index])
        const description = describeCommand(command, props.context)
        const referenceFocusClass =
          props.referenceFocusPath === path && props.referenceFocusRevision !== undefined
            ? ` reference-focus-${Math.abs(props.referenceFocusRevision) % 2 === 0 ? 'even' : 'odd'}`
            : ''
        return (
          <div className="canonical-command-node" key={path}>
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
              {description.detail ? <span className="cmd-detail">{description.detail}</span> : null}
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
                  label="上移"
                  icon="chevron-up"
                  size="compact"
                  disabled={index === 0}
                  onClick={() => props.onMove(path, -1)}
                />
                <DsIconButton
                  label="下移"
                  icon="chevron-down"
                  size="compact"
                  disabled={index === props.body.length - 1}
                  onClick={() => props.onMove(path, 1)}
                />
                <DsIconButton
                  label="删除"
                  icon="delete"
                  size="compact"
                  variant="danger"
                  onClick={() => props.onRemove(path)}
                />
              </span>
            </div>
            {description.children.map((child) => (
              <section className="canonical-command-child" key={child.key}>
                <header>
                  <span>{child.label}</span>
                  <small>{child.body.length} 条</small>
                </header>
                <CommandRowsV5
                  body={child.body}
                  parentPath={[...props.parentPath, index, child.key]}
                  context={props.context}
                  selectedPath={props.selectedPath}
                  referenceFocusPath={props.referenceFocusPath}
                  referenceFocusRevision={props.referenceFocusRevision}
                  onSelect={props.onSelect}
                  onEdit={props.onEdit}
                  onInsert={props.onInsert}
                  onMove={props.onMove}
                  onRemove={props.onRemove}
                />
              </section>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function defaultCondition(
  kind: AuthorConditionV5['kind'],
  target?: EntityAddress,
): AuthorConditionV5 {
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

function EntityAddressEditorV5(props: {
  value: EntityAddress
  state?: ScriptEditorStateV5
  onChange: (value: EntityAddress) => void
}) {
  const scenes = props.state?.scenes ?? []
  const scene = scenes.find((candidate) => candidate.id === props.value.scene)
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
              ...(!scene
                ? [{ value: props.value.scene, label: `${props.value.scene}（引用失效）` }]
                : []),
              ...scenes.map((candidate) => ({ value: candidate.id, label: candidate.id })),
            ]}
            onValueChange={(sceneId) => {
              const nextScene = scenes.find((candidate) => candidate.id === sceneId)
              props.onChange({
                scene: sceneId,
                entity: nextScene?.entities[0]?.id ?? props.value.entity,
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
        {scene?.entities.length ? (
          <DsSelect
            size="compact"
            aria-label="实体"
            value={props.value.entity}
            options={[
              ...(!scene.entities.some((candidate) => candidate.id === props.value.entity)
                ? [{ value: props.value.entity, label: `${props.value.entity}（引用失效）` }]
                : []),
              ...scene.entities.map((candidate) => ({
                value: candidate.id,
                label: candidate.id,
              })),
            ]}
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
    </div>
  )
}

function ConditionEditorV5(props: {
  value: AuthorConditionV5
  state?: ScriptEditorStateV5
  references?: ScriptReferenceCatalog
  worldVariables?: WorldVariableRegistryV1
  onOpenWorldVariable?: (id: string) => void
  onChange: (condition: AuthorConditionV5) => void
}) {
  const sceneFieldId = useId()
  const patch = (value: Record<string, unknown>): void =>
    props.onChange({ ...props.value, ...value } as AuthorConditionV5)
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
      <CanonicalFieldV5 label="条件">
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
            ['facingEntity', '面向实体'],
            ['allFullHp', '全队满血'],
            ['hasMoney', '金钱'],
            ['inParty', '队伍成员'],
            ['all', '全部满足'],
            ['any', '任一满足'],
            ['not', '取反'],
          ].map(([value, label]) => ({ value: value!, label: label! }))}
          onValueChange={(kind) =>
            props.onChange(
              defaultCondition(kind as AuthorConditionV5['kind'], target ?? firstTarget),
            )
          }
        />
      </CanonicalFieldV5>
      {props.value.kind === 'flag' ? (
        <>
          <CanonicalFieldV5 label="开关 id">
            <WorldVariablePicker
              value={props.value.flag}
              kind="flag"
              variables={props.worldVariables}
              onChange={(flag) => patch({ flag })}
              onOpen={props.onOpenWorldVariable}
            />
          </CanonicalFieldV5>
          <CanonicalFieldV5 label="期望">
            <DsSelect
              size="compact"
              value={props.value.is ? 'true' : 'false'}
              options={[
                { value: 'true', label: '为真' },
                { value: 'false', label: '为假' },
              ]}
              onValueChange={(value) => patch({ is: value === 'true' })}
            />
          </CanonicalFieldV5>
        </>
      ) : null}
      {props.value.kind === 'var' ? (
        <>
          <CanonicalFieldV5 label="数值 id">
            <WorldVariablePicker
              value={props.value.var}
              kind="number"
              variables={props.worldVariables}
              onChange={(variable) => patch({ var: variable })}
              onOpen={props.onOpenWorldVariable}
            />
          </CanonicalFieldV5>
          <CanonicalFieldV5 label="比较">
            <DsSelect
              size="compact"
              value={props.value.op}
              options={['==', '!=', '>=', '<=', '>', '<'].map((op) => ({
                value: op,
                label: op,
              }))}
              onValueChange={(op) =>
                patch({
                  op: op as Extract<AuthorConditionV5, { kind: 'var' }>['op'],
                })
              }
            />
          </CanonicalFieldV5>
          <CanonicalFieldV5 label="值">
            <DsNumberInput
              size="compact"
              value={props.value.value}
              onChange={(event) => patch({ value: Number(event.target.value) })}
            />
          </CanonicalFieldV5>
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
                ...props.state.scenes.map((scene) => ({ value: scene.id, label: scene.id })),
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
        <CanonicalFieldV5 label="概率 %">
          <DsNumberInput
            size="compact"
            min={0}
            max={100}
            value={props.value.percent}
            onChange={(event) =>
              patch({ percent: Math.max(0, Math.min(100, Number(event.target.value))) })
            }
          />
        </CanonicalFieldV5>
      ) : null}
      {props.value.kind === 'hasItem' ||
      props.value.kind === 'ownsItem' ||
      props.value.kind === 'itemEquipped' ? (
        <>
          <CanonicalFieldV5 label="物品">
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
          </CanonicalFieldV5>
          <CanonicalFieldV5 label="至少">
            <DsNumberInput
              size="compact"
              min={1}
              value={props.value.atLeast ?? 1}
              onChange={(event) => patch({ atLeast: Math.max(1, Number(event.target.value) || 1) })}
            />
          </CanonicalFieldV5>
        </>
      ) : null}
      {target ? (
        <EntityAddressEditorV5
          value={target}
          state={props.state}
          onChange={(next) => patch({ target: next })}
        />
      ) : null}
      {props.value.kind === 'entityState' ? (
        <CanonicalFieldV5 label="状态">
          <DsNumberInput
            size="compact"
            value={props.value.is}
            onChange={(event) => patch({ is: Number(event.target.value) })}
          />
        </CanonicalFieldV5>
      ) : null}
      {props.value.kind === 'facingEntity' ? (
        <CanonicalFieldV5 label="距离">
          <DsNumberInput
            size="compact"
            min={0}
            value={props.value.range ?? 1}
            onChange={(event) => patch({ range: Math.max(0, Number(event.target.value)) })}
          />
        </CanonicalFieldV5>
      ) : null}
      {props.value.kind === 'all' || props.value.kind === 'any' ? (
        <div className="canonical-condition-nested">
          {props.value.of.map((condition, index) => (
            <ConditionEditorV5
              key={index}
              value={condition}
              state={props.state}
              references={props.references}
              worldVariables={props.worldVariables}
              onOpenWorldVariable={props.onOpenWorldVariable}
              onChange={(next) => {
                const compound = props.value as Extract<AuthorConditionV5, { kind: 'all' | 'any' }>
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
              const compound = props.value as Extract<AuthorConditionV5, { kind: 'all' | 'any' }>
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
        <ConditionEditorV5
          value={props.value.cond}
          state={props.state}
          references={props.references}
          worldVariables={props.worldVariables}
          onOpenWorldVariable={props.onOpenWorldVariable}
          onChange={(cond) =>
            props.onChange({
              ...(props.value as Extract<AuthorConditionV5, { kind: 'not' }>),
              cond,
            })
          }
        />
      ) : null}
    </div>
  )
}

const CUSTOM_COMMANDS = new Set<AuthorCommandV5['kind']>([
  'cameraSnap',
  'chasePlayer',
  'endBattle',
  'fleeBattle',
  'gameOver',
  'halveMoney',
  'increaseHpMp',
  'loadLastSave',
  'playFrameAnimation',
  'playVideo',
  'quitToTitle',
  'revivePartyAll',
  'setFollowers',
  'setSceneMapOverride',
  'setScreenWave',
  'shakeScreen',
  'stopMusic',
  'stopScript',
  'toggleDayNight',
  'unequip',
  'unmountParty',
  'vanishEntity',
  'setEntityState',
  'setMultiEntityState',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityLayer',
  'setEntityFacing',
  'setEntityFrame',
  'playEntityAction',
  'stopEntityAction',
  'moveEntity',
  'stepEntity',
  'animEntity',
  'nudgeEntity',
  'takeEntity',
  'releaseEntity',
  'mountParty',
  'ride',
  'startBattle',
  'teleportOut',
  'confirm',
  'branch',
  'loop',
  'selectEntityBehavior',
  'selectEntityPage',
  'setEntityTriggerActivation',
  'selectSceneHooks',
  'callScript',
])

const PRIMITIVE_FIELD_LABELS: Readonly<Record<string, string>> = {
  var: '数值名称',
  delta: '增减量',
  range: '生效距离',
  floating: '追击时忽略地形与阻挡实体',
  asset: '资源',
  startFrame: '起始帧',
  endFrame: '结束帧',
  frameRate: '每秒帧数',
  tenths: '恢复生命（十分之几）',
  mapId: '地图',
  level: '强度',
  progression: '变化速度',
  frames: '持续帧数',
  ms: '持续时间（毫秒）',
  role: '角色序号',
  state: '状态（≤0 隐藏，1 显示，≥2 显示并挡路）',
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
  command: AuthorCommandV5,
  key: string,
  value: string | number | boolean | undefined,
  onChange: (command: AuthorCommandV5) => void,
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
        onChange={(event) =>
          onChange({ ...command, [key]: event.target.checked } as AuthorCommandV5)
        }
      />
    )
  if (key === 'facing' || key === 'dir')
    return (
      <CanonicalFieldV5 key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'down', label: '向下' },
            { value: 'left', label: '向左' },
            { value: 'up', label: '向上' },
            { value: 'right', label: '向右' },
          ]}
          onValueChange={(nextValue) =>
            onChange({ ...command, [key]: nextValue } as AuthorCommandV5)
          }
        />
      </CanonicalFieldV5>
    )
  if (key === 'speed')
    return (
      <CanonicalFieldV5 key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'slow', label: '慢速' },
            { value: 'normal', label: '正常' },
            { value: 'fast', label: '快速' },
            { value: 'run', label: '奔跑' },
          ]}
          onValueChange={(nextValue) =>
            onChange({ ...command, [key]: nextValue } as AuthorCommandV5)
          }
        />
      </CanonicalFieldV5>
    )
  if (key === 'channel')
    return (
      <CanonicalFieldV5 key={key} label={label}>
        <DsSelect
          size="compact"
          value={String(value)}
          options={[
            { value: 'trigger', label: '交互脚本' },
            { value: 'auto', label: '自动行为' },
          ]}
          onValueChange={(channel) =>
            onChange(
              stripCursorHandoffV5({
                ...command,
                [key]: channel,
              } as AuthorCommandV5),
            )
          }
        />
      </CanonicalFieldV5>
    )
  return (
    <CanonicalFieldV5 key={key} label={label}>
      {typeof value === 'number' ? (
        <DsNumberInput
          size="compact"
          value={value}
          onChange={(event) =>
            onChange({ ...command, [key]: Number(event.target.value) } as AuthorCommandV5)
          }
        />
      ) : (
        <DsTextInput
          size="compact"
          value={value}
          onChange={(event) =>
            onChange({ ...command, [key]: event.target.value } as AuthorCommandV5)
          }
        />
      )}
    </CanonicalFieldV5>
  )
}

function stripCursorHandoffV5(command: AuthorCommandV5): AuthorCommandV5 {
  if (command.kind !== 'selectEntityBehavior' || command.cursorHandoff === undefined) return command
  const { cursorHandoff: _cursorHandoff, ...next } = command
  return next
}

function CanonicalCommandFormV5(props: {
  command: AuthorCommandV5
  context?: CanonicalScriptEditorContextV5
  onChange: (command: AuthorCommandV5) => void
}) {
  const command = props.command
  const context = props.context
  if (!CUSTOM_COMMANDS.has(command.kind) && context) {
    const scene =
      context.shellScenes.find((candidate) => candidate.id === context.currentSceneId) ??
      context.shellScenes[0]
    if (scene)
      return (
        <CommandForm
          cmd={command as Command}
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
          onChange={(next) => props.onChange(next as AuthorCommandV5)}
        />
      )
  }

  if (command.kind === 'branch' || command.kind === 'loop')
    return (
      <div className="canonical-command-form-fields">
        {command.kind === 'loop' ? (
          <>
            <CanonicalFieldV5 label="循环方式">
              <DsSelect
                size="compact"
                value={command.mode}
                options={[
                  { value: 'while', label: '条件成立时' },
                  { value: 'until', label: '直到条件成立' },
                ]}
                onValueChange={(mode) =>
                  props.onChange({
                    ...command,
                    mode: mode as 'while' | 'until',
                  })
                }
              />
            </CanonicalFieldV5>
            <CanonicalFieldV5 label="最大次数">
              <DsNumberInput
                size="compact"
                min={1}
                value={command.maxIterations}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    maxIterations: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </CanonicalFieldV5>
          </>
        ) : null}
        <ConditionEditorV5
          value={command.cond}
          state={context?.state}
          references={context?.references}
          worldVariables={context?.worldVariables}
          onOpenWorldVariable={context?.onOpenWorldVariable}
          onChange={(cond) => props.onChange({ ...command, cond })}
        />
        <p className="hint">分支和循环正文在左侧树中直接增删、排序和编辑。</p>
      </div>
    )

  if (command.kind === 'callScript') {
    const scripts = Object.entries(context?.state.sharedScripts ?? {})
    return (
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="共享脚本">
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
        </CanonicalFieldV5>
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
            <EntityAddressEditorV5
              value={command.self}
              state={context?.state}
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
        <CanonicalFieldV5 label="镜头位置">
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
        </CanonicalFieldV5>
        {command.to ? (
          <div className="canonical-grid-editor">
            <CanonicalFieldV5 label="横向格坐标">
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
            </CanonicalFieldV5>
            <CanonicalFieldV5 label="纵向格坐标">
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
            </CanonicalFieldV5>
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
        <CanonicalFieldV5 label={command.kind === 'playVideo' ? '视频' : '帧动画'}>
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
        </CanonicalFieldV5>
        {command.kind === 'playFrameAnimation' ? (
          <div className="canonical-grid-editor">
            {(['startFrame', 'endFrame', 'frameRate'] as const).map((key) => (
              <CanonicalFieldV5 key={key} label={PRIMITIVE_FIELD_LABELS[key]!}>
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
              </CanonicalFieldV5>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (command.kind === 'chasePlayer')
    return (
      <div className="canonical-command-form-fields">
        <div className="canonical-grid-editor">
          <CanonicalFieldV5 label="开始追逐的格数">
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
          </CanonicalFieldV5>
          <CanonicalFieldV5 label="移动速度">
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
          </CanonicalFieldV5>
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
      <CanonicalFieldV5 label="结束结果" className="canonical-command-form-fields">
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
      </CanonicalFieldV5>
    )

  if (command.kind === 'increaseHpMp')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="恢复量（负数表示扣除）">
          <DsNumberInput
            size="compact"
            value={command.delta}
            onChange={(event) => props.onChange({ ...command, delta: Number(event.target.value) })}
          />
        </CanonicalFieldV5>
        <CanonicalFieldV5 label="作用资源">
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
        </CanonicalFieldV5>
      </div>
    )

  if (command.kind === 'unequip')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="角色序号">
          <DsNumberInput
            size="compact"
            min={0}
            value={command.role}
            onChange={(event) => props.onChange({ ...command, role: Number(event.target.value) })}
          />
        </CanonicalFieldV5>
        <CanonicalFieldV5 label="装备位置">
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
        </CanonicalFieldV5>
      </div>
    )

  if (command.kind === 'setFollowers' || command.kind === 'quitToTitle') {
    const values = command.kind === 'setFollowers' ? command.sprites : (command.videos ?? [])
    return (
      <CanonicalFieldV5
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
      </CanonicalFieldV5>
    )
  }

  if (command.kind === 'setSceneMapOverride')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="场景">
          <DsSelect
            size="compact"
            value={command.scene ?? ''}
            options={[
              { value: '', label: '当前场景' },
              ...(context?.state.scenes.map((scene) => ({ value: scene.id, label: scene.id })) ??
                []),
            ]}
            onValueChange={(scene) => props.onChange({ ...command, scene: scene || undefined })}
          />
        </CanonicalFieldV5>
        <CanonicalFieldV5 label="地图 id">
          <DsTextInput
            size="compact"
            value={command.mapId}
            onChange={(event) => props.onChange({ ...command, mapId: event.target.value })}
          />
        </CanonicalFieldV5>
      </div>
    )

  if (
    command.kind === 'fleeBattle' ||
    command.kind === 'gameOver' ||
    command.kind === 'halveMoney' ||
    command.kind === 'loadLastSave' ||
    command.kind === 'stopMusic' ||
    command.kind === 'stopScript' ||
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
    command.kind === 'vanishEntity' ||
    command.kind === 'selectEntityBehavior' ||
    command.kind === 'selectEntityPage' ||
    command.kind === 'setEntityTriggerActivation'
  ) {
    const target = command.target
    const ignored = new Set(['kind', 'target', 'selection', 'to', 'pos'])
    const triggerActivation =
      command.kind === 'setEntityTriggerActivation' && command.selection.kind === 'use'
        ? command.selection.value
        : undefined
    return (
      <div className="canonical-command-form-fields">
        {target ? (
          <EntityAddressEditorV5
            value={target}
            state={context?.state}
            onChange={(next) =>
              props.onChange(stripCursorHandoffV5({ ...command, target: next } as AuthorCommandV5))
            }
          />
        ) : (
          <div className="hint">未指定目标：使用当前 self。</div>
        )}
        {'to' in command && command.to ? (
          <div className="canonical-grid-editor">
            <CanonicalFieldV5 label="横向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, col: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </CanonicalFieldV5>
            <CanonicalFieldV5 label="纵向格坐标">
              <DsNumberInput
                size="compact"
                value={command.to.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, row: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </CanonicalFieldV5>
          </div>
        ) : null}
        {'pos' in command && command.pos ? (
          <div className="canonical-grid-editor">
            <CanonicalFieldV5 label="横向格坐标">
              <DsNumberInput
                size="compact"
                value={command.pos.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, col: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </CanonicalFieldV5>
            <CanonicalFieldV5 label="纵向格坐标">
              <DsNumberInput
                size="compact"
                value={command.pos.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, row: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </CanonicalFieldV5>
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
          <CanonicalFieldV5 label="选择">
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
                props.onChange(
                  stripCursorHandoffV5({
                    ...command,
                    selection: value.startsWith('use:')
                      ? { kind: 'use', value: value.slice(4) }
                      : { kind: value as 'inherit' | 'disabled' },
                  }),
                )
              }}
            />
          </CanonicalFieldV5>
        ) : null}
        {command.kind === 'selectEntityBehavior' && command.cursorHandoff ? (
          <p className="hint">
            这条指令会接续“{command.cursorHandoff.fromBehavior}”的运行进度，共{' '}
            {command.cursorHandoff.cases.length} 项映射。修改目标、脚本类型或选择后会移除此映射。
          </p>
        ) : null}
        {command.kind === 'selectEntityPage' ? (
          <CanonicalFieldV5 label="页面选择">
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
          </CanonicalFieldV5>
        ) : null}
        {command.kind === 'setEntityTriggerActivation' ? (
          <>
            <CanonicalFieldV5 label="触发方式来源">
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
            </CanonicalFieldV5>
            {triggerActivation ? (
              <div className="canonical-grid-editor">
                <CanonicalFieldV5 label="方式">
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
                </CanonicalFieldV5>
                <CanonicalFieldV5 label="距离">
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
                </CanonicalFieldV5>
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
        <CanonicalFieldV5 label="状态">
          <DsNumberInput
            size="compact"
            value={command.state}
            onChange={(event) => props.onChange({ ...command, state: Number(event.target.value) })}
          />
        </CanonicalFieldV5>
        {command.targets.map((target, index) => (
          <EntityAddressEditorV5
            key={`${target.scene}/${target.entity}/${index}`}
            value={target}
            state={context?.state}
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
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="高级：结果识别名">
          <DsTextInput
            size="compact"
            value={command.id ?? ''}
            onChange={(event) =>
              props.onChange({ ...command, id: event.target.value.trim() || undefined })
            }
          />
        </CanonicalFieldV5>
        <p className="hint">
          “否”分支在左侧树中编辑；识别名只在连续剧情需要根据回答切换状态时使用。
        </p>
      </div>
    )

  if (command.kind === 'startBattle')
    return (
      <div className="canonical-command-form-fields">
        <CanonicalFieldV5 label="敌队">
          <DsSelect
            value={command.enemyTeamId}
            options={(props.context?.enemyTeams ?? []).map((team) => ({
              value: team.id,
              label: team.id,
            }))}
            invalid={!props.context?.enemyTeams?.some((team) => team.id === command.enemyTeamId)}
            onValueChange={(enemyTeamId) => props.onChange({ ...command, enemyTeamId })}
          />
        </CanonicalFieldV5>
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
        <CanonicalFieldV5 label="场景">
          <DsSelect
            size="compact"
            value={command.scene}
            options={
              context?.state.scenes.map((candidate) => ({
                value: candidate.id,
                label: candidate.id,
              })) ?? []
            }
            onValueChange={(scene) => props.onChange({ ...command, scene })}
          />
        </CanonicalFieldV5>
        {(['onEnter', 'onTeleport'] as const).map((slot) => {
          const selection = command.selection[slot]
          const variants = scene?.hooks?.[slot]?.variants ?? {}
          const value =
            selection?.kind === 'use' ? `use:${selection.value}` : (selection?.kind ?? '__omit')
          return (
            <CanonicalFieldV5 key={slot} label={slot === 'onEnter' ? '进入场景' : '传送出口'}>
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
            </CanonicalFieldV5>
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
      <CanonicalFieldV5 label="对话正文（每行一行）" className="canonical-dialog-fallback">
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
      </CanonicalFieldV5>
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

interface InsertionChoiceV5 {
  label: string
  commands: AuthorCommandV5[]
  kind?: AuthorCommandV5['kind']
  unavailableReason?: string
}

interface InsertionGroupV5 {
  title: string
  choices: InsertionChoiceV5[]
}

function visitCommandExamplesV5(
  commands: readonly AuthorCommandV5[],
  examples: Map<AuthorCommandV5['kind'], AuthorCommandV5>,
): void {
  for (const command of commands) {
    if (!examples.has(command.kind)) examples.set(command.kind, structuredClone(command))
    for (const child of commandChildren(command)) visitCommandExamplesV5(child.body, examples)
  }
}

function projectCommandExamplesV5(state: ScriptEditorStateV5): AuthorCommandV5[] {
  const examples = new Map<AuthorCommandV5['kind'], AuthorCommandV5>()
  for (const scene of state.scenes) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const behavior of Object.values(entity.behaviors?.[channel] ?? {})) {
          if (behavior.flow.kind === 'stages')
            for (const stage of behavior.flow.stages) {
              visitCommandExamplesV5(stage.entry?.prepare ?? [], examples)
              visitCommandExamplesV5(stage.body, examples)
            }
          else
            for (const item of Object.values(behavior.flow.machine.states)) {
              visitCommandExamplesV5(item.entry?.prepare ?? [], examples)
              visitCommandExamplesV5(item.body, examples)
            }
        }
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const hook of Object.values(scene.hooks?.[slot]?.variants ?? {})) {
        if (hook.flow.kind === 'stages')
          for (const stage of hook.flow.stages) {
            visitCommandExamplesV5(stage.entry?.prepare ?? [], examples)
            visitCommandExamplesV5(stage.body, examples)
          }
        else
          for (const item of Object.values(hook.flow.machine.states)) {
            visitCommandExamplesV5(item.entry?.prepare ?? [], examples)
            visitCommandExamplesV5(item.body, examples)
          }
      }
  }
  for (const script of Object.values(state.sharedScripts))
    visitCommandExamplesV5(script.body, examples)
  for (const item of state.items)
    for (const effect of item.use?.effects ?? [])
      if (effect.kind === 'itemPrivateScript') visitCommandExamplesV5(effect.script.body, examples)
  return [...examples.values()]
}

function cleanInsertionExampleV5(
  command: AuthorCommandV5,
  target: EntityAddress | undefined,
  sceneId: string | undefined,
): AuthorCommandV5 {
  let next = structuredClone(command)
  switch (next.kind) {
    case 'branch':
      next = { ...next, then: [], else: [] }
      break
    case 'loop':
      next = { ...next, body: [] }
      break
    case 'confirm':
      next = { ...next, onNo: [] }
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
    case 'selectEntityBehavior': {
      const { cursorHandoff: _cursorHandoff, ...withoutHandoff } = next
      next = withoutHandoff
      break
    }
    case 'loadScene':
      if (sceneId) next = { ...next, scene: sceneId }
      break
  }
  if (target && 'target' in next && next.target) next = { ...next, target } as AuthorCommandV5
  return next
}

function fallbackInsertionChoiceV5(
  kind: AuthorCommandV5['kind'],
  context: CanonicalScriptEditorContextV5 | undefined,
  target: EntityAddress | undefined,
): InsertionChoiceV5 {
  const [icon, label] = AUTHOR_COMMAND_PRESENTATION_V5[kind]
  const unavailable = (reason: string): InsertionChoiceV5 => ({
    kind,
    label: `${icon} ${label}`,
    commands: [],
    unavailableReason: reason,
  })
  const enabled = (command: AuthorCommandV5): InsertionChoiceV5 => ({
    kind,
    label: `${icon} ${label}`,
    commands: [command],
  })

  switch (kind) {
    case 'callScript': {
      const script = Object.keys(context?.state.sharedScripts ?? {})[0]
      return script
        ? enabled({ kind, script })
        : unavailable('请先在“剧情 → 脚本库”创建一个可复用脚本')
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
    default:
      return unavailable('当前工程没有这种指令的可复用样例')
  }
}

function insertionGroups(context?: CanonicalScriptEditorContextV5): InsertionGroupV5[] {
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
  const pos = entity?.pos ?? currentScene?.entry.pos ?? { col: 0, row: 0, height: 0 }
  const groups: InsertionGroupV5[] = [
    {
      title: '常用指令',
      choices: [
        {
          label: '💬 对话',
          commands: [{ kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } }],
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
                ] as AuthorCommandV5[],
              },
              {
                label: '👁 实体显隐',
                commands: [{ kind: 'setEntityState', target, state: 1 }] as AuthorCommandV5[],
              },
              {
                label: '🧭 实体转向',
                commands: [
                  { kind: 'setEntityFacing', target, facing: 'down' },
                ] as AuthorCommandV5[],
              },
            ]
          : []),
        { label: '🌓 淡入/淡出', commands: [{ kind: 'fade', dir: 'out', ms: 300 }] },
        ...(music
          ? [
              {
                label: '🎵 播放音乐',
                commands: [{ kind: 'playMusic', asset: music }],
              } as InsertionChoiceV5,
            ]
          : []),
        ...(sound
          ? [
              {
                label: '🔊 播放音效',
                commands: [{ kind: 'playSound', asset: sound }],
              } as InsertionChoiceV5,
            ]
          : []),
        { label: '⏹ 停止音乐', commands: [{ kind: 'stopMusic' }] },
        ...(currentScene
          ? [
              {
                label: '🚪 切换场景',
                commands: [{ kind: 'loadScene', scene: currentScene.id }],
              } as InsertionChoiceV5,
            ]
          : []),
        {
          label: '⚔ 开始战斗',
          commands: [{ kind: 'startBattle', enemyTeamId: 'team-0' }],
        },
      ],
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
              yield: 'worldTick',
              maxIterations: 100,
            },
          ],
        },
        { label: '❓ 是/否询问', commands: [{ kind: 'confirm', onNo: [] }] },
        ...(item
          ? [
              {
                label: '🎁 获得物品',
                commands: [{ kind: 'giveItem', itemId: item }],
              } as InsertionChoiceV5,
              {
                label: '📤 失去物品',
                commands: [{ kind: 'loseItem', itemId: item }],
              } as InsertionChoiceV5,
            ]
          : []),
        { label: '💰 增减金钱', commands: [{ kind: 'giveMoney', delta: 100 }] },
        ...(shared
          ? [
              {
                label: '↪ 调用共享脚本',
                commands: [{ kind: 'callScript', script: shared }],
              } as InsertionChoiceV5,
            ]
          : []),
      ],
    },
    {
      title: '常用事件模板（插入后仍是普通指令，可逐条修改）',
      choices: [
        ...(target && item
          ? [
              {
                label: '📦 宝箱：开盖并给物品',
                commands: [
                  { kind: 'setEntityFacing', target, facing: 'down' },
                  { kind: 'setEntityFrame', target, frame: 1 },
                  { kind: 'dialog', cue: { rows: [{ text: '(得到物品！)' }] } },
                  { kind: 'giveItem', itemId: item },
                ],
              } as InsertionChoiceV5,
              {
                label: '🌿 地上道具：拾取后消失',
                commands: [
                  { kind: 'dialog', cue: { rows: [{ text: '(得到物品！)' }] } },
                  { kind: 'giveItem', itemId: item },
                  { kind: 'setEntityState', target, state: 0 },
                ],
              } as InsertionChoiceV5,
            ]
          : []),
        ...(target
          ? [
              {
                label: '🗣 NPC 搭话',
                commands: [
                  { kind: 'setEntityFacing', target, facing: 'down' },
                  { kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } },
                ],
              } as InsertionChoiceV5,
              {
                label: '🚶 来回巡逻',
                commands: [
                  {
                    kind: 'moveEntity',
                    target,
                    to: { ...pos, col: pos.col + 4 },
                    speed: 'slow',
                  },
                  { kind: 'wait', ms: 400 },
                  { kind: 'moveEntity', target, to: { ...pos }, speed: 'slow' },
                  { kind: 'wait', ms: 400 },
                ],
              } as InsertionChoiceV5,
              {
                label: '👀 四向张望',
                commands: (['down', 'left', 'up', 'right'] as const).flatMap((facing) => [
                  { kind: 'setEntityFacing', target, facing },
                  { kind: 'setEntityFrame', target, frame: 0 },
                  { kind: 'wait', ms: 600 },
                ]),
              } as InsertionChoiceV5,
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
    (context ? projectCommandExamplesV5(context.state) : []).map((command) => [
      command.kind,
      command,
    ]),
  )
  const more = (Object.keys(AUTHOR_COMMAND_PRESENTATION_V5) as AuthorCommandV5['kind'][])
    .filter((kind) => !represented.has(kind) && kind !== 'holdScreen' && kind !== 'revealScreen')
    .map((kind) => {
      const command = examples.get(kind)
      if (!command) return fallbackInsertionChoiceV5(kind, context, target)
      const [icon, label] = AUTHOR_COMMAND_PRESENTATION_V5[kind]
      return {
        kind,
        label: `${icon} ${label}`,
        commands: [cleanInsertionExampleV5(command, target, currentScene?.id)] as AuthorCommandV5[],
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  if (more.length)
    groups.push({
      title: '更多指令',
      choices: more,
    })
  return groups.filter((group) => group.choices.length > 0)
}

function insertCommandsAfterV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
  commands: readonly AuthorCommandV5[],
): { body: AuthorCommandV5[]; selectedPath: string } {
  let nextBody = [...body]
  let cursor = path
  for (const command of commands) {
    nextBody = insertAuthorCommandAfterV5(nextBody, cursor, structuredClone(command))
    cursor = parseAuthorCommandPathV5(commandPathAfterInsert(cursor))
  }
  return { body: nextBody, selectedPath: formatAuthorCommandPathV5(cursor) }
}

export function CanonicalScriptBodyEditorV5(props: {
  body: readonly AuthorCommandV5[]
  onChange: (body: AuthorCommandV5[]) => void
  context?: CanonicalScriptEditorContextV5
  onError?: (message: string) => void
  label?: string
  focusCommandPath?: string
  focusRevision?: number
}) {
  const editorRef = useRef<HTMLElement>(null)
  const lastAppliedFocusRevisionRef = useRef<number | undefined>(undefined)
  const [selectedPath, setSelectedPath] = useState<string>()
  const [editingPath, setEditingPath] = useState<string>()
  const [insertPath, setInsertPath] = useState<string>()
  const [insertSearch, setInsertSearch] = useState('')
  const editing = editingPath
    ? getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(editingPath))
    : undefined
  const groups = useMemo(() => insertionGroups(props.context), [props.context])
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
    if (selectedPath && !getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(selectedPath)))
      setSelectedPath(undefined)
    if (editingPath && !getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(editingPath)))
      setEditingPath(undefined)
  }, [props.body, selectedPath, editingPath])

  useEffect(() => {
    if (props.focusRevision === undefined || props.focusCommandPath === undefined) return
    if (lastAppliedFocusRevisionRef.current === props.focusRevision) return
    lastAppliedFocusRevisionRef.current = props.focusRevision
    let command: AuthorCommandV5 | undefined
    try {
      command = getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(props.focusCommandPath))
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

  const commit = (body: AuthorCommandV5[]): boolean => {
    try {
      props.onChange(body)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  return (
    <section
      ref={editorRef}
      className="canonical-script-editor"
      aria-label={props.label ?? '脚本正文编辑器'}
    >
      <header className="canonical-script-editor-heading">
        <strong>{props.label ?? '脚本正文'}</strong>
        <div>
          <span>{props.body.length} 条顶层指令 · 双击指令可编辑</span>
          <DsButton
            size="compact"
            variant="secondary"
            icon="add"
            onClick={() =>
              setInsertPath(
                formatAuthorCommandPathV5([props.body.length ? props.body.length - 1 : -1]),
              )
            }
          >
            添加指令
          </DsButton>
        </div>
      </header>
      <div className="canonical-script-editor-layout">
        <div className="canonical-script-tree">
          <CommandRowsV5
            body={props.body}
            parentPath={[]}
            context={props.context}
            selectedPath={selectedPath}
            referenceFocusPath={props.focusCommandPath}
            referenceFocusRevision={props.focusRevision}
            onSelect={(path) => {
              setSelectedPath(path)
            }}
            onEdit={(path) => {
              setSelectedPath(path)
              setEditingPath(path)
              setInsertPath(undefined)
            }}
            onInsert={(path) => {
              setSelectedPath(path)
              setEditingPath(undefined)
              setInsertPath(path)
            }}
            onMove={(path, direction) => {
              const parsed = parseAuthorCommandPathV5(path)
              if (commit(moveAuthorCommandAtV5(props.body, parsed, direction))) {
                const last = parsed.at(-1)
                if (typeof last === 'number')
                  setSelectedPath(
                    formatAuthorCommandPathV5([...parsed.slice(0, -1), last + direction]),
                  )
              }
            }}
            onRemove={(path) => {
              if (commit(removeAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(path)))) {
                setSelectedPath(undefined)
                setEditingPath(undefined)
              }
            }}
          />
        </div>
      </div>

      {insertPath ? (
        <CanonicalScriptDialogV5 title="添加指令" onClose={() => setInsertPath(undefined)}>
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
                        const result = insertCommandsAfterV5(
                          props.body,
                          parseAuthorCommandPathV5(insertPath),
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
        </CanonicalScriptDialogV5>
      ) : null}

      {editing && editingPath ? (
        <CanonicalScriptDialogV5
          title={`编辑：${describeCommand(editing, props.context).label}`}
          onClose={() => setEditingPath(undefined)}
          footer={
            <DsButton size="compact" variant="primary" onClick={() => setEditingPath(undefined)}>
              完成
            </DsButton>
          }
        >
          <CanonicalCommandFormV5
            command={editing}
            context={props.context}
            onChange={(command) =>
              commit(
                updateAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(editingPath), command),
              )
            }
          />
        </CanonicalScriptDialogV5>
      ) : null}
    </section>
  )
}

export function CanonicalHostileOnLoseEditorV5(props: {
  value: HostileBehaviorV5['onLose']
  onChange: (value: HostileBehaviorV5['onLose']) => void
  context?: CanonicalScriptEditorContextV5
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
            编辑脚本…
          </DsButton>
        </div>
      </section>

      {open && body ? (
        <CanonicalScriptDialogV5
          title="战败后脚本"
          className="canonical-hostile-script-dialog"
          onClose={() => setOpen(false)}
          footer={
            <DsButton size="compact" variant="primary" onClick={() => setOpen(false)}>
              完成
            </DsButton>
          }
        >
          <CanonicalScriptBodyEditorV5
            label="战败后脚本正文"
            body={body}
            context={props.context}
            focusCommandPath={props.focusCommandPath}
            focusRevision={props.focusRevision}
            onError={props.onError}
            onChange={props.onChange}
          />
        </CanonicalScriptDialogV5>
      ) : null}
    </>
  )
}

function defaultTransition(
  kind: StateTransitionV5['kind'],
  states: readonly string[],
  commandIds: readonly string[],
): StateTransitionV5 {
  const state = states[0] ?? 'state'
  switch (kind) {
    case 'stay':
      return { kind }
    case 'restart':
      return { kind }
    case 'continue':
    case 'advance':
      return { kind, state }
    case 'to':
      return { kind, state, yield: 'worldTick' }
    case 'branch':
      return {
        kind,
        cond: { kind: 'flag', flag: 'my-flag', is: true },
        then: { kind: 'stay' },
        else: { kind: 'stay' },
      }
    case 'commandOutcome':
      return {
        kind,
        commandId: commandIds[0] ?? 'confirm',
        command: 'confirm',
        outcome: 'no',
        then: { kind: 'stay' },
        else: { kind: 'stay' },
      }
  }
}

function TransitionEditorV5(props: {
  value: StateTransitionV5
  states: readonly string[]
  commandIds: readonly string[]
  context?: CanonicalScriptEditorContextV5
  label?: string
  onChange: (transition: StateTransitionV5) => void
}) {
  const transition = props.value
  return (
    <div className="canonical-transition-editor">
      <CanonicalFieldV5 label={props.label ?? '跑完后'}>
        <DsSelect
          size="compact"
          value={transition.kind}
          options={[
            { value: 'stay', label: '下次激活保持当前状态' },
            { value: 'restart', label: '下次激活回初始状态' },
            { value: 'continue', label: '同步继续到状态' },
            { value: 'advance', label: '下次激活进入状态' },
            { value: 'to', label: '让步后同次继续' },
            { value: 'branch', label: '按条件分派' },
            { value: 'commandOutcome', label: '按命令结果分派' },
          ]}
          onValueChange={(kind) =>
            props.onChange(
              defaultTransition(kind as StateTransitionV5['kind'], props.states, props.commandIds),
            )
          }
        />
      </CanonicalFieldV5>
      <strong className="canonical-transition-execution">
        {stateTransitionExecutionLabelV5(transition)}
      </strong>
      {transition.kind === 'continue' ||
      transition.kind === 'advance' ||
      transition.kind === 'to' ? (
        <CanonicalFieldV5 label="目标状态">
          <DsSelect
            size="compact"
            value={transition.state}
            options={[
              ...(!props.states.includes(transition.state)
                ? [{ value: transition.state, label: `${transition.state}（引用失效）` }]
                : []),
              ...props.states.map((state) => ({ value: state, label: state })),
            ]}
            onValueChange={(state) => props.onChange({ ...transition, state })}
          />
        </CanonicalFieldV5>
      ) : null}
      {transition.kind === 'to' ? (
        <CanonicalFieldV5 label="让步边界">
          <DsSelect
            size="compact"
            value={transition.yield}
            options={[
              { value: 'worldTick', label: 'worldTick' },
              { value: 'macroTask', label: 'macroTask' },
            ]}
            onValueChange={(value) =>
              props.onChange({
                ...transition,
                yield: value as 'macroTask' | 'worldTick',
              })
            }
          />
        </CanonicalFieldV5>
      ) : null}
      {transition.kind === 'branch' ? (
        <>
          <ConditionEditorV5
            value={transition.cond}
            state={props.context?.state}
            references={props.context?.references}
            worldVariables={props.context?.worldVariables}
            onOpenWorldVariable={props.context?.onOpenWorldVariable}
            onChange={(cond) => props.onChange({ ...transition, cond })}
          />
          <TransitionEditorV5
            {...props}
            label="条件成立"
            value={transition.then}
            onChange={(then) => props.onChange({ ...transition, then })}
          />
          <TransitionEditorV5
            {...props}
            label="条件不成立"
            value={transition.else}
            onChange={(otherwise) => props.onChange({ ...transition, else: otherwise })}
          />
        </>
      ) : null}
      {transition.kind === 'commandOutcome' ? (
        <>
          <CanonicalFieldV5 label="确认命令">
            <DsSelect
              size="compact"
              value={transition.commandId}
              options={[
                ...(!props.commandIds.includes(transition.commandId)
                  ? [
                      {
                        value: transition.commandId,
                        label: `${transition.commandId}（本状态中不存在）`,
                      },
                    ]
                  : []),
                ...props.commandIds.map((id) => ({ value: id, label: id })),
              ]}
              onValueChange={(commandId) => props.onChange({ ...transition, commandId })}
            />
          </CanonicalFieldV5>
          <TransitionEditorV5
            {...props}
            label="选择“否”"
            value={transition.then}
            onChange={(then) => props.onChange({ ...transition, then })}
          />
          <TransitionEditorV5
            {...props}
            label="选择“是”"
            value={transition.else}
            onChange={(otherwise) => props.onChange({ ...transition, else: otherwise })}
          />
        </>
      ) : null}
    </div>
  )
}

function confirmIds(body: readonly AuthorCommandV5[]): string[] {
  const ids: string[] = []
  const visit = (commands: readonly AuthorCommandV5[]): void => {
    for (const command of commands) {
      if (command.kind === 'confirm' && command.id) ids.push(command.id)
      for (const child of commandChildren(command)) visit(child.body)
    }
  }
  visit(body)
  return ids
}

function CanonicalFlowBodyTabsV5(props: {
  prepare?: readonly AuthorCommandV5[]
  body: readonly AuthorCommandV5[]
  bodyLabel: string
  context?: CanonicalScriptEditorContextV5
  onError?: (message: string) => void
  onPrepareChange?: (prepare: AuthorCommandV5[]) => void
  onBodyChange: (body: AuthorCommandV5[]) => void
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
      <CanonicalScriptBodyEditorV5
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
          <CanonicalScriptBodyEditorV5
            label="画面出现前的准备"
            body={props.prepare}
            context={props.context}
            onError={props.onError}
            onChange={(prepare) => props.onPrepareChange?.(prepare)}
            focusCommandPath={props.focusSection === 'prepare' ? props.focusCommandPath : undefined}
            focusRevision={props.focusSection === 'prepare' ? props.focusRevision : undefined}
          />
        ) : (
          <CanonicalScriptBodyEditorV5
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

type TriggerStageFlowV5 = Extract<ScriptFlowV5, { kind: 'stages' }>

export function removeTriggerStageV5(
  flow: TriggerStageFlowV5,
  stageId: string,
  replacementId: string,
): TriggerStageFlowV5 {
  if (flow.stages.length <= 1) throw new Error('分次执行至少需要保留一个步骤')
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
      .map((stage) => (stage.next === stageId ? { ...stage, next: replacementId } : stage)),
  }
}

export function CanonicalScriptFlowEditorV5(props: {
  flow: ScriptFlowV5
  onChange: (flow: ScriptFlowV5) => boolean
  ownerLabel?: string
  context?: CanonicalScriptEditorContextV5
  onError?: (message: string) => void
  focusLocator?: ScriptV5CommandLocatorV5
  focusRevision?: number
}) {
  const ids =
    props.flow.kind === 'stages'
      ? props.flow.stages.map((stage) => stage.id)
      : Object.keys(props.flow.machine.states)
  const initialId = props.flow.kind === 'stages' ? props.flow.initial : props.flow.machine.initial
  const [selectedId, setSelectedId] = useState(initialId)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkNewStage, setLinkNewStage] = useState(true)
  const stageNextSelectId = useId()
  const lastAppliedFlowFocusRevisionRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (ids.includes(selectedId)) return
    setSelectedId(initialId)
  }, [ids, initialId, selectedId])
  useEffect(() => {
    const container = props.focusLocator?.container
    if (props.focusRevision === undefined || !container) return
    if (lastAppliedFlowFocusRevisionRef.current === props.focusRevision) return
    lastAppliedFlowFocusRevisionRef.current = props.focusRevision
    if (props.flow.kind === 'stages' && container.kind === 'step') {
      if (props.flow.stages.some((stage) => stage.id === container.stepId))
        setSelectedId(container.stepId)
      return
    }
    if (
      props.flow.kind === 'stateMachine' &&
      container.kind === 'state' &&
      props.flow.machine.id === container.machineId &&
      props.flow.machine.states[container.stateId]
    )
      setSelectedId(container.stateId)
  }, [props.flow, props.focusLocator, props.focusRevision])

  if (props.flow.kind === 'stages') {
    const flow = props.flow
    const stage = flow.stages.find((candidate) => candidate.id === selectedId) ?? flow.stages[0]
    const hasMultipleStages = flow.stages.length > 1
    const stageIndex = stage ? flow.stages.findIndex((candidate) => candidate.id === stage.id) : -1
    const stageLabel = (id: string): string => {
      const index = flow.stages.findIndex((candidate) => candidate.id === id)
      return index >= 0 ? `步骤 ${index + 1}` : id
    }
    const stageNextLabel = (candidate: (typeof flow.stages)[number]): string =>
      candidate.next ? `下次进入${stageLabel(candidate.next)}` : '下次仍执行当前步骤'
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
      const applied = props.onChange(removeTriggerStageV5(flow, stage.id, replacement.id))
      if (applied === false) return
      setSelectedId(replacement.id)
      setDeleteOpen(false)
    }
    return (
      <section className="canonical-flow-editor">
        <header className="canonical-flow-explanation">
          <div className="script-section-heading">
            <strong className="script-section-title">分次执行</strong>
            <span className="script-section-count canonical-flow-count">
              {flow.stages.length} 个步骤
            </span>
            <CanonicalHelpTipV5 label="分次执行">
              适用于对话、宝箱等每次运行内容会变化的脚本。每次运行只执行当前步骤；完成后可指定下次从哪一步开始。
            </CanonicalHelpTipV5>
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
        {hasMultipleStages ? (
          <nav className="canonical-stage-tabs" aria-label="执行步骤">
            {flow.stages.map((candidate, index) => (
              <div
                key={candidate.id}
                className={`canonical-stage-card${candidate.id === stage?.id ? ' active' : ''}`}
              >
                <DsButton
                  size="compact"
                  variant={candidate.id === stage?.id ? 'primary' : 'secondary'}
                  className="canonical-stage-card-select"
                  aria-pressed={candidate.id === stage?.id}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  <strong>步骤 {index + 1}</strong>
                  <span>{candidate.body.length} 条指令</span>
                  <small>
                    {candidate.id === flow.initial ? '首次运行 · ' : ''}
                    {stageNextLabel(candidate)}
                  </small>
                </DsButton>
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
        ) : null}
        {stage ? (
          <CanonicalFlowBodyTabsV5
            key={stage.id}
            prepare={stage.entry?.prepare}
            body={stage.body}
            bodyLabel={hasMultipleStages ? `${stageLabel(stage.id)} · 脚本正文` : '脚本正文'}
            context={props.context}
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
          <CanonicalScriptDialogV5
            title={`${stageLabel(stage.id)} · 详情`}
            className="canonical-flow-settings-dialog"
            onClose={() => setDetailsOpen(false)}
            footer={
              <>
                <DsButton
                  size="compact"
                  variant="danger"
                  disabled={!hasMultipleStages}
                  title={hasMultipleStages ? undefined : '分次执行至少需要保留一个步骤。'}
                  onClick={() => {
                    setDetailsOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  删除步骤…
                </DsButton>
                {!hasMultipleStages ? (
                  <span className="canonical-stage-delete-note">
                    分次执行至少需要保留一个步骤。
                  </span>
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
                <header className="canonical-dialog-field-heading">
                  <strong>起始步骤</strong>
                  <CanonicalHelpTipV5 label="起始步骤">
                    每套脚本方案只能有一个起始步骤。切换到这套方案后，第一次运行会从这里开始。
                  </CanonicalHelpTipV5>
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
                  <CanonicalHelpTipV5 label="下次运行">
                    当前步骤完成后，下一次运行这套方案时从哪个步骤开始。
                  </CanonicalHelpTipV5>
                </header>
                <DsSelect
                  size="compact"
                  id={stageNextSelectId}
                  value={stage.next ?? ''}
                  options={[
                    { value: '', label: '仍执行当前步骤' },
                    ...flow.stages
                      .filter((candidate) => candidate.id !== stage.id)
                      .map((candidate) => ({
                        value: candidate.id,
                        label: `进入${stageLabel(candidate.id)}`,
                      })),
                  ]}
                  onValueChange={(nextStageId) => {
                    const stages = flow.stages.map((candidate) =>
                      candidate.id === stage.id
                        ? {
                            ...candidate,
                            next: nextStageId || undefined,
                          }
                        : candidate,
                    )
                    props.onChange({ ...flow, stages })
                  }}
                />
              </section>
            </div>
          </CanonicalScriptDialogV5>
        ) : null}
        {stage && createOpen ? (
          <CanonicalScriptDialogV5
            title="新建执行步骤"
            className="canonical-stage-create-dialog"
            onClose={() => setCreateOpen(false)}
          >
            <div className="canonical-stage-create-form">
              <div className="canonical-modal-context">
                <span>所属方案：{props.ownerLabel ?? '当前脚本'}</span>
                <CanonicalHelpTipV5 label="新建步骤">
                  新步骤拥有独立的出现前准备和脚本正文，只会加入当前脚本方案。
                </CanonicalHelpTipV5>
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
          </CanonicalScriptDialogV5>
        ) : null}
        {stage && replacement && deleteOpen ? (
          <CanonicalScriptDialogV5
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
          </CanonicalScriptDialogV5>
        ) : null}
      </section>
    )
  }

  const flow = props.flow
  const state = flow.machine.states[selectedId] ?? Object.values(flow.machine.states)[0]
  const stateId = flow.machine.states[selectedId] ? selectedId : Object.keys(flow.machine.states)[0]
  return (
    <section className="canonical-flow-editor">
      <header className="canonical-flow-explanation">
        <div className="script-section-heading">
          <strong className="script-section-title">连续流程（高级）</strong>
          <span className="script-section-count canonical-flow-count">{ids.length} 个状态</span>
          <CanonicalHelpTipV5 label="连续流程">
            {flow.machine.cadence === 'transition'
              ? '这是按源指令逐拍迁移的流程：一个状态正文表示一条源指令的完整展开，正文内的多条指令会在同一帧执行；只有状态去向负责进入下一拍。'
              : '用于同一次运行内按条件或选择连续切换多个状态。普通脚本和“下次运行换内容”不需要使用。'}
          </CanonicalHelpTipV5>
        </div>
        <CanonicalFieldV5 label="起始状态">
          <DsSelect
            size="compact"
            value={flow.machine.initial}
            options={ids.map((id) => ({
              value: id,
              label: flow.machine.states[id]?.label ?? id,
            }))}
            onValueChange={(initial) =>
              props.onChange({
                ...flow,
                machine: { ...flow.machine, initial },
              })
            }
          />
        </CanonicalFieldV5>
      </header>
      <nav aria-label="连续流程状态">
        {Object.entries(flow.machine.states).map(([id, candidate]) => (
          <DsButton
            size="compact"
            variant={id === stateId ? 'primary' : 'secondary'}
            key={id}
            onClick={() => setSelectedId(id)}
          >
            <span>{candidate.label}</span>
            <small>{stateTransitionExecutionLabelV5(candidate.next)}</small>
          </DsButton>
        ))}
        <DsButton
          size="compact"
          variant="secondary"
          icon="add"
          onClick={() => {
            let index = ids.length + 1
            let id = `state-${index}`
            while (ids.includes(id)) id = `state-${++index}`
            props.onChange({
              ...flow,
              machine: {
                ...flow.machine,
                states: {
                  ...flow.machine.states,
                  [id]: { label: id, body: [], next: { kind: 'stay' } },
                },
              },
            })
            setSelectedId(id)
          }}
        >
          新建状态
        </DsButton>
      </nav>
      {state && stateId ? (
        <>
          <CanonicalFieldV5 label="状态名称" className="canonical-state-label">
            <DsTextInput
              size="compact"
              value={state.label}
              onChange={(event) =>
                props.onChange({
                  ...flow,
                  machine: {
                    ...flow.machine,
                    states: {
                      ...flow.machine.states,
                      [stateId]: { ...state, label: event.target.value },
                    },
                  },
                })
              }
            />
          </CanonicalFieldV5>
          <CanonicalFlowBodyTabsV5
            key={stateId}
            prepare={state.entry?.prepare}
            body={state.body}
            bodyLabel={`${state.label} · 正文`}
            context={props.context}
            onError={props.onError}
            focusSection={
              props.focusLocator?.container.kind === 'state' &&
              props.focusLocator.container.machineId === flow.machine.id &&
              props.focusLocator.container.stateId === stateId
                ? props.focusLocator.container.section
                : undefined
            }
            focusCommandPath={
              props.focusLocator?.container.kind === 'state' &&
              props.focusLocator.container.machineId === flow.machine.id &&
              props.focusLocator.container.stateId === stateId
                ? props.focusLocator.commandPath
                : undefined
            }
            focusRevision={
              props.focusLocator?.container.kind === 'state' &&
              props.focusLocator.container.machineId === flow.machine.id &&
              props.focusLocator.container.stateId === stateId
                ? props.focusRevision
                : undefined
            }
            onPrepareChange={
              state.entry
                ? (prepare) =>
                    props.onChange({
                      ...flow,
                      machine: {
                        ...flow.machine,
                        states: {
                          ...flow.machine.states,
                          [stateId]: { ...state, entry: { ...state.entry!, prepare } },
                        },
                      },
                    })
                : undefined
            }
            onBodyChange={(body) =>
              props.onChange({
                ...flow,
                machine: {
                  ...flow.machine,
                  states: {
                    ...flow.machine.states,
                    [stateId]: { ...state, body },
                  },
                },
              })
            }
          />
          <TransitionEditorV5
            value={state.next}
            states={ids}
            commandIds={confirmIds(state.body)}
            context={props.context}
            onChange={(next) =>
              props.onChange({
                ...flow,
                machine: {
                  ...flow.machine,
                  states: {
                    ...flow.machine.states,
                    [stateId]: { ...state, next },
                  },
                },
              })
            }
          />
        </>
      ) : null}
    </section>
  )
}
