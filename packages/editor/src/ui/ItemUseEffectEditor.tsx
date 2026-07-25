import type {
  AuthorCommandV5,
  ItemData,
  ItemRecipe,
  ItemUseEffect,
  PoisonCurability,
  PoisonDef,
  ScriptRef,
  StatusId,
  ThrowSpec,
  UseSpec,
} from '@type-pal/content'
import { itemUseEffectSupportsContext } from '@type-pal/content'
import { useEffect, useState } from 'react'

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
  { value: 'runScript', label: '运行可复用脚本' },
  { value: 'runSceneHook', label: '调用场景钩子' },
  { value: 'craftRecipe', label: '合成配方' },
  { value: 'drawFromResourcePool', label: '资源池抽取' },
  { value: 'extraPoisonRes', label: '临时毒抗' },
  { value: 'hideParty', label: '全队隐身' },
]

const EXCLUSIVE_EFFECTS = new Set<ItemUseEffect['kind']>(['runScript', 'runSceneHook'])
const SCENE_EFFECTS = new Set<ItemUseEffect['kind']>([
  'runScript',
  'runSceneHook',
  'craftRecipe',
  'drawFromResourcePool',
])

export interface ItemScriptOption {
  ref: ScriptRef
  label: string
}

export interface ItemPrivateScriptBindingV5 {
  label: string
  body: AuthorCommandV5[]
  onChange: (body: AuthorCommandV5[]) => void
}

function ItemPrivateScriptBodyEditorV5(props: {
  binding: ItemPrivateScriptBindingV5
  onError?: (message: string) => void
}) {
  const bodyJson = JSON.stringify(props.binding.body, null, 2)
  const [draft, setDraft] = useState(bodyJson)
  useEffect(() => setDraft(bodyJson), [bodyJson])
  return (
    <div className="item-private-script-v5">
      <div>
        <strong>{props.binding.label}</strong>
        <span>归当前物品拥有 · 不进入共享脚本库</span>
      </div>
      <textarea
        className="in mono"
        aria-label={`${props.binding.label}正文`}
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div>
        <button type="button" onClick={() => setDraft(bodyJson)}>
          还原
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const body = JSON.parse(draft) as unknown
              if (!Array.isArray(body)) throw new Error('物品私有脚本正文必须是指令数组')
              props.binding.onChange(body as AuthorCommandV5[])
            } catch (error) {
              props.onError?.(error instanceof Error ? error.message : String(error))
            }
          }}
        >
          应用并校验
        </button>
      </div>
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
  if (!id) throw new Error('工程没有物品，无法创建物品配方或奖励')
  return id
}

function firstPoison(poisons: readonly PoisonDef[]): string {
  const poison = poisons[0]
  if (!poison) throw new Error('工程没有毒定义，无法创建施毒效果')
  return String(poison.id)
}

function firstScript(scripts: readonly ItemScriptOption[]): ScriptRef {
  const script = scripts[0]
  if (!script) throw new Error('工程没有可复用脚本；请使用“新建并绑定脚本”')
  return script.ref
}

export function defaultItemUseEffect(
  kind: ItemUseEffect['kind'],
  items: readonly ItemData[],
  poisons: readonly PoisonDef[],
  scripts: readonly ItemScriptOption[],
  excludedIngredientItemId?: string,
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
  }
}

function NumberField(props: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  signed?: boolean
}) {
  return (
    <label className="item-effect-field">
      <span>{props.label}</span>
      <input
        className="in mono"
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onWheel={(event) => event.currentTarget.blur()}
        onChange={(event) => {
          const raw = event.currentTarget.valueAsNumber
          let next = props.signed ? signed(raw) : positive(raw)
          if (props.min !== undefined) next = Math.max(props.min, next)
          if (props.max !== undefined) next = Math.min(props.max, next)
          props.onChange(next)
        }}
      />
    </label>
  )
}

function ItemAmountList(props: {
  label: string
  entries: readonly { itemId: string; count: number }[]
  items: readonly ItemData[]
  minimum?: number
  ordered?: boolean
  onChange: (entries: { itemId: string; count: number }[]) => void
}) {
  const { entries, items, onChange } = props
  const minimum = props.minimum ?? 1
  return (
    <div className="item-amount-list">
      <div className="item-effect-subhead">
        <span>{props.label}</span>
        <button
          type="button"
          className="mini"
          aria-label={`添加${props.label}`}
          disabled={!items.length}
          onClick={() => {
            if (!items.length) return
            onChange([...entries, { itemId: items[0]!.id, count: 1 }])
          }}
        >
          ＋
        </button>
      </div>
      {entries.map((entry, index) => (
        <div
          className={`item-amount-row${props.ordered ? ' ordered' : ''}`}
          key={`${entry.itemId}-${index}`}
        >
          <select
            className="in"
            aria-label={`${props.label}物品 ${index + 1}`}
            value={entry.itemId}
            onChange={(event) => {
              const next = [...entries]
              next[index] = { ...entry, itemId: event.target.value }
              onChange(next)
            }}
          >
            {!items.some((item) => item.id === entry.itemId) ? (
              <option value={entry.itemId}>⚠ {entry.itemId}</option>
            ) : null}
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.id}
              </option>
            ))}
          </select>
          <input
            className="in mono item-amount-count"
            type="number"
            min={1}
            aria-label={`${props.label}数量 ${index + 1}`}
            value={entry.count}
            onWheel={(event) => event.currentTarget.blur()}
            onChange={(event) => {
              const next = [...entries]
              next[index] = { ...entry, count: positive(event.currentTarget.valueAsNumber) }
              onChange(next)
            }}
          />
          {props.ordered ? (
            <>
              <button
                type="button"
                className="mini"
                aria-label={`上移${props.label} ${index + 1}`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...entries]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  onChange(next)
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="mini"
                aria-label={`下移${props.label} ${index + 1}`}
                disabled={index === entries.length - 1}
                onClick={() => {
                  const next = [...entries]
                  ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                  onChange(next)
                }}
              >
                ↓
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="mini danger"
            aria-label={`删除${props.label} ${index + 1}`}
            disabled={entries.length <= minimum}
            onClick={() => onChange(entries.filter((_, current) => current !== index))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function RecipeEditor(props: {
  recipes: readonly ItemRecipe[]
  items: readonly ItemData[]
  excludedIngredientItemId?: string
  onChange: (recipes: ItemRecipe[]) => void
}) {
  const { recipes, items, onChange } = props
  const ingredientItems = items.filter((item) => item.id !== props.excludedIngredientItemId)
  const patch = (index: number, next: ItemRecipe): void => {
    const result = [...recipes]
    result[index] = next
    onChange(result)
  }
  return (
    <div className="item-recipe-list">
      {recipes.map((recipe, index) => (
        <div className="item-recipe" key={`recipe-${index}`}>
          <div className="item-effect-subhead">
            <strong>配方 {index + 1}</strong>
            <span className="item-effect-order-actions">
              <button
                type="button"
                className="mini"
                aria-label={`上移配方 ${index + 1}`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...recipes]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  onChange(next)
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="mini"
                aria-label={`下移配方 ${index + 1}`}
                disabled={index === recipes.length - 1}
                onClick={() => {
                  const next = [...recipes]
                  ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                  onChange(next)
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="item-action-button item-action-button-danger item-action-button-compact item-recipe-delete"
                disabled={recipes.length <= 1}
                onClick={() => onChange(recipes.filter((_, current) => current !== index))}
              >
                删除配方
              </button>
            </span>
          </div>
          <ItemAmountList
            label="材料"
            entries={recipe.ingredients}
            items={ingredientItems}
            onChange={(ingredients) => patch(index, { ...recipe, ingredients })}
          />
          <ItemAmountList
            label="产物"
            entries={recipe.products}
            items={items}
            onChange={(products) => patch(index, { ...recipe, products })}
          />
        </div>
      ))}
      <button
        type="button"
        className="item-action-button item-action-button-primary"
        disabled={!ingredientItems.length || !items.length}
        onClick={() => {
          const ingredientId = ingredientItems[0]?.id
          const productId = items[0]?.id
          if (!ingredientId || !productId) return
          onChange([
            ...recipes,
            {
              ingredients: [{ itemId: ingredientId, count: 1 }],
              products: [{ itemId: productId, count: 1 }],
            },
          ])
        }}
      >
        ＋ 添加配方
      </button>
    </div>
  )
}

function EffectFields(props: {
  effect: ItemUseEffect
  items: readonly ItemData[]
  poisons: readonly PoisonDef[]
  scripts: readonly ItemScriptOption[]
  onChange: (effect: ItemUseEffect) => void
  onOpenScript?: (id: string) => void
  onCreateAndBindScript?: () => void
  worldResources?: Readonly<Record<string, number>>
  onSetWorldResource?: (resource: string, initialValue: number) => void
  subjectItemId?: string
  consuming?: boolean
}) {
  const { effect, items, poisons, scripts, onChange } = props
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
          <label className="item-effect-field">
            <span>状态</span>
            <select
              className="in"
              value={effect.status}
              onChange={(event) => onChange({ ...effect, status: event.target.value as StatusId })}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
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
              <label key={status.value}>
                <input
                  type="checkbox"
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
                {status.label}
              </label>
            )
          })}
        </fieldset>
      )
    case 'applyPoison':
      return (
        <label className="item-effect-field">
          <span>毒</span>
          <select
            className="in"
            value={effect.poisonId}
            onChange={(event) => onChange({ ...effect, poisonId: event.target.value })}
          >
            {!poisons.some((poison) => String(poison.id) === effect.poisonId) ? (
              <option value={effect.poisonId}>⚠ {effect.poisonId}</option>
            ) : null}
            {poisons.map((poison) => (
              <option key={poison.id} value={String(poison.id)}>
                {poison.name} · {poison.id}
              </option>
            ))}
          </select>
        </label>
      )
    case 'curePoison': {
      const mode = effect.poisonId ? 'poison' : 'tier'
      return (
        <>
          <label className="item-effect-field">
            <span>方式</span>
            <select
              className="in"
              value={mode}
              onChange={(event) =>
                onChange(
                  event.target.value === 'poison'
                    ? { kind: 'curePoison', poisonId: firstPoison(poisons) }
                    : { kind: 'curePoison', curesTier: 'common' },
                )
              }
            >
              <option value="tier">按可解等级</option>
              <option value="poison" disabled={!poisons.length}>
                指定毒
              </option>
            </select>
          </label>
          {mode === 'poison' ? (
            <label className="item-effect-field">
              <span>毒</span>
              <select
                className="in"
                value={effect.poisonId}
                onChange={(event) => onChange({ kind: 'curePoison', poisonId: event.target.value })}
              >
                {poisons.map((poison) => (
                  <option key={poison.id} value={String(poison.id)}>
                    {poison.name} · {poison.id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="item-effect-field">
              <span>最高等级</span>
              <select
                className="in"
                value={effect.curesTier ?? 'common'}
                onChange={(event) =>
                  onChange({
                    kind: 'curePoison',
                    curesTier: event.target.value as PoisonCurability,
                  })
                }
              >
                <option value="common">常规</option>
                <option value="severe">剧毒</option>
                <option value="incurable">无解</option>
              </select>
            </label>
          )}
        </>
      )
    }
    case 'permanentStatBoost':
      return (
        <>
          <label className="item-effect-field">
            <span>属性</span>
            <select
              className="in"
              value={effect.stat}
              onChange={(event) =>
                onChange({
                  ...effect,
                  stat: event.target.value as typeof effect.stat,
                })
              }
            >
              <option value="maxHP">体力上限</option>
              <option value="maxMP">真气上限</option>
              <option value="attack">武术</option>
              <option value="magicAttack">灵力</option>
              <option value="defense">防御</option>
              <option value="speed">身法</option>
              <option value="luck">吉运</option>
            </select>
          </label>
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
          <label className="item-effect-field">
            <span>可复用脚本</span>
            <select
              className="in"
              value={effect.script.id}
              onChange={(event) => {
                const option = scripts.find((script) => script.ref.id === event.target.value)
                if (option) onChange({ ...effect, script: option.ref })
              }}
            >
              {!current ? <option value={effect.script.id}>⚠ {effect.script.id}</option> : null}
              {scripts.map((script) => (
                <option key={script.ref.id} value={script.ref.id}>
                  {script.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="item-action-button item-action-button-compact"
            disabled={!effect.script.id || !props.onOpenScript}
            onClick={() => props.onOpenScript?.(effect.script.id)}
          >
            打开脚本 ↗
          </button>
          <button
            type="button"
            className="item-action-button item-action-button-primary item-action-button-compact"
            onClick={() => props.onCreateAndBindScript?.()}
          >
            ＋ 新建并绑定
          </button>
        </div>
      )
    }
    case 'runSceneHook':
      return (
        <>
          <label className="item-effect-field">
            <span>当前场景钩子</span>
            <select className="in" value={effect.hook} disabled>
              <option value="onTeleport">传送出口 onTeleport</option>
            </select>
          </label>
          <label className="item-effect-field item-effect-field-wide">
            <span>不可用提示</span>
            <input
              className="in"
              value={effect.unavailableMessage ?? ''}
              placeholder="留空则使用默认提示"
              onChange={(event) => {
                const value = event.target.value
                onChange(
                  value
                    ? { ...effect, unavailableMessage: value }
                    : { kind: 'runSceneHook', hook: effect.hook },
                )
              }}
            />
          </label>
        </>
      )
    case 'craftRecipe':
      return (
        <div className="item-effect-block">
          <RecipeEditor
            recipes={effect.recipes}
            items={items}
            excludedIngredientItemId={props.consuming ? props.subjectItemId : undefined}
            onChange={(recipes) => onChange({ ...effect, recipes })}
          />
          <label className="item-effect-field item-effect-field-wide">
            <span>材料不足提示</span>
            <input
              className="in"
              value={effect.unavailableMessage ?? ''}
              onChange={(event) =>
                onChange({ ...effect, unavailableMessage: event.target.value || undefined })
              }
            />
          </label>
        </div>
      )
    case 'drawFromResourcePool': {
      const resourceName = effect.resource.trim()
      const isBuiltinResource = resourceName === 'collectValue'
      const initialValue = props.worldResources?.[resourceName]
      const resizeRewards = (maxRoll: number): ItemUseEffect => {
        const rewards = [...effect.rewards]
        const fallback = rewards.at(-1) ?? { itemId: firstItem(items), count: 1 }
        while (rewards.length < maxRoll) rewards.push({ ...fallback })
        return { ...effect, maxRoll, rewards }
      }
      return (
        <div className="item-effect-block">
          <div className="item-effect-grid">
            <label className="item-effect-field">
              <span>资源变量</span>
              <input
                className="in mono"
                value={effect.resource}
                list="item-world-resource-keys"
                onChange={(event) => onChange({ ...effect, resource: event.target.value })}
                onBlur={(event) => {
                  const resource = event.currentTarget.value.trim()
                  if (resource !== effect.resource) onChange({ ...effect, resource })
                }}
                aria-invalid={effect.resource !== resourceName}
              />
              <datalist id="item-world-resource-keys">
                <option value="collectValue">内建收妖值</option>
                {Object.keys(props.worldResources ?? {})
                  .sort()
                  .map((resource) => (
                    <option key={resource} value={resource} />
                  ))}
              </datalist>
            </label>
            <NumberField
              label="最大点数"
              value={effect.maxRoll}
              onChange={(maxRoll) => onChange(resizeRewards(maxRoll))}
            />
            {isBuiltinResource ? (
              <div className="item-resource-initial-state">
                <span>初始值</span>
                <strong>内建收妖值（战斗累积）</strong>
              </div>
            ) : initialValue === undefined ? (
              <div className="item-resource-initial-state">
                <span>默认开局初始值</span>
                <button
                  type="button"
                  className="item-action-button item-action-button-compact"
                  disabled={!resourceName || !props.onSetWorldResource}
                  onClick={() => props.onSetWorldResource?.(resourceName, 0)}
                >
                  ＋ 初始化为 0
                </button>
              </div>
            ) : (
              <label className="item-effect-field">
                <span>默认开局初始值</span>
                <input
                  className="in mono"
                  type="number"
                  min={0}
                  value={initialValue}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    props.onSetWorldResource?.(
                      resourceName,
                      Math.max(0, Math.floor(event.currentTarget.valueAsNumber || 0)),
                    )
                  }
                />
              </label>
            )}
          </div>
          <ItemAmountList
            label="奖励档位"
            entries={effect.rewards}
            items={items}
            minimum={effect.maxRoll}
            ordered
            onChange={(rewards) => onChange({ ...effect, rewards })}
          />
          <p className="item-effect-help">
            随机抽取 1…当前资源值，封顶为 {effect.maxRoll}；扣除抽中点数后，使用对应档位的奖励。
          </p>
          <label className="item-effect-field item-effect-field-wide">
            <span>不可用提示</span>
            <input
              className="in"
              value={effect.unavailableMessage ?? ''}
              onChange={(event) =>
                onChange({ ...effect, unavailableMessage: event.target.value || undefined })
              }
            />
          </label>
        </div>
      )
    }
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
    case 'dieIfNotPoisoned':
      return <span className="hint2">目标没有中毒时死亡；已中毒则继续执行后续效果。</span>
  }
}

export function ItemEffectChainEditor(props: {
  ability: 'use' | 'throw'
  spec: UseSpec | ThrowSpec
  items: readonly ItemData[]
  poisons: readonly PoisonDef[]
  scripts: readonly ItemScriptOption[]
  onChange: (next: UseSpec | ThrowSpec) => void
  onOpenScript?: (id: string) => void
  onCreateAndBindScript?: () => void
  onError?: (message: string) => void
  worldResources?: Readonly<Record<string, number>>
  onSetWorldResource?: (resource: string, initialValue: number) => void
  itemId?: string
  /** v5 item-private effect 的 canonical 正文；索引与兼容壳中的占位 runScript 对齐。 */
  privateScriptsV5?: Readonly<Record<number, ItemPrivateScriptBindingV5>>
}) {
  const { ability, spec, items, poisons, scripts, onChange } = props
  const use = ability === 'use' ? (spec as UseSpec) : undefined
  const excludedIngredientItemId = use?.consuming ? props.itemId : undefined
  const createDefaultEffect = (kind: ItemUseEffect['kind']): ItemUseEffect =>
    defaultItemUseEffect(kind, items, poisons, scripts, excludedIngredientItemId)
  const compatibleChain = (effects: readonly ItemUseEffect[]): boolean => {
    if (!effects.length) return false
    if (ability === 'throw') return effects.every((effect) => effect.kind === 'applyPoison')
    const external = effects.filter((effect) => EXCLUSIVE_EFFECTS.has(effect.kind))
    if (external.length && (external.length !== 1 || effects.length !== 1)) return false
    const containsScene = effects.some((effect) => SCENE_EFFECTS.has(effect.kind))
    const containsCharacterOrBattle = effects.some(
      (effect) => !SCENE_EFFECTS.has(effect.kind) && effect.kind !== 'gate',
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
    if (ability === 'use') {
      const containsScene = effects.some((effect) => SCENE_EFFECTS.has(effect.kind))
      const containsHide = effects.some((effect) => effect.kind === 'hideParty')
      const next: UseSpec = {
        ...(spec as UseSpec),
        effects,
        ...(containsScene ? { target: 'scene' as const } : {}),
        ...(!containsScene && (spec as UseSpec).target === 'scene'
          ? { target: 'oneAlly' as const }
          : {}),
        ...(containsHide ? { target: 'allAllies' as const, battleOnly: true } : {}),
      }
      if (containsScene) delete next.battleOnly
      onChange(next)
    } else onChange({ ...(spec as ThrowSpec), effects })
  }
  const replaceAt = (index: number, effect: ItemUseEffect): void => {
    const effects = [...spec.effects]
    effects[index] = effect
    patchEffects(effects)
  }
  const changeKind = (index: number, kind: ItemUseEffect['kind']): void => {
    try {
      const effect = createDefaultEffect(kind)
      patchEffects(
        EXCLUSIVE_EFFECTS.has(kind)
          ? [effect]
          : spec.effects.map((old, at) => (at === index ? effect : old)),
      )
    } catch (cause) {
      props.onError?.(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const compatibleKindsAt = (index: number): typeof EFFECT_KINDS =>
    EFFECT_KINDS.filter((entry) => {
      if (entry.value === spec.effects[index]?.kind) return true
      if (EXCLUSIVE_EFFECTS.has(entry.value)) return true
      try {
        const candidate = createDefaultEffect(entry.value)
        return compatibleChain(
          spec.effects.map((effect, at) => (at === index ? candidate : effect)),
        )
      } catch {
        return false
      }
    })
  const firstAppendableKind = (): ItemUseEffect['kind'] | undefined =>
    (ability === 'throw'
      ? EFFECT_KINDS.filter((entry) => entry.value === 'applyPoison')
      : EFFECT_KINDS
    )
      .map((entry) => entry.value)
      .find((kind) => {
        try {
          return compatibleChain([...spec.effects, createDefaultEffect(kind)])
        } catch {
          return false
        }
      })

  return (
    <div className="item-effect-chain">
      {use ? (
        <div className="item-use-options">
          <label className="item-effect-field">
            <span>目标</span>
            <select
              className="in"
              value={use.target}
              disabled={use.effects.some(
                (effect) => SCENE_EFFECTS.has(effect.kind) || effect.kind === 'hideParty',
              )}
              onChange={(event) =>
                onChange({ ...use, target: event.target.value as NonNullable<UseSpec['target']> })
              }
            >
              <option value="oneAlly">一名队友</option>
              <option value="allAllies">全体队友</option>
              <option value="self">使用者</option>
              <option value="scene">当前场景</option>
            </select>
          </label>
          <label className="item-inline-check">
            <input
              type="checkbox"
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
            成功后消耗
          </label>
          <label className="item-inline-check">
            <input
              type="checkbox"
              checked={use.battleOnly === true}
              disabled={
                !use.effects.every((effect) => itemUseEffectSupportsContext(effect, 'battle'))
              }
              onChange={(event) =>
                onChange({ ...use, battleOnly: event.target.checked || undefined })
              }
            />
            仅战斗可用
          </label>
          <label className="item-effect-field">
            <span>成功后菜单</span>
            <select
              className="in"
              value={use.menuAfterUse ?? 'keep'}
              onChange={(event) =>
                onChange({
                  ...use,
                  menuAfterUse: event.target.value as NonNullable<UseSpec['menuAfterUse']>,
                })
              }
            >
              <option value="keep">保留物品菜单</option>
              <option value="close">关闭菜单</option>
            </select>
          </label>
        </div>
      ) : (
        <div className="item-capability-note">
          投掷当前只支持“对敌施毒”，由战斗目标选择器决定目标。
        </div>
      )}

      {ability === 'throw' && spec.effects.some((effect) => effect.kind !== 'applyPoison') ? (
        <div className="item-effect-validation" role="alert">
          <span>当前投掷数据包含非“施毒”效果，无法保存。</span>
          <button
            type="button"
            className="item-action-button item-action-button-danger item-action-button-compact"
            disabled={!poisons.length}
            onClick={() => {
              try {
                patchEffects([createDefaultEffect('applyPoison')])
              } catch (cause) {
                props.onError?.(cause instanceof Error ? cause.message : String(cause))
              }
            }}
          >
            重置为施毒
          </button>
          {!poisons.length ? <span>请先创建至少一种毒。</span> : null}
        </div>
      ) : null}

      {spec.effects.map((effect, index) => (
        <div className="item-effect-row" key={`${effect.kind}-${index}`}>
          <div className="item-effect-row-head">
            <span className="item-effect-index">效果 {index + 1}</span>
            {props.privateScriptsV5?.[index] ? (
              <span className="in item-effect-kind item-private-script-kind">
                物品私有脚本
              </span>
            ) : (
              <select
                className="in item-effect-kind"
                aria-label={`效果 ${index + 1} 类型`}
                value={effect.kind}
                onChange={(event) => changeKind(index, event.target.value as ItemUseEffect['kind'])}
              >
                {(ability === 'throw'
                  ? EFFECT_KINDS.filter((entry) => entry.value === 'applyPoison')
                  : compatibleKindsAt(index)
                ).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            )}
            <span className="spacer" />
            <button
              type="button"
              className="mini"
              aria-label={`上移效果 ${index + 1}`}
              disabled={
                index === 0 ||
                EXCLUSIVE_EFFECTS.has(effect.kind) ||
                props.privateScriptsV5?.[index] !== undefined
              }
              onClick={() => {
                const effects = [...spec.effects]
                ;[effects[index - 1], effects[index]] = [effects[index]!, effects[index - 1]!]
                patchEffects(effects)
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="mini"
              aria-label={`下移效果 ${index + 1}`}
              disabled={
                index === spec.effects.length - 1 ||
                EXCLUSIVE_EFFECTS.has(effect.kind) ||
                props.privateScriptsV5?.[index] !== undefined
              }
              onClick={() => {
                const effects = [...spec.effects]
                ;[effects[index], effects[index + 1]] = [effects[index + 1]!, effects[index]!]
                patchEffects(effects)
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className="mini danger"
              aria-label={`删除效果 ${index + 1}`}
              disabled={spec.effects.length <= 1}
              onClick={() => patchEffects(spec.effects.filter((_, at) => at !== index))}
            >
              ×
            </button>
          </div>
          <div className="item-effect-grid">
            {props.privateScriptsV5?.[index] ? (
              <ItemPrivateScriptBodyEditorV5
                binding={props.privateScriptsV5[index]}
                onError={props.onError}
              />
            ) : (
              <EffectFields
                effect={effect}
                items={items}
                poisons={poisons}
                scripts={scripts}
                onChange={(next) => replaceAt(index, next)}
                onOpenScript={props.onOpenScript}
                onCreateAndBindScript={props.onCreateAndBindScript}
                worldResources={props.worldResources}
                onSetWorldResource={props.onSetWorldResource}
                subjectItemId={props.itemId}
                consuming={use?.consuming}
              />
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="item-action-button item-action-button-primary item-add-effect"
        disabled={
          spec.effects.some((effect) => EXCLUSIVE_EFFECTS.has(effect.kind)) ||
          firstAppendableKind() === undefined
        }
        onClick={() => {
          try {
            const kind = firstAppendableKind()
            if (!kind) return
            patchEffects([...spec.effects, createDefaultEffect(kind)])
          } catch (cause) {
            props.onError?.(cause instanceof Error ? cause.message : String(cause))
          }
        }}
      >
        ＋ 添加效果
      </button>
    </div>
  )
}
