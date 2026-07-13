// 战斗只读快照(从 dev-panel.ts 抽出的纯函数)。**无 DEV 门**——dev-panel 与生产工具面板共用。
//   dev-panel 用详细 entries/statusEntries(中英 + 回合 + 来源);工具面板用结构化 statuses(纯中文名 + 类型)。
import type { Enemy, Item, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import type { BattleEnemy, BattlePlayer, BattleStatus } from '../battle/battle-state.js'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
} from '../equip-effect.js'
import type { AllExperience, GameState } from '../game-state.js'

type DevStatusKey = keyof BattleStatus

/** 结构化状态标签(工具面板渲染:纯中文名 + 类型上色)。 */
export interface StatusTag {
  name: string
  kind: 'debuff' | 'buff' | 'poison'
  /** buff/debuff 剩余回合数(工具面板 chip 显示;>999 = 装备/永久)。毒无回合 → 省略。 */
  rounds?: number
}

interface DevStatusDef {
  key: DevStatusKey
  /** dev-panel 详细串用(中/英)。 */
  label: string
  /** 工具面板纯中文名。 */
  cn: string
  kind: 'debuff' | 'buff'
  persistentIndex?: number
}

const PARTY_STATUS_DEFS: readonly DevStatusDef[] = [
  { key: 'confused', label: '乱/confused', cn: '乱', kind: 'debuff', persistentIndex: 0 },
  { key: 'paralyzed', label: '定/paralyzed', cn: '定', kind: 'debuff', persistentIndex: 1 },
  { key: 'sleep', label: '眠/sleep', cn: '眠', kind: 'debuff', persistentIndex: 2 },
  { key: 'silence', label: '封/silence', cn: '封', kind: 'debuff', persistentIndex: 3 },
  { key: 'puppet', label: '傀儡/puppet', cn: '傀儡', kind: 'debuff', persistentIndex: 4 },
  { key: 'bravery', label: '勇/bravery', cn: '勇', kind: 'buff', persistentIndex: 5 },
  { key: 'protect', label: '护/protect', cn: '护', kind: 'buff', persistentIndex: 6 },
  { key: 'haste', label: '速/haste', cn: '速', kind: 'buff', persistentIndex: 7 },
  { key: 'dualAttack', label: '双攻/dual', cn: '双攻', kind: 'buff', persistentIndex: 8 },
  { key: 'slow', label: '迟/slow', cn: '迟', kind: 'debuff' },
]

/** 五属性隐藏经验池(E04 子系统:武术/灵力/防御/身法/吉运 各自暗经验)→ AllExperience key。体力/真气(HP/MP)不算「属性」故不列。 */
const PARTY_HIDDEN_EXP_DEFS: readonly { label: string; key: keyof AllExperience }[] = [
  { label: '武术', key: 'rgAttackExp' },
  { label: '灵力', key: 'rgMagicPowerExp' },
  { label: '防御', key: 'rgDefenseExp' },
  { label: '身法', key: 'rgDexterityExp' },
  { label: '吉运', key: 'rgFleeExp' },
]

export interface PartyStatusReadout {
  slot: number
  roleId: number
  roleName: string
  source: 'battle' | 'persistent'
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  /** 有效属性(含装备加成,= 游戏内状态框 getPlayerXxx,uigame.c:1231-1240):武术/灵力/防御/身法/吉运。 */
  attack: number
  magicPower: number
  defense: number
  dexterity: number
  fleeRate: number
  /** 经验:当前累积 / 升至下一级所需(= levelUpExp[level]);无表 → nextExp 0。 */
  curExp: number
  nextExp: number
  /**
   * 五属性隐藏经验(E04:武术/灵力/防御/身法/吉运 各自暗经验池)。
   * cur = 累积 wExp;next = 升该属性所需阈值(= levelUpExp[该池 wLevel],无表→0);
   * gained = 本场战斗已累积 wCount(战后 CHECK_HIDDEN_EXP 结算转 wExp,战中实时变)。
   */
  hiddenExp: { label: string; cur: number; next: number; gained: number }[]
  /** 5 元素 + 毒抗(label:value),元素顺序 风/雷/水/火/土。 */
  resistances: { label: string; value: number }[]
  /** 工具面板用:结构化状态(纯中文名 + 类型)。 */
  statuses: StatusTag[]
  /** dev-panel 用:异常/buff/毒 详细人读串(中英 + 回合 + 来源)。 */
  entries: string[]
}

function statusRoundsText(rounds: number): string {
  return rounds > 999 ? `${rounds}(装备/永久)` : `${rounds}回合`
}

function battleStatusValue(player: BattlePlayer | undefined, key: DevStatusKey): number {
  return player?.status[key] ?? 0
}

function persistentStatusValue(gs: GameState, roleId: number, def: DevStatusDef): number {
  if (def.persistentIndex === undefined) return 0
  return gs.rgPlayerStatus[roleId]?.[def.persistentIndex] ?? 0
}

function collectPoisonStatusEntries(
  gs: GameState,
  roleId: number,
  objectPoisons: readonly ObjectPoisonView[],
  items: readonly Item[],
): string[] {
  const poisonsById = new Map(objectPoisons.map((p) => [p.id, p]))
  const itemNamesById = new Map(items.map((item) => [item.id, item._name ?? '']))
  const entries: string[] = []
  for (let slot = 0; slot < 16; slot++) {
    const ps = gs.rgPoisonStatus[`${slot}_${roleId}`]
    if (!ps || ps.wPoisonID === 0) continue
    const poison = poisonsById.get(ps.wPoisonID)
    const name = itemNamesById.get(ps.wPoisonID)
    const label = name ? `${name}#${ps.wPoisonID}` : `#${ps.wPoisonID}`
    const level = poison ? ` L${poison.level}` : ''
    const script = ps.wPoisonScript ? ` script:${ps.wPoisonScript}` : ''
    entries.push(`毒槽${slot}:${label}${level}${script}`)
  }
  return entries
}

/** 工具面板用:中毒结构化标签(只毒名)。 */
function collectPoisonTags(gs: GameState, roleId: number, items: readonly Item[]): StatusTag[] {
  const itemNamesById = new Map(items.map((item) => [item.id, item._name ?? '']))
  const tags: StatusTag[] = []
  for (let slot = 0; slot < 16; slot++) {
    const ps = gs.rgPoisonStatus[`${slot}_${roleId}`]
    if (!ps || ps.wPoisonID === 0) continue
    tags.push({ name: itemNamesById.get(ps.wPoisonID) || `毒#${ps.wPoisonID}`, kind: 'poison' })
  }
  return tags
}

export function collectPartyStatusReadouts(
  gs: GameState,
  playerRoles: PlayerRoles,
  objectPoisons: readonly ObjectPoisonView[] = [],
  items: readonly Item[] = [],
  levelUpExp: readonly number[] = [],
): PartyStatusReadout[] {
  return gs.partyMembers.map((partyRoleId, slot) => {
    const battlePlayer = gs.mode === 'battle' ? gs.battleState?.players[slot] : undefined
    const roleId = battlePlayer?.roleId ?? partyRoleId
    const role = playerRoles.roles.find((r) => r.id === roleId)
    const source: PartyStatusReadout['source'] = battlePlayer ? 'battle' : 'persistent'
    const entries: string[] = []
    const statuses: StatusTag[] = []
    for (const def of PARTY_STATUS_DEFS) {
      const rounds =
        source === 'battle'
          ? battleStatusValue(battlePlayer, def.key)
          : persistentStatusValue(gs, roleId, def)
      if (rounds > 0) {
        entries.push(`${def.label} ${statusRoundsText(rounds)}`)
        statuses.push({ name: def.cn, kind: def.kind, rounds })
      }
    }
    entries.push(...collectPoisonStatusEntries(gs, roleId, objectPoisons, items))
    statuses.push(...collectPoisonTags(gs, roleId, items))
    const rt = gs.PlayerRolesRuntime
    const level = rt.rgwLevel[roleId] ?? 0
    return {
      slot,
      roleId,
      roleName: role?._name ?? `role${roleId}`,
      source,
      level,
      hp: rt.rgwHP[roleId] ?? 0,
      maxHp: rt.rgwMaxHP[roleId] ?? 0,
      mp: rt.rgwMP[roleId] ?? 0,
      maxMp: rt.rgwMaxMP[roleId] ?? 0,
      attack: getPlayerAttackStrength(gs, roleId),
      magicPower: getPlayerMagicStrength(gs, roleId),
      defense: getPlayerDefense(gs, roleId),
      dexterity: getPlayerDexterity(gs, roleId),
      fleeRate: getPlayerFleeRate(gs, roleId),
      curExp: gs.Exp.rgPrimaryExp[roleId]?.wExp ?? 0,
      nextExp: levelUpExp[level] ?? 0,
      hiddenExp: PARTY_HIDDEN_EXP_DEFS.map((d) => {
        const entry = gs.Exp[d.key]?.[roleId]
        return {
          label: d.label,
          cur: entry?.wExp ?? 0,
          next: levelUpExp[entry?.wLevel ?? level] ?? 0,
          gained: entry?.wCount ?? 0,
        }
      }),
      resistances: [
        { label: '风', value: rt.rgwElementalResistance[0]?.[roleId] ?? 0 },
        { label: '雷', value: rt.rgwElementalResistance[1]?.[roleId] ?? 0 },
        { label: '水', value: rt.rgwElementalResistance[2]?.[roleId] ?? 0 },
        { label: '火', value: rt.rgwElementalResistance[3]?.[roleId] ?? 0 },
        { label: '土', value: rt.rgwElementalResistance[4]?.[roleId] ?? 0 },
        { label: '毒', value: rt.rgwPoisonResistance[roleId] ?? 0 },
      ],
      statuses,
      entries,
    }
  })
}

/** 敌方每个单位的状态读出。纯函数,战斗中读 battleState.enemies。 */
export interface EnemyStatusReadout {
  /** battleState.enemies 下标。 */
  slot: number
  /** enemies.json id(e.id)。 */
  enemyId: number
  name: string
  /** 当前血量(战斗中被改的 e.health)。 */
  hp: number
  /** 满血(maxHealth ?? prevHp ?? e.health)。 */
  maxHp: number
  /** PostActionCheck 判死的运行时空槽标记。 */
  defeated: boolean
  /** 各项属性(label:value)。 */
  stats: { label: string; value: number }[]
  /** 各项抗性(5 元素 + 物理 + 毒 + 巫抗,label:value)。 */
  resistances: { label: string; value: number }[]
  /** 工具面板用:结构化状态(纯中文名 + 类型)。 */
  statuses: StatusTag[]
  /** dev-panel 用:异常/buff/毒 详细串。 */
  statusEntries: string[]
  /**
   * 偷取信息(sdlpal fight.c:5253 PAL_BattleStealFromEnemy):
   *   nStealItem(=stealItemCount)<=0 → 不可偷;wStealItem(=stealItem)==0 → 偷金钱(每次 count/RandomLong(2,3));
   *   否则 → 偷物品 wStealItem(每次 1 个,共 count 个)。
   */
  canSteal: boolean
  steal: string
  /**
   * 灵葫值(`Enemy.collectValue`,sdlpal `e.wCollectValue`):灵葫咒收掉此敌时并入全局灵葫值供紫金葫芦炼丹。
   * **灵葫值 = 0 → 灵葫咒永远收不掉**(残血也不行),所以面板显出来帮玩家判断灵葫咒可不可用。
   */
  collectValue: number
  /**
   * 普攻附带等价道具(sdlpal fight.c:5139 wAttackEquivItem):敌普攻命中我方后按 `rate/10` 概率跑该道具
   * scriptOnUse(PAL 全 29 个为 0x29 单体毒)。`道具名#id（率 N/10）`;attackEquivItem 或 rate 任一为 0 → null(不显示)。
   */
  attackEquivPoison: string | null
}

/** 当前战场场地读出。纯函数,战斗中读 battleState.field。 */
export interface FieldInfoReadout {
  fieldId: number
  isBoss: boolean
  /** 屏幕波纹强度(BattleField.screenWave)。 */
  screenWave: number
  /** 5 元素场效(BattleField.magicEffect,signed:正=该元素法术在本场地增伤)。 */
  elements: { label: string; value: number }[]
}

/** 敌人属性行定义(get 闭包避开 `keyof Enemy` 取到非数值字段的类型噪声)。 */
const ENEMY_STAT_DEFS: readonly { label: string; get: (e: Enemy) => number }[] = [
  { label: '等级', get: (e) => e.level },
  { label: '攻', get: (e) => e.attackStrength },
  { label: '灵', get: (e) => e.magicStrength },
  { label: '防', get: (e) => e.defense },
  { label: '身法', get: (e) => e.dexterity },
  { label: '逃', get: (e) => e.fleeRate },
  { label: '法术id', get: (e) => e.magic },
  { label: '施法率', get: (e) => e.magicRate },
  { label: '连击', get: (e) => e.dualMove },
  { label: '经验', get: (e) => e.exp },
  { label: '金钱', get: (e) => e.cash },
]

/** 敌人抗性行定义(5 元素 + 物理 + 毒;巫抗在 BattleEnemy 层另加)。 */
const ENEMY_RESIST_DEFS: readonly { label: string; get: (e: Enemy) => number }[] = [
  { label: '风', get: (e) => e.elemResistance.wind },
  { label: '雷', get: (e) => e.elemResistance.thunder },
  { label: '水', get: (e) => e.elemResistance.water },
  { label: '火', get: (e) => e.elemResistance.fire },
  { label: '土', get: (e) => e.elemResistance.earth },
  { label: '物理', get: (e) => e.physicalResistance },
  { label: '毒', get: (e) => e.poisonResistance },
]

/** 敌方中毒条 → dev 详细串。 */
function collectEnemyPoisonEntries(
  poisons: readonly { poisonId: number; scriptEntry: number }[],
  objectPoisons: readonly ObjectPoisonView[],
  items: readonly Item[],
): string[] {
  const poisonsById = new Map(objectPoisons.map((p) => [p.id, p]))
  const itemNamesById = new Map(items.map((item) => [item.id, item._name ?? '']))
  const entries: string[] = []
  for (const p of poisons) {
    if (p.poisonId === 0) continue
    const name = itemNamesById.get(p.poisonId)
    const label = name ? `${name}#${p.poisonId}` : `#${p.poisonId}`
    const poison = poisonsById.get(p.poisonId)
    const level = poison ? ` L${poison.level}` : ''
    const script = p.scriptEntry ? ` script:${p.scriptEntry}` : ''
    entries.push(`毒:${label}${level}${script}`)
  }
  return entries
}

/** 敌方中毒 → 工具面板结构化标签(只毒名)。 */
function collectEnemyPoisonTags(
  poisons: readonly { poisonId: number; scriptEntry: number }[],
  items: readonly Item[],
): StatusTag[] {
  const itemNamesById = new Map(items.map((item) => [item.id, item._name ?? '']))
  const tags: StatusTag[] = []
  for (const p of poisons) {
    if (p.poisonId === 0) continue
    tags.push({ name: itemNamesById.get(p.poisonId) || `毒#${p.poisonId}`, kind: 'poison' })
  }
  return tags
}

/**
 * 敌方每个单位的状态读出:血量 / 属性 / 5 元素+物理+毒+巫抗 / 状态 + 中毒 / 偷取。
 * 非战斗(gs.mode!=='battle' 或无 battleState)→ 空数组。
 */
export function collectEnemyStatusReadouts(
  gs: GameState,
  objectPoisons: readonly ObjectPoisonView[] = [],
  items: readonly Item[] = [],
): EnemyStatusReadout[] {
  if (gs.mode !== 'battle' || !gs.battleState) return []
  const itemNameById = new Map(items.map((it) => [it.id, it._name ?? '']))
  return gs.battleState.enemies.map((be: BattleEnemy, slot) => {
    const e = be.e
    const statusEntries: string[] = []
    const statuses: StatusTag[] = []
    for (const def of PARTY_STATUS_DEFS) {
      const rounds = be.status[def.key] ?? 0
      if (rounds > 0) {
        statusEntries.push(`${def.label} ${statusRoundsText(rounds)}`)
        statuses.push({ name: def.cn, kind: def.kind, rounds })
      }
    }
    statusEntries.push(...collectEnemyPoisonEntries(be.poisons ?? [], objectPoisons, items))
    statuses.push(...collectEnemyPoisonTags(be.poisons ?? [], items))
    // 偷取(sdlpal fight.c:5253):count<=0 不可偷;stealItem==0 偷金钱(每次 count/2~3);否则偷物品 #stealItem(每次1)。
    const stealId = e.stealItem ?? 0
    const stealCount = e.stealItemCount ?? 0
    const canSteal = stealCount > 0
    let steal: string
    if (!canSteal) steal = '不可偷'
    else if (stealId === 0) steal = `金钱 ×${stealCount}`
    else {
      const nm = itemNameById.get(stealId)
      steal = `${nm || `物品#${stealId}`} ×${stealCount}`
    }
    // 普攻附带等价道具(见 EnemyStatusReadout.attackEquivPoison):equivId+rate 任一为 0 = 无效果 → null(不显示)。
    const equivId = e.attackEquivItem ?? 0
    const equivRate = e.attackEquivItemRate ?? 0
    let attackEquivPoison: string | null = null
    if (equivId > 0 && equivRate > 0) {
      const nm = itemNameById.get(equivId)
      attackEquivPoison = `${nm ? `${nm}#${equivId}` : `物品#${equivId}`}（率 ${equivRate}/10）`
    }
    return {
      slot,
      enemyId: e.id,
      name: e._name ?? `enemy${e.id}`,
      hp: e.health,
      maxHp: be.maxHealth ?? be.prevHp ?? e.health,
      defeated: be.defeated === true,
      stats: ENEMY_STAT_DEFS.map((d) => ({ label: d.label, value: d.get(e) })),
      resistances: [
        ...ENEMY_RESIST_DEFS.map((d) => ({ label: d.label, value: d.get(e) })),
        { label: '巫抗', value: be.resistanceToSorcery ?? 0 },
      ],
      statuses,
      statusEntries,
      canSteal,
      steal,
      collectValue: e.collectValue ?? 0,
      attackEquivPoison,
    }
  })
}

/**
 * 当前战场场地信息:屏幕波纹 + 5 元素场效(signed)。
 * 非战斗 → null。元素顺序同 Enemy.elemResistance(风/雷/水/火/土)。
 */
export function collectFieldInfoReadout(gs: GameState): FieldInfoReadout | null {
  if (gs.mode !== 'battle' || !gs.battleState) return null
  const f = gs.battleState.field
  return {
    fieldId: f.id,
    isBoss: gs.battleState.isBoss === true,
    screenWave: f.screenWave,
    elements: [
      { label: '风', value: f.magicEffect.wind },
      { label: '雷', value: f.magicEffect.thunder },
      { label: '水', value: f.magicEffect.water },
      { label: '火', value: f.magicEffect.fire },
      { label: '土', value: f.magicEffect.earth },
    ],
  }
}
