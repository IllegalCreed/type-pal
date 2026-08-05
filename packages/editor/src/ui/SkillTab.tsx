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
import type { AssetBase } from '@type-pal/reforge'
import { useEffect, useMemo, useState } from 'react'
import { AddSkillCommand, UpdateSkillCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SkillAnimationEditor } from './SkillAnimationEditor.js'
import { SoundPicker } from './SoundPicker.js'
import { SummonPreview } from './SummonPreview.js'
import { TrancePreview } from './TrancePreview.js'

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
  v: number | undefined
  on: (n: number | undefined) => void
  ph?: string
  w?: number
  ariaLabel?: string
}) {
  return (
    <input
      className="in mono ef-num"
      type="number"
      aria-label={props.ariaLabel}
      style={props.w ? { width: props.w } : undefined}
      value={props.v ?? ''}
      placeholder={props.ph}
      onChange={(e) =>
        props.on(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : undefined)
      }
      onWheel={(e) => e.currentTarget.blur()}
    />
  )
}

/** 单条效果的分支字段。 */
function EffectFields(props: {
  e: SkillEffect
  on: (next: SkillEffect) => void
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  battleSprites: readonly BattleSpriteDef[]
  onOpenSound?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
}) {
  const { e, on, assetCatalog, assetReader, battleSprites, onOpenSound, onOpenBattleSprite } = props
  switch (e.kind) {
    case 'damage':
      return (
        <>
          <label>
            <span>威力</span>
            <N v={e.power} on={(n) => on({ ...e, power: n ?? 0 })} />
          </label>
          <label>
            <span>五行</span>
            <select
              className="in"
              value={e.elemental}
              onChange={(ev) => on({ ...e, elemental: Number(ev.target.value) })}
            >
              {ELEMENTS.map((nm, i) => (
                <option key={nm} value={i === 6 ? 6 : i}>
                  {nm}
                </option>
              ))}
            </select>
          </label>
        </>
      )
    case 'resourceDelta':
      return (
        <>
          <label>
            <span>资源</span>
            <select
              className="in"
              value={e.resource}
              onChange={(event) =>
                on({ ...e, resource: event.target.value as 'hp' | 'mp' })
              }
            >
              <option value="hp">体力</option>
              <option value="mp">真气</option>
            </select>
          </label>
          <label>
            <span>增减</span>
            <N v={e.delta} on={(delta) => on({ ...e, delta: delta ?? 0 })} />
          </label>
        </>
      )
    case 'healHp':
    case 'healMp':
      return (
        <label>
          <span>量</span>
          <N v={e.amount} on={(n) => on({ ...e, amount: n ?? 0 })} />
        </label>
      )
    case 'revive':
      return (
        <label>
          <span>回 max%</span>
          <N v={e.hpPercent} on={(n) => on({ ...e, hpPercent: n ?? 0 })} />
        </label>
      )
    case 'applyStatus':
      return (
        <>
          <label>
            <span>状态</span>
            <select
              className="in"
              value={e.status}
              onChange={(ev) => on({ ...e, status: ev.target.value as StatusId })}
            >
              {STATUS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>回合</span>
            <N v={e.turns} on={(n) => on({ ...e, turns: n ?? 1 })} />
          </label>
        </>
      )
    case 'removeStatus':
      return (
        <span className="ef-status-set">
          {STATUS.map((s) => (
            <label key={s.v} className="cf-inline">
              <input
                type="checkbox"
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
              {s.label}
            </label>
          ))}
        </span>
      )
    case 'applyPoison':
      return (
        <label>
          <span>毒 id</span>
          <input
            className="in ef-num"
            value={e.poisonId}
            onChange={(ev) => on({ ...e, poisonId: ev.target.value })}
          />
        </label>
      )
    case 'curePoison':
      return (
        <>
          <label>
            <span>可解度</span>
            <select
              className="in"
              value={e.curesTier ?? ''}
              onChange={(ev) =>
                on({ ...e, curesTier: (ev.target.value || undefined) as typeof e.curesTier })
              }
            >
              <option value="">(按毒 id)</option>
              <option value="common">常规(灵血咒)</option>
              <option value="severe">六大毒(复活类)</option>
            </select>
          </label>
          <label>
            <span>指定毒</span>
            <input
              className="in ef-num"
              value={e.poisonId ?? ''}
              placeholder="(任意)"
              onChange={(ev) => on({ ...e, poisonId: ev.target.value || undefined })}
            />
          </label>
        </>
      )
    case 'buffStat':
      return (
        <>
          <label>
            <span>属性</span>
            <select
              className="in"
              value={e.stat}
              onChange={(ev) => on({ ...e, stat: ev.target.value as typeof e.stat })}
            >
              <option value="attack">武术</option>
              <option value="defense">防御</option>
              <option value="magic">灵力</option>
              <option value="dexterity">身法</option>
            </select>
          </label>
          <label>
            <span>+%</span>
            <N v={e.percent} on={(n) => on({ ...e, percent: n ?? 0 })} />
          </label>
          <label>
            <span>持续</span>
            <select
              className="in"
              value={e.duration === 'battle' ? 'battle' : 'turns'}
              onChange={(ev) => on({ ...e, duration: ev.target.value === 'battle' ? 'battle' : 3 })}
            >
              <option value="battle">整场</option>
              <option value="turns">N 回合</option>
            </select>
          </label>
          {e.duration !== 'battle' && (
            <N v={e.duration} on={(n) => on({ ...e, duration: n ?? 3 })} />
          )}
        </>
      )
    case 'gate':
      return (
        <>
          <label>
            <span>概率%</span>
            <N v={e.chance} on={(n) => on({ ...e, chance: n })} ph="(无)" />
          </label>
          <label>
            <span>HP≤%</span>
            <N v={e.hpAtMostPercent} on={(n) => on({ ...e, hpAtMostPercent: n })} ph="(无)" />
          </label>
          <label className="cf-inline">
            <input
              type="checkbox"
              checked={e.magicResist === true}
              onChange={(ev) => on({ ...e, magicResist: ev.target.checked || undefined })}
            />
            灵抗掷
          </label>
        </>
      )
    case 'steal':
      return (
        <label>
          <span>成功率</span>
          <N v={e.rate} on={(n) => on({ ...e, rate: n ?? 0 })} />
        </label>
      )
    case 'summon':
      return (
        <>
          <div className="sound-effect-field">
            <span>召唤形象</span>
            <BattleSpritePicker
              value={e.battleSprite}
              definitions={battleSprites}
              kind="summon"
              onChange={(battleSprite) => on({ ...e, battleSprite })}
              onOpenDefinition={onOpenBattleSprite}
            />
          </div>
          <label>
            <span>现身帧速</span>
            <N v={e.speed} on={(n) => on({ ...e, speed: n ?? undefined })} ph="0" />
          </label>
          <label title="背景染色量(原版召唤自身 wEffectTimes,fight.c:3145):负=调暗(武神-2/风神-1),正=调亮(雪妖/火神+5),0=不染">
            <span>背景染色</span>
            <N v={e.tint} on={(n) => on({ ...e, tint: n ?? undefined })} ph="0" />
          </label>
          <div className="sound-effect-field">
            <span>现身音效</span>
            <SoundPicker
              value={e.sound}
              onChange={(sound) => on({ ...e, sound })}
              catalog={assetCatalog}
              reader={assetReader}
              allowUnset
              onOpenAsset={onOpenSound}
            />
          </div>
        </>
      )
    case 'trance':
      return (
        <div className="sound-effect-field">
          <span>变身形象</span>
          <BattleSpritePicker
            value={e.battleSprite}
            definitions={battleSprites}
            kind="player-fighter"
            onChange={(battleSprite) => on({ ...e, battleSprite })}
            onOpenDefinition={onOpenBattleSprite}
          />
        </div>
      )
    case 'moneyDamage':
      return (
        <>
          <label title="消耗 = min(当前金钱, 此上限);乾坤一掷 5000">
            <span>消耗上限</span>
            <N v={e.maxSpend} on={(n) => on({ ...e, maxSpend: n ?? 5000 })} />
          </label>
          <label title="基伤 = 消耗 × 分子/分母(乾坤一掷 2/5)">
            <span>分子</span>
            <N v={e.num} on={(n) => on({ ...e, num: n ?? 1 })} w={48} />
          </label>
          <label>
            <span>分母</span>
            <N v={e.den} on={(n) => on({ ...e, den: n ?? 1 })} w={48} />
          </label>
          <label>
            <span>五灵</span>
            <N v={e.elemental} on={(n) => on({ ...e, elemental: n ?? 0 })} w={48} />
          </label>
        </>
      )
    default:
      return <span className="hint2">(无参数)</span>
  }
}

function ExecutionOverrideEditor(props: {
  side: 'player' | 'enemy'
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
  const effects = override.effects ?? []
  const setEffects = (next: SkillEffect[]): void =>
    onChange({ ...override, effects: next.length ? next : undefined })
  const setEffect = (index: number, next: SkillEffect): void => {
    const updated = [...effects]
    updated[index] = next
    setEffects(updated)
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
      <div className="skill-execution-prepare">
        <label className="cf-inline">
          <input type="checkbox" checked={Boolean(prepare)} onChange={(event) => setPrepare(event.target.checked)} />
          施法前按剩余真气扣体力
        </label>
        {prepare && (
          <label>
            <span>倍率</span>
            <N
              v={prepare.multiplier}
              on={(value) => setPrepare(true, value ?? 0)}
              ph="8"
            />
          </label>
        )}
      </div>
      <div className="item-effect-subhead">
        <span>分支效果</span>
        <button
          type="button"
          className="mini-txt item-effect-add-button"
          onClick={() => setEffects([...effects, defaultEffect('damage', battleSprites)])}
        >
          ＋ 添加分支效果
        </button>
      </div>
      {effects.map((effect, index) => (
        <div className="ef-row" key={`${side}-execution-${index}`}>
          <select
            className="in ef-kind"
            value={effect.kind}
            onChange={(event) =>
              setEffect(index, defaultEffect(event.target.value as SkillEffect['kind'], battleSprites))
            }
          >
            {EFFECT_KINDS.map((kind) => (
              <option key={kind.v} value={kind.v}>
                {kind.label}
              </option>
            ))}
          </select>
          <div className="ef-fields">
            <EffectFields
              e={effect}
              on={(next) => setEffect(index, next)}
              assetCatalog={assetCatalog}
              assetReader={assetReader}
              battleSprites={battleSprites}
              onOpenSound={onOpenSound}
              onOpenBattleSprite={onOpenBattleSprite}
            />
          </div>
          <span className="ef-ops">
            <button
              type="button"
              className="mini"
              title="上移"
              disabled={index === 0}
              onClick={() => {
                const next = [...effects]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                setEffects(next)
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="mini"
              title="下移"
              disabled={index === effects.length - 1}
              onClick={() => {
                const next = [...effects]
                ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                setEffects(next)
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className="mini"
              title="删除"
              onClick={() => setEffects(effects.filter((_, row) => row !== index))}
            >
              ✕
            </button>
          </span>
        </div>
      ))}
      <div className="item-effect-subhead">
        <label className="cf-inline">
          <input
            type="checkbox"
            checked={Boolean(override.animation)}
            onChange={(event) =>
              onChange({
                ...override,
                animation: event.target.checked ? structuredClone(fallbackAnimation) : undefined,
              })
            }
          />
          覆写这次施法动画
        </label>
      </div>
      {override.animation && (
        <SkillAnimationEditor
          animation={override.animation}
          onChange={(animation) => onChange({ ...override, animation })}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          assetBase={assetBase}
          onOpenSound={onOpenSound}
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
  /** 工程 id(同源试玩页;缺省 pal 兼容旧调用)。 */
  projectId?: string
  tabBar?: React.ReactNode
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
    projectId = 'pal',
    tabBar,
  } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(skills[0]?.id ?? '')
  useEffect(() => {
    if (focusObjectId && skills.some((entry) => entry.id === focusObjectId)) setSelId(focusObjectId)
  }, [focusObjectId, skills])
  const shown = useMemo(
    () => skills.filter((s) => !filter || s.id.includes(filter) || s.name.includes(filter)),
    [skills, filter],
  )
  const skill = skills.find((s) => s.id === selId) ?? shown[0]
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
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">技能</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{skills.length}
          </span>
        </div>
        <input
          className="in"
          placeholder="过滤 id/名…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="sprite-list">
          {shown.map((s) => (
            <button
              type="button"
              key={s.id}
              className={`arow${s.id === skill?.id ? ' sel' : ''}`}
              onClick={() => {
                setSelId(s.id)
                onObjectFocus?.(s.id)
              }}
            >
              <span className="nm">
                {s.name}
                <span className="meta"> {s.id}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tool"
          style={{ margin: '6px 10px 8px', justifyContent: 'center' }}
          onClick={() => {
            const name = window.prompt('新技能名字:', '')?.trim()
            if (!name) return
            let n = 1000
            while (skills.some((s) => s.id === String(n))) n++
            session.dispatch(new AddSkillCommand(String(n), name))
            setSelId(String(n))
            onObjectFocus?.(String(n))
          }}
        >
          ＋ 新建技能
        </button>
      </div>
      <div className="canvas-wrap data-body">
        {skill ? (
          <div className="et-scroll skill-form">
            <div className="section">
              <h4>
                基础
                <button
                  type="button"
                  className="mini"
                  style={{ width: 'auto', padding: '0 10px', marginLeft: 12 }}
                  title="开真实战斗临时授此技试放(完整语境预览;不改存档/工程数据)"
                  onClick={() =>
                    window.open(
                      `play.html?project=${projectId}&scene=s001&battle=0&skill=${skill.id}`,
                      '_blank',
                    )
                  }
                >
                  ⚔ 战斗中试放
                </button>
              </h4>
              <div className="sk-grid">
                <label>
                  <span className="lb">名字</span>{' '}
                  <input
                    className="in"
                    value={skill.name}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </label>
                <label>
                  <span className="lb">目标</span>
                  <select
                    className="in"
                    value={skill.target}
                    onChange={(e) => patch({ target: e.target.value as SkillData['target'] })}
                  >
                    {TARGETS.map((t) => (
                      <option key={t.v} value={t.v}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="lb">耗真气</span>{' '}
                  <N
                    v={skill.cost.mp}
                    on={(n) => patch({ cost: { ...skill.cost, mp: n } })}
                    ph="0"
                  />
                </label>
                <label>
                  <span className="lb">耗体力</span>{' '}
                  <N
                    v={skill.cost.stamina}
                    on={(n) => patch({ cost: { ...skill.cost, stamina: n } })}
                    ph="0"
                  />
                </label>
                <label>
                  <span className="lb">耗金钱</span>{' '}
                  <N
                    v={skill.cost.money}
                    on={(n) => patch({ cost: { ...skill.cost, money: n } })}
                    ph="0"
                  />
                </label>
                <label title="一生/全周目限用次数，达到后从角色习得列表移除并提示用尽；留空 = 不限（酒神 9 次）">
                  <span className="lb">一生限用</span>{' '}
                  <N
                    v={skill.lifetimeLimit}
                    on={(n) => patch({ lifetimeLimit: n })}
                    ph="不限"
                    ariaLabel="一生限用次数"
                  />
                </label>
                <label className="cf-inline">
                  <input
                    type="checkbox"
                    checked={skill.usableOutsideBattle}
                    onChange={(e) => patch({ usableOutsideBattle: e.target.checked })}
                  />
                  战外可用
                </label>
              </div>
              <div className="skill-cost-items item-amount-list">
                <div className="item-effect-subhead">
                  <span>消耗物品</span>
                  <button
                    type="button"
                    className="mini-txt item-effect-add-button"
                    aria-label="添加消耗物品"
                    disabled={
                      !items.some(
                        (item) => !(skill.cost.items ?? []).some((entry) => entry.itemId === item.id),
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
                    ＋ 添加消耗物品
                  </button>
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
                      <input
                        className="in item-amount-count"
                        type="number"
                        min={1}
                        step={1}
                        aria-label={`消耗物品数量 ${index + 1}`}
                        value={entry.amount}
                        onWheel={(event) => event.currentTarget.blur()}
                        onChange={(event) => {
                          const raw = event.currentTarget.valueAsNumber
                          const amount =
                            Number.isFinite(raw) && raw >= 1 ? Math.trunc(raw) : 1
                          const next = [...entries]
                          next[index] = { ...entry, amount }
                          setCostItems(next)
                        }}
                      />
                      <button
                        type="button"
                        className="mini"
                        aria-label={`删除消耗物品 ${index + 1}`}
                        title="删除"
                        onClick={() => setCostItems(entries.filter((_, row) => row !== index))}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="v-field" style={{ marginTop: 10 }}>
                <span className="lb">说明</span>
                <textarea
                  className="in cf-ta"
                  key={`${skill.id}-desc`}
                  defaultValue={skill.desc}
                  onBlur={(e) => {
                    if (e.target.value !== skill.desc) patch({ desc: e.target.value })
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="section">
              <h4>
                效果链{' '}
                <span className="hint2">有序;「条件门」失败截断其后(原版 jump-on-fail 同构)</span>
              </h4>
              {skill.effects.map((e, i) => (
                <div key={`${skill.id}-${i}`}>
                  <div className="ef-row">
                    <select
                      className="in ef-kind"
                      value={e.kind}
                      onChange={(ev) => {
                        try {
                          setEffect(
                            i,
                            defaultEffect(ev.target.value as SkillEffect['kind'], battleSprites),
                          )
                          onStatusNotice?.(undefined)
                        } catch (reason) {
                          onStatusNotice?.({
                            kind: 'error',
                            message: reason instanceof Error ? reason.message : String(reason),
                          })
                        }
                      }}
                    >
                      {EFFECT_KINDS.map((k) => (
                        <option key={k.v} value={k.v}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <div className="ef-fields">
                      <EffectFields
                        e={e}
                        on={(next) => setEffect(i, next)}
                        assetCatalog={assetCatalog}
                        assetReader={assetReader}
                        battleSprites={battleSprites}
                        onOpenSound={onOpenSound}
                        onOpenBattleSprite={onOpenBattleSprite}
                      />
                    </div>
                    <span className="ef-ops">
                      <button
                        type="button"
                        className="mini"
                        title="上移"
                        disabled={i === 0}
                        onClick={() => {
                          const ef = [...skill.effects]
                          const t = ef[i - 1]!
                          ef[i - 1] = ef[i]!
                          ef[i] = t
                          patch({ effects: ef })
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="mini"
                        title="下移"
                        disabled={i === skill.effects.length - 1}
                        onClick={() => {
                          const ef = [...skill.effects]
                          const t = ef[i + 1]!
                          ef[i + 1] = ef[i]!
                          ef[i] = t
                          patch({ effects: ef })
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="mini"
                        title="删除"
                        onClick={() => patch({ effects: skill.effects.filter((_, j) => j !== i) })}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  {e.kind === 'summon' && (
                    <div className="ef-preview-row">
                      <SummonPreview
                        assetBase={assetBase}
                        definition={battleSprites.find((entry) => entry.id === e.battleSprite)}
                        assetReader={assetReader}
                        speed={e.speed}
                      />
                    </div>
                  )}
                  {e.kind === 'trance' && (
                    <div className="ef-preview-row">
                      <TrancePreview
                        assetBase={assetBase}
                        definition={battleSprites.find((entry) => entry.id === e.battleSprite)}
                        assetReader={assetReader}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="tool"
                onClick={() =>
                  patch({ effects: [...skill.effects, defaultEffect('damage', battleSprites)] })
                }
              >
                ＋ 添加效果
              </button>
            </div>

            <div className="section">
              <h4>
                动画 <span className="hint2">FIRE 特效参数;右侧预览实时反映</span>
              </h4>
              <SkillAnimationEditor
                animation={skill.animation}
                onChange={(animation) => patch({ animation })}
                assetCatalog={assetCatalog}
                assetReader={assetReader}
                assetBase={assetBase}
                onOpenSound={onOpenSound}
              />
            </div>

            <div className="section">
              <h4>
                施法分支 <span className="hint2">仅用于区分玩家和敌人施法；不设置则沿用公共效果和动画</span>
              </h4>
              {(['player', 'enemy'] as const).map((side) => {
                const override = skill.execution?.[side]
                return override ? (
                  <div key={side} className="section-subpanel">
                    <ExecutionOverrideEditor
                      side={side}
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
                    <button type="button" className="mini-txt danger" onClick={() => setExecution(side, undefined)}>
                      删除{side === 'player' ? '玩家' : '敌人'}分支
                    </button>
                  </div>
                ) : (
                  <button
                    key={side}
                    type="button"
                    className="tool"
                    onClick={() => setExecution(side, { effects: [] })}
                  >
                    ＋ 添加{side === 'player' ? '玩家' : '敌人'}施法分支
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无技能
          </div>
        )}
      </div>
      <div className="inspector">
        <div className="pane-h">
          <span className="t">技能 · 编辑</span>
        </div>
        <div className="insp-hint">
          全字段即改即生效(⌘Z 可回)。效果链有序:「条件门」失败截断其后。动画预览 = FIRE
          特效帧循环(速度/起点/音效实时反映);完整战斗语境预览待引擎召唤/变身
          动画(B5)补齐后上。升级学技能在「角色」模式;敌人技能在「敌人」页。
        </div>
      </div>
    </>
  )
}
