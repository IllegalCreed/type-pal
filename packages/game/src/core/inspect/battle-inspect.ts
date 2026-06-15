// 战斗只读快照(从 dev-panel.ts 抽出的纯函数)。**无 DEV 门**——dev-panel 与生产工具面板共用。
// 函数体与原 dev-panel 实现一字不改,仅换文件 + 调整 import 相对路径。signedText(场效 +号 渲染辅助)
// 仅 dev-panel 渲染用,不属本簇,留在 dev-panel。
import type { Enemy, Item, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import type { BattleEnemy, BattlePlayer, BattleStatus } from '../battle/battle-state.js'
import type { GameState } from '../game-state.js'

type DevStatusKey = keyof BattleStatus

interface DevStatusDef {
  key: DevStatusKey
  label: string
  persistentIndex?: number
}

const PARTY_STATUS_DEFS: readonly DevStatusDef[] = [
  { key: 'confused', label: '乱/confused', persistentIndex: 0 },
  { key: 'paralyzed', label: '定/paralyzed', persistentIndex: 1 },
  { key: 'sleep', label: '眠/sleep', persistentIndex: 2 },
  { key: 'silence', label: '封/silence', persistentIndex: 3 },
  { key: 'puppet', label: '傀儡/puppet', persistentIndex: 4 },
  { key: 'bravery', label: '勇/bravery', persistentIndex: 5 },
  { key: 'protect', label: '护/protect', persistentIndex: 6 },
  { key: 'haste', label: '速/haste', persistentIndex: 7 },
  { key: 'dualAttack', label: '双攻/dual', persistentIndex: 8 },
  { key: 'slow', label: '迟/slow' },
]

export interface PartyStatusReadout {
  slot: number
  roleId: number
  roleName: string
  source: 'battle' | 'persistent'
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

export function collectPartyStatusReadouts(
  gs: GameState,
  playerRoles: PlayerRoles,
  objectPoisons: readonly ObjectPoisonView[] = [],
  items: readonly Item[] = [],
): PartyStatusReadout[] {
  return gs.partyMembers.map((partyRoleId, slot) => {
    const battlePlayer = gs.mode === 'battle' ? gs.battleState?.players[slot] : undefined
    const roleId = battlePlayer?.roleId ?? partyRoleId
    const role = playerRoles.roles.find((r) => r.id === roleId)
    const source: PartyStatusReadout['source'] = battlePlayer ? 'battle' : 'persistent'
    const entries: string[] = []
    for (const def of PARTY_STATUS_DEFS) {
      const rounds = source === 'battle'
        ? battleStatusValue(battlePlayer, def.key)
        : persistentStatusValue(gs, roleId, def)
      if (rounds > 0) entries.push(`${def.label} ${statusRoundsText(rounds)}`)
    }
    entries.push(...collectPoisonStatusEntries(gs, roleId, objectPoisons, items))
    return {
      slot,
      roleId,
      roleName: role?._name ?? `role${roleId}`,
      source,
      entries,
    }
  })
}

/** 敌方每个单位的状态读出(devpanel 队伍 tab「敌方状态」)。纯函数,战斗中读 battleState.enemies。 */
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
  /** 异常/buff 剩余回合 + 中毒条。 */
  statusEntries: string[]
  /**
   * 偷取信息(sdlpal fight.c:5253 PAL_BattleStealFromEnemy):
   *   nStealItem(=stealItemCount)<=0 → 不可偷;wStealItem(=stealItem)==0 → 偷金钱(每次 count/RandomLong(2,3));
   *   否则 → 偷物品 wStealItem(每次 1 个,共 count 个)。
   * `canSteal` = stealItemCount>0;`steal` = 人读串。
   */
  canSteal: boolean
  steal: string
}

/** 当前战场场地读出(devpanel 队伍 tab「场地信息」)。纯函数,战斗中读 battleState.field。 */
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

/** 敌方中毒条 → 人读行(名字/等级复用 party 同款 objectPoisons/items 反查)。 */
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

/**
 * 敌方每个单位的状态读出(devpanel「敌方状态」):血量 / 各项属性 / 5 元素+物理+毒+巫抗 / 异常 buff + 中毒。
 * 非战斗(gs.mode!=='battle' 或无 battleState)→ 空数组。状态计数复用 PARTY_STATUS_DEFS + statusRoundsText。
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
    for (const def of PARTY_STATUS_DEFS) {
      const rounds = be.status[def.key] ?? 0
      if (rounds > 0) statusEntries.push(`${def.label} ${statusRoundsText(rounds)}`)
    }
    statusEntries.push(...collectEnemyPoisonEntries(be.poisons ?? [], objectPoisons, items))
    // 偷取(sdlpal fight.c:5253):count<=0 不可偷;stealItem==0 偷金钱(每次 count/2~3);否则偷物品 #stealItem(每次1)。
    const stealId = e.stealItem ?? 0
    const stealCount = e.stealItemCount ?? 0
    const canSteal = stealCount > 0
    let steal: string
    if (!canSteal) steal = '不可偷'
    else if (stealId === 0) steal = `金钱 ≤${stealCount}(每次 ~${stealCount}/2-3)`
    else {
      const nm = itemNameById.get(stealId)
      steal = `${nm ? `${nm}#${stealId}` : `物品#${stealId}`} ×${stealCount}`
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
      statusEntries,
      canSteal,
      steal,
    }
  })
}

/**
 * 当前战场场地信息(devpanel「场地信息」):屏幕波纹 + 5 元素场效(signed)。
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
