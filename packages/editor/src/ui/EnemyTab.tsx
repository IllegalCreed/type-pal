/**
 * 敌人工作台(M4c-3)—— 数据模式「敌人」标签:从头造新敌人的生产线。
 * 左:敌人列表(过滤/➕新建);中:数值 + AI 规则表格 + 掉落;右:敌队(⚔ 一键试打 =
 * 同源试玩页 ?battle=<team>,复用真实引擎零仿真偏差(本地工程 FSA 句柄跨不了源)。
 *
 * AI 规则表格:常见条件/动作下拉行编;复杂条件(all/any/not)与 choreography/onDefeated
 * 走 JSON 兜底(同 CommandForm 哲学:全数据可编不留死角)。
 */
import type {
  AiAction,
  AiCond,
  AiRule,
  AiTarget,
  EnemyDef,
  EnemyTeamDef,
  Locale,
  SkillData,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useMemo, useState } from 'react'
import {
  AddEnemyCommand,
  DeleteEnemyCommand,
  UpdateEnemyCommand,
  UpdateEnemyTeamsCommand,
  UpdateLocaleCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { EnemyAnimPreview } from './EnemyAnimPreview.js'

/** reforge(pal)地址:主机跟随编辑器访问地址(局域网/同事机不再错跳 localhost),端口按 dev-servers.md。 */
// 同源试玩页(本地工程 FSA 句柄跨不了源;?project= 由调用处拼)

/** 新敌人模板(史莱姆级;id 用 c 前缀避开迁移 objectIndex 空间)。 */
function newEnemy(id: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    spriteNum: 1,
    stats: {
      health: 50,
      level: 1,
      exp: 5,
      cash: 5,
      attackStrength: 20,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    anim: {
      idleFrames: 2,
      magicFrames: 0,
      attackFrames: 2,
      idleAnimSpeed: 5,
      actWaitFrames: 1,
      yPosOffset: 0,
    },
    sounds: { attack: 0, action: 0, magic: 0, death: 0, call: 0 },
  }
}

// ── 条件/动作 表格化词汇(常见形;复杂形 JSON)──
type CondKind =
  | 'always'
  | 'hpBelow'
  | 'hpAbove'
  | 'turnGte'
  | 'chance'
  | 'aloneAlive'
  | 'firstOfKind'
  | 'complex'
const COND_LABEL: Record<CondKind, string> = {
  always: '恒真(兜底)',
  hpBelow: 'HP 低于 %',
  hpAbove: 'HP 高于 %',
  turnGte: '回合 ≥',
  chance: '概率 %',
  aloneAlive: '仅剩自己',
  firstOfKind: '同种首只',
  complex: '复杂(JSON)',
}
function condKindOf(c: AiCond | undefined): CondKind {
  if (!c) return 'always'
  switch (c.kind) {
    case 'hpBelow':
      return 'hpBelow'
    case 'hpAbove':
      return 'hpAbove'
    case 'chance':
      return 'chance'
    case 'aloneAlive':
      return 'aloneAlive'
    case 'firstOfKind':
      return 'firstOfKind'
    case 'turn':
      return c.op === '>=' ? 'turnGte' : 'complex'
    default:
      return 'complex'
  }
}
function condValueOf(c: AiCond | undefined): number {
  if (!c) return 0
  if (c.kind === 'hpBelow' || c.kind === 'hpAbove' || c.kind === 'chance') return c.percent
  if (c.kind === 'turn') return c.value
  return 0
}
function makeCond(kind: CondKind, value: number): AiCond | undefined {
  switch (kind) {
    case 'always':
      return undefined
    case 'hpBelow':
      return { kind: 'hpBelow', percent: value || 30 }
    case 'hpAbove':
      return { kind: 'hpAbove', percent: value || 50 }
    case 'turnGte':
      return { kind: 'turn', op: '>=', value: value || 2 }
    case 'chance':
      return { kind: 'chance', percent: value || 50 }
    case 'aloneAlive':
      return { kind: 'aloneAlive' }
    case 'firstOfKind':
      return { kind: 'firstOfKind' }
    default:
      return undefined
  }
}
const ACTION_LABEL: Record<AiAction['kind'], string> = {
  attack: '普攻',
  cast: '施法',
  summon: '召唤',
  transform: '变身',
  divide: '分裂',
  flee: '逃跑',
  pass: '不动',
}
const TARGETS: { v: AiTarget; l: string }[] = [
  { v: 'random', l: '随机(原版)' },
  { v: 'lowestHp', l: '集火残血' },
  { v: 'highestHp', l: '打高血' },
  { v: 'lowestMp', l: '打低蓝' },
  { v: 'strongest', l: '打高攻' },
]

function RuleRow(props: {
  rule: AiRule
  enemies: EnemyDef[]
  skills: SkillData[]
  locale: Locale
  onChange: (r: AiRule) => void
  onOp: (op: 'up' | 'down' | 'del') => void
}) {
  const { rule, enemies, skills, locale, onChange, onOp } = props
  const ck = condKindOf(rule.when)
  const a = rule.do
  const setAction = (patch: Partial<AiAction>): void =>
    onChange({ ...rule, do: { ...a, ...patch } as AiAction })
  const switchAction = (kind: AiAction['kind']): void => {
    const mk: Record<AiAction['kind'], AiAction> = {
      attack: { kind: 'attack' },
      cast: { kind: 'cast', skillId: skills[0]?.id ?? '0' },
      summon: { kind: 'summon', count: 1 },
      transform: { kind: 'transform', enemyId: enemies[0]?.id ?? '' },
      divide: { kind: 'divide', copies: 1 },
      flee: { kind: 'flee' },
      pass: { kind: 'pass' },
    }
    onChange({ ...rule, do: mk[kind] })
  }
  return (
    <div className="rule-row">
      <select
        className="in rr-at"
        value={rule.at}
        onChange={(e) => onChange({ ...rule, at: e.target.value as AiRule['at'] })}
      >
        <option value="act">行动</option>
        <option value="turnStart">轮起手</option>
      </select>
      <select
        className="in rr-cond"
        value={ck}
        disabled={ck === 'complex'}
        onChange={(e) =>
          onChange({ ...rule, when: makeCond(e.target.value as CondKind, condValueOf(rule.when)) })
        }
      >
        {(Object.keys(COND_LABEL) as CondKind[]).map((k) => (
          <option key={k} value={k} disabled={k === 'complex'}>
            {COND_LABEL[k]}
          </option>
        ))}
      </select>
      {ck === 'hpBelow' || ck === 'hpAbove' || ck === 'turnGte' || ck === 'chance' ? (
        <input
          className="in rr-num"
          type="number"
          value={condValueOf(rule.when)}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => onChange({ ...rule, when: makeCond(ck, Number(e.target.value)) })}
        />
      ) : (
        <span className="rr-num" />
      )}
      <select
        className="in rr-act"
        value={a.kind}
        onChange={(e) => switchAction(e.target.value as AiAction['kind'])}
      >
        {(Object.keys(ACTION_LABEL) as AiAction['kind'][]).map((k) => (
          <option key={k} value={k}>
            {ACTION_LABEL[k]}
          </option>
        ))}
      </select>
      {a.kind === 'cast' ? (
        <select
          className="in rr-p1"
          value={a.skillId}
          onChange={(e) => setAction({ skillId: e.target.value })}
        >
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}({s.id})
            </option>
          ))}
        </select>
      ) : a.kind === 'transform' ? (
        <select
          className="in rr-p1"
          value={a.enemyId}
          onChange={(e) => setAction({ enemyId: e.target.value })}
        >
          {enemies.map((en) => (
            <option key={en.id} value={en.id}>
              {lookupText(en.name, locale)}({en.id})
            </option>
          ))}
        </select>
      ) : a.kind === 'summon' ? (
        <>
          <select
            className="in rr-p1"
            value={a.enemyId ?? ''}
            onChange={(e) => setAction({ enemyId: e.target.value || undefined })}
          >
            <option value="">同种</option>
            {enemies.map((en) => (
              <option key={en.id} value={en.id}>
                {lookupText(en.name, locale)}
              </option>
            ))}
          </select>
          <input
            className="in rr-num"
            type="number"
            min={1}
            value={a.count}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setAction({ count: Math.max(1, Number(e.target.value)) })}
          />
        </>
      ) : a.kind === 'divide' ? (
        <input
          className="in rr-num"
          type="number"
          min={1}
          value={a.copies}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => setAction({ copies: Math.max(1, Number(e.target.value)) })}
        />
      ) : (
        <span className="rr-p1" />
      )}
      {a.kind === 'attack' || a.kind === 'cast' ? (
        <select
          className="in rr-tgt"
          value={a.target ?? 'random'}
          onChange={(e) =>
            setAction({
              target: e.target.value === 'random' ? undefined : (e.target.value as AiTarget),
            })
          }
        >
          {TARGETS.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      ) : (
        <span className="rr-tgt" />
      )}
      <label className="rr-once" title="整场只触发一次">
        <input
          type="checkbox"
          checked={!!rule.once}
          onChange={(e) => onChange({ ...rule, once: e.target.checked || undefined })}
        />
        1次
      </label>
      <span
        className="cmd-ops"
        style={{
          position: 'static',
          opacity: 1,
          pointerEvents: 'auto',
          background: 'none',
          padding: 0,
        }}
      >
        <button type="button" title="上移" onClick={() => onOp('up')}>
          ↑
        </button>
        <button type="button" title="下移" onClick={() => onOp('down')}>
          ↓
        </button>
        <button type="button" className="del" title="删除" onClick={() => onOp('del')}>
          ✕
        </button>
      </span>
    </div>
  )
}

export function EnemyTab(props: {
  enemies: EnemyDef[]
  enemyTeams: EnemyTeamDef[]
  skills: SkillData[]
  locale: Locale
  session: EditSession
  /** 资产根(外观预览加载战斗精灵;缺省不渲预览)。 */
  assetBase?: import('@type-pal/reforge').AssetBase
  /** 工程 id(同源试玩页;缺省 pal 兼容旧调用)。 */
  projectId?: string
  /** DataMode 的标签栏(渲染在左栏顶部,保持标签切换)。 */
  tabBar?: React.ReactNode
}) {
  const { enemies, enemyTeams, skills, locale, session, tabBar, assetBase, projectId = 'pal' } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(enemies[0]?.id ?? '')
  const [selTeam, setSelTeam] = useState<string | null>(null)

  const shown = useMemo(
    () =>
      enemies.filter(
        (e) => !filter || e.id.includes(filter) || lookupText(e.name, locale).includes(filter),
      ),
    [enemies, filter, locale],
  )
  const enemy = enemies.find((e) => e.id === selId) ?? shown[0]
  const nameOf = (e: EnemyDef): string => lookupText(e.name, locale)
  const teamsOfSel = useMemo(
    () => (enemy ? enemyTeams.filter((t) => t.members.includes(enemy.id)) : []),
    [enemyTeams, enemy],
  )
  const team = enemyTeams.find((t) => t.id === selTeam) ?? teamsOfSel[0]

  const patchStats = (k: keyof EnemyDef['stats'], v: number | boolean): void => {
    if (!enemy) return
    session.dispatch(new UpdateEnemyCommand(enemy.id, { stats: { ...enemy.stats, [k]: v } }))
  }
  const setRules = (rules: AiRule[]): void => {
    if (!enemy) return
    session.dispatch(
      new UpdateEnemyCommand(enemy.id, {
        ai: { ...enemy.ai, rules: rules.length ? rules : undefined },
      }),
    )
  }
  const setTeams = (teams: EnemyTeamDef[]): void =>
    session.dispatch(new UpdateEnemyTeamsCommand(teams))

  const addEnemy = (): void => {
    let n = 1
    while (enemies.some((e) => e.id === `enemy-c${n}`)) n++
    const id = `enemy-c${n}`
    session.dispatch(new AddEnemyCommand(newEnemy(id)))
    session.dispatch(new UpdateLocaleCommand(`name.${id}`, `新敌人 ${n}`))
    setSelId(id)
  }

  const rules = enemy?.ai.rules ?? []
  const statFields: { k: keyof EnemyDef['stats']; l: string }[] = [
    { k: 'health', l: 'HP' },
    { k: 'level', l: '等级' },
    { k: 'attackStrength', l: '武术' },
    { k: 'magicStrength', l: '灵力' },
    { k: 'defense', l: '防御' },
    { k: 'dexterity', l: '身法' },
    { k: 'fleeRate', l: '吉运(难逃)' },
    { k: 'physicalResistance', l: '物抗' },
    { k: 'exp', l: '经验' },
    { k: 'cash', l: '金钱' },
    { k: 'collectValue', l: '收妖值' },
  ]

  return (
    <>
      {/* 左:标签栏 + 敌人列表 */}
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">敌人</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{enemies.length}
          </span>
          <button type="button" className="pv-btn" title="新建敌人" onClick={addEnemy}>
            ＋
          </button>
        </div>
        <input
          className="in"
          placeholder="过滤 id/名…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ margin: '0 8px 6px' }}
        />
        <div className="sprite-list">
          {shown.map((e) => (
            <button
              type="button"
              key={e.id}
              className={`arow${e.id === enemy?.id ? ' sel' : ''}`}
              onClick={() => setSelId(e.id)}
            >
              <span className="face">👹</span>
              <span className="nm">
                <b>{nameOf(e)}</b>
                <span>
                  {e.id} · 精灵#{e.spriteNum}
                </span>
              </span>
              {e.ai.rules?.length ? (
                <span className="abadge npc">{e.ai.rules.length} 规则</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* 中:敌人编辑 */}
      <div className="center et-center">
        {enemy ? (
          <div className="et-form">
            <div className="section">
              <h4>基础</h4>
              <div className="form-grid">
                <label>
                  <span className="lb">名字</span>
                  <input
                    className="in"
                    value={nameOf(enemy)}
                    onChange={(e) =>
                      session.dispatch(new UpdateLocaleCommand(enemy.name, e.target.value))
                    }
                  />
                </label>
                <label>
                  <span className="lb">战斗精灵#</span>
                  <input
                    className="in mono"
                    type="number"
                    value={enemy.spriteNum}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      session.dispatch(
                        new UpdateEnemyCommand(enemy.id, {
                          spriteNum: Math.max(0, Math.floor(e.target.valueAsNumber || 0)),
                        }),
                      )
                    }
                  />
                </label>
                <label className="cf-inline">
                  <input
                    type="checkbox"
                    checked={enemy.stats.dualMove}
                    onChange={(e) => patchStats('dualMove', e.target.checked)}
                  />
                  二动(一回合两次)
                </label>
              </div>
            </div>
            {assetBase ? (
              <div className="section">
                <EnemyAnimPreview enemy={enemy} assetBase={assetBase} session={session} />
              </div>
            ) : null}
            <div className="section">
              <h4>数值</h4>
              <div className="et-stats">
                {statFields.map(({ k, l }) => (
                  <label key={k} className="et-stat">
                    <span>{l}</span>
                    <input
                      className="in mono"
                      type="number"
                      value={enemy.stats[k] as number}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => patchStats(k, Math.floor(e.target.valueAsNumber || 0))}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="section">
              <h4>
                AI 规则 <span className="hint2">从上到下首条命中;无命中 = 普攻</span>
              </h4>
              {rules.map((r, i) => (
                <RuleRow
                  key={i}
                  rule={r}
                  enemies={enemies}
                  skills={skills}
                  locale={locale}
                  onChange={(nr) => setRules(rules.map((x, j) => (j === i ? nr : x)))}
                  onOp={(op) => {
                    if (op === 'del') return setRules(rules.filter((_, j) => j !== i))
                    const j = op === 'up' ? i - 1 : i + 1
                    if (j < 0 || j >= rules.length) return
                    const next = [...rules]
                    ;[next[i], next[j]] = [next[j]!, next[i]!]
                    setRules(next)
                  }}
                />
              ))}
              <button
                type="button"
                className="pv-btn"
                onClick={() => setRules([...rules, { at: 'act', do: { kind: 'attack' } }])}
              >
                ＋ 加规则
              </button>
            </div>
            <div className="section">
              <h4>掉落 / 演出(JSON 兜底)</h4>
              <textarea
                className="in cf-ta"
                key={`${enemy.id}-extra`}
                defaultValue={JSON.stringify(
                  {
                    steal: enemy.steal,
                    attackEquivItem: enemy.attackEquivItem,
                    choreography: enemy.choreography,
                    onDefeated: enemy.onDefeated,
                  },
                  null,
                  2,
                )}
                onBlur={(e) => {
                  try {
                    const v = JSON.parse(e.target.value) as Pick<
                      EnemyDef,
                      'steal' | 'attackEquivItem' | 'choreography' | 'onDefeated'
                    >
                    session.dispatch(
                      new UpdateEnemyCommand(enemy.id, {
                        steal: v.steal,
                        attackEquivItem: v.attackEquivItem,
                        choreography: v.choreography,
                        onDefeated: v.onDefeated,
                      }),
                    )
                  } catch {
                    /* 解析失败不落盘;失焦保持原文供修 */
                  }
                }}
                spellCheck={false}
              />
              <div className="cf-insert" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="pv-btn del"
                  onClick={() => {
                    if (confirm(`删除敌人 ${nameOf(enemy)}(${enemy.id})?`))
                      session.dispatch(new DeleteEnemyCommand(enemy.id))
                  }}
                >
                  🗑 删除此敌
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无敌人;点 ＋ 新建。
          </div>
        )}
      </div>

      {/* 右:敌队 + 试打 */}
      <div className="inspector">
        <div className="insp-head">
          <div className="what">敌队 · 试打</div>
          <div className="who">{enemy ? nameOf(enemy) : '—'}</div>
        </div>
        <div className="section">
          <h4>
            所在敌队 <span className="hint2">⚔ 同源试玩页试打</span>
          </h4>
          {teamsOfSel.length === 0 ? (
            <p className="hint">不在任何敌队。加入或新建一队才能被遭遇/试打。</p>
          ) : null}
          {teamsOfSel.map((t) => (
            <div key={t.id} className="et-team-row">
              <button
                type="button"
                className={`pv-btn${team?.id === t.id ? ' sel' : ''}`}
                onClick={() => setSelTeam(t.id)}
              >
                {t.id}
              </button>
              <span className="hint2">{t.members.length} 员</span>
              <span className="spacer" />
              <button
                type="button"
                className="pv-btn"
                title="读磁盘工程:改动须先 💾 保存"
                onClick={() =>
                  window.open(`play.html?project=${projectId}&battle=${t.id.replace('team-', '')}`, '_blank')
                }
              >
                ⚔ 试打
              </button>
            </div>
          ))}
          <div className="cf-insert" style={{ marginTop: 6 }}>
            <button
              type="button"
              className="pv-btn"
              onClick={() => {
                if (!enemy) return
                let n = 1
                while (enemyTeams.some((t) => t.id === `team-c${n}`)) n++
                const id = `team-c${n}`
                setTeams([...enemyTeams, { id, members: [enemy.id] }])
                setSelTeam(id)
              }}
            >
              ＋ 新建敌队(含此敌)
            </button>
          </div>
        </div>
        {team ? (
          <div className="section">
            <h4>
              编辑 {team.id} <span className="hint2">≤5 员</span>
            </h4>
            {team.members.map((m, mi) => (
              <div key={mi} className="et-team-row">
                <select
                  className="in"
                  value={m}
                  onChange={(e) =>
                    setTeams(
                      enemyTeams.map((t) =>
                        t.id === team.id
                          ? {
                              ...t,
                              members: t.members.map((x, j) => (j === mi ? e.target.value : x)),
                            }
                          : t,
                      ),
                    )
                  }
                >
                  {enemies.map((en) => (
                    <option key={en.id} value={en.id}>
                      {nameOf(en)}({en.id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="pv-btn del"
                  onClick={() =>
                    setTeams(
                      enemyTeams.map((t) =>
                        t.id === team.id
                          ? { ...t, members: t.members.filter((_, j) => j !== mi) }
                          : t,
                      ),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            {team.members.length < 5 ? (
              <button
                type="button"
                className="pv-btn"
                onClick={() =>
                  enemy &&
                  setTeams(
                    enemyTeams.map((t) =>
                      t.id === team.id ? { ...t, members: [...t.members, enemy.id] } : t,
                    ),
                  )
                }
              >
                ＋ 加一员
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="section">
          <h4>从头造新敌人</h4>
          <p className="hint">
            ＋ 新建 → 改名/数值 → 配 AI 规则(变身/施法/集火都在下拉里)→ 建敌队 → **💾 保存** → ⚔
            试打(试打读磁盘工程;需 reforge dev:pal 在跑,见 docs/dev-servers.md)。
          </p>
        </div>
      </div>
    </>
  )
}
