/**
 * 敌人工作台(M4c-3)—— 数据模式「敌人」标签:从头造新敌人的生产线。
 * 左:敌人列表(过滤/➕新建);中:数值 + AI 规则表格 + 物品交互;右:敌队(⚔ 一键试打 =
 * 同源试玩页 ?battle=<team>,复用真实引擎零仿真偏差(本地项目 FSA 句柄跨不了源)。
 *
 * AI 规则表格:常见条件/动作下拉行编;物品交互与常用战败奖励均提供结构化编辑。
 * 未识别的高级 choreography/onDefeated 指令只读保留,编辑常用奖励时不得覆盖。
 */
import type {
  AiAction,
  AiCond,
  AiRule,
  AiTarget,
  AssetCatalogV1,
  AssetId,
  BattleSpriteDef,
  EnemyDef,
  EnemyOnDefeatedCommand,
  EnemySounds,
  EnemyTeamDef,
  ItemData,
  Locale,
  SkillData,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  type BattleDataReference,
  blockingEnemyReferences,
} from '../core/battle-data-references.js'
import {
  AddEnemyCommand,
  BattleDataInUseError,
  CompositeCommand,
  DeleteEnemyCommand,
  UpdateEnemyCommand,
  UpdateLocaleCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { playProjectQuery } from '../core/play-url.js'
import {
  DsActionLink,
  DsButton,
  DsCheckbox,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsField,
  DsIconButton,
  DsSelect,
  DsTag,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import { EnemyAnimPreview } from './EnemyAnimPreview.js'
import { SoundPicker } from './SoundPicker.js'

type NumericEnemyStatKey =
  | 'health'
  | 'level'
  | 'attackStrength'
  | 'magicStrength'
  | 'defense'
  | 'dexterity'
  | 'fleeRate'
  | 'physicalResistance'
  | 'exp'
  | 'cash'
  | 'collectValue'

const ENEMY_STAT_GROUPS: readonly {
  id: string
  label: string
  fields: readonly { key: NumericEnemyStatKey; label: string }[]
}[] = [
  {
    id: 'combat',
    label: '战斗能力',
    fields: [
      { key: 'health', label: 'HP' },
      { key: 'level', label: '等级' },
      { key: 'attackStrength', label: '武术' },
      { key: 'magicStrength', label: '灵力' },
      { key: 'defense', label: '防御' },
      { key: 'dexterity', label: '身法' },
      { key: 'fleeRate', label: '吉运（难逃）' },
      { key: 'physicalResistance', label: '物抗' },
    ],
  },
  {
    id: 'rewards',
    label: '战后结算',
    fields: [
      { key: 'exp', label: '经验' },
      { key: 'cash', label: '金钱' },
      { key: 'collectValue', label: '收妖值' },
    ],
  },
]

const ENEMY_SOUND_GROUPS: readonly {
  id: string
  label: string
  fields: readonly {
    key: Exclude<keyof EnemySounds, 'suppressMagicEffectSound'>
    label: string
  }[]
}[] = [
  {
    id: 'actions',
    label: '动作声音',
    fields: [
      { key: 'attack', label: '普攻' },
      { key: 'action', label: '行动' },
      { key: 'magic', label: '施法' },
    ],
  },
  {
    id: 'states',
    label: '状态声音',
    fields: [
      { key: 'death', label: '死亡' },
      { key: 'call', label: '呼叫' },
    ],
  },
]

/** reforge(pal)地址:主机跟随编辑器访问地址(局域网/同事机不再错跳 localhost),端口按 dev-servers.md。 */
// 同源试玩页；本地项目用 workspaceId 定位 FSA 句柄，projectId 只描述内容身份。

/** 新敌人模板(史莱姆级;id 用 c 前缀避开迁移 objectIndex 空间)。 */
function newEnemy(id: string, battleSprite: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite,
    yPosOffset: 0,
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
    sounds: {},
  }
}

type DefeatedGiveItemCommand = Extract<EnemyOnDefeatedCommand, { kind: 'giveItem' }>
type DefeatedDialogCommand = Extract<EnemyOnDefeatedCommand, { kind: 'dialog' }>

interface DefeatedItemReward {
  startIndex: number
  endIndex: number
  itemId: string
  count: number
  probability: number
  dialog?: DefeatedDialogCommand
}

function integerInRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function rewardSkipPercent(command: EnemyOnDefeatedCommand | undefined): number | undefined {
  if (
    command?.kind !== 'branch' ||
    command.cond.kind !== 'chance' ||
    command.then.length !== 1 ||
    command.then[0]?.kind !== 'stopScript' ||
    (command.else?.length ?? 0) !== 0
  )
    return undefined
  return command.cond.percent
}

function findDefeatedItemReward(
  commands: readonly EnemyOnDefeatedCommand[] | undefined,
): DefeatedItemReward | undefined {
  if (!commands) return undefined
  const giveIndex = commands.findIndex((command) => command.kind === 'giveItem')
  if (giveIndex < 0) return undefined
  const give = commands[giveIndex] as DefeatedGiveItemCommand
  const skipPercent = rewardSkipPercent(commands[giveIndex - 1])
  const startIndex = skipPercent === undefined ? giveIndex : giveIndex - 1
  const following = commands[giveIndex + 1]
  const dialog = following?.kind === 'dialog' ? following : undefined
  return {
    startIndex,
    endIndex: giveIndex + (dialog ? 2 : 1),
    itemId: give.itemId,
    count: give.count ?? 1,
    probability: skipPercent === undefined ? 100 : 100 - skipPercent,
    dialog,
  }
}

function replaceDefeatedItemReward(
  commands: readonly EnemyOnDefeatedCommand[] | undefined,
  current: DefeatedItemReward | undefined,
  next: { itemId: string; count: number; probability: number } | undefined,
): EnemyOnDefeatedCommand[] | undefined {
  const result = [...(commands ?? [])]
  const replacement: EnemyOnDefeatedCommand[] = []
  if (next) {
    if (next.probability < 100) {
      replacement.push({
        kind: 'branch',
        cond: { kind: 'chance', percent: 100 - next.probability },
        then: [{ kind: 'stopScript' }],
      })
    }
    replacement.push({ kind: 'giveItem', itemId: next.itemId, count: next.count })
    if (current?.dialog) replacement.push(current.dialog)
  }
  if (current)
    result.splice(current.startIndex, current.endIndex - current.startIndex, ...replacement)
  else result.push(...replacement)
  return result.length ? result : undefined
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
  draftScope: string
  syncToken: number
  enemies: EnemyDef[]
  skills: SkillData[]
  locale: Locale
  onChange: (r: AiRule) => void
  onOp: (op: 'up' | 'down' | 'del') => void
}) {
  const { rule, draftScope, syncToken, enemies, skills, locale, onChange, onOp } = props
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
      <span className="rr-at">
        <DsSelect
          size="compact"
          aria-label="触发时机"
          value={rule.at}
          options={[
            { value: 'act', label: '行动' },
            { value: 'turnStart', label: '轮起手' },
          ]}
          onValueChange={(at) => onChange({ ...rule, at: at as AiRule['at'] })}
        />
      </span>
      <span className="rr-cond">
        <DsSelect
          size="compact"
          aria-label="触发条件"
          value={ck}
          disabled={ck === 'complex'}
          options={(Object.keys(COND_LABEL) as CondKind[]).map((kind) => ({
            value: kind,
            label: COND_LABEL[kind],
            disabled: kind === 'complex',
          }))}
          onValueChange={(condition) =>
            onChange({
              ...rule,
              when: makeCond(condition as CondKind, condValueOf(rule.when)),
            })
          }
        />
      </span>
      {ck === 'hpBelow' || ck === 'hpAbove' || ck === 'turnGte' || ck === 'chance' ? (
        <span className="rr-num">
          <DsDraftNumberInput
            size="compact"
            aria-label="条件数值"
            draftKey={`${draftScope}:condition`}
            syncToken={syncToken}
            value={condValueOf(rule.when)}
            onWheel={(e) => e.currentTarget.blur()}
            onCommit={(value) =>
              value !== undefined && onChange({ ...rule, when: makeCond(ck, value) })
            }
          />
        </span>
      ) : (
        <span className="rr-num" />
      )}
      <span className="rr-act">
        <DsSelect
          size="compact"
          aria-label="执行动作"
          value={a.kind}
          options={(Object.keys(ACTION_LABEL) as AiAction['kind'][]).map((kind) => ({
            value: kind,
            label: ACTION_LABEL[kind],
          }))}
          onValueChange={(action) => switchAction(action as AiAction['kind'])}
        />
      </span>
      {a.kind === 'cast' ? (
        <span className="rr-p1">
          <DsSelect
            size="compact"
            aria-label="施放技能"
            value={a.skillId}
            options={skills.map((skill) => ({
              value: skill.id,
              label: `${skill.name}(${skill.id})`,
            }))}
            onValueChange={(skillId) => setAction({ skillId })}
          />
        </span>
      ) : a.kind === 'transform' ? (
        <span className="rr-p1">
          <DsSelect
            size="compact"
            aria-label="变身敌人"
            value={a.enemyId}
            options={enemies.map((enemy) => ({
              value: enemy.id,
              label: `${lookupText(enemy.name, locale)}(${enemy.id})`,
            }))}
            onValueChange={(enemyId) => setAction({ enemyId })}
          />
        </span>
      ) : a.kind === 'summon' ? (
        <>
          <span className="rr-p1">
            <DsSelect
              size="compact"
              aria-label="召唤敌人"
              value={a.enemyId ?? ''}
              options={[
                { value: '', label: '同种' },
                ...enemies.map((enemy) => ({
                  value: enemy.id,
                  label: lookupText(enemy.name, locale),
                })),
              ]}
              onValueChange={(enemyId) => setAction({ enemyId: enemyId || undefined })}
            />
          </span>
          <span className="rr-num">
            <DsDraftNumberInput
              size="compact"
              aria-label="召唤数量"
              min={1}
              normalize={(value) => Math.max(1, value)}
              draftKey={`${draftScope}:summon.count`}
              syncToken={syncToken}
              value={a.count}
              onWheel={(e) => e.currentTarget.blur()}
              onCommit={(value) => value !== undefined && setAction({ count: value })}
            />
          </span>
        </>
      ) : a.kind === 'divide' ? (
        <span className="rr-num">
          <DsDraftNumberInput
            size="compact"
            aria-label="分裂数量"
            min={1}
            normalize={(value) => Math.max(1, value)}
            draftKey={`${draftScope}:divide.copies`}
            syncToken={syncToken}
            value={a.copies}
            onWheel={(e) => e.currentTarget.blur()}
            onCommit={(value) => value !== undefined && setAction({ copies: value })}
          />
        </span>
      ) : (
        <span className="rr-p1" />
      )}
      {a.kind === 'attack' || a.kind === 'cast' ? (
        <span className="rr-tgt">
          <DsSelect
            size="compact"
            aria-label="动作目标"
            value={a.target ?? 'random'}
            options={TARGETS.map((target) => ({ value: target.v, label: target.l }))}
            onValueChange={(target) =>
              setAction({
                target: target === 'random' ? undefined : (target as AiTarget),
              })
            }
          />
        </span>
      ) : (
        <span className="rr-tgt" />
      )}
      <span className="rr-once">
        <DsCheckbox
          size="compact"
          label="1次"
          title="整场只触发一次"
          checked={!!rule.once}
          onChange={(e) => onChange({ ...rule, once: e.target.checked || undefined })}
        />
      </span>
      <span className="rule-row-actions">
        <DsIconButton
          size="compact"
          variant="secondary"
          icon="chevron-up"
          label="上移 AI 规则"
          onClick={() => onOp('up')}
        />
        <DsIconButton
          size="compact"
          variant="secondary"
          icon="chevron-down"
          label="下移 AI 规则"
          onClick={() => onOp('down')}
        />
        <DsIconButton
          size="compact"
          variant="danger"
          icon="delete"
          label="删除 AI 规则"
          onClick={() => onOp('del')}
        />
      </span>
    </div>
  )
}

export function EnemyTab(props: {
  enemies: EnemyDef[]
  enemyTeams: EnemyTeamDef[]
  skills: SkillData[]
  items: readonly ItemData[]
  locale: Locale
  session: EditSession
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  battleSprites: readonly BattleSpriteDef[]
  onOpenSound?: (id: string) => void
  /** 资产根(外观预览加载战斗精灵;缺省不渲预览)。 */
  assetBase?: import('@type-pal/reforge').AssetBase
  /** 项目 id(同源试玩页;缺省 pal 兼容旧调用)。 */
  projectId?: string
  workspaceId?: string
  onOpenBattleSprite?: (id: string) => void
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenReference?: (reference: BattleDataReference) => void
  onOpenEnemyTeam?: (id: string) => void
}) {
  const {
    enemies,
    enemyTeams,
    skills,
    items,
    locale,
    session,
    assetCatalog,
    assetReader,
    battleSprites,
    onOpenSound,
    assetBase,
    projectId = 'pal',
    workspaceId,
    onOpenBattleSprite,
    focusObjectId,
    onObjectFocus,
    onOpenReference,
    onOpenEnemyTeam,
  } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(enemies[0]?.id ?? '')
  const [inspectorTab, setInspectorTab] = useState('teams')
  const fieldPrefix = useId()
  const appliedFocusObjectId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      focusObjectId &&
      appliedFocusObjectId.current !== focusObjectId &&
      enemies.some((entry) => entry.id === focusObjectId)
    ) {
      setSelId(focusObjectId)
      appliedFocusObjectId.current = focusObjectId
    }
  }, [enemies, focusObjectId])

  const shown = useMemo(
    () =>
      enemies.filter(
        (e) => !filter || e.id.includes(filter) || lookupText(e.name, locale).includes(filter),
      ),
    [enemies, filter, locale],
  )
  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: lookupText(item.name, locale),
        description: item.id,
      })),
    [items, locale],
  )
  const enemy = enemies.find((e) => e.id === selId) ?? shown[0]
  const references = enemy ? blockingEnemyReferences(session.getState(), enemy.id) : []
  const nameOf = (e: EnemyDef): string => lookupText(e.name, locale)
  const teamsOfSel = useMemo(
    () => (enemy ? enemyTeams.filter((t) => t.slots.includes(enemy.id)) : []),
    [enemyTeams, enemy],
  )
  const team = teamsOfSel[0]
  const defeatedReward = findDefeatedItemReward(enemy?.onDefeated)
  const stealMode = !enemy?.steal
    ? 'none'
    : enemy.steal.itemId === '' || enemy.steal.itemId === '0'
      ? 'money'
      : 'item'
  const preservedDefeatedCommandCount =
    (enemy?.onDefeated?.length ?? 0) -
    (defeatedReward ? defeatedReward.endIndex - defeatedReward.startIndex : 0)

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
  const setSound = (key: keyof EnemySounds, value: AssetId | boolean | undefined): void => {
    if (!enemy) return
    const sounds = { ...enemy.sounds, [key]: value }
    if (value === undefined || value === false) delete sounds[key]
    session.dispatch(new UpdateEnemyCommand(enemy.id, { sounds }))
  }
  const setDefeatedReward = (
    next: { itemId: string; count: number; probability: number } | undefined,
  ): void => {
    if (!enemy) return
    session.dispatch(
      new UpdateEnemyCommand(enemy.id, {
        onDefeated: replaceDefeatedItemReward(enemy.onDefeated, defeatedReward, next),
      }),
    )
  }

  const addEnemy = (): void => {
    const defaultBattleSprite = battleSprites.find((entry) => entry.profile.kind === 'enemy')?.id
    if (!defaultBattleSprite) return
    let n = 1
    while (enemies.some((e) => e.id === `enemy-c${n}`)) n++
    const id = `enemy-c${n}`
    session.dispatch(
      new CompositeCommand('新建敌人', [
        new AddEnemyCommand(newEnemy(id, defaultBattleSprite)),
        new UpdateLocaleCommand(`name.${id}`, `新敌人 ${n}`),
      ]),
    )
    setSelId(id)
    onObjectFocus?.(id)
  }
  const removeEnemy = (): void => {
    if (!enemy) return
    if (references.length) return
    if (!window.confirm(`删除敌人 ${nameOf(enemy)}(${enemy.id})？此操作可以撤销。`)) return
    const index = enemies.findIndex((entry) => entry.id === enemy.id)
    const next = enemies[index + 1] ?? enemies[index - 1]
    try {
      session.dispatch(new DeleteEnemyCommand(enemy.id))
      setSelId(next?.id ?? '')
      onObjectFocus?.(next?.id)
    } catch (error) {
      if (!(error instanceof BattleDataInUseError)) throw error
    }
  }

  const rules = enemy?.ai.rules ?? []
  return (
    <>
      {/* 左:标签栏 + 敌人列表 */}
      <div className="outliner data-outliner">
        <DsCatalogControls
          title="敌人"
          count={enemies.length}
          unit="个"
          actions={[
            {
              id: 'create-enemy',
              label: battleSprites.some((entry) => entry.profile.kind === 'enemy')
                ? '新建敌人'
                : '请先在战斗精灵库创建 enemy 定义',
              icon: 'add',
              disabled: !battleSprites.some((entry) => entry.profile.kind === 'enemy'),
              onClick: addEnemy,
            },
          ]}
          search={{
            'aria-label': '过滤敌人',
            placeholder: '过滤 id/名…',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        <div className="sprite-list">
          {shown.map((e) => (
            <DsCatalogRow
              key={e.id}
              selected={e.id === enemy?.id}
              leading={<span className="face">👹</span>}
              title={nameOf(e)}
              meta={`${e.id} · ${e.battleSprite}`}
              trailing={
                e.ai.rules?.length ? <DsTag tone="neutral">{e.ai.rules.length} 规则</DsTag> : null
              }
              onClick={() => {
                setSelId(e.id)
                onObjectFocus?.(e.id)
              }}
            />
          ))}
        </div>
      </div>

      {/* 中:敌人编辑 */}
      <div className="center canvas-wrap data-body ds-object-workspace">
        {enemy ? (
          <>
            <DsObjectHero
              media={<span aria-hidden="true">👹</span>}
              eyebrow="敌人"
              title={nameOf(enemy)}
              objectId={enemy.id}
              summary="统一管理战斗数值、行动规则、视觉音效、物品交互与敌队试打。"
              meta={<DsTag tone="neutral">{enemy.ai.rules?.length ?? 0} 条 AI 规则</DsTag>}
              actions={
                <>
                  {team ? (
                    <DsActionLink
                      variant="secondary"
                      icon="open"
                      href={`play.html?${playProjectQuery(projectId, workspaceId)}&battle=${encodeURIComponent(team.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="读磁盘项目：改动须先保存"
                    >
                      试打
                    </DsActionLink>
                  ) : null}
                  <DsButton
                    variant="danger"
                    icon="delete"
                    disabled={references.length > 0}
                    title={
                      references.length
                        ? `仍有 ${references.length} 处引用，请先从右侧处理`
                        : '删除敌人'
                    }
                    onClick={removeEnemy}
                  >
                    删除敌人
                  </DsButton>
                </>
              }
            />
            <div className="et-scroll battle-data-form ds-object-workspace__content">
              <DsWorkbenchSection title="基础" description="配置敌人的显示名称与每回合行动次数。">
                <div className="form-grid">
                  <DsField label="名字">
                    {({ id }) => (
                      <DsDraftTextInput
                        id={id}
                        draftKey={`enemy:${enemy.id}:name`}
                        syncToken={session.getHistoryVersion()}
                        value={nameOf(enemy)}
                        onCommit={(value) =>
                          session.dispatch(new UpdateLocaleCommand(enemy.name, value))
                        }
                      />
                    )}
                  </DsField>
                  <DsCheckbox
                    label="二动（一回合行动两次）"
                    checked={enemy.stats.dualMove}
                    onChange={(e) => patchStats('dualMove', e.target.checked)}
                  />
                </div>
              </DsWorkbenchSection>
              {assetBase ? (
                <DsWorkbenchSection
                  title="外观与战斗精灵"
                  description="选择敌方战斗精灵并配置待机、施法和攻击帧。"
                >
                  <EnemyAnimPreview
                    enemy={enemy}
                    definitions={battleSprites}
                    assetBase={assetBase}
                    assetReader={assetReader}
                    session={session}
                    onOpenDefinition={onOpenBattleSprite}
                  />
                </DsWorkbenchSection>
              ) : null}
              <DsWorkbenchSection title="数值" description="分别配置战斗能力与战后结算奖励。">
                <div className="enemy-stat-layout">
                  {ENEMY_STAT_GROUPS.map((group) => (
                    <fieldset
                      className={`enemy-stat-group enemy-stat-group--${group.id}`}
                      data-enemy-stat-group={group.id}
                      key={group.id}
                    >
                      <legend>{group.label}</legend>
                      <div className="enemy-stat-grid">
                        {group.fields.map(({ key, label }) => {
                          const id = `${fieldPrefix}-stat-${key}`
                          return (
                            <DsField id={id} label={label} key={key}>
                              <DsDraftNumberInput
                                id={id}
                                name={`enemy.${enemy.id}.stats.${key}`}
                                autoComplete="off"
                                monospace
                                draftKey={`enemy:${enemy.id}:stats.${key}`}
                                syncToken={session.getHistoryVersion()}
                                value={enemy.stats[key]}
                                onWheel={(event) => event.currentTarget.blur()}
                                integer
                                normalize={Math.floor}
                                onCommit={(value) => value !== undefined && patchStats(key, value)}
                              />
                            </DsField>
                          )
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="战斗音效"
                description="配置动作声音、状态声音及施法音优先策略。"
              >
                <div className="enemy-sound-layout">
                  {ENEMY_SOUND_GROUPS.map((group) => (
                    <fieldset
                      className={`enemy-sound-group enemy-sound-group--${group.id}`}
                      data-enemy-sound-group={group.id}
                      key={group.id}
                    >
                      <legend>{group.label}</legend>
                      <div className="enemy-sound-grid">
                        {group.fields.map(({ key, label }) => {
                          const id = `${fieldPrefix}-sound-${key}`
                          return (
                            <DsField id={id} label={label} key={key}>
                              <SoundPicker
                                id={id}
                                value={enemy.sounds[key]}
                                onChange={(value) => setSound(key, value)}
                                catalog={assetCatalog}
                                reader={assetReader}
                                allowUnset
                                ariaLabel={`${label}音效`}
                                onOpenAsset={onOpenSound}
                              />
                            </DsField>
                          )
                        })}
                      </div>
                    </fieldset>
                  ))}
                  <div className="enemy-sound-option">
                    <DsCheckbox
                      checked={enemy.sounds.suppressMagicEffectSound === true}
                      onChange={(event) =>
                        setSound('suppressMagicEffectSound', event.target.checked || undefined)
                      }
                      label="施法音优先"
                    />
                    <p>播放施法音，并抑制本次技能特效音，避免两段音效重叠。</p>
                  </div>
                </div>
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="AI 规则"
                description="规则从上到下匹配首条命中项；没有命中时执行普攻。"
              >
                {rules.map((r, i) => (
                  <RuleRow
                    key={i}
                    rule={r}
                    draftScope={`enemy:${enemy.id}:ai.${i}`}
                    syncToken={session.getHistoryVersion()}
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
                <DsButton
                  variant="secondary"
                  icon="add"
                  onClick={() => setRules([...rules, { at: 'act', do: { kind: 'attack' } }])}
                >
                  加规则
                </DsButton>
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="物品交互"
                description="分别配置玩家可偷取的物品，以及敌人普攻附带的物品效果。"
              >
                <div className="enemy-item-layout">
                  <fieldset className="enemy-item-group" data-enemy-item-group="steal">
                    <legend>偷取</legend>
                    <p>明确选择不可偷取、偷取金钱或偷取物品；数量属于敌人预制。</p>
                    <DsField label="偷取内容">
                      {({ id }) => (
                        <DsSelect
                          id={id}
                          value={stealMode}
                          options={[
                            { value: 'none', label: '无' },
                            { value: 'money', label: '金钱' },
                            { value: 'item', label: '物品', disabled: itemOptions.length === 0 },
                          ]}
                          onValueChange={(mode) =>
                            session.dispatch(
                              new UpdateEnemyCommand(enemy.id, {
                                steal:
                                  mode === 'none'
                                    ? undefined
                                    : mode === 'money'
                                      ? { itemId: '0', count: enemy.steal?.count ?? 1 }
                                      : {
                                          itemId: itemOptions[0]?.value ?? '',
                                          count: enemy.steal?.count ?? 1,
                                        },
                              }),
                            )
                          }
                        />
                      )}
                    </DsField>
                    {enemy.steal ? (
                      <div className="enemy-item-fields">
                        {stealMode === 'item' ? (
                          <DsField label="物品">
                            {({ id }) => (
                              <DsSelect
                                id={id}
                                value={enemy.steal?.itemId ?? ''}
                                options={itemOptions}
                                invalid={!items.some((item) => item.id === enemy.steal?.itemId)}
                                onValueChange={(itemId) =>
                                  session.dispatch(
                                    new UpdateEnemyCommand(enemy.id, {
                                      steal: { ...enemy.steal!, itemId },
                                    }),
                                  )
                                }
                              />
                            )}
                          </DsField>
                        ) : null}
                        <DsField label="数量">
                          {({ id }) => (
                            <DsDraftNumberInput
                              id={id}
                              name={`enemy.${enemy.id}.steal.count`}
                              min={1}
                              max={999}
                              monospace
                              draftKey={`enemy:${enemy.id}:steal.count`}
                              syncToken={session.getHistoryVersion()}
                              value={enemy.steal?.count ?? 1}
                              onWheel={(event) => event.currentTarget.blur()}
                              integer
                              normalize={(value) => integerInRange(value, 1, 999, 1)}
                              onCommit={(value) =>
                                session.dispatch(
                                  new UpdateEnemyCommand(enemy.id, {
                                    steal: {
                                      ...enemy.steal!,
                                      count: integerInRange(value ?? 1, 1, 999, 1),
                                    },
                                  }),
                                )
                              }
                            />
                          )}
                        </DsField>
                      </div>
                    ) : null}
                  </fieldset>
                  <fieldset className="enemy-item-group" data-enemy-item-group="attack-effect">
                    <legend>普攻附带物品效果</legend>
                    <p>普攻命中时按物品效果结算；触发率沿用原版 1–10 判定。</p>
                    <DsCheckbox
                      label="启用附带效果"
                      checked={!!enemy.attackEquivItem}
                      disabled={!enemy.attackEquivItem && itemOptions.length === 0}
                      title={itemOptions.length ? undefined : '项目中没有可选物品'}
                      onChange={(event) =>
                        session.dispatch(
                          new UpdateEnemyCommand(enemy.id, {
                            attackEquivItem: event.target.checked
                              ? { itemId: itemOptions[0]?.value ?? '', rate: 1 }
                              : undefined,
                          }),
                        )
                      }
                    />
                    {enemy.attackEquivItem ? (
                      <div className="enemy-item-fields">
                        <DsField label="物品效果">
                          {({ id }) => (
                            <DsSelect
                              id={id}
                              value={enemy.attackEquivItem?.itemId ?? ''}
                              options={itemOptions}
                              invalid={
                                !items.some((item) => item.id === enemy.attackEquivItem?.itemId)
                              }
                              onValueChange={(itemId) =>
                                session.dispatch(
                                  new UpdateEnemyCommand(enemy.id, {
                                    attackEquivItem: { ...enemy.attackEquivItem!, itemId },
                                  }),
                                )
                              }
                            />
                          )}
                        </DsField>
                        <DsField label="触发率（1–10）">
                          {({ id }) => (
                            <DsDraftNumberInput
                              id={id}
                              name={`enemy.${enemy.id}.attackEquivItem.rate`}
                              min={1}
                              max={10}
                              monospace
                              draftKey={`enemy:${enemy.id}:attackEquivItem.rate`}
                              syncToken={session.getHistoryVersion()}
                              value={enemy.attackEquivItem?.rate ?? 1}
                              onWheel={(event) => event.currentTarget.blur()}
                              integer
                              normalize={(value) => integerInRange(value, 1, 10, 1)}
                              onCommit={(value) =>
                                session.dispatch(
                                  new UpdateEnemyCommand(enemy.id, {
                                    attackEquivItem: {
                                      ...enemy.attackEquivItem!,
                                      rate: integerInRange(value ?? 1, 1, 10, 1),
                                    },
                                  }),
                                )
                              }
                            />
                          )}
                        </DsField>
                      </div>
                    ) : null}
                  </fieldset>
                </div>
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="战败奖励"
                description="经验、金钱和收妖值在“数值”面板配置；这里管理额外物品奖励。"
              >
                <DsCheckbox
                  label="战败后发放物品"
                  checked={!!defeatedReward}
                  disabled={!defeatedReward && itemOptions.length === 0}
                  title={itemOptions.length ? undefined : '项目中没有可选物品'}
                  onChange={(event) =>
                    setDefeatedReward(
                      event.target.checked
                        ? { itemId: itemOptions[0]?.value ?? '', count: 1, probability: 100 }
                        : undefined,
                    )
                  }
                />
                {defeatedReward ? (
                  <div className="enemy-reward-grid">
                    <DsField label="奖励物品">
                      {({ id }) => (
                        <DsSelect
                          id={id}
                          value={defeatedReward.itemId}
                          options={itemOptions}
                          invalid={!items.some((item) => item.id === defeatedReward.itemId)}
                          onValueChange={(itemId) =>
                            setDefeatedReward({ ...defeatedReward, itemId })
                          }
                        />
                      )}
                    </DsField>
                    <DsField label="数量">
                      {({ id }) => (
                        <DsDraftNumberInput
                          id={id}
                          name={`enemy.${enemy.id}.onDefeated.count`}
                          min={1}
                          max={999}
                          monospace
                          draftKey={`enemy:${enemy.id}:onDefeated.count`}
                          syncToken={session.getHistoryVersion()}
                          value={defeatedReward.count}
                          onWheel={(event) => event.currentTarget.blur()}
                          integer
                          normalize={(value) => integerInRange(value, 1, 999, 1)}
                          onCommit={(value) =>
                            setDefeatedReward({
                              ...defeatedReward,
                              count: integerInRange(value ?? 1, 1, 999, 1),
                            })
                          }
                        />
                      )}
                    </DsField>
                    <DsField
                      label="获得概率（%）"
                      help="100 表示必定获得；较低数值会保留原版的失败跳过逻辑。"
                    >
                      {({ id }) => (
                        <DsDraftNumberInput
                          id={id}
                          name={`enemy.${enemy.id}.onDefeated.probability`}
                          min={0}
                          max={100}
                          monospace
                          draftKey={`enemy:${enemy.id}:onDefeated.probability`}
                          syncToken={session.getHistoryVersion()}
                          value={defeatedReward.probability}
                          onWheel={(event) => event.currentTarget.blur()}
                          integer
                          normalize={(value) => integerInRange(value, 0, 100, 100)}
                          onCommit={(value) =>
                            setDefeatedReward({
                              ...defeatedReward,
                              probability: integerInRange(value ?? 100, 0, 100, 100),
                            })
                          }
                        />
                      )}
                    </DsField>
                  </div>
                ) : (
                  <p className="enemy-reward-empty">当前敌人没有额外物品奖励。</p>
                )}
                {preservedDefeatedCommandCount || enemy.choreography?.length ? (
                  <p className="enemy-preserved-note">
                    另有 {preservedDefeatedCommandCount} 条高级战败指令、
                    {enemy.choreography?.length ?? 0} 段战斗演出，编辑奖励时会原样保留。
                  </p>
                ) : null}
              </DsWorkbenchSection>
            </div>
          </>
        ) : (
          <div className="insp-empty ds-empty-state--roomy">无敌人;点 ＋ 新建。</div>
        )}
      </div>

      {/* 右:敌队 / 引用 / 说明 */}
      <div className="inspector inspector--tabbed">
        <div className="insp-head">
          <div className="what">敌人</div>
          <div className="who">{enemy ? nameOf(enemy) : '—'}</div>
        </div>
        <DsInspectorTabs
          id={`${fieldPrefix}-enemy-inspector`}
          label="敌人属性分区"
          activeId={inspectorTab}
          onChange={setInspectorTab}
          items={[
            {
              id: 'teams',
              label: '敌队',
              panel: (
                <DsInspectorSection title="所在敌队">
                  <p className="hint">敌队成员统一在“战斗 / 敌队”工作台编辑，避免两处阵容权威。</p>
                  {teamsOfSel.length === 0 ? <p className="hint">当前敌人不在任何敌队。</p> : null}
                  {teamsOfSel.map((candidate) => (
                    <div key={candidate.id} className="et-team-row">
                      <DsButton
                        size="compact"
                        variant="secondary"
                        icon="open"
                        onClick={() => onOpenEnemyTeam?.(candidate.id)}
                      >
                        {candidate.id}
                      </DsButton>
                      <span className="hint2">{candidate.slots.filter(Boolean).length} 名成员</span>
                    </div>
                  ))}
                </DsInspectorSection>
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <DsInspectorSection
                  title="引用"
                  description="敌队槽位、其他敌人的变身或召唤目标都会阻断删除。"
                >
                  <DsReferencePanel
                    state={references.length ? 'ready' : 'empty'}
                    count={{ kind: 'exact', value: references.length }}
                    impact={{
                      kind: 'blocking',
                      description: references.length
                        ? '解除敌队槽位、变身或召唤目标中的引用后才能删除。'
                        : '当前敌人可以安全删除。',
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
                <DsInspectorSection title="从头造新敌人">
                  <p className="hint">
                    ＋ 新建 → 改名/数值 → 配 AI 规则(变身/施法/集火都在下拉里)→ 建敌队 → **💾 保存**
                    → ⚔ 试打(试打读磁盘项目;需 reforge dev:pal 在跑,见 docs/dev-servers.md)。
                  </p>
                </DsInspectorSection>
              ),
            },
          ]}
        />
      </div>
    </>
  )
}
