/**
 * 物品工作台：左侧 catalog，中间身份/基础信息/正交能力，右侧概览/引用/资源检查器。
 * 装备、使用和投掷都以结构化数据为唯一真相源；说明只负责风味文字。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetId,
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
  ScriptRef,
  SkillData,
  StatusId,
  ThrowSpec,
  UseSpec,
} from '@type-pal/content'
import {
  createScriptIndex,
  deriveScriptChunk,
  describeEquipEffects,
  lookupText,
} from '@type-pal/content'
import {
  type AssetBase,
  type AudioAssetReader,
  isV5RuntimeScriptRef,
  v5RuntimeScriptRef,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AddItemCommand,
  CompositeCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  UpdateStartWorldCommand,
  UpsertAssetCommand,
  UpsertAuthoredScriptCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { nextAuthoredImageId, prepareAuthoredImage } from '../core/image-import.js'
import { cloneItemForAuthoring, createBlankItem } from '../core/item-authoring.js'
import {
  blockingItemReferences,
  type ItemReference,
  itemReferenceMap,
} from '../core/item-references.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import {
  AddItemPrivateScriptV5Command,
  type ScriptEditorStateV5,
  type ScriptV5EditSession,
  SetItemPrivateScriptBodyV5Command,
} from '../core/script-v5-editor.js'
import { createAuthoredScriptId } from '../core/shared-script.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import type { CanonicalScriptEditorContextV5 } from './CanonicalScriptEditorV5.js'
import { ImageAssetThumbnail, imageAssetLabel, imageAssets } from './ImageAssetPicker.js'
import {
  defaultItemUseEffect,
  ItemEffectChainEditor,
  type ItemScriptOption,
  ThrowEffectChainEditor,
} from './ItemUseEffectEditor.js'
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

function Num(props: { v: number; on: (n: number) => void; w?: number }) {
  return (
    <input
      className="in mono ef-num"
      type="number"
      style={props.w ? { width: props.w } : undefined}
      value={props.v}
      onChange={(e) =>
        props.on(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)
      }
      onWheel={(e) => e.currentTarget.blur()}
    />
  )
}

/** 单条装备效果的分支字段(镜像 SkillTab 的 EffectFields)。 */
function EquipEffectFields(props: {
  e: EquipEffect
  skills: SkillData[]
  battleSprites: readonly BattleSpriteDef[]
  actors: readonly ActorDef[]
  equipableBy: readonly string[]
  locale: Locale
  on: (next: EquipEffect) => void
  onOpenBattleSprite?: (id: string) => void
}) {
  const { e, skills, battleSprites, actors, equipableBy, locale, on, onOpenBattleSprite } = props
  switch (e.kind) {
    case 'statBonus':
      return (
        <>
          <label>
            <span>属性</span>
            <select
              className="in"
              value={e.stat}
              onChange={(ev) => on({ ...e, stat: ev.target.value as CombatStat })}
            >
              {STATS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>加/减</span>
            <Num v={e.delta} on={(n) => on({ ...e, delta: n })} />
          </label>
        </>
      )
    case 'maxPool':
      return (
        <>
          <label>
            <span>池</span>
            <select
              className="in"
              value={e.pool}
              onChange={(ev) => on({ ...e, pool: ev.target.value as 'hp' | 'mp' })}
            >
              <option value="hp">体力上限</option>
              <option value="mp">真气上限</option>
            </select>
          </label>
          <label>
            <span>加/减</span>
            <Num v={e.delta} on={(n) => on({ ...e, delta: n })} />
          </label>
        </>
      )
    case 'resistance':
      return (
        <>
          <label>
            <span>五灵/毒</span>
            <select
              className="in"
              value={e.element}
              onChange={(ev) => on({ ...e, element: ev.target.value as ResElem })}
            >
              {RES_ELEMS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>抗 %</span>
            <Num v={e.percent} on={(n) => on({ ...e, percent: n })} />
          </label>
        </>
      )
    case 'grantStatus':
      return (
        <label>
          <span>状态</span>
          <select
            className="in"
            value={e.status}
            onChange={(ev) => on({ ...e, status: ev.target.value as StatusId })}
          >
            {STATUSES.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )
    case 'grantSkill':
      return (
        <label>
          <span>技能</span>
          <select
            className="in"
            value={e.skillId}
            onChange={(ev) => on({ ...e, skillId: ev.target.value })}
          >
            <option value="">(选技能)</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )
    case 'regenHp':
    case 'regenMp':
      return (
        <label>
          <span>每回合</span>
          <Num v={e.amount} on={(n) => on({ ...e, amount: n })} />
        </label>
      )
    case 'battleSprite':
      return (
        <div className="item-battle-sprite-map">
          {equipableBy.map((actorId) => {
            const actor = actors.find((candidate) => candidate.id === actorId)
            const value = e.byActor[actorId]
            return (
              <div className="item-battle-sprite-row" key={actorId}>
                <span>{actor ? lookupText(actor.name, locale) : actorId}</span>
                <BattleSpritePicker
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
              </div>
            )
          })}
          {!equipableBy.length ? <span className="hint2">请先勾选至少一个可装备角色。</span> : null}
        </div>
      )
    default:
      return <span className="hint2 item-effect-no-params">(无参数)</span>
  }
}

type ItemFilter = 'all' | 'equip' | 'use' | 'throw' | 'referenced' | 'pending'
type ItemInspectorTab = 'overview' | 'references' | 'resource'

const ITEM_INSPECTOR_TABS: readonly {
  value: ItemInspectorTab
  label: (referenceCount: number) => string
}[] = [
  { value: 'overview', label: () => '概览' },
  { value: 'references', label: (count) => `引用 ${count}` },
  { value: 'resource', label: () => '资源' },
]

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
    triggerRef.current?.focus()
  }

  return (
    <div className="item-icon-browser">
      <button
        ref={triggerRef}
        type="button"
        className="item-action-button item-action-button-primary"
        aria-expanded={open}
        aria-controls="item-icon-browser-panel"
        onClick={() => setOpen((value) => !value)}
      >
        🖼️ 选择已有图标…
      </button>
      {open ? (
        <div
          id="item-icon-browser-panel"
          className="item-icon-browser-panel"
          role="dialog"
          aria-label="选择物品图标"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            close()
          }}
        >
          <div className="item-icon-browser-toolbar">
            <label className="visually-hidden" htmlFor="item-icon-filter">
              搜索物品图标
            </label>
            <input
              ref={filterRef}
              id="item-icon-filter"
              className="in"
              placeholder="搜索图标名称或 AssetId…"
              autoComplete="off"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <span>{shown.length} 项</span>
          </div>
          <fieldset className="item-icon-browser-grid" aria-label="物品图标">
            <button
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
            </button>
            {shown.map((option) => (
              <button
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
              </button>
            ))}
          </fieldset>
          {!shown.length ? <div className="insp-empty">没有匹配的图标资源。</div> : null}
        </div>
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
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenScript?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
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
  scriptV5?: {
    state: ScriptEditorStateV5
    session: ScriptV5EditSession
  }
  historyCoordinator?: EditorHistoryCoordinator
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
    onOpenSound,
    onOpenImage,
    onOpenScript,
    onOpenBattleSprite,
    onOpenItemReference,
    onOpenProjectIssues,
    focusObjectId,
    focusPrivateScript,
    onObjectFocus,
    onStatusNotice,
    tabBar,
    scriptV5,
    historyCoordinator,
  } = props
  const [filter, setFilter] = useState('')
  const [filterMode, setFilterMode] = useState<ItemFilter>('all')
  const [selId, setSelId] = useState(items[0]?.id ?? '')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>()
  const [confirmScriptReplaceId, setConfirmScriptReplaceId] = useState<string>()
  const [inspectorTab, setInspectorTab] = useState<ItemInspectorTab>('overview')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const iconInputRef = useRef<HTMLInputElement>(null)
  const deletedSelectionRef = useRef<{ id: string; sawAbsent: boolean } | undefined>(undefined)
  const editorState = session.getState()
  const referenceMap = useMemo(
    () => itemReferenceMap(editorState, scriptV5?.state),
    [editorState, scriptV5?.state],
  )
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
  const itemDiagnostics = item
    ? diagnostics.filter(
        (diagnostic) =>
          diagnostic.target.objectId === item.id && !item[diagnostic.target.capability],
      )
    : []
  useEffect(() => {
    setDescriptionDraft(item?.desc.join('\n') ?? '')
  }, [item?.desc])
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
  const scriptOptions = (() => {
    if (scriptV5)
      return Object.entries(scriptV5.state.sharedScripts)
        .map(([id, script]) => ({
          ref: v5RuntimeScriptRef(id),
          label: `${script.name} · ${id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
    const index = session.getState().scriptIndex
    if (!index) return []
    return Object.entries(index.library ?? {})
      .flatMap(([id, meta]) => {
        const chunk = deriveScriptChunk(id, index.shards)
        return chunk ? [{ ref: { id, chunk }, label: `${meta.name} · ${id}` }] : []
      })
      .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  })() as ItemScriptOption[]
  const canonicalScriptEditorContextV5 = useMemo<CanonicalScriptEditorContextV5 | undefined>(() => {
    if (!scriptV5) return undefined
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
      authorScripts: Object.entries(scriptV5.state.sharedScripts).map(([id, script]) => ({
        id,
        name: script.name,
      })),
    })
    return {
      state: scriptV5.state,
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
    }
  }, [
    actors,
    assetBase,
    assetCatalog,
    assetReader,
    audioResolver,
    battleSprites,
    items,
    locale,
    onOpenBattleSprite,
    onOpenImage,
    onOpenScript,
    onOpenSound,
    scriptV5,
    session,
    skills,
  ])
  const privateScriptsV5 = (slot: 'use' | 'throw') => {
    const storedItem = scriptV5?.session
      .getState()
      .items.find((candidate) => candidate.id === item?.id)
    const stored = new Map(
      (storedItem?.[slot]?.effects ?? []).flatMap((effect, canonicalIndex) =>
        effect.kind === 'itemPrivateScript'
          ? [[effect.script.id, { effect, canonicalIndex }] as const]
          : [],
      ),
    )
    const prefix = item ? `item:${item.id}:` : ''
    return Object.fromEntries(
      (item?.[slot]?.effects ?? []).flatMap((shellEffect, shellIndex) => {
        if (
          shellEffect.kind !== 'runScript' ||
          !isV5RuntimeScriptRef(shellEffect.script) ||
          !shellEffect.script.id.startsWith(prefix)
        )
          return []
        const privateId = shellEffect.script.id.slice(prefix.length)
        const source = stored.get(privateId as 'use')
        if (!source) return []
        const { effect, canonicalIndex } = source
        return [
          [
            shellIndex,
            {
              label: effect.script.label ?? `${item?.name ?? item?.id}私有脚本`,
              body: effect.script.body,
              editorContext: canonicalScriptEditorContextV5,
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
                scriptV5?.session.dispatch(
                  new SetItemPrivateScriptBodyV5Command(storedItem!.id, slot, canonicalIndex, body),
                ),
            },
          ] as const,
        ]
      }),
    )
  }

  const patch = (next: Partial<Omit<ItemData, 'id'>>): void => {
    if (item) session.dispatch(new UpdateItemCommand(item.id, next))
  }
  const patchUse = (next: UseSpec): void => {
    if (!item) return
    patch({ use: next })
  }
  const patchThrow = (next: ThrowSpec): void => {
    if (!item) return
    patch({ throw: next })
  }
  const equip = item?.equip
  const patchEquip = (next: EquipSpec | undefined): void => patch({ equip: next })
  const setEquipEffect = (index: number, next: EquipEffect): void => {
    if (!equip) return
    const effects = [...equip.effects]
    effects[index] = next
    patchEquip({ ...equip, effects })
  }
  const derived = equip
    ? describeEquipEffects(equip.effects, { skillName, battleSpriteName, actorName })
    : []

  const selectItem = (id: string): void => {
    setSelId(id)
    setConfirmDeleteId(undefined)
    setConfirmScriptReplaceId(undefined)
    onObjectFocus?.(id)
  }
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
    const currentBlockers = blockingItemReferences(
      session.getState(),
      item.id,
      scriptV5?.session.getState(),
    )
    if (currentBlockers.length) {
      setInspectorTab('references')
      setConfirmDeleteId(undefined)
      onStatusNotice?.({
        kind: 'error',
        message: `${item.name} 仍被 ${currentBlockers.length} 处引用；请先在右侧“引用”逐项处理。`,
      })
      return
    }
    const index = items.findIndex((candidate) => candidate.id === item.id)
    const next = items[index + 1]?.id ?? items[index - 1]?.id ?? ''
    try {
      deletedSelectionRef.current = { id: item.id, sawAbsent: false }
      session.dispatch(
        new DeleteItemCommand(item.id, scriptV5 ? () => scriptV5.session.getState() : undefined),
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
  const createAndBindScript = (confirmed = false): void => {
    if (!item) return
    if (scriptV5) {
      onStatusNotice?.({
        kind: 'error',
        message: 'v5 共享脚本必须从具名共享库创建；物品私有逻辑请直接编辑当前物品内联正文。',
      })
      return
    }
    const state = session.getState()
    const current = state.items.find((candidate) => candidate.id === item.id)
    if (!current) return
    if (!confirmed && current.use?.effects.length) {
      setConfirmScriptReplaceId(current.id)
      onStatusNotice?.({
        kind: 'info',
        message: '共享剧情脚本必须独占用途链；确认后会替换当前效果。',
      })
      return
    }
    const index = state.scriptIndex ?? createScriptIndex()
    const id = createAuthoredScriptId(`${current.name}使用`, Object.keys(index.library ?? {}))
    const chunk = deriveScriptChunk(id, index.shards)
    if (!chunk) {
      onStatusNotice?.({ kind: 'error', message: `无法为 ${id} 推导脚本分片。` })
      return
    }
    const script: ScriptRef = { id, chunk }
    const nextUse: UseSpec = {
      ...(current.use ?? { consuming: true, effects: [] }),
      target: 'scene',
      effects: [{ kind: 'runScript', script }],
      menuAfterUse: current.use?.menuAfterUse ?? 'close',
    }
    delete nextUse.battleOnly
    session.dispatch(
      new CompositeCommand('新建并绑定物品使用脚本', [
        new UpsertAuthoredScriptCommand(id, { name: `${current.name}使用`, self: 'none' }, []),
        new UpdateItemCommand(current.id, { use: nextUse }),
      ]),
    )
    setConfirmScriptReplaceId(undefined)
    onStatusNotice?.({ kind: 'info', message: `已创建并绑定 ${id}。` })
    onOpenScript?.(id)
  }
  /** 新建私有脚本是一个跨 session 作者事务；正文与 shell ref 必须成对撤销/重做。 */
  const addPrivateScript = (): void => {
    if (!item || !scriptV5) return
    const storedItem = scriptV5.session
      .getState()
      .items.find((candidate) => candidate.id === item.id)
    const exists = (storedItem?.use?.effects ?? []).some(
      (effect) => effect.kind === 'itemPrivateScript',
    )
    if (exists) {
      onStatusNotice?.({ kind: 'error', message: `${item.name} 已有私有脚本,每件物品至多一条。` })
      return
    }
    try {
      if (!historyCoordinator) throw new Error('缺 EditorHistoryCoordinator，禁止拆分创建私有脚本')
      const current = session.getState().items.find((candidate) => candidate.id === item.id)
      if (!current?.use) throw new Error(`${item.id}.use 不存在，无法绑定私有脚本`)
      historyCoordinator.dispatch(
        new AddItemPrivateScriptV5Command(item.id, `${item.name}私有脚本`),
        new UpdateItemCommand(item.id, {
          use: {
            ...current.use,
            effects: [
              ...current.use.effects,
              {
                kind: 'runScript',
                script: { chunk: '__script-v5-runtime', id: `item:${item.id}:use` },
              },
            ],
          },
        }),
      )
      onStatusNotice?.({
        kind: 'info',
        message: `已新建私有脚本「${item.name}私有脚本」,可直接编辑正文。`,
      })
    } catch (cause) {
      onStatusNotice?.({
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }
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
      <div className="outliner data-outliner item-catalog">
        {tabBar}
        <div className="pane-h item-catalog-head">
          <span className="t">物品</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{items.length}
          </span>
          <span className="item-catalog-actions">
            <button
              type="button"
              className="item-action-button item-action-button-primary item-catalog-create"
              onClick={createItem}
            >
              ＋ 新建
            </button>
          </span>
        </div>
        <div className="item-catalog-tools">
          <input
            aria-label="搜索物品名称或稳定 ID"
            className="in"
            placeholder="搜索名称或 id…"
            name="item-search"
            autoComplete="off"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <fieldset className="item-filter-chips">
            <legend className="visually-hidden">按物品能力筛选</legend>
            {ITEM_FILTERS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={filterMode === entry.value ? 'active' : undefined}
                aria-pressed={filterMode === entry.value}
                onClick={() => setFilterMode(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="sprite-list item-catalog-list">
          {shown.map((candidate) => {
            const tags = abilityTags(candidate)
            const refs = referenceMap.get(candidate.id)?.length ?? 0
            return (
              <button
                type="button"
                key={candidate.id}
                className={`arow item-catalog-row${candidate.id === item?.id ? ' sel' : ''}`}
                onClick={() => selectItem(candidate.id)}
              >
                <span className="face">
                  <ImageAssetThumbnail
                    asset={candidate.icon}
                    kind="item-icon"
                    reader={assetReader}
                    revision={
                      candidate.icon ? assetCatalog.assets[candidate.icon]?.sha256 : undefined
                    }
                    className="item-list-icon"
                  />
                </span>
                <span className="nm">
                  <span className="item-row-title">{candidate.name}</span>
                  <small className="mono">{candidate.id}</small>
                  <span className="item-row-badges">
                    {tags.map((tag) => (
                      <span className="item-badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                    {refs ? <span className="item-badge muted">引用 {refs}</span> : null}
                    {pendingIds.has(candidate.id) ? (
                      <span className="item-badge warn">待迁移</span>
                    ) : null}
                  </span>
                </span>
              </button>
            )
          })}
          {!items.length ? (
            <div className="item-catalog-empty">
              <strong>工程还没有物品</strong>
              <span>新建一个稳定 ID 的空白物品，再逐项添加装备、使用或投掷能力。</span>
              <button type="button" className="tool primary" onClick={createItem}>
                ＋ 新建第一个物品
              </button>
            </div>
          ) : !shown.length ? (
            <div className="item-catalog-empty">
              <strong>没有匹配项</strong>
              <button
                type="button"
                className="tool"
                onClick={() => {
                  setFilter('')
                  setFilterMode('all')
                }}
              >
                清除筛选
              </button>
              <button type="button" className="tool primary" onClick={createItem}>
                ＋ 新物品
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="canvas-wrap data-body item-workbench">
        {item ? (
          <div className="et-scroll item-workbench-scroll">
            <header className="item-workbench-title">
              <div className="item-identity-main">
                <ImageAssetThumbnail
                  asset={item.icon}
                  kind="item-icon"
                  reader={assetReader}
                  revision={item.icon ? assetCatalog.assets[item.icon]?.sha256 : undefined}
                  className="item-identity-icon"
                  alt={`${item.name}图标`}
                />
                <div>
                  <span className="item-kicker">物品定义</span>
                  <h2>{item.name}</h2>
                  <code>{item.id}</code>
                  <div className="item-identity-badges">
                    {abilityTags(item).map((tag) => (
                      <span className="item-badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                    <span className="item-badge muted">引用 {itemReferences.length}</span>
                    {itemDiagnostics.length ? (
                      <span className="item-badge warn">待迁移 {itemDiagnostics.length}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="item-title-actions">
                <button
                  type="button"
                  className="item-action-button item-action-button-compact"
                  onClick={duplicateItem}
                >
                  ⧉ 复制
                </button>
                {confirmDeleteId === item.id ? (
                  <span className="item-delete-confirm">
                    <span>确定删除？</span>
                    <button
                      type="button"
                      className="item-action-button item-action-button-danger item-action-button-compact"
                      onClick={deleteItem}
                    >
                      确认
                    </button>
                    <button
                      type="button"
                      className="item-action-button item-action-button-compact"
                      onClick={() => setConfirmDeleteId(undefined)}
                    >
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="item-action-button item-action-button-danger item-action-button-compact"
                    onClick={() => setConfirmDeleteId(item.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            </header>

            {itemDiagnostics.length ? (
              <section className="item-migration-alert" aria-label="待迁移能力">
                <div>
                  <strong>有 {itemDiagnostics.length} 项旧版能力尚未结构化</strong>
                  <span>
                    {itemDiagnostics[0]?.target.label}：{itemDiagnostics[0]?.reason}
                  </span>
                </div>
                <button
                  type="button"
                  className="item-action-button item-action-button-warning item-action-button-compact"
                  onClick={() => setInspectorTab('overview')}
                >
                  查看迁移来源 ↗
                </button>
              </section>
            ) : null}

            <section className="item-card item-base-card">
              <div className="item-card-heading">
                <div>
                  <h3>基础信息</h3>
                  <p>名称、价格与图标会直接出现在游戏菜单；稳定 ID 创建后不随改名变化。</p>
                </div>
              </div>
              <div className="item-base-layout">
                <section className="item-base-section item-icon-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>图标资源</h4>
                      <p>从工程资源选择，或导入新的 PNG；修改会立即反映到物品列表。</p>
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
                      <input
                        ref={iconInputRef}
                        className="visually-hidden"
                        type="file"
                        accept="image/png"
                        aria-label="导入 PNG 并设置为物品图标"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0]
                          if (file) void importIcon(file)
                        }}
                      />
                      <button
                        type="button"
                        className="item-action-button"
                        onClick={() => iconInputRef.current?.click()}
                      >
                        导入 PNG…
                      </button>
                      {item.icon && onOpenImage ? (
                        <button
                          type="button"
                          className="item-action-button"
                          onClick={() => onOpenImage(item.icon!)}
                        >
                          在图像库打开 ↗
                        </button>
                      ) : null}
                      {item.icon ? (
                        <button
                          type="button"
                          className="item-action-button item-action-button-danger"
                          onClick={() => patch({ icon: undefined })}
                        >
                          解除绑定
                        </button>
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
                    <label className="item-field">
                      <span>名称</span>
                      <input
                        className="in"
                        name="item-name"
                        autoComplete="off"
                        value={item.name}
                        onChange={(event) => patch({ name: event.target.value })}
                      />
                    </label>
                    <div className="item-readonly-field">
                      <span>稳定 ID</span>
                      <code>{item.id}</code>
                    </div>
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
                    <label className="item-field">
                      <span>买价</span>
                      <input
                        className="in mono"
                        name="item-buy-price"
                        type="number"
                        min={0}
                        value={item.buyPrice}
                        onWheel={(event) => event.currentTarget.blur()}
                        onChange={(event) =>
                          patch({
                            buyPrice: Math.max(
                              0,
                              Math.floor(event.currentTarget.valueAsNumber || 0),
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="item-field">
                      <span>卖价</span>
                      <input
                        className="in mono"
                        name="item-sell-price"
                        type="number"
                        min={0}
                        value={item.sellPrice}
                        onWheel={(event) => event.currentTarget.blur()}
                        onChange={(event) =>
                          patch({
                            sellPrice: Math.max(
                              0,
                              Math.floor(event.currentTarget.valueAsNumber || 0),
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="item-inline-check item-sellable">
                      <input
                        className="item-checkbox"
                        type="checkbox"
                        checked={item.sellable}
                        onChange={(event) => patch({ sellable: event.target.checked })}
                      />
                      商店可收购
                    </label>
                  </div>
                </section>

                <section className="item-base-section item-description-section">
                  <div className="item-base-section-heading">
                    <div>
                      <h4>显示文本</h4>
                      <p>只写玩家能看到的风味说明；装备与使用效果由下方能力卡生成。</p>
                    </div>
                  </div>
                  <label className="item-field item-field-description">
                    <span>介绍</span>
                    <textarea
                      className="in cf-ta"
                      name="item-description"
                      autoComplete="off"
                      value={descriptionDraft}
                      onChange={(event) => setDescriptionDraft(event.target.value)}
                      onBlur={(event) =>
                        patch({
                          desc: event.target.value.split('\n').filter((line) => line.trim() !== ''),
                        })
                      }
                      spellCheck={false}
                    />
                  </label>
                </section>
              </div>
            </section>

            <section className={`item-card item-capability-card${equip ? ' enabled' : ''}`}>
              <div className="item-card-heading">
                <div>
                  <h3>装备能力</h3>
                  <p>决定装备槽、可装备角色及实时派生效果。</p>
                </div>
                <label className="item-capability-toggle">
                  <input
                    type="checkbox"
                    checked={!!equip}
                    onChange={(event) =>
                      patchEquip(
                        event.target.checked
                          ? { slot: 'weapon', equipableBy: [], effects: [] }
                          : undefined,
                      )
                    }
                  />
                  {equip ? '已启用' : '启用装备'}
                </label>
              </div>
              {equip ? (
                <div className="item-capability-body">
                  <div className="item-equip-options">
                    <label className="item-field">
                      <span>槽位</span>
                      <select
                        className="in"
                        value={equip.slot}
                        onChange={(event) =>
                          patchEquip({ ...equip, slot: event.target.value as EquipSlot })
                        }
                      >
                        {SLOTS.map((slot) => (
                          <option key={slot.v} value={slot.v}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="item-character-checks">
                      <legend>可装备角色</legend>
                      {actors
                        .filter((actor) => actor.battler)
                        .map((actor) => (
                          <label key={actor.id}>
                            <input
                              type="checkbox"
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
                            {lookupText(actor.name, locale)}
                          </label>
                        ))}
                    </fieldset>
                  </div>
                  <div className="item-equip-effects">
                    <div className="item-effect-subhead">
                      <strong>装备效果</strong>
                      <button
                        type="button"
                        className="item-action-button item-action-button-compact item-effect-add-button"
                        onClick={() =>
                          patchEquip({
                            ...equip,
                            effects: [...equip.effects, defaultEquipEffect('statBonus')],
                          })
                        }
                      >
                        ＋ 添加效果
                      </button>
                    </div>
                    {equip.effects.map((effect, index) => (
                      <div
                        className={`ef-row item-equip-effect-row${
                          effect.kind === 'battleSprite'
                            ? ' item-equip-effect-row-battle-sprite'
                            : ''
                        }`}
                        key={`${item.id}-equip-${index}`}
                      >
                        <select
                          className="in ef-kind"
                          aria-label={`装备效果 ${index + 1} 类型`}
                          value={effect.kind}
                          onChange={(event) => {
                            try {
                              setEquipEffect(
                                index,
                                defaultEquipEffect(event.target.value as EquipEffect['kind']),
                              )
                              onStatusNotice?.(undefined)
                            } catch (cause) {
                              onStatusNotice?.({
                                kind: 'error',
                                message: cause instanceof Error ? cause.message : String(cause),
                              })
                            }
                          }}
                        >
                          {EFFECT_KINDS.map((kind) => (
                            <option
                              key={kind.v}
                              value={kind.v}
                              disabled={
                                kind.v === 'battleSprite' &&
                                effect.kind !== 'battleSprite' &&
                                equip.effects.some((candidate) => candidate.kind === 'battleSprite')
                              }
                            >
                              {kind.label}
                            </option>
                          ))}
                        </select>
                        <div className="ef-fields">
                          <EquipEffectFields
                            e={effect}
                            skills={skills}
                            battleSprites={battleSprites}
                            actors={actors}
                            equipableBy={equip.equipableBy}
                            locale={locale}
                            on={(next) => setEquipEffect(index, next)}
                            onOpenBattleSprite={onOpenBattleSprite}
                          />
                        </div>
                        <span className="ef-ops">
                          <button
                            type="button"
                            className="mini"
                            disabled={index === 0}
                            aria-label={`上移装备效果 ${index + 1}`}
                            onClick={() => {
                              const effects = [...equip.effects]
                              ;[effects[index - 1], effects[index]] = [
                                effects[index]!,
                                effects[index - 1]!,
                              ]
                              patchEquip({ ...equip, effects })
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="mini"
                            disabled={index === equip.effects.length - 1}
                            aria-label={`下移装备效果 ${index + 1}`}
                            onClick={() => {
                              const effects = [...equip.effects]
                              ;[effects[index], effects[index + 1]] = [
                                effects[index + 1]!,
                                effects[index]!,
                              ]
                              patchEquip({ ...equip, effects })
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="mini danger"
                            aria-label={`删除装备效果 ${index + 1}`}
                            onClick={() =>
                              patchEquip({
                                ...equip,
                                effects: equip.effects.filter((_, at) => at !== index),
                              })
                            }
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    ))}
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
                  </div>
                </div>
              ) : (
                <div className="item-capability-empty">开启后可配置槽位、角色和装备效果。</div>
              )}
            </section>

            <section className={`item-card item-capability-card${item.use ? ' enabled' : ''}`}>
              <div className="item-card-heading">
                <div>
                  <h3>使用能力</h3>
                  <p>可组合回复、状态、剧情脚本、场景出口、合成和资源池等现代化效果。</p>
                </div>
                <label className="item-capability-toggle">
                  <input
                    type="checkbox"
                    checked={!!item.use}
                    onChange={(event) =>
                      event.target.checked ? enableUse() : patch({ use: undefined })
                    }
                  />
                  {item.use ? '已启用' : '启用使用'}
                </label>
              </div>
              {item.use ? (
                <div className="item-capability-body">
                  <div className="item-sound-row">
                    <span>使用音效</span>
                    <SoundPicker
                      value={item.use.sound}
                      onChange={(sound) => patch({ use: withSound(item.use!, sound) })}
                      catalog={assetCatalog}
                      reader={assetReader}
                      allowUnset
                      onOpenAsset={onOpenSound}
                    />
                  </div>
                  <div className="item-script-authoring">
                    {confirmScriptReplaceId === item.id ? (
                      <div className="item-script-replace-confirm" role="alert">
                        <span>
                          新脚本会成为唯一用途，当前 {item.use.effects.length} 个效果将被替换。
                        </span>
                        <button
                          type="button"
                          className="tool primary"
                          onClick={() => createAndBindScript(true)}
                        >
                          确认新建并替换
                        </button>
                        <button
                          type="button"
                          className="tool"
                          onClick={() => setConfirmScriptReplaceId(undefined)}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="tool" onClick={() => createAndBindScript()}>
                        ＋ 新建剧情脚本并绑定…
                      </button>
                    )}
                  </div>
                  <ItemEffectChainEditor
                    ability="use"
                    spec={item.use}
                    items={items}
                    poisons={poisons}
                    scripts={scriptOptions}
                    onChange={(next) => patchUse(next as UseSpec)}
                    onOpenScript={onOpenScript}
                    onCreateAndBindScript={createAndBindScript}
                    onError={(message) => onStatusNotice?.({ kind: 'error', message })}
                    itemId={item.id}
                    worldResources={session.getState().manifest.startWorld.resources}
                    onSetWorldResource={(resource, initialValue) => {
                      const startWorld = session.getState().manifest.startWorld
                      session.dispatch(
                        new UpdateStartWorldCommand({
                          ...startWorld,
                          resources: { ...(startWorld.resources ?? {}), [resource]: initialValue },
                        }),
                      )
                    }}
                    scenes={editorState.scenes as readonly SceneDef[]}
                    privateScriptsV5={privateScriptsV5('use')}
                    onAddPrivateScript={scriptV5 ? addPrivateScript : undefined}
                  />
                </div>
              ) : (
                <div className="item-capability-empty">
                  开启后可定义目标、消耗规则和结构化效果链。
                </div>
              )}
            </section>

            <section className={`item-card item-capability-card${item.throw ? ' enabled' : ''}`}>
              <div className="item-card-heading">
                <div>
                  <h3>投掷能力</h3>
                  <p>用于战斗中的投掷效果与命中特效；与“使用”能力可同时存在。</p>
                </div>
                <label className="item-capability-toggle">
                  <input
                    type="checkbox"
                    checked={!!item.throw}
                    onChange={(event) =>
                      event.target.checked ? enableThrow() : patch({ throw: undefined })
                    }
                  />
                  {item.throw ? '已启用' : '启用投掷'}
                </label>
              </div>
              {item.throw ? (
                <div className="item-capability-body">
                  <div className="item-sound-row">
                    <span>投掷音效</span>
                    <SoundPicker
                      value={item.throw.sound}
                      onChange={(sound) => patch({ throw: withSound(item.throw!, sound) })}
                      catalog={assetCatalog}
                      reader={assetReader}
                      allowUnset
                      onOpenAsset={onOpenSound}
                    />
                  </div>
                  <div className="item-throw-presentation">
                    <div className="item-effect-subhead">
                      <strong>法术特效演出</strong>
                      {item.throw.presentation ? (
                        <button
                          type="button"
                          className="item-action-button item-action-button-danger item-action-button-compact"
                          onClick={() => {
                            const next = { ...item.throw! }
                            delete next.presentation
                            patchThrow(next)
                          }}
                        >
                          移除演出
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="item-action-button item-action-button-compact"
                          onClick={() =>
                            patchThrow({
                              ...item.throw!,
                              presentation: {
                                kind: 'magic',
                                animation: { effectSprite: 0, placement: 'normal' },
                              },
                            })
                          }
                        >
                          ＋ 添加法术特效
                        </button>
                      )}
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
                  />
                </div>
              ) : (
                <div className="item-capability-empty">
                  开启后可配置单体或全体目标，以及完整的结构化投掷效果链。
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="item-workbench-empty">
            <strong>{items.length ? '当前筛选没有可编辑项' : '创建第一个物品开始编辑'}</strong>
            <button type="button" className="tool primary" onClick={createItem}>
              ＋ 新建物品
            </button>
          </div>
        )}
      </div>

      <aside className="inspector item-inspector">
        <div className="pane-h">
          <span className="t">{item ? item.name : '物品检查器'}</span>
        </div>
        <div className="item-inspector-tabs" role="tablist" aria-label="物品检查器">
          {ITEM_INSPECTOR_TABS.map(({ value, label }) => (
            <button
              key={value}
              id={`item-inspector-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={inspectorTab === value}
              aria-controls={`item-inspector-panel-${value}`}
              tabIndex={inspectorTab === value ? 0 : -1}
              className={inspectorTab === value ? 'active' : undefined}
              onClick={() => setInspectorTab(value)}
              onKeyDown={(event) => {
                const currentIndex = ITEM_INSPECTOR_TABS.findIndex(
                  (candidate) => candidate.value === value,
                )
                const targetIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? ITEM_INSPECTOR_TABS.length - 1
                      : event.key === 'ArrowLeft'
                        ? (currentIndex - 1 + ITEM_INSPECTOR_TABS.length) %
                          ITEM_INSPECTOR_TABS.length
                        : event.key === 'ArrowRight'
                          ? (currentIndex + 1) % ITEM_INSPECTOR_TABS.length
                          : -1
                if (targetIndex < 0) return
                event.preventDefault()
                const next = ITEM_INSPECTOR_TABS[targetIndex]!
                setInspectorTab(next.value)
                document.getElementById(`item-inspector-tab-${next.value}`)?.focus()
              }}
            >
              {label(itemReferences.length)}
            </button>
          ))}
        </div>
        {!item ? (
          <div className="insp-empty">选择或新建一个物品。</div>
        ) : inspectorTab === 'overview' ? (
          <div
            id="item-inspector-panel-overview"
            className="item-inspector-scroll"
            role="tabpanel"
            aria-labelledby="item-inspector-tab-overview"
          >
            <section className="item-inspector-section">
              <h4>能力摘要</h4>
              <div className="item-summary-line">
                <span>装备</span>
                <strong>
                  {item.equip
                    ? `${SLOTS.find((slot) => slot.v === item.equip?.slot)?.label} · ${item.equip.effects.length} 个效果`
                    : '未启用'}
                </strong>
              </div>
              <div className="item-summary-line">
                <span>使用</span>
                <strong>{item.use ? `${item.use.effects.length} 个效果` : '未启用'}</strong>
              </div>
              <div className="item-summary-line">
                <span>投掷</span>
                <strong>{item.throw ? `${item.throw.effects.length} 个效果` : '未启用'}</strong>
              </div>
            </section>
            {item.use ? (
              <section className="item-inspector-section">
                <h4>使用时发生什么</h4>
                <ul className="item-summary-list">
                  {summarizeUse(item, items).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {itemDiagnostics.length ? (
              <section className="item-inspector-section warning">
                <h4>待迁移来源</h4>
                {itemDiagnostics.map((diagnostic) => (
                  <div className="item-diagnostic" key={diagnostic.id}>
                    <strong>{diagnostic.target.label}</strong>
                    <span>{diagnostic.reason}</span>
                    <code>
                      {diagnostic.source.label} · 0x{diagnostic.source.address.toString(16)}
                    </code>
                    {onOpenProjectIssues ? (
                      <button
                        type="button"
                        className="item-action-button item-action-button-compact"
                        onClick={onOpenProjectIssues}
                      >
                        在问题面板查看 ↗
                      </button>
                    ) : (
                      <small>旧版脚本源只读且未载入编辑器；请在工程问题面板核对诊断。</small>
                    )}
                  </div>
                ))}
              </section>
            ) : null}
            <section className="item-inspector-section">
              <h4>删除安全</h4>
              <p>
                {blockers.length
                  ? `仍有 ${blockers.length} 处外部引用，删除会被阻止。`
                  : '没有外部引用，可安全删除；删除后仍可撤销。'}
              </p>
              {blockers.length ? (
                <button
                  type="button"
                  className="tool"
                  onClick={() => setInspectorTab('references')}
                >
                  查看阻塞引用
                </button>
              ) : null}
            </section>
          </div>
        ) : inspectorTab === 'references' ? (
          <div
            id="item-inspector-panel-references"
            className="item-inspector-scroll"
            role="tabpanel"
            aria-labelledby="item-inspector-tab-references"
          >
            {groupReferences(itemReferences).map((group) => (
              <section className="item-reference-group" key={group.source}>
                <h4>
                  {SOURCE_LABEL[group.source]}
                  <span>{group.entries.length}</span>
                </h4>
                {group.entries.map((reference) => (
                  <article
                    className="item-reference-card"
                    key={`${reference.where}:${reference.detail}`}
                  >
                    <div className="item-reference-title">
                      <strong>{reference.label}</strong>
                      <span className={`item-access ${reference.access}`}>
                        {ACCESS_LABEL[reference.access]}
                      </span>
                    </div>
                    <p>{reference.detail}</p>
                    <code>{reference.where}</code>
                    {reference.locator && onOpenItemReference ? (
                      <button
                        type="button"
                        className="mini"
                        onClick={() => onOpenItemReference(reference)}
                      >
                        打开位置 ↗
                      </button>
                    ) : reference.unavailableReason ? (
                      <small>{reference.unavailableReason}</small>
                    ) : null}
                  </article>
                ))}
              </section>
            ))}
            {!itemReferences.length ? (
              <div className="insp-empty">全工程没有判断、获得、失去、消耗、持有或配置此物品。</div>
            ) : null}
          </div>
        ) : (
          <div
            id="item-inspector-panel-resource"
            className="item-inspector-scroll"
            role="tabpanel"
            aria-labelledby="item-inspector-tab-resource"
          >
            <section className="item-inspector-section">
              <h4>图标资源</h4>
              {item.icon && assetCatalog.assets[item.icon] ? (
                <>
                  <ImageAssetThumbnail
                    asset={item.icon}
                    kind="item-icon"
                    reader={assetReader}
                    revision={assetCatalog.assets[item.icon]?.sha256}
                    className="item-resource-preview"
                    alt={`${item.name}图标资源`}
                  />
                  <dl className="item-resource-meta">
                    <dt>AssetId</dt>
                    <dd>{item.icon}</dd>
                    <dt>路径</dt>
                    <dd>{assetCatalog.assets[item.icon]!.path}</dd>
                    <dt>来源</dt>
                    <dd>{assetCatalog.assets[item.icon]!.origin.kind}</dd>
                    <dt>大小</dt>
                    <dd>{assetCatalog.assets[item.icon]!.bytes.toLocaleString()} bytes</dd>
                    <dt>物品引用</dt>
                    <dd>{items.filter((candidate) => candidate.icon === item.icon).length} 项</dd>
                  </dl>
                  <div className="item-resource-actions">
                    <button
                      type="button"
                      className="tool"
                      onClick={() => onOpenImage?.(item.icon!)}
                    >
                      在图像库打开 ↗
                    </button>
                    <button
                      type="button"
                      className="tool"
                      onClick={() => patch({ icon: undefined })}
                    >
                      解除绑定
                    </button>
                  </div>
                </>
              ) : (
                <div className="insp-empty">尚未绑定物品图标。可在中央选择现有资源或导入 PNG。</div>
              )}
            </section>
          </div>
        )}
      </aside>
    </>
  )
}
