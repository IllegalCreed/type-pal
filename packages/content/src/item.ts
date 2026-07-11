// 物品 / 装备数据 ① 层。见 docs/phase2/foundation/item-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。
import type { ElementVec } from './battle-formulas.js'
import type { CharacterInstance, WorldState } from './character.js'
import { applyPoisonSelf, poisonCurableBy } from './poison.js'
import type { StatusId } from './skill.js'

/** 战斗属性(对齐 CharacterInstance 的 5 项)。 */
export type CombatStat = 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'

/** 6 装备槽(对齐原版 body part;名按"装什么"取,见 design §4)。 */
export const EQUIP_SLOT_IDS = ['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'] as const
export type EquipSlot = (typeof EQUIP_SLOT_IDS)[number]

/** 装备效果 = clean-rewrite scriptOnEquip 的 opcode(0x17/0x1A/0x2D);复用技能地基 StatusId/skillId。 */
export type EquipEffect =
  | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10)
  | {
      kind: 'resistance'
      element: 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'
      percent: number
    } // 0x17[22-27]
  | { kind: 'maxPool'; pool: 'hp' | 'mp'; delta: number } // 0x1A
  | { kind: 'grantStatus'; status: StatusId } // 0x2D 永久(仙女剑→连击)
  | { kind: 'grantSkill'; skillId: string } // 0x1A row65 授合击/召唤(土灵珠→山神 336)
  | { kind: 'attackAll' } // 0x1A(长鞭)
  // 战斗内每回合回血/回蓝(寿葫芦等;原版借 level99「伪毒」实现,clean 版正名为独立词条 ——
  // 不复用毒系统这个省空间拖鞋)。
  | { kind: 'regenHp'; amount: number }
  | { kind: 'regenMp'; amount: number }

export interface EquipSpec {
  slot: EquipSlot
  equipableBy: string[] // 角色模板 id(原 equipableBy[6] bitfield → 稳定 id);demo 仅 li-xiaoyao
  effects: EquipEffect[]
}

/** 装备效果 → 人读效果文案(唯一出处)。**说明 desc 只写风味,数值一律派生自此**——
 *  编辑器只读预览 + 运行时详情框/装备菜单都调它,彻底杜绝「说明写 +14、实际 delta 不一定」的脱节。 */
export interface EquipDescribeCtx {
  skillName?: (skillId: string) => string | undefined // grantSkill 授技能:id→名,缺省回退 id
}
const STAT_LABEL: Record<CombatStat, string> = {
  attack: '武术',
  magicAttack: '灵力',
  defense: '防御',
  speed: '身法',
  luck: '吉运',
}
const EQUIP_ELEM_LABEL: Record<'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth', string> =
  { poison: '毒', wind: '风', thunder: '雷', water: '水', fire: '火', earth: '土' }
const EQUIP_STATUS_LABEL: Record<StatusId, string> = {
  confused: '混乱',
  paralyzed: '定身',
  sleep: '睡眠',
  silence: '沉默',
  puppet: '傀儡',
  bravery: '神勇',
  protect: '护体',
  haste: '加速',
  dualAttack: '连击',
}
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

/** 派生装备效果行(风味 desc 之外的机制文案)。数值(属性+上限+抗性)并成一行、全角空格分隔
 *  (照原版 desc 密度,省详情框空间);攻击全体/常驻状态/授技能/回合回复各占一行。空数组→ []。 */
export function describeEquipEffects(
  effects: readonly EquipEffect[],
  ctx?: EquipDescribeCtx,
): string[] {
  const numericPieces: string[] = [] // 武术+20 身法+20 体力上限+50 避火率+30%(全并一行)
  const extraLines: string[] = [] // 攻击全体 / 常驻·连击 / 习得·山神 / 每回合回体力+20
  for (const e of effects) {
    switch (e.kind) {
      case 'statBonus':
        numericPieces.push(`${STAT_LABEL[e.stat]}${signed(e.delta)}`)
        break
      case 'maxPool':
        numericPieces.push(`${e.pool === 'hp' ? '体力' : '真气'}上限${signed(e.delta)}`)
        break
      case 'resistance':
        numericPieces.push(`避${EQUIP_ELEM_LABEL[e.element]}率${signed(e.percent)}%`) // 照原版灵珠措辞「避X率」
        break
      case 'attackAll':
        extraLines.push('攻击全体')
        break
      case 'grantStatus':
        extraLines.push(`常驻·${EQUIP_STATUS_LABEL[e.status]}`)
        break
      case 'grantSkill':
        extraLines.push(`习得·${ctx?.skillName?.(e.skillId) ?? e.skillId}`)
        break
      case 'regenHp':
        extraLines.push(`每回合回体力${signed(e.amount)}`)
        break
      case 'regenMp':
        extraLines.push(`每回合回真气${signed(e.amount)}`)
        break
    }
  }
  const out: string[] = []
  if (numericPieces.length) out.push(numericPieces.join('　'))
  out.push(...extraLines)
  return out
}

/** 使用效果 = 独立联合(≠ SkillEffect):回复类概念重叠 + 脚本/剧情/场景类。本期起步几个 kind,做使用菜单时扩充。 */
export type ItemUseEffect =
  | { kind: 'healHp'; amount: number }
  | { kind: 'healMp'; amount: number }
  | { kind: 'revive'; hpPercent: number } // 0x22(还魂香/赎魂灯;同技能 revive)
  | { kind: 'applyStatus'; status: StatusId; turns: number }
  | { kind: 'removeStatus'; statuses: StatusId[] } // 0x2F(灵心符/银针)
  | { kind: 'applyPoison'; poisonId: string } // 0x29(尸腐肉/毒蛇卵——下毒食物)
  | { kind: 'curePoison'; curesTier?: import('./poison.js').PoisonCurability; poisonId?: string } // 0x2B/0x2C(糯米/雄黄/九节菖蒲)
  | { kind: 'permanentStatBoost'; stat: CombatStat | 'maxHP' | 'maxMP'; delta: number } // 0x19(舍利子/雪蛤蟆——永久成长)
  | { kind: 'gate'; chance?: number } // 0x6 概率门(盐巴 50% 解毒);失败截断其后
  | { kind: 'dieIfNotPoisoned' } // 0x61(毒龙胆/九阴散):没中毒则秒杀自己,否则续跑后效(解毒/回血)
  | { kind: 'triggerScript'; scriptId: string } // 桂花酒/玉佩剧情;风灵珠场景互动
  | { kind: 'teleportOut' } // 0x38(引路蜂/土灵珠):跑当前场景 onTeleport 出口(无出口=不灵)
  | { kind: 'extraPoisonRes'; amount: number } // 0x17(大蒜):临时毒抗 Extra,带入战斗、三件套清
  // 0x5C(隐蛊):全队隐身 turns 回合 —— 敌整轮跳过(连 turnStart choreo 都不跑)、队员画面消失。
  // CLASSIC 语义(一阶段 iHidingTime 三函数):存负值待激活 → 行动步前取反激活 → 轮末 −1
  | { kind: 'hideParty'; turns: number }
// 待扩充(B2 剧情脚本落地后):giveItems / giveMoney / learnSkill / scenePlace / transform …

export interface UseSpec {
  target?: 'oneAlly' | 'allAllies' | 'self' | 'scene'
  consuming: boolean
  effects: ItemUseEffect[]
  /** 战斗专用(原版 wFlags 只带 UsableInBattle,如隐蛊):大世界使用菜单不列。缺省 = 两边可用。 */
  battleOnly?: boolean
}

/** 战斗投掷,phase3 细化。 */
export interface ThrowSpec {
  effects: ItemUseEffect[] // 占位:投掷效果届时可能独立联合
}

/** 物品基类。能力块(equip/use/throw)可叠加;菜单按能力块过滤(灵珠双重身份零特判)。 */
export interface ItemData {
  id: string // demo = 原版 oid 字符串;当不透明 string
  name: string
  desc: string[] // 物品说明(原版 scriptDesc 多行:风味行 + 效果行),逐行渲染
  icon: number // 图标 bitmap(BALL.MKF chunk)
  buyPrice: number
  sellPrice: number
  sellable: boolean
  equip?: EquipSpec
  use?: UseSpec
  throw?: ThrowSpec
}

/** 物品数据表(id → ItemData)。去全局化:操作物品的函数收这个类型(显式注入),不再默认吃 DEMO_ITEMS。 */
export type ItemDataMap = Record<string, ItemData>

/** 有效属性 = 角色 base + Σ 已穿戴装备的 statBonus(该 stat)。纯函数,镜像 phase-1 equip-effect。
 *  resist/grant/maxPool/attackAll 的运行时计算 = phase3 引擎,本函数只算 statBonus。 */
export function effectiveStat(
  char: CharacterInstance,
  stat: CombatStat,
  items: Record<string, ItemData>,
): number {
  const base: Record<CombatStat, number> = {
    attack: char.attack,
    magicAttack: char.magicAttack,
    defense: char.defense,
    speed: char.speed,
    luck: char.luck,
  }
  let v = base[stat]
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'statBonus' && eff.stat === stat) v += eff.delta
    }
  }
  return v
}

/**
 * 有效抗性 = Σ 已穿戴装备的 resistance(五灵 + 毒),上限 100(fight.c poisonRes/elemRes 累加封顶)。
 * **live 派生(红线):每次 battle 建态时读装备算,严禁 equip 时烙进可变槽**——卸装即失效,
 * 原版 RemoveEquipmentEffect 语义天然满足。玩家侧喂 calcMagicDamage.elemRes/poisonRes。
 */
export function effectiveResistances(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): { elemRes: ElementVec; poisonRes: number } {
  const elem = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }
  let poison = 0
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind !== 'resistance') continue
      if (eff.element === 'poison') poison += eff.percent
      else elem[eff.element] += eff.percent
    }
  }
  return {
    elemRes: {
      wind: Math.min(100, elem.wind),
      thunder: Math.min(100, elem.thunder),
      water: Math.min(100, elem.water),
      fire: Math.min(100, elem.fire),
      earth: Math.min(100, elem.earth),
    },
    poisonRes: Math.min(100, poison),
  }
}

/**
 * 有效技能 = 已学技能 ∪ 装备授予技能(grantSkill;土灵珠授山神、圣灵珠授术)。
 * **live 派生(红线):learnedSkills ∪ 装备授予集,严禁 equip 时烙进 learnedSkills 可变槽**
 * —— 卸装即失效(原版 UpdateEquipments memset 重跑 scriptOnEquip 语义)。去重保序(学的在前)。
 */
export function effectiveSkills(
  learned: readonly string[],
  char: CharacterInstance,
  items: Record<string, ItemData>,
): string[] {
  const out = [...learned]
  const seen = new Set(learned)
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'grantSkill' && !seen.has(eff.skillId)) {
        seen.add(eff.skillId)
        out.push(eff.skillId)
      }
    }
  }
  return out
}

/**
 * 装备授予的常驻状态(grantStatus;仙女剑→连击 dualAttack)。返回 StatusId 列表。
 * **live 派生(红线):建态时读装备,严禁 equip 时烙进 status 可变槽**——卸装即失效。
 */
export function effectiveGrantedStatuses(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): StatusId[] {
  const out: StatusId[] = []
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'grantStatus' && !out.includes(eff.status)) out.push(eff.status)
    }
  }
  return out
}

/** 该角色装备是否授予「攻击全体」(长鞭 attackAll;live 派生红线同上)。 */
export function equipGrantsAttackAll(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): boolean {
  for (const itemId of Object.values(char.equipment))
    for (const eff of items[itemId]?.equip?.effects ?? []) if (eff.kind === 'attackAll') return true
  return false
}

/**
 * 战斗内每回合回血/回蓝(寿葫芦等 regenHp/regenMp 词条累加)。**live 派生(红线):建态读装备,
 * 卸对应部位即失效**(替代原版 level99「伪毒」的省空间拖鞋 —— clean 版正名为独立词条)。
 */
export function effectiveRegen(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): { hp: number; mp: number } {
  let hp = 0
  let mp = 0
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'regenHp') hp += eff.amount
      else if (eff.kind === 'regenMp') mp += eff.amount
    }
  }
  return { hp, mp }
}

/** 背包里该角色可装的物品(equip 能力 + equipableBy 含其模板)。 */
export function equippableItems(
  world: WorldState,
  casterId: string,
  items: ItemDataMap,
): ItemData[] {
  const member = world.party.find((c) => c.id === casterId)
  if (!member) return []
  return world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it != null)
    .filter((it) => it.equip?.equipableBy.includes(member.template))
}

function addToInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  if (inv.some((x) => x.itemId === itemId)) {
    return inv.map((x) => (x.itemId === itemId ? { ...x, count: x.count + n } : x))
  }
  return [...inv, { itemId, count: n }]
}

function removeFromInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  return inv
    .map((x) => (x.itemId === itemId ? { ...x, count: x.count - n } : x))
    .filter((x) => x.count > 0)
}

/** 换装:itemId 入其 slot,旧件回包。返回新 WorldState(不可变);非法操作原样返回。 */
export function equipItem(
  world: WorldState,
  casterId: string,
  itemId: string,
  items: ItemDataMap,
): WorldState {
  const item = items[itemId]
  const slot = item?.equip?.slot
  const member = world.party.find((c) => c.id === casterId)
  if (!item?.equip || !slot || !member) return world
  if (!item.equip.equipableBy.includes(member.template)) return world
  if (!world.inventory.some((e) => e.itemId === itemId && e.count > 0)) return world

  const oldItemId = member.equipment[slot]
  const party = world.party.map((c) =>
    c.id === casterId ? { ...c, equipment: { ...c.equipment, [slot]: itemId } } : c,
  )
  let inventory = removeFromInventory(world.inventory, itemId, 1)
  if (oldItemId) inventory = addToInventory(inventory, oldItemId, 1)
  return { ...world, party, inventory }
}

/** 任意队员任意槽位穿戴中的物品 id 集合(渲染层据此把装备中的物品标绿)。 */
export function equippedItemIds(world: WorldState): Set<string> {
  const ids = new Set<string>()
  for (const c of world.party) {
    for (const id of Object.values(c.equipment)) {
      if (id) ids.add(id)
    }
  }
  return ids
}

/** 使用菜单列表:背包里有 use 能力块的 + 穿戴中但本身可用的(灵珠系)。
 *  后者照搬原版 itemmenu.c:136-145 —— 灵珠穿着也能用(如土灵珠脱离洞窟),渲染层标绿。 */
export function usableItems(world: WorldState, items: ItemDataMap): ItemData[] {
  const invUsable = world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it?.use != null && !it.use.battleOnly)
  const invIds = new Set(invUsable.map((it) => it.id))
  const equippedUsable: ItemData[] = []
  for (const id of equippedItemIds(world)) {
    const it = items[id]
    if (it?.use != null && !it.use.battleOnly && !invIds.has(id)) equippedUsable.push(it)
  }
  return [...invUsable, ...equippedUsable]
}

/** 对 targetCharId 施 itemId 的 use.effects;consuming 则 -1。返回新 WorldState;非法原样返回。
 *  本期实现 healHp/healMp(夹 max);其余 kind 留桩(见 switch default)。 */
export function useItem(
  world: WorldState,
  targetCharId: string,
  itemId: string,
  items: ItemDataMap,
  poisonDefs?: Record<number, import('./poison.js').PoisonDef>,
): WorldState {
  const item = items[itemId]
  const target = world.party.find((c) => c.id === targetCharId)
  if (!item?.use || !target) return world
  const useSpec = item.use // 守卫后非空;局部常量收窄,免 non-null 断言(biome)
  const inInventory = world.inventory.some((e) => e.itemId === itemId && e.count > 0)
  const equipped = equippedItemIds(world).has(itemId)
  if (!inInventory && !equipped) return world // 背包没有 且 没穿戴 → 不能用

  let changed = false
  const party = world.party.map((c) => {
    if (c.id !== targetCharId) return c
    const next = { ...c }
    for (const eff of useSpec.effects) {
      switch (eff.kind) {
        case 'healHp':
          next.hp = Math.min(next.maxHP, next.hp + eff.amount)
          changed = true
          break
        case 'healMp':
          next.mp = Math.min(next.maxMP, next.mp + eff.amount)
          changed = true
          break
        case 'applyPoison': {
          // 大世界自毒(毒蛇卵/尸腐肉)或对己 use 毒药(相克/致死)—— 毒态随存档、带入战斗
          applyPoisonSelf(next, Number(eff.poisonId), poisonDefs)
          changed = true
          break
        }
        case 'curePoison':
          if (eff.poisonId !== undefined)
            next.poisons = (next.poisons ?? []).filter((ap) => ap.poisonId !== Number(eff.poisonId))
          else if (poisonDefs)
            next.poisons = (next.poisons ?? []).filter((ap) => {
              const d = poisonDefs[ap.poisonId]
              return !d || !poisonCurableBy(d, eff.curesTier ?? 'common')
            })
          changed = true
          break
        case 'extraPoisonRes':
          // 大蒜:临时毒抗 Extra,随存档,建态并入战斗 poisonRes(缩敌附毒门)、战后三件套清。刷新取高。
          next.extraPoisonRes = Math.max(next.extraPoisonRes ?? 0, eff.amount)
          changed = true
          break
        case 'applyStatus': {
          // 大世界护体符/金刚符(护体等):写入 extraStatuses,随存档,建态注入下一场战斗、战后三件套清。
          // 纯更新(新数组 + 新条目):同状态刷新回合数,否则追加。
          const prev = next.extraStatuses ?? []
          next.extraStatuses = prev.some((s) => s.status === eff.status)
            ? prev.map((s) => (s.status === eff.status ? { status: s.status, turns: eff.turns } : s))
            : [...prev, { status: eff.status, turns: eff.turns }]
          changed = true
          break
        }
        // 留桩(归宿见 docs):triggerScript→剧情脚本系统;
        // teleportOut→reforge 层 useConfirm 拦截跑 host.teleportOut(content 纯函数不碰场景运行时)
        case 'triggerScript':
        case 'teleportOut':
          break
      }
    }
    return next
  })
  if (!changed && !useSpec.consuming) return world // 纯桩效果且不消耗 → 无变化
  // 消耗只从背包扣;穿戴中的件(灵珠)用了不从背包扣(它在装备槽,不在背包)
  const inventory =
    useSpec.consuming && inInventory
      ? world.inventory
          .map((e) => (e.itemId === itemId ? { ...e, count: e.count - 1 } : e))
          .filter((e) => e.count > 0)
      : world.inventory
  return { ...world, party, inventory }
}
