import type {
  AuthorCommand,
  ItemData,
  ItemUseEffect,
  PoisonCurability,
  PoisonDef,
  SceneDef,
  SceneIndexV1,
  ScriptRef,
  StatusId,
  ThrowEffect,
  ThrowSpec,
  UseSpec,
} from '@type-pal/content'
import { itemUseEffectSupportsContext } from '@type-pal/content'
import {
  type ComponentProps,
  createContext,
  memo,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from 'react'
import {
  DsButton,
  DsCheckbox,
  DsDraftNumberField,
  DsDraftTextField,
  DsField,
  DsFieldGroup,
  DsReadonlyValue,
  DsSelect,
  DsSelectField,
} from './design-system/controls.js'
import {
  DsReorderCollection,
  type DsReorderIntent,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/reorder.js'
import { EffectEditorCard, EffectEditorChain } from './EffectEditorCard.js'
import { CanonicalScriptBodyEditor, type CanonicalScriptEditorContext } from './ScriptEditor.js'

const STATUSES: { value: StatusId; label: string }[] = [
  { value: 'confused', label: '混乱' },
  { value: 'paralyzed', label: '定身' },
  { value: 'sleep', label: '睡眠' },
  { value: 'silence', label: '沉默' },
  { value: 'puppet', label: '傀儡' },
  { value: 'bravery', label: '神勇' },
  { value: 'protect', label: '护体' },
  { value: 'haste', label: '加速' },
  { value: 'dualAttack', label: '连击' },
]

const EFFECT_KINDS: { value: ItemUseEffect['kind']; label: string }[] = [
  { value: 'healHp', label: '回复体力' },
  { value: 'healMp', label: '回复真气' },
  { value: 'revive', label: '复活' },
  { value: 'applyStatus', label: '施加状态' },
  { value: 'removeStatus', label: '解除状态' },
  { value: 'applyPoison', label: '施毒' },
  { value: 'curePoison', label: '解毒' },
  { value: 'permanentStatBoost', label: '永久成长' },
  { value: 'gate', label: '概率门槛' },
  { value: 'dieIfNotPoisoned', label: '未中毒则死亡' },
  { value: 'runScript', label: '使用可复用脚本' },
  { value: 'runSceneHook', label: '调用场景钩子' },
  { value: 'craftRecipe', label: '炼蛊皿配方' },
  { value: 'drawFromResourcePool', label: '紫金葫芦奖励' },
  { value: 'extraPoisonRes', label: '临时毒抗' },
  { value: 'hideParty', label: '全队隐身' },
  { value: 'modifyHostileAwareness', label: '调整明雷感知' },
  { value: 'scaleCurrentHp', label: '按比例调整当前体力' },
  { value: 'levelUp', label: '提升等级' },
  { value: 'placeEntityInFront', label: '把场景实体放到玩家面前' },
]

const EXCLUSIVE_EFFECTS = new Set<ItemUseEffect['kind']>([
  'runScript',
  'runSceneHook',
  'placeEntityInFront',
])
const SCENE_EFFECTS = new Set<ItemUseEffect['kind']>([
  'runScript',
  'runSceneHook',
  'craftRecipe',
  'drawFromResourcePool',
  'modifyHostileAwareness',
  'placeEntityInFront',
])

const ALCHEMY_EFFECTS = new Set<ItemUseEffect['kind']>(['craftRecipe', 'drawFromResourcePool'])

const ItemEffectDraftContext = createContext({
  scope: 'item-effect',
  syncToken: 0 as string | number,
})

function ItemEffectDraftScope(props: {
  scope: string
  syncToken?: string | number
  children: ReactNode
}) {
  const parent = useContext(ItemEffectDraftContext)
  return (
    <ItemEffectDraftContext.Provider
      value={{
        scope: `${parent.scope}:${props.scope}`,
        syncToken: props.syncToken ?? parent.syncToken,
      }}
    >
      {props.children}
    </ItemEffectDraftContext.Provider>
  )
}

export interface ItemScriptOption {
  ref: ScriptRef
  label: string
}

export interface ItemPrivateScriptBinding {
  label: string
  body: AuthorCommand[]
  onChange: (body: AuthorCommand[]) => void
  editorContext?: CanonicalScriptEditorContext
  focusCommandPath?: string
  focusRevision?: number
}

function ItemPrivateScriptBodyEditor(props: {
  binding: ItemPrivateScriptBinding
  onError?: (message: string) => void
}) {
  const ownerRef = useRef<HTMLDivElement>(null)
  const lastOwnerFocusRevisionRef = useRef<number | undefined>(undefined)
  const ownerFocusRevision =
    props.binding.focusCommandPath === undefined ? props.binding.focusRevision : undefined
  useEffect(() => {
    if (
      ownerFocusRevision === undefined ||
      lastOwnerFocusRevisionRef.current === ownerFocusRevision
    )
      return
    lastOwnerFocusRevisionRef.current = ownerFocusRevision
    window.requestAnimationFrame(() => {
      if (lastOwnerFocusRevisionRef.current !== ownerFocusRevision) return
      ownerRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' })
      ownerRef.current?.focus({ preventScroll: true })
    })
  }, [ownerFocusRevision])

  return (
    <div
      ref={ownerRef}
      className={`item-private-script${
        ownerFocusRevision === undefined
          ? ''
          : ` item-private-script--reference-focus-${ownerFocusRevision % 2 ? 'odd' : 'even'}`
      }`}
      data-item-private-script={props.binding.label}
      tabIndex={-1}
    >
      <div>
        <strong>{props.binding.label}</strong>
        <span>只用于当前物品，可与其他效果一起执行</span>
      </div>
      <CanonicalScriptBodyEditor
        label={`${props.binding.label} · 正文`}
        body={props.binding.body}
        context={props.binding.editorContext}
        onChange={props.binding.onChange}
        onError={props.onError}
        focusCommandPath={props.binding.focusCommandPath}
        focusRevision={props.binding.focusRevision}
      />
    </div>
  )
}

function positive(value: number, fallback = 1): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback
}

function signed(value: number, fallback = 1): number {
  return Number.isFinite(value) && value !== 0 ? Math.trunc(value) : fallback
}

function firstItem(items: readonly ItemData[], excludedId?: string): string {
  const id = items.find((item) => item.id !== excludedId)?.id
  if (!id) throw new Error('项目没有物品，无法创建物品配方或奖励')
  return id
}

function firstPoison(poisons: readonly PoisonDef[]): string {
  const poison = poisons[0]
  if (!poison) throw new Error('项目没有毒定义，无法创建施毒效果')
  return String(poison.id)
}

function firstScript(scripts: readonly ItemScriptOption[]): ScriptRef {
  const script = scripts[0]
  if (!script) throw new Error('项目没有可复用脚本；请先在“剧情 → 共享脚本”中创建')
  return script.ref
}

export function defaultItemUseEffect(
  kind: ItemUseEffect['kind'],
  items: readonly ItemData[],
  poisons: readonly PoisonDef[],
  scripts: readonly ItemScriptOption[],
  excludedIngredientItemId?: string,
  scenes: readonly SceneDef[] = [],
): ItemUseEffect {
  switch (kind) {
    case 'healHp':
      return { kind, amount: 100 }
    case 'healMp':
      return { kind, amount: 50 }
    case 'revive':
      return { kind, hpPercent: 30 }
    case 'applyStatus':
      return { kind, status: 'protect', turns: 3 }
    case 'removeStatus':
      return { kind, statuses: ['confused'] }
    case 'applyPoison':
      return { kind, poisonId: firstPoison(poisons) }
    case 'curePoison':
      return { kind, curesTier: 'common' }
    case 'permanentStatBoost':
      return { kind, stat: 'maxHP', delta: 5 }
    case 'gate':
      return { kind, chance: 50 }
    case 'dieIfNotPoisoned':
      return { kind }
    case 'runScript':
      return { kind, script: firstScript(scripts) }
    case 'runSceneHook':
      return { kind, hook: 'onTeleport', unavailableMessage: '此处无法使用。' }
    case 'craftRecipe': {
      const ingredientId = firstItem(items, excludedIngredientItemId)
      const productId = firstItem(items)
      return {
        kind,
        recipes: [
          {
            ingredients: [{ itemId: ingredientId, count: 1 }],
            products: [{ itemId: productId, count: 1 }],
          },
        ],
        unavailableMessage: '材料不足。',
      }
    }
    case 'drawFromResourcePool':
      return {
        kind,
        resource: 'resource',
        maxRoll: 1,
        rewards: [{ itemId: firstItem(items), count: 1 }],
        unavailableMessage: '当前没有可抽取的资源。',
      }
    case 'extraPoisonRes':
      return { kind, amount: 10 }
    case 'hideParty':
      return { kind, turns: 3 }
    case 'modifyHostileAwareness':
      return { kind, rangeMultiplier: 0, durationMs: 60_000 }
    case 'scaleCurrentHp':
      return { kind, numerator: 1, denominator: 2 }
    case 'levelUp':
      return { kind, levels: 1 }
    case 'placeEntityInFront': {
      const scene = scenes.find((candidate) => candidate.entities.length > 0)
      const entity = scene?.entities[0]
      if (!scene || !entity) throw new Error('项目没有场景实体，无法创建放置实体效果')
      return {
        kind,
        target: { scene: scene.id, entity: entity.id },
        state: 2,
        unavailableMessage: '前方没有足够空间。',
      }
    }
  }
}

type EffectSelectFieldProps = Pick<
  ComponentProps<typeof DsSelectField>,
  'label' | 'fieldClassName' | 'aria-label' | 'value' | 'options' | 'onValueChange' | 'disabled'
>

function EffectSelectField(props: EffectSelectFieldProps) {
  return (
    <DsFieldGroup layout="stacked">
      <DsSelectField
        label={props.label}
        fieldClassName={props.fieldClassName ?? 'item-effect-field'}
        aria-label={props['aria-label']}
        value={props.value}
        options={props.options}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
      />
    </DsFieldGroup>
  )
}

type EffectDraftTextFieldProps = Pick<
  ComponentProps<typeof DsDraftTextField>,
  | 'label'
  | 'fieldClassName'
  | 'draftKey'
  | 'syncToken'
  | 'monospace'
  | 'value'
  | 'onCommit'
  | 'invalid'
  | 'aria-label'
  | 'placeholder'
> & { wide?: boolean }

function EffectDraftTextField(props: EffectDraftTextFieldProps) {
  if (props.wide) {
    return (
      <DsFieldGroup layout="stacked" className="item-effect-field-wide">
        <DsDraftTextField
          label={props.label}
          fieldClassName={props.fieldClassName ?? 'item-effect-field'}
          draftKey={props.draftKey}
          syncToken={props.syncToken}
          monospace={props.monospace}
          value={props.value}
          invalid={props.invalid}
          aria-label={props['aria-label']}
          placeholder={props.placeholder}
          onCommit={props.onCommit}
        />
      </DsFieldGroup>
    )
  }
  return (
    <DsFieldGroup layout="stacked">
      <DsDraftTextField
        label={props.label}
        fieldClassName={props.fieldClassName ?? 'item-effect-field'}
        draftKey={props.draftKey}
        syncToken={props.syncToken}
        monospace={props.monospace}
        value={props.value}
        invalid={props.invalid}
        aria-label={props['aria-label']}
        placeholder={props.placeholder}
        onCommit={props.onCommit}
      />
    </DsFieldGroup>
  )
}

function EffectReadonlyField(props: { label: string; children: ReactNode }) {
  return (
    <DsFieldGroup layout="stacked">
      <DsField label={props.label} className="item-effect-field">
        {props.children}
      </DsField>
    </DsFieldGroup>
  )
}

function NumberField(props: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  signed?: boolean
  allowZero?: boolean
}) {
  const draft = useContext(ItemEffectDraftContext)
  return (
    <DsFieldGroup layout="stacked">
      <DsDraftNumberField
        label={props.label}
        fieldClassName="item-effect-field"
        draftKey={`${draft.scope}:number:${props.label}`}
        syncToken={draft.syncToken}
        min={props.min}
        max={props.max}
        enforceRange={false}
        value={props.value}
        integer
        onCommit={(raw) => {
          if (raw === undefined) return
          let next = props.allowZero
            ? Number.isFinite(raw)
              ? Math.trunc(raw)
              : 0
            : props.signed
              ? signed(raw)
              : positive(raw)
          if (props.min !== undefined) next = Math.max(props.min, next)
          if (props.max !== undefined) next = Math.min(props.max, next)
          props.onChange(next)
        }}
      />
    </DsFieldGroup>
  )
}

function EffectFields(props: {
  effect: ItemUseEffect
  items: readonly ItemData[]
  poisons: readonly PoisonDef[]
  scripts: readonly ItemScriptOption[]
  onChange: (effect: ItemUseEffect) => void
  onOpenScript?: (id: string) => void
  onOpenAlchemy?: (surface: 'crafting' | 'spirit-gourd') => void
  subjectItemId?: string
  consuming?: boolean
  scenes?: readonly SceneDef[]
  sceneIndex?: SceneIndexV1
  draftScope?: string
  syncToken?: string | number
}) {
  const { effect, poisons, scripts, onChange } = props
  const draft = useContext(ItemEffectDraftContext)
  switch (effect.kind) {
    case 'healHp':
    case 'healMp':
      return (
        <NumberField
          label="数值"
          value={effect.amount}
          signed
          onChange={(amount) => onChange({ ...effect, amount })}
        />
      )
    case 'revive':
      return (
        <NumberField
          label="复活体力 %"
          value={effect.hpPercent}
          min={1}
          max={100}
          onChange={(hpPercent) => onChange({ ...effect, hpPercent })}
        />
      )
    case 'applyStatus':
      return (
        <>
          <EffectSelectField
            label="状态"
            fieldClassName="item-effect-field"
            aria-label="状态"
            value={effect.status}
            options={STATUSES}
            onValueChange={(value) => onChange({ ...effect, status: value as StatusId })}
          />
          <NumberField
            label="回合"
            value={effect.turns}
            onChange={(turns) => onChange({ ...effect, turns })}
          />
        </>
      )
    case 'removeStatus':
      return (
        <fieldset className="item-status-checks">
          <legend>解除状态</legend>
          {STATUSES.map((status) => {
            const checked = effect.statuses.includes(status.value)
            return (
              <DsCheckbox
                key={status.value}
                label={status.label}
                checked={checked}
                onChange={(event) => {
                  if (!event.target.checked && effect.statuses.length === 1) return
                  onChange({
                    ...effect,
                    statuses: event.target.checked
                      ? [...effect.statuses, status.value]
                      : effect.statuses.filter((value) => value !== status.value),
                  })
                }}
              />
            )
          })}
        </fieldset>
      )
    case 'applyPoison':
      return (
        <EffectSelectField
          label="毒"
          fieldClassName="item-effect-field"
          aria-label="毒"
          value={effect.poisonId}
          options={[
            ...(!poisons.some((poison) => String(poison.id) === effect.poisonId)
              ? [{ value: effect.poisonId, label: `⚠ ${effect.poisonId}` }]
              : []),
            ...poisons.map((poison) => ({
              value: String(poison.id),
              label: poison.name,
              description: String(poison.id),
            })),
          ]}
          onValueChange={(value) => onChange({ ...effect, poisonId: value })}
        />
      )
    case 'curePoison': {
      const mode = effect.poisonId ? 'poison' : 'tier'
      return (
        <>
          <EffectSelectField
            label="方式"
            fieldClassName="item-effect-field"
            aria-label="解毒方式"
            value={mode}
            options={[
              { value: 'tier', label: '按可解等级' },
              { value: 'poison', label: '指定毒', disabled: !poisons.length },
            ]}
            onValueChange={(value) =>
              onChange(
                value === 'poison'
                  ? { kind: 'curePoison', poisonId: firstPoison(poisons) }
                  : { kind: 'curePoison', curesTier: 'common' },
              )
            }
          />
          {mode === 'poison' ? (
            <EffectSelectField
              label="毒"
              fieldClassName="item-effect-field"
              aria-label="指定毒"
              value={effect.poisonId ?? ''}
              options={poisons.map((poison) => ({
                value: String(poison.id),
                label: poison.name,
                description: String(poison.id),
              }))}
              onValueChange={(value) => onChange({ kind: 'curePoison', poisonId: value })}
            />
          ) : (
            <EffectSelectField
              label="最高等级"
              fieldClassName="item-effect-field"
              aria-label="可解毒最高等级"
              value={effect.curesTier ?? 'common'}
              options={[
                { value: 'common', label: '常规' },
                { value: 'severe', label: '剧毒' },
                { value: 'incurable', label: '无解' },
              ]}
              onValueChange={(value) =>
                onChange({
                  kind: 'curePoison',
                  curesTier: value as PoisonCurability,
                })
              }
            />
          )}
        </>
      )
    }
    case 'permanentStatBoost':
      return (
        <>
          <EffectSelectField
            label="属性"
            fieldClassName="item-effect-field"
            aria-label="永久成长属性"
            value={effect.stat}
            options={[
              { value: 'maxHP', label: '体力上限' },
              { value: 'maxMP', label: '真气上限' },
              { value: 'attack', label: '武术' },
              { value: 'magicAttack', label: '灵力' },
              { value: 'defense', label: '防御' },
              { value: 'speed', label: '身法' },
              { value: 'luck', label: '吉运' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                stat: value as typeof effect.stat,
              })
            }
          />
          <NumberField
            label="增量"
            value={effect.delta}
            signed
            onChange={(delta) => onChange({ ...effect, delta })}
          />
        </>
      )
    case 'gate':
      return (
        <NumberField
          label="成功率 %"
          value={effect.chance ?? 100}
          min={1}
          max={100}
          onChange={(chance) => onChange({ ...effect, chance })}
        />
      )
    case 'runScript': {
      const current = scripts.find((script) => script.ref.id === effect.script.id)
      return (
        <div className="item-script-binding">
          <EffectSelectField
            label="可复用脚本"
            fieldClassName="item-effect-field"
            aria-label="可复用脚本"
            value={effect.script.id}
            options={[
              ...(!current ? [{ value: effect.script.id, label: `⚠ ${effect.script.id}` }] : []),
              ...scripts.map((script) => ({
                value: script.ref.id,
                label: script.label,
                description: script.ref.id,
              })),
            ]}
            onValueChange={(value) => {
              const option = scripts.find((script) => script.ref.id === value)
              if (option) onChange({ ...effect, script: option.ref })
            }}
          />
          <DsButton
            variant="secondary"
            icon="open"
            disabled={!effect.script.id || !props.onOpenScript}
            onClick={() => props.onOpenScript?.(effect.script.id)}
          >
            打开脚本
          </DsButton>
        </div>
      )
    }
    case 'runSceneHook':
      return (
        <>
          <EffectReadonlyField label="当前场景钩子">
            <DsReadonlyValue className="item-effect-readonly">传送出口 onTeleport</DsReadonlyValue>
          </EffectReadonlyField>
          <EffectDraftTextField
            label="不可用提示"
            wide
            draftKey={`${draft.scope}:unavailableMessage`}
            syncToken={draft.syncToken}
            value={effect.unavailableMessage ?? ''}
            placeholder="留空则使用默认提示"
            onCommit={(value) => {
              onChange(
                value
                  ? { ...effect, unavailableMessage: value }
                  : { kind: 'runSceneHook', hook: effect.hook },
              )
            }}
          />
        </>
      )
    case 'craftRecipe':
      return (
        <div className="item-alchemy-effect-summary">
          <div>
            <strong>炼蛊皿自动取材</strong>
            <span>直接使用后自动采用首条材料充足规则 · 共 {effect.recipes.length} 条</span>
          </div>
          <DsButton
            variant="secondary"
            icon="open"
            disabled={!props.onOpenAlchemy}
            onClick={() => props.onOpenAlchemy?.('crafting')}
          >
            在“炼蛊皿”页面编辑
          </DsButton>
        </div>
      )
    case 'drawFromResourcePool':
      return (
        <div className="item-alchemy-effect-summary">
          <div>
            <strong>紫金葫芦奖励</strong>
            <span>
              {effect.resource} · 最高实际消耗 {effect.maxRoll} 灵葫值 · 第 N 行实际扣除 N 点
            </span>
          </div>
          <DsButton
            variant="secondary"
            icon="open"
            disabled={!props.onOpenAlchemy}
            onClick={() => props.onOpenAlchemy?.('spirit-gourd')}
          >
            在“紫金葫芦”页面编辑
          </DsButton>
        </div>
      )
    case 'extraPoisonRes':
      return (
        <NumberField
          label="毒抗增量"
          value={effect.amount}
          min={1}
          onChange={(amount) => onChange({ ...effect, amount })}
        />
      )
    case 'hideParty':
      return (
        <NumberField
          label="隐身回合"
          value={effect.turns}
          onChange={(turns) => onChange({ ...effect, turns })}
        />
      )
    case 'modifyHostileAwareness':
      return (
        <>
          <EffectSelectField
            label="感知范围"
            fieldClassName="item-effect-field"
            aria-label="明雷感知范围"
            value={String(effect.rangeMultiplier)}
            options={[
              { value: '0', label: '停止追逐' },
              { value: '3', label: '扩大至 3 倍' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                rangeMultiplier: Number(value) as 0 | 3,
              })
            }
          />
          <NumberField
            label="持续毫秒"
            value={effect.durationMs}
            onChange={(durationMs) => onChange({ ...effect, durationMs })}
          />
        </>
      )
    case 'scaleCurrentHp':
      return (
        <>
          <NumberField
            label="体力比例分子"
            value={effect.numerator}
            onChange={(numerator) => onChange({ ...effect, numerator })}
          />
          <NumberField
            label="体力比例分母"
            value={effect.denominator}
            onChange={(denominator) => onChange({ ...effect, denominator })}
          />
        </>
      )
    case 'levelUp':
      return (
        <NumberField
          label="提升级数"
          value={effect.levels}
          onChange={(levels) => onChange({ ...effect, levels })}
        />
      )
    case 'placeEntityInFront': {
      const scenes = props.scenes ?? []
      const scene = scenes.find((candidate) => candidate.id === effect.target.scene)
      const entityLabel = (entity: SceneDef['entities'][number]): string => {
        const source =
          'actor' in entity
            ? `角色 ${entity.actor}`
            : 'sprite' in entity
              ? `精灵 ${entity.sprite}`
              : '区域'
        return `${entity.id} · ${source}`
      }
      return (
        <>
          <EffectSelectField
            label="场景"
            fieldClassName="item-effect-field"
            aria-label="目标场景"
            value={effect.target.scene}
            options={[
              ...(!scene
                ? [{ value: effect.target.scene, label: `⚠ ${effect.target.scene}` }]
                : []),
              ...scenes.map((candidate) => ({
                value: candidate.id,
                label: (() => {
                  const asset = props.sceneIndex?.scenes.find((entry) => entry.id === candidate.id)
                  return asset ? `${asset.name} · ${candidate.id}` : candidate.id
                })(),
                description: candidate.entities.length ? undefined : '无可放置实体',
                disabled: candidate.entities.length === 0,
              })),
            ]}
            onValueChange={(value) => {
              const nextScene = scenes.find((candidate) => candidate.id === value)
              onChange({
                ...effect,
                target: {
                  scene: value,
                  entity: nextScene?.entities[0]?.id ?? effect.target.entity,
                },
              })
            }}
          />
          <EffectSelectField
            label="实体"
            fieldClassName="item-effect-field"
            aria-label="目标实体"
            value={effect.target.entity}
            options={[
              ...(!scene?.entities.some((entity) => entity.id === effect.target.entity)
                ? [{ value: effect.target.entity, label: `⚠ ${effect.target.entity}` }]
                : []),
              ...(scene?.entities.map((entity) => ({
                value: entity.id,
                label: entityLabel(entity),
              })) ?? []),
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                target: { ...effect.target, entity: value },
              })
            }
          />
          <NumberField
            label="放置后的状态"
            value={effect.state}
            allowZero
            onChange={(state) => onChange({ ...effect, state })}
          />
          <EffectDraftTextField
            label="无法放置时提示"
            wide
            draftKey={`${draft.scope}:placementUnavailableMessage`}
            syncToken={draft.syncToken}
            value={effect.unavailableMessage ?? ''}
            onCommit={(value) => onChange({ ...effect, unavailableMessage: value || undefined })}
          />
        </>
      )
    }
    case 'dieIfNotPoisoned':
      return <span className="hint2">目标没有中毒时死亡；已中毒则继续执行后续效果。</span>
  }
}

interface ItemUseEffectChainEditorProps {
  spec: UseSpec
  items: readonly ItemData[]
  poisons: readonly PoisonDef[]
  scripts: readonly ItemScriptOption[]
  onChange: (next: UseSpec) => void
  onOpenScript?: (id: string) => void
  onOpenAlchemy?: (surface: 'crafting' | 'spirit-gourd') => void
  /** ED-5J: 新建当前物品脚本（use 槽）；提供时在“添加效果”旁显示入口。 */
  onAddPrivateScript?: () => void
  onError?: (message: string) => void
  itemId?: string
  /** item-private effect 的 canonical 正文；索引与运行时投影中的占位 runScript 对齐。 */
  privateScripts?: Readonly<Record<number, ItemPrivateScriptBinding>>
  scenes?: readonly SceneDef[]
  sceneIndex?: SceneIndexV1
  draftScope?: string
  syncToken?: string | number
}

function ItemUseEffectChainEditor(props: ItemUseEffectChainEditorProps) {
  const { spec: use, items, poisons, scripts, onChange } = props
  const reorderKeys = useDsReorderKeys(use.effects, (effect) => JSON.stringify(effect))
  const reorderScope = props.draftScope ?? `item:${props.itemId ?? 'unknown'}:use`
  const reorderRevision = props.syncToken ?? 0
  const excludedIngredientItemId = use.consuming ? props.itemId : undefined
  const isPrivateScriptEffect = (effect: ItemUseEffect): boolean =>
    effect.kind === 'runScript' &&
    effect.script.chunk === '__author-script-runtime' &&
    effect.script.id.startsWith(`item:${props.itemId ?? ''}:`)
  const isExclusiveEffect = (effect: ItemUseEffect): boolean =>
    EXCLUSIVE_EFFECTS.has(effect.kind) && !isPrivateScriptEffect(effect)
  const isSceneEffect = (effect: ItemUseEffect): boolean =>
    SCENE_EFFECTS.has(effect.kind) && !isPrivateScriptEffect(effect)
  const createDefaultEffect = (kind: ItemUseEffect['kind']): ItemUseEffect =>
    defaultItemUseEffect(kind, items, poisons, scripts, excludedIngredientItemId, props.scenes)
  const compatibleChain = (effects: readonly ItemUseEffect[]): boolean => {
    if (!effects.length) return true
    const external = effects.filter(isExclusiveEffect)
    if (external.length && (external.length !== 1 || effects.length !== 1)) return false
    const containsScene = effects.some(isSceneEffect)
    const containsCharacterOrBattle = effects.some(
      (effect) =>
        !isSceneEffect(effect) && !isPrivateScriptEffect(effect) && effect.kind !== 'gate',
    )
    if (containsScene && containsCharacterOrBattle) return false
    return (['world', 'battle'] as const).some((context) =>
      effects.every((effect) => itemUseEffectSupportsContext(effect, context)),
    )
  }
  const patchEffects = (effects: ItemUseEffect[]): void => {
    if (!compatibleChain(effects)) {
      props.onError?.('这组效果没有共同的可执行上下文；请分成不同物品用途或放入共享剧情脚本。')
      return
    }
    const containsScene = effects.some(isSceneEffect)
    const containsPrivateScript = effects.some(isPrivateScriptEffect)
    const containsCharacterOrBattle = effects.some(
      (effect) =>
        !isSceneEffect(effect) && !isPrivateScriptEffect(effect) && effect.kind !== 'gate',
    )
    const needsSceneTarget = containsScene || (containsPrivateScript && !containsCharacterOrBattle)
    const containsHide = effects.some((effect) => effect.kind === 'hideParty')
    const next: UseSpec = {
      ...use,
      effects,
      ...(needsSceneTarget ? { target: 'scene' as const } : {}),
      ...(!needsSceneTarget && use.target === 'scene' ? { target: 'oneAlly' as const } : {}),
      ...(containsHide ? { target: 'allAllies' as const, battleOnly: true } : {}),
    }
    if (
      !effects.length ||
      !effects.every((effect) => itemUseEffectSupportsContext(effect, 'battle'))
    )
      delete next.battleOnly
    onChange(next)
  }
  const reorderEffects = (intent: DsReorderIntent): boolean => {
    const effects = reorderDsItems(use.effects, intent, 'insert', sameDsSerializableValue)
    if (effects === use.effects) return false
    reorderKeys.move(intent)
    patchEffects([...effects])
    return true
  }
  const replaceAt = (index: number, effect: ItemUseEffect): void => {
    const effects = [...use.effects]
    effects[index] = effect
    patchEffects(effects)
  }
  const changeKind = (index: number, kind: ItemUseEffect['kind']): void => {
    try {
      const effect = createDefaultEffect(kind)
      if (EXCLUSIVE_EFFECTS.has(kind)) reorderKeys.retain(index)
      patchEffects(
        EXCLUSIVE_EFFECTS.has(kind)
          ? [effect]
          : use.effects.map((old, at) => (at === index ? effect : old)),
      )
    } catch (cause) {
      props.onError?.(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const compatibleKindsAt = (index: number): typeof EFFECT_KINDS =>
    EFFECT_KINDS.filter((entry) => {
      if (ALCHEMY_EFFECTS.has(entry.value)) return false
      if (entry.value === use.effects[index]?.kind) return true
      if (EXCLUSIVE_EFFECTS.has(entry.value)) return true
      try {
        const candidate = createDefaultEffect(entry.value)
        return compatibleChain(use.effects.map((effect, at) => (at === index ? candidate : effect)))
      } catch {
        return false
      }
    })
  const firstAppendableKind = (): ItemUseEffect['kind'] | undefined =>
    EFFECT_KINDS.map((entry) => entry.value).find((kind) => {
      if (ALCHEMY_EFFECTS.has(kind)) return false
      try {
        return compatibleChain([...use.effects, createDefaultEffect(kind)])
      } catch {
        return false
      }
    })

  return (
    <ItemEffectDraftContext.Provider
      value={{
        scope: reorderScope,
        syncToken: reorderRevision,
      }}
    >
      <EffectEditorChain family="item/use-effects" label="物品使用效果">
        <div className="item-use-options">
          <EffectSelectField
            label="目标"
            aria-label="使用目标"
            value={use.target}
            disabled={use.effects.some(
              (effect) =>
                isSceneEffect(effect) ||
                (isPrivateScriptEffect(effect) &&
                  !use.effects.some(
                    (candidate) =>
                      !isSceneEffect(candidate) &&
                      !isPrivateScriptEffect(candidate) &&
                      candidate.kind !== 'gate',
                  )) ||
                effect.kind === 'hideParty',
            )}
            options={[
              { value: 'oneAlly', label: '一名队友' },
              { value: 'allAllies', label: '全体队友' },
              { value: 'self', label: '使用者' },
              { value: 'scene', label: '当前场景' },
            ]}
            onValueChange={(value) =>
              onChange({ ...use, target: value as NonNullable<UseSpec['target']> })
            }
          />
          <fieldset className="item-use-rules">
            <legend>使用规则</legend>
            <div>
              <DsCheckbox
                className="item-inline-check"
                label="成功后消耗"
                checked={use.consuming}
                onChange={(event) => {
                  const consuming = event.target.checked
                  const selfIsIngredient =
                    consuming &&
                    use.effects.some(
                      (effect) =>
                        effect.kind === 'craftRecipe' &&
                        effect.recipes.some((recipe) =>
                          recipe.ingredients.some((entry) => entry.itemId === props.itemId),
                        ),
                    )
                  if (selfIsIngredient) {
                    props.onError?.('先从配方材料中移除当前工具，再开启“成功后消耗”。')
                    return
                  }
                  onChange({ ...use, consuming })
                }}
              />
              <DsCheckbox
                className="item-inline-check"
                label="仅战斗可用"
                checked={use.battleOnly === true}
                disabled={
                  !use.effects.length ||
                  !use.effects.every((effect) => itemUseEffectSupportsContext(effect, 'battle'))
                }
                onChange={(event) =>
                  onChange({ ...use, battleOnly: event.target.checked || undefined })
                }
              />
            </div>
          </fieldset>
          <EffectSelectField
            label="成功后菜单"
            aria-label="使用成功后菜单"
            value={use.menuAfterUse ?? 'keep'}
            options={[
              { value: 'keep', label: '保留物品菜单' },
              { value: 'close', label: '关闭菜单' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...use,
                menuAfterUse: value as NonNullable<UseSpec['menuAfterUse']>,
              })
            }
          />
        </div>

        <DsReorderCollection
          adoptionId="item/use-effects"
          scopeKey={`${reorderScope}:effects`}
          entries={use.effects.map((effect, index) => ({
            key: reorderKeys.keys[index]!,
            label: props.privateScripts?.[index]
              ? '当前物品脚本'
              : effect.kind === 'craftRecipe'
                ? '炼蛊皿配方'
                : effect.kind === 'drawFromResourcePool'
                  ? '紫金葫芦奖励'
                  : (EFFECT_KINDS.find((entry) => entry.value === effect.kind)?.label ??
                    effect.kind),
            disabled: isExclusiveEffect(effect) || ALCHEMY_EFFECTS.has(effect.kind),
          }))}
          revision={reorderRevision}
          onReorder={reorderEffects}
        >
          <ol className="effect-editor-list item-effect-list">
            {use.effects.map((effect, index) => {
              const reorderKey = reorderKeys.keys[index]!
              const privateScript = props.privateScripts?.[index]
              return (
                <EffectEditorCard
                  key={reorderKey}
                  itemKey={reorderKey}
                  label={`效果 ${index + 1}`}
                  density="default"
                  effectKind={privateScript ? 'author-private-script' : effect.kind}
                  kindControl={
                    privateScript ? (
                      <DsReadonlyValue className="item-private-script-kind">
                        当前物品脚本
                      </DsReadonlyValue>
                    ) : ALCHEMY_EFFECTS.has(effect.kind) ? (
                      <DsReadonlyValue className="item-alchemy-effect-kind">
                        {effect.kind === 'craftRecipe' ? '炼蛊皿' : '紫金葫芦'}
                      </DsReadonlyValue>
                    ) : (
                      <DsSelect
                        aria-label={`效果 ${index + 1} 类型`}
                        value={effect.kind}
                        options={compatibleKindsAt(index)}
                        onValueChange={(value) => changeKind(index, value as ItemUseEffect['kind'])}
                      />
                    )
                  }
                  fieldsLayout="item"
                  bodyLabel={privateScript ? '脚本内容' : undefined}
                  removeDisabled={ALCHEMY_EFFECTS.has(effect.kind)}
                  removeTitle={
                    ALCHEMY_EFFECTS.has(effect.kind)
                      ? '这是固定项目机制；普通物品页和机制页都不提供 owner 删除'
                      : undefined
                  }
                  onRemove={() => {
                    reorderKeys.remove(index)
                    patchEffects(use.effects.filter((_, at) => at !== index))
                  }}
                >
                  {privateScript ? (
                    <ItemPrivateScriptBodyEditor binding={privateScript} onError={props.onError} />
                  ) : (
                    <ItemEffectDraftScope scope={`effect:${reorderKey}:${effect.kind}`}>
                      <EffectFields
                        effect={effect}
                        items={items}
                        poisons={poisons}
                        scripts={scripts}
                        onChange={(next) => replaceAt(index, next)}
                        onOpenScript={props.onOpenScript}
                        onOpenAlchemy={props.onOpenAlchemy}
                        subjectItemId={props.itemId}
                        consuming={use.consuming}
                        scenes={props.scenes}
                        sceneIndex={props.sceneIndex}
                      />
                    </ItemEffectDraftScope>
                  )}
                </EffectEditorCard>
              )
            })}
          </ol>
        </DsReorderCollection>

        {!use.effects.length ? (
          <div className="item-capability-note">当前没有效果，可继续添加或保留为空。</div>
        ) : null}

        <div className="item-effect-actions">
          <DsButton
            data-effect-editor-add="true"
            size="compact"
            variant="primary"
            icon="add"
            className="item-add-effect"
            disabled={use.effects.some(isExclusiveEffect) || firstAppendableKind() === undefined}
            onClick={() => {
              try {
                const kind = firstAppendableKind()
                if (!kind) return
                patchEffects([...use.effects, createDefaultEffect(kind)])
              } catch (cause) {
                props.onError?.(cause instanceof Error ? cause.message : String(cause))
              }
            }}
          >
            添加效果
          </DsButton>
          {props.onAddPrivateScript ? (
            <DsButton
              size="compact"
              variant="secondary"
              icon="add"
              className="item-add-effect item-add-private-script"
              disabled={
                use.effects.some(isPrivateScriptEffect) ||
                !compatibleChain([
                  ...use.effects,
                  {
                    kind: 'runScript',
                    script: {
                      chunk: '__author-script-runtime',
                      id: `item:${props.itemId ?? ''}:__probe__`,
                    },
                  },
                ])
              }
              onClick={() => props.onAddPrivateScript?.()}
            >
              添加当前物品脚本
            </DsButton>
          ) : null}
        </div>
      </EffectEditorChain>
    </ItemEffectDraftContext.Provider>
  )
}

const THROW_EFFECT_KINDS: { value: ThrowEffect['kind']; label: string }[] = [
  { value: 'magicDamage', label: '法术伤害' },
  { value: 'fixedDamage', label: '固定伤害' },
  { value: 'applyPoison', label: '施毒' },
  { value: 'currentHpDamage', label: '按当前体力造成伤害' },
  { value: 'applyStatus', label: '施加状态' },
  { value: 'killIfHpAtMost', label: '低血量即死' },
  { value: 'damageAndHealCaster', label: '伤害并回复使用者' },
]

export function defaultThrowEffect(
  kind: ThrowEffect['kind'],
  poisons: readonly PoisonDef[],
): ThrowEffect {
  switch (kind) {
    case 'magicDamage':
      return {
        kind,
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'fixed', value: 1 },
      }
    case 'fixedDamage':
      return { kind, amount: 1 }
    case 'applyPoison':
      return { kind, poisonId: firstPoison(poisons) }
    case 'currentHpDamage':
      return { kind, numerator: 1, denominator: 2, bonus: 1, cap: 1000 }
    case 'applyStatus':
      return { kind, status: 'sleep', turns: 1, onResist: 'continue' }
    case 'killIfHpAtMost':
      return { kind, percent: 25 }
    case 'damageAndHealCaster':
      return { kind, damage: 180, heal: 180 }
  }
}

function ThrowEffectFields(props: {
  effect: ThrowEffect
  poisons: readonly PoisonDef[]
  onChange: (effect: ThrowEffect) => void
}) {
  const { effect, poisons, onChange } = props
  switch (effect.kind) {
    case 'magicDamage': {
      const strength = effect.strength
      return (
        <>
          <NumberField
            label="基础伤害"
            value={effect.baseDamage}
            allowZero
            onChange={(baseDamage) => onChange({ ...effect, baseDamage })}
          />
          <EffectSelectField
            label="元素"
            fieldClassName="item-effect-field"
            aria-label="投掷元素"
            value={effect.element}
            options={[
              { value: 'none', label: '无' },
              { value: 'wind', label: '风' },
              { value: 'thunder', label: '雷' },
              { value: 'water', label: '水' },
              { value: 'fire', label: '火' },
              { value: 'earth', label: '土' },
              { value: 'poison', label: '毒' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                element: value as typeof effect.element,
              })
            }
          />
          <EffectSelectField
            label="力量来源"
            fieldClassName="item-effect-field"
            aria-label="投掷力量来源"
            value={strength.kind}
            options={[
              { value: 'fixed', label: '固定力量' },
              { value: 'casterAttack', label: '按使用者武术随机' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                strength:
                  value === 'casterAttack'
                    ? {
                        kind: 'casterAttack',
                        bonus: 0,
                        multiplier: { kind: 'uniformInt', min: 0, max: 3 },
                      }
                    : { kind: 'fixed', value: 1 },
              })
            }
          />
          {strength.kind === 'fixed' ? (
            <NumberField
              label="固定力量"
              value={strength.value}
              allowZero
              min={0}
              onChange={(value) => onChange({ ...effect, strength: { kind: 'fixed', value } })}
            />
          ) : (
            <>
              <NumberField
                label="固定加值"
                value={strength.bonus}
                allowZero
                min={0}
                onChange={(bonus) => onChange({ ...effect, strength: { ...strength, bonus } })}
              />
              <NumberField
                label="武术倍率下限"
                value={strength.multiplier.min}
                allowZero
                min={0}
                onChange={(min) =>
                  onChange({
                    ...effect,
                    strength: {
                      ...strength,
                      multiplier: {
                        kind: 'uniformInt',
                        min,
                        max: Math.max(min, strength.multiplier.max),
                      },
                    },
                  })
                }
              />
              <NumberField
                label="武术倍率上限"
                value={strength.multiplier.max}
                allowZero
                min={0}
                onChange={(max) =>
                  onChange({
                    ...effect,
                    strength: {
                      ...strength,
                      multiplier: {
                        kind: 'uniformInt',
                        min: Math.min(strength.multiplier.min, max),
                        max,
                      },
                    },
                  })
                }
              />
            </>
          )}
        </>
      )
    }
    case 'fixedDamage':
      return (
        <NumberField
          label="固定伤害"
          value={effect.amount}
          min={1}
          onChange={(amount) => onChange({ ...effect, amount })}
        />
      )
    case 'applyPoison':
      return (
        <EffectSelectField
          label="毒"
          fieldClassName="item-effect-field"
          aria-label="投掷施毒"
          value={effect.poisonId}
          options={[
            ...(!poisons.some((poison) => String(poison.id) === effect.poisonId)
              ? [{ value: effect.poisonId, label: `⚠ ${effect.poisonId}` }]
              : []),
            ...poisons.map((poison) => ({
              value: String(poison.id),
              label: poison.name,
              description: String(poison.id),
            })),
          ]}
          onValueChange={(value) => onChange({ ...effect, poisonId: value })}
        />
      )
    case 'currentHpDamage':
      return (
        <>
          <NumberField
            label="当前体力分子"
            value={effect.numerator}
            min={1}
            onChange={(numerator) => onChange({ ...effect, numerator })}
          />
          <NumberField
            label="当前体力分母"
            value={effect.denominator}
            min={1}
            onChange={(denominator) => onChange({ ...effect, denominator })}
          />
          <NumberField
            label="额外伤害"
            value={effect.bonus}
            allowZero
            min={0}
            onChange={(bonus) => onChange({ ...effect, bonus })}
          />
          <NumberField
            label="伤害上限"
            value={effect.cap}
            min={1}
            onChange={(cap) => onChange({ ...effect, cap })}
          />
        </>
      )
    case 'applyStatus':
      return (
        <>
          <EffectSelectField
            label="状态"
            fieldClassName="item-effect-field"
            aria-label="投掷施加状态"
            value={effect.status}
            options={STATUSES}
            onValueChange={(value) => onChange({ ...effect, status: value as StatusId })}
          />
          <NumberField
            label="回合"
            value={effect.turns}
            min={1}
            onChange={(turns) => onChange({ ...effect, turns })}
          />
          <EffectSelectField
            label="被抵抗后"
            fieldClassName="item-effect-field"
            aria-label="状态被抵抗后"
            value={effect.onResist}
            options={[
              { value: 'continue', label: '继续执行后续效果' },
              { value: 'stopTarget', label: '停止当前目标的后续效果' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...effect,
                onResist: value as typeof effect.onResist,
              })
            }
          />
        </>
      )
    case 'killIfHpAtMost':
      return (
        <NumberField
          label="体力不高于 % 时即死"
          value={effect.percent}
          min={1}
          max={100}
          onChange={(percent) => onChange({ ...effect, percent })}
        />
      )
    case 'damageAndHealCaster':
      return (
        <>
          <NumberField
            label="目标固定伤害"
            value={effect.damage}
            min={1}
            onChange={(damage) => onChange({ ...effect, damage })}
          />
          <NumberField
            label="使用者回复体力"
            value={effect.heal}
            min={1}
            onChange={(heal) => onChange({ ...effect, heal })}
          />
        </>
      )
  }
}

export interface ThrowEffectChainEditorProps {
  spec: ThrowSpec
  poisons: readonly PoisonDef[]
  onChange: (next: ThrowSpec) => void
  onError?: (message: string) => void
  draftScope?: string
  syncToken?: string | number
}

export function ThrowEffectChainEditor(props: ThrowEffectChainEditorProps) {
  const { spec, poisons, onChange } = props
  const reorderKeys = useDsReorderKeys(spec.effects, (effect) => JSON.stringify(effect))
  const reorderScope = props.draftScope ?? 'item:throw'
  const reorderRevision = props.syncToken ?? 0
  const patchEffects = (effects: ThrowEffect[]): void => onChange({ ...spec, effects })
  const reorderEffects = (intent: DsReorderIntent): boolean => {
    const effects = reorderDsItems(spec.effects, intent, 'insert', sameDsSerializableValue)
    if (effects === spec.effects) return false
    reorderKeys.move(intent)
    patchEffects([...effects])
    return true
  }
  const replaceAt = (index: number, effect: ThrowEffect): void => {
    const effects = [...spec.effects]
    effects[index] = effect
    patchEffects(effects)
  }
  const changeKind = (index: number, kind: ThrowEffect['kind']): void => {
    try {
      replaceAt(index, defaultThrowEffect(kind, poisons))
    } catch (cause) {
      props.onError?.(cause instanceof Error ? cause.message : String(cause))
    }
  }
  return (
    <ItemEffectDraftContext.Provider value={{ scope: reorderScope, syncToken: reorderRevision }}>
      <EffectEditorChain family="item/throw-effects" label="物品投掷效果">
        <div className="item-use-options">
          <EffectSelectField
            label="投掷目标"
            fieldClassName="item-effect-field"
            aria-label="投掷目标"
            value={spec.target}
            options={[
              { value: 'oneEnemy', label: '单个敌人' },
              { value: 'allEnemies', label: '全体敌人' },
            ]}
            onValueChange={(value) =>
              onChange({
                ...spec,
                target: value as ThrowSpec['target'],
              })
            }
          />
        </div>

        <DsReorderCollection
          adoptionId="item/throw-effects"
          scopeKey={`${reorderScope}:effects`}
          entries={spec.effects.map((effect, index) => ({
            key: reorderKeys.keys[index]!,
            label:
              THROW_EFFECT_KINDS.find((entry) => entry.value === effect.kind)?.label ?? effect.kind,
          }))}
          revision={reorderRevision}
          onReorder={reorderEffects}
        >
          <ol className="effect-editor-list item-effect-list">
            {spec.effects.map((effect, index) => {
              const reorderKey = reorderKeys.keys[index]!
              return (
                <EffectEditorCard
                  key={reorderKey}
                  itemKey={reorderKey}
                  label={`效果 ${index + 1}`}
                  density="default"
                  effectKind={effect.kind}
                  kindControl={
                    <DsSelect
                      aria-label={`效果 ${index + 1} 类型`}
                      value={effect.kind}
                      options={THROW_EFFECT_KINDS}
                      onValueChange={(value) => changeKind(index, value as ThrowEffect['kind'])}
                    />
                  }
                  fieldsLayout="item"
                  removeTitle={spec.effects.length === 1 ? '投掷能力至少保留一个效果' : undefined}
                  removeDisabled={spec.effects.length === 1}
                  onRemove={() => {
                    reorderKeys.remove(index)
                    patchEffects(spec.effects.filter((_, at) => at !== index))
                  }}
                >
                  <ItemEffectDraftScope scope={`effect:${reorderKey}:${effect.kind}`}>
                    <ThrowEffectFields
                      effect={effect}
                      poisons={poisons}
                      onChange={(next) => replaceAt(index, next)}
                    />
                  </ItemEffectDraftScope>
                </EffectEditorCard>
              )
            })}
          </ol>
        </DsReorderCollection>

        {!spec.effects.length ? (
          <div className="item-effect-validation" role="alert">
            投掷能力至少需要一个效果，请添加后再保存。
          </div>
        ) : null}
        <div className="item-effect-actions">
          <DsButton
            data-effect-editor-add="true"
            size="compact"
            variant="primary"
            icon="add"
            className="item-add-effect"
            onClick={() =>
              patchEffects([...spec.effects, defaultThrowEffect('fixedDamage', poisons)])
            }
          >
            添加效果
          </DsButton>
        </div>
      </EffectEditorChain>
    </ItemEffectDraftContext.Provider>
  )
}

type ItemEffectChainEditorProps =
  | ({ ability: 'use' } & ItemUseEffectChainEditorProps)
  | {
      ability: 'throw'
      spec: ThrowSpec
      poisons: readonly PoisonDef[]
      onChange: (next: ThrowSpec) => void
      onError?: (message: string) => void
      draftScope?: string
      syncToken?: string | number
      items: readonly ItemData[]
      scripts: readonly ItemScriptOption[]
      itemId?: string
    }

/** @deprecated 新代码请分别使用用途编辑器和 ThrowEffectChainEditor。 */
function ItemEffectChainEditorView(props: ItemEffectChainEditorProps) {
  if (props.ability === 'throw')
    return (
      <ThrowEffectChainEditor
        spec={props.spec}
        poisons={props.poisons}
        onChange={props.onChange}
        onError={props.onError}
        draftScope={props.draftScope}
        syncToken={props.syncToken}
      />
    )
  return <ItemUseEffectChainEditor {...props} />
}

function sameItemChoiceRows(left: readonly ItemData[], right: readonly ItemData[]): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => item.id === right[index]?.id && item.name === right[index]?.name)
  )
}

function samePrivateScriptBindings(
  left: Readonly<Record<number, ItemPrivateScriptBinding>> | undefined,
  right: Readonly<Record<number, ItemPrivateScriptBinding>> | undefined,
): boolean {
  if (left === right) return true
  const leftKeys = Object.keys(left ?? {})
  const rightKeys = Object.keys(right ?? {})
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => {
    const before = left?.[Number(key)]
    const after = right?.[Number(key)]
    return (
      !!before &&
      !!after &&
      before.label === after.label &&
      before.body === after.body &&
      before.editorContext === after.editorContext &&
      before.focusCommandPath === after.focusCommandPath &&
      before.focusRevision === after.focusRevision
    )
  })
}

function sameItemEffectChainProps(
  left: ItemEffectChainEditorProps,
  right: ItemEffectChainEditorProps,
): boolean {
  if (
    left.ability !== right.ability ||
    left.spec !== right.spec ||
    left.syncToken !== right.syncToken
  )
    return false
  if (left.ability === 'throw' || right.ability === 'throw')
    return (
      left.ability === 'throw' &&
      right.ability === 'throw' &&
      left.poisons === right.poisons &&
      left.onChange === right.onChange &&
      left.onError === right.onError &&
      left.draftScope === right.draftScope
    )
  return (
    left.poisons === right.poisons &&
    left.scripts === right.scripts &&
    left.onChange === right.onChange &&
    left.onError === right.onError &&
    left.onOpenScript === right.onOpenScript &&
    left.onOpenAlchemy === right.onOpenAlchemy &&
    left.onAddPrivateScript === right.onAddPrivateScript &&
    left.itemId === right.itemId &&
    left.scenes === right.scenes &&
    left.draftScope === right.draftScope &&
    sameItemChoiceRows(left.items, right.items) &&
    samePrivateScriptBindings(left.privateScripts, right.privateScripts)
  )
}

/** Description/price-only item edits do not invalidate the capability editor subtree. */
export const ItemEffectChainEditor = memo(ItemEffectChainEditorView, sameItemEffectChainProps)
