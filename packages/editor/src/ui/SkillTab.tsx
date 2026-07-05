/**
 * 技能编辑页(2026-07-05 作者拍板「结构化 + 特效预览」,废 JSON 大块)。
 * 左:技能列表;中:基础 / 消耗 / 目标 / 效果行(15 种 kind 分支字段,顺序有语义:gate
 * 截断其后) / 动画参数 + FIRE 特效实时预览(参数改动即反映,循环播,含音效)。
 * 完整战斗语境预览等引擎 B5 召唤/变身动画补齐后再上(拍板记录)。
 */
import type { AssetBase } from '@type-pal/reforge'
import type { SkillAnimation, SkillData, SkillEffect, StatusId } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UpdateSkillCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { FireEffectPreview } from './FireEffectPreview.js'
import { SummonPreview } from './SummonPreview.js'

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
  { v: 'steal', label: '偷窃' },
  { v: 'collectTreasure', label: '收宝' },
  { v: 'summon', label: '召唤' },
  { v: 'trance', label: '变身' },
]

/** kind 切换的缺省效果体。 */
function defaultEffect(kind: SkillEffect['kind']): SkillEffect {
  switch (kind) {
    case 'damage': return { kind, power: 10, elemental: 0 }
    case 'healHp': return { kind, amount: 50 }
    case 'healMp': return { kind, amount: 20 }
    case 'revive': return { kind, hpPercent: 10 }
    case 'applyStatus': return { kind, status: 'sleep', turns: 3 }
    case 'removeStatus': return { kind, statuses: [] }
    case 'applyPoison': return { kind, poisonId: '' }
    case 'curePoison': return { kind }
    case 'buffStat': return { kind, stat: 'attack', percent: 50, duration: 'battle' }
    case 'gate': return { kind, chance: 50 }
    case 'instantKill': return { kind }
    case 'steal': return { kind, rate: 50 }
    case 'collectTreasure': return { kind }
    case 'summon': return { kind, godId: 0 }
    case 'trance': return { kind, sprite: 0 }
  }
}

function N(props: { v: number | undefined; on: (n: number | undefined) => void; ph?: string; w?: number }) {
  return (
    <input
      className="in mono ef-num"
      type="number"
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
function EffectFields(props: { e: SkillEffect; on: (next: SkillEffect) => void }) {
  const { e, on } = props
  switch (e.kind) {
    case 'damage':
      return (
        <>
          <label>威力 <N v={e.power} on={(n) => on({ ...e, power: n ?? 0 })} /></label>
          <label>
            五行
            <select className="in" value={e.elemental} onChange={(ev) => on({ ...e, elemental: Number(ev.target.value) })}>
              {ELEMENTS.map((nm, i) => (
                <option key={nm} value={i === 6 ? 6 : i}>{nm}</option>
              ))}
            </select>
          </label>
        </>
      )
    case 'healHp':
    case 'healMp':
      return <label>量 <N v={e.amount} on={(n) => on({ ...e, amount: n ?? 0 })} /></label>
    case 'revive':
      return <label>回 max% <N v={e.hpPercent} on={(n) => on({ ...e, hpPercent: n ?? 0 })} /></label>
    case 'applyStatus':
      return (
        <>
          <label>
            状态
            <select className="in" value={e.status} onChange={(ev) => on({ ...e, status: ev.target.value as StatusId })}>
              {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </label>
          <label>回合 <N v={e.turns} on={(n) => on({ ...e, turns: n ?? 1 })} /></label>
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
          毒 id
          <input className="in ef-num" value={e.poisonId} onChange={(ev) => on({ ...e, poisonId: ev.target.value })} />
        </label>
      )
    case 'curePoison':
      return (
        <>
          <label>≤等级 <N v={e.maxLevel} on={(n) => on({ ...e, maxLevel: n })} ph="(全)" /></label>
          <label>
            指定毒
            <input className="in ef-num" value={e.poisonId ?? ''} placeholder="(任意)" onChange={(ev) => on({ ...e, poisonId: ev.target.value || undefined })} />
          </label>
        </>
      )
    case 'buffStat':
      return (
        <>
          <label>
            属性
            <select className="in" value={e.stat} onChange={(ev) => on({ ...e, stat: ev.target.value as typeof e.stat })}>
              <option value="attack">武术</option>
              <option value="defense">防御</option>
              <option value="magic">灵力</option>
              <option value="dexterity">身法</option>
            </select>
          </label>
          <label>+% <N v={e.percent} on={(n) => on({ ...e, percent: n ?? 0 })} /></label>
          <label>
            持续
            <select
              className="in"
              value={e.duration === 'battle' ? 'battle' : 'turns'}
              onChange={(ev) => on({ ...e, duration: ev.target.value === 'battle' ? 'battle' : 3 })}
            >
              <option value="battle">整场</option>
              <option value="turns">N 回合</option>
            </select>
          </label>
          {e.duration !== 'battle' && <N v={e.duration} on={(n) => on({ ...e, duration: n ?? 3 })} />}
        </>
      )
    case 'gate':
      return (
        <>
          <label>概率% <N v={e.chance} on={(n) => on({ ...e, chance: n })} ph="(无)" /></label>
          <label>HP≤% <N v={e.hpAtMostPercent} on={(n) => on({ ...e, hpAtMostPercent: n })} ph="(无)" /></label>
          <label className="cf-inline">
            <input type="checkbox" checked={e.magicResist === true} onChange={(ev) => on({ ...e, magicResist: ev.target.checked || undefined })} />
            灵抗掷
          </label>
        </>
      )
    case 'steal':
      return <label>成功率 <N v={e.rate} on={(n) => on({ ...e, rate: n ?? 0 })} /></label>
    case 'summon':
      return <label>神将号 <N v={e.godId} on={(n) => on({ ...e, godId: n ?? 0 })} /></label>
    case 'trance':
      return <label>变身精灵 <N v={e.sprite} on={(n) => on({ ...e, sprite: n ?? 0 })} /></label>
    default:
      return <span className="hint2">(无参数)</span>
  }
}

export function SkillTab(props: {
  skills: SkillData[]
  session: EditSession
  assetBase: AssetBase
  tabBar?: React.ReactNode
}) {
  const { skills, session, assetBase, tabBar } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(skills[0]?.id ?? '')
  const shown = useMemo(
    () => skills.filter((s) => !filter || s.id.includes(filter) || s.name.includes(filter)),
    [skills, filter],
  )
  const skill = skills.find((s) => s.id === selId) ?? shown[0]
  const patch = (p: Partial<Omit<SkillData, 'id'>>): void => {
    if (skill) session.dispatch(new UpdateSkillCommand(skill.id, p))
  }
  const setEffect = (i: number, next: SkillEffect): void => {
    if (!skill) return
    const effects = [...skill.effects]
    effects[i] = next
    patch({ effects })
  }
  const setAnim = (p: Partial<SkillAnimation>): void => {
    if (!skill) return
    patch({ animation: { ...skill.animation, ...p } })
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">技能</span>
          <span className="spacer" />
          <span className="k">{shown.length}/{skills.length}</span>
        </div>
        <input className="in" placeholder="过滤 id/名…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="sprite-list">
          {shown.map((s) => (
            <button type="button" key={s.id} className={`arow${s.id === skill?.id ? ' sel' : ''}`} onClick={() => setSelId(s.id)}>
              <span className="nm">
                {s.name}
                <span className="meta"> {s.id}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="canvas-wrap data-body">
        {skill ? (
          <div className="et-scroll skill-form">
            <div className="section">
              <h4>基础</h4>
              <div className="sk-grid">
                <label>名字 <input className="in" value={skill.name} onChange={(e) => patch({ name: e.target.value })} /></label>
                <label>
                  目标
                  <select className="in" value={skill.target} onChange={(e) => patch({ target: e.target.value as SkillData['target'] })}>
                    {TARGETS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </label>
                <label>耗真气 <N v={skill.cost.mp} on={(n) => patch({ cost: { ...skill.cost, mp: n } })} ph="0" /></label>
                <label>耗体力 <N v={skill.cost.stamina} on={(n) => patch({ cost: { ...skill.cost, stamina: n } })} ph="0" /></label>
                <label>耗金钱 <N v={skill.cost.money} on={(n) => patch({ cost: { ...skill.cost, money: n } })} ph="0" /></label>
                <label className="cf-inline">
                  <input type="checkbox" checked={skill.usableOutsideBattle} onChange={(e) => patch({ usableOutsideBattle: e.target.checked })} />
                  战外可用
                </label>
              </div>
              <div className="field" style={{ marginTop: 6 }}>
                <label>说明</label>
                <textarea
                  className="in cf-ta"
                  key={`${skill.id}-desc`}
                  defaultValue={skill.desc}
                  onBlur={(e) => { if (e.target.value !== skill.desc) patch({ desc: e.target.value }) }}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="section">
              <h4>效果链 <span className="hint2">有序;「条件门」失败截断其后(原版 jump-on-fail 同构)</span></h4>
              {skill.effects.map((e, i) => (
                <div className="ef-row" key={`${skill.id}-${i}`}>
                  <select
                    className="in ef-kind"
                    value={e.kind}
                    onChange={(ev) => setEffect(i, defaultEffect(ev.target.value as SkillEffect['kind']))}
                  >
                    {EFFECT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
                  </select>
                  <div className="ef-fields">
                    <EffectFields e={e} on={(next) => setEffect(i, next)} />
                  </div>
                  <span className="ef-ops">
                    <button type="button" className="mini" title="上移" disabled={i === 0}
                      onClick={() => { const ef = [...skill.effects]; const t = ef[i - 1]!; ef[i - 1] = ef[i]!; ef[i] = t; patch({ effects: ef }) }}>↑</button>
                    <button type="button" className="mini" title="下移" disabled={i === skill.effects.length - 1}
                      onClick={() => { const ef = [...skill.effects]; const t = ef[i + 1]!; ef[i + 1] = ef[i]!; ef[i] = t; patch({ effects: ef }) }}>↓</button>
                    <button type="button" className="mini" title="删除"
                      onClick={() => patch({ effects: skill.effects.filter((_, j) => j !== i) })}>✕</button>
                  </span>
                </div>
              ))}
              <button type="button" className="tool" onClick={() => patch({ effects: [...skill.effects, defaultEffect('damage')] })}>
                ＋ 添加效果
              </button>
            </div>

            <div className="section">
              <h4>动画 <span className="hint2">FIRE 特效参数;右侧预览实时反映</span></h4>
              <div className="sk-anim">
                <div className="sk-grid">
                  <label>特效号 <N v={skill.animation.effectSprite} on={(n) => setAnim({ effectSprite: n ?? 0 })} /></label>
                  <label>
                    落点
                    <select className="in" value={skill.animation.placement ?? 'normal'} onChange={(e) => setAnim({ placement: e.target.value as SkillAnimation['placement'] })}>
                      <option value="normal">目标点</option>
                      <option value="attackAll">逐敌各放</option>
                      <option value="attackWhole">敌群中心</option>
                      <option value="attackField">全屏</option>
                    </select>
                  </label>
                  <label>X 偏移 <N v={skill.animation.xOffset} on={(n) => setAnim({ xOffset: n })} ph="0" /></label>
                  <label>Y 偏移 <N v={skill.animation.yOffset} on={(n) => setAnim({ yOffset: n })} ph="0" /></label>
                  <label>速度 <N v={skill.animation.speed} on={(n) => setAnim({ speed: n })} ph="0" /></label>
                  <label>循环起点 <N v={skill.animation.fireDelay} on={(n) => setAnim({ fireDelay: n })} ph="0" /></label>
                  <label>循环次数 <N v={skill.animation.effectTimes} on={(n) => setAnim({ effectTimes: n })} ph="1" /></label>
                  <label>震屏帧 <N v={skill.animation.shake} on={(n) => setAnim({ shake: n })} ph="0" /></label>
                  <label>音效号 <N v={skill.animation.sound} on={(n) => setAnim({ sound: n })} ph="(无)" /></label>
                </div>
                <div className="sk-previews">
                  {(() => {
                    const sm = skill.effects.find((e) => e.kind === 'summon')
                    return sm?.kind === 'summon' ? (
                      <SummonPreview
                        assetBase={assetBase}
                        godId={sm.godId}
                        speed={sm.speed}
                      />
                    ) : null
                  })()}
                  <FireEffectPreview assetBase={assetBase} anim={skill.animation} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>无技能</div>
        )}
      </div>
      <div className="inspector">
        <div className="pane-h"><span className="t">技能 · 编辑</span></div>
        <div className="insp-hint">
          全字段即改即生效(⌘Z 可回)。效果链有序:「条件门」失败截断其后。动画预览 =
          FIRE 特效帧循环(速度/起点/音效实时反映);完整战斗语境预览待引擎召唤/变身
          动画(B5)补齐后上。升级学技能在「角色」模式;敌人技能在「敌人」页。
        </div>
      </div>
    </>
  )
}
