/**
 * 技能编辑页(2026-07-05 作者拍板「结构化 + 特效预览」,废 JSON 大块)。
 * 左:技能列表;中:基础 / 消耗 / 目标 / 效果行(15 种 kind 分支字段,顺序有语义:gate
 * 截断其后) / 动画参数 + FIRE 特效实时预览(参数改动即反映,循环播,含音效)。
 * 完整战斗语境预览等引擎 B5 召唤/变身动画补齐后再上(拍板记录)。
 */

import type {
  AssetCatalogV1,
  BattleSpriteDef,
  ItemData,
  SkillData,
  SkillEffect,
  SkillExecutionOverride,
  StatusId,
} from '@type-pal/content'
import { ENEMY_RUNTIME_SKILL_EFFECT_KINDS } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  type BattleDataReference,
  blockingSkillReferences,
} from '../core/battle-data-references.js'
import {
  AddSkillCommand,
  BattleDataInUseError,
  DeleteSkillCommand,
  UpdateSkillCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { playProjectQuery } from '../core/play-url.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import {
  DsActionLink,
  DsButton,
  DsCheckbox,
  DsDraftNumberField,
  DsDraftNumberInput,
  DsDraftTextAreaField,
  DsDraftTextField,
  DsDraftTextInput,
  DsField,
  DsIconButton,
  DsSelect,
  DsSelectField,
  DsTag,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  sameDsSerializableValue,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/reorder.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SkillAnimationEditor } from './SkillAnimationEditor.js'
import { SoundPicker } from './SoundPicker.js'
import { SummonPreview } from './SummonPreview.js'
import { TrancePreview } from './TrancePreview.js'

type SkillInspectorTab = 'references' | 'help'

const TARGETS: { v: SkillData['target']; label: string }[] = [
  { v: 'oneEnemy', label: '单敌' },
  { v: 'allEnemies', label: '全体敌' },
  { v: 'oneAlly', label: '单队友' },
  { v: 'allAllies', label: '全队' },
  { v: 'self', label: '自身' },
]
const STATUS: { v: StatusId; label: string }[] = [
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
const ELEMENTS = ['无', '风', '雷', '水', '火', '土', '毒']
const EFFECT_KINDS: { v: SkillEffect['kind']; label: string }[] = [
  { v: 'damage', label: '伤害' },
  { v: 'healHp', label: '回体力' },
  { v: 'healMp', label: '回真气' },
  { v: 'revive', label: '复活' },
  { v: 'applyStatus', label: '上状态' },
  { v: 'removeStatus', label: '解状态' },
  { v: 'applyPoison', label: '下毒' },
  { v: 'curePoison', label: '解毒' },
  { v: 'buffStat', label: '属性增益' },
  { v: 'gate', label: '条件门' },
  { v: 'instantKill', label: '即死' },
  { v: 'resourceDelta', label: '直接增减资源' },
  { v: 'steal', label: '偷窃' },
  { v: 'collectTreasure', label: '收宝' },
  { v: 'summon', label: '召唤' },
  { v: 'trance', label: '变身' },
  { v: 'fleeBattle', label: '脱离战斗' },
  { v: 'moneyDamage', label: '金钱伤害' },
]

/** kind 切换的缺省效果体。 */
function defaultEffect(
  kind: SkillEffect['kind'],
  battleSprites: readonly BattleSpriteDef[],
): SkillEffect {
  switch (kind) {
    case 'damage':
      return { kind, power: 10, elemental: 0 }
    case 'healHp':
      return { kind, amount: 50 }
    case 'healMp':
      return { kind, amount: 20 }
    case 'revive':
      return { kind, hpPercent: 10 }
    case 'applyStatus':
      return { kind, status: 'sleep', turns: 3 }
    case 'removeStatus':
      return { kind, statuses: [] }
    case 'applyPoison':
      return { kind, poisonId: '' }
    case 'curePoison':
      return { kind }
    case 'buffStat':
      return { kind, stat: 'attack', percent: 50, duration: 'battle' }
    case 'gate':
      return { kind, chance: 50 }
    case 'instantKill':
      return { kind }
    case 'resourceDelta':
      return { kind, resource: 'hp', delta: -1 }
    case 'steal':
      return { kind, rate: 50 }
    case 'collectTreasure':
      return { kind }
    case 'summon':
      return {
        kind,
        battleSprite:
          battleSprites.find((entry) => entry.profile.kind === 'summon')?.id ??
          (() => {
            throw new Error('请先在战斗精灵库创建 summon 定义')
          })(),
      }
    case 'trance':
      return {
        kind,
        battleSprite:
          battleSprites.find((entry) => entry.profile.kind === 'player-fighter')?.id ??
          (() => {
            throw new Error('请先在战斗精灵库创建 player-fighter 定义')
          })(),
      }
    case 'fleeBattle':
      return { kind }
    case 'moneyDamage':
      return { kind, maxSpend: 5000, num: 2, den: 5, elemental: 0 }
  }
}

function N(props: {
  id?: string
  v: number | undefined
  draftScope: string
  syncToken: number
  on: (n: number | undefined) => void
  ph?: string
  w?: number
  ariaLabel?: string
  min?: number
  step?: number
}) {
  return (
    <span className="skill-number-control" style={props.w ? { width: props.w } : undefined}>
      <DsDraftNumberInput
        id={props.id}
        size="compact"
        monospace
        aria-label={props.ariaLabel}
        min={props.min}
        step={props.step}
        enforceRange={false}
        draftKey={`${props.draftScope}:${props.id ?? props.ariaLabel ?? 'number'}`}
        syncToken={props.syncToken}
        value={props.v}
        allowEmpty
        placeholder={props.ph}
        onCommit={props.on}
        onWheel={(e) => e.currentTarget.blur()}
      />
    </span>
  )
}

function EffectField(props: { label: string; help?: string; children: (id: string) => ReactNode }) {
  return (
    <DsField label={props.label} help={props.help} className="skill-effect-field">
      {({ id }) => props.children(id)}
    </DsField>
  )
}

/** 单条效果的分支字段。 */
function EffectFields(props: {
  e: SkillEffect
  draftScope: string
  syncToken: number
  on: (next: SkillEffect) => void
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  battleSprites: readonly BattleSpriteDef[]
  onOpenSound?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
}) {
  const {
    e,
    draftScope,
    syncToken,
    on,
    assetCatalog,
    assetReader,
    battleSprites,
    onOpenSound,
    onOpenBattleSprite,
  } = props
  switch (e.kind) {
    case 'damage':
      return (
        <>
          <EffectField label="威力">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.power}
                on={(n) => on({ ...e, power: n ?? 0 })}
              />
            )}
          </EffectField>
          <EffectField label="五行">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={String(e.elemental)}
                onValueChange={(value) => on({ ...e, elemental: Number(value) })}
                options={ELEMENTS.map((label, index) => ({
                  value: String(index === 6 ? 6 : index),
                  label,
                }))}
              />
            )}
          </EffectField>
        </>
      )
    case 'resourceDelta':
      return (
        <>
          <EffectField label="资源">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={e.resource}
                onValueChange={(resource) => on({ ...e, resource: resource as 'hp' | 'mp' })}
                options={[
                  { value: 'hp', label: '体力' },
                  { value: 'mp', label: '真气' },
                ]}
              />
            )}
          </EffectField>
          <EffectField label="增减">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.delta}
                on={(delta) => on({ ...e, delta: delta ?? 0 })}
              />
            )}
          </EffectField>
        </>
      )
    case 'healHp':
    case 'healMp':
      return (
        <EffectField label="量">
          {(id) => (
            <N
              draftScope={draftScope}
              syncToken={syncToken}
              id={id}
              v={e.amount}
              on={(n) => on({ ...e, amount: n ?? 0 })}
            />
          )}
        </EffectField>
      )
    case 'revive':
      return (
        <EffectField label="回 max%">
          {(id) => (
            <N
              draftScope={draftScope}
              syncToken={syncToken}
              id={id}
              v={e.hpPercent}
              on={(n) => on({ ...e, hpPercent: n ?? 0 })}
            />
          )}
        </EffectField>
      )
    case 'applyStatus':
      return (
        <>
          <EffectField label="状态">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={e.status}
                onValueChange={(status) => on({ ...e, status: status as StatusId })}
                options={STATUS.map((status) => ({ value: status.v, label: status.label }))}
              />
            )}
          </EffectField>
          <EffectField label="回合">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.turns}
                on={(n) => on({ ...e, turns: n ?? 1 })}
              />
            )}
          </EffectField>
        </>
      )
    case 'removeStatus':
      return (
        <span className="ef-status-set">
          {STATUS.map((s) => (
            <DsCheckbox
              key={s.v}
              size="compact"
              label={s.label}
              checked={e.statuses.includes(s.v)}
              onChange={(ev) =>
                on({
                  ...e,
                  statuses: ev.target.checked
                    ? [...e.statuses, s.v]
                    : e.statuses.filter((x) => x !== s.v),
                })
              }
            />
          ))}
        </span>
      )
    case 'applyPoison':
      return (
        <EffectField label="毒 id">
          {(id) => (
            <DsDraftTextInput
              id={id}
              size="compact"
              draftKey={`${draftScope}:poisonId`}
              syncToken={syncToken}
              value={e.poisonId}
              onCommit={(value) => on({ ...e, poisonId: value })}
            />
          )}
        </EffectField>
      )
    case 'curePoison':
      return (
        <>
          <EffectField label="可解度">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={e.curesTier ?? ''}
                onValueChange={(curesTier) =>
                  on({ ...e, curesTier: (curesTier || undefined) as typeof e.curesTier })
                }
                options={[
                  { value: '', label: '(按毒 id)' },
                  { value: 'common', label: '常规(灵血咒)' },
                  { value: 'severe', label: '六大毒(复活类)' },
                ]}
              />
            )}
          </EffectField>
          <EffectField label="指定毒">
            {(id) => (
              <DsDraftTextInput
                id={id}
                size="compact"
                draftKey={`${draftScope}:poisonId`}
                syncToken={syncToken}
                value={e.poisonId ?? ''}
                placeholder="(任意)"
                onCommit={(value) => on({ ...e, poisonId: value || undefined })}
              />
            )}
          </EffectField>
        </>
      )
    case 'buffStat':
      return (
        <>
          <EffectField label="属性">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={e.stat}
                onValueChange={(stat) => on({ ...e, stat: stat as typeof e.stat })}
                options={[
                  { value: 'attack', label: '武术' },
                  { value: 'defense', label: '防御' },
                  { value: 'magic', label: '灵力' },
                  { value: 'dexterity', label: '身法' },
                ]}
              />
            )}
          </EffectField>
          <EffectField label="+%">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.percent}
                on={(n) => on({ ...e, percent: n ?? 0 })}
              />
            )}
          </EffectField>
          <EffectField label="持续">
            {(id) => (
              <DsSelect
                id={id}
                size="compact"
                value={e.duration === 'battle' ? 'battle' : 'turns'}
                onValueChange={(duration) =>
                  on({ ...e, duration: duration === 'battle' ? 'battle' : 3 })
                }
                options={[
                  { value: 'battle', label: '整场' },
                  { value: 'turns', label: 'N 回合' },
                ]}
              />
            )}
          </EffectField>
          {e.duration !== 'battle' && (
            <N
              draftScope={draftScope}
              syncToken={syncToken}
              v={e.duration}
              ariaLabel="持续回合数"
              on={(n) => on({ ...e, duration: n ?? 3 })}
            />
          )}
        </>
      )
    case 'gate':
      return (
        <>
          <EffectField label="概率%">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.chance}
                on={(n) => on({ ...e, chance: n })}
                ph="(无)"
              />
            )}
          </EffectField>
          <EffectField label="HP≤%">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.hpAtMostPercent}
                on={(n) => on({ ...e, hpAtMostPercent: n })}
                ph="(无)"
              />
            )}
          </EffectField>
          <DsCheckbox
            size="compact"
            label="灵抗掷"
            checked={e.magicResist === true}
            onChange={(ev) => on({ ...e, magicResist: ev.target.checked || undefined })}
          />
        </>
      )
    case 'steal':
      return (
        <EffectField label="成功率">
          {(id) => (
            <N
              draftScope={draftScope}
              syncToken={syncToken}
              id={id}
              v={e.rate}
              on={(n) => on({ ...e, rate: n ?? 0 })}
            />
          )}
        </EffectField>
      )
    case 'summon':
      return (
        <>
          <EffectField label="召唤形象">
            {(id) => (
              <BattleSpritePicker
                id={id}
                size="compact"
                value={e.battleSprite}
                definitions={battleSprites}
                kind="summon"
                onChange={(battleSprite) => on({ ...e, battleSprite })}
                onOpenDefinition={onOpenBattleSprite}
              />
            )}
          </EffectField>
          <EffectField label="现身帧速">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.speed}
                on={(n) => on({ ...e, speed: n ?? undefined })}
                ph="0"
              />
            )}
          </EffectField>
          <EffectField label="背景染色" help="负数调暗，正数调亮，0 表示不染色">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.tint}
                on={(n) => on({ ...e, tint: n ?? undefined })}
                ph="0"
              />
            )}
          </EffectField>
          <EffectField label="现身音效">
            {(id) => (
              <SoundPicker
                id={id}
                size="compact"
                value={e.sound}
                onChange={(sound) => on({ ...e, sound })}
                catalog={assetCatalog}
                reader={assetReader}
                allowUnset
                onOpenAsset={onOpenSound}
              />
            )}
          </EffectField>
        </>
      )
    case 'trance':
      return (
        <EffectField label="变身形象">
          {(id) => (
            <BattleSpritePicker
              id={id}
              size="compact"
              value={e.battleSprite}
              definitions={battleSprites}
              kind="player-fighter"
              onChange={(battleSprite) => on({ ...e, battleSprite })}
              onOpenDefinition={onOpenBattleSprite}
            />
          )}
        </EffectField>
      )
    case 'moneyDamage':
      return (
        <>
          <EffectField label="消耗上限" help="消耗为当前金钱与此上限的较小值">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.maxSpend}
                on={(n) => on({ ...e, maxSpend: n ?? 5000 })}
              />
            )}
          </EffectField>
          <EffectField label="分子" help="基伤 = 消耗 × 分子 ÷ 分母">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.num}
                on={(n) => on({ ...e, num: n ?? 1 })}
                w={48}
              />
            )}
          </EffectField>
          <EffectField label="分母">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.den}
                on={(n) => on({ ...e, den: n ?? 1 })}
                w={48}
              />
            )}
          </EffectField>
          <EffectField label="五灵">
            {(id) => (
              <N
                draftScope={draftScope}
                syncToken={syncToken}
                id={id}
                v={e.elemental}
                on={(n) => on({ ...e, elemental: n ?? 0 })}
                w={48}
              />
            )}
          </EffectField>
        </>
      )
    default:
      return <span className="hint2">(无参数)</span>
  }
}

type SkillEffectPreview = {
  label: string
  content: ReactNode
}

function effectPreview(props: {
  effect: SkillEffect
  assetBase: AssetBase
  assetReader: EditorAssetReader
  battleSprites: readonly BattleSpriteDef[]
}): SkillEffectPreview | undefined {
  const { effect, assetBase, assetReader, battleSprites } = props
  if (effect.kind === 'summon') {
    return {
      label: '召唤形象预览',
      content: (
        <SummonPreview
          assetBase={assetBase}
          definition={battleSprites.find((entry) => entry.id === effect.battleSprite)}
          assetReader={assetReader}
          speed={effect.speed}
        />
      ),
    }
  }
  if (effect.kind === 'trance') {
    return {
      label: '变身形象预览',
      content: (
        <TrancePreview
          assetBase={assetBase}
          definition={battleSprites.find((entry) => entry.id === effect.battleSprite)}
          assetReader={assetReader}
        />
      ),
    }
  }
  return undefined
}

function SkillEffectCard(props: {
  index: number
  effect: SkillEffect
  kindOptions: readonly { v: SkillEffect['kind']; label: string }[]
  preview?: SkillEffectPreview
  reorderKey: string
  children: ReactNode
  onKindChange: (kind: SkillEffect['kind']) => void
  onRemove: () => void
}) {
  const effectNumber = props.index + 1
  return (
    <div
      className={`skill-effect-card${props.preview ? ' skill-effect-card--with-preview' : ''}`}
      data-effect-kind={props.effect.kind}
      data-has-preview={props.preview ? 'true' : 'false'}
      aria-label={`效果 ${effectNumber}`}
    >
      <div className="skill-effect-card__editor">
        <header className="skill-effect-card__header">
          <span className="skill-effect-card__index">效果 {effectNumber}</span>
          <DsSelect
            size="compact"
            aria-label={`效果 ${effectNumber} 类型`}
            value={props.effect.kind}
            onValueChange={(kind) => props.onKindChange(kind as SkillEffect['kind'])}
            options={props.kindOptions.map((kind) => ({ value: kind.v, label: kind.label }))}
          />
          <span className="skill-effect-card__spacer" />
          <span
            className="skill-effect-card__actions"
            role="group"
            aria-label={`效果 ${effectNumber} 排序与删除`}
          >
            <DsReorderMoveButton
              itemKey={props.reorderKey}
              direction="backward"
              label={`上移效果 ${effectNumber}`}
            />
            <DsReorderMoveButton
              itemKey={props.reorderKey}
              direction="forward"
              label={`下移效果 ${effectNumber}`}
            />
            <DsIconButton
              size="compact"
              variant="danger"
              icon="delete"
              label={`删除效果 ${effectNumber}`}
              onClick={props.onRemove}
            />
          </span>
        </header>
        <div className="ef-fields skill-effect-card__fields">{props.children}</div>
      </div>
      {props.preview && (
        <figure className="skill-effect-card__preview" data-effect-preview>
          <figcaption>{props.preview.label}</figcaption>
          {props.preview.content}
        </figure>
      )}
    </div>
  )
}

function ExecutionOverrideEditor(props: {
  side: 'player' | 'enemy'
  draftScope: string
  syncToken: number
  override: SkillExecutionOverride
  fallbackAnimation: SkillData['animation']
  onChange: (next: SkillExecutionOverride) => void
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  battleSprites: readonly BattleSpriteDef[]
  onOpenSound?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
}) {
  const {
    side,
    draftScope,
    syncToken,
    override,
    fallbackAnimation,
    onChange,
    assetCatalog,
    assetReader,
    assetBase,
    battleSprites,
    onOpenSound,
    onOpenBattleSprite,
  } = props
  const availableEffectKinds =
    side === 'enemy'
      ? EFFECT_KINDS.filter((kind) => ENEMY_RUNTIME_SKILL_EFFECT_KINDS.includes(kind.v as never))
      : EFFECT_KINDS
  const effects = override.effects ?? []
  const reorderKeys = useDsReorderKeys(effects)
  const setEffects = (next: SkillEffect[]): void =>
    onChange({ ...override, effects: next.length ? next : undefined })
  const setEffect = (index: number, next: SkillEffect): void => {
    const updated = [...effects]
    updated[index] = next
    setEffects(updated)
  }
  const reorderEffects = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(effects, intent, 'insert', sameDsSerializableValue)
    if (next === effects) return false
    reorderKeys.move(intent)
    setEffects([...next])
    return true
  }
  const prepare = override.prepare?.find((entry) => entry.kind === 'remainingResourceDamage')
  const setPrepare = (enabled: boolean, multiplier = prepare?.multiplier ?? 8): void => {
    onChange({
      ...override,
      prepare: enabled
        ? [{ kind: 'remainingResourceDamage', resource: 'mp', multiplier, consume: 'all' }]
        : undefined,
    })
  }
  return (
    <div className="skill-execution-branch" data-side={side}>
      <div className="item-effect-subhead">
        <strong>{side === 'player' ? '玩家施法时' : '敌人施法时'}</strong>
        <span className="hint2">只覆盖本次施法；未设置的部分沿用上方公共定义</span>
      </div>
      {side === 'player' && (
        <div className="skill-execution-prepare">
          <DsCheckbox
            size="compact"
            label="施法前按剩余真气扣体力"
            checked={Boolean(prepare)}
            onChange={(event) => setPrepare(event.target.checked)}
          />
          {prepare && (
            <EffectField label="倍率">
              {(id) => (
                <N
                  draftScope={`${draftScope}:prepare`}
                  syncToken={syncToken}
                  id={id}
                  v={prepare.multiplier}
                  on={(value) => setPrepare(true, value ?? 0)}
                  ph="8"
                />
              )}
            </EffectField>
          )}
        </div>
      )}
      <div className="item-effect-subhead">
        <span>分支效果</span>
        <DsButton
          variant="secondary"
          icon="add"
          onClick={() => setEffects([...effects, defaultEffect('damage', battleSprites)])}
        >
          添加分支效果
        </DsButton>
      </div>
      {effects.length > 0 ? (
        <DsReorderCollection
          adoptionId="skill/execution-effects"
          scopeKey={`${draftScope}:effects`}
          entries={effects.map((effect, index) => ({
            key: reorderKeys.keys[index]!,
            label:
              availableEffectKinds.find((kind) => kind.v === effect.kind)?.label ?? effect.kind,
          }))}
          revision={syncToken}
          onReorder={reorderEffects}
        >
          <ol className="skill-effect-chain" data-skill-effect-chain={side}>
            {effects.map((effect, index) => {
              const reorderKey = reorderKeys.keys[index]!
              return (
                <DsReorderItem as="li" itemKey={reorderKey} key={reorderKey}>
                  <SkillEffectCard
                    index={index}
                    reorderKey={reorderKey}
                    effect={effect}
                    kindOptions={availableEffectKinds}
                    preview={effectPreview({ effect, assetBase, assetReader, battleSprites })}
                    onKindChange={(kind) => setEffect(index, defaultEffect(kind, battleSprites))}
                    onRemove={() => setEffects(effects.filter((_, row) => row !== index))}
                  >
                    <EffectFields
                      e={effect}
                      draftScope={`${draftScope}:effects.${reorderKey}`}
                      syncToken={syncToken}
                      on={(next) => setEffect(index, next)}
                      assetCatalog={assetCatalog}
                      assetReader={assetReader}
                      battleSprites={battleSprites}
                      onOpenSound={onOpenSound}
                      onOpenBattleSprite={onOpenBattleSprite}
                    />
                  </SkillEffectCard>
                </DsReorderItem>
              )
            })}
          </ol>
        </DsReorderCollection>
      ) : (
        <div className="skill-effect-empty">尚未配置分支效果。</div>
      )}
      <div className="item-effect-subhead">
        <DsCheckbox
          size="compact"
          label="覆写这次施法动画"
          checked={Boolean(override.animation)}
          onChange={(event) =>
            onChange({
              ...override,
              animation: event.target.checked ? structuredClone(fallbackAnimation) : undefined,
            })
          }
        />
      </div>
      {override.animation && (
        <SkillAnimationEditor
          animation={override.animation}
          onChange={(animation) => onChange({ ...override, animation })}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          assetBase={assetBase}
          onOpenSound={onOpenSound}
          draftScope={`${draftScope}:animation`}
          syncToken={syncToken}
        />
      )}
    </div>
  )
}

export function SkillTab(props: {
  skills: SkillData[]
  items: readonly ItemData[]
  session: EditSession
  assetBase: AssetBase
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  battleSprites: readonly BattleSpriteDef[]
  onOpenSound?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  onOpenReference?: (reference: BattleDataReference) => void
  /** 项目 id(同源试玩页;缺省 pal 兼容旧调用)。 */
  projectId?: string
  workspaceId?: string
}) {
  const {
    skills,
    items,
    session,
    assetBase,
    assetCatalog,
    assetReader,
    battleSprites,
    onOpenSound,
    onOpenBattleSprite,
    focusObjectId,
    onObjectFocus,
    onStatusNotice,
    onOpenReference,
    projectId = 'pal',
    workspaceId,
  } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(skills[0]?.id ?? '')
  const [inspectorTab, setInspectorTab] = useState<SkillInspectorTab>('references')
  const appliedFocusObjectId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      focusObjectId &&
      appliedFocusObjectId.current !== focusObjectId &&
      skills.some((entry) => entry.id === focusObjectId)
    ) {
      setSelId(focusObjectId)
      appliedFocusObjectId.current = focusObjectId
    }
  }, [focusObjectId, skills])
  const shown = useMemo(
    () => skills.filter((s) => !filter || s.id.includes(filter) || s.name.includes(filter)),
    [skills, filter],
  )
  const skill = skills.find((s) => s.id === selId) ?? shown[0]
  const effectReorderKeys = useDsReorderKeys(skill?.effects ?? [])
  const references = skill ? blockingSkillReferences(session.getState(), skill.id) : []
  const patch = (p: Partial<Omit<SkillData, 'id'>>): void => {
    if (skill) session.dispatch(new UpdateSkillCommand(skill.id, p))
  }
  const setCostItems = (entries: NonNullable<SkillData['cost']['items']>): void => {
    if (!skill) return
    const cost = { ...skill.cost }
    if (entries.length) cost.items = entries
    else delete cost.items
    patch({ cost })
  }
  const setEffect = (i: number, next: SkillEffect): void => {
    if (!skill) return
    const effects = [...skill.effects]
    effects[i] = next
    patch({ effects })
  }
  const reorderEffects = (intent: DsReorderIntent): boolean => {
    if (!skill) return false
    const effects = reorderDsItems(skill.effects, intent, 'insert', sameDsSerializableValue)
    if (effects === skill.effects) return false
    effectReorderKeys.move(intent)
    patch({ effects: [...effects] })
    return true
  }
  const setExecution = (
    side: 'player' | 'enemy',
    override: SkillExecutionOverride | undefined,
  ): void => {
    if (!skill) return
    const execution = { ...(skill.execution ?? {}) }
    if (override) execution[side] = override
    else delete execution[side]
    patch({ execution: Object.keys(execution).length ? execution : undefined })
  }
  const removeSkill = (): void => {
    if (!skill) return
    if (references.length) {
      onStatusNotice?.({
        kind: 'error',
        message: `仍有 ${references.length} 处引用，请先从右侧引用列表处理。`,
      })
      return
    }
    if (!window.confirm(`删除技能 ${skill.name}(${skill.id})？此操作可以撤销。`)) return
    const index = skills.findIndex((entry) => entry.id === skill.id)
    const next = skills[index + 1] ?? skills[index - 1]
    try {
      session.dispatch(new DeleteSkillCommand(skill.id))
      setSelId(next?.id ?? '')
      onObjectFocus?.(next?.id)
      onStatusNotice?.(undefined)
    } catch (error) {
      onStatusNotice?.({
        kind: 'error',
        message:
          error instanceof BattleDataInUseError
            ? `仍有 ${error.references.length} 处引用，无法删除。`
            : error instanceof Error
              ? error.message
              : String(error),
      })
    }
  }
  const addSkill = (): void => {
    const name = window.prompt('新技能名字:', '')?.trim()
    if (!name) return
    let n = 1000
    while (skills.some((entry) => entry.id === String(n))) n++
    session.dispatch(new AddSkillCommand(String(n), name))
    setSelId(String(n))
    onObjectFocus?.(String(n))
  }
  return (
    <>
      <div className="outliner data-outliner">
        <DsCatalogControls
          title="技能"
          count={skills.length}
          unit="项"
          actions={[{ id: 'create-skill', label: '新建技能', icon: 'add', onClick: addSkill }]}
          search={{
            'aria-label': '过滤技能',
            placeholder: '过滤 id/名…',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        <div className="sprite-list">
          {shown.map((s) => (
            <DsCatalogRow
              key={s.id}
              selected={s.id === skill?.id}
              title={s.name}
              meta={s.id}
              onClick={() => {
                setSelId(s.id)
                onObjectFocus?.(s.id)
              }}
            />
          ))}
        </div>
      </div>
      <div className="canvas-wrap data-body ds-object-workspace">
        {skill ? (
          <>
            <DsObjectHero
              eyebrow="技能"
              title={skill.name}
              objectId={skill.id}
              summary="管理施法目标、消耗、有序效果链、动画与玩家/敌人施法分支。"
              meta={
                <DsTag tone="neutral">
                  {TARGETS.find((target) => target.v === skill.target)?.label ?? skill.target}
                </DsTag>
              }
              actions={
                <>
                  <DsActionLink
                    variant="secondary"
                    icon="open"
                    title="开真实战斗临时授此技试放（不改存档/项目数据）"
                    href={`play.html?${playProjectQuery(projectId, workspaceId)}&scene=s001&battle=0&skill=${encodeURIComponent(skill.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    战斗中试放
                  </DsActionLink>
                  <DsButton
                    variant="danger"
                    icon="delete"
                    disabled={references.length > 0}
                    title={
                      references.length
                        ? `仍有 ${references.length} 处引用，请先从右侧处理`
                        : '删除技能'
                    }
                    onClick={removeSkill}
                  >
                    删除技能
                  </DsButton>
                </>
              }
            />
            <div className="et-scroll battle-data-form ds-object-workspace__content">
              <DsWorkbenchSection
                title="基础"
                description="配置施法目标、资源消耗、战外可用性与玩家可见说明。"
              >
                <div className="battle-data-grid">
                  <DsDraftTextField
                    label="名字"
                    draftKey={`skill:${skill.id}:name`}
                    syncToken={session.getHistoryVersion()}
                    value={skill.name}
                    onCommit={(value) => patch({ name: value })}
                  />
                  <DsSelectField
                    label="目标"
                    value={skill.target}
                    onValueChange={(target) => patch({ target: target as SkillData['target'] })}
                    options={TARGETS.map((target) => ({
                      value: target.v,
                      label: target.label,
                    }))}
                  />
                  <DsDraftNumberField
                    label="耗真气"
                    draftKey={`skill:${skill.id}:cost.mp`}
                    syncToken={session.getHistoryVersion()}
                    monospace
                    value={skill.cost.mp}
                    allowEmpty
                    placeholder="0"
                    onWheel={(event) => event.currentTarget.blur()}
                    onCommit={(value) =>
                      patch({
                        cost: {
                          ...skill.cost,
                          mp: value,
                        },
                      })
                    }
                  />
                  <DsDraftNumberField
                    label="耗体力"
                    draftKey={`skill:${skill.id}:cost.stamina`}
                    syncToken={session.getHistoryVersion()}
                    monospace
                    value={skill.cost.stamina}
                    allowEmpty
                    placeholder="0"
                    onWheel={(event) => event.currentTarget.blur()}
                    onCommit={(value) =>
                      patch({
                        cost: {
                          ...skill.cost,
                          stamina: value,
                        },
                      })
                    }
                  />
                  <DsDraftNumberField
                    label="耗金钱"
                    draftKey={`skill:${skill.id}:cost.money`}
                    syncToken={session.getHistoryVersion()}
                    monospace
                    value={skill.cost.money}
                    allowEmpty
                    placeholder="0"
                    onWheel={(event) => event.currentTarget.blur()}
                    onCommit={(value) =>
                      patch({
                        cost: {
                          ...skill.cost,
                          money: value,
                        },
                      })
                    }
                  />
                  <DsDraftNumberField
                    label="一生限用"
                    draftKey={`skill:${skill.id}:lifetimeLimit`}
                    syncToken={session.getHistoryVersion()}
                    title="一生/全周目限用次数，达到后从角色习得列表移除并提示用尽；留空 = 不限（酒神 9 次）"
                    monospace
                    min={1}
                    enforceRange={false}
                    step={1}
                    value={skill.lifetimeLimit}
                    allowEmpty
                    placeholder="不限"
                    onWheel={(event) => event.currentTarget.blur()}
                    onCommit={(value) => patch({ lifetimeLimit: value })}
                  />
                  <DsCheckbox
                    label="战外可用"
                    checked={skill.usableOutsideBattle}
                    onChange={(e) => patch({ usableOutsideBattle: e.target.checked })}
                  />
                </div>
                <div className="skill-cost-items item-amount-list">
                  <div className="item-effect-subhead">
                    <span>消耗物品</span>
                    <DsButton
                      data-ds-add-picker-deferred="skill/cost-items-append-default"
                      variant="secondary"
                      icon="add"
                      aria-label="添加消耗物品"
                      disabled={
                        !items.some(
                          (item) =>
                            !(skill.cost.items ?? []).some((entry) => entry.itemId === item.id),
                        )
                      }
                      onClick={() => {
                        const current = skill.cost.items ?? []
                        const firstUnused = items.find(
                          (item) => !current.some((entry) => entry.itemId === item.id),
                        )
                        if (firstUnused)
                          setCostItems([...current, { itemId: firstUnused.id, amount: 1 }])
                      }}
                    >
                      添加消耗物品
                    </DsButton>
                  </div>
                  {(skill.cost.items ?? []).map((entry, index, entries) => {
                    const usedByOtherRows = new Set(
                      entries
                        .filter((_, otherIndex) => otherIndex !== index)
                        .map((other) => other.itemId),
                    )
                    const choices = items.filter(
                      (item) => item.id === entry.itemId || !usedByOtherRows.has(item.id),
                    )
                    return (
                      <div
                        className="item-amount-row skill-cost-item-row"
                        key={`${skill.id}-${entry.itemId}-${index}`}
                      >
                        <NamedIdPicker
                          size="compact"
                          value={entry.itemId}
                          choices={choices}
                          kindLabel="物品"
                          inputName={`skill-${skill.id}-cost-item-${index}`}
                          onChange={(itemId) => {
                            const next = [...entries]
                            next[index] = { ...entry, itemId }
                            setCostItems(next)
                          }}
                        />
                        <DsDraftNumberInput
                          size="compact"
                          monospace
                          min={1}
                          step={1}
                          integer
                          normalize={(value) => Math.max(1, Math.trunc(value))}
                          draftKey={`skill:${skill.id}:cost.items.${index}.amount`}
                          syncToken={session.getHistoryVersion()}
                          aria-label={`消耗物品数量 ${index + 1}`}
                          value={entry.amount}
                          onWheel={(event) => event.currentTarget.blur()}
                          onCommit={(amount) => {
                            if (amount === undefined) return
                            const next = [...entries]
                            next[index] = { ...entry, amount }
                            setCostItems(next)
                          }}
                        />
                        <DsIconButton
                          size="compact"
                          variant="danger"
                          icon="delete"
                          label={`删除消耗物品 ${index + 1}`}
                          onClick={() => setCostItems(entries.filter((_, row) => row !== index))}
                        />
                      </div>
                    )
                  })}
                </div>
                <DsDraftTextAreaField
                  fieldClassName="skill-description-field"
                  label="说明"
                  draftKey={`skill:${skill.id}:desc`}
                  syncToken={session.getHistoryVersion()}
                  value={skill.desc}
                  onCommit={(value) => patch({ desc: value })}
                  spellCheck={false}
                />
              </DsWorkbenchSection>

              <DsWorkbenchSection
                title="效果链"
                description="效果按顺序执行；「条件门」失败会截断其后的效果（与原版 jump-on-fail 同构）。"
              >
                {skill.effects.length > 0 ? (
                  <DsReorderCollection
                    adoptionId="skill/base-effects"
                    scopeKey={`skill:${skill.id}:effects`}
                    entries={skill.effects.map((effect, index) => ({
                      key: effectReorderKeys.keys[index]!,
                      label:
                        EFFECT_KINDS.find((kind) => kind.v === effect.kind)?.label ?? effect.kind,
                    }))}
                    revision={session.getHistoryVersion()}
                    onReorder={reorderEffects}
                  >
                    <ol className="skill-effect-chain" data-skill-effect-chain="base">
                      {skill.effects.map((e, i) => {
                        const reorderKey = effectReorderKeys.keys[i]!
                        return (
                          <DsReorderItem as="li" itemKey={reorderKey} key={reorderKey}>
                            <SkillEffectCard
                              index={i}
                              reorderKey={reorderKey}
                              effect={e}
                              kindOptions={EFFECT_KINDS}
                              preview={effectPreview({
                                effect: e,
                                assetBase,
                                assetReader,
                                battleSprites,
                              })}
                              onKindChange={(kind) => {
                                try {
                                  setEffect(i, defaultEffect(kind, battleSprites))
                                  onStatusNotice?.(undefined)
                                } catch (reason) {
                                  onStatusNotice?.({
                                    kind: 'error',
                                    message:
                                      reason instanceof Error ? reason.message : String(reason),
                                  })
                                }
                              }}
                              onRemove={() =>
                                patch({ effects: skill.effects.filter((_, index) => index !== i) })
                              }
                            >
                              <EffectFields
                                e={e}
                                draftScope={`skill:${skill.id}:effects.${reorderKey}`}
                                syncToken={session.getHistoryVersion()}
                                on={(next) => setEffect(i, next)}
                                assetCatalog={assetCatalog}
                                assetReader={assetReader}
                                battleSprites={battleSprites}
                                onOpenSound={onOpenSound}
                                onOpenBattleSprite={onOpenBattleSprite}
                              />
                            </SkillEffectCard>
                          </DsReorderItem>
                        )
                      })}
                    </ol>
                  </DsReorderCollection>
                ) : (
                  <div className="skill-effect-empty">尚未配置技能效果。</div>
                )}
                <DsButton
                  variant="secondary"
                  icon="add"
                  className="skill-effect-chain__add"
                  onClick={() =>
                    patch({ effects: [...skill.effects, defaultEffect('damage', battleSprites)] })
                  }
                >
                  添加效果
                </DsButton>
              </DsWorkbenchSection>

              <DsWorkbenchSection
                title="动画"
                description="配置 FIRE 特效参数；右侧预览会随参数实时更新。"
              >
                <SkillAnimationEditor
                  animation={skill.animation}
                  onChange={(animation) => patch({ animation })}
                  assetCatalog={assetCatalog}
                  assetReader={assetReader}
                  assetBase={assetBase}
                  onOpenSound={onOpenSound}
                  draftScope={`skill:${skill.id}:animation`}
                  syncToken={session.getHistoryVersion()}
                />
              </DsWorkbenchSection>

              <DsWorkbenchSection
                title="施法分支"
                description="仅用于区分玩家和敌人施法；不设置时沿用公共效果和动画。"
              >
                {(['player', 'enemy'] as const).map((side) => {
                  const override = skill.execution?.[side]
                  return override ? (
                    <div key={side} className="section-subpanel">
                      <ExecutionOverrideEditor
                        side={side}
                        draftScope={`skill:${skill.id}:execution.${side}`}
                        syncToken={session.getHistoryVersion()}
                        override={override}
                        fallbackAnimation={skill.animation}
                        onChange={(next) => setExecution(side, next)}
                        assetCatalog={assetCatalog}
                        assetReader={assetReader}
                        assetBase={assetBase}
                        battleSprites={battleSprites}
                        onOpenSound={onOpenSound}
                        onOpenBattleSprite={onOpenBattleSprite}
                      />
                      <DsButton
                        variant="danger"
                        icon="delete"
                        onClick={() => setExecution(side, undefined)}
                      >
                        删除{side === 'player' ? '玩家' : '敌人'}分支
                      </DsButton>
                    </div>
                  ) : (
                    <DsButton
                      key={side}
                      variant="secondary"
                      icon="add"
                      onClick={() => setExecution(side, { effects: [] })}
                    >
                      添加{side === 'player' ? '玩家' : '敌人'}施法分支
                    </DsButton>
                  )
                })}
              </DsWorkbenchSection>
            </div>
          </>
        ) : (
          <div className="insp-empty ds-empty-state--roomy">无技能</div>
        )}
      </div>
      <DsInspectorHost className="inspector inspector--tabbed battle-data-inspector">
        <div className="insp-head">
          <div className="what">技能</div>
          <div className="who">{skill?.name ?? '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="skill-inspector"
          label="技能检查器"
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as SkillInspectorTab)}
          items={[
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <DsInspectorSection
                  title="引用"
                  description="删除会被任何角色、道具、敌人或开局配置中的引用阻断。"
                >
                  <DsReferencePanel
                    state={references.length ? 'ready' : 'empty'}
                    count={{ kind: 'exact', value: references.length }}
                    impact={{
                      kind: 'blocking',
                      description: references.length
                        ? '解除角色、道具、敌人或开局配置中的引用后才能删除。'
                        : '当前技能可以安全删除。',
                    }}
                  >
                    {references.length ? (
                      <DsReferenceList>
                        {references.map((reference) => (
                          <DsReferenceRow
                            key={`${reference.where}:${reference.kind}`}
                            title={reference.label}
                            detail={reference.detail}
                            path={reference.where}
                            action={
                              reference.locator && onOpenReference
                                ? {
                                    label: '打开',
                                    onActivate: () => onOpenReference(reference),
                                  }
                                : undefined
                            }
                            status={
                              reference.locator && onOpenReference
                                ? undefined
                                : {
                                    label: '暂不可定位',
                                    reason: '当前没有可编辑的精确位置。',
                                    tone: 'warning',
                                  }
                            }
                          />
                        ))}
                      </DsReferenceList>
                    ) : null}
                  </DsReferencePanel>
                </DsInspectorSection>
              ),
            },
            {
              id: 'help',
              label: '说明',
              panel: (
                <DsInspectorSection title="编辑说明">
                  <p className="insp-hint">
                    全字段即改即生效（⌘Z 可回）。效果链有序，「条件门」失败会截断其后。
                    升级习得在「角色」页管理，敌人施法在「敌人」页管理。
                  </p>
                </DsInspectorSection>
              ),
            },
          ]}
        />
      </DsInspectorHost>
    </>
  )
}
