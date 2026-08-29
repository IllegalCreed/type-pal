/**
 * 物品工作台：左侧 catalog，中间身份/基础信息/正交能力，右侧概览/引用/资源检查器。
 * 装备、使用和投掷都以结构化数据为唯一真相源；说明只负责风味文字。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetId,
  BattleFieldDef,
  BattleSpriteDef,
  CombatStat,
  EquipEffect,
  EquipSlot,
  EquipSpec,
  ItemData,
  ItemUseEffect,
  Locale,
  PoisonDef,
  SceneDef,
  SkillData,
  StatusId,
  ThrowSpec,
  UseSpec,
} from '@type-pal/content'
import { deriveScriptChunk, describeEquipEffects, lookupText } from '@type-pal/content'
import {
  type AssetBase,
  type AudioAssetReader,
  isRuntimeScriptRef,
  runtimeScriptRef,
} from '@type-pal/reforge'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AddItemCommand,
  CompositeCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { nextAuthoredImageId, prepareAuthoredImage } from '../core/image-import.js'
import { cloneItemForAuthoring, createBlankItem } from '../core/item-authoring.js'
import type { ItemReference } from '../core/item-references.js'
import {
  AddItemPrivateScriptCommand,
  DeleteItemPrivateScriptCommand,
  type ScriptEditorState,
  type ScriptEditSession,
  SetItemPrivateScriptBodyCommand,
} from '../core/script-editor.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsCheckbox,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsDialog,
  DsDraftNumberInput,
  DsDraftNumberField,
  DsDraftTextArea,
  DsDraftTextInput,
  DsField,
  DsFieldGroup,
  DsFileInput,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsObjectWorkspace,
  DsObjectWorkspaceContent,
  DsOverflowText,
  DsPressable,
  DsNumberFieldGrid,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadoutList,
  DsReadoutRow,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsReorderCollection,
  type DsReorderIntent,
  DsSelect,
  DsSwitch,
  DsTag,
  DsTextInput,
  DsWorkbenchSection,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'
import { EffectEditorCard, EffectEditorChain } from './EffectEditorCard.js'
import { ImageAssetThumbnail, imageAssetLabel, imageAssets } from './ImageAssetPicker.js'
import {
  defaultItemUseEffect,
  ItemEffectChainEditor,
  type ItemScriptOption,
  ThrowEffectChainEditor,
} from './ItemUseEffectEditor.js'
import type { CanonicalScriptEditorContext } from './ScriptEditor.js'
import { SkillAnimationEditor } from './SkillAnimationEditor.js'
import { SoundPicker } from './SoundPicker.js'

function withSound<T extends { sound?: AssetId }>(spec: T, sound: AssetId | undefined): T {
  const copy = { ...spec, sound }
  if (sound === undefined) delete copy.sound
  return copy
}

const SLOTS: { v: EquipSlot; label: string }[] = [
  { v: 'weapon', label: '武器' },
  { v: 'head', label: '头部' },
  { v: 'body', label: '身体' },
  { v: 'cloak', label: '披风' },
  { v: 'feet', label: '脚部' },
  { v: 'accessory', label: '饰品' },
]
const STATS: { v: CombatStat; label: string }[] = [
  { v: 'attack', label: '武术' },
  { v: 'magicAttack', label: '灵力' },
  { v: 'defense', label: '防御' },
  { v: 'speed', label: '身法' },
  { v: 'luck', label: '吉运' },
]
type ResElem = 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'
const RES_ELEMS: { v: ResElem; label: string }[] = [
  { v: 'poison', label: '毒' },
  { v: 'wind', label: '风' },
  { v: 'thunder', label: '雷' },
  { v: 'water', label: '水' },
  { v: 'fire', label: '火' },
  { v: 'earth', label: '土' },
]
const STATUSES: { v: StatusId; label: string }[] = [
  { v: 'confused', label: '混乱' },
  { v: 'paralyzed', label: '定身' },
  { v: 'sleep', label: '睡眠' },
  { v: 'silence', label: '沉默' },
  { v: 'puppet', label: '傀儡' },
  { v: 'bravery', label: '神勇' },
  { v: 'protect', label: '护体' },
  { v: 'haste', label: '加速' },
  { v: 'dualAttack', label: '连击' },
]
const EFFECT_KINDS: { v: EquipEffect['kind']; label: string }[] = [
  { v: 'statBonus', label: '属性加成' },
  { v: 'maxPool', label: '上限加成' },
  { v: 'resistance', label: '抗性' },
  { v: 'grantStatus', label: '常驻状态' },
  { v: 'grantSkill', label: '授予技能' },
  { v: 'attackAll', label: '攻击全体' },
  { v: 'regenHp', label: '回合回体力' },
  { v: 'regenMp', label: '回合回真气' },
  { v: 'battleSprite', label: '战斗形象覆写' },
]

/** kind 切换的缺省效果体。 */
function defaultEquipEffect(kind: EquipEffect['kind']): EquipEffect {
  switch (kind) {
    case 'statBonus':
      return { kind, stat: 'attack', delta: 10 }
    case 'maxPool':
      return { kind, pool: 'hp', delta: 50 }
    case 'resistance':
      return { kind, element: 'fire', percent: 30 }
    case 'grantStatus':
      return { kind, status: 'dualAttack' }
    case 'grantSkill':
      return { kind, skillId: '' }
    case 'attackAll':
      return { kind }
    case 'regenHp':
      return { kind, amount: 20 }
    case 'regenMp':
      return { kind, amount: 10 }
    case 'battleSprite':
      return { kind, byActor: {} }
  }
}

function Num(props: {
  v: number
  draftKey: string
  syncToken: number
  on: (n: number) => void
  w?: number
}) {
  return (
    <span className="ef-num" style={props.w ? { width: props.w } : undefined}>
      <DsDraftNumberInput
        size="compact"
        draftKey={props.draftKey}
        syncToken={props.syncToken}
        value={props.v}
        onCommit={(value) => value !== undefined && props.on(value)}
      />
    </span>
  )
}

/** 单条装备效果的分支字段(镜像 SkillTab 的 EffectFields)。 */
function EquipEffectFields(props: {
  e: EquipEffect
  draftKey: string
  syncToken: number
  skills: SkillData[]
  battleSprites: readonly BattleSpriteDef[]
  actors: readonly ActorDef[]
  equipableBy: readonly string[]
  locale: Locale
  on: (next: EquipEffect) => void
  onOpenBattleSprite?: (id: string) => void
}) {
  const {
    e,
    draftKey,
    syncToken,
    skills,
    battleSprites,
    actors,
    equipableBy,
    locale,
    on,
    onOpenBattleSprite,
  } = props
  switch (e.kind) {
    case 'statBonus':
      return (
        <>
          <div>
            <span>属性</span>
            <DsSelect
              size="compact"
              aria-label="装备属性"
              value={e.stat}
              options={STATS.map((stat) => ({ value: stat.v, label: stat.label }))}
              onValueChange={(value) => on({ ...e, stat: value as CombatStat })}
            />
          </div>
          <label>
            <span>加/减</span>
            <Num
              v={e.delta}
              draftKey={`${draftKey}.delta`}
              syncToken={syncToken}
              on={(n) => on({ ...e, delta: n })}
            />
          </label>
        </>
      )
    case 'maxPool':
      return (
        <>
          <div>
            <span>池</span>
            <DsSelect
              size="compact"
              aria-label="装备上限池"
              value={e.pool}
              options={[
                { value: 'hp', label: '体力上限' },
                { value: 'mp', label: '真气上限' },
              ]}
              onValueChange={(value) => on({ ...e, pool: value as 'hp' | 'mp' })}
            />
          </div>
          <label>
            <span>加/减</span>
            <Num
              v={e.delta}
              draftKey={`${draftKey}.delta`}
              syncToken={syncToken}
              on={(n) => on({ ...e, delta: n })}
            />
          </label>
        </>
      )
    case 'resistance':
      return (
        <>
          <div>
            <span>五灵/毒</span>
            <DsSelect
              size="compact"
              aria-label="装备抗性类型"
              value={e.element}
              options={RES_ELEMS.map((element) => ({
                value: element.v,
                label: element.label,
              }))}
              onValueChange={(value) => on({ ...e, element: value as ResElem })}
            />
          </div>
          <label>
            <span>抗 %</span>
            <Num
              v={e.percent}
              draftKey={`${draftKey}.percent`}
              syncToken={syncToken}
              on={(n) => on({ ...e, percent: n })}
            />
          </label>
        </>
      )
    case 'grantStatus':
      return (
        <div>
          <span>状态</span>
          <DsSelect
            size="compact"
            aria-label="装备常驻状态"
            value={e.status}
            options={STATUSES.map((status) => ({ value: status.v, label: status.label }))}
            onValueChange={(value) => on({ ...e, status: value as StatusId })}
          />
        </div>
      )
    case 'grantSkill':
      return (
        <div>
          <span>技能</span>
          <DsSelect
            size="compact"
            aria-label="装备授予技能"
            value={e.skillId}
            placeholder="选择技能…"
            options={[
              { value: '', label: '未选择技能' },
              ...skills.map((skill) => ({
                value: skill.id,
                label: skill.name,
                description: skill.id,
              })),
            ]}
            onValueChange={(value) => on({ ...e, skillId: value })}
          />
        </div>
      )
    case 'regenHp':
    case 'regenMp':
      return (
        <label>
          <span>每回合</span>
          <Num
            v={e.amount}
            draftKey={`${draftKey}.amount`}
            syncToken={syncToken}
            on={(n) => on({ ...e, amount: n })}
          />
        </label>
      )
    case 'battleSprite':
      return (
        <DsFieldGroup className="item-battle-sprite-map">
          {equipableBy.map((actorId) => {
            const actor = actors.find((candidate) => candidate.id === actorId)
            const value = e.byActor[actorId]
            return (
              <DsField
                id={`item-battle-sprite-${actorId}`}
                className="item-battle-sprite-row"
                key={actorId}
                label={actor ? lookupText(actor.name, locale) : actorId}
              >
                {(field) => (
                  <BattleSpritePicker
                    id={field.id}
                    value={value}
                    definitions={battleSprites}
                    kind="player-fighter"
                    allowUnset
                    unsetLabel="不覆写"
                    ariaLabel={`${actor ? lookupText(actor.name, locale) : actorId}的战斗形象覆写`}
                    onChange={(sprite) => {
                      const byActor = { ...e.byActor }
                      if (sprite) byActor[actorId] = sprite
                      else delete byActor[actorId]
                      on({ ...e, byActor })
                    }}
                    onOpenDefinition={onOpenBattleSprite}
                  />
                )}
              </DsField>
            )
          })}
          {!equipableBy.length ? <span className="hint2">请先勾选至少一个可装备角色。</span> : null}
        </DsFieldGroup>
      )
    default:
      return <span className="hint2 item-effect-no-params">此效果无需设置参数</span>
  }
}

type ItemFilter = 'all' | 'equip' | 'use' | 'throw' | 'referenced' | 'pending'
type ItemInspectorTab = 'overview' | 'references'

const ITEM_FILTERS: { value: ItemFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'equip', label: '装备' },
  { value: 'use', label: '可使用' },
  { value: 'throw', label: '可投掷' },
  { value: 'referenced', label: '有引用' },
  { value: 'pending', label: '待迁移' },
]

const SOURCE_LABEL: Record<ItemReference['source'], string> = {
  scene: '场景',
  script: '共享/内部脚本',
  shop: '商店',
  entry: '入口与开局',
  actor: '角色',
  skill: '技能',
  enemy: '敌人',
  poison: '毒',
  item: '物品',
  save: '运行态存档',
}

const ACCESS_LABEL: Record<ItemReference['access'], string> = {
  read: '判断',
  lose: '失去',
  consume: '消耗',
  reward: '获得',
  hold: '持有',
  configure: '配置',
}

const TARGET_LABEL: Record<NonNullable<UseSpec['target']>, string> = {
  oneAlly: '一名队友',
  allAllies: '全体队友',
  self: '使用者',
  scene: '当前场景',
}

const USE_EFFECT_LABEL: Record<ItemUseEffect['kind'], string> = {
  healHp: '回复体力',
  healMp: '回复真气',
  revive: '复活',
  applyStatus: '施加状态',
  removeStatus: '解除状态',
  applyPoison: '施毒',
  curePoison: '解毒',
  permanentStatBoost: '永久成长',
  gate: '概率门槛',
  dieIfNotPoisoned: '未中毒则死亡',
  runScript: '运行脚本',
  runSceneHook: '调用场景传送出口',
  craftRecipe: '合成配方',
  drawFromResourcePool: '资源池抽取',
  extraPoisonRes: '临时毒抗',
  hideParty: '全队隐身',
  modifyHostileAwareness: '调整明雷感知',
  scaleCurrentHp: '按比例调整当前体力',
  levelUp: '提升等级',
  placeEntityInFront: '把场景实体放到玩家面前',
}

function abilityTags(item: ItemData): string[] {
  return [item.equip ? '装备' : '', item.use ? '使用' : '', item.throw ? '投掷' : ''].filter(
    Boolean,
  )
}

interface ItemCatalogRowsProps {
  items: readonly ItemData[]
  selectedId: string | undefined
  pendingIds: ReadonlySet<string>
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  onSelect: (id: string) => void
}

function ItemCatalogRowsView(props: ItemCatalogRowsProps) {
  return props.items.map((candidate) => {
    return (
      <DsCatalogRow
        key={candidate.id}
        selected={candidate.id === props.selectedId}
        leading={
          <ImageAssetThumbnail
            asset={candidate.icon}
            kind="item-icon"
            reader={props.assetReader}
            revision={
              candidate.icon ? props.assetCatalog.assets[candidate.icon]?.sha256 : undefined
            }
            className="item-list-icon"
          />
        }
        title={candidate.name}
        meta={candidate.id}
        trailing={
          props.pendingIds.has(candidate.id) ? <DsTag tone="warning">待迁移</DsTag> : undefined
        }
        onClick={() => props.onSelect(candidate.id)}
      />
    )
  })
}

function sameItemCatalogRows(left: ItemCatalogRowsProps, right: ItemCatalogRowsProps): boolean {
  if (
    left.selectedId !== right.selectedId ||
    left.assetCatalog !== right.assetCatalog ||
    left.assetReader !== right.assetReader ||
    left.onSelect !== right.onSelect ||
    left.items.length !== right.items.length
  )
    return false

  return left.items.every((item, index) => {
    const next = right.items[index]
    return (
      !!next &&
      item.id === next.id &&
      item.name === next.name &&
      item.icon === next.icon &&
      left.pendingIds.has(item.id) === right.pendingIds.has(next.id)
    )
  })
}

/** Detail-only edits must not rebuild the entire 234-row PAL catalog. */
const ItemCatalogRows = memo(ItemCatalogRowsView, sameItemCatalogRows)

function summarizeUse(item: ItemData, items: readonly ItemData[]): string[] {
  if (!item.use) return ['未启用使用能力']
  const itemName = (id: string): string =>
    items.find((candidate) => candidate.id === id)?.name ?? id
  return [
    `${TARGET_LABEL[item.use.target]} · ${item.use.consuming ? '成功后消耗' : '不消耗'} · ${item.use.battleOnly ? '仅战斗' : '大世界/战斗按效果开放'}`,
    ...item.use.effects.map((effect) => {
      switch (effect.kind) {
        case 'runScript':
          return `运行剧情脚本 ${effect.script.id}`
        case 'runSceneHook':
          return '调用当前场景传送出口（场景可做前置判断、剧情处理或拒绝）'
        case 'craftRecipe':
          return `按顺序匹配 ${effect.recipes.length} 条配方：${effect.recipes
            .map(
              (recipe) =>
                `${recipe.ingredients.map((row) => `${itemName(row.itemId)}×${row.count}`).join('＋')} → ${recipe.products.map((row) => `${itemName(row.itemId)}×${row.count}`).join('＋')}`,
            )
            .join('；')}`
        case 'drawFromResourcePool':
          return `从资源 ${effect.resource} 抽取 1…当前值（封顶 ${effect.maxRoll}），按 ${effect.rewards.length} 档给出奖励并扣除点数`
        case 'permanentStatBoost':
          return `${USE_EFFECT_LABEL[effect.kind]}：${effect.stat} ${effect.delta >= 0 ? '+' : ''}${effect.delta}`
        case 'modifyHostileAwareness':
          return `${effect.rangeMultiplier === 0 ? '停止' : '扩大至 3 倍'}明雷感知，持续 ${effect.durationMs / 1000} 秒`
        case 'scaleCurrentHp':
          return `当前体力调整为 ${effect.numerator}/${effect.denominator}`
        case 'levelUp':
          return `提升 ${effect.levels} 级`
        case 'placeEntityInFront':
          return `把 ${effect.target.scene}/${effect.target.entity} 放到玩家面前，状态 ${effect.state}`
        default:
          return USE_EFFECT_LABEL[effect.kind]
      }
    }),
  ]
}

function groupReferences(references: readonly ItemReference[]): Array<{
  source: ItemReference['source']
  entries: ItemReference[]
}> {
  const grouped = new Map<ItemReference['source'], ItemReference[]>()
  for (const reference of references) {
    const entries = grouped.get(reference.source) ?? []
    entries.push(reference)
    grouped.set(reference.source, entries)
  }
  return [...grouped].map(([source, entries]) => ({ source, entries }))
}

function ItemIconBrowser(props: {
  value?: AssetId
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  onSelect: (id: AssetId | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const options = useMemo(() => imageAssets(props.catalog, 'item-icon'), [props.catalog])
  const shown = options.filter((option) => {
    const needle = filter.trim().toLowerCase()
    return !needle || imageAssetLabel(option).toLowerCase().includes(needle)
  })

  useEffect(() => {
    if (open) filterRef.current?.focus()
  }, [open])

  const close = (): void => {
    setOpen(false)
  }

  return (
    <div className="item-icon-browser">
      <DsButton
        ref={triggerRef}
        variant="primary"
        size="compact"
        icon="edit"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        选择已有图标
      </DsButton>
      {open ? (
        <DsDialog
          open
          title="选择物品图标"
          className="item-icon-browser-panel"
          fallbackFocusRef={triggerRef}
          onClose={close}
        >
          <div className="item-icon-browser-toolbar">
            <label className="visually-hidden" htmlFor="item-icon-filter">
              搜索物品图标
            </label>
            <DsTextInput
              ref={filterRef}
              id="item-icon-filter"
              placeholder="搜索图标名称或 AssetId…"
              autoComplete="off"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <span>{shown.length} 项</span>
          </div>
          <fieldset className="item-icon-browser-grid" aria-label="物品图标">
            <DsPressable
              type="button"
              aria-pressed={!props.value}
              className={`item-icon-option${!props.value ? ' selected' : ''}`}
              onClick={() => {
                props.onSelect(undefined)
                close()
              }}
            >
              <span className="item-icon-unset">无</span>
              <span>不使用图标</span>
            </DsPressable>
            {shown.map((option) => (
              <DsPressable
                type="button"
                aria-pressed={props.value === option.id}
                className={`item-icon-option${props.value === option.id ? ' selected' : ''}`}
                key={option.id}
                title={imageAssetLabel(option)}
                onClick={() => {
                  props.onSelect(option.id)
                  close()
                }}
              >
                <ImageAssetThumbnail
                  asset={option.id}
                  kind="item-icon"
                  reader={props.reader}
                  revision={option.record.sha256}
                  alt={option.record.label ?? option.id}
                />
                <span>{option.record.label ?? option.id}</span>
                <code>{option.id}</code>
              </DsPressable>
            ))}
          </fieldset>
          {!shown.length ? <div className="insp-empty">没有匹配的图标资源。</div> : null}
        </DsDialog>
      ) : null}
    </div>
  )
}

export function ItemTab(props: {
  items: ItemData[]
  actors: ActorDef[]
  skills: SkillData[]
  poisons: PoisonDef[]
  locale: Locale
  session: EditSession
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase?: AssetBase
  audioResolver?: AudioAssetReader
  battleSprites: readonly BattleSpriteDef[]
  battleFields?: readonly BattleFieldDef[]
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenScript?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenBattleField?: (id: number) => void
  onOpenItemReference?: (reference: ItemReference) => void
  onOpenProjectIssues?: () => void
  focusObjectId?: string
  focusPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath: string
    revision: number
  }
  onObjectFocus?: (id: string | undefined) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  tabBar?: React.ReactNode
  script?: {
    state: ScriptEditorState
    session: ScriptEditSession
  }
  historyCoordinator?: EditorHistoryCoordinator
  itemReferenceIndex: ReadonlyMap<string, readonly ItemReference[]>
  itemReferenceStatus: EditorDerivedStatus
  getCurrentAuthorState: () => EditorState | undefined
  getCurrentScriptState: () => ScriptEditorState | undefined
}) {
  const {
    items,
    actors,
    skills,
    poisons,
    locale,
    session,
    assetCatalog,
    assetReader,
    assetBase,
    audioResolver,
    battleSprites,
    battleFields = [],
    onOpenSound,
    onOpenImage,
    onOpenScript,
    onOpenBattleSprite,
    onOpenBattleField,
    onOpenItemReference,
    onOpenProjectIssues,
    focusObjectId,
    focusPrivateScript,
    onObjectFocus,
    onStatusNotice,
    tabBar,
    script,
    historyCoordinator,
    itemReferenceIndex,
    itemReferenceStatus,
    getCurrentAuthorState,
    getCurrentScriptState,
  } = props
  const [filter, setFilter] = useState('')
  const [filterMode, setFilterMode] = useState<ItemFilter>('all')
  const [selId, setSelId] = useState(items[0]?.id ?? '')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>()
  const [inspectorTab, setInspectorTab] = useState<ItemInspectorTab>('overview')
  const iconInputRef = useRef<HTMLInputElement>(null)
  const deletedSelectionRef = useRef<{ id: string; sawAbsent: boolean } | undefined>(undefined)
  const editorState = session.getState()
  const referenceMap = itemReferenceIndex
  const diagnostics = editorState.migrationDiagnostics?.diagnostics ?? []
  const pendingIds = new Set(
    diagnostics
      .filter((diagnostic) => {
        const target = items.find((candidate) => candidate.id === diagnostic.target.objectId)
        return target ? !target[diagnostic.target.capability] : false
      })
      .map((diagnostic) => diagnostic.target.objectId),
  )

  useEffect(() => {
    if (focusObjectId && items.some((entry) => entry.id === focusObjectId)) setSelId(focusObjectId)
  }, [focusObjectId, items])
  useEffect(() => {
    if (selId && items.some((entry) => entry.id === selId)) return
    const next = items[0]?.id ?? ''
    setSelId(next)
    onObjectFocus?.(next || undefined)
  }, [items, onObjectFocus, selId])
  useEffect(() => {
    const deleted = deletedSelectionRef.current
    if (!deleted) return
    const restored = items.some((entry) => entry.id === deleted.id)
    if (!restored) {
      deleted.sawAbsent = true
      return
    }
    if (!deleted.sawAbsent) return
    setSelId(deleted.id)
    onObjectFocus?.(deleted.id)
    deletedSelectionRef.current = undefined
  }, [items, onObjectFocus])

  const shown = (() => {
    const needle = filter.trim().toLowerCase()
    return items.filter((candidate) => {
      if (
        needle &&
        !candidate.id.toLowerCase().includes(needle) &&
        !candidate.name.toLowerCase().includes(needle)
      )
        return false
      if (filterMode === 'equip') return !!candidate.equip
      if (filterMode === 'use') return !!candidate.use
      if (filterMode === 'throw') return !!candidate.throw
      if (filterMode === 'referenced') return !!referenceMap.get(candidate.id)?.length
      if (filterMode === 'pending') return pendingIds.has(candidate.id)
      return true
    })
  })()
  const item = items.find((candidate) => candidate.id === selId)
  const itemReferences = item ? (referenceMap.get(item.id) ?? []) : []
  const blockers = itemReferences.filter((reference) => reference.ownerItemId !== item?.id)
  const itemReferenceCount =
    itemReferenceStatus === 'current'
      ? { kind: 'exact' as const, value: itemReferences.length }
      : itemReferences.length
        ? { kind: 'at-least' as const, value: itemReferences.length }
        : { kind: 'unknown' as const }
  const itemReferencePanelState =
    itemReferenceStatus === 'current'
      ? itemReferences.length
        ? ('ready' as const)
        : ('empty' as const)
      : itemReferenceStatus === 'failed'
        ? ('error' as const)
        : itemReferenceStatus === 'stale'
          ? ('partial' as const)
          : ('loading' as const)
  const itemDiagnostics = item
    ? diagnostics.filter(
        (diagnostic) =>
          diagnostic.target.objectId === item.id && !item[diagnostic.target.capability],
      )
    : []
  const skillName = useMemo(() => {
    const names = new Map(skills.map((skill) => [skill.id, skill.name]))
    return (id: string): string | undefined => names.get(id)
  }, [skills])
  const battleSpriteName = useMemo(() => {
    const names = new Map(battleSprites.map((entry) => [entry.id, entry.label]))
    return (id: string): string | undefined => names.get(id)
  }, [battleSprites])
  const actorName = useMemo(() => {
    const names = new Map(actors.map((actor) => [actor.id, lookupText(actor.name, locale)]))
    return (id: string): string | undefined => names.get(id)
  }, [actors, locale])
  const sharedScripts = script?.state.sharedScripts
  const scriptOptions = useMemo<ItemScriptOption[]>(() => {
    if (sharedScripts)
      return Object.entries(sharedScripts)
        .map(([id, sharedScript]) => ({
          ref: runtimeScriptRef(id),
          label: `${sharedScript.name} · ${id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
    const index = editorState.scriptIndex
    if (!index) return []
    return Object.entries(index.library ?? {})
      .flatMap(([id, meta]) => {
        const chunk = deriveScriptChunk(id, index.shards)
        return chunk ? [{ ref: { id, chunk }, label: `${meta.name} · ${id}` }] : []
      })
      .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  }, [editorState.scriptIndex, sharedScripts])
  const privateScriptPrefix = item ? `item:${item.id}:` : ''
  const hasPrivateScript = (['use', 'throw'] as const).some((slot) =>
    (item?.[slot]?.effects ?? []).some(
      (effect) =>
        effect.kind === 'runScript' &&
        isRuntimeScriptRef(effect.script) &&
        effect.script.id.startsWith(privateScriptPrefix),
    ),
  )
  const canonicalScriptEditorContext = useMemo<CanonicalScriptEditorContext | undefined>(() => {
    if (!script || !hasPrivateScript) return undefined
    const shell = session.getState()
    const references = createScriptReferenceCatalog({
      locale,
      items,
      skills,
      actors,
      sprites: shell.sprites,
      battleSprites,
      ambiences: shell.ambiences ?? [],
      mapIndex: shell.mapIndex,
      assetCatalog,
      authorScripts: Object.entries(script.state.sharedScripts).map(([id, script]) => ({
        id,
        name: script.name,
      })),
    })
    return {
      state: script.state,
      shellScenes: shell.scenes,
      locale,
      assetCatalog,
      audioResolver: audioResolver ?? assetReader,
      assetReader,
      assetBase,
      actors: Object.fromEntries(actors.map((actor) => [actor.id, actor])),
      battleSprites,
      sprites: shell.sprites,
      ambiences: shell.ambiences ?? [],
      shops: shell.shops ?? [],
      references,
      onOpenScript,
      onOpenSound,
      onOpenImage,
      onOpenBattleSprite,
      onOpenBattleField,
    }
  }, [
    actors,
    assetBase,
    assetCatalog,
    assetReader,
    audioResolver,
    battleSprites,
    hasPrivateScript,
    items,
    locale,
    onOpenBattleSprite,
    onOpenBattleField,
    onOpenImage,
    onOpenScript,
    onOpenSound,
    script,
    session,
    skills,
  ])
  const privateScripts = (slot: 'use' | 'throw') => {
    const prefix = item ? `item:${item.id}:` : ''
    const shellScripts = (item?.[slot]?.effects ?? []).flatMap((shellEffect, shellIndex) =>
      shellEffect.kind === 'runScript' &&
      isRuntimeScriptRef(shellEffect.script) &&
      shellEffect.script.id.startsWith(prefix)
        ? [{ shellEffect, shellIndex }]
        : [],
    )
    if (!script || !item || !shellScripts.length) return {}
    // `script.state` is the immutable render snapshot supplied by the connector. Calling
    // ScriptEditSession.getState() here cloned the entire PAL canonical tree on every render.
    const storedItem = script.state.items.find((candidate) => candidate.id === item.id)
    const stored = new Map(
      (storedItem?.[slot]?.effects ?? []).flatMap((effect, canonicalIndex) =>
        effect.kind === 'itemPrivateScript'
          ? [[effect.script.id, { effect, canonicalIndex }] as const]
          : [],
      ),
    )
    return Object.fromEntries(
      shellScripts.flatMap(({ shellEffect, shellIndex }) => {
        const privateId = shellEffect.script.id.slice(prefix.length)
        const source = stored.get(privateId as 'use')
        if (!source) return []
        const { effect, canonicalIndex } = source
        return [
          [
            shellIndex,
            {
              label: effect.script.label ?? `${item?.name ?? item?.id}使用脚本`,
              body: effect.script.body,
              editorContext: canonicalScriptEditorContext,
              focusCommandPath:
                focusPrivateScript?.itemId === item?.id &&
                focusPrivateScript?.ability === slot &&
                focusPrivateScript?.scriptId === effect.script.id
                  ? focusPrivateScript.commandPath
                  : undefined,
              focusRevision:
                focusPrivateScript?.itemId === item?.id &&
                focusPrivateScript?.ability === slot &&
                focusPrivateScript?.scriptId === effect.script.id
                  ? focusPrivateScript.revision
                  : undefined,
              onChange: (body: typeof effect.script.body) =>
                script?.session.dispatch(
                  new SetItemPrivateScriptBodyCommand(storedItem!.id, slot, canonicalIndex, body),
                ),
            },
          ] as const,
        ]
      }),
    )
  }

  const patch = useCallback(
    (next: Partial<Omit<ItemData, 'id'>>): void => {
      if (selId) session.dispatch(new UpdateItemCommand(selId, next))
    },
    [selId, session],
  )
  const patchUse = useCallback(
    (next: UseSpec | undefined): void => {
      if (!item?.use) {
        patch({ use: next })
        return
      }
      const prefix = `item:${item.id}:`
      const currentPrivateId = item.use.effects.flatMap((effect) =>
        effect.kind === 'runScript' &&
        isRuntimeScriptRef(effect.script) &&
        effect.script.id.startsWith(prefix)
          ? [effect.script.id]
          : [],
      )[0]
      const keepsPrivate =
        currentPrivateId &&
        next?.effects.some(
          (effect) =>
            effect.kind === 'runScript' &&
            isRuntimeScriptRef(effect.script) &&
            effect.script.id === currentPrivateId,
        )
      if (!currentPrivateId || keepsPrivate) {
        patch({ use: next })
        return
      }
      if (!historyCoordinator || !script?.session) {
        onStatusNotice?.({
          kind: 'error',
          message: '缺少脚本历史协调器，无法安全删除当前物品脚本。',
        })
        return
      }
      try {
        historyCoordinator.dispatch(
          new DeleteItemPrivateScriptCommand(item.id, 'use', currentPrivateId.slice(prefix.length)),
          new UpdateItemCommand(item.id, { use: next }),
        )
        onStatusNotice?.({ kind: 'info', message: `已删除 ${item.name} 的当前物品脚本。` })
      } catch (cause) {
        onStatusNotice?.({
          kind: 'error',
          message: cause instanceof Error ? cause.message : String(cause),
        })
      }
    },
    [historyCoordinator, item, onStatusNotice, patch, script?.session],
  )
  const patchThrow = (next: ThrowSpec): void => {
    if (!item) return
    patch({ throw: next })
  }
  const equip = item?.equip
  const equipEffectReorderKeys = useDsReorderKeys(
    equip?.effects ?? [],
    (effect) => JSON.stringify(effect),
  )
  const patchEquip = (next: EquipSpec | undefined): void => patch({ equip: next })
  const setEquipEffect = (index: number, next: EquipEffect): void => {
    if (!equip) return
    const effects = [...equip.effects]
    effects[index] = next
    patchEquip({ ...equip, effects })
  }
  const reorderEquipEffects = (intent: DsReorderIntent): boolean => {
    if (!equip) return false
    const effects = reorderDsItems(equip.effects, intent, 'insert', sameDsSerializableValue)
    if (effects === equip.effects) return false
    equipEffectReorderKeys.move(intent)
    patchEquip({ ...equip, effects: [...effects] })
    return true
  }
  const derived = equip
    ? describeEquipEffects(equip.effects, { skillName, battleSpriteName, actorName })
    : []

  const selectItem = useCallback(
    (id: string): void => {
      setSelId(id)
      setConfirmDeleteId(undefined)
      onObjectFocus?.(id)
    },
    [onObjectFocus],
  )
  const createItem = (): void => {
    const created = createBlankItem(items)
    session.dispatch(new AddItemCommand(created))
    selectItem(created.id)
  }
  const duplicateItem = (): void => {
    if (!item) return
    const copy = cloneItemForAuthoring(item, items)
    const at = items.findIndex((candidate) => candidate.id === item.id) + 1
    session.dispatch(new AddItemCommand(copy, at))
    selectItem(copy.id)
  }
  const deleteItem = (): void => {
    if (!item) return
    if (itemReferenceStatus !== 'current') {
      onStatusNotice?.({ kind: 'error', message: '物品引用仍在检查，暂不能删除。' })
      return
    }
    const index = items.findIndex((candidate) => candidate.id === item.id)
    const next = items[index + 1]?.id ?? items[index - 1]?.id ?? ''
    try {
      deletedSelectionRef.current = { id: item.id, sawAbsent: false }
      session.dispatch(
        new DeleteItemCommand(
          item.id,
          script ? getCurrentScriptState : undefined,
          getCurrentAuthorState,
        ),
      )
      setSelId(next)
      setConfirmDeleteId(undefined)
      onObjectFocus?.(next || undefined)
      onStatusNotice?.({ kind: 'info', message: `已删除 ${item.name}；可用撤销恢复。` })
    } catch (cause) {
      setInspectorTab('references')
      onStatusNotice?.({
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }
  /** 新建私有脚本是一个跨 session 作者事务；正文与 shell ref 必须成对撤销/重做。 */
  const scriptSession = script?.session
  const addPrivateScript = useCallback((): void => {
    if (!item || !scriptSession) return
    const current = session.getState().items.find((candidate) => candidate.id === item.id)
    if (!current?.use) {
      onStatusNotice?.({
        kind: 'error',
        message: `${item.id}.use 不存在，无法添加当前物品脚本`,
      })
      return
    }
    const storedItem = scriptSession
      .getStateSnapshot()
      .items.find((candidate) => candidate.id === item.id)
    const exists = (storedItem?.use?.effects ?? []).some(
      (effect) => effect.kind === 'itemPrivateScript',
    )
    const prefix = `item:${item.id}:`
    const shellHasPrivate = current.use.effects.some(
      (effect) =>
        effect.kind === 'runScript' &&
        isRuntimeScriptRef(effect.script) &&
        effect.script.id.startsWith(prefix),
    )
    if (exists && shellHasPrivate) {
      onStatusNotice?.({
        kind: 'error',
        message: `${current.name} 已有当前物品脚本，每件物品至多一条。`,
      })
      return
    }
    try {
      if (!historyCoordinator)
        throw new Error('缺 EditorHistoryCoordinator，无法安全添加当前物品脚本')
      historyCoordinator.dispatch(
        new AddItemPrivateScriptCommand(item.id, `${current.name}使用脚本`, {
          replaceDetached: exists,
        }),
        new UpdateItemCommand(item.id, {
          use: {
            ...current.use,
            effects: [
              ...current.use.effects,
              {
                kind: 'runScript',
                script: { chunk: '__author-script-runtime', id: `item:${item.id}:use` },
              },
            ],
          },
        }),
      )
      onStatusNotice?.({
        kind: 'info',
        message: `已添加当前物品脚本「${current.name}使用脚本」，可直接编辑正文。`,
      })
    } catch (cause) {
      onStatusNotice?.({
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }, [historyCoordinator, item?.id, onStatusNotice, scriptSession, session])
  const reportItemEffectError = useCallback(
    (message: string): void => onStatusNotice?.({ kind: 'error', message }),
    [onStatusNotice],
  )
  const importIcon = async (file: File): Promise<void> => {
    if (!item) return
    const targetId = item.id
    try {
      const prepared = await prepareAuthoredImage(file, 'item-icon')
      const state = session.getState()
      if (!state.items.some((candidate) => candidate.id === targetId))
        throw new Error('导入完成前目标物品已被删除，未写入资源。')
      const reused = Object.entries(state.assetCatalog.assets).find(
        ([, record]) => record.kind === 'item-icon' && record.sha256 === prepared.hash,
      )?.[0]
      if (reused) {
        session.dispatch(new UpdateItemCommand(targetId, { icon: reused }))
        onStatusNotice?.({ kind: 'info', message: `已复用并绑定图标 ${reused}。` })
        return
      }
      const assetId = nextAuthoredImageId(state.assetCatalog, 'item-icon', prepared.hash)
      session.dispatch(
        new CompositeCommand('导入并设置物品图标', [
          new UpsertAssetCommand(assetId, prepared.record, prepared.bytes),
          new UpdateItemCommand(targetId, { icon: assetId }),
        ]),
      )
      onStatusNotice?.({ kind: 'info', message: `已导入并绑定图标 ${assetId}。` })
    } catch (cause) {
      onStatusNotice?.({
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    } finally {
      if (iconInputRef.current) iconInputRef.current.value = ''
    }
  }

  const enableUse = (): void => {
    try {
      patch({
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [defaultItemUseEffect('healHp', items, poisons, scriptOptions)],
        },
      })
    } catch (cause) {
      onStatusNotice?.({
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }
  const enableThrow = (): void => {
    patch({
      throw: {
        target: 'oneEnemy',
        effects: [{ kind: 'fixedDamage', amount: 1 }],
      },
    })
  }

  return (
    <>
      <DsCatalogWorkspace
        label="物品目录"
        className="outliner data-outliner item-catalog"
        contentClassName="item-catalog-list"
        header={
          <>
            {tabBar}
            <DsCatalogControls
              title="物品"
              count={items.length}
              unit="项"
              actions={[{ id: 'create-item', label: '新建物品', icon: 'add', onClick: createItem }]}
              search={{
                'aria-label': '搜索物品名称或稳定 ID',
                placeholder: '搜索名称或 id…',
                name: 'item-search',
                autoComplete: 'off',
                value: filter,
                onChange: (event) => setFilter(event.target.value),
              }}
              filters={
                <DsSelect
                  size="compact"
                  aria-label="按物品能力筛选"
                  value={filterMode}
                  onValueChange={(value) => setFilterMode(value as ItemFilter)}
                  options={ITEM_FILTERS.map((entry) => ({
                    value: entry.value,
                    label: entry.label,
                  }))}
                />
              }
            />
          </>
        }
      >
        <ItemCatalogRows
          items={shown}
          selectedId={item?.id}
          pendingIds={pendingIds}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          onSelect={selectItem}
        />
        {!items.length ? (
          <div className="item-catalog-empty">
            <strong>项目还没有物品</strong>
            <span>新建一个稳定 ID 的空白物品，再逐项添加装备、使用或投掷能力。</span>
            <DsButton onClick={createItem} size="compact" variant="primary">
              ＋ 新建第一个物品
            </DsButton>
          </div>
        ) : !shown.length ? (
          <div className="item-catalog-empty">
            <strong>没有匹配项</strong>
            <DsButton
              onClick={() => {
                setFilter('')
                setFilterMode('all')
              }}
              size="compact"
              variant="secondary"
            >
              清除筛选
            </DsButton>
            <DsButton onClick={createItem} size="compact" variant="primary">
              ＋ 新物品
            </DsButton>
          </div>
        ) : null}
      </DsCatalogWorkspace>

      <DsObjectWorkspace
        as="div"
        label="物品工作区"
        className="canvas-wrap data-body item-workbench"
        contentMode="manual"
      >
        {item ? (
          <>
            <DsObjectHero
              media={
                <ImageAssetThumbnail
                  asset={item.icon}
                  kind="item-icon"
                  reader={assetReader}
                  revision={item.icon ? assetCatalog.assets[item.icon]?.sha256 : undefined}
                  className="item-object-hero-icon"
                  alt={`${item.name}图标`}
                />
              }
              eyebrow="物品"
              title={item.name}
              objectId={item.id}
              summary="统一管理身份、交易、装备、使用与投掷能力。"
              meta={
                <div className="item-identity-badges">
                  {abilityTags(item).map((tag) => (
                    <DsTag key={tag}>{tag}</DsTag>
                  ))}
                  <DsTag tone="neutral">引用 {itemReferences.length}</DsTag>
                  {itemDiagnostics.length ? (
                    <DsTag tone="warning">待迁移 {itemDiagnostics.length}</DsTag>
                  ) : null}
                </div>
              }
              actions={
                <div className="item-title-actions">
                  <DsButton icon="copy" onClick={duplicateItem}>
                    复制
                  </DsButton>
                  {confirmDeleteId === item.id ? (
                    <span className="item-delete-confirm">
                      <span>确定删除？</span>
                      <DsButton
                        variant="danger"
                        icon="delete"
                        disabled={itemReferenceStatus !== 'current' || blockers.length > 0}
                        onClick={deleteItem}
                      >
                        确认
                      </DsButton>
                      <DsButton variant="secondary" onClick={() => setConfirmDeleteId(undefined)}>
                        取消
                      </DsButton>
                    </span>
                  ) : (
                    <DsButton
                      variant="danger"
                      icon="delete"
                      disabled={itemReferenceStatus !== 'current' || blockers.length > 0}
                      title={
                        itemReferenceStatus !== 'current'
                          ? '物品引用仍在检查，暂不能删除'
                          : blockers.length
                            ? `仍有 ${blockers.length} 处引用，请先从右侧处理`
                            : '删除物品'
                      }
                      onClick={() => setConfirmDeleteId(item.id)}
                    >
                      删除
                    </DsButton>
                  )}
                </div>
              }
            />

            <DsObjectWorkspaceContent className="et-scroll item-workbench-scroll">
              {itemDiagnostics.length ? (
                <section className="item-migration-alert" aria-label="待迁移能力">
                  <div>
                    <strong>有 {itemDiagnostics.length} 项旧版能力尚未结构化</strong>
                    <span>
                      {itemDiagnostics[0]?.target.label}：{itemDiagnostics[0]?.reason}
                    </span>
                  </div>
                  <DsButton
                    size="compact"
                    variant="secondary"
                    icon="open"
                    onClick={() => setInspectorTab('overview')}
                  >
                    查看迁移来源
                  </DsButton>
                </section>
              ) : null}

              <DsWorkbenchSection
                className="item-base-card"
                contentClassName="item-base-layout"
                title="基础信息"
                description="名称、价格与图标会直接出现在游戏菜单；稳定 ID 创建后不随改名变化。"
              >
                <section className="item-base-section item-icon-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>图标资源</h4>
                      <p>从项目资源选择，或导入新的 PNG；修改会立即反映到物品列表。</p>
                    </div>
                    {item.icon ? <code>{item.icon}</code> : <span>未绑定</span>}
                  </div>
                  <div className="item-icon-editor">
                    <ImageAssetThumbnail
                      asset={item.icon}
                      kind="item-icon"
                      reader={assetReader}
                      revision={item.icon ? assetCatalog.assets[item.icon]?.sha256 : undefined}
                      className="item-icon-preview"
                      alt={`${item.name}图标`}
                    />
                    <div className="item-icon-actions">
                      <ItemIconBrowser
                        value={item.icon}
                        catalog={assetCatalog}
                        reader={assetReader}
                        onSelect={(icon) => patch({ icon })}
                      />
                      <DsFileInput
                        ref={iconInputRef}
                        className="visually-hidden"
                        accept="image/png"
                        aria-label="导入 PNG 并设置为物品图标"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0]
                          if (file) void importIcon(file)
                        }}
                      />
                      <DsButton
                        variant="secondary"
                        size="compact"
                        icon="upload"
                        onClick={() => iconInputRef.current?.click()}
                      >
                        导入 PNG
                      </DsButton>
                      {item.icon && onOpenImage ? (
                        <DsButton
                          variant="secondary"
                          size="compact"
                          icon="open"
                          onClick={() => onOpenImage(item.icon!)}
                        >
                          在图像库打开
                        </DsButton>
                      ) : null}
                      {item.icon ? (
                        <DsButton
                          variant="danger"
                          size="compact"
                          icon="close"
                          onClick={() => patch({ icon: undefined })}
                        >
                          解除绑定
                        </DsButton>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="item-base-section item-identity-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>身份信息</h4>
                      <p>名称可随时修改；稳定 ID 用于脚本、商店与存档引用。</p>
                    </div>
                  </div>
                  <div className="item-identity-fields">
                    <DsFieldGroup>
                      <DsField id="item-name" label="名称">
                        {(field) => (
                          <DsDraftTextInput
                            name="item-name"
                            id={field.id}
                            aria-describedby={field['aria-describedby']}
                            autoComplete="off"
                            draftKey={`item:${item.id}:name`}
                            syncToken={session.getHistoryVersion()}
                            value={item.name}
                            onCommit={(value) => patch({ name: value })}
                          />
                        )}
                      </DsField>
                    </DsFieldGroup>
                    <DsReadoutList>
                      <DsReadoutRow label="稳定 ID">
                        <DsOverflowText as="code">{item.id}</DsOverflowText>
                      </DsReadoutRow>
                    </DsReadoutList>
                  </div>
                </section>

                <section className="item-base-section item-trade-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>交易信息</h4>
                      <p>价格为 0 也可保留；是否可收购决定商店回购能力。</p>
                    </div>
                  </div>
                  <div className="item-trade-fields">
                    <DsNumberFieldGrid className="item-trade-number-fields">
                      <DsDraftNumberField
                        label="买价"
                        name="item-buy-price"
                        id="item-buy-price"
                        min={0}
                        integer
                        normalize={(value) => Math.max(0, Math.floor(value))}
                        draftKey={`item:${item.id}:buyPrice`}
                        syncToken={session.getHistoryVersion()}
                        value={item.buyPrice}
                        onCommit={(value) => value !== undefined && patch({ buyPrice: value })}
                      />
                      <DsDraftNumberField
                        label="卖价"
                        name="item-sell-price"
                        id="item-sell-price"
                        min={0}
                        integer
                        normalize={(value) => Math.max(0, Math.floor(value))}
                        draftKey={`item:${item.id}:sellPrice`}
                        syncToken={session.getHistoryVersion()}
                        value={item.sellPrice}
                        onCommit={(value) => value !== undefined && patch({ sellPrice: value })}
                      />
                    </DsNumberFieldGrid>
                    <DsCheckbox
                      className="item-inline-check item-sellable"
                      label="商店可收购"
                      checked={item.sellable}
                      onChange={(event) => patch({ sellable: event.target.checked })}
                    />
                  </div>
                </section>

                <section className="item-base-section item-description-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>显示文本</h4>
                      <p>只写玩家能看到的风味说明；装备与使用效果由下方能力卡生成。</p>
                    </div>
                  </div>
                  <label className="item-field item-field-description" htmlFor="item-description">
                    <span>介绍</span>
                    <DsDraftTextArea
                      name="item-description"
                      id="item-description"
                      autoComplete="off"
                      draftKey={`item:${item.id}:description`}
                      syncToken={session.getHistoryVersion()}
                      value={item.desc.join('\n')}
                      onCommit={(value) =>
                        patch({
                          desc: value.split('\n').filter((line) => line.trim() !== ''),
                        })
                      }
                      spellCheck={false}
                    />
                  </label>
                </section>
              </DsWorkbenchSection>

              <DsWorkbenchSection
                className={`item-capability-card${equip ? ' enabled' : ''}`}
                contentClassName="item-capability-content"
                title="装备能力"
                description="决定装备槽、可装备角色及实时派生效果。"
                actions={
                  <DsSwitch
                    className="item-capability-toggle"
                    label="启用装备能力"
                    checked={!!equip}
                    onChange={(event) =>
                      patchEquip(
                        event.target.checked
                          ? { slot: 'weapon', equipableBy: [], effects: [] }
                          : undefined,
                      )
                    }
                  />
                }
              >
                {equip ? (
                  <div className="item-capability-body">
                    <div className="item-equip-options">
                      <div className="item-field">
                        <span>槽位</span>
                        <DsSelect
                          aria-label="装备槽位"
                          value={equip.slot}
                          options={SLOTS.map((slot) => ({
                            value: slot.v,
                            label: slot.label,
                          }))}
                          onValueChange={(value) =>
                            patchEquip({ ...equip, slot: value as EquipSlot })
                          }
                        />
                      </div>
                      <fieldset className="item-character-checks">
                        <legend>可装备角色</legend>
                        {actors
                          .filter((actor) => actor.battler)
                          .map((actor) => (
                            <DsCheckbox
                              key={actor.id}
                              label={lookupText(actor.name, locale)}
                              checked={equip.equipableBy.includes(actor.id)}
                              onChange={(event) => {
                                const checked = event.target.checked
                                const effects = checked
                                  ? equip.effects
                                  : equip.effects.map((effect) => {
                                      if (effect.kind !== 'battleSprite') return effect
                                      const byActor = { ...effect.byActor }
                                      delete byActor[actor.id]
                                      return { ...effect, byActor }
                                    })
                                patchEquip({
                                  ...equip,
                                  equipableBy: checked
                                    ? [...equip.equipableBy, actor.id]
                                    : equip.equipableBy.filter((id) => id !== actor.id),
                                  effects,
                                })
                              }}
                            />
                          ))}
                      </fieldset>
                    </div>
                    <EffectEditorChain
                      family="item/equipment-effects"
                      label="物品装备效果"
                    >
                      <div className="item-effect-subhead">
                        <strong>装备效果</strong>
                        <DsButton
                          data-effect-editor-add="true"
                          size="compact"
                          variant="secondary"
                          icon="add"
                          className="item-effect-add-button"
                          onClick={() =>
                            patchEquip({
                              ...equip,
                              effects: [...equip.effects, defaultEquipEffect('statBonus')],
                            })
                          }
                        >
                          添加效果
                        </DsButton>
                      </div>
                      <DsReorderCollection
                        adoptionId="item/equipment-effects"
                        scopeKey={`item:${item.id}:equip.effects`}
                        entries={equip.effects.map((effect, index) => ({
                          key: equipEffectReorderKeys.keys[index]!,
                          label:
                            EFFECT_KINDS.find((kind) => kind.v === effect.kind)?.label ??
                            effect.kind,
                        }))}
                        revision={session.getHistoryVersion()}
                        onReorder={reorderEquipEffects}
                      >
                        <ol className="effect-editor-list item-equip-effect-list">
                          {equip.effects.map((effect, index) => {
                            const reorderKey = equipEffectReorderKeys.keys[index]!
                            return (
                              <EffectEditorCard
                                key={reorderKey}
                                itemKey={reorderKey}
                                label={`装备效果 ${index + 1}`}
                                density="compact"
                                effectKind={effect.kind}
                                kindControl={
                                  <DsSelect
                                    size="compact"
                                    aria-label={`装备效果 ${index + 1} 类型`}
                                    value={effect.kind}
                                    options={EFFECT_KINDS.map((kind) => ({
                                      value: kind.v,
                                      label: kind.label,
                                      disabled:
                                        kind.v === 'battleSprite' &&
                                        effect.kind !== 'battleSprite' &&
                                        equip.effects.some(
                                          (candidate) => candidate.kind === 'battleSprite',
                                        ),
                                    }))}
                                    onValueChange={(value) => {
                                      try {
                                        setEquipEffect(
                                          index,
                                          defaultEquipEffect(value as EquipEffect['kind']),
                                        )
                                        onStatusNotice?.(undefined)
                                      } catch (cause) {
                                        onStatusNotice?.({
                                          kind: 'error',
                                          message:
                                            cause instanceof Error ? cause.message : String(cause),
                                        })
                                      }
                                    }}
                                  />
                                }
                                fieldsLayout="equipment"
                                onRemove={() => {
                                  equipEffectReorderKeys.remove(index)
                                  patchEquip({
                                    ...equip,
                                    effects: equip.effects.filter((_, at) => at !== index),
                                  })
                                }}
                              >
                                <EquipEffectFields
                                  e={effect}
                                  draftKey={`item:${item.id}:equip.effects.${reorderKey}`}
                                  syncToken={session.getHistoryVersion()}
                                  skills={skills}
                                  battleSprites={battleSprites}
                                  actors={actors}
                                  equipableBy={equip.equipableBy}
                                  locale={locale}
                                  on={(next) => setEquipEffect(index, next)}
                                  onOpenBattleSprite={onOpenBattleSprite}
                                />
                              </EffectEditorCard>
                            )
                          })}
                        </ol>
                      </DsReorderCollection>
                      {!equip.effects.length ? (
                        <div className="item-capability-note">
                          当前是纯剧情/风味装备，没有数值效果。
                        </div>
                      ) : null}
                      <div className="eq-derived">
                        <span className="lb">玩家看到</span>
                        {derived.length ? (
                          <div className="eq-derived-lines">
                            {derived.map((line, index) => (
                              <div key={`${item.id}-derived-${index}`}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="hint2">(无机制效果)</span>
                        )}
                      </div>
                    </EffectEditorChain>
                  </div>
                ) : (
                  <div className="item-capability-empty">开启后可配置槽位、角色和装备效果。</div>
                )}
              </DsWorkbenchSection>

              <DsWorkbenchSection
                className={`item-capability-card${item.use ? ' enabled' : ''}`}
                contentClassName="item-capability-content"
                title="使用能力"
                description="可组合回复、状态、剧情脚本、场景出口、合成和资源池等现代化效果。"
                actions={
                  <DsSwitch
                    className="item-capability-toggle"
                    label="启用使用能力"
                    checked={!!item.use}
                    onChange={(event) => (event.target.checked ? enableUse() : patchUse(undefined))}
                  />
                }
              >
                {item.use ? (
                  <div className="item-capability-body">
                    <DsFieldGroup>
                      <DsField id="item-use-sound" label="使用音效" className="item-sound-row">
                        {(field) => (
                          <SoundPicker
                            id={field.id}
                            value={item.use!.sound}
                            onChange={(sound) => patch({ use: withSound(item.use!, sound) })}
                            catalog={assetCatalog}
                            reader={assetReader}
                            allowUnset
                            ariaLabel="使用音效"
                            onOpenAsset={onOpenSound}
                          />
                        )}
                      </DsField>
                    </DsFieldGroup>
                    <ItemEffectChainEditor
                      ability="use"
                      spec={item.use}
                      items={items}
                      poisons={poisons}
                      scripts={scriptOptions}
                      onChange={patchUse}
                      onOpenScript={onOpenScript}
                      onError={reportItemEffectError}
                      itemId={item.id}
                      scenes={editorState.scenes as readonly SceneDef[]}
                      privateScripts={privateScripts('use')}
                      onAddPrivateScript={script ? addPrivateScript : undefined}
                      draftScope={`item:${item.id}:use`}
                      syncToken={session.getHistoryVersion()}
                    />
                  </div>
                ) : (
                  <div className="item-capability-empty">
                    开启后可定义目标、消耗规则和结构化效果链。
                  </div>
                )}
              </DsWorkbenchSection>

              <DsWorkbenchSection
                className={`item-capability-card${item.throw ? ' enabled' : ''}`}
                contentClassName="item-capability-content"
                title="投掷能力"
                description="用于战斗中的投掷效果与命中特效；与“使用”能力可同时存在。"
                actions={
                  <DsSwitch
                    className="item-capability-toggle"
                    label="启用投掷能力"
                    checked={!!item.throw}
                    onChange={(event) =>
                      event.target.checked ? enableThrow() : patch({ throw: undefined })
                    }
                  />
                }
              >
                {item.throw ? (
                  <div className="item-capability-body">
                    <DsFieldGroup>
                      <DsField id="item-throw-sound" label="投掷音效" className="item-sound-row">
                        {(field) => (
                          <SoundPicker
                            id={field.id}
                            value={item.throw!.sound}
                            onChange={(sound) => patch({ throw: withSound(item.throw!, sound) })}
                            catalog={assetCatalog}
                            reader={assetReader}
                            allowUnset
                            ariaLabel="投掷音效"
                            onOpenAsset={onOpenSound}
                          />
                        )}
                      </DsField>
                    </DsFieldGroup>
                    <div className="item-throw-presentation">
                      <div className="item-effect-subhead">
                        <DsSwitch
                          label="法术特效演出"
                          checked={!!item.throw.presentation}
                          onChange={(event) => {
                            if (event.target.checked) {
                              patchThrow({
                                ...item.throw!,
                                presentation: {
                                  kind: 'magic',
                                  animation: { effectSprite: 0, placement: 'normal' },
                                },
                              })
                            } else {
                              const next = { ...item.throw! }
                              delete next.presentation
                              patchThrow(next)
                            }
                          }}
                        />
                      </div>
                      {item.throw.presentation ? (
                        <SkillAnimationEditor
                          animation={item.throw.presentation.animation}
                          onChange={(animation) =>
                            patchThrow({
                              ...item.throw!,
                              presentation: { kind: 'magic', animation },
                            })
                          }
                          assetCatalog={assetCatalog}
                          assetReader={assetReader}
                          assetBase={assetBase}
                          onOpenSound={onOpenSound}
                          draftScope={`item:${item.id}:throw.presentation.animation`}
                          syncToken={session.getHistoryVersion()}
                        />
                      ) : (
                        <p className="item-effect-help">
                          可选。用于配置与伤害、施毒相互独立的 FIRE 命中特效。
                        </p>
                      )}
                    </div>
                    <ThrowEffectChainEditor
                      spec={item.throw}
                      poisons={poisons}
                      onChange={patchThrow}
                      onError={(message) => onStatusNotice?.({ kind: 'error', message })}
                      draftScope={`item:${item.id}:throw`}
                      syncToken={session.getHistoryVersion()}
                    />
                  </div>
                ) : (
                  <div className="item-capability-empty">
                    开启后可配置单体或全体目标，以及完整的结构化投掷效果链。
                  </div>
                )}
              </DsWorkbenchSection>
            </DsObjectWorkspaceContent>
          </>
        ) : (
          <div className="item-workbench-empty">
            <strong>{items.length ? '当前筛选没有可编辑项' : '创建第一个物品开始编辑'}</strong>
            <DsButton onClick={createItem} size="compact" variant="primary">
              ＋ 新建物品
            </DsButton>
          </div>
        )}
      </DsObjectWorkspace>

      <DsInspectorHost as="aside" className="inspector inspector--tabbed item-inspector">
        <div className="insp-head">
          <div className="what">物品</div>
          <div className="who">{item?.name ?? '未选择'}</div>
        </div>
        {!item ? (
          <div className="insp-empty">选择或新建一个物品。</div>
        ) : (
          <DsInspectorTabs
            id="item-inspector"
            label="物品检查器"
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as ItemInspectorTab)}
            items={[
              {
                id: 'overview',
                label: '概览',
                panel: (
                  <div className="item-inspector-scroll">
                    <DsInspectorSection title="能力摘要">
                      <DsPropertyGrid>
                        <DsPropertyRow label="装备">
                          {item.equip
                            ? `${SLOTS.find((slot) => slot.v === item.equip?.slot)?.label} · ${item.equip.effects.length} 个效果`
                            : '未启用'}
                        </DsPropertyRow>
                        <DsPropertyRow label="使用">
                          {item.use ? `${item.use.effects.length} 个效果` : '未启用'}
                        </DsPropertyRow>
                        <DsPropertyRow label="投掷">
                          {item.throw ? `${item.throw.effects.length} 个效果` : '未启用'}
                        </DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                    {item.use ? (
                      <DsInspectorSection title="使用时发生什么">
                        <ul className="item-summary-list">
                          {summarizeUse(item, items).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </DsInspectorSection>
                    ) : null}
                    {itemDiagnostics.length ? (
                      <DsDiagnosticPanel
                        state="ready"
                        count={{ kind: 'exact', errors: 0, warnings: itemDiagnostics.length }}
                        summary="待迁移来源"
                        description="旧版脚本源只读且未载入编辑器；请在项目问题面板核对诊断。"
                      >
                        <DsDiagnosticList>
                          {itemDiagnostics.map((diagnostic) => (
                            <DsDiagnosticRow
                              key={diagnostic.id}
                              severity="warning"
                              title={diagnostic.target.label}
                              code={diagnostic.id}
                              detail={diagnostic.reason}
                              path={`${diagnostic.source.label} · 0x${diagnostic.source.address.toString(16)}`}
                              action={
                                onOpenProjectIssues
                                  ? {
                                      label: '在问题面板查看',
                                      onActivate: onOpenProjectIssues,
                                    }
                                  : undefined
                              }
                              statusLabel="无法定位"
                            />
                          ))}
                        </DsDiagnosticList>
                      </DsDiagnosticPanel>
                    ) : null}
                  </div>
                ),
              },
              {
                id: 'references',
                label: '引用',
                count: itemReferences.length,
                panel: (
                  <div className="item-inspector-scroll">
                    <DsReferencePanel
                      state={itemReferencePanelState}
                      count={itemReferenceCount}
                      impact={{
                        kind: blockers.length ? 'blocking' : 'informational',
                        label: blockers.length ? '阻断删除' : '仅信息',
                        description: itemReferences.length
                          ? '保留来源分组与判断、获得、失去、消耗、持有或配置语义。'
                          : '全项目没有判断、获得、失去、消耗、持有或配置此物品。',
                      }}
                      summary={
                        blockers.length
                          ? `${blockers.length} 处会阻断删除 · 共 ${itemReferences.length} 处引用`
                          : undefined
                      }
                    >
                      {itemReferences.length
                        ? groupReferences(itemReferences).map((group) => (
                            <DsReferenceGroup
                              key={group.source}
                              title={SOURCE_LABEL[group.source]}
                              count={group.entries.length}
                            >
                              <DsReferenceList>
                                {group.entries.map((reference) => {
                                  const blocksDelete = reference.ownerItemId !== item?.id
                                  return (
                                    <DsReferenceRow
                                      key={`${reference.where}:${reference.detail}`}
                                      title={reference.label}
                                      detail={reference.detail}
                                      path={reference.where}
                                      labels={[
                                        { label: ACCESS_LABEL[reference.access] },
                                        {
                                          label: blocksDelete ? '阻断删除' : '内部引用',
                                          tone: blocksDelete ? 'warning' : 'neutral',
                                        },
                                      ]}
                                      action={
                                        reference.locator && onOpenItemReference
                                          ? {
                                              label: '打开',
                                              onActivate: () => onOpenItemReference(reference),
                                            }
                                          : undefined
                                      }
                                      status={
                                        reference.locator && onOpenItemReference
                                          ? undefined
                                          : {
                                              label: reference.unavailableReason
                                                ? '暂不可定位'
                                                : '只读',
                                              reason:
                                                reference.unavailableReason ??
                                                '当前来源没有可编辑的精确位置。',
                                              tone: reference.unavailableReason
                                                ? 'warning'
                                                : 'neutral',
                                            }
                                      }
                                    />
                                  )
                                })}
                              </DsReferenceList>
                            </DsReferenceGroup>
                          ))
                        : null}
                    </DsReferencePanel>
                  </div>
                ),
              },
            ]}
          />
        )}
      </DsInspectorHost>
    </>
  )
}
